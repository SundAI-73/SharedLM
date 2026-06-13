"""
OpenRouter model catalog.

OpenRouter exposes a public, OpenAI-compatible gateway to 400+ models. This
endpoint proxies and caches the live catalog so the frontend model picker can
list real models instead of a hardcoded map. The catalog is provider-wide
(not user-specific), so we cache it process-wide with a short TTL.
"""
import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from database.models import User
from api.dependencies import get_current_user
from utils.security import sanitize_error_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/openrouter", tags=["openrouter"])

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
_CATALOG_TTL_SECONDS = 3600  # OpenRouter's catalog changes slowly; 1h is plenty

# Process-wide cache: {"fetched_at": float, "models": list[dict]}
_catalog_cache: dict = {"fetched_at": 0.0, "models": None}


def _trim_model(m: dict) -> dict:
    """Keep only the fields the UI needs from a verbose catalog entry."""
    pricing = m.get("pricing") or {}
    architecture = m.get("architecture") or {}
    return {
        "id": m.get("id"),
        "name": m.get("name") or m.get("id"),
        "context_length": m.get("context_length"),
        "pricing": {
            "prompt": pricing.get("prompt"),
            "completion": pricing.get("completion"),
        },
        "modality": architecture.get("modality") or architecture.get("input_modalities"),
    }


async def _fetch_catalog() -> list:
    """Fetch the OpenRouter catalog, using the process cache when fresh."""
    now = time.monotonic()
    if _catalog_cache["models"] is not None and (now - _catalog_cache["fetched_at"]) < _CATALOG_TTL_SECONDS:
        return _catalog_cache["models"]

    async with httpx.AsyncClient(timeout=15.0) as http:
        resp = await http.get(OPENROUTER_MODELS_URL)
        resp.raise_for_status()
        data = resp.json()

    models = [_trim_model(m) for m in data.get("data", []) if m.get("id")]
    _catalog_cache["models"] = models
    _catalog_cache["fetched_at"] = now
    return models


@router.get("/models")
async def get_openrouter_models(
    search: Optional[str] = Query(None, description="Case-insensitive filter on id/name"),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
):
    """Return the (cached) OpenRouter model catalog, optionally filtered."""
    try:
        models = await _fetch_catalog()

        if search:
            q = search.lower()
            models = [m for m in models if q in (m["id"] or "").lower() or q in (m["name"] or "").lower()]

        total = len(models)
        if limit:
            models = models[:limit]

        return {"models": models, "count": len(models), "total": total}
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch OpenRouter catalog: {e}")
        # If we have a stale cache, serve it rather than failing hard
        if _catalog_cache["models"] is not None:
            return {"models": _catalog_cache["models"], "count": len(_catalog_cache["models"]),
                    "total": len(_catalog_cache["models"]), "stale": True}
        raise HTTPException(status_code=502, detail="Could not reach OpenRouter model catalog")
    except Exception as e:
        logger.error(f"OpenRouter catalog error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to load model catalog"))
