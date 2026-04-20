'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MedicalistPrescriptionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispense Medications</CardTitle>
      </CardHeader>
      <CardContent>
        Select a patient in Patient Search to view prescriptions and dispense.
      </CardContent>
    </Card>
  );
}
