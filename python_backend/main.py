"""
LIFE-SYNC AI — FastAPI Python Backend for RAG & Gemini AI Data Processing
"""

import os
import sys

# Ensure root workspace and module paths are in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
for p in [PROJECT_ROOT, BASE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

import uvicorn
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

try:
    from python_backend.rag_service import (
        process_documents_and_index,
        perform_rag_query,
        summarize_data,
        GROQ_API_KEY,
        GEMINI_API_KEY
    )
except ImportError:
    from rag_service import (
        process_documents_and_index,
        perform_rag_query,
        summarize_data,
        GROQ_API_KEY,
        GEMINI_API_KEY
    )

# Initialize FastAPI App
app = FastAPI(
    title="LIFE-SYNC AI RAG Backend",
    description="Python FastAPI Service for RAG (Retrieval-Augmented Generation) with Google Gemini AI",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev / client integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas for API Requests & Responses
class DocumentItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = "Document"
    sourceType: Optional[str] = None
    content: Optional[str] = None
    text: Optional[str] = None
    fileData: Optional[str] = None


class ProcessDataRequest(BaseModel):
    documents: List[Dict[str, Any]] = Field(..., description="List of documents to chunk and index")
    chunk_size: Optional[int] = Field(default=400, description="Size of text chunks")
    overlap: Optional[int] = Field(default=80, description="Chunk overlap character count")


class RAGQueryRequest(BaseModel):
    uid: Optional[str] = Field(default=None, description="User ID")
    query: str = Field(..., description="Natural language question/query")
    documents: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional documents for inline context")


class SummarizeDataRequest(BaseModel):
    documents: List[Dict[str, Any]] = Field(..., description="List of documents to summarize")
    focus_area: Optional[str] = Field(default="general", description="Focus area for summary analysis")


# API Routes

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify FastAPI backend, Groq API, Gemini API, and Flask RAG Assistant status."""
    flask_online = False
    try:
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", 5000, timeout=1)
        conn.request("GET", "/loaded-files")
        res = conn.getresponse()
        if res.status == 200:
            flask_online = True
        conn.close()
    except Exception:
        flask_online = False

    return {
        "status": "healthy",
        "service": "LIFE-SYNC FastAPI Python RAG Engine",
        "framework": "FastAPI",
        "primary_llm": "Groq Llama-3.3-70B",
        "groq_api_configured": bool(GROQ_API_KEY),
        "gemini_api_configured": bool(GEMINI_API_KEY),
        "flask_rag_assistant_online": flask_online,
        "version": "1.0.0"
    }


@app.post("/api/rag/process-data", tags=["Data Processing"])
def process_data_endpoint(request: ProcessDataRequest):
    """
    Data Ingestion & Indexing Endpoint.
    Chunks text documents, processes base64 content, and indexes data into the RAG engine.
    """
    try:
        result = process_documents_and_index(request.documents)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and index data: {str(e)}"
        )


@app.post("/api/rag/search", tags=["RAG Query Engine"])
@app.post("/api/rag/query", tags=["RAG Query Engine"])
def rag_search_endpoint(request: RAGQueryRequest):
    """
    RAG Query Endpoint.
    Retrieves top relevant chunks from indexed context and generates a grounded response using Gemini AI.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )

    try:
        result = perform_rag_query(request.query, request.documents)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query execution failed: {str(e)}"
        )


@app.post("/api/rag/summarize", tags=["Data Processing"])
def summarize_endpoint(request: SummarizeDataRequest):
    """
    Data Summarization Endpoint.
    Analyzes raw document batches and synthesizes key insights, patterns, and recommendations using Gemini AI.
    """
    if not request.documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document list cannot be empty."
        )

    try:
        result = summarize_data(request.documents, request.focus_area or "general")
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data summarization failed: {str(e)}"
        )


@app.get("/api/rag/loaded-pdfs", tags=["PDF Management"])
def get_loaded_pdfs_endpoint():
    """Returns list of currently uploaded and indexed PDF documents from RAG-ChatBot storage."""
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "RAG-ChatBot-main", "uploads")
    pdfs = []
    if os.path.exists(uploads_dir):
        pdfs = [f for f in os.listdir(uploads_dir) if f.lower().endswith(".pdf")]
    return {"files": pdfs}


@app.post("/api/rag/upload-pdf", tags=["PDF Management"])
async def upload_pdf_endpoint(file: UploadFile = File(...)):
    """
    PDF File Upload Endpoint.
    Saves PDF file to RAG-ChatBot uploads directory and parses PDF contents into RAG index.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "RAG-ChatBot-main", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    filepath = os.path.join(uploads_dir, file.filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Forward file to Flask RAG-ChatBot server (port 5000) if online
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            files = {'file': (file.filename, content, 'application/pdf')}
            await client.post("http://127.0.0.1:5000/upload", files=files)
    except Exception:
        pass

    return {
        "success": True,
        "message": f"PDF '{file.filename}' uploaded and indexed successfully into RAG Engine.",
        "filename": file.filename
    }


@app.post("/api/rag/delete-pdf", tags=["PDF Management"])
def delete_pdf_endpoint(filename: str):
    """Deletes a PDF file from RAG-ChatBot uploads storage."""
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "RAG-ChatBot-main", "uploads")
    filepath = os.path.join(uploads_dir, filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")

    # Notify Flask RAG server if running
    try:
        import http.client
        import json
        conn = http.client.HTTPConnection("127.0.0.1", 5000, timeout=1)
        conn.request("POST", "/delete-pdf", body=json.dumps({"filename": filename}), headers={"Content-Type": "application/json"})
        conn.close()
    except Exception:
        pass

    return {"success": True, "message": f"Deleted PDF '{filename}'"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[RAG Backend] Starting LIFE-SYNC FastAPI RAG Backend on http://localhost:{port}")
    uvicorn.run("python_backend.main:app", host="0.0.0.0", port=port, reload=True)

