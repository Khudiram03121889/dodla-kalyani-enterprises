export type UserRole = 'owner' | 'executive';

export interface UserProfile {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface Route {
  id: string;
  name: string;
  created_at?: string;
}

export interface Shop {
  id: string;
  route_id: string;
  name: string;
  phone: string;
  address: string;
  incharge?: string;
  gstin?: string;
  fssai?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  display_order?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  hsn_code: string;
  rate: number; // Base selling rate per unit/box
  stock_qty: number; // Available inventory in godown
  gst_rate: number; // Default 5%
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  category_name: string;
  hsn_code?: string;
  qty: number;
  rate: number;
  amount?: number;
  taxable_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
}

export interface Order {
  id: string;
  order_no: string;
  invoice_no: string;
  route_id: string;
  route_name: string;
  shop_id: string;
  shop_name: string;
  shop_phone: string;
  shop_address: string;
  shop_gstin?: string;
  shop_fssai?: string;
  shop_incharge?: string;
  executive_id: string;
  executive_name: string;
  executive_phone: string;
  total_qty: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_gst: number;
  round_off: number;
  grand_total: number;
  status: 'pending' | 'printed';
  printed_at?: string;
  created_at: string;
  items: OrderItem[];
}
