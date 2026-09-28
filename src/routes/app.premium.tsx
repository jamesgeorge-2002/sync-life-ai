import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserProfile, updateUserProfile, UserProfile } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/app/premium")({ component: PremiumPage });

const plans = [
  { name: "Free", price: "₹0", features: ["Basic tasks, notes & calendar", "Local tracking & habits", "No AI or RAG access (Pro required)", "1 GB vault storage"], featured: false },
  { name: "Pro", price: "₹999", featured: true, features: ["Full RAG Chatbot & Document Search", "All Domain AI Assistants (Travel, Health, Finance, Study, Goals, etc.)", "AI Morning Briefing & Schedule Optimizer", "50 GB encrypted vault", "Priority Gemini 1.5/2.0 API routing"] },
  { name: "Team", price: "₹2499", features: ["Everything in Pro", "Shared workspaces & collaboration", "Multi-user RAG document index", "Admin management & SSO", "Dedicated high-speed API access"], featured: false },
];

function PremiumPage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;
      try {
        const data = await getUserProfile(authUser.uid);
        if (data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [authUser]);

  const handleChoosePlan = async (planName: string) => {
    if (!authUser) return;
    try {
      await updateUserProfile(authUser.uid, { tier: planName });
      setProfile((prev) => prev ? { ...prev, tier: planName } : null);
      toast.success(`Plan updated to ${planName} successfully!`);
    } catch (err) {
      console.error("Failed to update plan", err);
      toast.error("Failed to update plan. Please try again.");
    }
  };

  const currentPlan = profile?.tier || "Free";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Premium" description="Unlock the full power of LIFE-SYNC AI." icon={<Crown className="h-5 w-5" />} />
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = currentPlan.toLowerCase() === p.name.toLowerCase();
          return (
            <div key={p.name} className={"glass rounded-2xl p-6 relative flex flex-col justify-between " + (p.featured ? "ring-2 ring-primary shadow-glow" : "")}>
              {isCurrent && (
                <span className="absolute top-3 right-3 bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Current Plan
                </span>
              )}
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-primary">
                  {p.price}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button 
                onClick={() => handleChoosePlan(p.name)}
                disabled={isCurrent || loading}
                className={"mt-6 w-full rounded-full " + (p.featured && !isCurrent ? "bg-gradient-primary text-white" : "")} 
                variant={isCurrent ? "outline" : p.featured ? "default" : "outline"}
              >
                {isCurrent ? "Current Plan" : `Choose ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}