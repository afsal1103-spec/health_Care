"use client";

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Clock, User, Stethoscope, Filter } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Appointment {
  id: number;
  appointmentCode: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  priority: string;
}

export default function MasterAppointmentsPage() {
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments'); // Existing appointments API
      const json = await res.json();
      let filtered = json || [];
      
      if (search) {
        filtered = filtered.filter((a: Appointment) => 
          a.patientName.toLowerCase().includes(search.toLowerCase()) ||
          a.doctorName.toLowerCase().includes(search.toLowerCase()) ||
          a.appointmentCode.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter((a: Appointment) => a.status === statusFilter);
      }

      setData(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Master Schedule</h1>
          <p className="text-gray-500 text-lg">Centralized view of all doctor appointments</p>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> All Appointments
          </CardTitle>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search patient, doctor..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10 h-10 border-2 rounded-xl w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-10 border-2 rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          {!loading && data.length === 0 && <div className="py-24 text-center text-gray-400 font-bold">No appointments found.</div>}
          {!loading && data.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-black py-6 px-8">Appointment ID</TableHead>
                    <TableHead className="font-black">Patient</TableHead>
                    <TableHead className="font-black">Doctor</TableHead>
                    <TableHead className="font-black">Schedule</TableHead>
                    <TableHead className="font-black">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-colors">
                      <TableCell className="py-6 px-8">
                        <span className="font-black text-blue-600">{row.appointmentCode}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-bold text-gray-900">{row.patientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-blue-400" />
                          <span className="font-bold text-gray-900">Dr. {row.doctorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Calendar className="h-3 w-3" /> {new Date(row.appointmentDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> {row.appointmentTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`
                          ${row.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                            row.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-gray-100 text-gray-700'}
                          font-black uppercase text-[10px] tracking-widest px-3 py-1
                        `}>
                          {row.status}
                        </Badge>
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
