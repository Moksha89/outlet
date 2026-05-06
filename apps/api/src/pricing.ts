import type { Product, UnitType } from './types.js';

export function bottleEquivalent(product: Product, unit: UnitType, quantity: number): number {
  if (unit === 'CARTON') return quantity * product.bottles_per_carton;
  if (unit === 'HALF') return quantity * 0.5;
  if (unit === 'QUARTER') return quantity * 0.25;
  return quantity;
}

export function mlEquivalent(product: Product, unit: UnitType, quantity: number): number {
  if (unit === 'CARTON') return quantity * product.bottles_per_carton * product.size_ml;
  if (unit === 'HALF') return quantity * (product.size_ml / 2);
  if (unit === 'QUARTER') return quantity * (product.size_ml / 4);
  return quantity * product.size_ml;
}

export function sellingPrice(product: Product, unit: UnitType): number {
  if (unit === 'CARTON') return product.carton_selling_price;
  if (unit === 'HALF') return product.half_price;
  if (unit === 'QUARTER') return product.quarter_price;
  if (unit === 'FULL') return product.full_price;
  return product.selling_price_per_bottle;
}

export function purchaseCost(product: Product, unit: UnitType): number {
  if (unit === 'CARTON') return product.carton_purchase_price;
  return bottleEquivalent(product, unit, 1) * product.purchase_price_per_bottle;
}
