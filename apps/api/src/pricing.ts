import type { Product, UnitType } from './types.js';

export function bottleEquivalent(product: Product, unit: UnitType, quantity: number): number {
  if (unit === 'CARTON') return quantity * product.bottles_per_carton;
  if (unit === 'HALF') return quantity * 0.5;
  if (unit === 'QUARTER') return quantity * 0.25;
  if (unit === 'LITER') return (quantity * 1000) / product.size_ml;
  return quantity;
}

export function mlEquivalent(product: Product, unit: UnitType, quantity: number): number {
  if (unit === 'CARTON') return quantity * product.bottles_per_carton * product.size_ml;
  if (unit === 'HALF') return quantity * (product.size_ml / 2);
  if (unit === 'QUARTER') return quantity * (product.size_ml / 4);
  if (unit === 'LITER') return quantity * 1000;
  return quantity * product.size_ml;
}

export function sellingPrice(product: Product, unit: UnitType): number {
  if (unit === 'CARTON') return product.carton_selling_price;
  if (unit === 'HALF') return product.half_price;
  if (unit === 'QUARTER') return product.quarter_price;
  if (unit === 'FULL') return product.full_price;
  if (unit === 'LITER') return product.liter_selling_price;
  return product.selling_price_per_bottle;
}

export function purchaseCost(product: Product, unit: UnitType): number {
  if (unit === 'CARTON') return product.carton_purchase_price;
  if (unit === 'FULL') return product.full_purchase_price;
  if (unit === 'HALF') return product.half_purchase_price;
  if (unit === 'QUARTER') return product.quarter_purchase_price;
  if (unit === 'LITER') return product.liter_purchase_price;
  return product.purchase_price_per_bottle;
}
