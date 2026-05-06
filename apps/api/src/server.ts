import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { requireAuth, requireRole, signToken, verifyPassword, currentUserFromPhone } from './auth.js';
import { db, initDb, nowIso, toRupees } from './db.js';
import { emitBusinessUpdate, initFirebase, notify, setRealtime } from './notifications.js';
import { bottleEquivalent, mlEquivalent, purchaseCost, sellingPrice } from './pricing.js';
import type { AuthedRequest, OrderItemInput, OrderStatus, Product, UnitType } from './types.js';

initDb();
initFirebase();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' },
});
setRealtime(io);

const uploadDir = path.resolve(process.cwd(), 'uploads');
mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({ origin: process.env.WEB_ORIGIN ?? true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadDir));

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token || typeof token !== 'string') return next();
  next();
});

io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  const role = socket.handshake.auth.role;
  const outletId = socket.handshake.auth.outletId;
  if (typeof userId === 'string') socket.join(`user:${userId}`);
  if (role === 'ADMIN') socket.join('admins');
  if (typeof outletId === 'string') socket.join(`outlet:${outletId}`);
});

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.post('/v1/auth/login', (req, res) => {
  const parsed = z.object({ phone: z.string(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid login payload' });
  const user = currentUserFromPhone(parsed.data.phone);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid phone or password' });
  }
  const safeUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    outlet_id: user.outlet_id,
  };
  res.json({ token: signToken(safeUser), user: safeUser });
});

app.get('/v1/me', requireAuth, (req: AuthedRequest, res) => res.json(req.user));

app.post('/v1/me/fcm-token', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success || !req.user) return res.status(400).json({ error: 'invalid token' });
  db.prepare('UPDATE users SET fcm_token = ? WHERE id = ?').run(parsed.data.token, req.user.id);
  res.status(204).send();
});

app.get('/v1/dashboard', requireAuth, (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'missing user' });
  const outletFilter = req.user.role === 'OUTLET' ? 'WHERE outlet_id = ?' : '';
  const outletParam = req.user.role === 'OUTLET' ? [req.user.outlet_id] : [];
  const orders = db
    .prepare(
      `SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'PLACED' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_orders,
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN sales_total ELSE 0 END), 0) AS today_sales,
        COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN profit_total ELSE 0 END), 0) AS today_profit
       FROM orders ${outletFilter}`,
    )
    .get(...outletParam) as Record<string, number>;
  const pending = db
    .prepare(`SELECT COALESCE(SUM(remaining_balance), 0) AS total FROM invoices ${outletFilter}`)
    .get(...outletParam) as { total: number };
  const payments = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
       ${req.user.role === 'OUTLET' ? 'WHERE outlet_id = ? AND date(payment_date) = date(\'now\')' : 'WHERE date(payment_date) = date(\'now\')'}`,
    )
    .get(...outletParam) as { total: number };
  const lowStock = db
    .prepare(
      'SELECT COUNT(*) AS total FROM products WHERE status = ? AND current_stock_bottles <= minimum_stock_bottles',
    )
    .get('ACTIVE') as { total: number };
  res.json({ ...orders, pending_amount: pending.total, today_payments: payments.total, low_stock_items: lowStock.total });
});

app.get('/v1/outlets', requireAuth, requireRole('ADMIN'), (_req, res) => {
  res.json(db.prepare('SELECT * FROM outlets ORDER BY name').all());
});

const productSchema = z.object({
  product_name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  size_ml: z.coerce.number().positive(),
  bottles_per_carton: z.coerce.number().positive(),
  purchase_price_per_bottle: z.coerce.number().nonnegative(),
  selling_price_per_bottle: z.coerce.number().nonnegative(),
  carton_purchase_price: z.coerce.number().nonnegative(),
  carton_selling_price: z.coerce.number().nonnegative(),
  full_price: z.coerce.number().nonnegative(),
  half_price: z.coerce.number().nonnegative(),
  quarter_price: z.coerce.number().nonnegative(),
  current_stock_bottles: z.coerce.number().nonnegative().default(0),
  minimum_stock_bottles: z.coerce.number().nonnegative().default(0),
  barcode: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

app.get('/v1/products', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY product_name').all());
});

app.post(
  '/v1/products',
  requireAuth,
  requireRole('ADMIN'),
  upload.fields([{ name: 'bottle_image' }, { name: 'carton_image' }]),
  (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const files = req.files as Record<string, Express.Multer.File[] | undefined>;
    const id = uuid();
    const data = parsed.data;
    const bottleImage = files.bottle_image?.[0]?.filename ? `/uploads/${files.bottle_image[0].filename}` : null;
    const cartonImage = files.carton_image?.[0]?.filename ? `/uploads/${files.carton_image[0].filename}` : null;
    const currentStockMl = data.current_stock_bottles * data.size_ml;
    db.prepare(`
      INSERT INTO products (
        id, product_name, brand, category, size_ml, bottle_image_url, carton_image_url,
        bottles_per_carton, purchase_price_per_bottle, selling_price_per_bottle,
        carton_purchase_price, carton_selling_price, full_price, half_price, quarter_price,
        current_stock_bottles, current_stock_ml, minimum_stock_bottles, barcode, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.product_name,
      data.brand,
      data.category,
      data.size_ml,
      bottleImage,
      cartonImage,
      data.bottles_per_carton,
      data.purchase_price_per_bottle,
      data.selling_price_per_bottle,
      data.carton_purchase_price,
      data.carton_selling_price,
      data.full_price,
      data.half_price,
      data.quarter_price,
      data.current_stock_bottles,
      currentStockMl,
      data.minimum_stock_bottles,
      data.barcode ?? null,
      data.status,
      nowIso(),
      nowIso(),
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    emitBusinessUpdate('product.updated', product);
    res.status(201).json(product);
  },
);

app.post('/v1/products/:id/stock-in', requireAuth, requireRole('ADMIN'), (req, res) => {
  const parsed = z.object({ cartons: z.coerce.number().default(0), bottles: z.coerce.number().default(0), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid stock payload' });
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Product | undefined;
  if (!product) return res.status(404).json({ error: 'product not found' });
  const quantityBottles = parsed.data.bottles + parsed.data.cartons * product.bottles_per_carton;
  const quantityMl = quantityBottles * product.size_ml;
  db.prepare('UPDATE products SET current_stock_bottles = current_stock_bottles + ?, current_stock_ml = current_stock_ml + ?, updated_at = ? WHERE id = ?').run(quantityBottles, quantityMl, nowIso(), product.id);
  db.prepare('INSERT INTO stock_movements (id, product_id, type, quantity_bottles, quantity_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuid(), product.id, 'IN', quantityBottles, quantityMl, parsed.data.note ?? null, nowIso());
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  emitBusinessUpdate('inventory.updated', updated);
  res.json(updated);
});

const orderItemSchema = z.object({
  product_id: z.string(),
  unit_type: z.enum(['BOTTLE', 'CARTON', 'FULL', 'HALF', 'QUARTER']),
  quantity: z.coerce.number().positive(),
});

app.post('/v1/orders', requireAuth, (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'missing user' });
  const parsed = z.object({ outlet_id: z.string().optional(), items: z.array(orderItemSchema).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid order payload' });
  const outletId = req.user.role === 'OUTLET' ? req.user.outlet_id : parsed.data.outlet_id;
  if (!outletId) return res.status(400).json({ error: 'outlet_id required' });
  const result = createOrder(outletId, req.user.id, parsed.data.items);
  void notify({ title: 'New Order Received', message: `${result.outlet_name} placed an order worth ₹${result.sales_total.toLocaleString('en-IN')}.`, type: 'ORDER', data: { orderId: result.id } });
  emitBusinessUpdate('order.created', result);
  res.status(201).json(result);
});

app.get('/v1/orders', requireAuth, (req: AuthedRequest, res) => {
  const filter = req.user?.role === 'OUTLET' ? 'WHERE o.outlet_id = ?' : '';
  const args = req.user?.role === 'OUTLET' ? [req.user.outlet_id] : [];
  res.json(db.prepare(`SELECT o.*, outlets.name AS outlet_name FROM orders o JOIN outlets ON outlets.id = o.outlet_id ${filter} ORDER BY o.created_at DESC`).all(...args));
});

app.get('/v1/orders/:id/items', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT oi.*, p.product_name, p.brand, p.size_ml FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(req.params.id));
});

app.post('/v1/orders/:id/status', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res) => {
  const parsed = z.object({ status: z.enum(['APPROVED', 'DELIVERED', 'CANCELLED', 'REJECTED']) }).safeParse(req.body);
  if (!parsed.success || !req.user) return res.status(400).json({ error: 'invalid status' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as { id: string; outlet_id: string; status: OrderStatus; sales_total: number } | undefined;
  if (!order) return res.status(404).json({ error: 'order not found' });
  if (parsed.data.status === 'DELIVERED' && order.status !== 'DELIVERED') {
    deductStockForOrder(order.id);
    generateInvoice(order.id, order.outlet_id, order.sales_total);
  }
  db.prepare('UPDATE orders SET status = ?, approved_by = ?, delivered_at = CASE WHEN ? = ? THEN ? ELSE delivered_at END, updated_at = ? WHERE id = ?').run(parsed.data.status, req.user.id, parsed.data.status, 'DELIVERED', nowIso(), nowIso(), order.id);
  const updated = db.prepare('SELECT o.*, outlets.name AS outlet_name FROM orders o JOIN outlets ON outlets.id = o.outlet_id WHERE o.id = ?').get(order.id);
  const title = parsed.data.status === 'DELIVERED' ? 'Order Delivered' : `Order ${parsed.data.status.toLowerCase()}`;
  void notify({ outletId: order.outlet_id, title, message: `Your order has been ${parsed.data.status.toLowerCase()}.`, type: parsed.data.status === 'DELIVERED' ? 'BILL' : 'ORDER', data: { orderId: order.id } });
  emitBusinessUpdate('order.updated', updated);
  res.json(updated);
});

app.get('/v1/invoices', requireAuth, (req: AuthedRequest, res) => {
  const filter = req.user?.role === 'OUTLET' ? 'WHERE i.outlet_id = ?' : '';
  const args = req.user?.role === 'OUTLET' ? [req.user.outlet_id] : [];
  res.json(db.prepare(`SELECT i.*, o.order_number, outlets.name AS outlet_name FROM invoices i JOIN orders o ON o.id = i.order_id JOIN outlets ON outlets.id = i.outlet_id ${filter} ORDER BY i.generated_at DESC`).all(...args));
});

app.post('/v1/payments', requireAuth, requireRole('ADMIN'), (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'missing user' });
  const parsed = z.object({
    outlet_id: z.string(),
    invoice_id: z.string().optional().nullable(),
    amount: z.coerce.number().positive(),
    payment_mode: z.enum(['CASH', 'BANK', 'CARD']),
    reference_number: z.string().optional().nullable(),
    payment_date: z.string().default(nowIso()),
    remarks: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payment payload' });
  if ((parsed.data.payment_mode === 'BANK' || parsed.data.payment_mode === 'CARD') && !parsed.data.reference_number) {
    return res.status(400).json({ error: 'reference number required for bank/card' });
  }
  const id = uuid();
  const paymentNumber = `PAY-${Date.now()}`;
  db.prepare(`INSERT INTO payments (id, payment_number, outlet_id, invoice_id, payment_date, amount, payment_mode, reference_number, remarks, received_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, paymentNumber, parsed.data.outlet_id, parsed.data.invoice_id ?? null, parsed.data.payment_date, parsed.data.amount, parsed.data.payment_mode, parsed.data.reference_number ?? null, parsed.data.remarks ?? null, req.user.id, nowIso());
  if (parsed.data.invoice_id) applyPayment(parsed.data.invoice_id, parsed.data.amount);
  const payment = db.prepare('SELECT p.*, outlets.name AS outlet_name FROM payments p JOIN outlets ON outlets.id = p.outlet_id WHERE p.id = ?').get(id);
  void notify({ outletId: parsed.data.outlet_id, title: 'Payment Updated', message: `₹${parsed.data.amount.toLocaleString('en-IN')} payment received.`, type: 'PAYMENT' });
  emitBusinessUpdate('payment.created', payment);
  res.status(201).json(payment);
});

app.get('/v1/payments', requireAuth, (req: AuthedRequest, res) => {
  const filter = req.user?.role === 'OUTLET' ? 'WHERE p.outlet_id = ?' : '';
  const args = req.user?.role === 'OUTLET' ? [req.user.outlet_id] : [];
  res.json(db.prepare(`SELECT p.*, outlets.name AS outlet_name FROM payments p JOIN outlets ON outlets.id = p.outlet_id ${filter} ORDER BY p.payment_date DESC`).all(...args));
});

app.get('/v1/reports/profit', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const productWise = db.prepare(`SELECT p.product_name, SUM(oi.line_sales_total) AS sales, SUM(oi.line_purchase_total) AS purchase, SUM(oi.line_profit) AS profit FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id ORDER BY profit DESC`).all();
  const outletWise = db.prepare(`SELECT outlets.name AS outlet_name, SUM(o.sales_total) AS sales, SUM(o.purchase_total) AS purchase, SUM(o.profit_total) AS profit FROM orders o JOIN outlets ON outlets.id = o.outlet_id GROUP BY outlets.id ORDER BY profit DESC`).all();
  const overall = db.prepare('SELECT COALESCE(SUM(sales_total), 0) AS sales, COALESCE(SUM(purchase_total), 0) AS purchase, COALESCE(SUM(profit_total), 0) AS profit FROM orders').get();
  res.json({ productWise, outletWise, overall });
});

app.get('/v1/notifications', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'missing user' });
  const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? OR (? IS NOT NULL AND outlet_id = ?) OR (? = 'ADMIN' AND user_id IS NULL AND outlet_id IS NULL) ORDER BY created_at DESC LIMIT 100`).all(user.id, user.outlet_id, user.outlet_id, user.role);
  res.json(rows);
});

function createOrder(outletId: string, userId: string, items: OrderItemInput[]) {
  const outlet = db.prepare('SELECT * FROM outlets WHERE id = ?').get(outletId) as { id: string; name: string };
  if (!outlet) throw new Error('outlet not found');
  const orderId = uuid();
  const orderNumber = `ORD-${Date.now()}`;
  let salesTotal = 0;
  let purchaseTotal = 0;
  const calculated = items.map((item) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Product | undefined;
    if (!product || product.status !== 'ACTIVE') throw new Error('product not available');
    const unit = item.unit_type as UnitType;
    const unitSelling = sellingPrice(product, unit);
    const unitPurchase = purchaseCost(product, unit);
    const lineSales = toRupees(unitSelling * item.quantity);
    const linePurchase = toRupees(unitPurchase * item.quantity);
    salesTotal += lineSales;
    purchaseTotal += linePurchase;
    return { item, product, unitSelling, unitPurchase, lineSales, linePurchase };
  });
  db.prepare(`INSERT INTO orders (id, order_number, outlet_id, status, sales_total, purchase_total, profit_total, created_by, created_at, updated_at)
    VALUES (?, ?, ?, 'PLACED', ?, ?, ?, ?, ?, ?)`).run(orderId, orderNumber, outletId, toRupees(salesTotal), toRupees(purchaseTotal), toRupees(salesTotal - purchaseTotal), userId, nowIso(), nowIso());
  const stmt = db.prepare(`INSERT INTO order_items (id, order_id, product_id, unit_type, quantity, unit_selling_price, unit_purchase_cost, line_sales_total, line_purchase_total, line_profit, stock_deducted_bottles, stock_deducted_ml, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const row of calculated) {
    const bottles = bottleEquivalent(row.product, row.item.unit_type as UnitType, row.item.quantity);
    const ml = mlEquivalent(row.product, row.item.unit_type as UnitType, row.item.quantity);
    stmt.run(uuid(), orderId, row.item.product_id, row.item.unit_type, row.item.quantity, row.unitSelling, row.unitPurchase, row.lineSales, row.linePurchase, toRupees(row.lineSales - row.linePurchase), bottles, ml, nowIso());
  }
  return db.prepare('SELECT o.*, outlets.name AS outlet_name FROM orders o JOIN outlets ON outlets.id = o.outlet_id WHERE o.id = ?').get(orderId) as { id: string; outlet_id: string; outlet_name: string; sales_total: number };
}

function deductStockForOrder(orderId: string): void {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as { product_id: string; stock_deducted_bottles: number; stock_deducted_ml: number }[];
  for (const item of items) {
    db.prepare('UPDATE products SET current_stock_bottles = current_stock_bottles - ?, current_stock_ml = current_stock_ml - ?, updated_at = ? WHERE id = ?').run(item.stock_deducted_bottles, item.stock_deducted_ml, nowIso(), item.product_id);
    db.prepare('INSERT INTO stock_movements (id, product_id, type, quantity_bottles, quantity_ml, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuid(), item.product_id, 'OUT', item.stock_deducted_bottles, item.stock_deducted_ml, `Order ${orderId}`, nowIso());
  }
}

function generateInvoice(orderId: string, outletId: string, amount: number): void {
  const existing = db.prepare('SELECT id FROM invoices WHERE order_id = ?').get(orderId);
  if (existing) return;
  const id = uuid();
  const invoiceNumber = `INV-${Date.now()}`;
  db.prepare('INSERT INTO invoices (id, invoice_number, outlet_id, order_id, amount, remaining_balance, status, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, invoiceNumber, outletId, orderId, amount, amount, 'PENDING', nowIso());
  void notify({ outletId, title: 'Bill Generated', message: `Your bill ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')} has been generated.`, type: 'BILL', data: { invoiceId: id } });
}

function applyPayment(invoiceId: string, amount: number): void {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as { id: string; amount: number; paid_amount: number } | undefined;
  if (!invoice) return;
  const paid = toRupees(invoice.paid_amount + amount);
  const remaining = Math.max(0, toRupees(invoice.amount - paid));
  const status = remaining === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
  db.prepare('UPDATE invoices SET paid_amount = ?, remaining_balance = ?, status = ? WHERE id = ?').run(paid, remaining, status, invoiceId);
}

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`Andhrawala API listening on ${port}`);
});
