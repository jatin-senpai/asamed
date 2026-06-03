-- Database Schema for AasaMedChem Inventory and Order Management System

-- Drop tables if they exist (for easy re-initialization)
DROP TABLE IF EXISTS medicine_requests CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'seller', 'user')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_unit VARCHAR(20) NOT NULL CHECK (base_unit IN ('mg', 'g', 'kg', 'mL', 'L', 'item')),
    -- Numeric fields with high decimal precision to support precise measurements/pricing
    base_price_inr NUMERIC(20, 6) NOT NULL CHECK (base_price_inr >= 0),
    stock_quantity NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (stock_quantity >= 0),
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders/Quotations table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    order_type VARCHAR(50) NOT NULL DEFAULT 'quotation' CHECK (order_type IN ('quotation', 'direct_buy')),
    total_price_inr NUMERIC(20, 6) NOT NULL CHECK (total_price_inr >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    -- Quantity ordered by the seller (could be in different unit than product's base unit)
    quantity NUMERIC(20, 6) NOT NULL CHECK (quantity > 0),
    -- The unit used for ordering
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('mg', 'g', 'kg', 'mL', 'L', 'item')),
    -- Total calculated price (INR) for this item line
    calculated_price_inr NUMERIC(20, 6) NOT NULL CHECK (calculated_price_inr >= 0),
    -- Base price per base unit at the time of placing the order (for price lock audits)
    base_price_at_order NUMERIC(20, 6) NOT NULL CHECK (base_price_at_order >= 0),
    -- Conversion factor applied to convert ordered unit to base unit
    -- e.g., if ordered unit = kg and base unit = g, factor = 1000.0000000000
    conversion_factor_used NUMERIC(20, 10) NOT NULL CHECK (conversion_factor_used > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Medicine Requests table (for unavailable medicines)
CREATE TABLE medicine_requests (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(20, 6) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('mg', 'g', 'kg', 'mL', 'L', 'item')),
    address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'fulfilled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_medicine_requests_name ON medicine_requests(medicine_name);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
