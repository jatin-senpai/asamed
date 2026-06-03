import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceReset = searchParams.get('reset') === 'true';

    // 1. Check if the database is already initialized
    let alreadyInit = false;
    try {
      const userCheck = await query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'");
      if (parseInt(userCheck.rows[0].count) > 0) {
        alreadyInit = true;
      }
    } catch (e) {
      console.log("Database not initialized yet.");
    }

    if (alreadyInit && !forceReset) {
      return NextResponse.json({
        message: 'Database is already initialized. Pass ?reset=true to force a full reset and re-seed.',
        initialized: true
      });
    }

    // 2. Read and execute db_schema.sql
    const schemaPath = path.join(process.cwd(), 'db_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ error: 'db_schema.sql file not found' }, { status: 500 });
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log("Initializing database schema...");
    await query(schemaSql);
    console.log("Schema initialized successfully.");

    // 3. Seed Users
    console.log("Seeding users...");
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const sellerPasswordHash = await bcrypt.hash('seller123', 10);

    const adminUser = await query(
      `INSERT INTO users (email, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id, email, role`,
      ['admin@asamed.com', adminPasswordHash, 'admin', 'Admin User']
    );

    const sellerUser = await query(
      `INSERT INTO users (email, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING 
       RETURNING id, email, role`,
      ['seller@asamed.com', sellerPasswordHash, 'seller', 'Seller User']
    );

    // 4. Seed Products
    console.log("Seeding products...");
    const productsSeed = [
      {
        sku: 'CHEM-ASP-001',
        name: 'Aspirin (Acetylsalicylic Acid)',
        description: 'High purity Acetylsalicylic acid powder for research and development.',
        category: 'Analgesics',
        base_unit: 'g',
        base_price_inr: 1.500000,
        stock_quantity: 10000.000000 // 10 kg in grams
      },
      {
        sku: 'CHEM-ETH-002',
        name: 'Ethanol 99%',
        description: 'Laboratory grade absolute Ethanol.',
        category: 'Solvents',
        base_unit: 'L',
        base_price_inr: 350.000000,
        stock_quantity: 25.500000 // 25.5 Liters
      },
      {
        sku: 'CHEM-HCL-003',
        name: 'Hydrochloric Acid 37%',
        description: 'Technical grade aqueous solution of hydrogen chloride.',
        category: 'Acids',
        base_unit: 'mL',
        base_price_inr: 0.450000, // 450 INR per L
        stock_quantity: 5000.000000 // 5 Liters in mL
      },
      {
        sku: 'CHEM-NACL-004',
        name: 'Sodium Chloride (Laboratory Grade)',
        description: 'High-purity sodium chloride crystals.',
        category: 'Salts',
        base_unit: 'kg',
        base_price_inr: 120.000000,
        stock_quantity: 50.000000 // 50 kg
      },
      {
        sku: 'EQ-BEK-005',
        name: 'Glass Beaker 250mL',
        description: 'Borosilicate glass beaker with graduation markings.',
        category: 'Equipment',
        base_unit: 'item',
        base_price_inr: 150.000000,
        stock_quantity: 120.000000 // 120 items
      },
      {
        sku: 'CHEM-FEN-006',
        name: 'Fentanyl Citrate (Research Grade)',
        description: 'High potency opioid receptor agonist for analytical research.',
        category: 'Analgesics',
        base_unit: 'mg',
        base_price_inr: 0.080000, // 80 INR per gram, 80,000 INR per kg
        stock_quantity: 250000.000000 // 250,000 mg (250 grams)
      }
    ];

    for (const prod of productsSeed) {
      await query(
        `INSERT INTO products (sku, name, description, category, base_unit, base_price_inr, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (sku) DO NOTHING`,
        [prod.sku, prod.name, prod.description, prod.category, prod.base_unit, prod.base_price_inr, prod.stock_quantity]
      );
    }

    return NextResponse.json({
      message: 'Database initialized and seeded successfully.',
      users: {
        admin: 'admin@asamed.com (pwd: admin123)',
        seller: 'seller@asamed.com (pwd: seller123)'
      },
      productsSeeded: productsSeed.length,
      resetApplied: forceReset || !alreadyInit
    });

  } catch (error: any) {
    console.error('Error during database initialization:', error);
    return NextResponse.json({
      error: 'Failed to initialize database',
      details: error.message
    }, { status: 500 });
  }
}
