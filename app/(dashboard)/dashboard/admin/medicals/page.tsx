"use client";

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Phone, Building2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';

interface Medical {
  id: number;
  name: string;
  contact: string;
  address: string;
  isApproved: boolean;
}

export default function AdminMedicalsPage() {
  const [data, setData] = useState<Medical[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', contact: '', address: '', latitude: '', longitude: '' });

  const load = async () => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/medicals${qs}`);
    const json = await res.json();
    setData(json || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [search]);

  const toggleApproval = async (id: number, currentStatus: boolean) => {
    setLoading(true);
    const res = await fetch('/api/medicals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_approved: !currentStatus }),
    });
    if (res.ok) {
      toast.success(`Medical ${!currentStatus ? 'approved' : 'unapproved'} successfully`);
      load();
    } else {
      toast.error("Failed to update status");
    }
    setLoading(false);
  };

  const save = async () => {
    if (!form.name || !form.address) {
      toast.error("Name and Address are required");
      return;
    }
    setLoading(true);
    const res = await fetch('/api/medicals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      }),
    });
    if (res.ok) {
      toast.success("Medical added successfully");
      setForm({ name: '', contact: '', address: '', latitude: '', longitude: '' });
      load();
    } else {
      toast.error("Failed to add medical");
    }
    setLoading(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    setLoading(true);
    await fetch(`/api/medicals?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Medical List Management</h1>
          <p className="text-gray-500 text-lg">Manage registered pharmacies and medical stores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Medical Form */}
        <Card className="border-none shadow-xl rounded-3xl h-fit sticky top-6">
          <CardHeader className="bg-blue-600 text-white rounded-t-3xl">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add New Medical
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400">Store Name</label>
              <Input 
                placeholder="HealthPlus Medicals" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                className="h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400">Contact Number</label>
              <Input 
                placeholder="9876543210" 
                value={form.contact} 
                onChange={(e) => setForm({ ...form, contact: e.target.value })} 
                className="h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400">Full Address</label>
              <Input 
                placeholder="City, State, ZIP" 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                className="h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400">Latitude</label>
                <Input 
                  placeholder="e.g. 23.8103" 
                  value={form.latitude} 
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })} 
                  className="h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400">Longitude</label>
                <Input 
                  placeholder="e.g. 90.4125" 
                  value={form.longitude} 
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })} 
                  className="h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            <Button 
              onClick={save} 
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black text-lg rounded-xl shadow-lg shadow-blue-200 mt-4"
              disabled={loading}
            >
              Save Store
            </Button>
          </CardContent>
        </Card>

        {/* Medical List */}
        <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" /> Registered Stores
            </CardTitle>
            <Input 
              placeholder="Search stores..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-64 h-10 border-2 rounded-xl"
            />
          </CardHeader>
          <CardContent className="p-0">
            {loading && <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
            {!loading && data.length === 0 && <div className="py-24 text-center text-gray-400 font-bold">No stores found.</div>}
            {!loading && data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-black py-6 px-8">Store Details</TableHead>
                      <TableHead className="font-black">Contact</TableHead>
                      <TableHead className="font-black">Status</TableHead>
                      <TableHead className="font-black text-right pr-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-colors">
                        <TableCell className="py-6 px-8">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-xl group-hover:scale-110 transition-transform">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{row.name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" /> {row.address}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-blue-400" /> {row.contact}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.isApproved ? "default" : "secondary"} className={row.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                            {row.isApproved ? "Approved" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={row.isApproved ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                              onClick={() => toggleApproval(row.id, row.isApproved)}
                              title={row.isApproved ? "Revoke Approval" : "Approve Store"}
                            >
                              {row.isApproved ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => remove(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
}
