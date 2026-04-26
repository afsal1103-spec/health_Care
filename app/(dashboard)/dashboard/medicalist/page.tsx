'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, IndianRupee, Pill, QrCode, Search } from 'lucide-react';
import Link from 'next/link';

type PaymentRow = {
  id: number;
  transactionCode: string;
  amount: number;
  paymentStatus: string;
  patientName: string;
  qrCodeUrl?: string | null;
  createdAt: string;
};

type PaymentPayload = {
  medical?: { id: number; name: string };
  summary?: { pending: number; verificationPending: number; paid: number };
  payments?: PaymentRow[];
};

export default function MedicalistDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<PaymentPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/medicalist/payments');
        const json = await res.json();
        if (res.ok) setData(json);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingRows = (data?.payments || []).filter((row) => row.paymentStatus === 'pending').slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Welcome, {session?.user?.roleDetails?.name || 'Medicalist'}</h1>
        <p className="text-gray-500 font-medium">
          Manage stock, dispense medicines, and collect patient payments with live QR flow.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none shadow-xl rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Pending QR Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">{data?.summary?.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Waiting for patient scan/payment</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Verification Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{data?.summary?.verificationPending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Patient submitted UTR, awaiting admin</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">Paid Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{data?.summary?.paid || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed medical transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <Card className="border-none shadow-lg rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Search</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">Find</div>
            <p className="text-xs text-muted-foreground">Lookup by patient ID and open latest prescription</p>
            <Button asChild className="w-full mt-4 font-bold" size="sm">
              <Link href="/dashboard/medicalist/patient-search">Search Patient</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Inventory</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">Manage</div>
            <p className="text-xs text-muted-foreground">Restock medicines and update unit prices</p>
            <Button asChild variant="outline" className="w-full mt-4 font-bold" size="sm">
              <Link href="/dashboard/medicalist/prescriptions">Open Stock Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-3xl">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            Live Patient Scan Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading payment queue...</p>
          ) : pendingRows.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No pending QR payments right now.
            </div>
          ) : (
            pendingRows.map((row) => (
              <div key={row.id} className="p-4 rounded-2xl border bg-white flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <p className="font-black text-slate-900">{row.patientName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {row.transactionCode} | Rs {Number(row.amount || 0).toFixed(2)}
                  </p>
                  <Badge className="mt-2 bg-orange-100 text-orange-700 border-orange-200">Pending Scan</Badge>
                </div>
                {row.qrCodeUrl ? (
                  <img src={row.qrCodeUrl} alt={`QR ${row.transactionCode}`} className="h-24 w-24 rounded-lg border bg-white object-contain" />
                ) : (
                  <div className="text-xs text-red-600 font-semibold">
                    UPI missing. Update profile.
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5" />
            <p className="font-black text-lg">{data?.medical?.name || 'Linked Medical Store'}</p>
          </div>
          <p className="text-blue-100 text-sm">
            Every dispense creates a medical transaction and patient can complete payment from their transactions page.
          </p>
          <div className="mt-4 flex items-center gap-2 text-blue-50 font-semibold">
            <IndianRupee className="h-4 w-4" />
            Fully connected pharmacy billing flow is active.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
