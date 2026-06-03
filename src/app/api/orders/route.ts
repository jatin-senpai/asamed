import { NextResponse } from 'next/server';
import Big from 'big.js';
import pool, { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getConversionFactor, areUnitsCompatible, Unit } from '@/utils/conversions';

// GET /api/orders - List orders (Admin gets all, Seller gets only their own)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    let sql = `
      SELECT 
        o.id,
        o.status,
        o.order_type,
        o.total_price_inr,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'product_sku', p.sku,
            'product_base_unit', p.base_unit,
            'product_base_price', p.base_price_inr,
            'quantity', oi.quantity,
            'unit', oi.unit,
            'calculated_price_inr', oi.calculated_price_inr,
            'base_price_at_order', oi.base_price_at_order,
            'conversion_factor_used', oi.conversion_factor_used
          )
        ) as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
    `;

    const params: any[] = [];
    if (user.role === 'user') {
      sql += ' WHERE o.user_id = $1';
      params.push(user.id);
    } else if (user.role === 'seller') {
      sql += ' WHERE p.seller_id = $1';
      params.push(user.id);
    }

    sql += ' GROUP BY o.id, u.id ORDER BY o.created_at DESC';

    const result = await query(sql, params);
    
    // Clean up empty aggregated array (if an order has no items, json_agg returns [null])
    const cleanedRows = result.rows.map(row => {
      if (row.items && row.items.length === 1 && row.items[0].id === null) {
        row.items = [];
      }
      return row;
    });

    return NextResponse.json(cleanedRows);
  } catch (error: any) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/orders - Place a new quotation/order (Seller only)
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (user.role !== 'user') {
      return NextResponse.json({ error: 'Forbidden. Only users can place orders.' }, { status: 403 });
    }

    const { items, orderType } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    const type = orderType === 'direct_buy' ? 'direct_buy' : 'quotation';
    const initialStatus = type === 'direct_buy' ? 'completed' : 'pending';

    // Begin database transaction
    await client.query('BEGIN');

    // 1. Create order header
    const orderHeaderResult = await client.query(
      `INSERT INTO orders (user_id, status, order_type, total_price_inr) 
       VALUES ($1, $2, $3, 0.000000) 
       RETURNING id`,
      [user.id, initialStatus, type]
    );
    const orderId = orderHeaderResult.rows[0].id;

    let totalOrderPrice = new Big(0);

    // 2. Process each item
    for (const item of items) {
      const { productId, quantity, unit } = item;

      if (!productId || quantity === undefined || !unit) {
        throw new Error('Each order item must have a productId, quantity, and unit.');
      }

      // Check positive quantity
      const orderQty = new Big(quantity);
      if (orderQty.lte(0)) {
        throw new Error('Quantity must be greater than zero.');
      }

      // Select product details with row locking to prevent race conditions (concurrency check)
      const prodResult = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (prodResult.rows.length === 0) {
        throw new Error(`Product with ID ${productId} does not exist.`);
      }

      const product = prodResult.rows[0];
      const baseUnit = product.base_unit as Unit;
      const basePrice = new Big(product.base_price_inr);
      const currentStock = new Big(product.stock_quantity);

      // Verify unit compatibility
      if (!areUnitsCompatible(unit as Unit, baseUnit)) {
        throw new Error(`Incompatible unit "${unit}" for product "${product.name}" (base unit: "${baseUnit}").`);
      }

      // Calculate conversion factor and base quantity
      const conversionFactor = getConversionFactor(unit as Unit, baseUnit);
      const baseQty = orderQty.times(conversionFactor);

      // Verify stock availability
      // Verify stock availability (only for direct buys since they pull stock instantly)
      if (type === 'direct_buy') {
        if (currentStock.lt(baseQty)) {
          throw new Error(
            `Insufficient stock for "${product.name}". Requested: ${orderQty} ${unit} (${baseQty} ${baseUnit}), Available: ${currentStock} ${baseUnit}.`
          );
        }
      }

      // Calculate line price
      const calculatedLinePrice = baseQty.times(basePrice);
      totalOrderPrice = totalOrderPrice.plus(calculatedLinePrice);

      // Deduct stock if direct buy
      if (type === 'direct_buy') {
        const newStock = currentStock.minus(baseQty);
        await client.query(
          'UPDATE products SET stock_quantity = $1 WHERE id = $2',
          [newStock.toFixed(6), productId]
        );
      }

      // Insert order item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit, calculated_price_inr, base_price_at_order, conversion_factor_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          productId,
          orderQty.toFixed(6),
          unit,
          calculatedLinePrice.toFixed(6),
          basePrice.toFixed(6),
          conversionFactor.toFixed(10)
        ]
      );
    }

    // 3. Update total price in order header
    await client.query(
      'UPDATE orders SET total_price_inr = $1 WHERE id = $2',
      [totalOrderPrice.toFixed(6), orderId]
    );

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Quotation/Order placed successfully.',
      orderId,
      totalPriceInr: totalOrderPrice.toFixed(6)
    }, { status: 201 });

  } catch (error: any) {
    // Rollback transaction in case of failure
    await client.query('ROLLBACK');
    console.error('POST /api/orders error (transaction rolled back):', error);
    return NextResponse.json({ error: error.message || 'Failed to place order.' }, { status: 400 });
  } finally {
    // Release client back to pool
    client.release();
  }
}
