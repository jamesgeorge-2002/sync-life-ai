import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/page-header";
import { Shield, Users, DollarSign, Activity } from "lucide-react";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

const rows = [
  { u:"maya@r.com", plan:"Pro", status:"Active", joined:"Jan 2025" },
  { u:"devon@p.co", plan:"Team", status:"Active", joined:"Mar 2025" },
  { u:"chika@o.com", plan:"Free", status:"Trial", joined:"Nov 2025" },
  { u:"alex@k.dev", plan:"Pro", status:"Suspended", joined:"Feb 2025" },
];

function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Admin" description="System overview and user management." icon={<Shield className="h-5 w-5" />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Users" value="12,847" delta="+248 this week" tone="up" icon={<Users className="h-4 w-4" />} />
        <StatCard label="MRR" value="$84.2k" delta="+12%" tone="up" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Uptime" value="99.98%" delta="30d" tone="up" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="AI calls" value="1.4M" delta="+18% MoM" tone="up" />
      </div>
      <div className="glass rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr></thead>
          <tbody>{rows.map((u,i)=>(<tr key={i} className="border-t border-border/50"><td className="p-3 font-medium">{u.u}</td><td className="p-3">{u.plan}</td><td className="p-3"><span className={"rounded-full px-2 py-0.5 text-xs " + (u.status==="Active"?"bg-emerald-500/10 text-emerald-600":u.status==="Trial"?"bg-amber-500/10 text-amber-600":"bg-rose-500/10 text-rose-500")}>{u.status}</span></td><td className="p-3 text-muted-foreground">{u.joined}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}