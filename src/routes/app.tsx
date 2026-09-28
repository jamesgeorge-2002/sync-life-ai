import { Outlet, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-provider";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/db";

import { RAGChatbotWidget } from "@/components/rag-chatbot-widget";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, twoFactorAuthenticated } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth/login" });
    }
  }, [user, loading, nav]);

  useEffect(() => {
    const check2FA = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        if (p?.twoFactorEnabled && !twoFactorAuthenticated) {
          nav({ to: "/auth/verify-otp" });
        }
      } catch (err) {
        console.error("Error checking 2FA state", err);
      } finally {
        setProfileLoading(false);
      }
    };
    if (user && !loading) {
      check2FA();
    } else if (!user && !loading) {
      setProfileLoading(false);
    }
  }, [user, loading, twoFactorAuthenticated, nav]);

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile?.twoFactorEnabled && !twoFactorAuthenticated)) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl sm:px-6">
            <SidebarTrigger />
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search across your life…" className="pl-9 h-9 rounded-full bg-muted/50 border-0" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/app/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 hover:bg-accent/10">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </main>
        </div>
        <RAGChatbotWidget />
      </div>
    </SidebarProvider>
  );
}