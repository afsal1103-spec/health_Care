'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Loader2, Package, Pill, QrCode, Search, UserRound } from 'lucide-react';

type InventoryItem = {
  id: number;
  medicineName: string;
  unitPrice: number;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
};

type PrescriptionItem = {
  id: number;
  medicationName: string;
  dosage?: string;
  duration?: string;
  instructions?: string;
  recommendedQty: number;
  stockQty: number;
  unitPrice: number;
};

type StockPayload = {
  medical?: { id: number; name: string; upiId?: string | null };
  patient?: { id: number; name?: string; mobileNo?: string; diagnosis?: string };
  consultation?: { id: number; diagnosis?: string; consultationDate?: string; doctorName?: string };
  prescriptionItems?: PrescriptionItem[];
  inventory?: InventoryItem[];
  error?: string;
};

type CheckoutPayload = {
  transactionId: number;
  transactionCode: string;
  amount: number;
  paymentStatus: string;
  upiId: string;
  accountName: string;
  qrCodeUrl: string;
};

export default function MedicalistPrescriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const consultationId = searchParams.get('consultationId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [data, setData] = useState<StockPayload | null>(null);
  const [qtyByMedicine, setQtyByMedicine] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [restockForm, setRestockForm] = useState({
    medicineName: '',
    quantity: '',
    unitPrice: '',
    lowStockThreshold: '10',
  });
  const [search, setSearch] = useState('');

  const fetchStockData = useCallback(
    async (searchText = '') => {
      if (!patientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ patientId });
        if (consultationId) params.set('consultationId', consultationId);
        if (searchText.trim()) params.set('search', searchText.trim());

        const res = await fetch(`/api/medicalist/stock?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || 'Failed to load stock data');
          setData({ error: json.error || 'Failed to load stock data' });
          return;
        }
        setData(json);

        const nextQty: Record<string, number> = {};
        for (const item of json.prescriptionItems || []) {
          const safeQty = Math.max(0, Math.min(Number(item.recommendedQty || 0), Number(item.stockQty || 0)));
          nextQty[item.medicationName] = safeQty || 0;
        }
        setQtyByMedicine(nextQty);
      } catch {
        toast.error('Unable to load stock data');
        setData({ error: 'Unable to load stock data' });
      } finally {
        setLoading(false);
      }
    },
    [patientId, consultationId],
  );

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  const prescriptionItems = useMemo(() => data?.prescriptionItems || [], [data?.prescriptionItems]);
  const inventory = useMemo(() => data?.inventory || [], [data?.inventory]);

  const billItems = useMemo(
    () =>
      prescriptionItems
        .map((item) => {
          const qty = Number(qtyByMedicine[item.medicationName] || 0);
          const unit = Number(item.unitPrice || 0);
          return {
            medicineName: item.medicationName,
            qty,
            unitPrice: unit,
            lineTotal: Number((qty * unit).toFixed(2)),
          };
        })
        .filter((item) => item.qty > 0),
    [prescriptionItems, qtyByMedicine],
  );

  const totalAmount = useMemo(
    () => Number(billItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
    [billItems],
  );

  const restockNow = async () => {
    const medicineName = restockForm.medicineName.trim();
    const quantity = Number(restockForm.quantity || 0);
    const unitPrice = Number(restockForm.unitPrice || 0);
    const lowStockThreshold = Number(restockForm.lowStockThreshold || 10);

    if (!medicineName) {
      toast.error('Medicine name is required');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter valid restock quantity');
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast.error('Enter valid unit price');
      return;
    }

    setRestockLoading(true);
    try {
      const res = await fetch('/api/medicalist/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName, quantity, unitPrice, lowStockThreshold }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to restock');
        return;
      }

      toast.success('Stock updated successfully');
      setRestockForm((prev) => ({ ...prev, medicineName: '', quantity: '', unitPrice: '' }));
      await fetchStockData(search);
    } catch {
      toast.error('Failed to restock');
    } finally {
      setRestockLoading(false);
    }
  };

  const completeDispense = async () => {
    if (!patientId || !consultationId) {
      toast.error('Patient and consultation are required');
      return;
    }
    if (!billItems.length) {
      toast.error('Select at least one medicine quantity');
      return;
    }
    if (billItems.some((item) => item.unitPrice <= 0)) {
      toast.error('One or more medicines has invalid price. Restock with unit price first.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/medicalist/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: Number(patientId),
          consultationId: Number(consultationId),
          items: billItems.map((item) => ({ medicineName: item.medicineName, quantity: item.qty })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to create dispense bill');
        return;
      }

      setCheckout(json.checkout);
      toast.success('Bill created. Patient can now scan and pay.');
      await fetchStockData(search);
    } catch {
      toast.error('Failed to complete dispensing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Stock & Dispense
          </CardTitle>
          <CardDescription>
            Dispense from latest consultation prescription, auto-calculate total, and show QR for patient payment.
          </CardDescription>
        </CardHeader>
      </Card>

      {!patientId && (
        <Card className="border-dashed border-2 rounded-3xl">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground font-medium">
              Open this page from Patient Search by selecting a consultation.
            </p>
            <Button onClick={() => router.push('/dashboard/medicalist/patient-search')} className="font-bold">
              Go To Patient Search
            </Button>
          </CardContent>
        </Card>
      )}

      {patientId && loading && (
        <Card className="rounded-3xl">
          <CardContent className="py-14 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading stock and prescription details...
          </CardContent>
        </Card>
      )}

      {patientId && !loading && data?.error && (
        <Card className="border-red-200 bg-red-50 rounded-3xl">
          <CardContent className="py-5 text-red-700 font-semibold">{data.error}</CardContent>
        </Card>
      )}

      {patientId && !loading && data && !data.error && (
        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-none shadow-lg rounded-3xl">
              <CardContent className="pt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border bg-slate-50">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Patient</p>
                  <p className="mt-1 font-black text-slate-900 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-blue-600" />
                    {data.patient?.name || 'Unknown'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border bg-slate-50">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Consultation</p>
                  <p className="mt-1 font-bold text-slate-900">{data.consultation?.diagnosis || 'General'}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-slate-50">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Medical Store</p>
                  <p className="mt-1 font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    {data.medical?.name || 'Store'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-600" />
                  Prescription Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active prescription items found for this consultation.</p>
                ) : (
                  prescriptionItems.map((item) => (
                    <div key={item.id} className="border rounded-2xl p-4 bg-white">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">{item.medicationName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Dose: {item.dosage || 'N/A'} | Duration: {item.duration || 'N/A'}
                          </p>
                        </div>
                        <Badge variant={item.stockQty <= 0 ? 'destructive' : 'outline'} className="font-bold">
                          Stock: {item.stockQty}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 mt-4">
                        <div>
                          <Label className="text-xs font-black uppercase text-muted-foreground">Recommended Qty</Label>
                          <Input value={item.recommendedQty} disabled />
                        </div>
                        <div>
                          <Label className="text-xs font-black uppercase text-muted-foreground">Unit Price</Label>
                          <Input value={item.unitPrice || 0} disabled />
                        </div>
                        <div>
                          <Label className="text-xs font-black uppercase text-muted-foreground">Dispense Qty</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.stockQty}
                            value={qtyByMedicine[item.medicationName] || 0}
                            onChange={(e) =>
                              setQtyByMedicine((prev) => ({
                                ...prev,
                                [item.medicationName]: Math.max(0, Math.min(Number(e.target.value || 0), item.stockQty)),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black">Current Stock & Restock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-[1fr_120px_120px_120px_auto] gap-2">
                  <Input
                    placeholder="Medicine name"
                    value={restockForm.medicineName}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, medicineName: e.target.value }))}
                  />
                  <Input
                    placeholder="Qty"
                    type="number"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                  <Input
                    placeholder="Unit Rs"
                    type="number"
                    value={restockForm.unitPrice}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  />
                  <Input
                    placeholder="Low"
                    type="number"
                    value={restockForm.lowStockThreshold}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
                  />
                  <Button onClick={restockNow} disabled={restockLoading} className="font-bold">
                    {restockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restock'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      className="pl-9"
                      placeholder="Search stock..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => fetchStockData(search)}>
                    Filter
                  </Button>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                  {inventory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stock records yet.</p>
                  ) : (
                    inventory.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl border bg-slate-50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{item.medicineName}</p>
                          <p className="text-xs text-muted-foreground">Rs {Number(item.unitPrice || 0)} per unit</p>
                        </div>
                        <Badge variant={item.isLowStock ? 'destructive' : 'outline'}>
                          Qty {item.quantity}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl sticky top-6">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="font-black">Bill Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {billItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No medicines selected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {billItems.map((item) => (
                      <div key={item.medicineName} className="flex justify-between text-sm">
                        <span className="font-medium">
                          {item.medicineName} x {item.qty}
                        </span>
                        <span className="font-bold">Rs {item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="font-black text-slate-900">Total</span>
                  <span className="text-2xl font-black text-emerald-700">Rs {totalAmount.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full h-12 font-black bg-emerald-600 hover:bg-emerald-700"
                  onClick={completeDispense}
                  disabled={saving || billItems.length === 0}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete & Generate QR'}
                </Button>
              </CardContent>
            </Card>

            {checkout && (
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden border-t-8 border-t-blue-600">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="font-black flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-600" />
                    Patient Scan & Pay
                  </CardTitle>
                  <CardDescription>
                    Transaction: {checkout.transactionCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="p-3 rounded-xl border bg-white flex justify-center">
                    <img src={checkout.qrCodeUrl} alt="Medical payment QR" className="h-56 w-56 object-contain" />
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border">
                    <p className="text-xs text-blue-700 font-black uppercase tracking-widest">Pay To</p>
                    <p className="text-sm font-black text-blue-900">{checkout.accountName}</p>
                    <p className="text-xs text-blue-800 mt-1">UPI: {checkout.upiId}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black">Amount</span>
                    <span className="text-xl font-black text-blue-700">Rs {checkout.amount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Ask patient to scan this QR now. Payment status will update once patient submits UTR from their account.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
