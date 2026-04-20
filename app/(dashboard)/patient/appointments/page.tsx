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
import { Copy, Check, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";

interface Appointment {
  id: number;
  appointmentCode: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  doctorSpecialist: string;
  symptoms: string;
  status: string;
  paymentStatus?: string;
  transactionId?: number;
}

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
    return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return t;
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100   text-blue-700   border-blue-200",
  completed: "bg-green-100  text-green-700  border-green-200",
  cancelled: "bg-red-100    text-red-700    border-red-200",
  no_show: "bg-gray-100   text-gray-600   border-gray-200",
};

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Appointment code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-gray-400 hover:text-primary transition-colors"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = getCachedValue<Appointment[]>("patient:appointments", 45_000);
    if (cached) {
      setRows(cached);
    }

    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/appointments");
        if (r.ok) {
          const j = await r.json();
          const nextRows = Array.isArray(j) ? j : [];
          setRows(nextRows);
          setCachedValue("patient:appointments", nextRows);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    router.prefetch("/dashboard/patient/consultation");
    router.prefetch("/dashboard/patient/transactions");
  }, [router]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-blue-600 text-white border-none px-3 py-1 text-[10px] font-black tracking-widest uppercase">Consultation History</Badge>
            <div className="h-1 w-1 rounded-full bg-gray-300" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Your scheduled visits</p>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            My <span className="text-blue-600">Appointments</span>
          </h1>
          <p className="text-gray-500 text-lg mt-3 font-medium">Manage your consultations and appointment codes</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 flex items-center gap-4 max-w-sm">
          <div className="bg-white p-2 rounded-xl shadow-sm">
            <Check className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-xs font-bold text-blue-700 leading-tight">
            Share your <span className="font-black underline">Appointment Code</span> with the doctor to start your session.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/80 border-b p-8">
          <CardTitle className="flex items-center justify-between text-2xl font-black text-gray-900 tracking-tighter uppercase">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-7 w-7 text-blue-600" /> Appointment List
            </div>
            {!loading && (
              <Badge variant="outline" className="border-2 text-blue-600 font-black px-3 py-1">{rows.length} Total</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Schedule...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-24 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarDays className="h-10 w-10 text-gray-200" />
              </div>
              <p className="text-xl font-black text-gray-400 uppercase tracking-tighter">No appointments found</p>
              <p className="text-gray-500 font-medium mt-2">Book an appointment to get started with your healthcare journey.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-b-2">
                    <TableHead className="py-6 px-8 font-black text-gray-700 uppercase tracking-widest text-[10px]">Reference Code</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Schedule</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Specialist</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Symptoms</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Status</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px]">Payment</TableHead>
                    <TableHead className="font-black text-gray-700 uppercase tracking-widest text-[10px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id} className="group hover:bg-blue-50/30 transition-all border-b last:border-0">
                      <TableCell className="py-8 px-8">
                        <div className="flex items-center gap-3">
                          <div className="font-mono font-black text-blue-600 bg-blue-50 border-2 border-blue-100 rounded-xl px-4 py-2 text-base tracking-widest shadow-sm">
                            {a.appointmentCode ?? "—"}
                          </div>
                          {a.appointmentCode && (
                            <CopyCodeButton code={a.appointmentCode} />
                          )}
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
                        <div className="space-y-1">
                          <p className="font-black text-gray-900 leading-none">{a.doctorName ? `Dr. ${a.doctorName}` : "—"}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{a.doctorSpecialist ?? "General"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm font-medium text-gray-500 max-w-40 truncate italic">
                          {a.symptoms ? `"${a.symptoms}"` : "No symptoms reported"}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge className={`border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm ${
                          a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                          a.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                          a.status === 'completed' ? 'bg-blue-600 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {(a.status ?? "").replace("_", " ")}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={`border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm ${
                          a.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : a.paymentStatus === "verification_pending"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {(a.paymentStatus ?? "pending").replace("_", " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-8">
                        {(a.paymentStatus === "pending" || a.paymentStatus === "rejected") && (
                          <Button 
                            asChild
                            variant="outline"
                            className="w-full border-blue-600 text-blue-700 hover:bg-blue-50 font-black text-[10px] h-11 px-4 rounded-xl uppercase tracking-widest"
                          >
                            <Link href={`/dashboard/patient/transactions`}>
                              Complete Payment
                            </Link>
                          </Button>
                        )}

                        {(a.paymentStatus === "paid" || a.paymentStatus === "verification_pending") &&
                          (a.status === 'accepted' || a.status === 'altered' || a.status === 'confirmed') && (
                          <Button 
                            asChild
                            className="w-full bg-blue-600 hover:bg-blue-700 font-black text-[10px] h-11 px-4 rounded-xl transition-all shadow-lg shadow-blue-100 uppercase tracking-widest"
                          >
                            <Link href={`/dashboard/patient/consultation?appointmentId=${a.id}`}>
                              Join Consultation
                            </Link>
                          </Button>
                          )}
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
