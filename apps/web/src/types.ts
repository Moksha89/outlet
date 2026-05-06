export type Role = 'ADMIN' | 'OUTLET';
export type UnitType = 'BOTTLE' | 'CARTON' | 'FULL' | 'HALF' | 'QUARTER';
export type OrderStatus = 'PLACED' | 'APPROVED' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';
export type PaymentMode = 'CASH' | 'BANK' | 'CARD';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  outlet_id: string | null;
}

export interface Dashboard {
  total_orders: number;
  pending_orders: number;
  delivered_orders: number;
  today_sales: number;
  today_profit: number;
  pending_amount: number;
  today_payments: number;
  low_stock_items: number;
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
  full_price: number;
  half_price: number;
  quarter_price: number;
  current_stock_bottles: number;
  current_stock_ml: number;
  minimum_stock_bottles: number;
  barcode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Outlet {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  credit_limit: number;
}

export interface Order {
  id: string;
  order_number: string;
  outlet_id: string;
  outlet_name: string;
  status: OrderStatus;
  sales_total: number;
  purchase_total: number;
  profit_total: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  outlet_id: string;
  outlet_name: string;
  order_number: string;
  amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  generated_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  outlet_id: string;
  outlet_name: string;
  invoice_id: string | null;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export interface ProfitReport {
  overall: { sales: number; purchase: number; profit: number };
  productWise: { product_name: string; sales: number; purchase: number; profit: number }[];
  outletWise: { outlet_name: string; sales: number; purchase: number; profit: number }[];
}
