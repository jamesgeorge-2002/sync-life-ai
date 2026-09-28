"""
Conversation memory management.

Note: `langchain.memory.ConversationBufferMemory` was removed in LangChain 1.x
(it lived only in the 0.x line and is now deprecated/gone). To keep this
project working across LangChain versions without pinning users to an old
release, memory is implemented as a small self-contained buffer instead of
depending on that module.
"""


class ConversationBufferMemory:
    """Minimal drop-in replacement for LangChain's old ConversationBufferMemory.

    Stores turns as a list of (role, content) tuples and can render them as a
    single formatted transcript string, matching the "chat_history" shape the
    rest of the app expects.
    """

    def __init__(self, human_prefix: str = "User", ai_prefix: str = "Assistant") -> None:
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix
        self._turns: list[tuple[str, str]] = []

    def save_context(self, human_input: str, ai_output: str) -> None:
        """Record one human/AI exchange.

        Args:
            human_input: The user's message.
            ai_output: The assistant's reply.
        """
        self._turns.append((self.human_prefix, human_input))
        self._turns.append((self.ai_prefix, ai_output))

    def clear(self) -> None:
        """Wipe all stored turns."""
        self._turns = []

    def load_memory_variables(self) -> dict[str, str]:
        """Return the transcript in the same shape LangChain memory objects use.

        Returns:
            dict: {"chat_history": "<formatted transcript>"}
        """
        transcript = "\n".join(f"{role}: {content}" for role, content in self._turns)
        return {"chat_history": transcript}


def get_memory() -> ConversationBufferMemory:
    """Create a fresh conversation buffer memory instance.

    Returns:
        ConversationBufferMemory: Memory object that stores raw chat turns.
    """
    return ConversationBufferMemory(human_prefix="User", ai_prefix="Assistant")


def format_history(messages: list[dict]) -> str:
    """Format Streamlit session-state chat messages into a plain-text transcript.

    Args:
        messages: List of dicts with 'role' and 'content' keys.

    Returns:
        str: Human-readable conversation transcript.
    """
    lines = []
    for msg in messages:
        prefix = "User" if msg["role"] == "user" else "Assistant"
        lines.append(f"{prefix}: {msg['content']}")
    return "\n".join(lines)
