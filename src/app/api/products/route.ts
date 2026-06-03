import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/products - List products (filtered by search and category)
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const sellerOnly = searchParams.get('seller_only') === 'true' || user.role === 'seller';

    let sql = `
      SELECT p.*, u.name as seller_name, u.email as seller_email 
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (sellerOnly) {
      params.push(user.id);
      conditions.push(`p.seller_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.name ASC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/products - Create new product (Admin or Seller)
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
      return NextResponse.json({ error: 'Forbidden. Admin or Seller access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, base_unit, base_price_inr, stock_quantity } = body;

    // Validation
    if (!sku || !name || !base_unit || base_price_inr === undefined) {
      return NextResponse.json({ error: 'SKU, name, base unit, and base price are required.' }, { status: 400 });
    }

    const validUnits = ['mg', 'g', 'kg', 'mL', 'L', 'item'];
    if (!validUnits.includes(base_unit)) {
      return NextResponse.json({ error: `Invalid base unit. Must be one of: ${validUnits.join(', ')}` }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO products (sku, name, description, category, base_unit, base_price_inr, stock_quantity, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        sku.toUpperCase().trim(),
        name.trim(),
        description || '',
        category || 'Uncategorized',
        base_unit,
        base_price_inr,
        stock_quantity || 0,
        user.id
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('POST /api/products error:', error);
    if (error.code === '23505') { // Unique constraint violation (SKU)
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
