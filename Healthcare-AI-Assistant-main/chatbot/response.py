"""
Response generation orchestration: safety checks, chain invocation, streaming.
"""

from collections.abc import Iterator

from chatbot.chains import build_chain
from chatbot.memory import format_history
from chatbot.safety import contains_emergency, ensure_disclaimer, get_emergency_response
from config.settings import settings


def stream_response(user_input: str, chat_messages: list[dict]) -> Iterator[str]:
    """Generate a streamed response for the given user input.

    Performs an emergency safety check first. If no emergency is detected,
    streams tokens from the LLM chain, appending the medical disclaimer at
    the end if it is not already present.

    Args:
        user_input: The latest message from the user.
        chat_messages: Full session chat history (list of role/content dicts).

    Yields:
        str: Successive text chunks of the assistant's response.
    """
    if contains_emergency(user_input):
        yield get_emergency_response()
        return

    chain = build_chain()
    history_text = format_history(chat_messages)

    collected = ""
    try:
        for chunk in chain.stream({"chat_history": history_text, "user_input": user_input}):
            collected += chunk
            yield chunk
    except Exception as exc:  # noqa: BLE001
        yield from _handle_error(exc)
        return

    if settings.disclaimer not in collected:
        yield f"\n\n{settings.disclaimer}"


def _handle_error(exc: Exception) -> Iterator[str]:
    """Translate raw exceptions into friendly user-facing messages.

    Args:
        exc: The exception raised during LLM invocation.

    Yields:
        str: A friendly, single-chunk error message.
    """
    message = str(exc).lower()

    if "api key" in message or "unauthorized" in message or "401" in message:
        yield (
            "⚠️ Authentication error: your Groq API key appears to be invalid or missing. "
            "Please check the GROQ_API_KEY value in your .env file (or Streamlit Secrets)."
        )
    elif "timeout" in message:
        yield "⚠️ The request timed out. Please try again in a moment."
    elif "rate limit" in message or "429" in message:
        yield "⚠️ Rate limit reached. Please wait a moment before sending another message."
    elif "connection" in message or "network" in message:
        yield "⚠️ Network error: unable to reach the AI service. Please check your internet connection."
    else:
        yield f"⚠️ An unexpected error occurred: {exc}"
