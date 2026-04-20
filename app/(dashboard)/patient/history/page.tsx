"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  FileText, 
  Activity, 
  Calendar,
  ChevronRight,
  ClipboardList,
  Search,
  Stethoscope
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PatientHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/consultations");
        if (r.ok) {
          const j = await r.json();
          setRows(j || []);
        } else {
          toast.error("Failed to load medical history");
        }
      } catch (error) {
        console.error("Failed to load history", error);
        toast.error("Network error while fetching history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredRows = rows.filter(row => 
    row.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
    row.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            Medical History
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Your Clinical Timeline & Prescriptions
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search doctor or diagnosis..." 
            className="pl-11 h-12 bg-white border-slate-100 rounded-xl shadow-sm focus:ring-4 focus:ring-blue-50 transition-all font-medium text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-slate-900">Health Journey Logs</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                {filteredRows.length} Consultations Recorded
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Loading Records...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardList className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No medical records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[200px] h-14 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date & Doctor</TableHead>
                    <TableHead className="h-14 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Clinical Findings</TableHead>
                    <TableHead className="h-14 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Prescribed Plan</TableHead>
                    <TableHead className="w-[100px] h-14 px-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-slate-50/50 transition-all border-slate-100">
                      <TableCell className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-black text-slate-900">Dr. {row.doctorName}</p>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(row.consultationDate).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6">
                        <div className="space-y-2 max-w-md">
                          <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-lg">
                            {row.diagnosis}
                          </Badge>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
                            "{row.notes || 'No clinical notes'}"
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {row.prescriptions?.length > 0 ? (
                            row.prescriptions.map((p: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="border-slate-200 text-slate-600 font-bold text-[9px] bg-white shadow-sm">
                                {p.medicationName} — {p.dosage}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">No medication plan</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all">
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
