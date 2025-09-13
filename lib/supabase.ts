import { createBrowserClient } from '@supabase/ssr'

// Cliente actualizado para el navegador usando @supabase/ssr
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


// Tipos de datos
export interface Category {
  id: number
  name: string
  status: number
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  category_id?: number
  product_name: string
  details?: string
  status: number
  created_at: string
  updated_at: string
  categories?: Category
  vendors?: Vendor
}

export interface Customer {
  id: number
  customer_name: string
  cedula?: string
  email?: string
  phone?: string
  address?: string
  status: number
  created_at: string
  updated_at: string
}

export interface Stock {
  id: number
  category_id?: number
  product_code: string
  product_id?: number
  vendor_id?: number
  user_id?: number
  chalan_no: string
  buying_price: number
  selling_price: number
  discount: number
  stock_quantity: number
  current_quantity: number
  note?: string
  status: number
  created_at: string
  updated_at: string
  products?: Product
  vendors?: Vendor
  categories?: Category
}

export interface Sell {
  id: number
  user_id?: number
  customer_id?: number
  branch_id: number
  total_amount: number
  paid_amount: number
  sell_date?: string
  discount_amount: number
  payment_method: number
  payment_status: number
  created_at: string
  updated_at: string
  customers?: Customer
}

export interface SellDetail {
  id: number
  stock_id?: number
  sell_id?: number
  product_id?: number
  category_id?: number
  vendor_id?: number
  user_id?: number
  chalan_no: string
  selling_date: string
  customer_id: string
  sold_quantity: number
  buy_price: number
  sold_price: number
  total_buy_price: number
  total_sold_price: number
  discount: number
  discount_type: number
  discount_amount: number
  created_at: string
  updated_at: string
  products?: Product
}

// Alias para mantener compatibilidad
export type Supplier = Vendor