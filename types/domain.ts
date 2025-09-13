// Domain types (camelCase) used across the app/UI

export interface Vendor {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: number
  customerName: string
  cedula?: string
  email?: string
  phone?: string
  address?: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface ProductCategoryRef { name: string }

export interface Product {
  id: number
  categoryId?: number | null
  productName: string
  details?: string | null
  status: number
  createdAt: string
  updatedAt: string
  categories?: ProductCategoryRef
}

export interface StockVendorRef { name: string; phone?: string }
export interface StockCategoryRef { name: string }
export interface StockProductRef { productName: string; details?: string | null; status: number }

export interface Stock {
  id: number
  categoryId?: number | null
  productId?: number | null
  vendorId?: number | null
  userId?: number | null
  productCode: string
  chalanNo: string
  buyingPrice: number
  sellingPrice: number
  discount: number
  stockQuantity: number
  currentQuantity: number
  note?: string | null
  status: number
  createdAt: string
  updatedAt: string
  products?: StockProductRef
  vendors?: StockVendorRef
  categories?: StockCategoryRef
}

export interface Sell {
  id: number
  userId?: number | null
  customerId?: number | null
  branchId: number
  totalAmount: number
  paidAmount: number
  sellDate?: string | null
  discountAmount: number
  paymentMethod: number
  paymentStatus: number
  createdAt: string
  updatedAt: string
  customers?: Customer
}

export interface SellDetailProductRef { 
  id: number
  productName: string 
  description?: string
  unitPrice: number
  status: number
}

export interface SellDetailStock {
  id: number
  price: number
  product: SellDetailProductRef
}

export interface SellDetail {
  id: number
  stockId?: number | null
  sellId?: number | null
  soldQuantity: number
  buyPrice: number
  soldPrice: number
  totalBuyPrice: number
  totalSoldPrice: number
  discount: number
  discountType: number
  discountAmount: number
  createdAt: string
  updatedAt: string
  stock?: SellDetailStock
}

// Extend here as we migrate: Sell, Report DTOs, etc.
