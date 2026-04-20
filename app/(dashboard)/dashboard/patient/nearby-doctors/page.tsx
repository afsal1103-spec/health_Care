"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  MapPin, 
  Phone, 
  Search, 
  Star, 
  ArrowRight,
  Globe,
  GraduationCap,
  Calendar,
  MessageSquare,
  Send,
  Loader2,
  ShieldAlert,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";
import Link from 'next/link';

interface Doctor {
  id: number;
  name: string;
  specialist: string;
  education: string;
  contact: string;
  address: string;
  starRatings: number;
  consultationFee: number;
}

export default function NearbyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlineResults, setOnlineResults] = useState<any[]>([]);

  // AI Chatbot State
  const [symptoms, setSymptoms] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, 
        { opacity: 0, y: 10 }, 
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadDoctors();
  }, [debouncedSearch]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      // Internal search
      const qs = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/admin/doctors${qs}`);
      const data = await res.json();
      
      // Handle the data structure from /api/admin/doctors
      if (data && data.items) {
        setDoctors(data.items);
      } else if (Array.isArray(data)) {
        setDoctors(data);
      } else {
        setDoctors([]);
      }

      // Real Online Search
      console.log("Fetching online doctors for:", debouncedSearch);
      const onlineRes = await fetch(`/api/ai/online-doctors?query=${encodeURIComponent(debouncedSearch)}`);
      const onlineData = await onlineRes.json();
      console.log("Online doctors received:", onlineData.results?.length);
      setOnlineResults(onlineData.results || []);
    } catch (error) {
      console.error("Failed to load doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!symptoms.trim()) {
      toast.error("Please enter your symptoms first.");
      return;
    }

    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch("/api/ai/recommend-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms })
      });
      const data = await res.json();
      if (data.ai_analysis) {
        setAiResponse(data);
        // If AI recommended doctors, update the list
        if (data.recommendations && data.recommendations.length > 0) {
          setDoctors(data.recommendations);
        }
        
        // Also trigger real online search based on the condition/specialty
        const query = data.ai_analysis.condition || symptoms;
        const onlineRes = await fetch(`/api/ai/online-doctors?query=${encodeURIComponent(query)}`);
        const onlineData = await onlineRes.json();
        setOnlineResults(onlineData.results || []);

        toast.success("AI Analysis & Online Search Complete!");
      } else {
        toast.error("AI couldn't analyze those symptoms. Please be more specific.");
      }
    } catch (error) {
      toast.error("Failed to connect to AI assistant.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <MapPin className="h-10 w-10 text-blue-600" /> Find Nearby Doctors
          </h1>
          <p className="text-gray-500 text-lg">Search in our platform or perform an online search for specialists</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors pointer-events-none" />
          <Input 
            placeholder="Search by specialty or location..." 
            value={search} 
            onChange={(e) => {
              console.log("Search input value:", e.target.value);
              setSearch(e.target.value);
            }} 
            className="w-full md:w-80 h-14 pl-12 border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all relative z-10"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Internal platform doctors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-600 text-white border-none px-3 py-1">ON PLATFORM</Badge>
            <p className="text-sm font-bold text-gray-400">Available for instant booking</p>
          </div>

          {loading && <div className="py-20 text-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          
          {!loading && doctors.length === 0 && (
            <Card className="border-none shadow-xl rounded-3xl py-24 text-center">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-400">No doctors found in your area.</p>
              <p className="text-gray-500">Try adjusting your search terms.</p>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {doctors.map((d) => (
              <Card key={d.id} className="group border-none shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gray-50 p-6 flex flex-row items-center justify-between border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black">Dr. {d.name}</CardTitle>
                      <p className="text-xs font-bold text-blue-600">{d.specialist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">
                    <Star className="h-4 w-4 fill-orange-500" />
                    <span className="font-bold text-xs">{d.starRatings || '4.5'}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> EDUCATION
                    </p>
                    <p className="text-sm font-bold text-gray-700">{d.education}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> ADDRESS
                    </p>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed">{d.address || 'Location details not provided'}</p>
                  </div>
                  <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black rounded-xl shadow-lg shadow-blue-200 mt-2">
                    <Link href="/dashboard/patient/book-appointment" className="flex items-center gap-2">
                      Book Now <Calendar className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Online search results */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-2 border-gray-200 text-gray-500 bg-gray-50 px-3 py-1">ONLINE SEARCH</Badge>
            <Globe className="h-4 w-4 text-gray-400" />
          </div>

          <Card className="border-none shadow-xl rounded-3xl bg-gray-50/50 p-6 space-y-4">
            <p className="text-xs font-bold text-gray-400 leading-relaxed">External results from the web matching your search.</p>
            
            {onlineResults.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-bold text-gray-400 italic">Enter a query to see online results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {onlineResults.map((r, i) => (
                  <div key={i} className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-black text-gray-900 text-sm">{r.name}</p>
                      <div className="flex items-center gap-1 text-orange-500">
                        <Star className="h-3 w-3 fill-orange-500" />
                        <span className="text-[10px] font-bold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-blue-600">{r.specialist}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {r.address}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Globe className="h-3 w-3 text-gray-400" />
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Source: {r.source || 'Web'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full h-12 border-2 font-black rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-100"
              onClick={() => window.open(`https://www.google.com/search?q=doctors+for+${encodeURIComponent(search || 'medical+consultation')}`, '_blank')}
            >
              View More Online Results
            </Button>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-0 overflow-hidden">
            <div className="p-8 border-b border-white/10 flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">AI Health Assistant</h3>
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Symptom-to-Specialist Engine</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-300 leading-relaxed">Describe how you're feeling. I'll analyze the root cause and recommend the right specialist.</p>
                <div className="relative group">
                  <textarea 
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g., I have a persistent headache and feel dizzy when I stand up..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                  <Button 
                    onClick={handleAiAnalysis}
                    disabled={aiLoading}
                    className="absolute bottom-3 right-3 h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg"
                  >
                    {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {aiResponse && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="h-4 w-4 text-blue-400" />
                      <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Potential Condition</span>
                    </div>
                    <p className="text-lg font-black text-white mb-2">{aiResponse.ai_analysis.condition}</p>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{aiResponse.ai_analysis.insight}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Prevention & Care</span>
                    </div>
                    {aiResponse.ai_analysis.prevention.map((tip: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-xs font-bold text-slate-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                        {tip}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recommended Specialists below</p>
                    <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 font-black rounded-xl">
                      Book with Top Rated Doctor
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
