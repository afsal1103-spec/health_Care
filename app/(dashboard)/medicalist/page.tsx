'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Pill } from 'lucide-react';
import Link from 'next/link';

export default function MedicalistDashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {session?.user?.roleDetails?.name}</h1>
        <p className="text-gray-500">Dispense medications and manage pharmacy</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Search</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Find</div>
            <p className="text-xs text-muted-foreground">Search prescriptions</p>
            <Button asChild className="w-full mt-4" size="sm">
              <Link href="/dashboard/medicalist/patient-search">Search Patient</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispense Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Process</div>
            <p className="text-xs text-muted-foreground">Give medications</p>
            <Button asChild variant="outline" className="w-full mt-4" size="sm">
              <Link href="/dashboard/medicalist/prescriptions">View Prescriptions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}