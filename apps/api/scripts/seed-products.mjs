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
  const clean = url.toLowerCase().split('?')[0];
  if (clean.endsWith('.png')) return 'png';
  if (clean.endsWith('.webp')) return 'webp';
  if (clean.endsWith('.gif')) return 'gif';
  return 'jpg';
}

async function downloadImage(url, path) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'AndhrawalaInventoryBot/1.0 (https://github.com/Moksha89/outlet)' },
  });
  if (!response.ok) throw new Error(`Image download failed ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(path, buffer);
}

function svgFor(product) {
  const safeName = product.product_name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const safeBrand = product.brand.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const colors = {
    Beer: ['#f7c948', '#7a4a08'],
    Whisky: ['#d4af37', '#3a2505'],
    Whiskey: ['#d4af37', '#3a2505'],
    Vodka: ['#f8fafc', '#94a3b8'],
    Rum: ['#c08457', '#3f1d08'],
    Gin: ['#b8f3e6', '#0f766e'],
    Tequila: ['#fef3c7', '#b45309'],
    Wine: ['#7f1d1d', '#f8fafc'],
    Liqueur: ['#78350f', '#fef3c7'],
    Brandy: ['#92400e', '#fed7aa'],
    Cognac: ['#a16207', '#fde68a'],
    'Ready To Drink': ['#f472b6', '#7e22ce'],
  };
  const [fill, accent] = colors[product.category] ?? ['#d4af37', '#111827'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
  <rect width="420" height="560" rx="36" fill="#f8f8f8"/>
  <rect x="82" y="42" width="256" height="476" rx="30" fill="#101010" opacity="0.08"/>
  <path d="M179 40h62l12 118c2 19 22 34 22 58v235c0 38-31 69-69 69h-12c-38 0-69-31-69-69V216c0-24 20-39 22-58L179 40z" fill="${fill}" stroke="#111" stroke-width="7"/>
  <rect x="163" y="52" width="74" height="128" rx="14" fill="#111" opacity="0.88"/>
  <rect x="141" y="242" width="138" height="142" rx="18" fill="#fff" stroke="${accent}" stroke-width="6"/>
  <text x="210" y="285" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#111">${safeBrand}</text>
  <text x="210" y="322" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#333">${safeName}</text>
  <text x="210" y="354" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="${accent}">${product.size_ml} ML</text>
  <circle cx="304" cy="104" r="35" fill="#0b0b0b"/>
  <text x="304" y="111" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="13" fill="#d4af37">AW</text>
</svg>`;
}

const insert = db.prepare(`
  INSERT INTO products (
    id, product_name, brand, category, size_ml, bottle_image_url, carton_image_url,
    bottles_per_carton, purchase_price_per_bottle, selling_price_per_bottle,
    carton_purchase_price, carton_selling_price, full_price, half_price, quarter_price,
    current_stock_bottles, current_stock_ml, minimum_stock_bottles, barcode, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, NULL, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 'ACTIVE', ?, ?)
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
  const fallbackName = product.bottle_image_url?.split('/').pop();
  let fileName = fallbackName;
  if (sourceUrl) {
    fileName = `${fallbackName?.replace(/\.svg$/, '')}.${imageExtension(sourceUrl)}`;
    try {
      await downloadImage(sourceUrl, resolve(uploadDir, fileName));
    } catch {
      fileName = fallbackName;
      if (fileName) writeFileSync(resolve(uploadDir, fileName), svgFor(product));
    }
  } else if (fileName) {
    writeFileSync(resolve(uploadDir, fileName), svgFor(product));
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
