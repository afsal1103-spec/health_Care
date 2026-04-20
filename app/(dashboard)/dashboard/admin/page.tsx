"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Stethoscope,
  ShieldCheck,
  Activity,
  Building2,
  AlertCircle,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";
import { DiseaseHotspots } from "@/components/dashboard/DiseaseHotspots";

interface Stats {
  totalPatients: number;
  totalDoctors: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalDoctors: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const cachedStats = getCachedValue<Stats>("dashboard:admin:stats", 60_000);
    if (cachedStats) {
      setStats(cachedStats);
      setLoadingStats(false);
    }

    const fetchStats = async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch("/api/admin/patients?page=1&pageSize=1"),
          fetch("/api/admin/doctors?page=1&pageSize=1"),
        ]);

        const pJson = pRes.ok ? await pRes.json() : { total: 0 };
        const dJson = dRes.ok ? await dRes.json() : { total: 0 };

        const nextStats = {
          totalPatients: pJson.total ?? 0,
          totalDoctors: dJson.total ?? 0,
        };
        setStats(nextStats);
        setCachedValue("dashboard:admin:stats", nextStats);
      } catch {}

      setLoadingStats(false);
    };

    fetchStats();
  }, []);

  const adminName =
    session?.user?.roleDetails?.name ||
    session?.user?.email ||
    "Super Admin";

  return (
    <div className="space-y-10" ref={containerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Admin <span className="text-blue-600">Console</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Infrastructure & Control Center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-slate-900 text-white border-none px-4 py-2 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-slate-200">
            Super Administrator
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Telemedicine Metric Cards for Admin */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
              <Users className="h-6 w-6" />
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Global</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Patients</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{loadingStats ? "..." : stats.totalPatients}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
              <Stethoscope className="h-6 w-6" />
            </div>
            <Badge className="bg-green-50 text-green-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Verified</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Doctors</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{loadingStats ? "..." : stats.totalDoctors}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500">
              <Activity className="h-6 w-6" />
            </div>
            <Badge className="bg-purple-50 text-purple-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Live</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Status</p>
          <h3 className="text-2xl font-black text-green-600 tracking-tight uppercase">Online</h3>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-[2rem] shadow-xl relative overflow-hidden group dashboard-card">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <ShieldCheck className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security</p>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Secure</h3>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <DiseaseHotspots />
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden dashboard-card">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" /> Master Management
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: 'Patients Database', desc: 'Manage patient records and access', icon: Users, color: 'blue', href: '/dashboard/admin/patients', btn: 'Open Records' },
                { label: 'Doctors Verification', desc: 'Approve and verify specialist accounts', icon: Stethoscope, color: 'green', href: '/dashboard/admin/doctors', btn: 'Manage Doctors' },
                { label: 'Medicalist Verification', desc: 'Approve and verify pharmacy operators', icon: ShieldCheck, color: 'blue', href: '/dashboard/admin/medicalists', btn: 'Verify Medicalists' },
                { label: 'Medical Network', desc: 'Configure pharmacy and store locations', icon: Building2, color: 'purple', href: '/dashboard/admin/medicals', btn: 'Configure Stores' },
                { label: 'Verify Payments', desc: 'Review manual UPI payments and UTRs', icon: IndianRupee, color: 'orange', href: '/dashboard/admin/transactions', btn: 'Verify Now' }
              ].map((m, i) => (
                <div key={i} className="p-8 grid grid-cols-[1fr_auto] items-center hover:bg-slate-50/50 transition-all group">
                  <div className="grid grid-cols-[56px_1fr] items-center gap-5 min-w-0">
                    <div className={`h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-all border border-slate-100 shadow-sm`}>
                      <m.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-base tracking-tight uppercase">{m.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.desc}</p>
                    </div>
                  </div>
                  <Button asChild variant={i === 0 ? "default" : "outline"} className={`h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    i === 0 ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 text-white" : "border-slate-100 text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm"
                  }`}>
                    <Link href={m.href}>{m.btn}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="bg-[#1E293B] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl dashboard-card">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
              <Activity className="h-40 w-40 text-blue-400" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8">
                <AlertCircle className="h-5 w-5 text-blue-400" /> System Alerts
              </h3>
              <div className="space-y-6">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <div>
                    <p className="text-sm font-bold leading-relaxed text-slate-200">Backup synchronization completed</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Today at 04:00 AM</p>
                  </div>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <div>
                    <p className="text-sm font-bold leading-relaxed text-slate-200">New practitioner verification pending</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">2 Pending Approvals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm dashboard-card">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-8 text-center uppercase tracking-widest">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Add New Patient', icon: Users, color: 'blue' },
                { label: 'Verify Doctor', icon: Stethoscope, color: 'green' },
                { label: 'View Reports', icon: Activity, color: 'purple' }
              ].map((item, i) => (
                <Button 
                  key={i} 
                  variant="outline"
                  className="group flex items-center justify-between h-14 p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-sm`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
