import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { v4 as uuid } from 'uuid';

const databaseFile = resolve(process.env.DATABASE_FILE ?? './data/andhrawala.db');
const uploadDir = resolve(process.env.UPLOAD_DIR ?? './uploads/catalog');
mkdirSync(dirname(databaseFile), { recursive: true });
mkdirSync(uploadDir, { recursive: true });

const { initDb } = await import(pathToFileURL(resolve('./dist/db.js')).href);
const { catalogProducts } = await import(pathToFileURL(resolve('./dist/catalog/products.js')).href);
initDb();
const db = new Database(databaseFile);
const nowIso = () => new Date().toISOString();
const imageSources = JSON.parse(readFileSync(resolve('./src/catalog/product-images.json'), 'utf8'));
const sourceByName = new Map(imageSources.map((row) => [row.product_name, row.image_source_url]));

function imageExtension(url) {
  const parsed = new URL(url);
  const clean = (parsed.searchParams.get('filename') ?? parsed.pathname).toLowerCase();
  if (clean.endsWith('.png')) return 'png';
  if (clean.endsWith('.webp')) return 'webp';
  if (clean.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’&]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function downloadImage(url, path) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'AndhrawalaInventoryBot/1.0 (https://github.com/Moksha89/outlet)' },
  });
  if (!response.ok) throw new Error(`Image download failed ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(path, buffer);
}

const insert = db.prepare(`
  INSERT INTO products (
    id, product_name, brand, category, size_ml, bottle_image_url, carton_image_url,
    bottles_per_carton, purchase_price_per_bottle, selling_price_per_bottle,
    carton_purchase_price, carton_selling_price, carton_stock_count,
    full_purchase_price, full_price, full_bottles_count,
    half_purchase_price, half_price, half_bottles_count,
    quarter_purchase_price, quarter_price, quarter_bottles_count,
    liter_purchase_price, liter_selling_price, liter_bottles_count,
    current_stock_bottles, current_stock_ml, minimum_stock_bottles, barcode, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, NULL, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 'ACTIVE', ?, ?)
`);
const update = db.prepare(`
  UPDATE products
  SET brand = ?, category = ?, size_ml = ?, bottle_image_url = ?, updated_at = ?
  WHERE product_name = ?
`);
let inserted = 0;
let updated = 0;
for (const product of catalogProducts) {
  const sourceUrl = sourceByName.get(product.product_name);
  let fileName = null;
  if (sourceUrl) {
    fileName = `${slugify(product.product_name)}.${imageExtension(sourceUrl)}`;
    try {
      await downloadImage(sourceUrl, resolve(uploadDir, fileName));
    } catch {
      fileName = null;
    }
  }
  const imagePath = fileName ? `/uploads/catalog/${fileName}` : null;
  const exists = db.prepare('SELECT id FROM products WHERE product_name = ?').get(product.product_name);
  const timestamp = nowIso();
  if (exists) {
    update.run(product.brand, product.category, product.size_ml, imagePath, timestamp, product.product_name);
    updated += 1;
  } else {
    insert.run(uuid(), product.product_name, product.brand, product.category, product.size_ml, imagePath, timestamp, timestamp);
    inserted += 1;
  }
}
console.log(`Seeded catalog products: ${inserted} inserted, ${updated} updated.`);
