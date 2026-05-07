import type { Request } from 'express';

export type Role = 'ADMIN' | 'OUTLET';
export type UnitType = 'BOTTLE' | 'CARTON' | 'FULL' | 'HALF' | 'QUARTER' | 'LITER';
export type OrderStatus = 'PLACED' | 'APPROVED' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';
export type PaymentMode = 'CASH' | 'BANK' | 'CARD';
export type NotificationType = 'ORDER' | 'BILL' | 'PAYMENT' | 'STOCK' | 'ALERT';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  outlet_id: string | null;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export interface Product {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  size_ml: number;
  bottle_image_url: string | null;
  carton_image_url: string | null;
  bottles_per_carton: number;
  purchase_price_per_bottle: number;
  selling_price_per_bottle: number;
  carton_purchase_price: number;
  carton_selling_price: number;
  carton_stock_count: number;
  full_purchase_price: number;
  full_price: number;
  full_bottles_count: number;
  half_purchase_price: number;
  half_price: number;
  half_bottles_count: number;
  quarter_purchase_price: number;
  quarter_price: number;
  quarter_bottles_count: number;
  liter_purchase_price: number;
  liter_selling_price: number;
  liter_bottles_count: number;
  current_stock_bottles: number;
  current_stock_ml: number;
  minimum_stock_bottles: number;
  barcode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface OrderItemInput {
  product_id: string;
  unit_type: UnitType;
  quantity: number;
}
