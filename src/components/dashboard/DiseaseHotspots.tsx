"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Wind, Droplets, Volume2, MapPin, Search, BarChart3, LayoutGrid, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Hotspot {
  area: string;
  disease: string;
  patient_count: number;
  environmentalFactors: {
    traffic: string;
    airPollution: number;
    waterPollution: string;
    noisePollution: string;
    lastUpdated: string;
  };
  recommendation: string;
}

export function DiseaseHotspots() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "chart">("grid");

  async function fetchHotspots() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/ai/disease-hotspots");
      const json = await response.json();
      if (json.success) {
        setHotspots(json.data);
      } else {
        toast.error("Failed to load health hotspots");
      }
    } catch (error) {
      console.error("Failed to fetch disease hotspots:", error);
      toast.error("System error while analyzing hotspots");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchHotspots();
  }, []);

  const filteredHotspots = hotspots.filter(h => 
    h.area.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.disease.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2.5rem]" />
        ))}
      </div>
    );
  }

  if (hotspots.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed border-2 border-slate-200 rounded-[2.5rem]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Activity className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No Hotspots Detected</p>
          <p className="text-slate-400 text-xs mt-2">Currently, there are no areas with more than 3 patients with the same disease.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-500" /> Hotspot Intelligence
          </h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">AI-Driven Public Health Analysis</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={fetchHotspots}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm text-muted-foreground hover:text-blue-600 transition-all disabled:opacity-50 group"
            title="Refresh ML Data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <div className="flex bg-muted p-1 rounded-xl shadow-inner">
            <button 
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3 w-3" /> Grid
            </button>
            <button 
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "chart" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BarChart3 className="h-3 w-3" /> Chart
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Area or Disease..." 
              className="pl-10 h-11 rounded-xl border-border bg-background shadow-sm focus:ring-2 focus:ring-orange-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        {viewMode === "chart" ? (
          <div className="bg-card p-8 md:p-12 rounded-[3rem] border border-border shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="mb-12">
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-tight">Patient Distribution</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Comparative Analysis Across Hotspots</p>
              </div>

              <div className="flex items-end gap-3 h-[350px] mt-12 overflow-x-auto pb-8 no-scrollbar">
                {filteredHotspots.map((hotspot, idx) => {
                  const count = parseInt(String(hotspot.patient_count)) || 0;
                  const maxHeight = 10;
                  const heightVal = Math.max((count / maxHeight) * 100, 5);
                  
                  return (
                    <div key={idx} className="flex-1 min-w-[80px] flex flex-col items-center group">
                      <div className="w-full h-[250px] flex flex-col justify-end items-center relative mb-4">
                        <div 
                          style={{ height: `${heightVal}%` }}
                          className="w-10 bg-orange-500 rounded-t-xl relative shadow-lg shadow-orange-500/20 group-hover:bg-orange-400 transition-all duration-1000"
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                            {count} Pts
                          </div>
                        </div>
                        <div className="absolute bottom-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800" />
                      </div>
                      
                      <div className="text-center w-full space-y-1">
                        <p className="text-[10px] font-black text-foreground truncate leading-none">{hotspot.area}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate leading-none">{hotspot.disease}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHotspots.map((hotspot, idx) => (
              <div 
                key={idx}
                className="bg-card rounded-[2.5rem] border border-border shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors duration-500" />
                
                <div className="p-8 relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 shadow-sm">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm">
                      {hotspot.patient_count} Patients
                    </Badge>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-black text-foreground tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
                      {hotspot.area}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {hotspot.disease} Outbreak
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border flex flex-col gap-1 hover:bg-card hover:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Wind className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Air Quality</span>
                      </div>
                      <p className="text-sm font-black text-foreground">AQI: {hotspot.environmentalFactors.airPollution}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border flex flex-col gap-1 hover:bg-card hover:border-emerald-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Droplets className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Water</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{hotspot.environmentalFactors.waterPollution}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border flex flex-col gap-1 hover:bg-card hover:border-purple-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Activity className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Traffic</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{hotspot.environmentalFactors.traffic}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border flex flex-col gap-1 hover:bg-card hover:border-red-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 text-red-600">
                        <Volume2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Noise</span>
                      </div>
                      <p className="text-sm font-black text-foreground">{hotspot.environmentalFactors.noisePollution}</p>
                    </div>
                  </div>

                  <div 
                    className="p-5 bg-orange-500/5 rounded-2xl border border-orange-500/10 group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-200 transition-all duration-500"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 dark:text-orange-400 group-hover:text-white">AI Health Advisory</span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed opacity-80 group-hover:opacity-100">
                      {hotspot.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
