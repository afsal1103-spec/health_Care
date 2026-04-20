// "use client";

// import { useState, useEffect, Suspense, useRef } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { 
//   Video, 
//   Mic, 
//   MicOff, 
//   VideoOff, 
//   PhoneOff, 
//   MessageSquare, 
//   User, 
//   FileText, 
//   History, 
//   Activity,
//   Plus,
//   Trash2,
//   Save,
//   ChevronRight,
//   ChevronLeft
// } from "lucide-react";
// import { toast } from "sonner";
// import gsap from "gsap";

// interface Prescription {
//   medication_name: string;
//   dosage: string;
//   duration: string;
//   instructions: string;
// }

// function ConsultationContent() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const appointmentId = searchParams.get("appointmentId");

//   const [loading, setLoading] = useState(true);
//   const [appointment, setAppointment] = useState<any>(null);
//   const [patient, setPatient] = useState<any>(null);
//   const [history, setHistory] = useState<any[]>([]);
  
//   const [isVideoOn, setIsVideoOn] = useState(true);
//   const [isMicOn, setIsMicOn] = useState(true);
//   const [showHistory, setShowHistory] = useState(true);

//   // Video Refs
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);

//   // Consultation form
//   const [diagnosis, setDiagnosis] = useState("");
//   const [notes, setNotes] = useState("");
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([
//     { medication_name: "", dosage: "", duration: "", instructions: "" }
//   ]);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (appointmentId) {
//       loadData();
//     } else {
//       router.push("/dashboard/doctor/appointments");
//     }
//   }, [appointmentId]);

//   // Camera Logic
//   useEffect(() => {
//     if (isVideoOn) {
//       startCamera();
//     } else {
//       stopCamera();
//     }
//     return () => stopCamera();
//   }, [isVideoOn]);

//   const startCamera = async () => {
//     try {
//       // Check if another stream is active
//       if (localStreamRef.current) {
//         stopCamera();
//       }

//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: true, 
//         audio: isMicOn 
//       });
//       localStreamRef.current = stream;
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//       }
//     } catch (err: any) {
//       console.error("Error accessing camera:", err);
//       if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
//         toast.error("Camera already in use. Please close other tabs using the camera.");
//       } else {
//         toast.error("Could not access camera. Please check permissions.");
//       }
//       setIsVideoOn(false);
//     }
//   };

//   const stopCamera = () => {
//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => track.stop());
//       localStreamRef.current = null;
//     }
//   };

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`/api/appointments?id=${appointmentId}`);
//       const data = await res.json();
//       if (res.ok && data.length > 0) {
//         const apt = data[0];
//         setAppointment(apt);
        
//         // Load patient details
//         const pRes = await fetch(`/api/patients/search?patientId=${apt.patientId}`);
//         const pData = await pRes.json();
//         setPatient(pData.patient);

//         // Load patient history
//         const hRes = await fetch(`/api/consultations?patientId=${apt.patientId}`);
//         const hData = await hRes.json();
//         setHistory(hData || []);
//       }
//     } catch (error) {
//       toast.error("Failed to load consultation data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addPrescription = () =>
//     setPrescriptions([...prescriptions, { medication_name: "", dosage: "", duration: "", instructions: "" }]);

//   const removePrescription = (i: number) =>
//     setPrescriptions(prescriptions.filter((_, idx) => idx !== i));

//   const updatePrescription = (i: number, field: keyof Prescription, value: string) => {
//     const updated = [...prescriptions];
//     updated[i][field] = value;
//     setPrescriptions(updated);
//   };

//   const endConsultation = async () => {
//     if (!diagnosis.trim()) {
//       toast.error("Please enter a diagnosis before ending the consultation");
//       return;
//     }

//     setSaving(true);
//     try {
//       const res = await fetch("/api/consultations", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           appointment_id: parseInt(appointmentId as string, 10),
//           patient_id: parseInt(patient.id, 10),
//           diagnosis,
//           notes,
//           prescriptions: prescriptions
//             .filter(p => p.medication_name.trim())
//             .map(p => ({
//               ...p,
//               duration: p.instructions // Mapping instructions to duration for now if that's where duration is entered
//             })),
//           status: 'completed'
//         }),
//       });

//       if (res.ok) {
//         toast.success("Consultation completed and saved!");
//         router.push("/dashboard/doctor/appointments");
//       } else {
//         toast.error("Failed to save consultation");
//       }
//     } catch (error) {
//       toast.error("An error occurred");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return <div className="h-screen flex items-center justify-center">
//     <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
//   </div>;

//   return (
//     <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 p-6 overflow-hidden bg-slate-50/50">
//       {/* ── Left: Main Consultation Space ───────────────────────────────────── */}
//       <div className={`flex-1 flex flex-col gap-6 transition-all duration-700 min-w-0 ${showHistory ? 'lg:w-[72%]' : 'w-full'} h-full overflow-y-auto custom-scrollbar pr-2`}>
        
//         {/* 1. Video Call Grid - Compact & Responsive */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[280px]">
//           {/* Main Video (Patient) */}
//           <div className="relative bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-900/50 group aspect-video md:aspect-auto">
//             <div className="absolute inset-0 flex items-center justify-center">
//               <div className="w-full h-full bg-gradient-to-br from-blue-900/10 via-slate-950 to-black flex flex-col items-center justify-center">
//                 <div className="w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
//                   <User className="h-10 w-10 text-blue-500/50" />
//                 </div>
//                 <p className="text-white font-black text-sm tracking-[0.2em] uppercase opacity-80">Patient: {patient?.name}</p>
//                 <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/30 px-3 py-1 text-[8px] font-black tracking-widest uppercase">ENCRYPTED FEED</Badge>
//               </div>
//             </div>
//             <div className="absolute top-6 left-6 z-10">
//               <Badge className="bg-black/60 backdrop-blur-xl border-white/10 text-white font-mono text-[10px] px-3 py-1.5 rounded-xl shadow-2xl">00:12:45</Badge>
//             </div>
//           </div>

//           {/* Self Preview (Doctor) */}
//           <div className="relative bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-900/50 group aspect-video md:aspect-auto">
//             {isVideoOn ? (
//               <video 
//                 ref={localVideoRef} 
//                 autoPlay 
//                 playsInline 
//                 muted 
//                 className="w-full h-full object-cover mirror scale-x-[-1]"
//               />
//             ) : (
//               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
//                 <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
//                   <VideoOff className="h-8 w-8 text-slate-600" />
//                 </div>
//                 <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Camera Inactive</p>
//               </div>
//             )}
//             <div className="absolute bottom-6 left-6 z-10 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl text-[10px] text-white font-black uppercase tracking-widest shadow-2xl border border-white/5">
//               You (Dr. {appointment?.doctorName})
//             </div>
            
//             {/* Control HUD inside video */}
//             <div className="absolute bottom-6 right-6 flex items-center gap-3 z-20">
//               <Button 
//                 variant="secondary" 
//                 size="icon" 
//                 className={`h-11 w-11 rounded-2xl transition-all shadow-2xl border ${!isMicOn ? 'bg-red-500/90 hover:bg-red-600 text-white border-red-400/50' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border-white/20'}`}
//                 onClick={() => setIsMicOn(!isMicOn)}
//               >
//                 {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
//               </Button>
//               <Button 
//                 variant="secondary" 
//                 size="icon" 
//                 className={`h-11 w-11 rounded-2xl transition-all shadow-2xl border ${!isVideoOn ? 'bg-red-500/90 hover:bg-red-600 text-white border-red-400/50' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border-white/20'}`}
//                 onClick={() => setIsVideoOn(!isVideoOn)}
//               >
//                 {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
//               </Button>
//               <Button 
//                 variant="destructive" 
//                 size="icon" 
//                 className="h-11 w-11 rounded-2xl bg-red-600/90 hover:bg-red-700 shadow-2xl shadow-red-500/20 border border-red-400/50 transition-all active:scale-90"
//                 onClick={endConsultation}
//               >
//                 <PhoneOff className="h-5 w-5" />
//               </Button>
//             </div>
//           </div>
//         </div>

//         {/* 2. Clinical Documentation - Refined Fit */}
//         <Card className="flex-1 border-none shadow-2xl rounded-[3rem] overflow-hidden flex flex-col bg-white min-h-[500px]">
//           <CardHeader className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 py-5 px-10 shrink-0 flex flex-row items-center justify-between">
//             <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-slate-500">
//               <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
//                 <FileText className="h-4 w-4 text-white" />
//               </div>
//               Clinical Case File
//             </CardTitle>
//             <Badge variant="outline" className="rounded-full px-4 py-1.5 border-blue-100 text-blue-600 font-black text-[9px] uppercase tracking-widest">
//               ID: {appointment?.appointmentCode || '...'}
//             </Badge>
//           </CardHeader>
          
//           <CardContent className="p-10 flex-1 overflow-y-auto custom-scrollbar">
//             <div className="flex flex-col gap-12 max-w-5xl mx-auto">
//               {/* Top: Core Diagnosis */}
//               <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
//                 <div className="xl:col-span-5 space-y-4">
//                   <Label className="font-black text-[11px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-1">
//                     <Activity className="h-4 w-4 text-blue-600" /> Final Diagnosis
//                   </Label>
//                   <Input 
//                     placeholder="e.g. Acute Bronchitis" 
//                     value={diagnosis} 
//                     onChange={e => setDiagnosis(e.target.value)}
//                     className="h-16 bg-slate-50/50 border-2 border-slate-100 text-lg font-black rounded-[1.5rem] px-8 focus:bg-white focus:border-blue-500/30 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
//                   />
//                 </div>

//                 <div className="xl:col-span-7 space-y-4">
//                   <Label className="font-black text-[11px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-1">
//                     <FileText className="h-4 w-4 text-blue-600" /> Clinical Notes
//                   </Label>
//                   <Textarea 
//                     placeholder="Enter observations, follow-ups, and patient advice..." 
//                     className="min-h-[120px] bg-slate-50/50 border-2 border-slate-100 text-base font-bold rounded-[1.5rem] p-6 focus:bg-white focus:border-blue-500/30 focus:ring-4 focus:ring-blue-50 transition-all resize-none leading-relaxed shadow-sm"
//                     value={notes} 
//                     onChange={e => setNotes(e.target.value)}
//                   />
//                 </div>
//               </div>

//               {/* Bottom: Medications Section */}
//               <div className="pt-10 border-t-2 border-slate-50">
//                 <div className="flex items-center justify-between mb-8 px-1">
//                   <div className="space-y-1">
//                     <Label className="font-black text-[11px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
//                       <Plus className="h-4 w-4 text-blue-600" /> Prescribed Medications
//                     </Label>
//                     <p className="text-[10px] text-slate-400 font-bold ml-6 uppercase tracking-widest opacity-60 italic">Detailed Rx Plan</p>
//                   </div>
//                   <Button 
//                     onClick={addPrescription} 
//                     className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-12 px-8 rounded-2xl shadow-xl transition-all active:scale-95"
//                   >
//                     Add Row
//                   </Button>
//                 </div>
                
//                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//                   {prescriptions.map((p, i) => (
//                     <div key={i} className="p-8 bg-slate-50/40 rounded-[2.5rem] border-2 border-slate-100 group transition-all hover:bg-white hover:border-blue-200 hover:shadow-2xl relative">
//                       <Button 
//                         variant="ghost" 
//                         size="icon" 
//                         className="absolute top-6 right-6 text-slate-300 hover:text-red-600 hover:bg-red-50 h-10 w-10 rounded-2xl transition-all z-20"
//                         onClick={() => removePrescription(i)}
//                       >
//                         <Trash2 className="h-5 w-5" />
//                       </Button>

//                       <div className="flex flex-col gap-6">
//                         <div className="space-y-3">
//                           <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Medicine</Label>
//                           <Input 
//                             placeholder="e.g. Amoxicillin 500mg" 
//                             value={p.medication_name} 
//                             onChange={e => updatePrescription(i, 'medication_name', e.target.value)}
//                             className="h-12 bg-white border-2 border-slate-100 text-sm font-black rounded-2xl px-6"
//                           />
//                         </div>
                        
//                         <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-4">
//                           <div className="space-y-3">
//                             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Dosage</Label>
//                             <Input 
//                               placeholder="1-0-1" 
//                               value={p.dosage} 
//                               onChange={e => updatePrescription(i, 'dosage', e.target.value)}
//                               className="h-12 bg-white border-2 border-slate-100 text-xs font-black rounded-2xl px-4 text-center"
//                             />
//                           </div>
//                           <div className="space-y-3">
//                             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Advice/Duration</Label>
//                             <Input 
//                               placeholder="e.g. 7 days - After meal" 
//                               value={p.instructions} 
//                               onChange={e => updatePrescription(i, 'instructions', e.target.value)}
//                               className="h-12 bg-white border-2 border-slate-100 text-xs font-black rounded-2xl px-6"
//                             />
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {prescriptions.length === 0 && (
//                   <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/20 group hover:bg-slate-50/40 transition-all cursor-pointer" onClick={addPrescription}>
//                     <div className="w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center mb-6 border border-slate-100 group-hover:scale-110 transition-transform">
//                       <Plus className="h-10 w-10 text-blue-400" />
//                     </div>
//                     <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">No Meds Prescribed</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* ── Right: Patient History Tab ─────────────────────────────── */}
//       {showHistory && (
//         <div className="w-full lg:w-96 flex flex-col gap-6 animate-in slide-in-from-right-10 duration-700">
//           <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden flex-1 flex flex-col bg-white">
//             <CardHeader className="bg-slate-900 text-white p-10 relative overflow-hidden">
//               <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
//                 <User className="h-32 w-32" />
//               </div>
//               <div className="relative z-10 flex items-center gap-5">
//                 <div className="bg-blue-600/20 p-4 rounded-3xl border border-blue-500/30 shadow-2xl">
//                   <User className="h-8 w-8 text-blue-400" />
//                 </div>
//                 <div>
//                   <CardTitle className="text-2xl font-black tracking-tight">{patient?.name}</CardTitle>
//                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{patient?.bloodGroup || 'O+'} • {patient?.mobileNo}</p>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent className="p-0 flex-1 overflow-y-auto">
//               <Tabs defaultValue="current">
//                 <TabsList className="w-full h-16 bg-slate-50/50 rounded-none p-1.5 border-b border-slate-100">
//                   <TabsTrigger value="current" className="flex-1 h-full rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all">Current</TabsTrigger>
//                   <TabsTrigger value="history" className="flex-1 h-full rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all">History</TabsTrigger>
//                 </TabsList>
//                 <TabsContent value="current" className="p-8 space-y-8">
//                   <div className="space-y-4">
//                     <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
//                       <Activity className="h-3 w-3 text-blue-600" /> Patient Symptoms
//                     </h4>
//                     <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 shadow-sm">
//                       <p className="text-sm font-bold text-blue-900 leading-relaxed italic opacity-80">"{appointment?.symptoms || 'None specified'}"</p>
//                     </div>
//                   </div>
//                 </TabsContent>
//                 <TabsContent value="history" className="p-8 space-y-6">
//                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
//                     <History className="h-3 w-3 text-blue-600" /> Medical Timeline
//                   </h4>
//                   <div className="space-y-4">
//                     {history.length === 0 ? (
//                       <div className="flex flex-col items-center justify-center py-20 opacity-30">
//                         <History className="h-12 w-12 mb-4" />
//                         <p className="text-[10px] font-black uppercase tracking-widest">No Past History</p>
//                       </div>
//                     ) : (
//                       history.map((h, i) => (
//                         <div key={i} className="p-5 border-2 border-slate-50 rounded-3xl hover:border-blue-100 transition-all hover:shadow-lg group">
//                           <div className="flex justify-between items-start mb-3">
//                             <p className="text-[10px] font-black text-slate-900">{new Date(h.consultation_date).toLocaleDateString()}</p>
//                             <Badge variant="outline" className="text-[8px] h-5 rounded-lg border-slate-200 group-hover:border-blue-200">Dr. {h.doctor_name}</Badge>
//                           </div>
//                           <p className="text-xs font-black text-blue-600 mb-2">{h.diagnosis}</p>
//                           <p className="text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2">{h.notes}</p>
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 </TabsContent>
//               </Tabs>
//             </CardContent>
//             <div className="p-8 border-t border-slate-50 bg-slate-50/30">
//               <Button 
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-3xl shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
//                 onClick={endConsultation}
//                 disabled={saving}
//               >
//                 {saving ? "Saving Record..." : "End & Save Consultation"}
//               </Button>
//             </div>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function ConsultationPage() {
//   return (
//     <Suspense fallback={<div className="h-screen flex items-center justify-center">
//       <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
//     </div>}>
//       <ConsultationContent />
//     </Suspense>
//   );
// }


"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  User,
  FileText,
  History,
  Activity,
  Plus,
  Trash2,
  Star,
} from "lucide-react";

import { toast } from "sonner";

interface Prescription {
  medication_name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

function ConsultationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showHistory] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    { medication_name: "", dosage: "", duration: "", instructions: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (appointmentId) loadData();
    else router.push("/dashboard/doctor/appointments");
  }, [appointmentId]);

  useEffect(() => {
    if (isVideoOn) startCamera();
    else stopCamera();

    return () => stopCamera();
  }, [isVideoOn]);

  const startCamera = async () => {
    try {
      if (localStreamRef.current) stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isMicOn,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Camera not accessible");
      setIsVideoOn(false);
    }
  };

  const stopCamera = () => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/appointments?id=${appointmentId}`);
      const data = await res.json();

      if (data?.length) {
        const apt = data[0];
        setAppointment(apt);

        const pRes = await fetch(
          `/api/patients/search?patientId=${apt.patientId}`
        );
        const pData = await pRes.json();
        setPatient(pData.patient);

        const hRes = await fetch(
          `/api/consultations?patientId=${apt.patientId}`
        );
        const hData = await hRes.json();
        setHistory(hData || []);
      }
    } catch {
      toast.error("Failed to load consultation data");
    }

    setLoading(false);
  };

  const addPrescription = () =>
    setPrescriptions([
      ...prescriptions,
      { medication_name: "", dosage: "", duration: "", instructions: "" },
    ]);

  const removePrescription = (i: number) =>
    setPrescriptions(prescriptions.filter((_, idx) => idx !== i));

  const updatePrescription = (
    i: number,
    field: keyof Prescription,
    value: string
  ) => {
    const updated = [...prescriptions];
    updated[i][field] = value;
    setPrescriptions(updated);
  };

  const endConsultation = async () => {
    if (!diagnosis.trim()) {
      toast.error("Enter diagnosis");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          appointment_id: parseInt(appointmentId as string),
          patient_id: patient.id,
          diagnosis,
          notes,
          prescriptions,
          status: "completed",
        }),
      });

      if (res.ok) {
        toast.success("Consultation saved");
        setShowRatingModal(true);
      } else toast.error("Save failed");
    } catch {
      toast.error("Error occurred");
    }

    setSaving(false);
  };

  const submitRating = async () => {
    setRatingLoading(true);
    try {
      const res = await fetch(`/api/doctors/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: appointment.doctorId,
          rating: rating,
        }),
      });

      if (res.ok) {
        toast.success("Thank you for your rating!");
        router.push("/dashboard/doctor/appointments");
      } else {
        toast.error("Failed to submit rating");
      }
    } catch (error) {
      toast.error("Rating error occurred");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-4 p-4 bg-slate-100 overflow-hidden">
      {/* LEFT AREA */}

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* VIDEO AREA */}

        <div className="grid md:grid-cols-2 gap-3 min-h-[240px]">
          {/* PATIENT VIDEO */}

          <div className="bg-black rounded-2xl flex items-center justify-center text-white relative">
            <div className="text-center">
              <User className="mx-auto mb-2 opacity-50" size={40} />
              <p className="font-semibold">{patient?.name}</p>
              <Badge className="mt-2">Patient</Badge>
            </div>
          </div>

          {/* DOCTOR VIDEO */}

          <div className="bg-black rounded-2xl overflow-hidden relative">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                Camera Off
              </div>
            )}

            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setIsMicOn(!isMicOn)}
              >
                {isMicOn ? <Mic /> : <MicOff />}
              </Button>

              <Button
                size="icon"
                variant="secondary"
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video /> : <VideoOff />}
              </Button>

              <Button
                size="icon"
                variant="destructive"
                onClick={endConsultation}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        </div>

        {/* CONSULTATION CARD */}

        <Card className="flex-1 rounded-2xl shadow border">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText size={16} />
              Consultation Notes
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6 overflow-y-auto">
            {/* DIAGNOSIS */}

            <div className="space-y-2">
              <Label>Diagnosis</Label>

              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Diagnosis"
              />
            </div>

            {/* NOTES */}

            <div className="space-y-2">
              <Label>Clinical Notes</Label>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* PRESCRIPTIONS */}

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Prescriptions</Label>

                <Button size="sm" onClick={addPrescription}>
                  <Plus size={16} className="mr-2" />
                  Add
                </Button>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {prescriptions.map((p, i) => (
                  <div
                    key={i}
                    className="border rounded-xl p-4 space-y-3 relative"
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => removePrescription(i)}
                    >
                      <Trash2 size={16} />
                    </Button>

                    <Input
                      placeholder="Medication"
                      value={p.medication_name}
                      onChange={(e) =>
                        updatePrescription(
                          i,
                          "medication_name",
                          e.target.value
                        )
                      }
                    />

                    <Input
                      placeholder="Dosage"
                      value={p.dosage}
                      onChange={(e) =>
                        updatePrescription(i, "dosage", e.target.value)
                      }
                    />

                    <Input
                      placeholder="Instructions"
                      value={p.instructions}
                      onChange={(e) =>
                        updatePrescription(i, "instructions", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT PANEL */}

      <div className="lg:w-[360px]">
        <Card className="h-full flex flex-col rounded-2xl shadow">
          <CardHeader className="p-6 border-b">
            <CardTitle>{patient?.name}</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-5">
            <Tabs defaultValue="current">
              <TabsList className="w-full">
                <TabsTrigger value="current">Current</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="mt-4">
                <p className="text-sm">
                  {appointment?.symptoms || "No symptoms"}
                </p>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-3">
                {Array.isArray(history) && history.length > 0 ? (
                  history.map((h, i) => (
                    <div
                      key={i}
                      className="border rounded-xl p-3 text-sm"
                    >
                      <p className="font-semibold">{h.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.notes}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No history available</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="p-4 border-t">
            <Button
              className="w-full"
              onClick={endConsultation}
              disabled={saving}
            >
              {saving ? "Saving..." : "End Consultation"}
            </Button>
          </div>
        </Card>
      </div>

      {/* RATING MODAL */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Star className="h-8 w-8 text-blue-600 fill-blue-600" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-slate-900 tracking-tight">
              Rate Consultation
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
              Please rate your experience with Dr. {appointment?.doctorName} to help us improve our services.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center items-center gap-2 py-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-125 active:scale-95"
              >
                <Star
                  size={40}
                  className={`${
                    star <= rating ? "fill-orange-400 text-orange-400" : "text-slate-200"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          <DialogFooter className="sm:justify-center mt-4">
            <Button
              onClick={submitRating}
              disabled={ratingLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95"
            >
              {ratingLoading ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConsultationContent />
    </Suspense>
  );
}