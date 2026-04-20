'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function MedicalistPatientSearchPage() {
  const [patientId, setPatientId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/patients/search?patientId=${encodeURIComponent(patientId)}`);
      const j = await r.json();
      if (r.ok) setData(j);
      else setData({ error: j.error || 'Not found' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicalist: Patient Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <Button onClick={search} disabled={loading}>{loading ? 'Searching...' : 'Search'}</Button>
        </div>
        {data && (
          <div className="text-sm">
            {data.error ? (
              <div className="text-red-600">{data.error}</div>
            ) : (
              <>
                <div className="font-medium">Patient: {data.patient?.name}</div>
                <div>View patient prescriptions and consultation history below.</div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
