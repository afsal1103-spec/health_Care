'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Doctor {
  id: number;
  name: string;
  specialist: string;
  education: string;
  email: string;
  doctorRegistrationNumber?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export default function AdminDoctorsPage() {
  const [data, setData] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ 
    name: '', email: '', mobileNo: '', specialist: '', education: '', 
    password: '', doctorRegistrationNumber: '', address: '' 
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'specialist' | 'education' | 'email' | 'status'>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      search,
      status: statusFilter,
      sortBy,
      order,
      page: String(page),
      pageSize: String(pageSize),
    }).toString();
    const res = await fetch(`/api/admin/doctors?${qs}`);
    const json = await res.json();
    setData(json.items || []);
    setTotal(json.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortBy, order, page, pageSize]);

  const updateStatus = async (id: number, status: string) => {
    setLoading(true);
    await fetch('/api/admin/doctors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  const save = async () => {
    setLoading(true);
    if (editing) {
      await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editing.id, 
          name: form.name, 
          email: form.email, 
          specialist: form.specialist, 
          education: form.education,
          doctorRegistrationNumber: form.doctorRegistrationNumber,
          address: form.address
        }),
      });
    } else {
      await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setOpen(false);
    setEditing(null);
    setForm({ 
      name: '', email: '', mobileNo: '', specialist: '', education: '', 
      password: '', doctorRegistrationNumber: '', address: '' 
    });
    await load();
  };

  const remove = async (id: number) => {
    setLoading(true);
    await fetch(`/api/admin/doctors?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const startEdit = (row: Doctor) => {
    setEditing(row);
    setForm({ 
      name: row.name, email: row.email || '', mobileNo: '', 
      specialist: row.specialist || '', education: row.education || '', 
      password: '', doctorRegistrationNumber: row.doctorRegistrationNumber || '',
      address: '' 
    });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm({ 
      name: '', email: '', mobileNo: '', specialist: '', education: '', 
      password: '', doctorRegistrationNumber: '', address: '' 
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-2xl font-bold">Doctor Management</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input 
                placeholder="Search..." 
                value={search} 
                onChange={(e) => { setPage(1); setSearch(e.target.value); }} 
                className="w-full md:w-64 bg-white" 
              />
              <select 
                className="border rounded px-3 py-2 bg-white" 
                value={statusFilter} 
                onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">Add Doctor</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && <div className="py-4 text-center text-blue-600 font-medium">Updating...</div>}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Doctor Info</TableHead>
                  <TableHead>Specialist</TableHead>
                  <TableHead>Reg Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium">#{row.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{row.name}</span>
                        <span className="text-xs text-gray-500">{row.email}</span>
                        <span className="text-xs text-blue-600 italic">{row.education}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                        {row.specialist || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.doctorRegistrationNumber || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                        row.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                        row.approvalStatus === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {row.approvalStatus.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {row.approvalStatus === 'pending' && (
                        <>
                          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(row.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(row.id, 'rejected')}>Reject</Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(row.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)} • {total} total
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil((total || 0) / pageSize)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {open && (
        <Card className="border-t-4 border-t-blue-600 shadow-xl">
          <CardHeader>
            <CardTitle>{editing ? 'Edit Doctor Details' : 'Register New Doctor'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Dr. John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input placeholder="doctor@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Specialization</label>
                <Input placeholder="Cardiologist" value={form.specialist} onChange={(e) => setForm({ ...form, specialist: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Education</label>
                <Input placeholder="MBBS, MD" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Registration Number</label>
                <Input placeholder="REG123456" value={form.doctorRegistrationNumber} onChange={(e) => setForm({ ...form, doctorRegistrationNumber: e.target.value })} />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input placeholder="Temp Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">Save Doctor</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
