import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Bot,
  Calendar,
  Droplets,
  Flame,
  Heart,
  Moon,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
  X,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getTasks,
  getMeetings,
  getNotes,
  getGoals,
  getExpenses,
  getHabits,
  getUserProfile,
  getHealthMetrics,
  getProductivityLogs,
  updateTask,
  addTask,
  createUserProfileDocument,
  Task,
  Meeting,
  Note,
  Goal,
  Expense,
  Habit,
  UserProfile,
  HealthMetrics,
  ProductivityLog,
} from "@/lib/db";

import { generateDailyLifeBriefing } from "@/lib/gemini";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";
import { isPremiumUser } from "@/lib/premium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function promiseTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [prodLogs, setProdLogs] = useState<ProductivityLog[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // AI Daily Executive Briefing state
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // Task creation state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newTaskCategory, setNewTaskCategory] = useState("Today");

  const fetchData = async (retries = 0) => {
    if (!authUser) return;
    try {
      // Check if user profile is already initialized
      // Wrap in a 6-second timeout in case the connection is hanging
      let userProfile = await promiseTimeout(
        getUserProfile(authUser.uid),
        6000,
        "Connection to Firestore timed out. Please check your Firestore settings.",
      );

      if (!userProfile) {
        setIsSeeding(true);
        try {
          await createUserProfileDocument(authUser.uid, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          });
          userProfile = await getUserProfile(authUser.uid);
        } catch (seedErr) {
          console.error("Error creating user profile document:", seedErr);
        }
      }

      setIsSeeding(false);
      setProfile(userProfile);

      const [tList, mList, nList, gList, eList, hList, healthData, logsData] =
        await Promise.all([
          getTasks(authUser.uid),
          getMeetings(authUser.uid),
          getNotes(authUser.uid),
          getGoals(authUser.uid),
          getExpenses(authUser.uid),
          getHabits(authUser.uid),
          getHealthMetrics(authUser.uid),
          getProductivityLogs(authUser.uid),
        ]);

      setTasks(tList);
      setMeetings(mList);
      setNotes(nList);
      setGoals(gList);
      setExpenses(eList);
      setHabits(hList);
      setHealth(healthData);
      setProdLogs(logsData);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      toast.error(
        err.message || "Error connecting to Firebase. Please check your Firestore rules.",
      );
      setLoading(false);
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authUser]);

  const handleToggleTask = async (task: Task) => {
    if (!authUser) return;
    const updatedDone = !task.done;
    // optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: updatedDone } : t)));
    try {
      await updateTask(authUser.uid, task.id, { done: updatedDone });
    } catch (err) {
      console.error("Error updating task status:", err);
      // rollback
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !updatedDone } : t)));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newTaskTitle.trim()) return;
    try {
      await addTask(authUser.uid, {
        title: newTaskTitle,
        time: "Today",
        priority: newTaskPriority,
        done: false,
        list: newTaskCategory,
      });
      setNewTaskTitle("");
      setIsNewTaskOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  // Dynamically calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.done).length;
  const taskProductivity = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const maxHabitStreak = habits.length ? Math.max(...habits.map((h) => h.streak), 0) : 0;

  // Finance calculations
  const currentIncome =
    expenses.filter((e) => e.amount > 0).reduce((acc, e) => acc + e.amount, 0);
  const currentSpent =
    Math.abs(expenses.filter((e) => e.amount < 0).reduce((acc, e) => acc + e.amount, 0));
  const currentSaved = currentIncome - currentSpent;
  const budgetTarget = profile?.budgetTarget || 0;
  const budgetPct = budgetTarget > 0 ? Math.round((currentSpent / budgetTarget) * 100) : 0;

  // Fallback if loading
  if (loading || isSeeding) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            {isSeeding ? "Setting up your workspace..." : "Syncing dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  const userFirstName =
    profile?.displayName?.split(" ")[0] || authUser?.email?.split("@")[0] || "User";

  return (
    <div className="mx-auto max-w-7xl relative">
      <PageHeader
        title={`${greet()}, ${userFirstName}`}
        description={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • Here's what your day looks like. You're on track — keep the momentum.`}
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full cursor-pointer"
              onClick={() => setIsNewTaskOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              New task
            </Button>
              <Link to="/app/assistant">
                <Button className="rounded-full bg-gradient-primary cursor-pointer">
                  <Bot className="mr-1 h-4 w-4" />
                  Ask AI
                </Button>
              </Link>
            </>
          }
        />

        {/* AI Daily Executive Briefing Banner */}
        <div className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-purple-500/5 to-emerald-500/10 p-5 shadow-lg backdrop-blur-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">AI Daily Executive Briefing</h3>
                <p className="text-[11px] text-muted-foreground">Powered by Google Gemini 2.5 Flash & RAG Engine</p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={isBriefingLoading}
              onClick={async () => {
                if (!isPremiumUser(profile)) {
                  setPremiumModalOpen(true);
                  return;
                }
                setIsBriefingLoading(true);
                try {
                  const completedCount = tasks.filter((t) => t.done).length;
                  const res = await generateDailyLifeBriefing({
                    userName: userFirstName,
                    tasksCount: tasks.length,
                    completedTasksCount: completedCount,
                    sleepHours: health?.sleep || "7.5h",
                    restingHr: health?.restingHr || 64,
                    mood: "Focused & High Energy",
                  });
                  setAiBriefing(res);
                  toast.success("AI Morning Briefing generated!");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsBriefingLoading(false);
                }
              }}
              className="rounded-full bg-gradient-primary text-xs cursor-pointer shrink-0 shadow-sm"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isBriefingLoading ? "animate-spin" : ""}`} />
              {isBriefingLoading ? "Generating..." : aiBriefing ? "Refresh Briefing" : "Generate Morning Briefing"}
            </Button>
          </div>

          {aiBriefing ? (
            <div className="mt-3 space-y-3">
              <div className="text-xs leading-relaxed whitespace-pre-wrap text-foreground font-sans bg-background/50 p-3.5 rounded-xl border border-white/10">
                {aiBriefing}
              </div>
              <div className="mt-2">
                <ActionDispatchBar
                  text={aiBriefing}
                  sourceTitle="Morning AI Life Briefing"
                  contextType="general"
                  onUpdated={fetchData}
                  showShopping={true}
                  showCalendar={true}
                  showTasks={true}
                  showExpense={true}
                  showNote={true}
                  showHabit={true}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <p>🎯 {tasks.filter(t => !t.done).length} pending tasks · 💤 Sleep: {health?.sleep || "7.5h"} · ⚡ Focus Target: 5.0h</p>
              <span className="text-[10px] font-semibold text-primary">Click button above to generate personalized AI briefing</span>
            </div>
          )}
        </div>

      {/* Stats from User Profile database values */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Productivity"
          value={`${taskProductivity}%`}
          delta="Based on completed tasks"
          tone="up"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Life balance"
          value={profile?.lifeBalance ?? 0}
          delta={profile?.lifeBalance ? "Healthy across areas" : "Track habits & tasks"}
          tone="up"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Focus hours"
          value={`${profile?.focusHours ?? 0}h`}
          delta={profile?.focusHours ? "Recorded focus time" : "No focus logged"}
          tone="up"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label="Habit streak"
          value={`${maxHabitStreak}d`}
          delta={maxHabitStreak > 0 ? "🔥 Current streak" : "Track daily habits"}
          icon={<Flame className="h-4 w-4" />}
        />
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Tasks (Row 1 - Left 2 cols) */}
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Today's tasks</h2>
            <Link to="/app/tasks" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground text-sm">
              <p>No tasks today.</p>
              <Button variant="link" size="sm" onClick={() => setIsNewTaskOpen(true)}>
                Create one now
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50">
                  <Checkbox checked={t.done} onCheckedChange={() => handleToggleTask(t)} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        "truncate text-sm " +
                        (t.done ? "text-muted-foreground line-through" : "font-medium")
                      }
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.time} · {t.list}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (t.priority === "High"
                        ? "bg-rose-500/15 text-rose-500"
                        : t.priority === "Medium"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-emerald-500/15 text-emerald-500")
                    }
                  >
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Meetings (Row 1 - Right 1 col) */}
        <section className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Meetings</h2>
            <Link to="/app/calendar" className="text-xs text-primary hover:underline">
              <Calendar className="inline h-3 w-3" />
            </Link>
          </div>
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No meetings scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {meetings.slice(0, 3).map((m) => (
                <li key={m.id} className="rounded-xl border border-border/50 p-3">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.time}</p>
                  {m.people && m.people.length > 0 && (
                    <div className="mt-2 flex -space-x-2">
                      {m.people.map((p) => (
                        <div
                          key={p}
                          className="grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-gradient-primary text-[10px] font-bold text-primary-foreground"
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Productivity Logs (Row 2 - Left 2 cols) */}
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Weekly focus</h2>
            <Link to="/app/analytics" className="text-xs text-primary hover:underline">
              Analytics
            </Link>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prodLogs}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-chart-1)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Health Stats from Database (Row 2 - Right 1 col) */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-base font-semibold">Health today</h2>
          <div className="space-y-4">
            {[
              {
                icon: Droplets,
                label: "Water",
                value: health?.water || "0 / 2 L",
                pct: health?.waterPct || 0,
                color: "text-sky-500",
              },
              {
                icon: Moon,
                label: "Sleep",
                value: health?.sleep || "0h 0m",
                pct: health?.sleepPct || 0,
                color: "text-indigo-500",
              },
              {
                icon: Activity,
                label: "Steps",
                value: health?.steps || "0 / 10k",
                pct: health?.stepsPct || 0,
                color: "text-emerald-500",
              },
              {
                icon: Heart,
                label: "Heart avg",
                value: health?.heart || "-- bpm",
                pct: health?.heartPct || 0,
                color: "text-rose-500",
              },
            ].map((h) => (
              <div key={h.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <h.icon className={"h-4 w-4 " + h.color} />
                    {h.label}
                  </span>
                  <span className="text-muted-foreground">{h.value}</span>
                </div>
                <Progress value={h.pct} className="mt-2 h-1.5" />
              </div>
            ))}
          </div>
        </section>

        {/* Budget (Row 3 - Col 1) */}
        <section className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">This month</h2>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">
            ₹{currentSpent.toLocaleString()}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / ₹{budgetTarget.toLocaleString()}
            </span>
          </p>
          <Progress value={budgetPct} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            You are {budgetPct}% towards your monthly budget target.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Income", v: `₹${(currentIncome / 1000).toFixed(1)}k` },
              { l: "Spent", v: `₹${(currentSpent / 1000).toFixed(1)}k` },
              { l: "Saved", v: `₹${(currentSaved / 1000).toFixed(1)}k` },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border border-border/50 p-2">
                <p className="text-xs text-muted-foreground">{x.l}</p>
                <p className="text-sm font-semibold">{x.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Goals (Row 3 - Col 2) */}
        <section className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Goal progress</h2>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No goals set.</p>
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 4).map((x) => (
                <div key={x.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{x.title}</span>
                    <span className="text-muted-foreground">{x.progress}%</span>
                  </div>
                  <Progress value={x.progress} className="mt-2 h-1.5" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes (Row 3 - Col 3) */}
        <section className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent notes</h2>
            <Link to="/app/notes" className="text-xs text-primary hover:underline">
              Open
            </Link>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No notes found.</p>
          ) : (
            <ul className="space-y-2">
              {notes.slice(0, 3).map((n) => (
                <li key={n.id} className="rounded-xl border border-border/50 p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.tag}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming Events (Row 4 - Full 3 cols) */}
        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Events & Schedule</h2>
            <Link to="/app/calendar" className="text-xs text-primary hover:underline">
              View calendar
            </Link>
          </div>
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events scheduled.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.slice(0, 3).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 bg-muted/20">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.title}</p>
                    <p className="text-xs text-muted-foreground">{u.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
                  <label className="text-xs font-semibold text-muted-foreground">
                    List Category
                  </label>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="rounded-full cursor-pointer"
                >
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
        featureName="AI Daily Executive Briefing"
        onUpgraded={fetchData}
      />
    </div>
  );
}
