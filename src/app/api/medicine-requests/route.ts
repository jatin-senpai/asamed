import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/medicine-requests - List all medicine requests (Admin only)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const result = await query(
      'SELECT * FROM medicine_requests ORDER BY created_at DESC'
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('GET /api/medicine-requests error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/medicine-requests - Submit a request for an unavailable medicine
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phoneNumber, medicineName, quantity, unit, address } = body;

    // Validation
    if (!customerName || !phoneNumber || !medicineName || quantity === undefined || !unit || !address) {
      return NextResponse.json({ error: 'All fields (Customer Name, Phone, Medicine Name, Quantity, Unit, Address) are required.' }, { status: 400 });
    }

    if (parseFloat(quantity) <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero.' }, { status: 400 });
    }

    const validUnits = ['mg', 'g', 'kg', 'mL', 'L', 'item'];
    if (!validUnits.includes(unit)) {
      return NextResponse.json({ error: `Invalid unit. Must be one of: ${validUnits.join(', ')}` }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO medicine_requests (customer_name, phone_number, medicine_name, quantity, unit, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        customerName.trim(),
        phoneNumber.trim(),
        medicineName.trim(),
        parseFloat(quantity),
        unit,
        address.trim()
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('POST /api/medicine-requests error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
