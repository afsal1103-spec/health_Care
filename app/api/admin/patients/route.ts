import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim();
  const sortByParam = (searchParams.get('sortBy') || 'id').toLowerCase();
  const orderParam = (searchParams.get('order') || 'desc').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '10', 10)));
  const offset = (page - 1) * pageSize;

  const sortCols: Record<string, string> = {
    id: ' p.id ',
    name: ' p.name ',
    email: ' u.email ',
    mobile_no: ' p.mobile_no ',
  };
  const sortCol = sortCols[sortByParam] || ' p.id ';
  const order = orderParam === 'asc' ? 'ASC' : 'DESC';

  const params: any[] = [];
  let where = ' WHERE u.is_active = true ';
  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    where += ` AND (p.name ILIKE $${params.length - 2} OR u.email ILIKE $${params.length - 1} OR p.mobile_no ILIKE $${params.length}) `;
  }
  params.push(pageSize);
  params.push(offset);

  const sql = `
    SELECT p.id, p.name, p.mobile_no, u.email, COUNT(*) OVER() AS total_count
    FROM patients p
    JOIN users u ON u.id = p.user_id
    ${where}
    ORDER BY ${sortCol} ${order}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const res = await query(sql, params);
  const rows = res.rows || [];
  const total = rows[0]?.total_count ? parseInt(rows[0].total_count, 10) : 0;
  return NextResponse.json({ items: rows.map(r => ({ id: r.id, name: r.name, mobile_no: r.mobile_no, email: r.email })), total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, mobileNo, email, password = 'changeme123', address = '' } = body;
  if (!name || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  try {
    await transaction(async (client) => {
      const userRes = await client.query(
        'INSERT INTO users (email, password, user_type, is_active) VALUES ($1,$2,$3,true) RETURNING id',
        [email, hashed, 'patient']
      );
      const userId = userRes.rows[0].id;
      await client.query(
        'INSERT INTO patients (user_id, name, mobile_no, address) VALUES ($1,$2,$3,$4)',
        [userId, name, mobileNo || '', address]
      );
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, mobileNo, email } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await transaction(async (client) => {
      if (email) {
        await client.query(
          'UPDATE users SET email = $1 WHERE id = (SELECT user_id FROM patients WHERE id = $2)',
          [email, id]
        );
      }
      await client.query('UPDATE patients SET name = $1, mobile_no = $2 WHERE id = $3', [
        name,
        mobileNo,
        id,
      ]);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await query(
      'UPDATE users SET is_active = false WHERE id = (SELECT user_id FROM patients WHERE id = $1)',
      [id]
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
