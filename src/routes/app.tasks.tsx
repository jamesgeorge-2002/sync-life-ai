import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, ListTodo, Flag, X, Sparkles, Trash, CheckCheck, RefreshCw, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTasks, addTask, updateTask, deleteTask, clearCompletedTasks, isTaskFromPreviousDay, Task } from "@/lib/db";
import { analyzeTaskPriorityAI } from "@/lib/gemini";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

function TasksPage() {
  const { user: authUser } = useAuth();
  const { isPremium, refreshProfile } = usePremium();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearingDone, setIsClearingDone] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // Live Date and Time
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // AI Task Coach State
  const [aiTaskAnalysis, setAiTaskAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // New task form state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newTaskCategory, setNewTaskCategory] = useState("Today");

  // Selected list sidebar filter
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!authUser) return;
    try {
      const list = await getTasks(authUser.uid);
      setTasks(list);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [authUser]);

  const toggle = async (task: Task) => {
    if (!authUser) return;
    const updatedDone = !task.done;
    // optimistic update
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, done: updatedDone } : t)));
    try {
      await updateTask(authUser.uid, task.id, { done: updatedDone });
    } catch (err) {
      console.error("Failed to update task", err);
      // rollback
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, done: !updatedDone } : t)));
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(authUser.uid, id);
      fetchTasks();
      toast.success("Task deleted");
    } catch (err) {
      console.error("Failed to delete task", err);
      toast.error("Failed to delete task");
    }
  };

  const handleClearCompleted = async () => {
    if (!authUser) return;
    setIsClearingDone(true);
    try {
      const count = await clearCompletedTasks(authUser.uid);
      if (count > 0) {
        toast.success(`Cleared ${count} completed tasks!`);
      } else {
        toast.info("No completed tasks to clear.");
      }
      fetchTasks();
    } catch (err) {
      console.error("Failed to clear completed tasks", err);
      toast.error("Failed to clear completed tasks.");
    } finally {
      setIsClearingDone(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newTaskTitle.trim()) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await addTask(authUser.uid, {
        title: newTaskTitle.trim(),
        time: "Today",
        priority: newTaskPriority,
        done: false,
        list: newTaskCategory,
        date: todayStr,
      });
      setNewTaskTitle("");
      setIsNewTaskOpen(false);
      fetchTasks();
      toast.success("Task added to your queue!");
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const lists = ["Today", "Work", "Personal", "Someday"];

  const filteredTasks = selectedList
    ? tasks.filter((t) => t.list === selectedList)
    : tasks;

  const doneCount = tasks.filter((t) => t.done).length;
  const pendingCount = tasks.filter((t) => !t.done).length;

  const formattedDateStr = currentDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedTimeStr = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing tasks & daily rollover...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative">
      <PageHeader
        title="Tasks & Schedule"
        description={`${formattedDateStr} • ${formattedTimeStr} • Automatic rollover keeps unfinished tasks active.`}
        icon={<ListTodo className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {doneCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isClearingDone}
                onClick={handleClearCompleted}
                className="rounded-full text-xs cursor-pointer border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                title="Clear all completed tasks"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                Clear Done ({doneCount})
              </Button>
            )}
            <Button
              disabled={isAiAnalyzing || tasks.length === 0}
              onClick={async () => {
                if (!isPremium) {
                  setPremiumModalOpen(true);
                  return;
                }
                setIsAiAnalyzing(true);
                try {
                  const res = await analyzeTaskPriorityAI(tasks);
                  setAiTaskAnalysis(res);
                  toast.success("AI Task Execution Plan generated!");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsAiAnalyzing(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiAnalyzing ? "animate-spin" : ""}`} />
              {isAiAnalyzing ? "Analyzing..." : "AI Auto-Prioritize"}
            </Button>
            <Button className="rounded-full bg-gradient-primary cursor-pointer text-xs" onClick={() => setIsNewTaskOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />New task
            </Button>
          </div>
        }
      />

      {/* Daily Rollover Info Pill */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin-slow shrink-0" />
          <span>
            <strong className="text-foreground font-semibold">Daily Rollover Active:</strong> Unfinished tasks from previous days stay in your active queue. Completed tasks from previous days are cleared automatically.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">{pendingCount} Pending</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">{doneCount} Completed Today</span>
        </div>
      </div>

      {/* AI Task Analysis Result Box */}
      {aiTaskAnalysis && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">AI Eisenhower Matrix & Task Breakdown</h3>
            </div>
            <button onClick={() => setAiTaskAnalysis(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-3 rounded-xl border border-white/10">
            {aiTaskAnalysis}
          </div>
          <div className="mt-3">
            <ActionDispatchBar
              text={aiTaskAnalysis}
              sourceTitle="AI Task Execution Strategy"
              contextType="tasks"
              onUpdated={fetchTasks}
              showShopping={true}
              showCalendar={true}
              showTasks={true}
              showExpense={true}
              showNote={true}
              showHabit={true}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lists</p>
            {selectedList && (
              <button onClick={() => setSelectedList(null)} className="text-[10px] text-primary hover:underline">
                Clear filter
              </button>
            )}
          </div>
          <ul className="space-y-1 text-sm">
            {lists.map((l) => (
              <li key={l}>
                <button
                  onClick={() => setSelectedList(l)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${
                    selectedList === l ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                  }`}
                >
                  <span>{l}</span>
                  <span className={`text-xs ${selectedList === l ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {tasks.filter((t) => t.list === l && !t.done).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="glass rounded-2xl p-4">
          <Tabs defaultValue="today">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <TabsList>
                <TabsTrigger value="today">Today ({tasks.filter((t) => !t.done || t.list === "Today").length})</TabsTrigger>
                <TabsTrigger value="week">Active ({pendingCount})</TabsTrigger>
                <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
                <TabsTrigger value="done">Done ({doneCount})</TabsTrigger>
              </TabsList>

              {doneCount > 0 && (
                <button
                  onClick={handleClearCompleted}
                  disabled={isClearingDone}
                  className="text-[11px] text-muted-foreground hover:text-emerald-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <CheckCheck className="h-3 w-3" />
                  Clear all done
                </button>
              )}
            </div>

            {["today", "week", "all", "done"].map((k) => {
              const displayTasks = filteredTasks.filter((t) => {
                if (k === "done") return t.done;
                if (k === "today") return !t.done || t.list === "Today";
                if (k === "week") return !t.done;
                return true; // "all"
              });

              return (
                <TabsContent key={k} value={k}>
                  {displayTasks.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      {k === "done" ? "No completed tasks yet." : "No unfinished tasks found in this tab."}
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-1">
                      {displayTasks.map((t) => {
                        const isRolledOver = !t.done && isTaskFromPreviousDay(t.date, t.createdAt);
                        return (
                          <li key={t.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                            <Checkbox checked={t.done} onCheckedChange={() => toggle(t)} />
                            <div className="min-w-0 flex-1">
                              <p className={"text-sm " + (t.done ? "line-through text-muted-foreground" : "font-medium")}>
                                {t.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>{t.time || "Today"} · {t.list}</span>
                                {isRolledOver && (
                                  <span className="rounded-full bg-blue-500/10 text-blue-400 px-1.5 py-0.2 text-[9px] font-semibold">
                                    Rolled Over
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                (t.priority === "High" ? "bg-rose-500/15 text-rose-500" : t.priority === "Medium" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500")
                              }>
                                <Flag className="inline mr-1 h-2.5 w-2.5" />
                                {t.priority}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1 cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>

      {/* New Task Overlay Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewTaskOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-primary" /> Create New Task
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Task Title</label>
                <Input
                  required
                  placeholder="e.g. Prepare presentation deck"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">List Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Today">Today</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Someday">Someday</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewTaskOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Add Task
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
        featureName="AI Task Prioritizer & Strategy"
        onUpgraded={() => {
          refreshProfile();
          fetchTasks();
        }}
      />
    </div>
  );
}