"""
Healthcare AI Assistant — Streamlit application entrypoint.
"""

import streamlit as st

from config.settings import settings
from ui.chat_interface import render_chat_interface
from ui.sidebar import render_sidebar
from ui.styles import DARK_THEME_CSS


def _streamlit_has_groq_secret() -> bool:
    """Return whether Streamlit Cloud supplied the Groq secret key name."""
    try:
        return "GROQ_API_KEY" in st.secrets
    except Exception:
        return False


def main() -> None:
    """Configure the page, apply styling, and render the app layout."""
    st.set_page_config(
        page_title=settings.app_name,
        page_icon="🩺",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

    if "messages" not in st.session_state:
        st.session_state["messages"] = []

    render_sidebar()

    # Temporary deployment diagnostic: remove after confirming Cloud secrets.
    key_preview = settings.groq_api_key[:6] if settings.groq_api_key else "(empty)"
    st.sidebar.caption(
        "Groq key debug — "
        f"configured: {bool(settings.groq_api_key)} | "
        f"prefix: {key_preview} | "
        f"GROQ_API_KEY in st.secrets: {_streamlit_has_groq_secret()}"
    )

    st.markdown(
        f"""
        <div class="hc-header">
            <div style="font-size:2rem;">🩺</div>
            <div>
                <p class="hc-title">{settings.app_name}</p>
                <p class="hc-tagline">{settings.app_tagline}</p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if not settings.groq_api_key:
        st.error(
            "⚠️ GROQ_API_KEY is not configured. Add it to your .env file "
            "(or Streamlit Cloud Secrets) before chatting."
        )

    render_chat_interface()

    st.markdown(
        f'<div class="hc-footer">{settings.disclaimer}</div>',
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
