"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings, Moon, Sun, Gauge, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommonSettingsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("theme") === "dark" : false,
  );
  const [compactMode, setCompactMode] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("compact-mode") === "true" : false,
  );
  const [fastMode, setFastMode] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("fast-mode") === "true" : false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("fast-ui", fastMode);
  }, [fastMode]);

  const onThemeChange = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const onCompactChange = (checked: boolean) => {
    setCompactMode(checked);
    localStorage.setItem("compact-mode", checked ? "true" : "false");
  };

  const onFastModeChange = (checked: boolean) => {
    setFastMode(checked);
    localStorage.setItem("fast-mode", checked ? "true" : "false");
    document.documentElement.classList.toggle("fast-ui", checked);
    window.dispatchEvent(new Event("fast-mode-updated"));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 transition-colors duration-300">
      <div
        className="rounded-3xl p-8 border border-emerald-100 dark:border-emerald-900/30"
        style={{
          backgroundImage: darkMode 
            ? "linear-gradient(120deg, rgba(6,78,59,0.95), rgba(15,23,42,0.9)), url('https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1600&q=60')"
            : "linear-gradient(120deg, rgba(236,253,245,0.95), rgba(255,255,255,0.9)), url('https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1600&q=60')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
          <Settings className="h-10 w-10 text-emerald-600" /> Common Settings
        </h1>
        <p className="text-muted-foreground text-lg mt-2 font-medium">Tune app behavior for comfort and performance.</p>
      </div>

      <Card className="border border-border shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b p-8">
          <CardTitle className="text-2xl font-black text-foreground">Experience Controls</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Changes are saved locally and applied instantly.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[2rem] border border-border hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-2xl transition-all duration-500 ${darkMode ? "bg-slate-800 text-yellow-400 rotate-[360deg]" : "bg-blue-100 text-blue-600"}`}>
                {darkMode ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
              </div>
              <div>
                <p className="font-black text-foreground tracking-tight">Dark Mode</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Global Visual Theme</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={onThemeChange} className="data-[state=checked]:bg-blue-600" />
          </div>

          <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[2rem] border border-border hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 transition-all duration-500">
                <Gauge className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-foreground tracking-tight">Compact Mode</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">High Density Interface</p>
              </div>
            </div>
            <Switch checked={compactMode} onCheckedChange={onCompactChange} className="data-[state=checked]:bg-emerald-600" />
          </div>

          <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[2rem] border border-border hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-all duration-500">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-foreground tracking-tight">Fast Navigation Mode</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Turbo Performance Optimization</p>
              </div>
            </div>
            <Switch checked={fastMode} onCheckedChange={onFastModeChange} className="data-[state=checked]:bg-orange-600" />
          </div>

          <Button
            onClick={() => router.push("/dashboard/profile")}
            className="w-full h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 dark:shadow-none transition-all mt-4 group"
          >
            <User className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
            Open Profile Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
