import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Repeat, Plus, Flame, X, Trash, Sparkles, FileText, CheckCircle2, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getHabits, addHabit, updateHabit, deleteHabit, addNote, addTask, addMeeting, Habit } from "@/lib/db";
import { generateHabitCoachingAI } from "@/lib/gemini";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/habits")({ component: HabitsPage });

const presetColors = ["#7C3AED", "#2563EB", "#10B981", "#0EA5E9", "#F97316", "#E11D48"];

function HabitsPage() {
  const { user: authUser } = useAuth();
  const { isPremium, refreshProfile } = usePremium();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // AI Habit Coach state
  const [aiHabitAnalysis, setAiHabitAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // New habit form state
  const [isNewHabitOpen, setIsNewHabitOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitTarget, setNewHabitTarget] = useState(5);
  const [newHabitColor, setNewHabitColor] = useState(presetColors[0]);

  const fetchHabits = async () => {
    if (!authUser) return;
    try {
      const list = await getHabits(authUser.uid);
      setHabits(list);
    } catch (err) {
      console.error("Failed to load habits", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [authUser]);

  const handleToggleDay = async (habit: Habit, index: number) => {
    if (!authUser) return;

    // Toggle done count:
    // If clicked on day < current done count, set done to index
    // If clicked on day >= current done count, set done to index + 1
    let newDone = habit.done;
    if (index < habit.done) {
      newDone = index;
    } else {
      newDone = index + 1;
    }

    // Cap newDone between 0 and 7
    newDone = Math.max(0, Math.min(7, newDone));

    // Update streak: if done increases and hits target, increment streak.
    // If it decreases below target, optionally keep streak or adjust. We will keep it simple.
    let newStreak = habit.streak;
    if (newDone >= habit.target && habit.done < habit.target) {
      newStreak += 1;
    } else if (newDone < habit.target && habit.done >= habit.target) {
      newStreak = Math.max(0, newStreak - 1);
    }

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, done: newDone, streak: newStreak } : h))
    );

    try {
      await updateHabit(authUser.uid, habit.id, {
        done: newDone,
        streak: newStreak,
      });
    } catch (err) {
      console.error("Failed to update habit progress", err);
      fetchHabits(); // Rollback
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newHabitName.trim()) return;

    try {
      await addHabit(authUser.uid, {
        name: newHabitName,
        streak: 0,
        target: newHabitTarget,
        done: 0,
        color: newHabitColor,
      });
      setNewHabitName("");
      setNewHabitTarget(5);
      setIsNewHabitOpen(false);
      fetchHabits();
    } catch (err) {
      console.error("Failed to create habit", err);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!authUser) return;
    if (!confirm("Delete this habit?")) return;
    try {
      await deleteHabit(authUser.uid, habitId);
      fetchHabits();
    } catch (err) {
      console.error("Failed to delete habit", err);
    }
  };

  const days = ["M", "T", "W", "T", "F", "S", "S"];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative">
      <PageHeader
        title="Habits"
        description="Build streaks with reminders and AI nudges."
        icon={<Repeat className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              disabled={isAiAnalyzing || habits.length === 0}
              onClick={async () => {
                if (!isPremium) {
                  setPremiumModalOpen(true);
                  return;
                }
                setIsAiAnalyzing(true);
                try {
                  const habitData = habits.map((h) => ({ name: h.name, streak: h.streak }));
                  const res = await generateHabitCoachingAI(habitData);
                  setAiHabitAnalysis(res);
                  toast.success("AI Habit Coaching analysis generated!");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsAiAnalyzing(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiAnalyzing ? "animate-spin" : ""}`} />
              {isAiAnalyzing ? "Analyzing..." : "AI Habit Coach"}
            </Button>
            <Button className="rounded-full bg-gradient-primary cursor-pointer text-xs" onClick={() => setIsNewHabitOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />New habit
            </Button>
          </div>
        }
      />

      {/* AI Habit Analysis Card */}
      {aiHabitAnalysis && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">AI Habit Coach & Behavioral Advice</h3>
            </div>
            <button onClick={() => setAiHabitAnalysis(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-3 rounded-xl border border-white/10">
            {aiHabitAnalysis}
          </div>
          <div className="mt-3">
            <ActionDispatchBar
              text={aiHabitAnalysis}
              sourceTitle="AI Habit Coaching Strategy"
              contextType="habits"
              onUpdated={fetchHabits}
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
      <div className="grid gap-4 md:grid-cols-2">
        {habits.map((h) => (
          <div key={h.id} className="glass rounded-2xl p-6 relative group">
            <button
              onClick={() => handleDeleteHabit(h.id)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
            >
              <Trash className="h-4 w-4" />
            </button>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl text-white"
                  style={{ background: h.color }}
                >
                  <Repeat className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.done} of {h.target} this week
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-500">
                <Flame className="h-3 w-3" />
                {h.streak}d
              </div>
            </div>
            <Progress value={Math.min(100, (h.done / h.target) * 100)} className="mb-3 h-1.5" />
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const isCompleted = i < h.done;
                return (
                  <button
                    key={i}
                    onClick={() => handleToggleDay(h, i)}
                    className={`h-8 rounded-md text-center text-xs font-medium leading-8 transition-all cursor-pointer ${
                      isCompleted ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    style={isCompleted ? { background: h.color } : undefined}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* New Habit Overlay Modal */}
      {isNewHabitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewHabitOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Repeat className="h-5 w-5 text-primary" /> Create New Habit
            </h3>
            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Habit Name</label>
                <Input
                  required
                  placeholder="e.g. Read 15 mins daily"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Weekly Target (Days)</label>
                  <select
                    value={newHabitTarget}
                    onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "day" : "days"} / week
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Habit Color</label>
                  <div className="flex gap-1.5 mt-2.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewHabitColor(color)}
                        className={`h-6 w-6 rounded-full border-2 transition-all cursor-pointer ${
                          newHabitColor === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewHabitOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Add Habit
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
        featureName="AI Habit Coach"
        onUpgraded={() => {
          refreshProfile();
          fetchHabits();
        }}
      />
    </div>
  );
}