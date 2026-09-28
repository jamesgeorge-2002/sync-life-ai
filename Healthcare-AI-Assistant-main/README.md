# Healthcare AI Assistant

An educational AI healthcare chatbot built with Streamlit, LangChain, and Grok (xAI). It answers
general medical questions, offers symptom guidance, medication information, lifestyle tips, and
first-aid guidance — without diagnosing conditions or replacing professional medical advice.

## Features

- Medical Question Answering
- Symptom Checker (informational only)
- Medication Information
- Disease Awareness & Preventive Healthcare
- Healthy Lifestyle, Diet & Exercise Suggestions
- Mental Health Support
- First Aid Guidance
- Child Care, Women's Health & Elderly Care Awareness
- Vaccination Awareness
- Conversation Memory & Chat History
- Streaming Responses with Typing Animation
- Dark, Professional Healthcare UI
- Automatic Emergency Detection & Escalation Messaging

## Project Structure

```
Healthcare-AI-Assistant/
├── app.py
├── requirements.txt
├── .env
├── .gitignore
├── README.md
├── config/
│   ├── settings.py
│   └── prompts.py
├── chatbot/
│   ├── llm.py
│   ├── chains.py
│   ├── memory.py
│   ├── response.py
│   ├── safety.py
│   └── utils.py
├── ui/
│   ├── sidebar.py
│   ├── chat_interface.py
│   └── styles.py
├── assets/
│   └── logo.png
└── images/
```

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd Healthcare-AI-Assistant
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate   # macOS/Linux
   venv\Scripts\activate      # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Environment Variables

Create a `.env` file in the project root (a template is already included):

```env
GROQ_API_KEY=your_groq_api_key_here
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=healthcare-ai-assistant
LANGCHAIN_TRACING_V2=true
```

- **GROK_API_KEY**: Your xAI (Grok) API key.
- **LANGCHAIN_API_KEY**: Your LangSmith API key (optional, enables tracing).
- **LANGCHAIN_PROJECT**: LangSmith project name for organizing traces.
- **LANGCHAIN_TRACING_V2**: Set to `true` to enable tracing.

## How to Run

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`.

## Screenshots

_Add screenshots of the chat interface here after running the app locally._

- `images/welcome-screen.png`
- `images/chat-conversation.png`
- `images/sidebar.png`

## Deployment (Streamlit Cloud)

1. Push this repository to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io) and connect your GitHub account.
3. Select this repository and set `app.py` as the entrypoint.
4. In the app's **Secrets** settings, add the same keys as in `.env`:
   ```toml
   GROQ_API_KEY = "your_groq_api_key_here"
   LANGCHAIN_API_KEY = "your_langsmith_api_key_here"
   LANGCHAIN_PROJECT = "healthcare-ai-assistant"
   LANGCHAIN_TRACING_V2 = "true"
   ```
5. Deploy.

## Safety Notes

This assistant is designed for **educational purposes only**. It will never diagnose a
condition, prescribe medication, or suggest dosages. Emergency-related messages (chest pain,
difficulty breathing, stroke symptoms, heavy bleeding, suicidal thoughts, heart attack symptoms,
loss of consciousness, seizures, or poisoning) trigger an immediate recommendation to contact
emergency services.

## Future Improvements

- Add persistent database-backed chat history
- Multi-language support
- Voice input/output
- Integration with verified medical knowledge bases
- User authentication and per-user history
- Analytics dashboard for common health topics asked

## License

For educational and demonstration purposes.
