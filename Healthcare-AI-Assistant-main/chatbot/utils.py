"""
Miscellaneous helper utilities shared across the chatbot package.
"""

from datetime import datetime


def timestamp() -> str:
    """Return the current time formatted as HH:MM.

    Returns:
        str: Current local time, e.g. '14:32'.
    """
    return datetime.now().strftime("%H:%M")


def count_user_turns(messages: list[dict]) -> int:
    """Count how many messages in the history came from the user.

    Args:
        messages: List of role/content message dicts.

    Returns:
        int: Number of user-authored turns.
    """
    return sum(1 for m in messages if m.get("role") == "user")


def truncate(text: str, max_len: int = 60) -> str:
    """Truncate text to a maximum length, appending an ellipsis if cut.

    Args:
        text: Source text.
        max_len: Maximum number of characters to keep.

    Returns:
        str: Possibly-truncated text.
    """
    return text if len(text) <= max_len else text[: max_len - 1].rstrip() + "…"
