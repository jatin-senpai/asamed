import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// PUT /api/medicine-requests/[id] - Update request status (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'contacted', 'fulfilled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Check if request exists
    const checkResult = await query('SELECT * FROM medicine_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Medicine request not found.' }, { status: 404 });
    }

    const result = await query(
      `UPDATE medicine_requests 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('PUT /api/medicine-requests/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
