import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Plus,
  MessageSquare,
  Zap,
  Brain,
  Calendar,
  Wallet,
  Paperclip,
  FileText,
  Cpu,
  CheckCircle2,
  X,
  RefreshCw,
  Crown,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  getChatMessages,
  addChatMessage,
  clearChatHistory,
  ChatMessage,
  getUserProfile,
  updateUserProfile,
  UserProfile,
} from "@/lib/db";
import {
  performRAGSearch,
  checkRAGBackendHealth,
  uploadPDFToRAGBackend,
  fetchLoadedPDFsFromRAGBackend,
  RAGAttachment,
  RAGContextChunk,
} from "@/lib/rag";
import { isPremiumUser, getUserTier } from "@/lib/premium";
import { PremiumGateModal, PremiumLockCard } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

const suggestions = [
  { icon: Calendar, text: "Summarize my vault documents & notes" },
  { icon: Wallet, text: "What are my pending tasks and priorities?" },
  { icon: Brain, text: "What health vitals are recorded?" },
  { icon: Zap, text: "What is my latest life plan note?" },
];

function Assistant() {
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ online: boolean; service?: string }>({
    online: false,
  });
  const [loadedPDFs, setLoadedPDFs] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<RAGAttachment[]>([]);
  const [ragSourcesMap, setRagSourcesMap] = useState<{ [key: number]: RAGContextChunk[] }>({});
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessagesAndProfile = async () => {
    if (!authUser) return;
    try {
      const [list, userProf, backendHealth] = await Promise.all([
        getChatMessages(authUser.uid),
        getUserProfile(authUser.uid),
        checkRAGBackendHealth(),
      ]);
      setMessages(list);
      setBackendStatus(backendHealth);
      if (backendHealth.online) {
        const pdfList = await fetchLoadedPDFsFromRAGBackend();
        setLoadedPDFs(pdfList);
      } else {
        setLoadedPDFs([]);
      }
      if (userProf) {
        setProfile(userProf);
      }
    } catch (err) {
      console.error("Failed to load assistant data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesAndProfile();
  }, [authUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const isUserPremium = isPremiumUser(profile);
  const userTier = getUserTier(profile);

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
      toast.success(`Attached "${file.name}" to RAG prompt context`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async (customQuery?: string) => {
    if (!isUserPremium) {
      setPremiumModalOpen(true);
      return;
    }

    const content = (customQuery ?? input).trim();
    if (!content || !authUser || isProcessing) return;

    setInput("");
    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsgContent = currentAttachments.length > 0
      ? `${content}\n\n📎 Attached Files: ${currentAttachments.map((a) => a.name).join(", ")}`
      : content;

    const userMsg: ChatMessage = { role: "user", content: userMsgContent };
    setMessages((m) => [...m, userMsg]);
    setIsProcessing(true);

    try {
      await addChatMessage(authUser.uid, userMsg);

      const ragResult = await performRAGSearch(authUser.uid, content, currentAttachments);
      let replyText = ragResult.answer;

      if (ragResult.summary) {
        replyText += `\n\n✨ **Summary:** ${ragResult.summary}`;
      }

      const botMsg: ChatMessage = { role: "assistant", content: replyText };
      await addChatMessage(authUser.uid, botMsg);

      setMessages((prev) => {
        const nextMsgs = [...prev, botMsg];
        if (ragResult.retrievedChunks && ragResult.retrievedChunks.length > 0) {
          setRagSourcesMap((map) => ({ ...map, [nextMsgs.length - 1]: ragResult.retrievedChunks }));
        }
        return nextMsgs;
      });
    } catch (err) {
      console.error("Failed to process RAG message", err);
      toast.error("Failed to process message with RAG engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewChat = async () => {
    if (!authUser) return;
    if (!confirm("Clear chat history and start new RAG session?")) return;
    setLoading(true);
    try {
      await clearChatHistory(authUser.uid);
      setMessages([]);
      setRagSourcesMap({});
      toast.success("RAG Chat Session reset");
    } catch (err) {
      console.error("Failed to clear chat history", err);
    } finally {
      setLoading(false);
    }
  };

  const displayUserAvatar = authUser?.displayName
    ? authUser.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : authUser?.email
      ? authUser.email[0].toUpperCase()
      : "U";

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse font-sans">Connecting to RAG Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-9rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden flex-col rounded-2xl border border-border/60 bg-card/50 p-4 lg:flex justify-between">
        <div>
          <Button
            className="mb-4 w-full rounded-full bg-gradient-primary cursor-pointer shadow-md"
            onClick={isUserPremium ? handleNewChat : () => setPremiumModalOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />New RAG Chat
          </Button>

          {/* User Tier Status Badge */}
          <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" /> Plan Status
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isUserPremium
                    ? "bg-amber-500 text-black shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {userTier}
              </span>
            </div>
            {!isUserPremium && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setPremiumModalOpen(true)}
                className="h-auto p-0 text-[11px] font-bold text-amber-500 hover:underline cursor-pointer"
              >
                Upgrade to Pro to unlock RAG →
              </Button>
            )}
          </div>
          
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engine Status</p>
          <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">FastAPI Python RAG</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                backendStatus.online ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
              }`}>
                {backendStatus.online ? "Online (Port 8000)" : "Client Fallback"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {backendStatus.online
                ? "Groq Llama-3.3 & Gemini Multi-LLM pipeline running."
                : "Client-side Gemini multimodal RAG active."}
            </p>
          </div>

          {/* Active Loaded PDFs */}
          <div className="mb-4">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Indexed PDFs ({loadedPDFs.length})</span>
              <FileText className="h-3 w-3 text-red-500" />
            </p>
            {loadedPDFs.length === 0 ? (
              <p className="px-2 text-[11px] text-muted-foreground italic">No PDF files uploaded yet.</p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {loadedPDFs.map((pdf, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-medium text-red-400 truncate">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{pdf}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Workspace RAG Memory
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Indexes your document vault PDFs, notes, habits, tasks, and vitals in real-time.
          </p>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">RAG AI Chatbot</h2>
                {isUserPremium ? (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                    {backendStatus.online ? "FastAPI RAG Connected" : "Client RAG Engine"}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Premium Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Retrieval-Augmented Generation across your workspace documents & memory</p>
            </div>
          </div>
          {isUserPremium ? (
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="text-xs gap-1.5 cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Clear History
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setPremiumModalOpen(true)}
              className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs cursor-pointer shadow-md"
            >
              <Crown className="h-3.5 w-3.5 mr-1" /> Upgrade to Pro
            </Button>
          )}
        </div>

        {/* Message Log or Free Lock Card */}
        {!isUserPremium ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <PremiumLockCard
              featureName="RAG AI Intelligent Chatbot"
              onUpgraded={fetchMessagesAndProfile}
            />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "assistant" ? (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/20 text-xs font-bold text-primary">
                      {displayUserAvatar}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card border border-border/60 text-card-foreground rounded-tl-xs"
                    }`}
                  >
                    {m.content}

                    {m.role === "assistant" && (
                      <ActionDispatchBar
                        text={m.content}
                        sourceTitle="RAG AI Assistant Strategy"
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

                {/* RAG Source Citations Box */}
                {m.role === "assistant" && ragSourcesMap[i] && ragSourcesMap[i].length > 0 && (
                  <div className="ml-11 max-w-[80%] rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Retrieved RAG Sources ({ragSourcesMap[i].length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ragSourcesMap[i].map((src, sIdx) => (
                        <div key={sIdx} className="rounded-lg bg-background/80 p-2 border border-border/40">
                          <span className="font-medium text-foreground truncate block">📄 {src.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                            {src.sourceType} • Score: {src.relevanceScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground p-3 animate-pulse">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <span>Searching vault chunks & synthesizing RAG response...</span>
              </div>
            )}
            <div ref={scrollRef} />

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-lg">
                  <Bot className="h-8 w-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-lg font-bold">Ask Anything via RAG Chatbot</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Answers are dynamically synthesized using Retrieval-Augmented Generation from your PDFs, notes, vitals, and tasks.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 w-full max-w-xl pt-4">
                  {suggestions.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5 text-left text-sm hover:bg-muted/80 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <s.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachments preview bar */}
        {attachments.length > 0 && isUserPremium && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-t border-border/40 overflow-x-auto">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-background border px-3 py-1 rounded-full shrink-0 shadow-sm">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-border/60 p-3 bg-card shrink-0"
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
            className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            title={isUserPremium ? "Attach PDF or Document" : "Upgrade to Pro to attach files"}
            onClick={() => (isUserPremium ? fileInputRef.current?.click() : setPremiumModalOpen(true))}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isUserPremium}
            placeholder={
              isUserPremium
                ? "Ask RAG Chatbot grounded in your vault documents & notes…"
                : "🔒 RAG Chatbot is exclusive to Pro subscribers. Upgrade to start chatting."
            }
            className="h-11 rounded-full bg-muted/40 border-border/60 px-4 text-sm"
          />

          <Button
            type="submit"
            size="icon"
            disabled={isProcessing || (!input.trim() && attachments.length === 0)}
            className="h-11 w-11 rounded-full bg-gradient-primary shrink-0 cursor-pointer shadow-md"
          >
            {isUserPremium ? <Send className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
        </form>
      </section>

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="RAG AI Intelligent Assistant"
        onUpgraded={fetchMessagesAndProfile}
      />
    </div>
  );
}