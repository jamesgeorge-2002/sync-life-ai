"""
LLM initialization for Groq Cloud using an OpenAI-compatible client.

Groq's API is OpenAI-compatible, so we use langchain_openai's ChatOpenAI
pointed at the Groq base URL.
"""

from langchain_openai import ChatOpenAI

from config.settings import settings


def get_llm() -> ChatOpenAI:
    """Create and return a configured Groq chat model instance.

    Returns:
        ChatOpenAI: A LangChain chat model wired to the Groq Cloud endpoint.

    Raises:
        ValueError: If no API key is configured.
    """
    if not settings.groq_api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. Please add it to your .env file "
            "(or Streamlit Cloud Secrets)."
        )

    return ChatOpenAI(
        model=settings.groq_model_name,
        api_key=settings.groq_api_key,
        base_url=settings.groq_api_base,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        streaming=settings.streaming,
    )
