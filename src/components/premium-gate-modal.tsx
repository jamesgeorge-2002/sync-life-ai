import React, { useState } from "react";
import { Crown, Sparkles, Check, X, ArrowRight, ShieldCheck, Zap, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/db";
import { toast } from "sonner";

interface PremiumGateModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  featureName?: string;
  onUpgraded?: () => void;
}

export function PremiumGateModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  featureName = "AI & RAG Intelligence Engine",
  onUpgraded,
}: PremiumGateModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  const isModalOpen = open !== undefined ? open : (isOpen ?? false);
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  if (!isModalOpen) return null;

  const handleOneClickUpgrade = async () => {
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    setUpgrading(true);
    try {
      await updateUserProfile(user.uid, { tier: "Pro" });
      toast.success("🎉 Upgraded to Pro successfully! All AI & RAG features are now unlocked.");
      handleClose();
      if (onUpgraded) {
        onUpgraded();
      }
    } catch (err) {
      console.error("Failed to upgrade tier", err);
      toast.error("Failed to upgrade. Please check your connection.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-background via-background/95 to-background p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Ambient Glow */}
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 text-black shadow-lg shadow-amber-500/30">
            <Crown className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-extrabold text-amber-500">
              <Sparkles className="h-3 w-3" /> Premium Feature
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Unlock {featureName}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              RAG neural document synthesis and deep AI assistants are exclusive to LIFE-SYNC Pro & Team subscribers.
            </p>
          </div>
        </div>

        {/* Features list */}
        <div className="my-5 rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5 text-xs">
          {[
            "Unlimited RAG Document Q&A and semantic knowledge retrieval",
            "Specialized domain AI engines (Health, Finance, Study, Tasks)",
            "Automatic life-action dispatch across apps",
            "50 GB secure encrypted vault & priority neural processing",
          ].map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="text-muted-foreground font-medium">{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Button
            onClick={handleOneClickUpgrade}
            disabled={upgrading}
            className="w-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 py-2.5 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:shadow-amber-500/30 cursor-pointer h-11 text-sm"
          >
            <Crown className="mr-2 h-4 w-4" />
            {upgrading ? "Upgrading Account..." : "Upgrade to Pro (₹999/mo) — Instant Unlock"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              handleClose();
              navigate({ to: "/app/premium" });
            }}
            className="w-full rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            View all plans and comparison <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Embedded Premium Lock Card for full-page or section locks
 */
export function PremiumLockCard({
  featureName = "RAG AI Assistant",
  onUpgraded,
}: {
  featureName?: string;
  onUpgraded?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  const handleOneClickUpgrade = async () => {
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    setUpgrading(true);
    try {
      await updateUserProfile(user.uid, { tier: "Pro" });
      toast.success("🎉 Upgraded to Pro successfully! All AI & RAG features are now unlocked.");
      if (onUpgraded) {
        onUpgraded();
      }
    } catch (err) {
      console.error("Failed to upgrade tier", err);
      toast.error("Failed to upgrade. Please check your connection.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-background p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 text-black shadow-xl shadow-amber-500/30">
        <Crown className="h-8 w-8 animate-pulse" />
      </div>

      <div className="mt-4 space-y-2 max-w-md mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-500">
          <Sparkles className="h-3.5 w-3.5" /> Premium Subscription Required
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Unlock {featureName}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          You are currently on the <strong>Free Plan</strong>. Upgrade to <strong>LIFE-SYNC Pro</strong> to access real-time neural RAG document Q&A, automatic action dispatchers, and domain AI intelligence.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleOneClickUpgrade}
          disabled={upgrading}
          className="rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-6 py-2.5 font-bold text-black shadow-lg transition-all hover:scale-105 hover:shadow-amber-500/30 cursor-pointer h-10 text-xs"
        >
          <Crown className="mr-1.5 h-4 w-4" />
          {upgrading ? "Upgrading..." : "Upgrade to Pro (₹999/mo)"}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/app/premium" })}
          className="rounded-full text-xs cursor-pointer h-10 px-5"
        >
          Explore All Plans
        </Button>
      </div>
    </div>
  );
}
