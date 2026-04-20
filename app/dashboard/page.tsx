import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const userType = session.user?.userType;
  switch (userType) {
    case 'patient':
      redirect('/dashboard/patient');
    case 'doctor':
      redirect('/dashboard/doctor');
    case 'medicalist':
      redirect('/dashboard/medicalist');
    case 'superadmin':
      redirect('/dashboard/admin');
    default:
      redirect('/login');
  }
}
