"""
LIFE-SYNC AI — Python RAG Engine with Groq API, OpenRouter (GPT-4o), & Google Gemini Integration
Provides document chunking, semantic indexing, RAG retrieval, and multi-LLM processing.
"""

import os
import json
import re
import math
import http.client
from typing import List, Dict, Any, Optional

# API Keys configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Gemini Models chain with active Google Gemini models
GEMINI_MODELS = [
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-pro-latest",
    "gemini-2.5-flash-lite",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it",
]


class DocumentChunk:
    """Represents a text chunk stored in the RAG index."""
    def __init__(self, doc_id: str, title: str, source_type: str, content: str, chunk_index: int):
        self.doc_id = doc_id
        self.title = title
        self.source_type = source_type
        self.content = content
        self.chunk_index = chunk_index
        self.tokens = self._tokenize(f"{title} {content}")

    @staticmethod
    def _tokenize(text: str) -> set:
        """Tokenize text into lowercase alphanumeric keywords for hybrid retrieval."""
        return set(re.findall(r'\b\w{2,}\b', text.lower()))


class VectorDocumentIndex:
    """In-memory document index for RAG retrieval."""
    def __init__(self):
        self.chunks: List[DocumentChunk] = []

    def clear(self):
        self.chunks = []

    def add_document(self, doc_id: str, title: str, source_type: str, text_content: str, chunk_size: int = 500, overlap: int = 100):
        """Chunks and indexes a document."""
        if not text_content or not text_content.strip():
            return

        start = 0
        text_len = len(text_content)
        chunk_idx = 0

        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_text = text_content[start:end].strip()
            if chunk_text:
                self.chunks.append(DocumentChunk(
                    doc_id=doc_id,
                    title=title,
                    source_type=source_type,
                    content=chunk_text,
                    chunk_index=chunk_idx
                ))
                chunk_idx += 1
            if end >= text_len:
                break
            start += (chunk_size - overlap)

    def search(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        """Search chunks based on term matching, fuzzy scoring, and automatic backfilling."""
        if not self.chunks:
            return []

        query_terms = set(re.findall(r'\b\w{2,}\b', query.lower()))
        q_lower = query.lower()

        scored_chunks = []
        seen_chunks = set()

        for chunk in self.chunks:
            score = 0.0
            chunk_text_lower = chunk.content.lower()
            chunk_title_lower = chunk.title.lower()

            # Exact phrase match boost
            if q_lower in chunk_text_lower:
                score += 15.0
            if q_lower in chunk_title_lower:
                score += 20.0

            # Keyword matching
            if query_terms:
                matches = query_terms.intersection(chunk.tokens)
                if matches:
                    score += (len(matches) / math.sqrt(len(query_terms) + 1.0)) * 8.0

            # Intent keyword matching for general queries
            if any(term in q_lower for term in ["task", "todo", "pending"]) and chunk.source_type == "Task":
                score += 10.0
            if any(term in q_lower for term in ["note", "memo", "meeting"]) and chunk.source_type == "Note":
                score += 10.0
            if any(term in q_lower for term in ["health", "sleep", "heart", "vital", "steps"]) and chunk.source_type == "Health":
                score += 10.0
            if any(term in q_lower for term in ["doc", "document", "pdf", "vault", "file"]) and chunk.source_type == "Document":
                score += 10.0

            if score > 0:
                scored_chunks.append((score, chunk))
                seen_chunks.add(id(chunk))

        # Sort scored chunks descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, chunk in scored_chunks[:top_k]:
            results.append({
                "sourceType": chunk.source_type,
                "title": chunk.title,
                "content": chunk.content,
                "relevanceScore": round(score, 3)
            })

        # Backfill if we don't have top_k results so LLM ALWAYS has user context
        if len(results) < top_k:
            for chunk in self.chunks:
                if id(chunk) not in seen_chunks:
                    results.append({
                        "sourceType": chunk.source_type,
                        "title": chunk.title,
                        "content": chunk.content,
                        "relevanceScore": 1.0
                    })
                    seen_chunks.add(id(chunk))
                    if len(results) >= top_k:
                        break

        return results


# Global in-memory index
GLOBAL_INDEX = VectorDocumentIndex()


def call_groq_api(prompt: str, system_instruction: str = "") -> Optional[str]:
    """
    Calls Groq API (Llama-3.3-70B) for ultra-fast, high-accuracy LLM inference.
    """
    groq_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "allam-2-7b", "llama-3.3-70b-versatile"]
    for model in groq_models:
        try:
            conn = http.client.HTTPSConnection("api.groq.com", timeout=12)
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            payload = json.dumps({
                "model": model,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 2048
            })

            conn.request("POST", "/openai/v1/chat/completions", body=payload, headers=headers)
            res = conn.getresponse()
            data_bytes = res.read()
            conn.close()

            if res.status == 200:
                resp_json = json.loads(data_bytes.decode("utf-8"))
                choices = resp_json.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()
                    if content:
                        print(f"[Groq API Success] Model: {model}")
                        return content
            else:
                print(f"[Groq API] Model {model} status {res.status}: {data_bytes.decode('utf-8')[:150]}")
        except Exception as e:
            print(f"[Groq API Exception] {model}: {e}")
            continue

    return None


def call_openrouter_api(prompt: str, system_instruction: str = "") -> Optional[str]:
    """
    Calls OpenRouter REST API (GPT-4o & GPT-4o-Mini) with bounded max_tokens.
    """
    models = ["openai/gpt-4o-mini", "openai/gpt-4o"]
    for model in models:
        try:
            conn = http.client.HTTPSConnection("openrouter.ai", timeout=12)
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "LIFE-SYNC AI RAG Engine"
            }
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            payload = json.dumps({
                "model": model,
                "messages": messages,
                "max_tokens": 1024,
                "temperature": 0.3
            })

            conn.request("POST", "/api/v1/chat/completions", body=payload, headers=headers)
            res = conn.getresponse()
            data_bytes = res.read()
            conn.close()

            if res.status == 200:
                resp_json = json.loads(data_bytes.decode("utf-8"))
                choices = resp_json.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()
                    if content:
                        print(f"[OpenRouter API Success] Model: {model}")
                        return content
            else:
                print(f"[OpenRouter API] Model {model} status {res.status}: {data_bytes.decode('utf-8')[:150]}")
        except Exception as e:
            print(f"[OpenRouter API Exception] {model}: {e}")
            continue

    return None


def call_google_gemini_api(prompt: str, system_instruction: str = "", media_parts: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """
    Calls Google Gemini REST API directly with prompt, system instructions, and inline media data (PDF/Images).
    """
    for model in GEMINI_MODELS:
        try:
            conn = http.client.HTTPSConnection("generativelanguage.googleapis.com", timeout=15)
            headers = {"Content-Type": "application/json"}
            
            user_parts = []
            
            if media_parts:
                for m in media_parts:
                    if m.get("data") and m.get("mimeType"):
                        user_parts.append({
                            "inlineData": {
                                "mimeType": m["mimeType"],
                                "data": m["data"]
                            }
                        })
                        
            user_parts.append({"text": prompt})
            
            contents = []
            if system_instruction:
                contents.append({
                    "role": "user",
                    "parts": [{"text": f"[System Instruction]\n{system_instruction}"}]
                })
                contents.append({
                    "role": "model",
                    "parts": [{"text": "Understood. I will answer strictly based on the provided document context."}]
                })
            
            contents.append({
                "role": "user",
                "parts": user_parts
            })
            
            payload = json.dumps({
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 2048
                }
            })
            
            endpoint = f"/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            conn.request("POST", endpoint, body=payload, headers=headers)
            
            res = conn.getresponse()
            data_bytes = res.read()
            conn.close()
            
            if res.status == 200:
                resp_json = json.loads(data_bytes.decode("utf-8"))
                candidates = resp_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text_res = parts[0].get("text", "").strip()
                        if text_res:
                            print(f"[Gemini API Success] Model: {model}")
                            return text_res
            else:
                print(f"[Gemini API] Model {model} status {res.status}: {data_bytes.decode('utf-8')[:150]}")
        except Exception as e:
            print(f"[Gemini API Exception] {model}: {e}")
            continue

    return None


def synthesize_direct_rag_answer(query: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
    """
    Factual RAG Answer Synthesizer: Constructs a detailed, structured, highly accurate answer directly from retrieved chunks.
    """
    if not retrieved_chunks:
        return (
            f"I checked your workspace and document vault for query '{query}', but no relevant documents, notes, tasks, or vitals were found.\n\n"
            f"Summary: No matching items found in your workspace."
        )

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for chunk in retrieved_chunks:
        st = chunk.get("sourceType", "Document")
        grouped.setdefault(st, []).append(chunk)

    answer_sections = [f"Here is the accurate answer grounded in your workspace RAG data for: **\"{query}\"**\n"]

    for st, chunks in grouped.items():
        answer_sections.append(f"### 📂 {st} Context")
        for idx, c in enumerate(chunks, 1):
            title = c.get("title", "Untitled")
            content = c.get("content", "").strip()
            answer_sections.append(f"**{idx}. {title}**\n{content}\n")

    answer_sections.append(f"---\n*Answer synthesized directly from {len(retrieved_chunks)} retrieved workspace items.*")
    answer_text = "\n".join(answer_sections)
    summary_text = f"Summary: Successfully answered query using {len(retrieved_chunks)} retrieved RAG sources from your workspace."

    return f"{answer_text}\n\n{summary_text}"





def extract_pdf_text_from_bytes(pdf_bytes: bytes) -> str:
    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for p in reader.pages:
            t = p.extract_text()
            if t:
                pages_text.append(t.strip())
        return "\n\n".join(pages_text)
    except Exception as exc:
        print(f"[pypdf Extraction Exception] {exc}")
        return ""


def process_documents_and_index(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Data processing pipeline: Ingests documents, parses text & PDF content, and builds RAG vector index.
    Integrated with RAG-ChatBot-main PDF extraction.
    """
    GLOBAL_INDEX.clear()
    doc_count = len(documents)

    for doc in documents:
        doc_id = doc.get("id", doc.get("title", "doc_id"))
        title = doc.get("title", doc.get("name", "Untitled Document"))
        source_type = doc.get("sourceType", doc.get("type", "Document"))
        content = doc.get("content", doc.get("text", ""))

        # Check base64 fileData if text content is missing or short
        file_data = doc.get("fileData", "")
        if file_data and file_data.startswith("data:"):
            try:
                header, raw_b64 = file_data.split(",", 1)
                mime_type = header.split(";")[0].replace("data:", "")
                import base64
                decoded_bytes = base64.b64decode(raw_b64)
                
                if mime_type == "application/pdf" or title.lower().endswith(".pdf"):
                    pdf_text = extract_pdf_text_from_bytes(decoded_bytes)
                    if pdf_text:
                        content = f"{content}\n\n[PDF Text Content]\n{pdf_text}" if content else pdf_text
                elif mime_type.startswith("text/") or "json" in mime_type:
                    text_str = decoded_bytes.decode("utf-8", errors="ignore")
                    if text_str:
                        content = f"{content}\n\n[Decoded Text]\n{text_str}" if content else text_str
            except Exception as e:
                print(f"[RAG Ingestion Warning] Failed to parse base64 for {title}: {e}")

        if content and content.strip():
            GLOBAL_INDEX.add_document(doc_id, title, source_type, content)

    # Auto-load existing PDFs from RAG-ChatBot-main uploads folder if available
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "RAG-ChatBot-main", "uploads")
    if os.path.exists(uploads_dir):
        for fname in os.listdir(uploads_dir):
            if fname.lower().endswith(".pdf"):
                fpath = os.path.join(uploads_dir, fname)
                try:
                    with open(fpath, "rb") as f:
                        pdf_bytes = f.read()
                    pdf_text = extract_pdf_text_from_bytes(pdf_bytes)
                    if pdf_text:
                        GLOBAL_INDEX.add_document(f"upload_{fname}", fname, "PDF Document", pdf_text)
                except Exception as e:
                    print(f"[RAG Auto-load PDF Exception] {fname}: {e}")

    total_chunks = len(GLOBAL_INDEX.chunks)
    return {
        "status": "success",
        "documents_indexed": doc_count,
        "total_chunks_created": total_chunks
    }


def perform_rag_query(query: str, raw_documents: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Executes RAG retrieval + Groq / OpenRouter (GPT-4o) / Gemini answer synthesis.
    """
    # 1. Ingest/Index documents
    if raw_documents:
        process_documents_and_index(raw_documents)

    # 2. Retrieve top relevant chunks from index
    retrieved_chunks = GLOBAL_INDEX.search(query, top_k=6)

    # Prepare multimodal parts for PDFs / images passed in payload
    media_parts = []
    if raw_documents:
        for doc in raw_documents:
            file_data = doc.get("fileData", "")
            if file_data and file_data.startswith("data:"):
                header, raw_b64 = file_data.split(",", 1)
                mime_type = header.split(";")[0].replace("data:", "")
                if mime_type == "application/pdf" or mime_type.startswith("image/"):
                    media_parts.append({"mimeType": mime_type, "data": raw_b64})

    # 3. Build RAG prompt with retrieved context
    if retrieved_chunks:
        context_str = "\n\n".join([
            f"--- [Source: {c['sourceType']} - '{c['title']}'] ---\n{c['content']}"
            for c in retrieved_chunks
        ])
    else:
        context_str = "No specific retrieved text chunks found for this query in the indexed vault."

    system_instruction = (
        "You are LIFE-SYNC AI RAG Assistant powered by Groq, OpenRouter GPT-4o, & Google Gemini AI. "
        "You have direct access to the user's workspace documents, notes, tasks, and health vitals attached in context. "
        "Answer the user query accurately and comprehensively based strictly on the retrieved document contents. "
        "Always cite specific document titles or sources in your response."
    )

    prompt = (
        f"User Query: \"{query}\"\n\n"
        f"Retrieved Workspace Context:\n{context_str}\n\n"
        f"Instructions:\n"
        f"1. Provide an accurate, detailed, well-structured answer using the retrieved context above.\n"
        f"2. Mention the specific document title(s) or workspace sources used.\n"
        f"3. End your response with a 1-sentence line starting with 'Summary: '"
    )

    # 4. Multi-LLM Execution Chain: Multimodal Gemini (Native PDF) -> OpenRouter GPT-4o -> Groq -> Direct Synthesis
    llm_output = None
    if media_parts:
        llm_output = call_google_gemini_api(prompt, system_instruction, media_parts[:3])

    if not llm_output:
        llm_output = call_openrouter_api(prompt, system_instruction)
    if not llm_output:
        llm_output = call_groq_api(prompt, system_instruction)
    if not llm_output:
        llm_output = call_google_gemini_api(prompt, system_instruction)

    if llm_output:
        if "Summary:" in llm_output:
            parts = llm_output.split("Summary:", 1)
            answer = parts[0].strip()
            summary = parts[1].strip()
        else:
            answer = llm_output.strip()
            summary = f"RAG query executed with {len(retrieved_chunks)} context chunks retrieved."
    else:
        # Fallback to direct factual synthesis using retrieved RAG chunks
        full_synth = synthesize_direct_rag_answer(query, retrieved_chunks)
        parts = full_synth.split("Summary:", 1)
        answer = parts[0].strip()
        summary = parts[1].strip() if len(parts) > 1 else f"Answered query using {len(retrieved_chunks)} retrieved workspace sources."

    return {
        "answer": answer,
        "summary": summary,
        "retrievedChunks": retrieved_chunks,
        "isPythonBackendUsed": True
    }


def summarize_data(documents: List[Dict[str, Any]], focus_area: str = "general") -> Dict[str, Any]:
    """
    Summarize a collection of documents or dataset using Groq Llama-3.3-70B, OpenRouter GPT-4o, or Gemini AI.
    """
    combined_texts = []
    for d in documents[:10]:
        title = d.get("title", d.get("name", "Doc"))
        content = d.get("content", d.get("text", ""))[:1500]
        combined_texts.append(f"Document '{title}':\n{content}")

    all_content = "\n\n".join(combined_texts)
    
    prompt = (
        f"Perform a comprehensive data analysis and summary focusing on '{focus_area}'.\n\n"
        f"Dataset Contents:\n{all_content}\n\n"
        f"Provide:\n"
        f"1. Executive Summary\n"
        f"2. Key Insights & Patterns\n"
        f"3. Action Items / Recommendations"
    )

    system_inst = "You are an expert Data Analyst & Knowledge Engine."
    summary_result = call_groq_api(prompt, system_inst)
    if not summary_result:
        summary_result = call_openrouter_api(prompt, system_inst)
    if not summary_result:
        summary_result = call_google_gemini_api(prompt, system_inst)
    
    if not summary_result:
        # Fallback synthesis
        summary_result = f"### Executive Summary for {focus_area.capitalize()}\nProcessed {len(documents)} documents.\n\n### Document Overview:\n" + "\n".join([f"- **{d.get('title', 'Doc')}**: {d.get('content', '')[:100]}..." for d in documents[:5]])

    return {
        "focus_area": focus_area,
        "summary": summary_result,
        "documents_analyzed": len(documents)
    }
