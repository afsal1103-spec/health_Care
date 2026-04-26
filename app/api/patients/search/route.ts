import { NextRequest, NextResponse } from 'next/server';
import { query, toCamelCase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = parsePositiveInt(searchParams.get('patientId'));
    const userId = parsePositiveInt(searchParams.get('userId'));
    const date = searchParams.get('date');

    if (!patientId && !userId) {
      return NextResponse.json(
        { error: 'Patient ID or User ID is required' },
        { status: 400 }
      );
    }

    let patientSql = 'SELECT * FROM patients WHERE id = $1';
    const patientParams: (number | string)[] = [];
    if (patientId) {
      patientParams.push(patientId);
    } else if (userId !== null) {
      patientSql = 'SELECT * FROM patients WHERE user_id = $1';
      patientParams.push(userId);
    }

    const patientResult = await query(patientSql, patientParams);
    
    if (patientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patient = toCamelCase(patientResult.rows[0]) as Record<string, unknown>;

    const consultationsSql = `
      SELECT c.*, d.name as doctor_name, d.specialist as doctor_specialist
      FROM consultations c
      JOIN doctors d ON c.doctor_id = d.id
      WHERE c.patient_id = $1
      ${date ? 'AND c.consultation_date = $2' : ''}
      ORDER BY c.consultation_date DESC, c.created_at DESC
      LIMIT 20
    `;
    const consultationsParams = date ? [patient.id, date] : [patient.id];
    const consultationsResult = await query(consultationsSql, consultationsParams);

    const consultations = toCamelCase(consultationsResult.rows) as Array<Record<string, unknown>>;
    const consultationIds = consultations.map((c) => Number(c.id)).filter((id) => Number.isFinite(id));

    const prescriptionsByConsultationId = new Map<number, Array<Record<string, unknown>>>();
    if (consultationIds.length > 0) {
      const prescriptionsResult = await query(
        `SELECT *
         FROM prescriptions
         WHERE consultation_id = ANY($1::int[]) AND is_active = true
         ORDER BY consultation_id, id`,
        [consultationIds],
      );
      const prescriptions = toCamelCase(prescriptionsResult.rows) as Array<Record<string, unknown>>;
      for (const prescription of prescriptions) {
        const consultationId = Number(prescription.consultationId);
        if (!prescriptionsByConsultationId.has(consultationId)) {
          prescriptionsByConsultationId.set(consultationId, []);
        }
        prescriptionsByConsultationId.get(consultationId)?.push(prescription);
      }
    }

    for (const consultation of consultations) {
      consultation.prescriptions = prescriptionsByConsultationId.get(Number(consultation.id)) || [];
    }

    const appointmentsSql = `
      SELECT a.*, d.name as doctor_name, d.specialist as doctor_specialist
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = $1
      ${date ? 'AND a.appointment_date = $2' : ''}
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 20
    `;
    const appointmentsParams = date ? [patient.id, date] : [patient.id];
    const appointmentsResult = await query(appointmentsSql, appointmentsParams);

    const transactionsSql = `
      SELECT *
      FROM transactions
      WHERE patient_id = $1
      ${date ? 'AND transaction_date <= $2' : ''}
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 10
    `;
    const transactionsParams = date ? [patient.id, date] : [patient.id];
    const transactionsResult = await query(transactionsSql, transactionsParams);

    return NextResponse.json({
      patient,
      consultations,
      appointments: toCamelCase(appointmentsResult.rows),
      transactions: toCamelCase(transactionsResult.rows),
      selectedDate: date || null,
    });
  } catch (error) {
    console.error('Error searching patient:', error);
    return NextResponse.json(
      { error: 'Failed to search patient' },
      { status: 500 }
    );
  }
}
