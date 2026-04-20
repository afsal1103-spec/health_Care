'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Clock, CreditCard, Activity, User, ShieldCheck, ClipboardList, TrendingUp, MapPin, History, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getCachedValue, setCachedValue } from '@/lib/client-cache';
import { MedicalMap } from "@/components/dashboard/MedicalMap";

export default function PatientDashboard() {
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedPatient = getCachedValue<any>("dashboard:patient:profile", 60_000);
    const cachedConsultations = getCachedValue<any[]>("dashboard:patient:consultations", 60_000);

    if (cachedPatient) {
      setPatientData(cachedPatient);
      setLoading(false);
    }
    if (cachedConsultations) {
      setConsultations(cachedConsultations);
    }

    const loadData = async () => {
      if (session?.user?.id) {
        try {
          const [pRes, cRes] = await Promise.all([
            fetch(`/api/patients/search?userId=${session.user.id}`),
            fetch(`/api/appointments`),
          ]);
          const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);

          if (pData.patient) {
            setPatientData(pData.patient);
            setCachedValue("dashboard:patient:profile", pData.patient);
          }
          const recent = Array.isArray(cData) ? cData.slice(0, 3) : [];
          setConsultations(recent);
          setCachedValue("dashboard:patient:consultations", recent);
        } catch (error) {
          console.error("Dashboard load error:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [session]);

  const p = patientData || session?.user?.roleDetails;

  const downloadReport = () => {
    if (!p) return;
    
    const reportContent = `
MEDICAL CONSULTATION REPORT
---------------------------
Telemedicine Health Portal

Patient Name: ${p.name}
Patient ID: ${p.patient_code || 'N/A'}
Diagnosis: ${p.diagnosis || 'General'}
Latest Symptoms: ${p.symptoms || 'None recorded'}
Current Medications: ${p.currentMedications || p.current_medications || 'None'}

Recent Consultations:
${consultations.map(c => `- ${new Date(c.appointmentDate).toLocaleDateString()}: Dr. ${c.doctorName} (${c.status})`).join('\n')}

Generated on: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Medical_Report_${p.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const [recoveryData, setRecoveryData] = useState<number[]>([45, 60, 55, 75, 65, 80, 70, 85, 90, 82, 95, 88]);
  const [recoveryInsights, setRecoveryInsights] = useState<{
    status: string;
    detail: string;
    trend: 'up' | 'down' | 'stable';
  }>({
    status: "Stable",
    detail: "Initial health assessment complete. Monitoring progress.",
    trend: 'stable'
  });

  useEffect(() => {
    // Refine recovery data based on diagnosis if available
    const patientDiagnosis = patientData?.diagnosis || session?.user?.roleDetails?.diagnosis || "";
    
    if (patientDiagnosis) {
      const diagnosisLower = patientDiagnosis.toLowerCase();
      if (diagnosisLower.includes("asthma") || diagnosisLower.includes("migraine")) {
        // Chronic/Fluctuating recovery
        setRecoveryData([40, 45, 42, 50, 48, 55, 52, 60, 58, 65, 62, 70]);
        setRecoveryInsights({
          status: "Gradual Management",
          detail: "Recovery is showing a fluctuating but upward trend. This is typical for chronic conditions where management is key.",
          trend: 'up'
        });
      } else if (diagnosisLower.includes("infection") || diagnosisLower.includes("flu") || diagnosisLower.includes("fever")) {
        // Fast recovery
        setRecoveryData([30, 50, 70, 90, 95, 98, 99, 100, 100, 100, 100, 100]);
        setRecoveryInsights({
          status: "Rapid Improvement",
          detail: "Vitals are returning to normal ranges quickly. Medication adherence is effectively combating the acute infection.",
          trend: 'up'
        });
      } else if (diagnosisLower.includes("diabetes") || diagnosisLower.includes("hypertension")) {
        setRecoveryData([85, 82, 88, 84, 86, 83, 89, 85, 87, 84, 88, 85]);
        setRecoveryInsights({
          status: "Maintenance Mode",
          detail: "Condition is well-controlled. Focus remains on lifestyle stability and consistent monitoring.",
          trend: 'stable'
        });
      } else {
        // Steady upward trend
        setRecoveryData([45, 60, 55, 75, 65, 80, 70, 85, 90, 82, 95, 88]);
        setRecoveryInsights({
          status: "Positive Progress",
          detail: "Consistent improvement across all health metrics. Your body is responding well to the current treatment plan.",
          trend: 'up'
        });
      }
    }
  }, [patientData, session]);

  return (
    <div className="space-y-10 transition-colors duration-300" ref={containerRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight leading-none">
            Hello, {p?.name?.split(' ')[0] || 'Patient'}
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Patient ID: {p?.patient_code || 'BIO-7721'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={downloadReport}
            className="bg-card hover:bg-muted/50 text-foreground border border-border shadow-sm font-black text-xs rounded-xl px-5 h-12 transition-all"
          >
            Download Reports
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 dark:shadow-none font-black text-xs rounded-xl px-5 h-12 transition-all group">
            <Link href="/dashboard/patient/book-appointment">
              Schedule Appointment <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Telemedicine Metric Cards */}
        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Active</Badge>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Diagnosis</p>
          <h3 className="text-xl font-black text-foreground tracking-tight truncate">{p?.diagnosis || 'General'}</h3>
        </div>

        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
              <Activity className="h-6 w-6" />
            </div>
            <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Monitoring</Badge>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Latest Symptoms</p>
          <h3 className="text-xl font-black text-foreground tracking-tight truncate">{p?.symptoms?.split(',')[0] || 'None'}</h3>
        </div>

        <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
              <FileText className="h-6 w-6" />
            </div>
            <Badge className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-none font-black text-[9px] uppercase tracking-widest px-2 py-1">Ongoing</Badge>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Medications</p>
          <h3 className="text-xl font-black text-foreground tracking-tight truncate">{(p?.currentMedications || p?.current_medications)?.split(',')[0] || 'None'}</h3>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group dashboard-card border border-white/5">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <ShieldCheck className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Health Score</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">94%</h3>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <MedicalMap />
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Recovery Analytics Chart Mock */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm dashboard-card">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-foreground tracking-tight">Recovery Analysis</h3>
                <p className="text-xs font-bold text-muted-foreground mt-1">{recoveryInsights.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border ${
                  recoveryInsights.trend === 'up' ? 'bg-green-50/50 text-green-600' : 
                  recoveryInsights.trend === 'down' ? 'bg-red-50/50 text-red-600' : 
                  'bg-blue-50/50 text-blue-600'
                }`}>
                  <TrendingUp className={`h-3 w-3 ${recoveryInsights.trend === 'down' ? 'rotate-180' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{recoveryInsights.status}</span>
                </div>
              </div>
            </div>
            <div className="h-64 w-full flex items-end justify-between gap-2 px-4">
              {recoveryData.map((h, i) => (
                <div key={i} className="flex-1 h-full group relative">
                  <div className="h-full w-full flex flex-col justify-end">
                    <div 
                      className={`w-full rounded-t-xl transition-all duration-700 cursor-pointer relative overflow-hidden ${
                        h > 80 ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 
                        h > 50 ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.2)]' : 
                        'bg-blue-200'
                      } group-hover:bg-blue-500 group-hover:scale-y-[1.02] origin-bottom`}
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {/* Tooltip on hover inside bar */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm">
                        {h}%
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[8px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">Week {i+1}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden dashboard-card">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" /> Recent Consultations
              </h3>
              <Button variant="ghost" className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20">
                View Archive
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">Synchronizing Records...</p>
                </div>
              ) : consultations.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">
                  <p className="font-black text-[10px] uppercase tracking-widest">No Recent Sessions</p>
                </div>
              ) : (
                consultations.map((c, i) => (
                  <div key={i} className="p-8 flex items-center justify-between hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-muted dark:bg-slate-800 border border-border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarFallback className="bg-muted dark:bg-slate-700 text-muted-foreground text-xs font-black uppercase">DR</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground tracking-tight">Dr. {c.doctorName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Video Consultation • {new Date(c.appointmentDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1.5`}>
                        {c.status}
                      </Badge>
                      <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-border text-muted-foreground hover:text-blue-600 hover:bg-card hover:shadow-sm">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl dashboard-card border border-white/5">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
              <ShieldCheck className="h-40 w-40 text-blue-400" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8 text-white">
                <ShieldCheck className="h-5 w-5 text-blue-400" /> Clinical Insight
              </h3>
              <div className="space-y-6">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Medication Status</p>
                  <p className="text-sm font-bold leading-relaxed text-slate-200">
                    Your <span className="text-white underline decoration-blue-500/50 underline-offset-4">{p?.diagnosis}</span> treatment is currently at <span className="text-blue-400">70% efficacy</span>. Maintain schedule.
                  </p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Next Milestone</p>
                  <p className="text-sm font-bold leading-relaxed text-slate-200">
                    Follow-up session in <span className="text-blue-400 underline decoration-blue-500/50 underline-offset-4">4 days</span> will verify recovery metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-sm dashboard-card">
            <h3 className="text-lg font-black text-foreground tracking-tight mb-8">Quick Access</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Find Doctors', icon: MapPin, color: 'blue', href: '/dashboard/patient/nearby-doctors' },
                { label: 'Prescriptions', icon: FileText, color: 'green', href: '/dashboard/patient/medicals' },
                { label: 'Medical History', icon: History, color: 'orange', href: '/dashboard/patient/history' }
              ].map((item, i) => (
                <Link 
                  key={i} 
                  href={item.href}
                  className="group flex items-center justify-between p-4 rounded-2xl border border-border hover:border-blue-100 dark:hover:border-blue-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 bg-muted dark:bg-slate-800 rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-card group-hover:text-blue-600 transition-all shadow-sm`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
