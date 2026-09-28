"""
Safety checks: emergency keyword detection and disclaimer enforcement.
"""

from config.prompts import EMERGENCY_KEYWORDS, EMERGENCY_RESPONSE


def contains_emergency(user_input: str) -> bool:
    """Check whether user input contains emergency-related keywords.

    Args:
        user_input: The raw text entered by the user.

    Returns:
        bool: True if an emergency keyword is detected.
    """
    lowered = user_input.lower()
    return any(keyword in lowered for keyword in EMERGENCY_KEYWORDS)


def get_emergency_response() -> str:
    """Return the standard emergency guidance response.

    Returns:
        str: Pre-written emergency response text.
    """
    return EMERGENCY_RESPONSE


def ensure_disclaimer(response_text: str, disclaimer: str) -> str:
    """Ensure the medical disclaimer is present at the end of a response.

    Args:
        response_text: The generated assistant response.
        disclaimer: The disclaimer text that must be present.

    Returns:
        str: Response text guaranteed to include the disclaimer.
    """
    if disclaimer.strip() not in response_text:
        response_text = f"{response_text.strip()}\n\n{disclaimer}"
    return response_text
