/**
 * Retrieval-Augmented Generation (RAG) Engine
 * Combines local document context & PDF attachments with Google Gemini API & optional Python RAG Service
 */

import { generateGeminiContent, GeminiMediaPart } from "./gemini";
import { getDocuments, getNotes, getTasks, getHealthMetrics, Document, Note, Task, HealthMetrics } from "./db";

export interface RAGContextChunk {
  sourceType: "Document" | "Note" | "Task" | "Health";
  title: string;
  content: string;
  relevanceScore: number;
}

export interface RAGAttachment {
  name: string;
  fileData: string;
  type: string;
}

export interface RAGSearchResult {
  answer: string;
  summary: string;
  retrievedChunks: RAGContextChunk[];
  isPythonBackendUsed?: boolean;
}

const PYTHON_RAG_BACKEND_URL = "http://localhost:8000/api/rag/search";
const PYTHON_RAG_HEALTH_URL = "http://localhost:8000/health";
const FLASK_RAG_URL = "http://localhost:5000";

/**
 * Checks if local Python FastAPI / Flask RAG Service is online and healthy
 */
export async function checkRAGBackendHealth(): Promise<{ online: boolean; service?: string; framework?: string; flaskOnline?: boolean }> {
  try {
    const res = await fetch(PYTHON_RAG_HEALTH_URL, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      return { online: true, service: data.service, framework: data.framework, flaskOnline: data.flask_rag_assistant_online };
    }
  } catch {
    // Continue to check Flask port 5000
  }

  try {
    const flaskRes = await fetch(`${FLASK_RAG_URL}/loaded-files`, { method: "GET" });
    if (flaskRes.ok) {
      return { online: true, service: "RAG Assistant Flask Server", framework: "Flask (app.py)", flaskOnline: true };
    }
  } catch {
    // Offline
  }

  return { online: false };
}

/**
 * Uploads PDF file directly to RAG-ChatBot backend engine
 */
export async function uploadPDFToRAGBackend(file: File): Promise<{ success: boolean; message: string; filename?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    // Try FastAPI endpoint first
    const res = await fetch("http://localhost:8000/api/rag/upload-pdf", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message, filename: data.filename };
    }
  } catch {
    // Continue to Flask
  }

  try {
    // Try Flask server port 5000 direct endpoint
    const flaskRes = await fetch(`${FLASK_RAG_URL}/upload`, {
      method: "POST",
      body: formData,
    });
    if (flaskRes.ok) {
      const data = await flaskRes.json();
      return { success: true, message: data.message || "PDF uploaded to RAG Assistant", filename: data.filename };
    }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to reach RAG backend" };
  }

  return { success: false, message: "PDF Upload failed" };
}

/**
 * Retrieves list of active indexed PDFs from RAG-ChatBot backend
 */
export async function fetchLoadedPDFsFromRAGBackend(): Promise<string[]> {
  try {
    const res = await fetch("http://localhost:8000/api/rag/loaded-pdfs");
    if (res.ok) {
      const data = await res.json();
      return data.files || [];
    }
  } catch {
    // Continue to Flask
  }

  try {
    const flaskRes = await fetch(`${FLASK_RAG_URL}/loaded-files`);
    if (flaskRes.ok) {
      const data = await flaskRes.json();
      return data.files || [];
    }
  } catch {
    // Offline
  }

  return [];
}

/**
 * Deletes a PDF file from RAG-ChatBot index
 */
export async function deletePDFFromRAGBackend(filename: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:8000/api/rag/delete-pdf?filename=${encodeURIComponent(filename)}`, {
      method: "POST",
    });
    if (res.ok) return true;
  } catch {
    // Continue to Flask
  }

  try {
    const flaskRes = await fetch(`${FLASK_RAG_URL}/delete-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    if (flaskRes.ok) return true;
  } catch {
    // Fail
  }

  return false;
}


/**
 * Extracts raw base64 data and MIME type from Data URL for Gemini API multimodal input
 */
function extractMediaFromDataUrl(dataUrl?: string): { mimeType: string; data: string; textContent?: string } | null {
  if (!dataUrl) return null;

  if (!dataUrl.startsWith("data:")) {
    return { mimeType: "text/plain", data: "", textContent: dataUrl };
  }

  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;

  const header = parts[0];
  const rawBase64 = parts[1];
  const mimeType = header.split(";")[0].replace("data:", "");

  if (mimeType.startsWith("text/") || mimeType.includes("json")) {
    try {
      const decodedText = atob(rawBase64);
      return { mimeType, data: rawBase64, textContent: decodedText };
    } catch {
      return { mimeType, data: rawBase64 };
    }
  }

  return { mimeType, data: rawBase64 };
}

/**
 * Searches across workspace documents, reads PDF files natively, and generates a grounded Gemini response
 */
export async function performRAGSearch(
  uid: string,
  query: string,
  attachments?: RAGAttachment[]
): Promise<RAGSearchResult> {
  // 1. Fetch user context documents & data from Firestore / IndexedDB
  const [docs, notes, tasks, health] = await Promise.all([
    getDocuments(uid).catch(() => [] as Document[]),
    getNotes(uid).catch(() => [] as Note[]),
    getTasks(uid).catch(() => [] as Task[]),
    getHealthMetrics(uid).catch(() => null as HealthMetrics | null),
  ]);

  // Include any inline file attachments passed directly in the RAG search call
  const inlineDocs = (attachments || []).map((att, idx) => ({
    id: `attachment_${idx}_${Date.now()}`,
    name: att.name,
    type: att.type,
    size: "Attached File",
    fileData: att.fileData,
    updated: "Just now",
  }));

  const allDocs = [...inlineDocs, ...docs];

  // Format documents array for Python FastAPI backend
  const formattedDocs = [
    ...allDocs.map((d) => ({
      id: d.id,
      title: d.name,
      sourceType: "Document",
      fileData: d.fileData,
      content: `Document Title: "${d.name}" | Format: ${d.type} | Size: ${d.size} | Updated: ${d.updated}`,
    })),
    ...notes.map((n) => ({
      id: n.id,
      title: n.title,
      sourceType: "Note",
      content: `Note Title: "${n.title}" [Tag: ${n.tag}]\nContent: ${n.content}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      sourceType: "Task",
      content: `Task: ${t.title} (Priority: ${t.priority}, Status: ${t.done ? "Completed" : "Pending"}, List: ${t.list})`,
    })),
  ];

  if (health) {
    formattedDocs.push({
      id: "health_vitals",
      title: "Health & Fitness Vitals",
      sourceType: "Health",
      content: `Health Metrics: Sleep: ${health.sleep}, Resting HR: ${health.restingHr || health.heart}, Steps: ${health.steps}, Water: ${health.water}, Device: ${health.gadgetbridgeDevice || "None"}`,
    });
  }

  // 2. Attempt to call local Python FastAPI (port 8000) RAG Service if running
  try {
    const pythonRes = await fetch(PYTHON_RAG_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, query, documents: formattedDocs }),
    });
    if (pythonRes.ok) {
      const data = await pythonRes.json();
      if (data && data.answer) {
        return {
          answer: data.answer,
          summary: data.summary || "",
          retrievedChunks: data.retrievedChunks || [],
          isPythonBackendUsed: true,
        };
      }
    }
  } catch {
    // Continue to Flask check
  }

  // 3. Attempt to call local Flask (port 5000) RAG Assistant (app.py) if running
  try {
    const flaskRes = await fetch(`${FLASK_RAG_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (flaskRes.ok) {
      const data = await flaskRes.json();
      if (data && data.response) {
        return {
          answer: data.response,
          summary: "Retrieved from RAG ChatBot Flask Backend (app.py)",
          retrievedChunks: [
            {
              sourceType: "Document",
              title: "RAG-ChatBot Index (app.py)",
              content: data.response.substring(0, 300),
              relevanceScore: 10,
            },
          ],
          isPythonBackendUsed: true,
        };
      }
    }
  } catch {
    // Python service offline; fallback seamlessly to client-side Gemini RAG engine
  }

  const chunks: RAGContextChunk[] = [];
  const mediaParts: GeminiMediaPart[] = [];

  const qLower = query.toLowerCase();
  const queryTerms = qLower.split(/\s+/).filter((t) => t.length > 2);

  // Score function
  const calcScore = (text: string, title: string) => {
    let score = 0;
    const combined = `${title} ${text}`.toLowerCase();
    if (combined.includes(qLower)) score += 10;
    for (const term of queryTerms) {
      if (combined.includes(term)) score += 3;
    }
    return score;
  };

  // Process Document Vault files AND attached files (PDFs, Images, Text)
  for (const doc of allDocs) {
    const media = extractMediaFromDataUrl(doc.fileData);
    let readableContent = `Document Title: "${doc.name}" | Format: ${doc.type} | Size: ${doc.size} | Updated: ${doc.updated}`;

    if (media?.textContent) {
      readableContent += `\nExtracted Text Content:\n${media.textContent.substring(0, 1000)}`;
    }

    const score = calcScore(readableContent, doc.name);

    chunks.push({
      sourceType: "Document",
      title: doc.name,
      content: readableContent,
      relevanceScore: score + 5, // Give high priority to saved vault files & attachments
    });

    // If file is a PDF or Image, pass raw base64 to Gemini API so Gemini reads full document natively
    if (media && media.data && (media.mimeType === "application/pdf" || media.mimeType.startsWith("image/"))) {
      mediaParts.push({
        mimeType: media.mimeType,
        data: media.data,
      });
    }
  }

  // Process Notes
  for (const note of notes) {
    const score = calcScore(note.content, note.title);
    chunks.push({
      sourceType: "Note",
      title: note.title,
      content: `Note Title: "${note.title}" [Tag: ${note.tag}]\nContent: ${note.content}`,
      relevanceScore: score + 2,
    });
  }

  // Process Tasks
  for (const task of tasks) {
    const score = calcScore(task.list, task.title);
    chunks.push({
      sourceType: "Task",
      title: task.title,
      content: `Task: ${task.title} (Priority: ${task.priority}, Status: ${task.done ? "Completed" : "Pending"}, List: ${task.list})`,
      relevanceScore: score,
    });
  }

  // Process Health Vitals
  if (health) {
    const healthText = `Health Metrics: Sleep Duration: ${health.sleep}, Resting HR: ${health.restingHr || health.heart}, Daily Steps: ${health.steps}, Water Intake: ${health.water}, Connected Wearable: ${health.gadgetbridgeDevice || "None"}`;
    const score = calcScore(healthText, "Health Metrics");
    chunks.push({
      sourceType: "Health",
      title: "Health & Fitness Vitals",
      content: healthText,
      relevanceScore: score,
    });
  }

  // Sort chunks by relevance score
  const topChunks = chunks
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);

  // Build RAG Context Prompt for Google Gemini
  const contextText = topChunks
    .map((c, i) => `--- [Source ${i + 1}: ${c.sourceType} - "${c.title}"] ---\n${c.content}`)
    .join("\n\n");

  const systemInstruction = `You are LIFE-SYNC AI RAG Assistant powered by Google Gemini API. 
You have direct access to the user's saved vault documents, attached PDFs, notes, tasks, and vitals.
Answer the user's query thoroughly using the attached document contents and context. Reference specific file names or documents when providing facts.`;

  const prompt = `User Question: "${query}"

Here are the retrieved user documents and workspace items:
${contextText}

Instructions:
1. Provide a comprehensive, accurate answer based directly on the attached documents and retrieved context above.
2. Mention the specific document title(s) used for your answer.
3. End with a 1-sentence "Summary:" line.`;

  // Call Google Gemini API passing both context text AND multimodal document attachments (PDFs/Images)
  const geminiResult = await generateGeminiContent(prompt, systemInstruction, mediaParts.slice(0, 3));

  const fullText = geminiResult.text;
  const parts = fullText.split("Summary:");
  const answer = parts[0].trim();
  const summary = parts[1] ? parts[1].trim() : `Retrieved ${topChunks.length} matching sources from your vault and workspace.`;

  return {
    answer,
    summary,
    retrievedChunks: topChunks,
    isPythonBackendUsed: false,
  };
}

