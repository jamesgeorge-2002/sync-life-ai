import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Paperclip,
  CheckCircle2,
  Cpu,
  ExternalLink,
  RefreshCw,
  FileText,
  Database,
  Calendar,
  Crown,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  performRAGSearch,
  checkRAGBackendHealth,
  uploadPDFToRAGBackend,
  fetchLoadedPDFsFromRAGBackend,
  RAGContextChunk,
  RAGAttachment,
} from "@/lib/rag";
import {
  getChatMessages,
  addChatMessage,
  clearChatHistory,
  ChatMessage,
  getUserProfile,
  updateUserProfile,
  UserProfile,
} from "@/lib/db";
import { isPremiumUser, getUserTier } from "@/lib/premium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { ActionDispatchBar } from "./action-dispatch-bar";

export function RAGChatbotWidget() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [backendStatus, setBackendStatus] = useState<{
    online: boolean;
    service?: string;
    flaskOnline?: boolean;
  }>({ online: false });
  const [loadedPDFs, setLoadedPDFs] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<RAGAttachment[]>([]);
  const [activeSources, setActiveSources] = useState<{ [msgIndex: number]: RAGContextChunk[] }>({});
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileAndStatus = async () => {
    if (!authUser) return;
    try {
      const [prof, status] = await Promise.all([
        getUserProfile(authUser.uid),
        checkRAGBackendHealth(),
      ]);
      setProfile(prof);
      setBackendStatus(status);
      if (status.online) {
        fetchLoadedPDFsFromRAGBackend().then(setLoadedPDFs);
      } else {
        setLoadedPDFs([]);
      }
    } catch (err) {
      console.error("Failed to load profile in widget", err);
    }
  };

  // Check backend health & profile when widget opens
  useEffect(() => {
    if (isOpen) {
      fetchProfileAndStatus();
    }
  }, [isOpen]);

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && authUser) {
      getChatMessages(authUser.uid)
        .then(setMessages)
        .catch((err) => console.error("Failed to load chat history", err));
    }
  }, [isOpen, authUser]);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const isUserPremium = isPremiumUser(profile);
  const userTier = getUserTier(profile);

  const handleOneClickUpgrade = async () => {
    if (!authUser) {
      navigate({ to: "/auth/login" });
      return;
    }
    setUpgrading(true);
    try {
      await updateUserProfile(authUser.uid, { tier: "Pro" });
      toast.success("🎉 Upgraded to Pro! RAG Chatbot is now unlocked.");
      fetchProfileAndStatus();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upgrade.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isUserPremium) {
      setPremiumModalOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      uploadPDFToRAGBackend(file)
        .then((res) => {
          if (res.success) {
            toast.success(`PDF "${file.name}" indexed in RAG Engine!`);
            fetchLoadedPDFsFromRAGBackend().then(setLoadedPDFs);
          }
        })
        .catch(console.error);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          type: file.type || file.name.split(".").pop()?.toUpperCase() || "PDF",
          fileData: reader.result as string,
        },
      ]);
      toast.success(`Attached "${file.name}" to RAG context`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (customQuery?: string) => {
    if (!isUserPremium) {
      setPremiumModalOpen(true);
      return;
    }

    const queryText = (customQuery ?? input).trim();
    if (!queryText || !authUser || loading) return;

    setInput("");
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Add user message
    const userMsg: ChatMessage = {
      role: "user",
      content: currentAttachments.length > 0
        ? `${queryText}\n\n📎 Attached Files: ${currentAttachments.map((a) => a.name).join(", ")}`
        : queryText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      await addChatMessage(authUser.uid, userMsg);

      // Perform RAG Search query across indexed documents, vitals, tasks & attached files
      const ragResult = await performRAGSearch(authUser.uid, queryText, currentAttachments);

      let answerText = ragResult.answer;
      if (ragResult.summary) {
        answerText += `\n\n✨ **Key Insight:** ${ragResult.summary}`;
      }

      const botMsg: ChatMessage = {
        role: "assistant",
        content: answerText,
      };

      await addChatMessage(authUser.uid, botMsg);

      setMessages((prev) => {
        const nextMsgs = [...prev, botMsg];
        if (ragResult.retrievedChunks && ragResult.retrievedChunks.length > 0) {
          setActiveSources((prevSources) => ({
            ...prevSources,
            [nextMsgs.length - 1]: ragResult.retrievedChunks,
          }));
        }
        return nextMsgs;
      });
    } catch (err: any) {
      console.error("RAG Query Failed", err);
      const errorMsg: ChatMessage = {
        role: "assistant",
        content:
          "I experienced an issue processing your query with the RAG engine. Please check if your Python FastAPI backend is running on port 8000 or try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-110 hover:shadow-primary/60 cursor-pointer"
          title="Open RAG AI Chatbot"
        >
          <div className="absolute -inset-1 rounded-full bg-gradient-primary opacity-40 blur-md group-hover:opacity-75 animate-pulse" />
          <Bot className="relative h-7 w-7 transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="flex h-[560px] w-[380px] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 p-4 bg-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight text-foreground">RAG Assistant</h3>
                  {isUserPremium ? (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-500 border border-amber-500/30">
                      PRO
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> FREE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                  {isUserPremium ? "Grounded in your vault documents" : "Upgrade to unlock RAG Q&A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer"
                title="Open Fullscreen Assistant"
                onClick={() => {
                  setIsOpen(false);
                  navigate({ to: "/app/assistant" });
                }}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Chat Messages or Free Locked View */}
          {!isUserPremium ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 grid place-items-center text-black shadow-lg shadow-amber-500/20">
                <Crown className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-500">
                  <Sparkles className="h-3 w-3" /> Pro Feature
                </span>
                <h4 className="text-base font-bold text-foreground">Unlock RAG AI Assistant</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Real-time neural document retrieval, health vitals Q&A, and cross-workspace action dispatchers require a <strong>LIFE-SYNC Pro</strong> plan.
                </p>
              </div>

              <div className="pt-2 w-full space-y-2">
                <Button
                  onClick={handleOneClickUpgrade}
                  disabled={upgrading}
                  className="w-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black font-bold text-xs h-10 shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  {upgrading ? "Upgrading to Pro..." : "Upgrade to Pro (₹999/mo)"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    navigate({ to: "/app/premium" });
                  }}
                  className="w-full rounded-full text-xs h-8 cursor-pointer"
                >
                  View All Plans
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 px-2 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Retrieval-Augmented Chatbot</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask questions grounded in your PDF documents, uploaded files, notes, tasks, and health vitals.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 w-full pt-2">
                    {[
                      "Summarize my uploaded vault documents",
                      "What health vitals are logged?",
                      "List my high-priority tasks",
                      "Search notes for product strategy",
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleSend(chip)}
                        className="text-left text-xs p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/80 transition-colors font-medium cursor-pointer flex items-center justify-between"
                      >
                        <span>{chip}</span>
                        <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className="flex items-start gap-2">
                      {m.role === "assistant" && (
                        <div className="h-7 w-7 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground shrink-0 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-muted/70 text-foreground border border-border/40 rounded-bl-xs"
                        }`}
                      >
                        {m.content}

                        {m.role === "assistant" && (
                          <ActionDispatchBar
                            text={m.content}
                            sourceTitle="RAG Chatbot Workspace Response"
                            contextType="assistant"
                            showShopping={true}
                            showCalendar={true}
                            showTasks={true}
                            showExpense={true}
                            showNote={true}
                            showHabit={true}
                            compact={true}
                          />
                        )}
                      </div>
                    </div>

                    {/* Render RAG Sources if available */}
                    {m.role === "assistant" && activeSources[idx] && activeSources[idx].length > 0 && (
                      <div className="ml-9 max-w-[85%] text-[10px] bg-primary/5 rounded-xl p-2 border border-primary/10 space-y-1">
                        <p className="font-semibold text-primary flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Grounded in {activeSources[idx].length} Workspace RAG Chunks:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(activeSources[idx].map((c) => c.title))).map((title, i) => (
                            <span key={i} className="bg-background/80 px-2 py-0.5 rounded border text-muted-foreground truncate max-w-[180px]">
                              📄 {title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 animate-pulse">
                  <div className="h-6 w-6 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground">
                    <Bot className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <span>Indexing context & querying RAG Engine...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}

          {/* Attachments Bar */}
          {attachments.length > 0 && isUserPremium && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-t border-border/40 overflow-x-auto">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1 text-[11px] bg-background border px-2 py-0.5 rounded-full shrink-0">
                  <FileText className="h-3 w-3 text-primary" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border/60 p-3 bg-muted/20"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttach}
              accept=".pdf,.txt,.doc,.docx,.json,image/*"
              className="hidden"
              disabled={!isUserPremium}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!isUserPremium}
              className="h-9 w-9 rounded-full shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title={isUserPremium ? "Attach PDF or Document to RAG prompt" : "Upgrade to Pro to attach files"}
              onClick={() => (isUserPremium ? fileInputRef.current?.click() : setPremiumModalOpen(true))}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isUserPremium}
              placeholder={
                isUserPremium
                  ? "Ask RAG Chatbot anything..."
                  : "🔒 Pro required to use RAG Chatbot"
              }
              className="h-9 text-xs rounded-full bg-background border-border/60"
            />

            <Button
              type="submit"
              size="icon"
              disabled={loading || (!input.trim() && attachments.length === 0)}
              className="h-9 w-9 rounded-full bg-gradient-primary shrink-0 cursor-pointer"
            >
              {isUserPremium ? <Send className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="RAG AI Assistant"
        onUpgraded={fetchProfileAndStatus}
      />
    </div>
  );
}
