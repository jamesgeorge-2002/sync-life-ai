"""
LangChain RunnableSequence construction for the healthcare assistant.
"""

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableSequence

from chatbot.llm import get_llm
from config.prompts import SYSTEM_PROMPT


def build_chain() -> RunnableSequence:
    """Build the healthcare assistant's prompt -> LLM -> parser chain.

    Returns:
        RunnableSequence: A runnable chain ready to invoke or stream.
    """
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "Conversation history:\n{chat_history}\n\nUser: {user_input}"),
        ]
    )

    llm = get_llm()
    parser = StrOutputParser()

    return prompt | llm | parser
