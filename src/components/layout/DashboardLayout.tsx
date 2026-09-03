import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { Role } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  candidate: [
    { label: "Dashboard", to: "/candidate/dashboard", icon: LayoutDashboard },
    { label: "Practice", to: "/candidate/mock-interview", icon: Sparkles },
    { label: "Interviews", to: "/candidate/interviews", icon: CalendarDays },
    { label: "Assessments", to: "/candidate/assessments", icon: ListChecks },
    { label: "Results", to: "/candidate/results", icon: BarChart3 },
    { label: "Profile", to: "/candidate/profile", icon: User },
  ],
  interviewer: [
    { label: "Dashboard", to: "/interviewer/dashboard", icon: LayoutDashboard },
    { label: "Interviews", to: "/interviewer/interviews", icon: CalendarDays },
    { label: "Candidates", to: "/interviewer/candidates", icon: Users },
    { label: "Question Bank", to: "/interviewer/questions", icon: MessageSquareText },
    { label: "MCQ Bank", to: "/interviewer/mcqs", icon: ListChecks },
    { label: "Reports", to: "/interviewer/reports", icon: BarChart3 },
    { label: "Settings", to: "/interviewer/settings", icon: Settings },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Interviews", to: "/admin/interviews", icon: CalendarDays },
    { label: "Questions", to: "/admin/questions", icon: MessageSquareText },
    { label: "Assessments", to: "/admin/mcqs", icon: ListChecks },
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
    { label: "Settings", to: "/admin/settings", icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  candidate: "Candidate",
  interviewer: "Interviewer",
  admin: "Administrator",
};

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 px-4 py-5">
      <p className="eyebrow mb-3 px-1 text-sidebar-muted">Index</p>
      <div className="space-y-0.5">
        {items.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 border-l-2 py-2 pl-3 pr-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-primary bg-primary/[0.08] text-primary"
                  : "border-transparent text-sidebar-foreground hover:border-foreground/30 hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "score-mono w-5 text-[11px] font-medium",
                    isActive ? "text-primary" : "text-sidebar-muted",
                  )}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.label}
                <item.icon
                  className={cn(
                    "ml-auto h-4 w-4",
                    isActive ? "text-primary" : "text-sidebar-muted opacity-0 transition-opacity group-hover:opacity-100",
                  )}
                  aria-hidden="true"
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function DashboardLayout() {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = role ? NAV_BY_ROLE[role] : [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b-2 border-foreground/80 px-5">
        <Link to="/" aria-label="Testify home">
          <Logo />
        </Link>
      </div>
      <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-md border-[1.5px] border-foreground/20">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="rounded-none">{initials(profile?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{profile?.full_name || "User"}</p>
            <p className="eyebrow mt-0.5 truncate text-[10px] text-sidebar-muted">{role ? ROLE_LABEL[role] : ""}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r-[1.5px] border-foreground/15 bg-sidebar lg:block">
        {sidebarInner}
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b-[1.5px] border-foreground/15 bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarInner}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Link to="/" aria-label="Testify home">
              <Logo iconClassName="h-7 w-7" showWordmark={false} />
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {role && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {ROLE_LABEL[role]}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{initials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium text-foreground">{profile?.full_name}</p>
                  <p className="truncate text-xs">{profile?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "candidate" && (
                  <DropdownMenuItem onClick={() => navigate("/candidate/profile")}>
                    <User />
                    Profile
                  </DropdownMenuItem>
                )}
                {role === "interviewer" && (
                  <DropdownMenuItem onClick={() => navigate("/interviewer/settings")}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                )}
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSignOut()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
