"""
Tests for features added in the backend buildout:
- conversation history passed to the LLM
- regenerate (replace last assistant turn)
- streaming chat endpoint (SSE)
- analytics aggregation endpoint
- conversation content search
"""
import json
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from database import crud
from database.models import Message


@pytest.mark.api
class TestConversationHistory:
    """The model must receive prior turns, not just the current message."""

    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_first_message_has_empty_history(self, mock_mem0, mock_route_chat, client, test_user, test_api_key, auth_headers):
        mock_mem0.search_memories.return_value = []
        mock_route_chat.return_value = ("Hi there", "gpt-4o-mini")

        client.post("/chat", json={
            "user_id": test_user.id, "message": "Hello",
            "model_provider": "openai", "model_choice": "gpt-4o-mini"
        }, headers=auth_headers)

        assert mock_route_chat.call_args.kwargs["history"] == []

    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_second_message_includes_prior_turns(self, mock_mem0, mock_route_chat, client, test_user, test_api_key, auth_headers):
        mock_mem0.search_memories.return_value = []
        mock_route_chat.return_value = ("First reply", "gpt-4o-mini")

        first = client.post("/chat", json={
            "user_id": test_user.id, "message": "What is Python?",
            "model_provider": "openai", "model_choice": "gpt-4o-mini"
        }, headers=auth_headers)
        conversation_id = first.json()["conversation_id"]

        mock_route_chat.return_value = ("Second reply", "gpt-4o-mini")
        client.post("/chat", json={
            "user_id": test_user.id, "message": "Tell me more",
            "model_provider": "openai", "model_choice": "gpt-4o-mini",
            "session_id": str(conversation_id)
        }, headers=auth_headers)

        history = mock_route_chat.call_args.kwargs["history"]
        assert history == [
            {"role": "user", "content": "What is Python?"},
            {"role": "assistant", "content": "First reply"},
        ]


@pytest.mark.api
class TestRegenerate:
    """Regenerate replaces the last assistant reply rather than appending."""

    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_regenerate_replaces_last_assistant(self, mock_mem0, mock_route_chat, client, test_db, test_user, test_api_key, auth_headers):
        mock_mem0.search_memories.return_value = []

        conv = crud.create_conversation(test_db, user_id=test_user.id, model_used="gpt-4o-mini")
        crud.create_message(test_db, conversation_id=conv.id, role="user", content="2+2?")
        crud.create_message(test_db, conversation_id=conv.id, role="assistant", content="Old answer", model="gpt-4o-mini")
        conv.message_count = 2
        test_db.commit()

        mock_route_chat.return_value = ("New answer", "gpt-4o-mini")
        resp = client.post("/chat", json={
            "user_id": test_user.id, "message": "ignored on regenerate",
            "model_provider": "openai", "model_choice": "gpt-4o-mini",
            "session_id": str(conv.id), "regenerate": True
        }, headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["reply"] == "New answer"

        # The original user message is reused as the prompt
        assert mock_route_chat.call_args.kwargs["history"] == []
        messages = crud.get_conversation_messages(test_db, conv.id)
        contents = [(m.role, m.content) for m in messages]
        # One user turn + exactly one (regenerated) assistant turn
        assert contents == [("user", "2+2?"), ("assistant", "New answer")]


@pytest.mark.api
class TestStreaming:
    """The SSE endpoint emits meta/delta/done and persists the full reply."""

    @patch('api.routes.chat.mem0_client')
    def test_stream_emits_events_and_persists(self, mock_mem0, client, test_db, test_user, test_api_key, auth_headers):
        mock_mem0.search_memories.return_value = []

        async def fake_stream(*args, **kwargs):
            yield {"type": "delta", "text": "Hello"}
            yield {"type": "delta", "text": " world"}
            yield {"type": "done", "usage": {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}}

        with patch('api.routes.chat.route_chat_stream', fake_stream):
            resp = client.post("/chat/stream", json={
                "user_id": test_user.id, "message": "hi",
                "model_provider": "openai", "model_choice": "gpt-4o-mini"
            }, headers=auth_headers)

        assert resp.status_code == 200
        body = resp.text
        assert '"type": "meta"' in body
        assert '"type": "delta"' in body
        assert "Hello" in body and "world" in body
        assert '"type": "done"' in body

        # Parse the meta event to find the conversation and verify persistence
        conversation_id = None
        for line in body.splitlines():
            if line.startswith("data: "):
                event = json.loads(line[len("data: "):])
                if event.get("type") == "meta":
                    conversation_id = event["conversation_id"]
        assert conversation_id is not None

        messages = crud.get_conversation_messages(test_db, conversation_id)
        assistant = [m for m in messages if m.role == "assistant"]
        assert len(assistant) == 1
        assert assistant[0].content == "Hello world"
        assert assistant[0].completion_tokens == 2

    @patch('api.routes.chat.mem0_client')
    def test_stream_error_when_no_api_key(self, mock_mem0, client, test_user, auth_headers):
        mock_mem0.search_memories.return_value = []
        resp = client.post("/chat/stream", json={
            "user_id": test_user.id, "message": "hi",
            "model_provider": "anthropic", "model_choice": "claude-3-5-sonnet-20241022"
        }, headers=auth_headers)
        # No key -> rejected before streaming starts
        assert resp.status_code == 400


@pytest.mark.api
class TestAnalytics:
    """Analytics returns real aggregates over the user's messages."""

    def test_empty_user_returns_zeros(self, client, test_user, auth_headers):
        resp = client.get(f"/analytics/{test_user.id}?days=30", headers=auth_headers)
        assert resp.status_code == 200
        totals = resp.json()["totals"]
        assert totals["messages"] == 0
        assert totals["total_tokens"] == 0
        assert totals["models_used"] == 0

    def test_aggregates_tokens_and_models(self, client, test_db, test_user, auth_headers):
        conv = crud.create_conversation(test_db, user_id=test_user.id, model_used="gpt-4o-mini")
        test_db.add_all([
            Message(conversation_id=conv.id, role="user", content="q1"),
            Message(conversation_id=conv.id, role="assistant", content="a1",
                    model="gpt-4o-mini", prompt_tokens=10, completion_tokens=20, response_time_ms=500),
            Message(conversation_id=conv.id, role="assistant", content="a2",
                    model="claude-3-5-sonnet-20241022", prompt_tokens=5, completion_tokens=15, response_time_ms=700),
        ])
        test_db.commit()

        resp = client.get(f"/analytics/{test_user.id}?days=0", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["totals"]["total_tokens"] == 50
        assert data["totals"]["models_used"] == 2
        models = {m["model"] for m in data["model_distribution"]}
        assert models == {"gpt-4o-mini", "claude-3-5-sonnet-20241022"}

    def test_analytics_requires_ownership(self, client, test_user, test_user_2, auth_headers_user_2):
        resp = client.get(f"/analytics/{test_user.id}", headers=auth_headers_user_2)
        assert resp.status_code == 403


@pytest.mark.api
class TestConversationSearch:
    """Search matches conversation titles and message contents."""

    def test_search_finds_message_content(self, client, test_db, test_user, auth_headers):
        conv = crud.create_conversation(test_db, user_id=test_user.id, title="Cooking ideas", model_used="gpt-4o-mini")
        crud.create_message(test_db, conversation_id=conv.id, role="user", content="How do I bake sourdough bread?")
        crud.create_message(test_db, conversation_id=conv.id, role="assistant", content="Start with a starter...", model="gpt-4o-mini")

        resp = client.get(f"/conversations/{test_user.id}/search?q=sourdough", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == conv.id
        assert "sourdough" in (results[0]["snippet"] or "").lower()

    def test_search_short_query_returns_empty(self, client, test_user, auth_headers):
        resp = client.get(f"/conversations/{test_user.id}/search?q=a", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["results"] == []

    def test_search_requires_ownership(self, client, test_user, test_user_2, auth_headers_user_2):
        resp = client.get(f"/conversations/{test_user.id}/search?q=anything", headers=auth_headers_user_2)
        assert resp.status_code == 403
