import { NextResponse } from 'next/server';
import Big from 'big.js';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// PUT /api/orders/[id] - Update order status (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Begin transaction
    await client.query('BEGIN');

    // 1. Fetch current order status
    const orderCheck = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orderCheck.rows[0];
    const oldStatus = order.status;
    const newStatus = status;
    const isQuotation = order.order_type === 'quotation';

    if (oldStatus === newStatus) {
      await client.query('COMMIT');
      return NextResponse.json(order);
    }

    // 2. Fetch order items to manage stock adjustments
    const itemsResult = await client.query(
      `SELECT oi.*, p.stock_quantity, p.name, p.base_unit
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );
    const items = itemsResult.rows;

    // 3. Stock restoration: Order is being REJECTED (restore stock)
    if (oldStatus !== 'rejected' && newStatus === 'rejected') {
      // Do NOT restore stock if it was a pending quotation (since stock was never deducted)
      const shouldRestore = !(oldStatus === 'pending' && isQuotation);
      if (shouldRestore) {
        for (const item of items) {
          const qty = new Big(item.quantity);
          const factor = new Big(item.conversion_factor_used);
          const baseQty = qty.times(factor);
          
          const currentStock = new Big(item.stock_quantity);
          const restoredStock = currentStock.plus(baseQty);

          await client.query(
            'UPDATE products SET stock_quantity = $1 WHERE id = $2',
            [restoredStock.toFixed(6), item.product_id]
          );
        }
      }
    }

    // 4. Stock deduction: Quotation approved OR Order restored from REJECTED
    const isQuoteApproved = (oldStatus === 'pending' && (newStatus === 'approved' || newStatus === 'completed') && isQuotation);
    const isRestoredFromRejected = (oldStatus === 'rejected' && newStatus !== 'rejected');

    if (isQuoteApproved || isRestoredFromRejected) {
      for (const item of items) {
        const qty = new Big(item.quantity);
        const factor = new Big(item.conversion_factor_used);
        const baseQty = qty.times(factor);
        
        // Fetch current product stock (with lock)
        const prodCheck = await client.query(
          'SELECT stock_quantity, name, base_unit FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );
        const product = prodCheck.rows[0];
        const currentStock = new Big(product.stock_quantity);

        if (currentStock.lt(baseQty)) {
          throw new Error(
            `Cannot approve/restore order. Product "${product.name}" has insufficient stock. ` +
            `Required: ${baseQty} ${product.base_unit}, Available: ${currentStock} ${product.base_unit}.`
          );
        }

        const reducedStock = currentStock.minus(baseQty);
        await client.query(
          'UPDATE products SET stock_quantity = $1 WHERE id = $2',
          [reducedStock.toFixed(6), item.product_id]
        );
      }
    }

    // 5. Update order status in DB
    const updateResult = await client.query(
      `UPDATE orders 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [newStatus, id]
    );

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json(updateResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`PUT /api/orders/[id] error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update order status.' }, { status: 400 });
  } finally {
    client.release();
  }
}
