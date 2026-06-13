"""Time helpers."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp.

    Drop-in replacement for the deprecated ``datetime.utcnow()``. We keep it
    naive (tzinfo stripped) to match the existing naive TIMESTAMP columns and
    avoid offset-aware vs offset-naive comparison errors.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
