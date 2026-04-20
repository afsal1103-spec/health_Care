"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  Stethoscope, 
  Video, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit3,
  User
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";

function fmtDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtTime(t: string) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(':');
    const date = new Date();
    date.setHours(parseInt(h), parseInt(m));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return t;
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted: "bg-green-100  text-green-700  border-green-200",
  rejected: "bg-red-100    text-red-700    border-red-200",
  altered: "bg-blue-100   text-blue-700   border-blue-200",
  completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  cancelled: "bg-gray-100   text-gray-600   border-gray-200",
};

function statusLabel(s: string) {
  return (s ?? "").replace("_", " ");
}

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alterDialogOpen, setAlterDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/appointments");
      if (r.ok) {
        const j = await r.json();
        const nextRows = Array.isArray(j) ? j : [];
        setRows(nextRows);
        setCachedValue("doctor:appointments", nextRows);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedValue<any[]>("doctor:appointments", 45_000);
    if (cached) {
      setRows(cached);
    }
    load();
  }, []);

  useEffect(() => {
    router.prefetch("/dashboard/doctor/consultation");
  }, [router]);

  const handleStatusUpdate = async (id: number, status: string, additionalData = {}) => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...additionalData }),
      });
      if (res.ok) {
        toast.success(`Appointment ${status} successfully`);
        load();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const openAlterDialog = (appointment: any) => {
    setSelectedAppointment(appointment);
    setNewDate(appointment.appointmentDate.split('T')[0]);
    setNewTime(appointment.appointmentTime.substring(0, 5));
    setAlterDialogOpen(true);
  };

  const submitAlter = () => {
    if (!newDate || !newTime) {
      toast.error("Please select date and time");
      return;
    }
    handleStatusUpdate(selectedAppointment.id, 'altered', { newDate, newTime });
    setAlterDialogOpen(false);
  };

  const startConsultation = (appointmentId: number) => {
    router.push(
      `/dashboard/doctor/consultation?appointmentId=${appointmentId}`,
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-blue-600 text-white border-none px-3 py-1 text-[10px] font-black tracking-widest uppercase">Consultation Manager</Badge>
            <div className="h-1 w-1 rounded-full bg-gray-300" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Review and respond to requests</p>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Manage <span className="text-blue-600">Appointments</span>
          </h1>
          <p className="text-gray-500 text-lg mt-3 font-medium">Coordinate with your patients and manage schedules</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          <span className="text-blue-700 font-black text-xs uppercase tracking-widest">Live Tracking Active</span>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 border-b p-8">
          <CardTitle className="flex items-center justify-between text-2xl font-black text-gray-900 tracking-tighter uppercase">
            <div className="flex items-center gap-3">
              <Clock className="h-7 w-7 text-blue-600" /> Recent Requests
            </div>
            {!loading && (
              <Badge variant="outline" className="border-2 text-blue-600 font-black px-3 py-1">{rows.length} Total</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-24 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Medical Queue...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-32 text-center">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Stethoscope className="h-12 w-12 text-gray-200" />
              </div>
              <p className="text-xl font-black text-gray-400 uppercase tracking-tighter">Queue is currently empty</p>
              <p className="text-gray-500 font-medium mt-2">New consultation requests will appear here in real-time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="border-b-2 hover:bg-transparent">
                    <TableHead className="py-6 px-8 font-black text-gray-700 uppercase tracking-widest text-[10px]">Patient & Session</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Schedule</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Symptoms</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Status</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Payment</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a: any) => (
                    <TableRow key={a.id} className="group hover:bg-blue-50/30 transition-all border-b last:border-0">
                      <TableCell className="py-8 px-8">
                        <div className="flex items-center gap-5">
                          <div className="bg-blue-100 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            {a.isVideoConsultation ? <Video className="h-7 w-7 text-blue-600" /> : <User className="h-7 w-7 text-blue-600" />}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-xl tracking-tighter leading-tight">{a.patientName ?? "—"}</p>
                            <Badge className={`mt-2 border-none font-black text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 shadow-sm ${
                              a.isVideoConsultation ? 'bg-indigo-600 text-white' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {a.isVideoConsultation ? "Video Call" : "Physical Visit"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-black text-gray-900 text-lg tracking-tighter">{fmtDate(a.appointmentDate)}</p>
                          <p className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                            <Clock className="h-3 w-3" /> {fmtTime(a.appointmentTime)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[240px]">
                          <p className="text-sm font-medium text-gray-500 line-clamp-2 leading-relaxed italic">
                            {a.symptoms ? `"${a.symptoms}"` : "No symptoms reported"}
                          </p>
                          {a.priority === 'high' && (
                            <Badge className="mt-2 bg-red-50 text-red-600 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 animate-pulse">Urgent Priority</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm ${
                          a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                          a.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                          a.status === 'completed' ? 'bg-blue-600 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {statusLabel(a.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm ${
                          a.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : a.paymentStatus === 'verification_pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {(a.paymentStatus ?? "pending").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8">
                        <div className="flex items-center justify-center gap-3">
                          {a.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-black text-[10px] h-11 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex-1"
                                onClick={() =>
                                  (a.paymentStatus === "verification_pending" || a.paymentStatus === "paid")
                                    ? handleStatusUpdate(a.id, 'accepted')
                                    : toast.error("Payment not submitted yet by patient")
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> ACCEPT
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-black text-[10px] h-11 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex-1"
                                onClick={() =>
                                  (a.paymentStatus === "verification_pending" || a.paymentStatus === "paid")
                                    ? openAlterDialog(a)
                                    : toast.error("Payment not submitted yet by patient")
                                }
                              >
                                <Edit3 className="h-4 w-4 mr-2" /> ALTER
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-black text-[10px] h-11 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex-1"
                                onClick={() => handleStatusUpdate(a.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> REJECT
                              </Button>
                            </>
                          ) : (
                            (a.status === 'accepted' || a.status === 'altered' || a.status === 'confirmed') && (
                              <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 font-black h-14 px-8 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 group/call w-full"
                                onClick={() => startConsultation(a.id)}
                              >
                                <Stethoscope className="h-5 w-5 mr-3 group-hover/call:rotate-12 transition-transform" /> START CONSULTATION
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alter Appointment Dialog */}
      <Dialog open={alterDialogOpen} onOpenChange={setAlterDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] p-10 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase text-gray-900">Propose Schedule</DialogTitle>
            <p className="text-gray-500 font-medium mt-2">Suggest an alternative date and time to the patient.</p>
          </DialogHeader>
          <div className="grid gap-8 py-8">
            <div className="space-y-3">
              <Label htmlFor="date" className="font-black uppercase tracking-widest text-[10px] text-gray-400">Proposed Date</Label>
              <Input
                id="date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-14 border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold text-lg"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="time" className="font-black uppercase tracking-widest text-[10px] text-gray-400">Proposed Time</Label>
              <Input
                id="time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-14 border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-bold text-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" onClick={() => setAlterDialogOpen(false)} className="h-14 px-8 font-black rounded-2xl border-2 transition-all active:scale-95">
              CANCEL
            </Button>
            <Button onClick={submitAlter} className="h-14 bg-blue-600 hover:bg-blue-700 font-black rounded-2xl flex-1 shadow-xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest text-xs">
              Send Proposal to Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
