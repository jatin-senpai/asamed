import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// PUT /api/products/[id] - Update product details (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
      return NextResponse.json({ error: 'Forbidden. Admin or Seller access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { sku, name, description, category, base_unit, base_price_inr, stock_quantity } = body;

    // Check if product exists
    const checkProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const product = checkProduct.rows[0];
    if (user.role === 'seller' && product.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this product.' }, { status: 403 });
    }

    // Validation
    if (!sku || !name || !base_unit || base_price_inr === undefined || stock_quantity === undefined) {
      return NextResponse.json({ error: 'SKU, name, base unit, base price, and stock quantity are required.' }, { status: 400 });
    }

    const validUnits = ['mg', 'g', 'kg', 'mL', 'L', 'item'];
    if (!validUnits.includes(base_unit)) {
      return NextResponse.json({ error: `Invalid base unit. Must be one of: ${validUnits.join(', ')}` }, { status: 400 });
    }

    const result = await query(
      `UPDATE products 
       SET sku = $1, name = $2, description = $3, category = $4, base_unit = $5, base_price_inr = $6, stock_quantity = $7
       WHERE id = $8
       RETURNING *`,
      [
        sku.toUpperCase().trim(),
        name.trim(),
        description || '',
        category || 'Uncategorized',
        base_unit,
        base_price_inr,
        stock_quantity,
        id
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('PUT /api/products/[id] error:', error);
    if (error.code === '23505') { // Unique constraint violation (SKU)
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
      return NextResponse.json({ error: 'Forbidden. Admin or Seller access required.' }, { status: 403 });
    }

    const { id } = await params;

    // Check if product exists
    const checkProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const product = checkProduct.rows[0];
    if (user.role === 'seller' && product.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this product.' }, { status: 403 });
    }

    await query('DELETE FROM products WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Product deleted successfully.' });
  } catch (error: any) {
    console.error('DELETE /api/products/[id] error:', error);
    if (error.code === '23503') { // Foreign key constraint violation
      return NextResponse.json({
        error: 'Cannot delete this product because it is referenced in existing quotations/orders.'
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
