import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { BookOpen, Search, Sparkles, Plus, FileText, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { performRAGSearch, RAGSearchResult } from "@/lib/rag";
import { getNotes, addNote, Note } from "@/lib/db";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/knowledge")({ component: KnowledgePage });

const defaultKnowledgeItems = [
  { t: "Product strategy Q1", tag: "Work", ex: "Retention as our north star for Q1. Focus on onboarding activation and document vault RAG sync..." },
  { t: "Deep Work — key insights", tag: "Reading", ex: "Rules for cultivating intense focus in a distracted world. Batch shallow tasks and block 4 hours daily..." },
  { t: "Personal OKRs 2026", tag: "Planning", ex: "5 objectives, 12 key results spanning health vitals, financial net worth growth, and study modules..." },
  { t: "React Server Components & TanStack", tag: "Learning", ex: "RSC shift the mental model to server-first data architecture. Pairs seamlessly with Vite client bundles..." },
  { t: "Home renovation plan", tag: "Personal", ex: "Kitchen first, budget ₹10L, contractor picks and material specifications archived in vault..." },
  { t: "Investment thesis — AI infra", tag: "Finance", ex: "Bet on picks-and-shovels compute, vector database retrieval, and LLM orchestration tools..." },
];

function KnowledgePage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRAGSearching, setIsRAGSearching] = useState(false);
  const [ragResult, setRagResult] = useState<RAGSearchResult | null>(null);
  const [activeTag, setActiveTag] = useState("All");
  const [userNotes, setUserNotes] = useState<Note[]>([]);

  // Add Item Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("Learning");

  const fetchKnowledgeNotes = async () => {
    if (!authUser) return;
    try {
      const list = await getNotes(authUser.uid);
      setUserNotes(list);
    } catch (err) {
      console.error("Failed to load user knowledge notes", err);
    }
  };

  useEffect(() => {
    fetchKnowledgeNotes();
  }, [authUser]);

  const handleRAGSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !authUser) return;

    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    setIsRAGSearching(true);
    try {
      const result = await performRAGSearch(authUser.uid, searchQuery.trim());
      setRagResult(result);
      toast.success("Gemini RAG retrieved workspace knowledge!");
    } catch (err) {
      console.error("Failed to perform RAG search", err);
      toast.error("RAG search failed. Please try again.");
    } finally {
      setIsRAGSearching(false);
    }
  };

  const handleAddKnowledgeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newTitle.trim()) return;

    try {
      await addNote(authUser.uid, {
        title: newTitle.trim(),
        content: newContent.trim(),
        tag: newTag,
        updated: "Just now",
      });
      toast.success("Added to Knowledge Base & RAG index!");
      setNewTitle("");
      setNewContent("");
      setIsAddOpen(false);
      fetchKnowledgeNotes();
    } catch (err) {
      console.error("Failed to add knowledge item", err);
      toast.error("Failed to add item");
    }
  };

  const combinedItems = [
    ...userNotes.map((n) => ({ t: n.title, tag: n.tag || "Notes", ex: n.content })),
    ...defaultKnowledgeItems,
  ];

  const filteredItems = combinedItems.filter((item) => {
    const matchesSearch =
      item.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ex.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tag.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTag === "All") return true;
    return item.tag.toLowerCase() === activeTag.toLowerCase();
  });

  const tagsList = ["All", "Work", "Reading", "Planning", "Learning", "Personal", "Finance"];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="Knowledge Base Gemini RAG Search"
        onUpgraded={fetchKnowledgeNotes}
      />
      <PageHeader
        title="Knowledge Base & AI RAG"
        description="Search across your notes, vault documents, and metrics using Google Gemini API."
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <Button
            onClick={() => setIsAddOpen(true)}
            className="rounded-full bg-gradient-primary cursor-pointer text-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Knowledge Item
          </Button>
        }
      />

      {/* RAG Search Bar Card */}
      <div className="glass rounded-2xl p-6 border border-primary/20 space-y-4 shadow-xl">
        <form onSubmit={handleRAGSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question or search notes & documents using Gemini RAG..."
              className="pl-12 pr-4 h-12 rounded-full bg-muted/50 border-border/50 text-base focus:bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRagResult(null);
                }}
                className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={isRAGSearching}
            className="rounded-full bg-gradient-primary h-12 px-6 cursor-pointer text-sm font-semibold shrink-0 shadow-md"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isRAGSearching ? "animate-spin" : ""}`} />
            {isRAGSearching ? "Thinking..." : "Ask Gemini AI"}
          </Button>
        </form>

        {/* Category Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {tagsList.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTag === tag
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini RAG Synthesized Result Box */}
      {ragResult && (
        <div className="glass rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Google Gemini RAG Answer</h3>
                <p className="text-xs text-muted-foreground">Synthesized from retrieved workspace context & documents.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {ragResult.isPythonBackendUsed ? "Python RAG Backend" : "Gemini 2.5 Flash RAG"}
              </span>
              <button
                onClick={() => setRagResult(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-sans">
            {ragResult.answer}
          </div>

          {ragResult.summary && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              💡 {ragResult.summary}
            </div>
          )}

          {/* Retrieved Citations & Chunks */}
          {ragResult.retrievedChunks.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Retrieved Context Sources ({ragResult.retrievedChunks.length}):
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ragResult.retrievedChunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-background/60 border border-border/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-primary truncate">{chunk.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {chunk.sourceType}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-muted-foreground">{chunk.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((i, idx) => (
          <div
            key={idx}
            className="glass rounded-2xl p-6 hover:border-primary/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                  {i.tag}
                </span>
                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-base font-semibold group-hover:text-primary transition-colors">{i.t}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground leading-relaxed">{i.ex}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Indexed for RAG</span>
              <button
                onClick={() => {
                  setSearchQuery(i.t);
                  performRAGSearch(authUser?.uid || "", i.t).then((res) => setRagResult(res));
                }}
                className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ask Gemini <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Knowledge Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
          <div className="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl relative border border-white/10">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" /> Add Item to Knowledge Base
            </h3>

            <form onSubmit={handleAddKnowledgeItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title / Topic</label>
                <Input
                  required
                  placeholder="e.g. System Architecture or Project Notes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Category Tag</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Work">Work</option>
                  <option value="Reading">Reading</option>
                  <option value="Planning">Planning</option>
                  <option value="Learning">Learning</option>
                  <option value="Personal">Personal</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Content / Excerpt</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed knowledge content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer text-xs">
                  Save & Index for RAG
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}