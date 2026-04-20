'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Receipt, CreditCard, Building2, UserCircle, AlertCircle, Upload, Camera, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";

interface Transaction {
  id: number;
  transactionCode: string;
  type: 'consultation' | 'medical';
  amount: number;
  paymentStatus: 'pending' | 'verification_pending' | 'paid' | 'failed' | 'rejected';
  description: string;
  createdAt: string;
  doctorName?: string;
  medicalName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentId?: number;
  manualUtr?: string;
}

interface CheckoutInfo {
  transactionId: number;
  transactionCode: string;
  amount: number;
  upiId: string;
  accountName: string;
  qrCodeUrl: string;
  paymentStatus: string;
}

export default function PatientTransactionsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineTx, setTimelineTx] = useState<Transaction | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [utr, setUtr] = useState("");
  const [proofDataUrl, setProofDataUrl] = useState("");

  useEffect(() => {
    const cached = getCachedValue<Transaction[]>("patient:transactions", 45_000);
    if (cached) {
      setTransactions(cached);
      setLoading(false);
    }
    fetchTransactions();
  }, []);

  useEffect(() => {
    router.prefetch("/dashboard/patient/appointments");
    router.prefetch("/dashboard/patient/book-appointment");
  }, [router]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/patients/transactions');
      if (res.ok) {
        const data = await res.json();
        const nextRows = Array.isArray(data) ? data : [];
        setTransactions(nextRows);
        setCachedValue("patient:transactions", nextRows);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch {
      toast.error("An error occurred while fetching transactions");
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = async (transactionId: number) => {
    try {
      const res = await fetch(`/api/checkout?transactionId=${transactionId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Unable to open payment flow");
        return;
      }
      setCheckoutInfo(data);
      setUtr("");
      setProofDataUrl("");
      setPayDialogOpen(true);
    } catch {
      toast.error("Failed to open payment flow");
    }
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large. Use up to 4MB.");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setProofDataUrl(dataUrl);
      toast.success("Payment proof attached");
    } catch {
      toast.error("Failed to read selected image");
    }
  };

  const submitPaymentForVerification = async () => {
    if (!checkoutInfo) return;
    if (!utr.trim()) {
      toast.error("Please enter UTR / transaction reference");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch("/api/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: checkoutInfo.transactionId,
          manualUtr: utr.trim(),
          paymentProofUrl: proofDataUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit payment");
        return;
      }

      toast.success("Payment submitted. Waiting for admin verification.");
      setPayDialogOpen(false);
      fetchTransactions();
      router.prefetch("/dashboard/patient/appointments");
    } catch {
      toast.error("Unable to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status: Transaction['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'verification_pending':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Verification Pending</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending Payment</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timelineSteps = (tx: Transaction) => {
    const createdAt = new Date(tx.createdAt);
    const base = [
      {
        title: "Transaction Created",
        detail: `${format(createdAt, "MMM dd, yyyy HH:mm")} - ${tx.transactionCode}`,
      },
    ];

    if (tx.paymentStatus === "pending") {
      base.push({ title: "Awaiting Payment", detail: "Please complete UPI payment and submit UTR." });
      return base;
    }

    base.push({
      title: "Payment Submitted",
      detail: tx.manualUtr ? `UTR: ${tx.manualUtr}` : "UTR submitted for verification",
    });

    if (tx.paymentStatus === "verification_pending") {
      base.push({ title: "Admin Verification", detail: "Waiting for admin approval." });
    } else if (tx.paymentStatus === "paid") {
      base.push({ title: "Payment Verified", detail: "Payment approved successfully." });
    } else if (tx.paymentStatus === "rejected" || tx.paymentStatus === "failed") {
      base.push({ title: "Payment Rejected", detail: "Please retry payment and re-submit UTR." });
    }

    return base;
  };

  return (
    <div
      className="p-6 space-y-6 max-w-7xl mx-auto rounded-3xl"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(248,250,252,0.96), rgba(248,250,252,0.96)), url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=60')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Billing & Transactions</h1>
          <p className="text-gray-500 font-medium">Manage payments and submit UTR for verification.</p>
        </div>
        <Button variant="outline" onClick={fetchTransactions} disabled={loading} className="font-black border-2 rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative">
          <CreditCard className="absolute top-[-10px] right-[-10px] h-32 w-32 text-white/10 rotate-12" />
          <CardHeader>
            <CardTitle className="text-white/80 font-black uppercase text-xs tracking-widest">Total Spent</CardTitle>
            <CardDescription className="text-3xl font-black text-white">
              INR {transactions.reduce((acc, curr) => curr.paymentStatus === 'paid' ? acc + Number(curr.amount) : acc, 0).toLocaleString()}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="border-none shadow-xl bg-white border-t-8 border-t-orange-500 overflow-hidden relative">
          <Loader2 className="absolute top-[-10px] right-[-10px] h-32 w-32 text-orange-500/5 rotate-12" />
          <CardHeader>
            <CardTitle className="text-gray-400 font-black uppercase text-xs tracking-widest">Pending Verification</CardTitle>
            <CardDescription className="text-3xl font-black text-gray-900">
              {transactions.filter(t => t.paymentStatus === 'verification_pending').length}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-xl bg-white border-t-8 border-t-green-500 overflow-hidden relative">
          <Receipt className="absolute top-[-10px] right-[-10px] h-32 w-32 text-green-500/5 rotate-12" />
          <CardHeader>
            <CardTitle className="text-gray-400 font-black uppercase text-xs tracking-widest">Completed Payments</CardTitle>
            <CardDescription className="text-3xl font-black text-gray-900">
              {transactions.filter(t => t.paymentStatus === 'paid').length}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <CardHeader className="p-8 border-b bg-gray-50/50">
          <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="font-black text-gray-400 animate-pulse">Loading your transaction history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center">
                <Receipt className="h-10 w-10 text-gray-300" />
              </div>
              <p className="font-black text-gray-400">No transactions found yet.</p>
              <Button onClick={() => router.push('/dashboard/patient/book-appointment')} className="bg-blue-600 hover:bg-blue-700 font-black rounded-xl px-8 h-12 shadow-lg shadow-blue-200">
                Book Your First Appointment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="font-black py-6 px-8 text-gray-600">ID & Details</TableHead>
                    <TableHead className="font-black text-gray-600">Type</TableHead>
                    <TableHead className="font-black text-gray-600">Recipient</TableHead>
                    <TableHead className="font-black text-gray-600">Amount</TableHead>
                    <TableHead className="font-black text-gray-600">Status</TableHead>
                    <TableHead className="font-black text-gray-600">Date</TableHead>
                    <TableHead className="font-black text-gray-600">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className="group hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-6 px-8">
                        <div className="space-y-1">
                          <p className="font-black text-blue-600 uppercase text-xs tracking-wider">{t.transactionCode}</p>
                          <p className="text-sm font-bold text-gray-700 line-clamp-1">{t.description}</p>
                          {t.manualUtr && (
                            <p className="text-[10px] font-black text-gray-400">UTR: {t.manualUtr}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {t.type === 'consultation' ? (
                            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <UserCircle className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                          <span className="font-bold text-gray-700 capitalize">{t.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-bold text-gray-800">{t.doctorName || t.medicalName || 'Healthcare+ Admin'}</p>
                          {t.appointmentDate && (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                              {format(new Date(t.appointmentDate), 'MMM dd, yyyy')} @ {t.appointmentTime}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-black text-gray-900">INR {Number(t.amount).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(t.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-bold text-gray-500">
                          {format(new Date(t.createdAt), 'MMM dd, HH:mm')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(t.paymentStatus === "pending" || t.paymentStatus === "rejected") && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 font-black rounded-lg"
                              onClick={() => openPaymentDialog(t.id)}
                            >
                              Complete Payment
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-black rounded-lg"
                            onClick={() => {
                              setTimelineTx(t);
                              setTimelineOpen(true);
                            }}
                          >
                            Timeline
                          </Button>
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

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Pay using your UPI app, then submit UTR for verification.
            </DialogDescription>
          </DialogHeader>

          {checkoutInfo && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center">
                  <img
                    src={checkoutInfo.qrCodeUrl}
                    alt="Payment QR"
                    className="w-56 h-56 rounded-lg border bg-white object-contain"
                  />
                  <p className="mt-3 font-black text-gray-700">INR {checkoutInfo.amount}</p>
                </div>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border bg-blue-50">
                    <p className="text-xs text-blue-700 font-bold">Recipient</p>
                    <p className="font-black text-blue-900">{checkoutInfo.accountName}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-blue-50">
                    <p className="text-xs text-blue-700 font-bold">UPI ID</p>
                    <p className="font-black text-blue-900">{checkoutInfo.upiId}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-amber-50 flex gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">
                      Enter the exact UTR from your payment app. Admin will verify before confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="utr">UTR / Transaction Reference</Label>
                <Input
                  id="utr"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="Example: 123456789012"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Proof (optional)</Label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Screenshot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleProofFileChange}
                />
                {proofDataUrl && (
                  <img src={proofDataUrl} alt="Payment proof preview" className="h-32 w-32 rounded-lg border object-cover" />
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPaymentForVerification} disabled={submittingPayment}>
              {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Timeline</DialogTitle>
            <DialogDescription>
              Track transaction progress step by step.
            </DialogDescription>
          </DialogHeader>
          {timelineTx && (
            <div className="space-y-4">
              {timelineSteps(timelineTx).map((step, idx) => (
                <div key={`${timelineTx.id}-${idx}`} className="flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500 font-medium">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimelineOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
