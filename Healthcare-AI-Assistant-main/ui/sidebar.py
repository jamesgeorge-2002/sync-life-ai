"""
Sidebar rendering: branding, stats, controls, and info panels.
"""

import streamlit as st

from chatbot.utils import count_user_turns
from config.settings import settings


def render_sidebar() -> None:
    """Render the full sidebar: logo, project info, controls, and disclaimers."""
    with st.sidebar:
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

        messages = st.session_state.get("messages", [])
        turns = count_user_turns(messages)

        st.markdown(
            f"""
            <div class="hc-card">
                <span class="hc-badge">Conversation</span>
                <p style="margin-top:8px; font-size:0.9rem;">Messages exchanged: <b>{turns}</b></p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        if st.button("🗑️ Clear Conversation", use_container_width=True):
            st.session_state["messages"] = []
            st.rerun()

        st.markdown(
            """
            <div class="hc-emergency">
                🚨 <b>Emergency?</b><br/>
                If you or someone near you is having a medical emergency, call your local
                emergency number or go to the nearest hospital immediately. Do not wait for
                a chatbot response.
            </div>
            """,
            unsafe_allow_html=True,
        )

        with st.expander("ℹ️ About this project"):
            st.markdown(
                """
                **Healthcare AI Assistant** is an educational AI chatbot built with
                Streamlit, LangChain, and Groq Cloud. It offers general health
                information, wellness tips, and preventive care guidance.

                It does **not** diagnose conditions, prescribe medication, or replace
                a licensed healthcare professional.
                """
            )

        with st.expander("👨‍💻 Developer Info"):
            st.markdown(
                """
                Built as an open-source educational project demonstrating a
                production-style LangChain + Streamlit architecture.
                """
            )

        st.markdown(
            f"""
            <div class="hc-footer">
                {settings.disclaimer}
            </div>
            """,
            unsafe_allow_html=True,
        )
