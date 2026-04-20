import { NextRequest, NextResponse } from 'next/server';
import { query, toCamelCase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const patientCode = searchParams.get('patientCode');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!patientId && !patientCode && !userId) {
      return NextResponse.json(
        { error: 'Patient ID, Code, or User ID required' },
        { status: 400 }
      );
    }

    let patientSql = 'SELECT * FROM patients WHERE ';
    let patientParams: any[] = [];

    if (patientId) {
      patientSql += 'id = $1';
      patientParams.push(parseInt(patientId));
    } else if (userId) {
      patientSql += 'user_id = $1';
      patientParams.push(parseInt(userId));
    } else {
      patientSql += 'patient_code = $1';
      patientParams.push(patientCode);
    }

    const patientResult = await query(patientSql, patientParams);
    
    if (patientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patient = toCamelCase(patientResult.rows[0]) as Record<string, any>;

    const consultationsResult = await query(
      `SELECT c.*, d.name as doctor_name, d.specialist as doctor_specialist
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       WHERE c.patient_id = $1 AND c.consultation_date = $2
       ORDER BY c.created_at DESC`,
      [patient.id, date]
    );

    const consultations = toCamelCase(consultationsResult.rows) as Array<Record<string, any>>;

    for (const consultation of consultations) {
      const prescriptionsResult = await query(
        'SELECT * FROM prescriptions WHERE consultation_id = $1 AND is_active = true',
        [consultation.id]
      );
      consultation.prescriptions = toCamelCase(prescriptionsResult.rows);
    }

    const appointmentsResult = await query(
      `SELECT a.*, d.name as doctor_name, d.specialist as doctor_specialist
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = $1 AND a.appointment_date = $2
       ORDER BY a.appointment_time`,
      [patient.id, date]
    );

    const transactionsResult = await query(
      `SELECT * FROM transactions 
       WHERE patient_id = $1 AND transaction_date <= $2
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT 10`,
      [patient.id, date]
    );

    return NextResponse.json({
      patient,
      consultations,
      appointments: toCamelCase(appointmentsResult.rows),
      transactions: toCamelCase(transactionsResult.rows),
      selectedDate: date,
    });
  } catch (error) {
    console.error('Error searching patient:', error);
    return NextResponse.json(
      { error: 'Failed to search patient' },
      { status: 500 }
    );
  }
}
