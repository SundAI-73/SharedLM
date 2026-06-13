import logging
from datetime import datetime, timedelta
from utils.time import utcnow

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, Conversation, Message
from api.dependencies import get_current_user, verify_user_ownership
from utils.security import sanitize_error_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/{user_id}")
async def get_analytics(
    user_id: str,
    days: int = Query(default=30, ge=0, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate real usage statistics for the user.

    days=0 means all time. Token counts only cover messages produced after
    usage tracking was introduced (older rows have NULL token columns).
    """
    try:
        verify_user_ownership(current_user, user_id, "analytics")

        since = None
        if days > 0:
            since = utcnow() - timedelta(days=days)

        def scoped(query):
            query = query.join(Conversation, Message.conversation_id == Conversation.id) \
                         .filter(Conversation.user_id == user_id)
            if since is not None:
                query = query.filter(Message.created_at >= since)
            return query

        conv_query = db.query(func.count(Conversation.id)).filter(Conversation.user_id == user_id)
        if since is not None:
            conv_query = conv_query.filter(Conversation.updated_at >= since)
        total_conversations = conv_query.scalar() or 0

        totals = scoped(db.query(
            func.count(Message.id),
            func.coalesce(func.sum(Message.prompt_tokens), 0),
            func.coalesce(func.sum(Message.completion_tokens), 0),
            func.avg(Message.response_time_ms)
        )).one()
        total_messages, prompt_tokens, completion_tokens, avg_response_ms = totals

        # Per-model breakdown over assistant messages
        model_rows = scoped(db.query(
            Message.model,
            func.count(Message.id),
            func.coalesce(func.sum(Message.prompt_tokens), 0) +
            func.coalesce(func.sum(Message.completion_tokens), 0)
        )).filter(
            Message.role == "assistant",
            Message.model.isnot(None)
        ).group_by(Message.model).all()

        assistant_total = sum(row[1] for row in model_rows) or 1
        model_distribution = sorted([
            {
                "model": row[0],
                "messages": row[1],
                "tokens": int(row[2] or 0),
                "percent": round(row[1] * 100 / assistant_total)
            }
            for row in model_rows
        ], key=lambda item: item["messages"], reverse=True)

        # Daily message counts for the activity chart
        chart_days = days if 0 < days <= 90 else 30
        chart_since = utcnow() - timedelta(days=chart_days - 1)
        daily_rows = scoped(db.query(
            func.date(Message.created_at),
            func.count(Message.id)
        )).filter(Message.created_at >= chart_since) \
          .group_by(func.date(Message.created_at)).all()
        counts_by_date = {str(row[0]): row[1] for row in daily_rows}

        daily_activity = []
        for offset in range(chart_days):
            day = (chart_since + timedelta(days=offset)).date()
            daily_activity.append({
                "date": str(day),
                "messages": counts_by_date.get(str(day), 0)
            })

        return {
            "totals": {
                "conversations": total_conversations,
                "messages": int(total_messages or 0),
                "prompt_tokens": int(prompt_tokens or 0),
                "completion_tokens": int(completion_tokens or 0),
                "total_tokens": int(prompt_tokens or 0) + int(completion_tokens or 0),
                "avg_response_time_ms": int(avg_response_ms) if avg_response_ms else None,
                "models_used": len(model_rows)
            },
            "model_distribution": model_distribution,
            "daily_activity": daily_activity
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to compute analytics"))
