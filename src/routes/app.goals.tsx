import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Target, Plus, Trophy, X, Trash, Sparkles, FileText, CheckCircle2, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getGoals, addGoal, updateGoal, deleteGoal, addNote, addTask, addMeeting, Goal } from "@/lib/db";
import { generateGoalMilestonesAI } from "@/lib/gemini";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/goals")({ component: GoalsPage });

function GoalsPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Goal Strategist state
  const [aiGoalPlan, setAiGoalPlan] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // New goal modal state
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("Career");
  const [goalProgress, setGoalProgress] = useState(0);

  const fetchGoals = async () => {
    if (!authUser) return;
    try {
      const list = await getGoals(authUser.uid);
      setGoals(list);
    } catch (err) {
      console.error("Failed to load goals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [authUser]);

  const handleIncrementProgress = async (g: Goal, increment: number) => {
    if (!authUser) return;
    const newProgress = Math.max(0, Math.min(100, g.progress + increment));
    setGoals((prev) => prev.map((item) => (item.id === g.id ? { ...item, progress: newProgress } : item)));
    try {
      await updateGoal(authUser.uid, g.id, { progress: newProgress });
    } catch (err) {
      console.error("Failed to update goal progress", err);
      fetchGoals();
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !goalTitle.trim()) return;

    try {
      await addGoal(authUser.uid, {
        title: goalTitle,
        category: goalCategory,
        progress: goalProgress,
      });
      setGoalTitle("");
      setGoalProgress(0);
      setIsNewGoalOpen(false);
      fetchGoals();
    } catch (err) {
      console.error("Failed to create goal", err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await deleteGoal(authUser.uid, id);
      fetchGoals();
    } catch (err) {
      console.error("Failed to delete goal", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="AI Goal Strategist & S.M.A.R.T. Milestones"
        onUpgraded={fetchGoals}
      />
      <PageHeader
        title="Goals"
        description="OKR-style tracking with AI-suggested milestones."
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              disabled={isAiGenerating}
              onClick={async () => {
                if (!isPremium) {
                  setIsPremiumModalOpen(true);
                  return;
                }
                const targetGoal = prompt("Enter a goal title to generate S.M.A.R.T. milestones:", goals[0]?.title || "Launch AI Saas Startup");
                if (!targetGoal) return;
                setIsAiGenerating(true);
                try {
                  const res = await generateGoalMilestonesAI(targetGoal);
                  setAiGoalPlan(res);
                  toast.success(`AI Goal Milestones generated for "${targetGoal}"!`);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsAiGenerating(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiGenerating ? "animate-spin" : ""}`} />
              {isAiGenerating ? "Generating..." : "AI Goal Strategist"}
            </Button>
            <Button className="rounded-full bg-gradient-primary cursor-pointer text-xs" onClick={() => setIsNewGoalOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />New goal
            </Button>
          </div>
        }
      />

      {/* AI Goal Plan Result Box */}
      {aiGoalPlan && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">AI S.M.A.R.T. Goal Execution Plan</h3>
            </div>
            <button onClick={() => setAiGoalPlan(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-3 rounded-xl border border-white/10">
            {aiGoalPlan}
          </div>
          <div className="mt-3">
            <ActionDispatchBar
              text={aiGoalPlan}
              sourceTitle="AI Goal Execution Roadmap"
              contextType="goals"
              onUpdated={fetchGoals}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => (
          <div key={g.id} className="glass rounded-2xl p-6 relative group">
            <button
              onClick={() => handleDeleteGoal(g.id)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
            >
              <Trash className="h-4 w-4" />
            </button>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {g.category}
            </span>
            <h3 className="mt-3 text-lg font-semibold">{g.title}</h3>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-bold">{g.progress}%</span>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-full cursor-pointer text-xs"
                  onClick={() => handleIncrementProgress(g, -5)}
                >
                  -5
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-full cursor-pointer text-xs"
                  onClick={() => handleIncrementProgress(g, 5)}
                >
                  +5
                </Button>
                <Trophy className="ml-2 h-5 w-5 text-amber-500 self-center" />
              </div>
            </div>
            <Progress value={g.progress} className="mt-3 h-2" />
            <p className="mt-3 text-xs text-muted-foreground">Next milestone in 2 weeks</p>
          </div>
        ))}
      </div>

      {/* New Goal Overlay Modal */}
      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewGoalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" /> Create New Goal
            </h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Goal Title</label>
                <Input
                  required
                  placeholder="e.g. Save ₹2,00,000, Learn Spanish B1"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Career">Career</option>
                    <option value="Reading">Reading</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Financial">Financial</option>
                    <option value="Academic">Academic</option>
                    <option value="Personal">Personal</option>
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
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewGoalOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Create Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}