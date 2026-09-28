import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Smile, Plus, Trash, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getMoodLogs, addMoodLog, getMoodPatterns, MoodLog } from "@/lib/db";
import { analyzeMoodJournalAI } from "@/lib/gemini";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/mood")({ component: MoodPage });

const emojis = ["😊", "😌", "🙂", "😐", "😔", "😤", "😍", "😴"];
const scoreMap: Record<string, number> = {
  "😊": 9,
  "😌": 8,
  "🙂": 7,
  "😐": 5,
  "😔": 3,
  "😤": 4,
  "😍": 10,
  "😴": 6,
};

function MoodPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Sentiment & Mindfulness State
  const [aiMoodAnalysis, setAiMoodAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const fetchMoodData = async () => {
    if (!authUser) return;
    try {
      const [logs, moodPatterns] = await Promise.all([
        getMoodLogs(authUser.uid),
        getMoodPatterns(authUser.uid),
      ]);
      setMoodLogs(logs);
      setPatterns(moodPatterns);
    } catch (err) {
      console.error("Failed to load mood details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodData();
  }, [authUser]);

  const handleCheckIn = async (emoji: string) => {
    if (!authUser) return;
    const note = prompt("How are you feeling? Add a journal note (optional):");
    const score = scoreMap[emoji] || 7;

    try {
      await addMoodLog(authUser.uid, {
        week: `W${Math.min(4, Math.ceil(new Date().getDate() / 7))}`,
        mood: score,
        note: note || `Felt ${emoji}`,
        tags: note ? ["journal"] : ["emoji-check"],
        date: "Today",
      });
      fetchMoodData();
    } catch (err) {
      console.error("Failed to log mood check-in", err);
    }
  };

  // Compile trend chart data by grouping weeks
  const chartData = moodLogs.reduce((acc: any[], log) => {
    const existing = acc.find((item) => item.week === log.week);
    if (existing) {
      existing.mood = Number(((existing.mood + log.mood) / 2).toFixed(1));
    } else {
      acc.push({ week: log.week, mood: log.mood });
    }
    return acc;
  }, []);

  const sortedChartData = chartData.sort((a, b) => a.week.localeCompare(b.week));

  const displayChartData =
    sortedChartData.length > 0
      ? sortedChartData
      : [
          { week: "W1", mood: 7 },
          { week: "W2", mood: 8 },
          { week: "W3", mood: 6 },
          { week: "W4", mood: 8.5 },
        ];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing mood logs...</p>
        </div>
      </div>
    );
  }

  // Filter checkins that have text notes to show on recent list
  const textEntries = moodLogs.filter((log) => log.note);

  return (
    <div className="mx-auto max-w-7xl">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="AI Mindfulness Coach & Sentiment Analysis"
        onUpgraded={fetchMoodData}
      />
      <PageHeader
        title="Mood Journal"
        description="AI-analyzed emotional patterns and triggers."
        icon={<Smile className="h-5 w-5" />}
        actions={
          <Button
            disabled={isAiAnalyzing}
            onClick={async () => {
              if (!isPremium) {
                setIsPremiumModalOpen(true);
                return;
              }
              setIsAiAnalyzing(true);
              try {
                const combinedNotes = textEntries.map((l) => l.note).join(". ") || "Feeling focused and balanced today.";
                const res = await analyzeMoodJournalAI(combinedNotes);
                setAiMoodAnalysis(res);
                toast.success("AI Mindfulness & Sentiment Analysis complete!");
              } catch (err) {
                console.error(err);
              } finally {
                setIsAiAnalyzing(false);
              }
            }}
            className="rounded-full bg-gradient-primary cursor-pointer text-xs"
          >
            <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiAnalyzing ? "animate-spin" : ""}`} />
            {isAiAnalyzing ? "Analyzing..." : "AI Mindfulness Coach"}
          </Button>
        }
      />

      {/* AI Sentiment Analysis Card */}
      {aiMoodAnalysis && (
        <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="text-sm font-bold text-foreground">AI Sentiment & Mindfulness Insights</h3>
            </div>
            <button onClick={() => setAiMoodAnalysis(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
            {aiMoodAnalysis}
          </div>
        </div>
      )}
      <div className="glass mb-6 rounded-2xl p-6">
        <p className="mb-3 text-sm text-muted-foreground">How are you feeling right now? Tap an emoji to check in.</p>
        <div className="flex flex-wrap gap-2">
          {emojis.map((m) => (
            <button
              key={m}
              onClick={() => handleCheckIn(m)}
              className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-2xl transition hover:scale-110 cursor-pointer hover:bg-muted"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Mood trend</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={displayChartData}>
                <defs>
                  <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 10]} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="mood" stroke="var(--color-chart-2)" fill="url(#mg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-3 text-sm font-semibold">AI patterns</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {patterns.map((p, idx) => (
              <li key={idx}>• {p}</li>
            ))}
          </ul>
        </section>
        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold">Recent check-ins</h2>
          {textEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent journal entries. Tap an emoji to check in!</p>
          ) : (
            <ul className="space-y-3">
              {textEntries.slice(0, 5).map((e) => {
                // Find matching emoji for the score
                const matchingEmoji =
                  Object.keys(scoreMap).find((k) => scoreMap[k] === Math.round(e.mood)) || "😊";
                return (
                  <li key={e.id} className="flex items-start gap-4 rounded-xl border border-border/50 p-4">
                    <span className="text-3xl">{matchingEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{e.date || "Logged"}</p>
                      <p className="text-sm">{e.note}</p>
                      {e.tags && e.tags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {e.tags.map((t) => (
                            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}