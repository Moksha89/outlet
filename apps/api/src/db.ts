import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { v4 as uuid } from 'uuid';
import { catalogProducts } from './catalog/products.js';

const databaseFile = resolve(process.env.DATABASE_FILE ?? './data/andhrawala.db');
mkdirSync(dirname(databaseFile), { recursive: true });

export const db = new Database(databaseFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function nowIso(): string {
  return new Date().toISOString();
}

export function toRupees(value: number): number {
  return Math.round(value * 100) / 100;
}

export function initDb(): void {
  db.exec(`
    PRAGMA ignore_check_constraints = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OUTLET')),
      outlet_id TEXT,
      fcm_token TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      size_ml INTEGER NOT NULL,
      bottle_image_url TEXT,
      carton_image_url TEXT,
      bottles_per_carton INTEGER NOT NULL DEFAULT 12,
      purchase_price_per_bottle REAL NOT NULL,
      selling_price_per_bottle REAL NOT NULL,
      carton_purchase_price REAL NOT NULL,
      carton_selling_price REAL NOT NULL,
      full_price REAL NOT NULL,
      half_price REAL NOT NULL,
      quarter_price REAL NOT NULL,
      current_stock_bottles REAL NOT NULL DEFAULT 0,
      current_stock_ml REAL NOT NULL DEFAULT 0,
      minimum_stock_bottles REAL NOT NULL DEFAULT 0,
      barcode TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
      quantity_bottles REAL NOT NULL,
      quantity_ml REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      outlet_id TEXT NOT NULL REFERENCES outlets(id),
      status TEXT NOT NULL CHECK (status IN ('PLACED', 'APPROVED', 'DELIVERED', 'CANCELLED', 'REJECTED')),
      sales_total REAL NOT NULL DEFAULT 0,
      purchase_total REAL NOT NULL DEFAULT 0,
      profit_total REAL NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id),
      approved_by TEXT REFERENCES users(id),
      delivered_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      unit_type TEXT NOT NULL CHECK (unit_type IN ('BOTTLE', 'CARTON', 'FULL', 'HALF', 'QUARTER', 'LITER')),
      quantity REAL NOT NULL,
      unit_selling_price REAL NOT NULL,
      unit_purchase_cost REAL NOT NULL,
      line_sales_total REAL NOT NULL,
      line_purchase_total REAL NOT NULL,
      line_profit REAL NOT NULL,
      stock_deducted_bottles REAL NOT NULL,
      stock_deducted_ml REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      outlet_id TEXT NOT NULL REFERENCES outlets(id),
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT NOT NULL UNIQUE,
      outlet_id TEXT NOT NULL REFERENCES outlets(id),
      invoice_id TEXT REFERENCES invoices(id),
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'BANK', 'CARD')),
      reference_number TEXT,
      remarks TEXT,
      received_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      outlet_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ORDER', 'BILL', 'PAYMENT', 'STOCK', 'ALERT')),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_orders_outlet_status ON orders(outlet_id, status);
    CREATE INDEX IF NOT EXISTS idx_invoices_outlet_status ON invoices(outlet_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
  `);

  seed();
}

function seed(): void {
  const outletCount = db.prepare('SELECT COUNT(*) AS total FROM outlets').get() as { total: number };
  if (outletCount.total === 0) {
    const outletId = uuid();
    db.prepare(
      'INSERT INTO outlets (id, name, phone, address, credit_limit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(outletId, 'Blue Moon Bar', '9000000001', 'Vijayawada', 500000, nowIso());
  }

  const outlets = db.prepare('SELECT id FROM outlets ORDER BY created_at LIMIT 1').get() as {
    id: string;
  };
  const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
  if (userCount.total === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(
      'INSERT INTO users (id, name, phone, password_hash, role, outlet_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(uuid(), 'Andhrawala Admin', '9000000000', hash, 'ADMIN', null, nowIso());
    db.prepare(
      'INSERT INTO users (id, name, phone, password_hash, role, outlet_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(uuid(), 'Blue Moon Bar', '9000000001', hash, 'OUTLET', outlets.id, nowIso());
  }

  const stmt = db.prepare(`
      INSERT INTO products (
        id, product_name, brand, category, size_ml, bottle_image_url, bottles_per_carton,
        purchase_price_per_bottle, selling_price_per_bottle, carton_purchase_price,
        carton_selling_price, full_price, half_price, quarter_price,
        current_stock_bottles, current_stock_ml, minimum_stock_bottles, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ACTIVE', ?, ?)
    `);
  for (const product of catalogProducts) {
    const existing = db.prepare('SELECT id FROM products WHERE product_name = ?').get(product.product_name);
    if (!existing) {
      const createdAt = nowIso();
      stmt.run(
        uuid(),
        product.product_name,
        product.brand,
        product.category,
        product.size_ml,
        product.bottle_image_url,
        createdAt,
        createdAt,
      );
    }
  }
}
