"""
CSS styling for the dark, professional healthcare-themed UI.
"""

DARK_THEME_CSS = """
<style>
:root {
    --hc-bg: #0f1720;
    --hc-surface: #17212b;
    --hc-primary: #2dd4bf;
    --hc-accent: #38bdf8;
    --hc-danger: #f87171;
    --hc-text: #e5e7eb;
    --hc-muted: #94a3b8;
}

.stApp {
    background-color: var(--hc-bg);
    color: var(--hc-text);
}

section[data-testid="stSidebar"] {
    background-color: var(--hc-surface);
    border-right: 1px solid #1f2a37;
}

.hc-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid #1f2a37;
    margin-bottom: 16px;
}

.hc-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--hc-text);
    margin: 0;
}

.hc-tagline {
    color: var(--hc-muted);
    font-size: 0.9rem;
    margin: 0;
}

.hc-card {
    background-color: var(--hc-surface);
    border: 1px solid #1f2a37;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
}

.hc-badge {
    display: inline-block;
    background-color: rgba(45, 212, 191, 0.15);
    color: var(--hc-primary);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.75rem;
    font-weight: 600;
}

.hc-emergency {
    background-color: rgba(248, 113, 113, 0.12);
    border: 1px solid rgba(248, 113, 113, 0.4);
    border-radius: 12px;
    padding: 12px;
    color: var(--hc-danger);
    font-size: 0.85rem;
    margin-bottom: 12px;
}

.hc-footer {
    text-align: center;
    color: var(--hc-muted);
    font-size: 0.75rem;
    padding-top: 24px;
    border-top: 1px solid #1f2a37;
    margin-top: 24px;
}

.stChatMessage {
    border-radius: 14px;
}
</style>
"""
