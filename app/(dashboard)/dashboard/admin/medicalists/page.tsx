"use client";

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner";
import { UserCheck, UserX, Search, ShieldCheck, Mail, Building2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';

interface Medicalist {
  id: number;
  userId: number;
  name: string;
  email: string;
  contact: string;
  department: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  medicalName?: string;
}

export default function AdminMedicalistsPage() {
  const [data, setData] = useState<Medicalist[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/medicalists${qs}`);
    const json = await res.json();
    setData(json || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [search]);

  const updateStatus = async (id: number, status: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/medicalists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approval_status: status }),
    });
    if (res.ok) {
      toast.success(`Medicalist account ${status} successfully`);
      load();
    } else {
      toast.error("Failed to update status");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Medicalist Verification</h1>
          <p className="text-gray-500 text-lg">Approve or reject medical store operator accounts</p>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b p-8 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" /> Pending Verification
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by name or email..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 h-10 border-2 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          {!loading && data.length === 0 && <div className="py-24 text-center text-gray-400 font-bold">No medicalist accounts found.</div>}
          {!loading && data.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-black py-6 px-8">Medicalist Details</TableHead>
                    <TableHead className="font-black">Contact Info</TableHead>
                    <TableHead className="font-black">Status</TableHead>
                    <TableHead className="font-black text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-purple-50/30 transition-colors">
                      <TableCell className="py-6 px-8">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-100 p-2 rounded-xl group-hover:scale-110 transition-transform">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{row.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Building2 className="h-3 w-3" /> {row.medicalName || row.department || "Independent"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Mail className="h-3 w-3 text-purple-400" /> {row.email}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">{row.contact}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={row.approvalStatus === 'approved' ? "default" : row.approvalStatus === 'rejected' ? "destructive" : "secondary"}
                          className={
                            row.approvalStatus === 'approved' ? "bg-green-100 text-green-700" : 
                            row.approvalStatus === 'rejected' ? "bg-red-100 text-red-700" : 
                            "bg-yellow-100 text-yellow-700"
                          }
                        >
                          {row.approvalStatus.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          {row.approvalStatus !== 'approved' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 font-black uppercase text-[10px] tracking-widest gap-2"
                              onClick={() => updateStatus(row.id, 'approved')}
                            >
                              <UserCheck className="h-4 w-4" /> Approve
                            </Button>
                          )}
                          {row.approvalStatus !== 'rejected' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest gap-2"
                              onClick={() => updateStatus(row.id, 'rejected')}
                            >
                              <UserX className="h-4 w-4" /> Reject
                            </Button>
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
    </div>
  );
}
