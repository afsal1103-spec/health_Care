"use client";

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Clock, 
  User,
  ImageIcon,
  ShieldAlert
} from "lucide-react";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getCachedValue, setCachedValue } from "@/lib/client-cache";

interface Transaction {
  id: number;
  transactionCode: string;
  patientName: string;
  type: string;
  amount: number;
  paymentStatus: string;
  manualUtr: string;
  paymentProofUrl: string;
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [proofOpen, setProofOpen] = useState(false);
  const [proofImage, setProofImage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions');
      const json = await res.json();
      const nextRows = Array.isArray(json) ? json : [];
      setData(nextRows);
      setCachedValue("admin:transactions", nextRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedValue<Transaction[]>("admin:transactions", 30_000);
    if (cached) {
      setData(cached);
    }
    load();
  }, []);

  const verifyPayment = async (id: number, status: 'paid' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Payment ${status === 'paid' ? 'verified' : 'rejected'} successfully`);
        const next = data.map((row) =>
          row.id === id ? { ...row, paymentStatus: status } : row
        );
        setData(next);
        setCachedValue("admin:transactions", next);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filtered = data.filter(t => 
    t.transactionCode.toLowerCase().includes(search.toLowerCase()) ||
    t.patientName.toLowerCase().includes(search.toLowerCase()) ||
    (t.manualUtr && t.manualUtr.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Payment Verification</h1>
          <p className="text-gray-500 text-lg">Approve manual UPI payments and verify UTR numbers</p>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b p-8 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-orange-600" /> Pending Verification
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by Code or UTR..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 h-10 border-2 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          {!loading && filtered.length === 0 && <div className="py-24 text-center text-gray-400 font-bold">No transactions found.</div>}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-black py-6 px-8">Transaction</TableHead>
                    <TableHead className="font-black">Patient</TableHead>
                    <TableHead className="font-black">Amount</TableHead>
                    <TableHead className="font-black">Payment Details</TableHead>
                    <TableHead className="font-black">Status</TableHead>
                    <TableHead className="font-black text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-orange-50/30 transition-colors">
                      <TableCell className="py-6 px-8">
                        <div className="space-y-1">
                          <p className="font-black text-blue-600 uppercase text-xs">{row.transactionCode}</p>
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(row.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                          <User className="h-4 w-4 text-gray-400" /> {row.patientName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-black text-gray-900">
                          <IndianRupee className="h-4 w-4 text-green-600" /> {row.amount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.manualUtr ? (
                          <div className="space-y-1">
                            <p className="text-xs font-black text-gray-700">UTR: {row.manualUtr}</p>
                            {row.paymentProofUrl && (
                              <button
                                onClick={() => {
                                  setProofImage(row.paymentProofUrl);
                                  setProofOpen(true);
                                }}
                                className="text-[10px] text-blue-500 font-black flex items-center gap-1 hover:underline"
                              >
                                View Proof <ImageIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No proof submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={row.paymentStatus === 'paid' ? 'default' : row.paymentStatus === 'verification_pending' ? 'secondary' : 'destructive'}
                          className={`
                            ${row.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 
                              row.paymentStatus === 'verification_pending' ? 'bg-orange-100 text-orange-700' : 
                              'bg-gray-100 text-gray-700'}
                            font-black uppercase text-[10px] tracking-widest px-3 py-1
                          `}
                        >
                          {row.paymentStatus.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          {row.paymentStatus === 'verification_pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:bg-green-50 font-black text-[10px] uppercase gap-2"
                                onClick={() => verifyPayment(row.id, 'paid')}
                              >
                                <CheckCircle2 className="h-4 w-4" /> Verify
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:bg-red-50 font-black text-[10px] uppercase gap-2"
                                onClick={() => verifyPayment(row.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" /> Reject
                              </Button>
                            </>
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

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Screenshot uploaded by patient for UTR verification.
            </DialogDescription>
          </DialogHeader>
          {proofImage ? (
            <div className="rounded-xl border bg-slate-50 p-3">
              <img src={proofImage} alt="Payment proof" className="w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">No proof image available.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
