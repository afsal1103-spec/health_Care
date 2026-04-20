"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  User, 
  FileText, 
  Star,
  Activity,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  GraduationCap,
  MessageSquare,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";

function PatientConsultationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (appointmentId) {
      loadData();
    } else {
      router.push("/dashboard/patient/appointments");
    }
  }, [appointmentId]);

  // Camera Logic
  useEffect(() => {
    if (isVideoOn) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isVideoOn]);

  const startCamera = async () => {
    try {
      if (localStreamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: isMicOn 
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error("Camera already in use. Please close other tabs using the camera.");
      } else {
        toast.error("Could not access camera. Please check permissions.");
      }
      setIsVideoOn(false);
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?id=${appointmentId}`);
      const data = await res.json();
      if (res.ok && data.length > 0) {
        const apt = data[0];
        setAppointment(apt);
        setDoctor({
          name: apt.doctorName,
          specialist: apt.doctorSpecialist,
        });
      }
    } catch (error) {
      toast.error("Failed to load consultation data");
    } finally {
      setLoading(false);
    }
  };

  const leaveCall = () => {
    toast.success("Consultation ended");
    router.push("/dashboard/patient/appointments");
  };

  if (loading) return <div className="h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Video Consultation
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Connected with Dr. {doctor?.name}
          </p>
        </div>
        <Badge className="bg-green-50 text-green-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">
          Secure HD Session
        </Badge>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Video Grid - Less Congested */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Main Video (Doctor - Mocked) */}
            <div className="relative bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800 flex-1 group">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-black flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 animate-pulse">
                    <User className="h-12 w-12 text-blue-400" />
                  </div>
                  <p className="text-white font-black text-lg tracking-widest uppercase">Dr. {doctor?.name}</p>
                  <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-blue-500/50 px-3 py-1">SPECIALIST FEED</Badge>
                </div>
              </div>
              <div className="absolute top-6 left-6 z-10">
                <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-white font-mono px-3 py-1">00:12:45</Badge>
              </div>
            </div>

            {/* Self Preview (Patient - Real Video) */}
            <div className="relative bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800 flex-1 group">
              {isVideoOn ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
                  <VideoOff className="h-12 w-12 text-slate-600 mb-2" />
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Camera Off</p>
                </div>
              )}
              <div className="absolute bottom-6 left-6 z-10 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-[10px] text-white font-black uppercase tracking-widest">
                You (Patient)
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-4 py-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <Button 
              variant="secondary" 
              size="icon" 
              className={`h-14 w-14 rounded-2xl transition-all shadow-sm ${!isMicOn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setIsMicOn(!isMicOn)}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className={`h-14 w-14 rounded-2xl transition-all shadow-sm ${!isVideoOn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-16 w-16 rounded-2xl bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95"
              onClick={leaveCall}
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Side Info Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#1E293B] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl h-full border-none">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
              <ShieldCheck className="h-40 w-40 text-blue-400" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8">
                <ShieldCheck className="h-5 w-5 text-blue-400" /> Session Details
              </h3>
              
              <div className="space-y-6 flex-1">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Symptoms Reported</p>
                  <p className="text-sm font-bold leading-relaxed text-slate-200 italic">
                    "{appointment?.symptoms || 'General consultation'}"
                  </p>
                </div>

                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Instructions</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      Ensure your mic is unmuted
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      Keep your ID ready if requested
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 mt-auto">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Session ID</p>
                <p className="text-xs font-mono font-bold text-blue-400">{appointment?.appointmentCode || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PatientConsultationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>}>
      <PatientConsultationContent />
    </Suspense>
  );
}
