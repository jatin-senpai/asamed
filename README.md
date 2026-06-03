# AasaMedChem - Inventory & Order Management System

Welcome to the **AasaMedChem** Inventory and Order Management System. This application is designed to handle pharmaceutical and chemical product inventories, high-precision unit conversions, real-time quotation generation, and admin status auditing.

---

## 🌟 Features

- **Obsidian Emerald Theme**: A modern, dark-mode glassmorphic user interface designed with custom Vanilla CSS variables, smooth micro-animations, and responsive layouts.
- **Secure Native Next.js Authentication**: Custom JWT-based authentication stored in secure `HttpOnly` cookies, secured via Next.js Edge Middleware protecting admin and seller dashboards. No external auth servers needed!
- **Real-Time Unit Conversions**: Seamlessly place orders or quotations in any compatible unit (e.g., ordered in `mg` when base is `kg`, or ordered in `L` when base is `mL`) with instant client-side calculation previews.
- **High-Precision Calculations**: Integrated `big.js` to perform exact numeric math, avoiding Javascript's native floating-point inaccuracy.
- **Transactional Stock Integrity**: Concurrent orders are handled safely using PostgreSQL database transactions with row-level locks (`SELECT FOR UPDATE`) and stock deduction validations.
- **Verification Audit Log**: Clear mathematical breakdowns are saved to the database and exposed in both seller history and admin portals to verify conversions and rates.
- **Medicine Requests Flow**: If a medicine is not found in the search results or is currently unavailable, users can submit custom requests (getting name, phone, drug name, quantity, unit, address). Admins track these requests and coordinate with sellers to fulfill them.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
  - *Point of view on server setup*: Next.js is a full-stack framework with built-in API route handlers and server actions. Creating a separate Express server is redundant, as Next.js natively handles the backend server-side actions, authentication cookies, and database connections. This allows a clean, zero-dependency serverless deployment on Vercel.
- **Styling**: Custom Vanilla CSS & CSS Modules (Obsidian Emerald Theme)
- **Database**: Neon-hosted serverless PostgreSQL
- **Database Driver**: `pg` (with connection pooling via `pg.Pool`)
- **Token Cryptography**: `jose` (Edge runtime compatible for Next.js Middleware)
- **Numeric Precision**: `big.js` (decimal arithmetic)

---

## 📊 Database Schema & Precision Strategy

All numeric fields (prices, stock quantities, ordered quantities, conversion factors) are stored as PostgreSQL `NUMERIC` types to support high decimal precision (up to 6 decimals for storage, and 10 decimals for conversion ratios) and avoid rounding anomalies.

### Key Tables

#### 1. `users`
Tracks system credentials and role permissions.
- `id`: `SERIAL` (Primary Key)
- `email`: `VARCHAR(255) UNIQUE` (User email)
- `password_hash`: `VARCHAR(255)` (Bcrypt hash)
- `role`: `VARCHAR(50)` (Strictly `'admin'` or `'seller'`)
- `name`: `VARCHAR(255)` (Display Name)

#### 2. `products`
Maintains chemical inventory base configuration.
- `id`: `SERIAL` (Primary Key)
- `sku`: `VARCHAR(100) UNIQUE` (Stock Keeping Unit)
- `name`: `VARCHAR(255)` (Product Name)
- `description`: `TEXT`
- `category`: `VARCHAR(100)`
- `base_unit`: `VARCHAR(20)` (Strictly `'mg'`, `'g'`, `'kg'`, `'mL'`, `'L'`, or `'item'`)
- `base_price_inr`: `NUMERIC(20, 6)` (Price per single base unit in INR)
- `stock_quantity`: `NUMERIC(20, 6)` (Current inventory level in terms of the base unit)

#### 3. `orders`
Stores quotation headers.
- `id`: `SERIAL` (Primary Key)
- `user_id`: `INTEGER` (References `users(id)`)
- `status`: `VARCHAR(50)` (`'pending'`, `'approved'`, `'rejected'`, `'completed'`)
- `total_price_inr`: `NUMERIC(20, 6)` (Grand total order price)

#### 4. `order_items`
Tracks itemized ordered lines, locking in rates and audit ratios.
- `id`: `SERIAL` (Primary Key)
- `order_id`: `INTEGER` (References `orders(id)`)
- `product_id`: `INTEGER` (References `products(id)`)
- `quantity`: `NUMERIC(20, 6)` (Quantity ordered by the seller in the *ordered unit*)
- `unit`: `VARCHAR(20)` (The unit used for this specific line item)
- `calculated_price_inr`: `NUMERIC(20, 6)` (Total price for this line in INR)
- `base_price_at_order`: `NUMERIC(20, 6)` (Product's base price when the order was submitted)
- `conversion_factor_used`: `NUMERIC(20, 10)` (Exact ratio applied to convert ordered unit to base unit)

#### 5. `medicine_requests`
Stores custom requests for unavailable medicines.
- `id`: `SERIAL` (Primary Key)
- `customer_name`: `VARCHAR(255)`
- `phone_number`: `VARCHAR(50)`
- `medicine_name`: `VARCHAR(255)`
- `quantity`: `NUMERIC(20, 6)`
- `unit`: `VARCHAR(20)` (Strictly `'mg'`, `'g'`, `'kg'`, `'mL'`, `'L'`, or `'item'`)
- `address`: `TEXT`
- `status`: `VARCHAR(50)` (`'pending'`, `'contacted'`, `'fulfilled'`)
- `created_at`: `TIMESTAMP WITH TIME ZONE`

---

## 📏 Unit Storage & Conversion Strategy

### 1. Storage Rule
All stock quantities and prices are recorded **exclusively** relative to the product's configured `base_unit`. For example:
- A product configured in grams (`g`) with a price of `1.50 INR / g` will store `1.500000` as the price.
- A product configured in kilograms (`kg`) with a price of `120.00 INR / kg` will store `120.000000` as the price.

### 2. Supported Units & Dimensions
We support three independent physical dimensions. Conversions across dimensions (e.g. converting `g` to `mL`) are blocked.
- **Weight**: milligrams (`mg`), grams (`g`), kilograms (`kg`)
  - *Conversion factors*:
    - 1 kg = 1,000 g
    - 1 g = 1,000 mg
    - 1 kg = 1,000,000 mg
- **Volume**: milliliters (`mL`), liters (`L`) [Conversion: `1 L = 1000 mL`]
- **Count**: items (`item`) [Conversion: `1 item = 1 item`]

### 3. Application Points
- **Client Side (Cart)**: When typing a quantity and changing the unit select, the UI immediately loads the product base unit, computes the conversion factor, calculates the converted base quantity, and evaluates the final price live using `big.js`. This allows a user to purchase in `mg` even if a seller lists a product in `kg`.
- **Server Side (API Transaction)**: Before saving the order, the API fetches the product data directly from the DB, locks the row to prevent concurrent alterations, recalculates the conversion factor/base quantity, verifies stock limits, deducts the stock, and inserts the item with the exact `conversion_factor_used` logged.
- **Verification Audits**: Placed orders save `conversion_factor_used` and `base_price_at_order` to prevent retroactive rate changes and allow both Sellers and Admins to inspect the math.

---

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js 18+** installed.

### 2. Configure Environment
1. Clone the project.
2. In the workspace root, copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```
3. Open `.env.local` and paste the **Neon PostgreSQL** Connection URL:
   ```
   DATABASE_URL="postgresql://neondb_owner:npg_4W9qnYPGrZlc@ep-damp-sea-aoq00jzb-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   JWT_SECRET="generate-a-secure-secret-key-containing-32-chars"
   ```

### 3. Install & Start Dev Server
```bash
# Install npm dependencies
npm install

# Start the Next.js local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Setup & Seeding Database

When accessing the app for the first time, you will see a red **"Database Setup Required"** banner on the login screen if the PostgreSQL tables do not exist.
1. Click the **"Initialize & Seed Database"** button directly on the login screen.
2. The server will run the `db_schema.sql` script to create all tables/triggers, hash passwords, and seed the demo data.
3. Once initialized, the banner turns green, and you can log in immediately.

---

## 🔑 Test Credentials & Verification Flows

Use the prefilled evaluator quick buttons on the login card, or enter credentials manually:

### 👤 Seller Account
- **Email**: `seller@asamed.com`
- **Password**: `seller123`
- **Verification Flow**:
  1. Click **Prefill Seller** and sign in.
  2. Search for a medicine in the search bar. All products are listed on the page.
  3. Try to purchase Fentanyl (Base: `mg`, Price: `₹0.08/mg`). Enter `5` and select `g`. The cart will convert `5 g = 5,000 mg` and calculate the price correctly (`₹400`).
  4. Search for an unavailable medicine like `"Paracetamol"`.
  5. The catalog will display: **"No medicines matched your search. If a medicine is unavailable, you can submit a request directly to the Admin."**
  6. Click **Request "Paracetamol"**.
  7. Fill in your name, phone number, quantity/unit, address, and click **Submit Request**.
  8. You will see a success banner: the request has reached the database and the admin!

### 👑 Admin Account
- **Email**: `admin@asamed.com`
- **Password**: `admin123`
- **Verification Flow**:
  1. Log in as Admin.
  2. Go to **Medicine Requests** in the sidebar.
  3. You will see the incoming request for `"Paracetamol"` with the customer's phone number, quantity requested, and delivery address.
  4. Work offline to coordinate with sellers, and click **Mark Contacted** or **Mark Fulfilled** to update the pipeline.

---

## ☁️ Deploying to Vercel

1. Link your project to Vercel:
   ```bash
   npx vercel link
   ```
2. Add environment secrets via the Vercel Dashboard:
   - `DATABASE_URL` (Set to the Neon connection string)
   - `JWT_SECRET`
3. Deploy to production:
   ```bash
   npx vercel --prod
   ```
