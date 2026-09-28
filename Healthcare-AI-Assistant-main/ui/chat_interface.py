"""
Main chat interface rendering: message history, input box, streaming output.
"""

import streamlit as st

from chatbot.response import stream_response


def render_welcome() -> None:
    """Render an animated-style welcome panel shown before any messages exist."""
    st.markdown(
        """
        <div class="hc-card" style="text-align:center; padding:32px;">
            <div style="font-size:2.5rem;">🩺💬</div>
            <h3 style="margin-top:8px;">Welcome to Healthcare AI Assistant</h3>
            <p style="color: var(--hc-muted);">
                Ask about symptoms, medications, healthy habits, first aid, and more.
                I'm here to inform, not to diagnose.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_chat_history() -> None:
    """Render all previously stored chat messages as chat bubbles."""
    for message in st.session_state.get("messages", []):
        avatar = "🧑" if message["role"] == "user" else "🩺"
        with st.chat_message(message["role"], avatar=avatar):
            st.markdown(message["content"])


def handle_user_input() -> None:
    """Capture new user input, stream the assistant's reply, and persist history."""
    user_input = st.chat_input("Ask a health question…")
    if not user_input:
        return

    if "messages" not in st.session_state:
        st.session_state["messages"] = []

    st.session_state["messages"].append({"role": "user", "content": user_input})
    with st.chat_message("user", avatar="🧑"):
        st.markdown(user_input)

    with st.chat_message("assistant", avatar="🩺"):
        placeholder = st.empty()
        full_response = ""
        with st.spinner("Typing…"):
            for chunk in stream_response(user_input, st.session_state["messages"][:-1]):
                full_response += chunk
                placeholder.markdown(full_response + "▌")
        placeholder.markdown(full_response)

    st.session_state["messages"].append({"role": "assistant", "content": full_response})


def render_chat_interface() -> None:
    """Render the complete chat interface: history or welcome, then input handling."""
    if not st.session_state.get("messages"):
        render_welcome()
    else:
        render_chat_history()

    handle_user_input()
