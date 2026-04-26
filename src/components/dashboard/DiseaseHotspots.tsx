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
  problemSummary?: string;
  patient_count: number;
  symptomEvidenceCount?: number;
  sampleCases?: Array<{ name?: string; symptoms?: string }>;
  environmentalFactors: {
    traffic: string;
    airPollution: number;
    waterPollution: string;
    noisePollution: string;
    lastUpdated: string;
  };
  segments?: string[];
  actualCause?: string;
  recommendation: string;
}

function getConfidenceMeta(evidenceCount: number, patientCount: number) {
  if (evidenceCount >= 3 && patientCount >= 4) {
    return {
      label: "High Confidence",
      className: "bg-emerald-500/10 text-emerald-700",
    };
  }
  if (evidenceCount >= 2) {
    return {
      label: "Medium Confidence",
      className: "bg-amber-500/10 text-amber-700",
    };
  }
  return {
    label: "Low Confidence",
    className: "bg-rose-500/10 text-rose-700",
  };
}

export function DiseaseHotspots() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "chart">("grid");
  const [radarIndex, setRadarIndex] = useState(0);

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
  const sortedHotspots = [...filteredHotspots].sort(
    (a, b) => Number(b.patient_count || 0) - Number(a.patient_count || 0),
  );
  const maxPatients = Math.max(...sortedHotspots.map((h) => Number(h.patient_count || 0)), 1);
  const maxEvidence = Math.max(
    ...sortedHotspots.map((h) => Number(h.symptomEvidenceCount || 0)),
    1,
  );
  const maxAqi = Math.max(
    ...sortedHotspots.map((h) => Number(h.environmentalFactors?.airPollution || 0)),
    1,
  );
  const selectedRadarHotspot = sortedHotspots[Math.min(radarIndex, Math.max(sortedHotspots.length - 1, 0))];

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
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-tight">Hotspot Radar Analysis</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Multi-Metric Comparison For Selected Area Cluster</p>
              </div>

              <div className="mt-10">
                <div className="w-full rounded-3xl border border-border bg-muted/20 p-6 lg:h-[430px]">
                  {selectedRadarHotspot ? (
                    <div className="grid lg:grid-cols-[320px_1fr] gap-8 items-start lg:h-full">
                      <div className="w-full max-w-[320px] mx-auto lg:self-center">
                        {(() => {
                          const trafficValue =
                            selectedRadarHotspot.environmentalFactors.traffic === "Extreme"
                              ? 100
                              : selectedRadarHotspot.environmentalFactors.traffic === "High"
                                ? 78
                                : selectedRadarHotspot.environmentalFactors.traffic === "Medium"
                                  ? 55
                                  : 30;
                          const waterValue =
                            selectedRadarHotspot.environmentalFactors.waterPollution === "Unsafe"
                              ? 100
                              : selectedRadarHotspot.environmentalFactors.waterPollution === "Risky"
                                ? 65
                                : 25;
                          const noiseValue =
                            selectedRadarHotspot.environmentalFactors.noisePollution === "Extreme"
                              ? 100
                              : selectedRadarHotspot.environmentalFactors.noisePollution === "High"
                                ? 70
                                : 30;

                          const axes = [
                            { label: "Patients", value: Math.round((Number(selectedRadarHotspot.patient_count || 0) / maxPatients) * 100) },
                            { label: "Evidence", value: Math.round((Number(selectedRadarHotspot.symptomEvidenceCount || 0) / maxEvidence) * 100) },
                            { label: "AQI", value: Math.round((Number(selectedRadarHotspot.environmentalFactors.airPollution || 0) / maxAqi) * 100) },
                            { label: "Traffic", value: trafficValue },
                            { label: "Water", value: waterValue },
                            { label: "Noise", value: noiseValue },
                          ];

                          const center = 120;
                          const radius = 84;
                          const pointFor = (i: number, val: number) => {
                            const angle = ((Math.PI * 2) / axes.length) * i - Math.PI / 2;
                            const r = (radius * Math.max(0, Math.min(100, val))) / 100;
                            return {
                              x: center + Math.cos(angle) * r,
                              y: center + Math.sin(angle) * r,
                            };
                          };

                          const polygonPoints = axes
                            .map((a, i) => {
                              const p = pointFor(i, a.value);
                              return `${p.x},${p.y}`;
                            })
                            .join(" ");

                          return (
                            <svg viewBox="0 0 240 240" className="w-full h-full">
                              {[25, 50, 75, 100].map((lvl) => {
                                const ring = axes
                                  .map((_, i) => {
                                    const p = pointFor(i, lvl);
                                    return `${p.x},${p.y}`;
                                  })
                                  .join(" ");
                                return (
                                  <polygon
                                    key={lvl}
                                    points={ring}
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-border"
                                    strokeWidth="1"
                                  />
                                );
                              })}

                              {axes.map((a, i) => {
                                const edge = pointFor(i, 100);
                                const text = pointFor(i, 118);
                                return (
                                  <g key={a.label}>
                                    <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="currentColor" className="text-border" strokeWidth="1" />
                                    <text x={text.x} y={text.y} textAnchor="middle" fontSize="9" className="fill-muted-foreground font-bold">
                                      {a.label}
                                    </text>
                                  </g>
                                );
                              })}

                              <polygon points={polygonPoints} fill="rgba(249,115,22,0.25)" stroke="rgb(249 115 22)" strokeWidth="2" />
                              {axes.map((a, i) => {
                                const p = pointFor(i, a.value);
                                return <circle key={`${a.label}-point`} cx={p.x} cy={p.y} r="3" fill="rgb(249 115 22)" />;
                              })}
                            </svg>
                          );
                        })()}
                      </div>

                      <div className="space-y-3 lg:h-full lg:overflow-y-auto lg:pr-2">
                        {sortedHotspots.map((hotspot, idx) => {
                          const confidence = getConfidenceMeta(
                            Number(hotspot.symptomEvidenceCount || 0),
                            Number(hotspot.patient_count || 0),
                          );
                          const active = idx === radarIndex;
                          return (
                            <button
                              key={`${hotspot.area}-${hotspot.disease}-${idx}`}
                              onClick={() => setRadarIndex(idx)}
                              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                active ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20" : "border-border bg-background hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-foreground truncate">
                                    #{idx + 1} {hotspot.area}
                                  </p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                    {hotspot.disease}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${confidence.className} border-none font-black text-[10px] uppercase tracking-widest`}>
                                    {confidence.label}
                                  </Badge>
                                  <Badge className="bg-orange-500/10 text-orange-700 border-none font-black text-[10px] uppercase tracking-widest">
                                    {Number(hotspot.patient_count || 0)} pts
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-semibold">No hotspots match search.</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge className="bg-orange-500/10 text-orange-700 border-none font-black text-[10px] uppercase tracking-widest">Radar area = risk pressure</Badge>
                  <Badge className="bg-slate-700/10 text-slate-700 border-none font-black text-[10px] uppercase tracking-widest">Axes normalized per metric</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-none font-black text-[10px] uppercase tracking-widest">Use list to switch hotspot</Badge>
                </div>
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
                    <div className="mb-2">
                      {(() => {
                        const confidence = getConfidenceMeta(
                          Number(hotspot.symptomEvidenceCount || 0),
                          Number(hotspot.patient_count || 0),
                        );
                        return (
                          <Badge className={`${confidence.className} border-none font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg`}>
                            {confidence.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <h3 className="text-xl font-black text-foreground tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
                      {hotspot.area}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {hotspot.disease} Outbreak
                      </p>
                    </div>
                    {hotspot.problemSummary ? (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        Problem Pattern: {hotspot.problemSummary}
                      </p>
                    ) : null}
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                      Evidence Records: {Number(hotspot.symptomEvidenceCount || 0)}
                    </p>
                    {hotspot.sampleCases?.length ? (
                      <div className="mt-2 space-y-1">
                        {hotspot.sampleCases.slice(0, 2).map((c, i) => (
                          <p key={`${c.name || "patient"}-${i}`} className="text-[11px] text-muted-foreground line-clamp-1">
                            Case {i + 1}: {c.symptoms || "Not reported"}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {hotspot.segments?.length ? (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {hotspot.segments.slice(0, 3).map((segment, idx) => (
                        <Badge
                          key={`${segment}-${idx}`}
                          variant="outline"
                          className="font-black text-[9px] uppercase tracking-widest"
                        >
                          {segment}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

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
                    {hotspot.actualCause ? (
                      <p className="text-[11px] font-semibold mb-2 opacity-80 group-hover:opacity-100">
                        Cause: {hotspot.actualCause}
                      </p>
                    ) : null}
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
