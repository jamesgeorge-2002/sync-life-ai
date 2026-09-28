import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { FileText, Download, Trash, Plus, Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getReports, addReport, deleteReport, Report, addNote, addTask, addMeeting } from "@/lib/db";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReports = async () => {
    if (!authUser) return;
    try {
      const list = await getReports(authUser.uid);
      setReports(list);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [authUser]);

  const handleGenerateReport = async () => {
    if (!authUser) return;
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }
    setIsGenerating(true);
    try {
      const reportTitle = `AI Productivity Audit — ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
      await addReport(authUser.uid, {
        title: reportTitle,
        date: "Just now",
        type: "Productivity & Health Audit",
      });
      fetchReports();
      toast.success("AI Executive Report generated & saved to database!");
    } catch (err) {
      console.error("Failed to generate report", err);
      toast.error("Failed to save report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteReport(authUser.uid, id);
      fetchReports();
      toast.success("Report deleted");
    } catch (err) {
      console.error("Failed to delete report", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="AI Productivity Audit & Executive Summaries"
        onUpgraded={fetchReports}
      />
      <PageHeader
        title="Reports"
        description="AI-generated summaries of your progress."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button
            disabled={isGenerating}
            onClick={handleGenerateReport}
            className="rounded-full bg-gradient-primary cursor-pointer text-xs"
          >
            <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Generate AI Report"}
          </Button>
        }
      />
      {reports.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm border border-white/5 space-y-3">
          <p>No reports found.</p>
          <Button onClick={handleGenerateReport} className="rounded-full bg-gradient-primary text-xs cursor-pointer">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Generate First Report
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="glass flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 relative group border border-white/5 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.type} · {r.date}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-[11px] h-7 px-2.5 cursor-pointer bg-background/50 hover:bg-background"
                  onClick={async () => {
                    if (!authUser) return;
                    try {
                      await addNote(authUser.uid, {
                        title: `Report Summary: ${r.title}`,
                        content: `Executive Summary for ${r.title} (${r.type}).\n\nKey Takeaways:\n- Consistency score: 94%\n- Goal milestone tracking active.\n- Health & productivity synergy maintained.`,
                        tag: "Reports",
                        updated: "Just now",
                      });
                      toast.success("Saved report summary to Notes!");
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to save note.");
                    }
                  }}
                >
                  <FileText className="mr-1 h-3 w-3 text-primary" /> Save Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-[11px] h-7 px-2.5 cursor-pointer bg-background/50 hover:bg-background"
                  onClick={async () => {
                    if (!authUser) return;
                    try {
                      await addTask(authUser.uid, {
                        title: `Audit Action Item: ${r.title.slice(0, 30)}`,
                        time: "This Week",
                        priority: "High",
                        done: false,
                        list: "Reports",
                      });
                      toast.success("Added audit item to Tasks!");
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to add task.");
                    }
                  }}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" /> Add to Tasks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-[11px] h-7 px-2.5 cursor-pointer bg-background/50 hover:bg-background"
                  onClick={async () => {
                    if (!authUser) return;
                    try {
                      const now = new Date();
                      const jsDay = now.getDay();
                      const day = jsDay === 0 ? 6 : jsDay - 1;
                      await addMeeting(authUser.uid, {
                        title: `Report Review: ${r.title.slice(0, 25)}`,
                        day: day,
                        start: "16:00",
                        duration: "45m",
                        type: "meeting",
                        location: "Executive Review",
                      });
                      toast.success("Scheduled Report Review in Calendar!");
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to add calendar event.");
                    }
                  }}
                >
                  <Calendar className="mr-1 h-3 w-3 text-blue-500" /> Add to Calendar
                </Button>
                <button
                  onClick={() => handleDeleteReport(r.id)}
                  className="text-muted-foreground hover:text-red-500 cursor-pointer p-1.5 rounded-full hover:bg-muted ml-auto sm:ml-0"
                  title="Delete report"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}