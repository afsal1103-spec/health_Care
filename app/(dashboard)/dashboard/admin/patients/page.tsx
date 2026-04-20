'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Patient {
  id: number;
  name: string;
  mobile_no: string;
  email: string;
}

export default function AdminPatientsPage() {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: '', mobileNo: '', email: '', password: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'email' | 'mobile_no'>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams({
      search,
      sortBy,
      order,
      page: String(page),
      pageSize: String(pageSize),
    }).toString();
    const res = await fetch(`/api/admin/patients?${qs}`);
    const json = await res.json();
    setData(json.items || []);
    setTotal(json.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, order, page, pageSize]);

  const save = async () => {
    setLoading(true);
    try {
      if (editing) {
        const res = await fetch('/api/admin/patients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: form.name, mobileNo: form.mobileNo, email: form.email }),
        });
        if (res.ok) toast.success("Patient updated successfully");
        else toast.error("Failed to update patient");
      } else {
        const res = await fetch('/api/admin/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) toast.success("Patient added successfully");
        else toast.error("Failed to add patient");
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: '', mobileNo: '', email: '', password: '' });
      await load();
    } catch (e) {
      toast.error("An error occurred during save");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Are you sure you want to delete this patient?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patients?id=${id}`, { method: 'DELETE' });
      if (res.ok) toast.success("Patient deleted successfully");
      else toast.error("Failed to delete patient");
      await load();
    } catch (e) {
      toast.error("Error deleting patient");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (row: Patient) => {
    setEditing(row);
    setForm({ name: row.name, mobileNo: row.mobile_no || '', email: row.email || '', password: '' });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', mobileNo: '', email: '', password: '' });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Patients</CardTitle>
        <div className="flex items-center gap-2">
          <Input placeholder="Search name/email/mobile" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="w-64" />
          <select className="border rounded px-2 py-2" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="id">Sort: ID</option>
            <option value="name">Sort: Name</option>
            <option value="email">Sort: Email</option>
            <option value="mobile_no">Sort: Mobile</option>
          </select>
          <Button variant="outline" onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}>
            {order === 'asc' ? 'Asc' : 'Desc'}
          </Button>
          <select className="border rounded px-2 py-2" value={pageSize} onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <Button onClick={startCreate}>Add Patient</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="py-4">Loading...</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.mobile_no || '-'}</TableCell>
                <TableCell>{row.email || '-'}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(row.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {page} of {Math.max(1, Math.ceil(total / pageSize) || 1)} • {total} total
          </div>
          <div className="space-x-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" disabled={page >= Math.ceil((total || 0) / pageSize)} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
      {open && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{editing ? 'Edit Patient' : 'Add Patient'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Mobile Number" value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!editing && <Input placeholder="Temp Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Card>
  );
}
