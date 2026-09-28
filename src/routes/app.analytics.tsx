import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/page-header";
import { BarChart3, TrendingUp, Zap, Heart, Brain } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserProfile, getProductivityLogs, UserProfile, ProductivityLog } from "@/lib/db";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prodLogs, setProdLogs] = useState<ProductivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!authUser) return;
      try {
        const [userProfile, logs] = await Promise.all([
          getUserProfile(authUser.uid),
          getProductivityLogs(authUser.uid),
        ]);
        setProfile(userProfile);
        setProdLogs(logs);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [authUser]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing analytics metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Life Analytics"
        description="Predictive insights across every area of your life."
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Life score" value={profile?.lifeScore ?? 0} delta={profile?.lifeScore ? "Computed score" : "No activity recorded"} tone="up" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Focus/day" value={`${profile?.focusHours ?? 0}h`} delta={profile?.focusHours ? "Recorded focus time" : "No focus logs"} tone="up" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Wellness" value={profile?.wellnessScore ?? 0} delta={profile?.wellnessScore ? "Wellness score" : "No vitals logged"} icon={<Heart className="h-4 w-4" />} />
        <StatCard label="AI actions" value={profile?.aiActionsCount ?? 0} delta="This month logs" icon={<Brain className="h-4 w-4" />} />
      </div>
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold">Productivity trend</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prodLogs}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="score" stroke="var(--color-chart-1)" fill="url(#ag)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}