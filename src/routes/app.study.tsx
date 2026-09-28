import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Timer,
  X,
  Trash,
  Sparkles,
  FileText,
  CheckCircle2,
  Calendar,
  Upload,
  Briefcase,
  Newspaper,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Bot,
  Search,
  Bookmark,
  TrendingUp,
  Zap,
  Check,
  Shuffle,
  FileCheck,
  Eye,
  Send,
  ArrowRight,
  FileCode,
  School,
  Building2,
  DollarSign,
  Clock,
  MapPin,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { getCourses, addCourse, updateCourse, deleteCourse, Course, getNotes, addTask, Note } from "@/lib/db";
import {
  generateStudyQuizAI,
  generateFlashcardsFromDocumentAI,
  queryStudyPDFRAGAgentAI,
  StudyFlashcard,
} from "@/lib/gemini";
import { extractCourseSuggestion } from "@/lib/item-extractor";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/study")({ component: StudyPage });

// ----------------------------------------------------------------------
// Curated Real-Time Tech Hiring & Job Openings Data
// ----------------------------------------------------------------------
interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogoBg: string;
  location: string;
  type: "Full-Time" | "Internship" | "New Grad" | "Remote";
  salary: string;
  posted: string;
  tags: string[];
  description: string;
  applyUrl: string;
  isUrgent?: boolean;
}

const JOB_LISTINGS: JobListing[] = [
  {
    id: "job-1",
    title: "AI Systems & Full-Stack Engineer",
    company: "Anthropic / Agentic Labs",
    companyLogoBg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    location: "Remote / San Francisco",
    type: "Full-Time",
    salary: "₹32L – ₹48L ($170k - $220k)",
    posted: "2 hours ago",
    tags: ["TypeScript", "Python", "RAG", "LLM Orchestration"],
    description: "Build autonomous multi-modal agent workflows, real-time RAG pipelines, and high-performance developer UI interfaces.",
    applyUrl: "https://www.linkedin.com/jobs",
    isUrgent: true,
  },
  {
    id: "job-2",
    title: "Graduate Software Engineer (2026 Batch)",
    company: "Google Cloud Ecosystem",
    companyLogoBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    location: "Bengaluru / Hyderabad (Hybrid)",
    type: "New Grad",
    salary: "₹18L – ₹26L + Stock",
    posted: "Today",
    tags: ["Data Structures", "Go", "Distributed Systems", "Cloud"],
    description: "Join high-scale core engineering teams developing next-generation distributed databases, Kubernetes tooling, and Gemini API services.",
    applyUrl: "https://careers.google.com",
  },
  {
    id: "job-3",
    title: "Frontend Platform & AI UI Intern",
    company: "Vercel / Linear Partner Studio",
    companyLogoBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    location: "Remote",
    type: "Internship",
    salary: "₹65,000 / month ($4,200/mo)",
    posted: "1 day ago",
    tags: ["React 19", "Next.js", "TailwindCSS", "State Machines"],
    description: "6-month paid internship crafting fluid micro-interactions, responsive design systems, and client-side AI streaming interfaces.",
    applyUrl: "https://vercel.com/careers",
    isUrgent: true,
  },
  {
    id: "job-4",
    title: "Quantitative Research & ML Associate",
    company: "Apex Capital Technologies",
    companyLogoBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    location: "Mumbai / Singapore",
    type: "Full-Time",
    salary: "₹42L – ₹65L Base + Bonus",
    posted: "2 days ago",
    tags: ["Machine Learning", "Python", "Low Latency", "Statistics"],
    description: "Research algorithmic alpha signals, build statistical modeling frameworks, and backtest high-frequency machine learning strategies.",
    applyUrl: "https://www.ycombinator.com/jobs",
  },
  {
    id: "job-5",
    title: "Backend Cloud Engineer (FastAPI / Node)",
    company: "Stripe Developer Partner",
    companyLogoBg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    location: "Remote / Global",
    type: "Full-Time",
    salary: "₹24L – ₹36L ($130k - $160k)",
    posted: "3 days ago",
    tags: ["Node.js", "PostgreSQL", "Docker", "API Security"],
    description: "Develop resilient payment gateways, webhook distribution systems, and real-time ledger accounting services with 99.99% uptime.",
    applyUrl: "https://stripe.com/jobs",
  },
];

// ----------------------------------------------------------------------
// Curated Latest Technology & AI News
// ----------------------------------------------------------------------
interface TechNewsArticle {
  id: string;
  title: string;
  category: "AI & ML" | "Web & Cloud" | "Engineering" | "Career";
  source: string;
  readTime: string;
  date: string;
  summary: string;
  link: string;
  badgeColor: string;
}

const TECH_NEWS: TechNewsArticle[] = [
  {
    id: "news-1",
    title: "Google DeepMind Unveils Gemini 2.5 Multimodal Reasoning Architecture with Native RAG Acceleration",
    category: "AI & ML",
    source: "DeepMind Research",
    readTime: "4 min read",
    date: "Today",
    summary: "New flash models process 2M+ token contexts with native document parsing and multi-step agentic chain-of-thought verification at 3x reduced latency.",
    link: "https://deepmind.google/technologies/gemini/",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  },
  {
    id: "news-2",
    title: "React 19 & Server Components in Production: Performance Patterns for High-Throughput Web Apps",
    category: "Web & Cloud",
    source: "React Core Blog",
    readTime: "6 min read",
    date: "Yesterday",
    summary: "An in-depth breakdown of zero-bundle-size server components, optimistic UI mutation hooks, and streaming asset delivery pipelines.",
    link: "https://react.dev/blog",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  {
    id: "news-3",
    title: "The 2026 Tech Hiring Matrix: Top 5 High-Leverage Skills That Distinguish Top 1% CS Candidates",
    category: "Career",
    source: "Silicon Valley Tech Report",
    readTime: "5 min read",
    date: "2 days ago",
    summary: "System design clarity, vector retrieval experience, autonomous agent tooling, and production TypeScript fluency dominate engineering evaluations.",
    link: "https://news.ycombinator.com",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  {
    id: "news-4",
    title: "PostgreSQL 17 Vector Search Extensions: How Local Pgvector Competes with Dedicated Vector DBs",
    category: "Engineering",
    source: "Postgres Weekly",
    readTime: "7 min read",
    date: "3 days ago",
    summary: "Benchmarking HNSW indexing speeds and hybrid sparse-dense retrieval for embedded document search directly within relational schemas.",
    link: "https://www.postgresql.org",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
];

// Default sample study notes if student hasn't uploaded a document yet
const SAMPLE_STUDY_NOTES = `Distributed Systems & Software Architecture Notes:
1. CAP Theorem: Consistency, Availability, Partition Tolerance. A distributed system can only provide two of these three guarantees simultaneously.
2. Load Balancing Algorithms: Round-robin, Weighted Round-robin, Least Connection, and Consistent Hashing for caching layers.
3. Database Sharding: Horizontal partitioning of data across multiple database instances to distribute query load and storage volume.
4. Message Queues & Event Streaming: Asynchronous message brokers (Kafka, RabbitMQ) decouple producers and consumers, enabling fault-tolerant backpressure management.
5. Caching Strategies: Write-through, Write-back, and Cache-aside with TTL eviction policies.`;

function StudyPage() {
  const { user: authUser } = useAuth();
  const { isPremium, refreshProfile } = usePremium();
  const [courses, setCourses] = useState<Course[]>([]);
  const [userNotes, setUserNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // Active navigation tab inside Study Hub: 'tutor' | 'flashcards' | 'courses' | 'jobs' | 'news'
  const [activeTab, setActiveTab] = useState<"tutor" | "flashcards" | "courses" | "jobs" | "news">("tutor");

  // ----------------------------------------------------------------------
  // Study Document / PDF State
  // ----------------------------------------------------------------------
  const [docTitle, setDocTitle] = useState("Distributed Systems & Architecture Notes.pdf");
  const [docContent, setDocContent] = useState(SAMPLE_STUDY_NOTES);
  const [docBase64, setDocBase64] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>("Distributed Systems & Architecture Notes.pdf");
  const [fileSizeStr, setFileSizeStr] = useState("45 KB");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------------------------
  // Flashcards State
  // ----------------------------------------------------------------------
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>([
    {
      id: "fc-sample-1",
      front: "What does the CAP Theorem state regarding distributed systems?",
      back: "A distributed system can guarantee at most two out of three properties simultaneously: Consistency, Availability, and Partition Tolerance.",
      keyTakeaway: "In the presence of network partitions, you must choose between consistency or availability.",
      category: "Distributed Systems",
      difficulty: "Medium",
    },
    {
      id: "fc-sample-2",
      front: "How does Consistent Hashing prevent massive cache invalidation upon scaling?",
      back: "By mapping both cache nodes and keys onto a virtual ring hash space, adding or removing a node only redistributes k/N keys rather than all keys.",
      keyTakeaway: "Consistent hashing minimizes key remapping during cluster resizing.",
      category: "Caching & Systems",
      difficulty: "Hard",
    },
    {
      id: "fc-sample-3",
      front: "What is the difference between Write-Through and Write-Back caching?",
      back: "Write-through synchronously writes data to both cache and database. Write-back writes to cache first and asynchronously persists to DB, offering faster write throughput.",
      keyTakeaway: "Write-back is faster but risks data loss if the cache node crashes before flush.",
      category: "Data Storage",
      difficulty: "Medium",
    },
  ]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardFocusTopic, setFlashcardFocusTopic] = useState("");

  // ----------------------------------------------------------------------
  // Targeted Study PDF RAG Tutor State (Scoped strictly to current document)
  // ----------------------------------------------------------------------
  const [tutorMessages, setTutorMessages] = useState<{ id: string; sender: "user" | "assistant"; text: string; citations?: string[]; timestamp: string }[]>([
    {
      id: "tut-welcome",
      sender: "assistant",
      text: `Hello! I am your AI Study Tutor. I am strictly analyzing your attached document: "${docTitle}".\n\nAsk me any concept explanation, formula derivation, or exam question based specifically on this material.`,
      timestamp: "Just now",
      citations: [docTitle],
    },
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------------
  // General AI Quiz Generator & Course Management State
  // ----------------------------------------------------------------------
  const [aiQuizResult, setAiQuizResult] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState("");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isAddingCourseFromAI, setIsAddingCourseFromAI] = useState(false);

  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSubject, setCourseSubject] = useState("CS");
  const [courseProgress, setCourseProgress] = useState(0);
  const [courseNext, setCourseNext] = useState("");

  // Jobs filter
  const [jobFilter, setJobFilter] = useState<"All" | "Internship" | "New Grad" | "Full-Time" | "Remote">("All");
  const [newsFilter, setNewsFilter] = useState<"All" | "AI & ML" | "Web & Cloud" | "Career">("All");

  const fetchStudyData = async () => {
    if (!authUser) return;
    try {
      const [coursesList, notesList] = await Promise.all([
        getCourses(authUser.uid),
        getNotes(authUser.uid),
      ]);
      setCourses(coursesList);
      setUserNotes(notesList);
    } catch (err) {
      console.error("Failed to load study hub data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyData();
  }, [authUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMessages, isTutorThinking]);

  // Handle PDF / Notes File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setDocTitle(file.name);

    const sizeMB = file.size / (1024 * 1024);
    setFileSizeStr(sizeMB < 0.1 ? `${(file.size / 1024).toFixed(1)} KB` : `${sizeMB.toFixed(1)} MB`);

    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setDocBase64(base64);
        setDocContent(`[Attached PDF Document: "${file.name}" (${file.size} bytes)]\nProcessed with Gemini multimodal PDF extraction.`);
        toast.success(`PDF "${file.name}" attached as active study context!`);
        
        // Reset tutor welcome for new document
        setTutorMessages([
          {
            id: `tut-${Date.now()}`,
            sender: "assistant",
            text: `I have loaded your PDF "${file.name}". I am ready to answer questions or generate flashcards strictly based on this document.`,
            timestamp: "Just now",
            citations: [file.name],
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      const textReader = new FileReader();
      textReader.onload = () => {
        const text = textReader.result as string;
        setDocContent(text);
        setDocBase64(null);
        toast.success(`Study text file "${file.name}" loaded successfully!`);
      };
      textReader.readAsText(file);
    }
  };

  // Select existing note from workspace
  const handleSelectWorkspaceNote = (note: Note) => {
    setDocTitle(`${note.title} (Workspace Note)`);
    setSelectedFileName(note.title);
    setDocContent(note.content || "Empty note content");
    setDocBase64(null);
    setFileSizeStr("Workspace Note");
    toast.info(`Switched active study document to "${note.title}".`);

    setTutorMessages([
      {
        id: `tut-${Date.now()}`,
        sender: "assistant",
        text: `Active study context updated to note: "${note.title}". Ask me any concept from this note!`,
        timestamp: "Just now",
        citations: [note.title],
      },
    ]);
  };

  // Generate Flashcards from PDF / Notes
  const handleGenerateFlashcards = async () => {
    if (!isPremium) {
      setPremiumModalOpen(true);
      return;
    }
    setIsGeneratingFlashcards(true);
    try {
      const res = await generateFlashcardsFromDocumentAI(
        docTitle,
        docContent,
        flashcardFocusTopic || undefined,
        docBase64 || undefined
      );

      if (res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setMasteredCards(new Set());
        toast.success(`⚡ Generated ${res.flashcards.length} high-yield flashcards from "${docTitle}"!`);
        setActiveTab("flashcards");
      } else {
        toast.info("Flashcards generated from document.");
      }
    } catch (err) {
      console.error("Error generating flashcards", err);
      toast.error("Failed to generate flashcards from document.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Send query to Targeted Study PDF RAG Agent
  const handleSendTutorQuery = async (queryText?: string) => {
    const textToSend = (queryText || tutorInput).trim();
    if (!textToSend || isTutorThinking) return;

    if (!isPremium) {
      setPremiumModalOpen(true);
      return;
    }

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: "user" as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setTutorMessages((prev) => [...prev, userMsg]);
    if (!queryText) setTutorInput("");
    setIsTutorThinking(true);

    try {
      const history = tutorMessages.map((m) => ({ sender: m.sender, text: m.text }));
      const response = await queryStudyPDFRAGAgentAI(
        docTitle,
        docContent,
        textToSend,
        history,
        docBase64 || undefined
      );

      const assistantMsg = {
        id: `tut-${Date.now()}`,
        sender: "assistant" as const,
        text: response.text,
        citations: response.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setTutorMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error asking Study RAG Tutor:", err);
      toast.error("Study RAG Tutor encountered an error.");
    } finally {
      setIsTutorThinking(false);
    }
  };

  // Toggle flashcard mastery
  const toggleMastered = (cardId: string) => {
    setMasteredCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
        toast.success("Card marked as mastered! 🎯");
      }
      return next;
    });
  };

  // Bookmark a job to tasks
  const handleSaveJobToTasks = async (job: JobListing) => {
    if (!authUser) return;
    try {
      await addTask(authUser.uid, {
        title: `Apply to ${job.company} (${job.title})`,
        priority: "High",
        list: "Work",
        time: "10:00 AM",
        date: "Tomorrow",
        done: false,
      });
      toast.success(`Saved "${job.title}" application reminder to your Tasks!`);
    } catch (err) {
      console.error("Failed to save job task", err);
      toast.error("Failed to add task.");
    }
  };

  const handleIncrementProgress = async (c: Course, increment: number) => {
    if (!authUser) return;
    const newProgress = Math.max(0, Math.min(100, c.progress + increment));
    setCourses((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, progress: newProgress } : item))
    );
    try {
      await updateCourse(authUser.uid, c.id, { progress: newProgress });
    } catch (err) {
      console.error("Failed to update course progress", err);
      fetchStudyData();
    }
  };

  const handleDirectAddCourseToHub = async () => {
    if (!authUser || !aiQuizResult) return;
    setIsAddingCourseFromAI(true);
    try {
      const extracted = extractCourseSuggestion(aiQuizResult, currentTopic);
      await addCourse(authUser.uid, {
        title: extracted.title,
        subject: extracted.subject,
        progress: extracted.progress,
        next: extracted.next,
      });
      toast.success(`🎓 Course "${extracted.title}" added to Study Hub!`);
      await fetchStudyData();
    } catch (err) {
      console.error("Failed to add course", err);
      toast.error("Failed to add course to Study Hub.");
    } finally {
      setIsAddingCourseFromAI(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !courseTitle.trim() || !courseNext.trim()) return;

    try {
      await addCourse(authUser.uid, {
        title: courseTitle,
        subject: courseSubject,
        progress: courseProgress,
        next: courseNext,
      });
      setCourseTitle("");
      setCourseSubject("CS");
      setCourseProgress(0);
      setCourseNext("");
      setIsNewCourseOpen(false);
      fetchStudyData();
    } catch (err) {
      console.error("Failed to create course", err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      await deleteCourse(authUser.uid, id);
      fetchStudyData();
    } catch (err) {
      console.error("Failed to delete course", err);
    }
  };

  const filteredJobs = JOB_LISTINGS.filter((j) => {
    if (jobFilter === "All") return true;
    if (jobFilter === "Remote") return j.location.toLowerCase().includes("remote");
    return j.type === jobFilter;
  });

  const filteredNews = TECH_NEWS.filter((n) => {
    if (newsFilter === "All") return true;
    return n.category === newsFilter;
  });

  const currentFlashcard = flashcards[currentCardIndex] || flashcards[0];
  const masteryPercentage = flashcards.length > 0 ? Math.round((masteredCards.size / flashcards.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing study hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative space-y-6 pb-12">
      <PageHeader
        title="Study Hub & AI Tutor"
        description="PDF-scoped RAG tutor, auto-generated flashcards, tech hiring opportunities & industry news."
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Study PDF
            </Button>
            <Button
              disabled={isGeneratingFlashcards}
              onClick={handleGenerateFlashcards}
              className="rounded-full bg-gradient-primary cursor-pointer text-xs shadow-md"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isGeneratingFlashcards ? "animate-spin" : ""}`} />
              {isGeneratingFlashcards ? "Generating Cards..." : "Create PDF Flashcards"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => setIsNewCourseOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Course
            </Button>
          </div>
        }
      />

      {/* Hidden File Input for PDF / Notes Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.txt,.md,.docx"
        className="hidden"
      />

      {/* Active Study Document Header & Selector Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-background p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-foreground truncate max-w-xs sm:max-w-md">
                {selectedFileName || docTitle}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Active Study Target
              </span>
              <span className="text-xs text-muted-foreground">({fileSizeStr})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              RAG AI Tutor and Flashcard generator are strictly scoped to this material.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick switch to workspace note */}
          {userNotes.length > 0 && (
            <select
              onChange={(e) => {
                const found = userNotes.find((n) => n.id === e.target.value);
                if (found) handleSelectWorkspaceNote(found);
              }}
              defaultValue=""
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Switch to Workspace Note...
              </option>
              {userNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  📝 {n.title}
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full text-xs h-8 cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-400"
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> Replace PDF
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("tutor")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "tutor"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Bot className="h-3.5 w-3.5" /> PDF RAG Tutor
        </button>

        <button
          onClick={() => setActiveTab("flashcards")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "flashcards"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Interactive Flashcards ({flashcards.length})
        </button>

        <button
          onClick={() => setActiveTab("courses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "courses"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" /> Course Progress ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "jobs"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" /> Tech Hiring & Jobs
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab("news")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "news"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" /> Tech & AI News
        </button>
      </div>

      {/* TAB 1: TARGETED STUDY PDF RAG TUTOR */}
      {activeTab === "tutor" && (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in-0 duration-200">
          {/* Chat with Document Agent */}
          <div className="lg:col-span-2 glass rounded-2xl p-5 border border-indigo-500/20 flex flex-col h-[560px] shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Study Tutor (Document RAG)</h3>
                  <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                    Scoped to: <strong className="text-indigo-400">{docTitle}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Document Isolated
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setTutorMessages([
                      {
                        id: `tut-${Date.now()}`,
                        sender: "assistant",
                        text: `Chat reset. Ask me anything about "${docTitle}".`,
                        timestamp: "Just now",
                        citations: [docTitle],
                      },
                    ])
                  }
                  className="rounded-full text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Quick Topic Chips */}
            <div className="py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 border-b border-border/30">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                <Sparkles className="h-3 w-3 text-indigo-400" /> Ask:
              </span>
              <button
                onClick={() => handleSendTutorQuery("Summarize the 3 core principles and conclusions of this document.")}
                disabled={isTutorThinking}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/60 hover:bg-indigo-500/20 hover:text-indigo-400 border border-border/50 transition-all cursor-pointer shrink-0"
              >
                📋 Core Principles Summary
              </button>
              <button
                onClick={() => handleSendTutorQuery("Generate 3 challenging conceptual exam questions with answers based on this document.")}
                disabled={isTutorThinking}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/60 hover:bg-indigo-500/20 hover:text-indigo-400 border border-border/50 transition-all cursor-pointer shrink-0"
              >
                ❓ Practice Exam Questions
              </button>
              <button
                onClick={() => handleSendTutorQuery("What are the most important formulas, terms, and definitions mentioned here?")}
                disabled={isTutorThinking}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/60 hover:bg-indigo-500/20 hover:text-indigo-400 border border-border/50 transition-all cursor-pointer shrink-0"
              >
                📐 Key Definitions & Formulas
              </button>
            </div>

            {/* Chat Message Scroll Area */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 scrollbar-thin">
              {tutorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "glass border border-indigo-500/20 text-foreground rounded-tl-none shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">
                        {msg.sender === "user" ? "You" : "Study RAG Tutor"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>

                    {msg.citations && msg.citations.length > 0 && msg.sender === "assistant" && (
                      <div className="pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-indigo-400">Citations:</span>
                        {msg.citations.map((c, i) => (
                          <span key={i} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300 font-mono">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTutorThinking && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="glass p-3 rounded-2xl rounded-tl-none border border-indigo-500/20 flex items-center gap-2">
                    <span className="animate-pulse font-medium">Analyzing document contents with Gemini RAG...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTutorQuery();
              }}
              className="pt-2 border-t border-border/50 flex gap-2 shrink-0"
            >
              <Input
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder={`Ask anything about "${docTitle}"...`}
                disabled={isTutorThinking}
                className="rounded-full bg-background/80 text-xs px-4 h-10"
              />
              <Button
                type="submit"
                disabled={isTutorThinking || !tutorInput.trim()}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer px-4 h-10"
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Ask
              </Button>
            </form>
          </div>

          {/* Right Column: Document Details & Instant Action Card */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-4 shadow-md">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-400" /> Active Material Context
              </h3>
              <p className="text-xs text-muted-foreground">
                All study questions, practice quizzes, and flashcard generations use this text or PDF as ground truth.
              </p>

              <div className="bg-muted/40 rounded-xl p-3 max-h-48 overflow-y-auto text-[11px] font-mono text-muted-foreground whitespace-pre-wrap border border-white/5">
                {docContent.substring(0, 1000)}
                {docContent.length > 1000 && "\n\n...[content truncated for preview]"}
              </div>

              <div className="pt-2 border-t border-border/40 space-y-2">
                <Button
                  onClick={handleGenerateFlashcards}
                  disabled={isGeneratingFlashcards}
                  className="w-full rounded-full bg-gradient-primary cursor-pointer text-xs h-9"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate Flashcard Deck
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-full text-xs h-9 cursor-pointer"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Another PDF
                </Button>
              </div>
            </div>

            {/* Quick Flashcard Stats Card */}
            <div className="glass rounded-2xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Flashcard Deck Mastery</span>
                <span className="text-xs font-bold text-indigo-400">{masteryPercentage}%</span>
              </div>
              <Progress value={masteryPercentage} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">
                {masteredCards.size} of {flashcards.length} cards mastered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE FLASHCARDS */}
      {activeTab === "flashcards" && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-0 duration-200">
          {/* Flashcard Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Document Flashcard Deck ({currentCardIndex + 1} of {flashcards.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Click the card to flip and reveal the detailed answer and key memory anchor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {masteredCards.size} Mastered
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFlashcards((prev) => [...prev].sort(() => Math.random() - 0.5));
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                  toast.success("Deck shuffled!");
                }}
                className="rounded-full text-xs h-8 cursor-pointer"
              >
                <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Shuffle
              </Button>
            </div>
          </div>

          {/* 3D Interactive Flashcard Card */}
          {currentFlashcard && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[300px] sm:min-h-[340px] rounded-3xl p-8 cursor-pointer transition-all duration-300 border border-indigo-500/30 bg-gradient-to-br from-card/90 via-card/60 to-indigo-950/20 shadow-2xl hover:border-indigo-500/60 hover:shadow-indigo-500/10 flex flex-col justify-between select-none"
            >
              {/* Top Card Badge Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentFlashcard.category}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      currentFlashcard.difficulty === "Easy"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : currentFlashcard.difficulty === "Hard"
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {currentFlashcard.difficulty}
                  </span>
                  {masteredCards.has(currentFlashcard.id) && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Mastered
                    </span>
                  )}
                </div>
              </div>

              {/* Center Content: Question (Front) or Answer (Back) */}
              <div className="py-6 text-center space-y-4">
                {!isFlipped ? (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Concept / Question
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground max-w-xl mx-auto leading-snug">
                      {currentFlashcard.front}
                    </h2>
                    <p className="text-xs text-indigo-400 font-medium">Tap to reveal answer 🔄</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                      Explanation & Solution
                    </span>
                    <p className="text-sm sm:text-base leading-relaxed text-foreground max-w-2xl mx-auto font-medium">
                      {currentFlashcard.back}
                    </p>
                    {currentFlashcard.keyTakeaway && (
                      <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 max-w-lg mx-auto">
                        <p className="text-xs text-indigo-300 font-semibold">
                          💡 Memory Anchor: {currentFlashcard.keyTakeaway}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-4">
                <span>
                  Card {currentCardIndex + 1} of {flashcards.length}
                </span>
                <span className="italic">Click card anywhere to flip</span>
              </div>
            </div>
          )}

          {/* Navigation & Mastery Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={currentCardIndex === 0}
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex((prev) => Math.max(0, prev - 1));
              }}
              className="rounded-full cursor-pointer text-xs px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous Card
            </Button>

            <div className="flex gap-2">
              {currentFlashcard && (
                <Button
                  variant={masteredCards.has(currentFlashcard.id) ? "default" : "outline"}
                  onClick={() => toggleMastered(currentFlashcard.id)}
                  className={`rounded-full text-xs cursor-pointer ${
                    masteredCards.has(currentFlashcard.id)
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {masteredCards.has(currentFlashcard.id) ? "Mastered" : "Mark as Mastered"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-full text-xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Flip Card
              </Button>
            </div>

            <Button
              variant="outline"
              disabled={currentCardIndex === flashcards.length - 1}
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
              }}
              className="rounded-full cursor-pointer text-xs px-4"
            >
              Next Card <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: COURSE PROGRESS */}
      {activeTab === "courses" && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Active Courses & Study Tracks</h3>
              <p className="text-xs text-muted-foreground">Track learning progress, milestones, and daily study blocks.</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewCourseOpen(true)}
              className="rounded-full bg-gradient-primary cursor-pointer text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New Course
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="glass rounded-2xl p-6 relative group border border-white/5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                      {c.subject}
                    </span>
                    <button
                      onClick={() => handleDeleteCourse(c.id)}
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-semibold text-foreground">{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} className="mt-2 h-1.5" />
                  <p className="mt-3 text-xs text-muted-foreground italic">Next: {c.next}</p>
                </div>

                <div className="mt-5 flex gap-2 items-center justify-between border-t border-border/40 pt-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full cursor-pointer text-xs"
                      onClick={() => handleIncrementProgress(c, -5)}
                    >
                      -5
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full cursor-pointer text-xs"
                      onClick={() => handleIncrementProgress(c, 5)}
                    >
                      +5
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocTitle(`${c.title} Course`);
                        setDocContent(`Study Track: ${c.title}\nSubject: ${c.subject}\nNext Focus: ${c.next}`);
                        setActiveTab("tutor");
                        toast.info(`Switched active study context to "${c.title}".`);
                      }}
                      className="rounded-full h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Bot className="mr-1 h-3.5 w-3.5" /> AI Tutor
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TECH HIRING & JOBS */}
      {activeTab === "jobs" && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-400" /> Active Tech Hiring & Job Openings
              </h3>
              <p className="text-xs text-muted-foreground">
                Verified high-growth software, AI, and cloud roles for students and engineers.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(["All", "Internship", "New Grad", "Full-Time", "Remote"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setJobFilter(filter)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    jobFilter === filter
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-2xl p-5 border border-white/5 hover:border-emerald-500/30 transition-all shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs border ${job.companyLogoBg}`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
                      </div>
                    </div>

                    {job.isUrgent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                        Urgent Hiring
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{job.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{job.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveJobToTasks(job)}
                      className="rounded-full text-xs h-8 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-400"
                      title="Add to Tasks & Calendar"
                    >
                      <Bookmark className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-sm"
                    >
                      Apply <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LATEST TECHNOLOGY & AI NEWS */}
      {activeTab === "news" && (
        <div className="space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-blue-400" /> Latest Technology & AI Research News
              </h3>
              <p className="text-xs text-muted-foreground">
                Stay ahead of the curve with architectural shifts, AI models, and developer frameworks.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(["All", "AI & ML", "Web & Cloud", "Career"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setNewsFilter(filter)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    newsFilter === filter
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredNews.map((article) => (
              <div
                key={article.id}
                className="glass rounded-2xl p-5 border border-white/5 hover:border-blue-500/30 transition-all shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${article.badgeColor}`}
                    >
                      {article.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{article.readTime}</span>
                  </div>

                  <h4 className="text-sm font-bold text-foreground leading-snug hover:text-primary transition-colors">
                    {article.title}
                  </h4>

                  <p className="text-xs text-muted-foreground leading-relaxed">{article.summary}</p>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    Source: <strong className="text-foreground">{article.source}</strong> · {article.date}
                  </span>

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs transition-colors"
                  >
                    Read article <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Course Overlay Modal */}
      {isNewCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewCourseOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-primary" /> Create New Course
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Course Title</label>
                <Input
                  required
                  placeholder="e.g. System Design Interview"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Subject / Field</label>
                  <select
                    value={courseSubject}
                    onChange={(e) => setCourseSubject(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="CS">Computer Science</option>
                    <option value="Language">Language</option>
                    <option value="Finance">Finance</option>
                    <option value="Math">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts & Humanities</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Starting Progress (%)</label>
                  <Input
                    required
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={courseProgress}
                    onChange={(e) => setCourseProgress(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Next Milestone / Topic</label>
                <Input
                  required
                  placeholder="e.g. Load balancers, Consistent Hashing"
                  value={courseNext}
                  onChange={(e) => setCourseNext(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewCourseOpen(false)}
                  className="rounded-full cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Create Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="Study PDF RAG Tutor & AI Flashcard Generator"
        onUpgraded={() => {
          refreshProfile();
          fetchStudyData();
        }}
      />
    </div>
  );
}