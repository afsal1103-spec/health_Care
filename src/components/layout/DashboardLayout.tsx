"use client";

import type { UserType } from "@/types";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hasPageAccess, getMenuItems } from "@/lib/ui-manager";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  FileText,
  CreditCard,
  Stethoscope,
  Users,
  History,
  Search,
  CalendarCheck,
  Pill,
  LogOut,
  Menu,
  Building2,
  MapPin,
  ShieldCheck,
  IndianRupee,
  User,
  Settings,
  LucideIcon,
  MessageCircle,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  FileText,
  CreditCard,
  Stethoscope,
  Users,
  History,
  Search,
  CalendarCheck,
  Pill,
  Building2,
  MapPin,
  ShieldCheck,
  IndianRupee,
  User,
  Settings,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatItems, setChatItems] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Ask me anything for your current sector workflow." },
  ]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (session?.user?.userType) {
      const type = session.user.userType as UserType;
      if (!hasPageAccess(pathname, type)) {
        router.replace(`/dashboard/${type}`);
      }
    }
  }, [session, status, pathname, router]);

  useEffect(() => {
    const storageKey = session?.user?.id
      ? `healthcare-profile-image:${session.user.id}`
      : null;

    const setAvatarFromStorage = () => {
      const raw = storageKey ? localStorage.getItem(storageKey) : null;
      setAvatarUrl(raw || session?.user?.roleDetails?.profileImage || null);
    };

    const syncAvatarFromBackend = async () => {
      if (!storageKey) return;
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.profileImage) {
          localStorage.setItem(storageKey, data.profileImage);
          setAvatarUrl(data.profileImage);
        } else {
          localStorage.removeItem(storageKey);
          setAvatarUrl(null);
        }
      } catch {
        // Ignore sync failures; local cache remains usable.
      }
    };

    localStorage.removeItem("healthcare-profile-image");
    setAvatarFromStorage();
    syncAvatarFromBackend();
    window.addEventListener("storage", setAvatarFromStorage);
    window.addEventListener("profile-image-updated", setAvatarFromStorage);
    return () => {
      window.removeEventListener("storage", setAvatarFromStorage);
      window.removeEventListener("profile-image-updated", setAvatarFromStorage);
    };
  }, [session?.user?.id, session?.user?.roleDetails?.profileImage]);

  useEffect(() => {
    const applyFastMode = () => {
      const existing = localStorage.getItem("fast-mode");
      const fastMode = existing === null ? true : existing === "true";
      if (existing === null) {
        localStorage.setItem("fast-mode", "true");
      }
      document.documentElement.classList.toggle("fast-ui", fastMode);
    };

    applyFastMode();
    window.addEventListener("storage", applyFastMode);
    window.addEventListener("fast-mode-updated", applyFastMode);
    return () => {
      window.removeEventListener("storage", applyFastMode);
      window.removeEventListener("fast-mode-updated", applyFastMode);
    };
  }, []);

  const userType = session?.user?.userType as UserType | undefined;
  const menuItems = useMemo(() => {
    return userType ? getMenuItems(userType) : [];
  }, [userType]);

  useEffect(() => {
    if (status !== "authenticated") return;
    menuItems.forEach((item) => router.prefetch(item.path));
    router.prefetch("/dashboard/profile");
    router.prefetch("/dashboard/settings");
  }, [menuItems, router, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !userType) return null;

  const userName =
    session.user.roleDetails?.name || session.user.email || "User";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const goTo = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  const sendSectorChat = async () => {
    const message = chatInput.trim();
    if (!message || !userType || chatLoading) return;
    setChatItems((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/patient-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sector: userType }),
      });
      const json = await res.json();
      const text = json?.data?.reply || json?.error || "No response from AI.";
      setChatItems((prev) => [...prev, { role: "ai", text }]);
    } catch {
      setChatItems((prev) => [...prev, { role: "ai", text: "Failed to connect AI service." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background dark:bg-slate-950 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-600 transition-colors duration-300">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-card dark:bg-slate-900 border-r border-border transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-foreground tracking-tighter leading-none">
                  Telemedicine
                </h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  Medical Portal
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  prefetch
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-sm shadow-blue-50"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span
                    className={`text-sm tracking-tight ${
                      isActive ? "font-black" : "font-semibold"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto">
            <div className="p-4 bg-muted/30 dark:bg-slate-800/50 rounded-2xl border border-border flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={userName} />
                      ) : null}
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-black">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => goTo("/dashboard/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => goTo("/dashboard/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Common Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground truncate">{userName}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                  Verified Profile
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-background dark:hover:bg-slate-700 rounded-lg text-muted-foreground hover:text-red-500 transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-background dark:bg-slate-950 relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.10), transparent 45%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.10), transparent 40%), linear-gradient(180deg, var(--background), var(--background))",
          }}
        />

        <header className="h-20 flex items-center px-6 lg:px-10 shrink-0 sticky top-0 z-40 bg-background/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-border">
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-card border border-border shadow-sm"
            >
              <Menu className="h-6 w-6 text-muted-foreground" />
            </button>

            <div className="hidden lg:flex items-center gap-8">
              <div>
                <h2 className="text-sm font-black text-foreground tracking-tight">
                  Dashboard Overview
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  System Live
                </p>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="flex items-center gap-4 text-muted-foreground">
                <button className="p-2 hover:bg-card rounded-xl transition-all hover:text-blue-600 hover:shadow-sm">
                  <Search className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-card rounded-xl transition-all hover:text-blue-600 hover:shadow-sm">
                  <History className="h-5 w-5" />
                </button>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-card/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none">
                      Active User
                    </p>
                    <p className="text-sm font-black text-foreground mt-1 truncate max-w-[180px]">
                      {userName}
                    </p>
                  </div>
                  <Avatar className="h-10 w-10 border-2 border-background shadow-md ring-1 ring-border">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={userName} />
                    ) : null}
                    <AvatarFallback className="bg-slate-900 text-white font-black text-xs">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => goTo("/dashboard/profile")}>
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/dashboard/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Common Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
          <div className="max-w-[1400px] mx-auto w-full py-4">{children}</div>
        </main>

        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {chatOpen && (
            <div className="w-[360px] max-w-[90vw] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black">AI Sector Chat</p>
                  <Badge variant="outline" className="text-[10px] uppercase">{userType}</Badge>
                </div>
                <button className="p-1 rounded hover:bg-muted" onClick={() => setChatOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-64 overflow-y-auto p-3 space-y-2 bg-muted/20">
                {chatItems.map((m, i) => (
                  <div key={i} className={`text-sm p-2 rounded-xl ${m.role === "user" ? "bg-blue-600 text-white ml-8" : "bg-background border border-border mr-8"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-3 space-y-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask sector-specific workflow, risks, guidance..."
                  className="min-h-[72px]"
                />
                <Button className="w-full" onClick={sendSectorChat} disabled={chatLoading}>
                  {chatLoading ? "Thinking..." : "Send"}
                </Button>
              </div>
            </div>
          )}
          <button
            className="h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
            onClick={() => setChatOpen((v) => !v)}
            aria-label="Toggle AI sector chat"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
