import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  Calendar,
  ListTodo,
  StickyNote,
  GraduationCap,
  FolderOpen,
  Wallet,
  Heart,
  Smile,
  Repeat,
  Target,
  BookOpen,
  Plane,
  ShoppingBag,
  Users,
  BarChart3,
  FileText,
  Bell,
  Crown,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/db";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const groups: {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/app", icon: LayoutDashboard },
      { title: "RAG AI Chatbot", url: "/app/assistant", icon: Bot },
    ],
  },
  {
    label: "Productivity",
    items: [
      { title: "Calendar", url: "/app/calendar", icon: Calendar },
      { title: "Tasks", url: "/app/tasks", icon: ListTodo },
      { title: "Notes", url: "/app/notes", icon: StickyNote },
      { title: "Study Hub", url: "/app/study", icon: GraduationCap },
      { title: "Documents", url: "/app/documents", icon: FolderOpen },
    ],
  },
  {
    label: "Life",
    items: [
      { title: "Finance & Wealth", url: "/app/expenses", icon: Wallet },
      { title: "Health Hub", url: "/app/health", icon: Heart },
      { title: "Mood Journal", url: "/app/mood", icon: Smile },
      { title: "Habits", url: "/app/habits", icon: Repeat },
      { title: "Goals", url: "/app/goals", icon: Target },
    ],
  },
  {
    label: "More",
    items: [
      { title: "Knowledge", url: "/app/knowledge", icon: BookOpen },
      { title: "Travel", url: "/app/travel", icon: Plane },
      { title: "Shopping", url: "/app/shopping", icon: ShoppingBag },
      { title: "Contacts", url: "/app/contacts", icon: Users },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
      { title: "Reports", url: "/app/reports", icon: FileText },
      { title: "Notifications", url: "/app/notifications", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Premium", url: "/app/premium", icon: Crown },
      { title: "Settings", url: "/app/settings", icon: Settings },
      { title: "Admin", url: "/app/admin", icon: Shield },
    ],
  },
];

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/app" ? pathname === "/app" : pathname.startsWith(url);
  const { user: authUser, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;
      try {
        const data = await getUserProfile(authUser.uid);
        if (data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile in sidebar", err);
      }
    };
    fetchProfile();
  }, [authUser]);

  const userRole = profile?.role || "user";
  const userPlan = profile?.tier || "Free";

  const displayUser = authUser
    ? {
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        email: authUser.email || "",
        avatar: authUser.displayName
          ? authUser.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : authUser.email
            ? authUser.email[0].toUpperCase()
            : "U",
        plan: userPlan,
      }
    : {
        name: "Guest User",
        email: "guest@lifesync.ai",
        avatar: "G",
        plan: "Free",
      };

  // Filter groups dynamically based on role and plan
  const filteredGroups = groups.map((g) => {
    let items = g.items;

    // Filter Admin out for non-admin users
    if (g.label === "Account") {
      items = items.filter((item) => item.title !== "Admin" || userRole === "admin");
    }

    // Filter Analytics & Reports out for Free plan users
    if (g.label === "Insights") {
      items = items.filter(
        (item) => (item.title !== "Analytics" && item.title !== "Reports") || userPlan !== "Free"
      );
    }

    return { ...g, items };
  }).filter(g => g.items.length > 0);

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight">LIFE-SYNC AI</p>
              <p className="truncate text-[10px] text-muted-foreground">{userPlan} workspace</p>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto flex-1 min-h-0">
        {filteredGroups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-left outline-none cursor-pointer">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {displayUser.avatar}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{displayUser.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{displayUser.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings" className="flex items-center gap-2 w-full cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
