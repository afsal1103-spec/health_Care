'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, ClipboardList, Pill, Search, Stethoscope, UserRound } from 'lucide-react';

type Prescription = {
  id: number;
  medicationName?: string;
  dosage?: string;
  duration?: string;
  instructions?: string;
};

type Consultation = {
  id: number;
  diagnosis?: string;
  symptomsObserved?: string;
  notes?: string;
  consultationDate?: string;
  doctorName?: string;
  doctorSpecialist?: string;
  prescriptions?: Prescription[];
};

type Appointment = {
  id: number;
  appointmentDate?: string;
  appointmentTime?: string;
  status?: string;
  doctorName?: string;
  doctorSpecialist?: string;
  symptoms?: string;
};

type Transaction = {
  id: number;
  type?: string;
  amount?: number | string;
  paymentStatus?: string;
  transactionDate?: string;
  description?: string;
};

type PatientSearchResponse = {
  patient?: {
    id?: number;
    name?: string;
    diagnosis?: string;
    mobileNo?: string;
  };
  consultations?: Consultation[];
  appointments?: Appointment[];
  transactions?: Transaction[];
  selectedDate?: string | null;
  error?: string;
};

export default function MedicalistPatientSearchPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState<PatientSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const normalizedId = patientId.trim();
    if (!normalizedId) {
      toast.error('Enter a patient ID');
      return;
    }
    if (!/^\d+$/.test(normalizedId)) {
      toast.error('Patient ID must be a number');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ patientId: normalizedId });
      if (selectedDate) {
        params.set('date', selectedDate);
      }

      const r = await fetch(`/api/patients/search?${params.toString()}`);
      const j = await r.json();
      if (r.ok) {
        setData(j);
      } else {
        setData({ error: j.error || 'Patient not found' });
      }
    } catch {
      setData({ error: 'Search failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const consultations = data?.consultations || [];
  const appointments = data?.appointments || [];
  const transactions = data?.transactions || [];
  const patient = data?.patient;

  const renderText = (value: unknown, fallback = 'Not available') =>
    String(value ?? '').trim() || fallback;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Search className="h-6 w-6 text-blue-600" />
            Pharmacy Patient Search
          </CardTitle>
          <CardDescription>
            Enter patient ID to view consultation history and prescriptions in one flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-[1fr_220px_120px] gap-3">
            <Input
              placeholder="Patient ID (example: 12)"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search();
              }}
            />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Button onClick={search} disabled={loading} className="font-bold">
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Leave date empty to show full history. Set date to filter one day.
          </p>
        </CardContent>
      </Card>

      {data?.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700 font-semibold">{data.error}</CardContent>
        </Card>
      )}

      {patient && !data?.error && (
        <>
          <Card className="border-none shadow-lg rounded-3xl">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-blue-600 text-white border-none">Patient Overview</Badge>
                {data?.selectedDate ? (
                  <Badge variant="outline" className="font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    {data.selectedDate}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-semibold">
                    All Dates
                  </Badge>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Name</p>
                  <p className="font-black text-slate-900 mt-1 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-blue-600" />
                    {renderText(patient.name)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Diagnosis</p>
                  <p className="font-bold text-slate-900 mt-1">{renderText(patient.diagnosis)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Consultations</p>
                  <p className="font-black text-slate-900 mt-1">{consultations.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-black">Prescriptions</p>
                  <p className="font-black text-slate-900 mt-1">
                    {consultations.reduce((sum, c) => sum + (c.prescriptions?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 border-none shadow-lg rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-indigo-600" />
                  Consultations & Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {consultations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No consultations found for this patient.</p>
                ) : (
                  consultations.map((consultation) => (
                    <div key={consultation.id} className="border rounded-2xl p-4 bg-white shadow-sm space-y-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">{renderText(consultation.diagnosis, 'General Consultation')}</p>
                          <p className="text-xs text-muted-foreground font-semibold mt-1">
                            Dr. {renderText(consultation.doctorName)} | {renderText(consultation.doctorSpecialist)}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-semibold">
                          {consultation.consultationDate ? new Date(consultation.consultationDate).toLocaleDateString() : 'No date'}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border">
                          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Symptoms</p>
                          <p className="text-sm mt-1">{renderText(consultation.symptomsObserved)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border">
                          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Notes</p>
                          <p className="text-sm mt-1">{renderText(consultation.notes)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5" />
                          Prescriptions
                        </p>
                        {consultation.prescriptions?.length ? (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {consultation.prescriptions.map((prescription) => (
                              <div key={prescription.id} className="p-3 rounded-xl border bg-emerald-50/40">
                                <p className="font-bold text-emerald-900">{renderText(prescription.medicationName)}</p>
                                <p className="text-xs text-emerald-800 mt-1">
                                  Dose: {renderText(prescription.dosage)} | Duration: {renderText(prescription.duration)}
                                </p>
                                <p className="text-xs text-emerald-700 mt-1">{renderText(prescription.instructions)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No active prescription in this consultation.</p>
                        )}
                      </div>

                      <div className="pt-1">
                        <Button
                          className="font-bold"
                          disabled={!patient.id}
                          onClick={() =>
                            router.push(
                              `/dashboard/medicalist/prescriptions?patientId=${Number(patient.id || 0)}&consultationId=${consultation.id}`,
                            )
                          }
                        >
                          Open Stock Page
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-lg rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    Recent Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments found.</p>
                  ) : (
                    appointments.slice(0, 6).map((appointment) => (
                      <div key={appointment.id} className="p-3 rounded-xl border bg-slate-50">
                        <p className="font-bold text-slate-900">{renderText(appointment.doctorName)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'No date'} | {renderText(appointment.appointmentTime, '--:--')}
                        </p>
                        <Badge className="mt-2" variant="outline">{renderText(appointment.status, 'pending')}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-black">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions found.</p>
                  ) : (
                    transactions.map((transaction) => (
                      <div key={transaction.id} className="p-3 rounded-xl border bg-orange-50/40">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900 capitalize">{renderText(transaction.type)}</p>
                          <p className="font-black text-orange-700">Rs {Number(transaction.amount || 0)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : 'No date'}
                        </p>
                        <Badge variant="outline" className="mt-2">{renderText(transaction.paymentStatus, 'pending')}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {!data && (
        <Card className="border-dashed border-2 rounded-3xl">
          <CardContent className="py-10 text-center text-muted-foreground font-medium">
            Search by patient ID to view consultation details and prescriptions.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

