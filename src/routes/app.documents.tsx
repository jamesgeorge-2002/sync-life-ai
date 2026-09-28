import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Upload, FileText, Shield, Search, X, Trash, Download, Eye, FileCheck, Filter, FileCode, Bot, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { getDocuments, addDocument, deleteDocument, Document } from "@/lib/db";
import { uploadPDFToRAGBackend, deletePDFFromRAGBackend } from "@/lib/rag";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/documents")({ component: DocsPage });

// Sample minimal valid PDF base64 Data URL for default/mock saved PDF documents
const SAMPLE_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nE3LwQ0AIAgEQFuYwNn/u8gH0ZtMspucp4g1qQW50aH3cM2kU7U7Gv39N28G5woL+QoLCiVuZHN0cmVhbQplbmRvYmoKMyAwIG9iagozNAplbmRvYmoKMSAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDQgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vQ29udGVudHMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNCAwIFI+PgplbmRvYmoKNyAwIG9iago8PC9TaXplIDgvUm9vdCA2IDAgUj4+CnN0YXJ0eHJlZgoyNDgKJSVFT0Y=";

function DocsPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | "PDF" | "DOCX" | "IMAGE" | "OTHER">("ALL");

  // Upload dialog form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("1.2 MB");
  const [fileType, setFileType] = useState("PDF");
  const [fileData, setFileData] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Document viewer modal state
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!authUser) return;
    try {
      const list = await getDocuments(authUser.uid);
      setDocs(list);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [authUser]);

  // Open upload modal configured specifically for PDF files
  const openPdfUpload = () => {
    setFileType("PDF");
    setFileName("");
    setFileSize("1.0 MB");
    setFileData(SAMPLE_PDF_DATA_URL);
    setSelectedFile(null);
    setIsUploadOpen(true);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);

    // Calculate file size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB < 0.1) {
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    } else {
      setFileSize(`${sizeInMB.toFixed(1)} MB`);
    }

    // Determine type
    const ext = file.name.split(".").pop()?.toUpperCase() || "PDF";
    setFileType(ext);

    // Read file data as base64 Data URL so it can be stored & rendered/downloaded
    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      toast.error("Failed to read file contents");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !fileName.trim()) return;

    setIsSaving(true);
    try {
      const finalFileData = fileData || (fileType.toUpperCase() === "PDF" ? SAMPLE_PDF_DATA_URL : "");

      await addDocument(authUser.uid, {
        name: fileName.trim(),
        size: fileSize,
        type: fileType.toUpperCase(),
        updated: "Just now",
        fileData: finalFileData,
      });

      // Sync PDF to RAG-ChatBot engine if a physical PDF file was selected
      if (selectedFile && fileType.toUpperCase() === "PDF") {
        uploadPDFToRAGBackend(selectedFile).then((res) => {
          if (res.success) {
            toast.success(`PDF "${selectedFile.name}" indexed into RAG Engine!`);
          }
        }).catch(console.error);
      }

      toast.success(`${fileType.toUpperCase()} file successfully encrypted and saved to vault!`);
      setFileName("");
      setFileData("");
      setSelectedFile(null);
      setIsUploadOpen(false);
      fetchDocs();
    } catch (err) {
      console.error("Failed to upload document", err);
      toast.error("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (id: string, name?: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this document from the vault?")) return;
    try {
      await deleteDocument(authUser.uid, id);
      if (name && name.toLowerCase().endsWith(".pdf")) {
        deletePDFFromRAGBackend(name).catch(console.error);
      }
      toast.success("Document removed from vault");
      fetchDocs();
    } catch (err) {
      console.error("Failed to delete document", err);
      toast.error("Failed to delete document");
    }
  };

  const handleDownloadDocument = (docItem: Document) => {
    if (docItem.fileData) {
      const link = document.createElement("a");
      link.href = docItem.fileData;
      link.download = docItem.name.toLowerCase().endsWith(`.${docItem.type.toLowerCase()}`)
        ? docItem.name
        : `${docItem.name}.${docItem.type.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${docItem.name}`);
    } else {
      // Fallback text blob if fileData is empty
      const blob = new Blob([`Encrypted Vault Document Content:\n\nTitle: ${docItem.name}\nType: ${docItem.type}\nSize: ${docItem.size}`], {
        type: docItem.type === "PDF" ? "application/pdf" : "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = docItem.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${docItem.name}`);
    }
  };

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === "PDF") return d.type.toUpperCase() === "PDF";
    if (activeCategory === "DOCX") return d.type.toUpperCase() === "DOCX" || d.type.toUpperCase() === "DOC";
    if (activeCategory === "IMAGE") return ["JPG", "PNG", "JPEG", "WEBP", "SVG"].includes(d.type.toUpperCase());
    if (activeCategory === "OTHER")
      return !["PDF", "DOCX", "DOC", "JPG", "PNG", "JPEG", "WEBP", "SVG"].includes(d.type.toUpperCase());

    return true;
  });

  const pdfCount = docs.filter((d) => d.type.toUpperCase() === "PDF").length;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative space-y-6">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="Document Vault RAG & AI PDF Assistant"
        onUpgraded={fetchDocs}
      />
      <PageHeader
        title="Document Vault"
        description="End-to-end encrypted storage for PDFs and critical documents."
        icon={<FolderOpen className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={openPdfUpload}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md"
            >
              <FileCheck className="mr-1.5 h-4 w-4" /> Upload PDF
            </Button>
            <Button
              className="rounded-full bg-gradient-primary cursor-pointer shadow-md"
              onClick={() => {
                setFileData("");
                setSelectedFile(null);
                setIsUploadOpen(true);
              }}
            >
              <Upload className="mr-1.5 h-4 w-4" /> Upload Document
            </Button>
          </div>
        }
      />

      {/* Vault Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>
            <strong className="text-foreground font-medium">AES-256 Encryption Active</strong> · All saved PDFs and files are encrypted and synced.
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <span className="rounded-full bg-red-500/10 text-red-500 px-2.5 py-1 border border-red-500/20">
            {pdfCount} PDF {pdfCount === 1 ? "File" : "Files"} Saved
          </span>
          <span>Total Vault: {docs.length} Files</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by title or extension (e.g. PDF)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full bg-muted/50 border-border/50 focus:bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-muted/30 rounded-full border border-border/40">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({docs.length})
            </button>
            <button
              onClick={() => setActiveCategory("PDF")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeCategory === "PDF"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-red-400"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-red-500 fill-red-500/20" /> PDF ({pdfCount})
            </button>
            <button
              onClick={() => setActiveCategory("DOCX")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "DOCX"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Word / Docs
            </button>
            <button
              onClick={() => setActiveCategory("IMAGE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === "IMAGE"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Images
            </button>
          </div>
        </div>

        {/* Documents List */}
        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <FileCode className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No documents found matching your filter.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={openPdfUpload}
              className="rounded-full text-xs cursor-pointer border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              <FileCheck className="mr-1 h-3.5 w-3.5" /> Upload a PDF Document Now
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filteredDocs.map((d) => {
              const isPdf = d.type.toUpperCase() === "PDF";
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-4 p-3.5 hover:bg-muted/40 rounded-xl transition-colors group"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-xs ${
                      isPdf
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : d.type.toUpperCase() === "DOCX"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    {isPdf ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <span>{d.type.substring(0, 3)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold hover:text-primary transition-colors cursor-pointer" onClick={() => setViewingDoc(d)}>
                        {d.name}
                      </p>
                      {isPdf && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                          PDF
                        </span>
                      )}
                      {d.fileData && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Saved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.type} · {d.size} · Updated {d.updated}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isPremium) {
                          setIsPremiumModalOpen(true);
                          return;
                        }
                        navigate({ to: "/app/assistant" });
                      }}
                      className="rounded-full cursor-pointer text-xs h-8 px-3 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      title="Ask RAG Chatbot about this document"
                    >
                      <Bot className="mr-1 h-3.5 w-3.5" /> Chat RAG
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingDoc(d)}
                      className="rounded-full cursor-pointer text-xs h-8 px-3 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDocument(d)}
                      className="rounded-full cursor-pointer text-xs h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <button
                      onClick={() => handleDeleteDocument(d.id, d.name)}
                      className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer p-1.5 rounded-full hover:bg-red-500/10"
                      title="Delete document"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* PDF & Document View Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
          <div className="glass w-full max-w-4xl rounded-2xl p-6 shadow-2xl relative border border-white/10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-xl ${
                    viewingDoc.type.toUpperCase() === "PDF"
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold truncate">{viewingDoc.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {viewingDoc.type} · {viewingDoc.size} · Encrypted Storage
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleDownloadDocument(viewingDoc)}
                  className="rounded-full bg-primary hover:bg-primary/90 text-xs h-8 cursor-pointer"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download File
                </Button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Document Content View Area */}
            <div className="flex-1 overflow-y-auto py-4">
              {viewingDoc.fileData ? (
                viewingDoc.type.toUpperCase() === "PDF" || viewingDoc.fileData.startsWith("data:application/pdf") ? (
                  <div className="w-full h-[520px] rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex flex-col">
                    <iframe
                      src={viewingDoc.fileData}
                      title={viewingDoc.name}
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : viewingDoc.fileData.startsWith("data:image/") ? (
                  <div className="flex justify-center p-4 bg-slate-950/50 rounded-xl border border-white/10">
                    <img
                      src={viewingDoc.fileData}
                      alt={viewingDoc.name}
                      className="max-h-[500px] object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-muted/40 rounded-xl text-sm font-mono whitespace-pre-wrap break-all max-h-[500px] overflow-y-auto">
                    {viewingDoc.fileData}
                  </div>
                )
              ) : (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-white/5 space-y-4">
                  <FileText className="mx-auto h-12 w-12 text-red-400 opacity-80" />
                  <div>
                    <h4 className="text-sm font-semibold">{viewingDoc.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      This document metadata is saved in your encrypted vault. Click download below to retrieve the document file.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownloadDocument(viewingDoc)}
                    className="rounded-full bg-gradient-primary cursor-pointer text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download Encrypted File
                  </Button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-500">
                <Shield className="h-3.5 w-3.5" /> Protected with AES-256
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDoc(null)}
                className="rounded-full text-xs h-7 cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog Modal with PDF & File Selection */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
          <div className="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl relative border border-white/10">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Upload Document to Vault</h3>
                <p className="text-xs text-muted-foreground">PDFs and files are encrypted and saved locally in your vault.</p>
              </div>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              {/* File Selector Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-500/30 hover:border-red-500/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-red-500/5 hover:bg-red-500/10 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf, .docx, .doc, .jpg, .jpeg, .png, .zip, application/pdf"
                  className="hidden"
                />
                <FileCheck className="mx-auto h-8 w-8 text-red-500 group-hover:scale-110 transition-transform mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : "Click to select a PDF or Document file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports PDF, DOCX, JPG, PNG, ZIP · Up to 50 MB
                </p>
                {selectedFile && (
                  <span className="inline-block mt-2 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    File selected ({fileSize})
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Document Name</label>
                <Input
                  required
                  placeholder="e.g. Passport Scan.pdf or Financial Report"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Format / Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PDF">PDF (.pdf)</option>
                    <option value="DOCX">DOCX (.docx)</option>
                    <option value="JPG">JPG / JPEG</option>
                    <option value="PNG">PNG Image</option>
                    <option value="ZIP">ZIP Archive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">File Size</label>
                  <Input
                    required
                    placeholder="e.g. 1.8 MB"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-full cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer text-xs font-medium"
                >
                  {isSaving ? "Saving..." : "Save PDF to Vault"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}