'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, ClipboardList, Loader2, Package, Pill, QrCode, Search, UserRound } from 'lucide-react';

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

export default function MedicalistStockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get('patientId');
  const consultationId = searchParams.get('consultationId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [data, setData] = useState<StockPayload | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [qtyByMedicine, setQtyByMedicine] = useState<Record<string, number>>({});

  const [restockForm, setRestockForm] = useState({
    medicineName: '',
    quantity: '',
    unitPrice: '',
    lowStockThreshold: '10',
  });
  const [search, setSearch] = useState('');

  const fetchStockData = useCallback(
    async (searchText = '') => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchText.trim()) params.set('search', searchText.trim());
        if (patientId) params.set('patientId', patientId);
        if (consultationId) params.set('consultationId', consultationId);

        const res = await fetch(`/api/medicalist/stock?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || 'Failed to load stock data');
          setData({ error: json.error || 'Failed to load stock data' });
          return;
        }
        setData(json);
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

  const inventory = useMemo(() => data?.inventory || [], [data?.inventory]);
  const prescriptionItems = useMemo(() => data?.prescriptionItems || [], [data?.prescriptionItems]);

  const billItems = useMemo(() => {
    return Object.entries(qtyByMedicine)
      .filter(([_, qty]) => qty > 0)
      .map(([name, qty]) => {
        const pItem = prescriptionItems.find((i) => i.medicationName === name);
        const invItem = inventory.find((i) => i.medicineName === name);
        const unitPrice = pItem?.unitPrice || invItem?.unitPrice || 0;
        return { medicineName: name, qty, unitPrice, lineTotal: qty * unitPrice };
      });
  }, [qtyByMedicine, prescriptionItems, inventory]);

  const totalAmount = useMemo(() => billItems.reduce((acc, item) => acc + item.lineTotal, 0), [billItems]);

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
      {/* Header Card */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <Package className="h-6 w-6" />
                Pharmacy Stock & Dispensing
              </CardTitle>
              <CardDescription className="text-blue-100">
                Manage inventory and process patient prescriptions
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push('/dashboard/medicalist/patient-search')}
              className="font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              DISPENSE NOW
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Patient Specific Dispensing Section (Conditional) */}
      {patientId && !loading && data && !data.error && (
        <div className="grid xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-blue-600" />
                  Patient: {data.patient?.name || 'Loading...'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border bg-slate-50/50">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Consultation</p>
                  <p className="mt-1 font-bold text-slate-900">{data.consultation?.diagnosis || 'General'}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-slate-50/50">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Medical Store</p>
                  <p className="mt-1 font-bold text-slate-900">{data.medical?.name || 'Store'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-600" />
                  Prescribed Medicines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active prescription items for this consultation.</p>
                ) : (
                  prescriptionItems.map((item) => (
                    <div key={item.id} className="border rounded-2xl p-4 bg-white hover:border-emerald-200 transition-colors">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">{item.medicationName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Dose: {item.dosage || 'N/A'} | Duration: {item.duration || 'N/A'}
                          </p>
                        </div>
                        <Badge variant={item.stockQty <= 0 ? 'destructive' : 'outline'} className="font-bold h-fit">
                          Stock: {item.stockQty}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 mt-4">
                        <div>
                          <Label className="text-xs font-black uppercase text-muted-foreground">Rec. Qty</Label>
                          <Input value={item.recommendedQty} disabled className="bg-slate-50 font-bold" />
                        </div>
                        <div>
                          <Label className="text-xs font-black uppercase text-muted-foreground">Unit Price</Label>
                          <Input value={item.unitPrice || 0} disabled className="bg-slate-50 font-bold" />
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
                            className="border-emerald-200 focus:ring-emerald-500 font-black text-emerald-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl sticky top-6">
              <CardHeader className="border-b bg-emerald-50/50">
                <CardTitle className="font-black text-emerald-900">Bill Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {billItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select quantities to generate bill.</p>
                ) : (
                  <div className="space-y-2">
                    {billItems.map((item) => (
                      <div key={item.medicineName} className="flex justify-between text-sm">
                        <span className="font-medium">{item.medicineName} x {item.qty}</span>
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
                  className="w-full h-12 font-black bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  onClick={completeDispense}
                  disabled={saving || billItems.length === 0}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create QR Bill'}
                </Button>
              </CardContent>
            </Card>

            {checkout && (
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden border-t-8 border-t-blue-600">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="font-black flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-600" />
                    Scan to Pay
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-center">
                  <div className="p-3 rounded-2xl border bg-white inline-block">
                    <img src={checkout.qrCodeUrl} alt="QR" className="h-48 w-48 object-contain mx-auto" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-black">Payable Amount</span>
                    <span className="text-xl font-black text-blue-700">Rs {checkout.amount}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* STOCK MANAGEMENT SECTION (Always Visible) */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Inventory Management & MIS
        </h2>
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-400" />
                  Available Stocks MIS Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b flex gap-2 bg-slate-50">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      className="pl-9 bg-white"
                      placeholder="Filter by medicine name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchStockData(search)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => fetchStockData(search)} className="font-bold">
                    Filter
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b font-black">
                      <tr>
                        <th className="px-6 py-4">Medicine Name</th>
                        <th className="px-6 py-4 text-center">In Stock</th>
                        <th className="px-6 py-4 text-center">Unit Price</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                            {loading ? 'Loading inventory...' : 'No stock records found.'}
                          </td>
                        </tr>
                      ) : (
                        inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-black text-slate-900">{item.medicineName}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-700">
                              {item.quantity} Units
                            </td>
                            <td className="px-6 py-4 text-center font-black text-emerald-700">
                              Rs {Number(item.unitPrice || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant={item.isLowStock ? 'destructive' : 'outline'} className="font-bold">
                                {item.isLowStock ? 'Low Stock' : 'Sufficient'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-600 font-bold hover:bg-blue-50"
                                onClick={() => setRestockForm({
                                  medicineName: item.medicineName,
                                  quantity: '',
                                  unitPrice: String(item.unitPrice),
                                  lowStockThreshold: String(item.lowStockThreshold)
                                })}
                              >
                                Restock
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden border-2 border-blue-100">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-blue-900">
                  <Package className="h-5 w-5" />
                  Quick Restock Form
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-muted-foreground">Medicine Name</Label>
                  <Input
                    placeholder="Search/Add medicine..."
                    value={restockForm.medicineName}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, medicineName: e.target.value }))}
                    className="font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground">Add Qty</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 100"
                      value={restockForm.quantity}
                      onChange={(e) => setRestockForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground">Unit Price</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50"
                      value={restockForm.unitPrice}
                      onChange={(e) => setRestockForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                      className="font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-muted-foreground">Low Stock Alert at</Label>
                  <Input
                    type="number"
                    value={restockForm.lowStockThreshold}
                    onChange={(e) => setRestockForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))}
                    className="font-bold"
                  />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 font-black rounded-xl h-11 shadow-lg shadow-blue-200"
                  onClick={restockNow}
                  disabled={restockLoading}
                >
                  {restockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Inventory'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
