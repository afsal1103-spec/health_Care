'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Stethoscope, History, Clock, CheckCircle, Activity, ChevronRight, GraduationCap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { getCachedValue, setCachedValue } from '@/lib/client-cache';

export default function DoctorDashboard() {
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    completedToday: 0
  });
  const [recentApts, setRecentApts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedStats = getCachedValue<typeof stats>("dashboard:doctor:stats", 60_000);
    const cachedRecent = getCachedValue<any[]>("dashboard:doctor:recent", 60_000);

    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
    }
    if (cachedRecent) {
      setRecentApts(cachedRecent);
    }

    const loadData = async () => {
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        if (Array.isArray(data)) {
          const today = new Date().toISOString().split('T')[0];
          const todayApts = data.filter(a => a.appointmentDate.split('T')[0] === today);

          const nextStats = {
            todayAppointments: todayApts.length,
            totalPatients: new Set(data.map((a: any) => a.patientId)).size,
            completedToday: todayApts.filter((a: any) => a.status === 'completed').length
          };
          const nextRecent = data.slice(0, 5);
          setStats(nextStats);
          setRecentApts(nextRecent);
          setCachedValue("dashboard:doctor:stats", nextStats);
          setCachedValue("dashboard:doctor:recent", nextRecent);
        }
      } catch (error) {
        console.error("Doctor dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const d = session?.user?.roleDetails;

  return (
    <div className="space-y-10" ref={containerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Welcome, Dr. {d?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            {d?.specialist} • {d?.education}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-100 shadow-sm font-black text-xs rounded-xl px-5 h-12 transition-all">
            Schedule Overview
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 font-black text-xs rounded-xl px-5 h-12 transition-all group">
            Consultations Queue <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Telemedicine Metric Cards for Doctor */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
              <Calendar className="h-6 w-6" />
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Today</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Appointments</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.todayAppointments}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
              <Users className="h-6 w-6" />
            </div>
            <Badge className="bg-green-50 text-green-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Verified</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Patients</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalPatients}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
              <CheckCircle className="h-6 w-6" />
            </div>
            <Badge className="bg-orange-50 text-orange-500 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Completed</Badge>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions Today</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.completedToday}</h3>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-[2rem] shadow-xl relative overflow-hidden group dashboard-card">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Activity className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md">
              <Activity className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Rate</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">98%</h3>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden dashboard-card">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" /> Upcoming Queue
              </h3>
              <Button variant="ghost" className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50" asChild>
                <Link href="/dashboard/doctor/appointments">Full Schedule</Link>
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Patients...</p>
                </div>
              ) : recentApts.length === 0 ? (
                <div className="p-24 text-center text-slate-400">
                  <p className="font-black text-[10px] uppercase tracking-widest">Queue is clear</p>
                </div>
              ) : (
                recentApts.map((a, i) => (
                  <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden text-slate-400 font-black text-xs">
                        {a.patientName?.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{a.patientName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{a.appointmentTime} • {a.status}</p>
                      </div>
                    </div>
                    <Button asChild className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
                      <Link href={`/dashboard/doctor/consultation?appointmentId=${a.id}`}>Start Session</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="bg-[#1E293B] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl dashboard-card">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
              <Stethoscope className="h-40 w-40 text-blue-400" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8">
                <ShieldCheck className="h-5 w-5 text-blue-400" /> Daily Insight
              </h3>
              <div className="space-y-6">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Efficiency Tracker</p>
                  <p className="text-sm font-bold leading-relaxed text-slate-200">
                    Your average consultation time is <span className="text-blue-400 font-black uppercase">18 Minutes</span>. Optimal for your specialty.
                  </p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Peak Window</p>
                  <p className="text-sm font-bold leading-relaxed text-slate-200">
                    Most patient requests are currently coming between <span className="text-blue-400 font-black uppercase">10 AM - 1 PM</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm dashboard-card">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-8">Quick Tools</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Patient Database', icon: Users, color: 'blue', href: '/dashboard/doctor/patients' },
                { label: 'Clinical Records', icon: History, color: 'orange', href: '/dashboard/doctor/history' }
              ].map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href}
                  className="group flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-sm`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-black text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
