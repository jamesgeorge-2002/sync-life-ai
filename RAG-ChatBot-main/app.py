import os
import warnings
from datetime import date
import concurrent.futures
import threading
import time

import numpy as np

try:
    import faiss
except Exception as exc:  # pragma: no cover - dependency guard for missing native wheels
    faiss = None
    print(f"Warning: faiss import failed: {exc}")

from flask import Flask, request, jsonify
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except Exception as exc:  # pragma: no cover - dependency guard for optional AI package
    genai = None
    print(f"Warning: google.generativeai import failed: {exc}")

from pypdf import PdfReader
from werkzeug.utils import secure_filename

# Configuration & Setup
warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

EMBEDDING_MODEL_CANDIDATES = [
    os.getenv('EMBEDDING_MODEL'),
    'models/text-embedding-004',
    'models/embedding-001',
    'gemini-embedding-001',
    'text-embedding-004'
]
CHAT_MODEL_CANDIDATES = [
    os.getenv('CHAT_MODEL'),
    'gemini-2.5-flash',
    'models/gemini-2.5-flash',
    'gemini-2.0-flash',
    'models/gemini-2.0-flash',
    'gemini-flash-latest'
]
EMBEDDING_MODEL = next((m for m in EMBEDDING_MODEL_CANDIDATES if m), 'models/embedding-001')
CHAT_MODEL = next((m for m in CHAT_MODEL_CANDIDATES if m), 'gemini-2.5-flash')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'pdf'}

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

CURRENT_DATE = date.today().isoformat()
KNOWLEDGE_CUTOFF = os.getenv('KNOWLEDGE_CUTOFF', CURRENT_DATE)

SYSTEM_PROMPT = f"""You are a helpful AI assistant trained to answer questions based on provided context documents.
Current date: {CURRENT_DATE}
Knowledge cutoff: {KNOWLEDGE_CUTOFF}

CRITICAL INSTRUCTIONS FOR ACCURACY:
1. ALWAYS prioritize the provided context over your general knowledge when answering questions.
2. If the context contains relevant information to answer the question, use it as your primary source.
3. When using context, cite where the information comes from (e.g., "According to the document..." or "The PDF states...").
4. If the context is insufficient or irrelevant to answer accurately, clearly state this limitation and provide your best general knowledge answer with a disclaimer.
5. Be precise and factual - do not hallucinate or make up information not in the context.
6. If a question cannot be answered from the provided context, explicitly say so instead of guessing.
7. Break down complex answers into clear, organized sections.
8. Verify your answer against the context before providing it.

Guidelines:
- Answer directly and concisely
- Structure multi-part questions into sections
- Always indicate the source of information
- If uncertain, express the uncertainty clearly"""


class RAGService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_available = genai is not None
        self.active_embedding_model = None
        self.active_chat_model = None
        if not self.api_key:
            print("Warning: GEMINI_API_KEY/GOOGLE_API_KEY not set. LLM features will be disabled until you provide an API key.")
            self.api_key = None
        elif self.model_available:
            try:
                if hasattr(genai, 'configure'):
                    genai.configure(api_key=self.api_key)
            except Exception as exc:
                print(f"Warning: Gemini SDK configuration failed: {exc}")
                self.model_available = False
        else:
            print("Warning: Gemini SDK is not available; LLM features will be disabled.")
        # API call timeout (seconds) — lowered to 1.2s for instant response
        try:
            self.api_timeout = float(os.getenv('GEMINI_API_TIMEOUT', '1.2'))
        except Exception:
            self.api_timeout = 1.2

        self.index = None
        self.chunks = []
        self.chunk_sources = []
        self.embeddings = []
        self.loaded_files = []
        self.initialization_complete = False
        # Load and index data in background thread to prevent blocking
        load_thread = threading.Thread(target=self._load_and_index_data_async, daemon=True)
        load_thread.start()

    def _iter_model_names(self, models, prefer_first=None):
        seen = set()
        candidates = []
        for model in ([prefer_first] if prefer_first else []) + list(models or []):
            if not model:
                continue
            if model not in seen:
                seen.add(model)
                candidates.append(model)
        return candidates

    def _embed_with_fallback(self, text, task_type='retrieval_document'):
        for model_name in self._iter_model_names(EMBEDDING_MODEL_CANDIDATES, prefer_first=getattr(self, 'active_embedding_model', None)):
            try:
                res = self._call_api_with_timeout(genai.embed_content, model=model_name, content=text, task_type=task_type)
                if isinstance(res, dict) and 'embedding' in res:
                    self.active_embedding_model = model_name
                    return res['embedding']
                if hasattr(res, 'embedding'):
                    self.active_embedding_model = model_name
                    return res.embedding
            except Exception as exc:
                last_error = exc
                continue
        raise last_error if 'last_error' in locals() else ValueError("Embedding generation failed for all configured model names.")

    def _generate_with_fallback(self, prompt):
        for model_name in self._iter_model_names(CHAT_MODEL_CANDIDATES, prefer_first=getattr(self, 'active_chat_model', None)):
            try:
                model = genai.GenerativeModel(model_name)
                res = self._call_api_with_timeout(model.generate_content, prompt)
                self.active_chat_model = model_name
                return res
            except Exception as exc:
                last_error = exc
                continue
        raise last_error if 'last_error' in locals() else ValueError("Chat generation failed for all configured model names.")

    def _rank_chunks_by_keywords(self, query: str, candidate_indices: list) -> list:
        """Instantly rank candidate chunk indices by keyword overlap with query in <1ms."""
        import re
        q_words = [w for w in re.findall(r'\w+', query.lower()) if len(w) > 2]
        if not q_words:
            return candidate_indices[:6]
        
        scored = []
        for idx in candidate_indices:
            text = self.chunks[idx].lower()
            score = sum(1 for w in q_words if w in text)
            scored.append((score, idx))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        top_indices = [idx for score, idx in scored if score > 0]
        return top_indices[:6] if top_indices else candidate_indices[:6]

    def _fallback_response(self, query: str, context: str = "") -> str:
        q = (query or "").strip().lower()
        if not q:
            return "Hello! How can I help you today?"

        if not context:
            if "hello" in q or "hi" in q:
                return "Hello! How can I help you today?"
            if "upload" in q or "pdf" in q:
                return "You can upload a PDF using the upload button to start asking questions."
            return "Please upload a PDF or ask a question about your document."

        # Summary or general overview queries
        summary_triggers = {'summarize', 'summary', 'overview', 'key points', 'explain', 'concept', 'concepts', 'point', 'points'}
        if any(t in q for t in summary_triggers):
            lines = [line.strip() for line in context.split('\n') if len(line.strip()) > 25]
            summary_points = lines[:5]
            if summary_points:
                formatted_points = "\n• " + "\n• ".join(summary_points)
                return f"Summary of the uploaded document:\n{formatted_points}"
            return f"Document Overview:\n{context[:450]}"

        # Search context for relevant lines
        query_terms = [t for t in q.replace("?", " ").split() if len(t) > 2]
        best_lines = []
        for line in context.split("\n"):
            line_text = line.strip()
            if not line_text or len(line_text) < 15:
                continue
            score = sum(1 for term in query_terms if term in line_text.lower())
            if score > 0:
                best_lines.append((score, line_text))

        if best_lines:
            best_lines.sort(key=lambda x: x[0], reverse=True)
            top_matches = [l for s, l in best_lines[:3]]
            return "Based on your document:\n\n" + "\n\n".join(top_matches)

        return f"Document Excerpt:\n{context[:400]}"

    def _call_api_with_timeout(self, func, *args, timeout=None, **kwargs):
        """Call a blocking function in a thread and enforce a timeout.

        Returns function result or raises concurrent.futures.TimeoutError.
        """
        if timeout is None:
            timeout = self.api_timeout
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(func, *args, **kwargs)
            return fut.result(timeout=timeout)

    def _load_and_index_data(self):
        """Loads assets/sample.txt and auto-loads existing PDFs in uploads directory."""
        file_path = os.path.join(os.path.dirname(__file__), "assets", "sample.txt")
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                self.chunks = [line.strip() for line in f if line.strip()]
            self.chunk_sources = ['asset'] * len(self.chunks)

        # Auto-load existing PDFs in uploads directory on startup
        if os.path.exists(UPLOAD_FOLDER):
            for fname in os.listdir(UPLOAD_FOLDER):
                if fname.lower().endswith('.pdf'):
                    pdf_path = os.path.join(UPLOAD_FOLDER, fname)
                    try:
                        self.add_pdf(pdf_path)
                    except Exception as exc:
                        print(f"Warning: Auto-loading PDF {fname} failed: {exc}")

    def _rebuild_index(self):
        """Rebuilds the FAISS index from embeddings."""
        if not self.embeddings:
            self.index = None
            return

        if faiss is None:
            self.index = None
            print("Warning: FAISS is unavailable; retrieval index cannot be built.")
            return

        vecs = np.array(self.embeddings).astype('float32')
        self.index = faiss.IndexFlatL2(vecs.shape[1])
        self.index.add(vecs)

    def _clean_markdown(self, text):
        """Remove markdown formatting for clean plain text output."""
        import re
        # Remove bold markdown: **text** or __text__ -> text
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'__([^_]+)__', r'\1', text)
        # Remove italic markdown: *text* or _text_ -> text
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)
        # Remove code formatting: `text` -> text
        text = re.sub(r'`([^`]+)`', r'\1', text)
        # Remove heading markers: # ## ### etc
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        return text

    def _calculate_relevance_score(self, query: str, context: str) -> float:
        """Calculate relevance score between query and context (0.0 to 1.0)."""
        if not query or not context:
            return 0.0
        import re
        q_lower = query.lower()
        
        # Meta/summary query keywords where document context is requested
        general_meta_keywords = {
            'summarize', 'summary', 'summarise', 'summersaize', 'sumarize', 'sumary',
            'overview', 'explain', 'concept', 'concepts', 'point', 'points', 'key',
            'main', 'detail', 'details', 'question', 'questions', 'document', 'pdf',
            'contents', 'describe', 'brief', 'tell', 'about', 'what'
        }
        query_words = re.findall(r'\w+', q_lower)
        
        # If user is asking for a summary/overview/meta question about the document
        if any(w in general_meta_keywords for w in query_words):
            return 1.0

        stop_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'of',
            'for', 'to', 'and', 'or', 'it', 'this', 'that', 'what', 'where', 'when',
            'how', 'who', 'why', 'can', 'you', 'tell', 'me', 'about', 'with', 'from',
            'as', 'by', 'be', 'do', 'does', 'did', 'have', 'has', 'had'
        }
        meaningful_words = [w for w in query_words if w not in stop_words and len(w) > 1]
        if not meaningful_words:
            return 1.0  # Default to relevant if only stop words were queried

        context_lower = context.lower()
        matches = sum(1 for w in meaningful_words if any(w in term or term in w for term in context_lower.split()))
        if matches > 0:
            return max(0.5, matches / len(meaningful_words))
        
        # If FAISS retrieved chunks and context exists, provide baseline relevance for LLM evaluation
        return 0.3 if len(context) > 50 else 0.0


    def _load_and_index_data_async(self):
        """Load and index data in background thread to prevent blocking startup."""
        try:
            self._load_and_index_data()
            self.initialization_complete = True
        except Exception as e:
            print(f"ERROR during async initialization: {e}")
            self.initialization_complete = True
    def add_pdf(self, pdf_path):
        """Extracts text from PDF and adds it to the knowledge base."""
        try:
            pdf_reader = PdfReader(pdf_path)
            pdf_text = ""
            
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    pdf_text += text + "\n"
            
            # Better chunking with overlap and minimum size
            pdf_text = pdf_text.strip()
            if not pdf_text:
                return False, "No text found in PDF"
            
            # Split into meaningful chunks (paragraphs first, then by size)
            paragraphs = [p.strip() for p in pdf_text.split('\n\n') if p.strip()]
            new_chunks = []
            
            # Use paragraphs if available, otherwise use sliding window
            if paragraphs and len(paragraphs) > 1:
                # Combine short paragraphs and split long ones
                current_chunk = ""
                for para in paragraphs:
                    if len(current_chunk) + len(para) < 1000:
                        current_chunk += para + " "
                    else:
                        if current_chunk.strip():
                            new_chunks.append(current_chunk.strip())
                        current_chunk = para + " "
                if current_chunk.strip():
                    new_chunks.append(current_chunk.strip())
            else:
                # Fallback: sliding window chunking
                chunk_size = 500
                overlap = 100
                for i in range(0, len(pdf_text), chunk_size - overlap):
                    chunk = pdf_text[i:i + chunk_size].strip()
                    if len(chunk) > 50:  # Minimum chunk size
                        new_chunks.append(chunk)
            
            if not new_chunks:
                return False, "No text found in PDF"
            
            filename = os.path.basename(pdf_path)
            new_embeddings = []
            
            # Generate embeddings for new chunks (optional, non-blocking for registration)
            if self.api_key and self.model_available:
                try:
                    for chunk in new_chunks:
                        try:
                            emb = self._embed_with_fallback(chunk, task_type="retrieval_document")
                            if emb is not None:
                                new_embeddings.append(emb)
                        except Exception as e:
                            print(f"WARN: Chunk embedding failed: {e}")
                except Exception as e:
                    print(f"WARN: Embedding generation skipped for PDF ({e}).")

            # Always add text chunks and register document source
            self.chunks.extend(new_chunks)
            self.chunk_sources.extend([filename] * len(new_chunks))
            if new_embeddings and len(new_embeddings) == len(new_chunks):
                self.embeddings.extend(new_embeddings)
                self._rebuild_index()

            if filename not in self.loaded_files:
                self.loaded_files.append(filename)

            print(f"PDF '{filename}' added successfully. Total chunks: {len(self.chunks)}")
            return True, f"Added {len(new_chunks)} chunks from PDF"
        except Exception as e:
            print(f"ERROR: PDF parsing failed: {e}")
            return False, f"Failed to parse PDF: {str(e)}"

    def get_response(self, query: str, mode: str = 'pdf', document: str = None) -> str:
        """Retrieves context from PDFs and generates a response."""
        # Check if any PDFs are loaded or stored in chunk_sources
        pdf_chunk_indices = [i for i, src in enumerate(self.chunk_sources) if src != 'asset']
        
        if not self.loaded_files and not pdf_chunk_indices:
            return "❌ Please upload a PDF first to ask questions. Click the upload area above to add a document."

        # Filter by requested document name if specified
        doc_name = os.path.basename(document) if document and document != 'all' else None
        pdf_indices = [
            i for i in pdf_chunk_indices
            if not doc_name or os.path.basename(self.chunk_sources[i]) == doc_name
        ]

        # Fallback to all non-asset PDF indices if specific doc filter returned empty
        if not pdf_indices:
            pdf_indices = pdf_chunk_indices

        if not pdf_indices:
            return "❌ Please upload a PDF first to ask questions."

        try:
            context = ""
            retrieved_chunks = []
            picked = []

            # Check if query is a summary/meta request
            import re
            query_words = re.findall(r'\w+', query.lower())
            meta_keywords = {'summarize', 'summary', 'summarise', 'summersaize', 'sumarize', 'sumary', 'overview', 'explain', 'concept', 'concepts', 'point', 'points', 'key', 'main'}
            is_meta_query = any(w in meta_keywords for w in query_words)

            # Instantly rank PDF chunks by keyword overlap (<1ms)
            picked = self._rank_chunks_by_keywords(query, pdf_indices)

            # Attempt optional FAISS vector search if keyword match produced default fallback
            if not is_meta_query and self.index and self.chunks and len(picked) < 3:
                try:
                    q_emb = None
                    try:
                        q_emb = self._embed_with_fallback(query, task_type="retrieval_query")
                    except Exception:
                        pass
                    
                    if q_emb is not None:
                        q_vec = np.array([q_emb]).astype('float32')
                        k_search = min(len(self.chunks), max(25, len(pdf_indices)))
                        distances, indices = self.index.search(q_vec, k=k_search)

                        for idx in indices[0]:
                            if idx >= len(self.chunks):
                                continue
                            if idx in pdf_indices and idx not in picked:
                                picked.append(idx)
                                if len(picked) >= 6:
                                    break
                except Exception as e:
                    print(f"WARN: FAISS retrieval exception: {e}")

            # Fallback for summary queries or when top-k search picked fewer than 3 chunks
            if len(picked) < 3 and pdf_indices:
                for idx in pdf_indices:
                    if idx not in picked:
                        picked.append(idx)
                        if len(picked) >= 6:
                            break

            if picked:
                retrieved_chunks = [self.chunks[i] for i in picked]
                context = "\n\n---\n\n".join(retrieved_chunks)

            # If no context found at all
            if not context or not retrieved_chunks:
                return f"❌ I couldn't find relevant information in the uploaded PDF to answer your question: '{query}'\n\nPlease try:\n- Using different keywords\n- Uploading a PDF with relevant content\n- Asking a more specific question"

            # Check relevance score
            relevance_score = self._calculate_relevance_score(query, context)
            print(f"DEBUG: Relevance score: {relevance_score:.2f}")

            # If Gemini API key is unavailable, use local text fallback directly
            if not self.api_key or not self.model_available:
                return self._fallback_response(query, context)

            try:
                prompt = f"""You are a PDF document Q&A assistant. Answer questions ONLY based on the provided document content.

Document Content:
{context}

User Question: {query}

IMPORTANT RULES:
1. Answer ONLY using information from the document above
2. If the document doesn't contain information to answer the question, say "This information is not available in the provided document"
3. Be factual and clear in your response
4. Format your answer as plain text - do NOT use markdown, bold (*), italics, or any special formatting
5. Keep the answer clear, concise, and easy to read"""
                
                gen_res = self._generate_with_fallback(prompt)
                
                response_text = None
                if hasattr(gen_res, 'text'):
                    response_text = gen_res.text
                elif isinstance(gen_res, dict) and 'text' in gen_res:
                    response_text = gen_res['text']
                else:
                    response_text = str(gen_res)
                
                return self._clean_markdown(response_text)
            except Exception as e:
                print(f"WARN: Generation failed ({e}), using local context fallback.")
                return self._fallback_response(query, context)

        except Exception as e:
            error_str = str(e)
            print(f"ERROR processing request: {error_str}")
            if "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str:
                return "⚠️ API Rate Limit / Quota Exceeded. Please wait a minute and try again."
            return f"❌ Error: {error_str[:100]}"

    def remove_pdf(self, filename):
        """Remove a loaded PDF and its embedded chunks from the active knowledge base."""
        filename = os.path.basename(filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if filename in self.loaded_files:
            self.loaded_files.remove(filename)

        to_remove = [i for i, src in enumerate(self.chunk_sources) if src == filename]
        for idx in sorted(to_remove, reverse=True):
            if idx < len(self.chunks):
                self.chunks.pop(idx)
            if idx < len(self.embeddings):
                self.embeddings.pop(idx)
            if idx < len(self.chunk_sources):
                self.chunk_sources.pop(idx)

        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        self._rebuild_index()

        return True, f"Removed PDF: {filename}"

    def get_loaded_files(self):
        """Returns list of currently loaded PDF files."""
        return self.loaded_files

# Flask Application
app = Flask(__name__, static_folder='static')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
rag = RAGService()

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        payload = request.json or {}
        query = payload.get('query', '')
        mode = payload.get('mode', 'pdf')
        document = payload.get('document') or payload.get('context')
        if not query:
            return jsonify({"response": "Please ask a question."})
        response = rag.get_response(query, mode, document=document)
        return jsonify({"response": response})
    except TimeoutError as e:
        print(f"ERROR in /chat: {e}")
        return jsonify({"response": "⚠️ The request took too long. This usually means the PDF is being processed. Please try again in a moment."}), 200
    except Exception as e:
        print(f"ERROR in /chat: {e}")
        return jsonify({"response": f"❌ Error: {str(e)}"}), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle PDF file upload."""
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file provided"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Only PDF files are allowed"}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        success, message = rag.add_pdf(filepath)
        
        if success:
            return jsonify({
                "success": True,
                "message": message,
                "filename": filename,
                "loaded_files": rag.get_loaded_files()
            }), 200
        else:
            os.remove(filepath)
            return jsonify({"success": False, "message": message}), 400
    
    except Exception as e:
        print(f"ERROR: File upload failed: {e}")
        return jsonify({"success": False, "message": f"Upload error: {str(e)}"}), 500

@app.route('/loaded-files', methods=['GET'])
def get_loaded_files():
    """Get list of currently loaded PDF files."""
    return jsonify({"files": rag.get_loaded_files()}), 200

@app.route('/delete-pdf', methods=['POST'])
def delete_pdf():
    """Delete a PDF from storage and remove its indexed chunks."""
    payload = request.json or request.form or {}
    filename = payload.get('filename') or payload.get('file')

    if not filename:
        return jsonify({"success": False, "message": "No PDF filename provided"}), 400

    filename = os.path.basename(filename)
    if filename not in rag.get_loaded_files():
        return jsonify({"success": False, "message": f"PDF not found: {filename}"}), 404

    success, message = rag.remove_pdf(filename)
    return jsonify({
        "success": success,
        "message": message,
        "loaded_files": rag.get_loaded_files()
    }), 200 if success else 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
