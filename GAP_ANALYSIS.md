# SharedLM — Frontend vs Backend Gap Analysis

> Generated 2026-06-12 by a full audit of every page, button, API call, and backend endpoint.
> Status legend: ✅ done · 🟡 partially done / stub · ❌ missing · 🔧 fixed in this work session

---

## 1. What the frontend has vs what the backend supports

| Feature (frontend surface) | Frontend | Backend | Notes |
|---|---|---|---|
| Auth (login/signup/forgot/reset/change/delete) | ✅ | ✅ | Header-based auth (X-User-ID), not JWT |
| Chat send/receive | ✅ | ✅ | Was non-streaming, 1000-token cap → 🔧 |
| **Conversation history sent to LLM** | n/a | ❌ → 🔧 | **Critical bug: each request only sent memories + current message. The model never saw prior turns.** |
| Streaming responses | ❌ → 🔧 | ❌ → 🔧 | Added SSE `/chat/stream` + frontend consumption |
| Stop generation | ❌ → 🔧 | ❌ → 🔧 | AbortController + partial-save on disconnect |
| Regenerate response | ❌ → 🔧 | ❌ → 🔧 | `regenerate` flag replaces last assistant msg |
| Copy message | ❌ → 🔧 | n/a | CSS existed, no button |
| Code-block copy | ✅ (CSS) 🟡 | n/a | Wired up with the new message actions |
| Voice input (speech-to-text) | ❌ → 🔧 | n/a | Web Speech API, frontend-only |
| Read aloud (text-to-speech) | ❌ → 🔧 | n/a | speechSynthesis, frontend-only |
| Export conversation | ❌ (dead button) → 🔧 | n/a | Markdown export in chat menu + History page |
| Conversation search (content) | 🟡 title-only client filter → 🔧 | ❌ → 🔧 | Added `/conversations/{user_id}/search` over message bodies |
| Analytics page | 🟡 hardcoded fake data → 🔧 | ❌ → 🔧 | Added `/analytics/{user_id}` with real aggregates |
| Token usage tracking | ❌ → 🔧 | ❌ → 🔧 | New `prompt_tokens`/`completion_tokens`/`response_time_ms` columns on messages |
| Multi-line chat input | ❌ (single-line `<input>`) → 🔧 | n/a | Auto-resizing textarea, Shift+Enter for newline |
| File upload (chat + project) | ✅ | ✅ | PDF/DOCX/TXT/images; text extracted into prompt |
| Projects CRUD + files + memories | ✅ | ✅ | |
| Conversations CRUD/star/rename | ✅ | ✅ | |
| API keys (save/test/delete, encrypted) | ✅ | ✅ | Fernet encryption, 10-min plaintext cache |
| Custom integrations (Ollama/own server) | ✅ | ✅ | URL-based local-vs-cloud routing, fallback URLs |
| Mem0 shared memory | ✅ | ✅ | Search before reply, add after reply (background) |
| Settings > Usage tab | 🟡 hardcoded percentages | ❌ | Still stub — needs per-provider quota tracking |
| Settings > Capabilities toggles | 🟡 localStorage only | ❌ | Extended thinking / Research / Web search do nothing server-side |
| Chat ⚙ toggles (Extended thinking / Research / Web search) | 🟡 localStorage only | ❌ | Same — never sent to backend |
| Connectors modal | 🟡 visual placeholder | ❌ | No connector framework exists |
| Project Archive button | 🟡 UI only | ❌ | No archived state in DB |
| DeepSeek / Gemini / Llama providers | 🟡 "coming soon" tiles | ❌ | Llama SDK imported but dead code |

## 2. What a multi-LLM chat app needs that neither side had

**Fixed in this session (🔧):**
1. Conversation context/history passed to the LLM (the #1 correctness gap)
2. Token-by-token streaming (SSE) — biggest perceived-speed win
3. Stop / regenerate — table-stakes chat controls
4. Usage analytics (tokens, response times, per-model distribution) recorded per message and aggregated per user
5. Full-text search across conversation content
6. Export (Markdown) of any conversation
7. Voice input + read-aloud
8. Response length: hardcoded 1000 max_tokens raised to 4096 default, configurable per request
9. Copy actions on messages and code blocks
10. Multi-line composer

**Still missing (recommended roadmap, in priority order):**
1. **Real web search / research tools** — the toggles exist in UI; need a search-tool pipeline (e.g. function-calling + a search API) on the backend
2. **JWT/session auth** — X-User-ID header is spoofable; backend trusts the client's claimed identity for data access (mitigated by ownership checks, but weak)
3. **Vision input** — images upload but only OCR-less text extraction happens; multimodal models (GPT-4o, Claude) accept images natively
4. **Extended thinking** — Anthropic/OpenAI reasoning params are one parameter away now that the router supports per-request options
5. **Model catalog endpoint** — model variant lists are hardcoded in the frontend; providers expose `/models` APIs
6. **Per-provider rate limiting / quota tracking** — Settings > Usage tab needs real data
7. **Conversation branching / message editing** — edit a past user message and fork
8. **Sharing** — public share links for conversations
9. **Plugin/connector framework** — the Connectors modal is pure UI today
10. **Server-side title generation** — cheap model call would beat the current first-words heuristic

## 3. Notable technical debt observed

- `apps/server/services/llm_router.py` used the deprecated `MistralClient` (legacy shim of mistralai 1.x); streaming now uses the modern `Mistral` client.
- `apps/server/.venv` pointed at an uninstalled Windows-Store Python; a fresh `.venv-new` was created during this session.
- Analytics/Usage UI was shipping invented numbers — worse than absent, since it looks real.
- The frontend `defaultModelVariants` list contains stale model IDs (e.g. `claude-3-sonnet-20240229` is retired); updated where safe.
- No CSRF protection on the API; CORS is the only barrier.
