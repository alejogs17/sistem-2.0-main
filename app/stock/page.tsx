"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Stock, type Product, type Vendor, type Category } from "@/lib/supabase"
import { Plus, Edit, Trash2, Package, AlertTriangle, Search, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function StockPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<Stock | null>(null)

  // Estados para filtros (ahora dentro del modal)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedVendor, setSelectedVendor] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [priceRange, setPriceRange] = useState({ min: "", max: "" })

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    product_id: "",
    vendor_id: "",
    buying_price: "",
    selling_price: "",
    discount: "0",
    stock_quantity: "",
    current_quantity: "",
    note: "",
  })

useEffect(() => {
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Agregamos manejo de errores y un timeout de seguridad
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000)
      );

      await Promise.race([
        Promise.all([
          fetchStocks(),
          fetchProducts(),
          fetchVendors(),
          fetchCategories()
        ]),
        timeoutPromise
      ]);

    } catch (error) {
      console.error('Error durante la carga inicial:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false) // Aseguramos que loading se establezca en false
    }
  }
  
  checkUser()
}, [])
const [loadingStates, setLoadingStates] = useState({
  stocks: true,
  products: true,
  vendors: true,
  categories: true
})

 const fetchStocks = async () => {
  try {
    setLoadingStates(prev => ({ ...prev, stocks: true }))
    const { data, error } = await supabase
      .from("stocks")
      .select(`
        *,
        products:products(*),
        vendors:vendors(*),
        categories:categories(*)
      `)
      .order("id", { ascending: false })
    if (error) throw error
    setStocks(data || [])
  } catch (error) {
    console.error("Error fetching stocks:", error)
    throw error
  } finally {
    setLoadingStates(prev => ({ ...prev, stocks: false }))
  }
}

const [cache, setCache] = useState<{
  products: any[] | null,
  vendors: any[] | null,
  categories: any[] | null
}>({
  products: null,
  vendors: null,
  categories: null
})

const fetchProducts = async () => {
  if (cache.products) return cache.products
  
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", 1)
    .order("product_name")
  
  setCache(prev => ({...prev, products: data}))
  setProducts(data || [])
}

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("*").order("name")
    setVendors(data || [])
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").eq("status", 1).order("name")
    setCategories(data || [])
  }

  const generateProductCode = () => {
    const timestamp = Date.now().toString()
    const randomCode = `STOCK-${timestamp.slice(-8)}`
    return randomCode
  }

  const generateChalanNo = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const time = Date.now().toString().slice(-4)
    return `CH-${year}${month}${day}-${time}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id || !formData.buying_price || !formData.selling_price || !formData.stock_quantity) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const selectedProduct = products.find((p) => p.id === Number.parseInt(formData.product_id))

    const stockData = {
      category_id: selectedProduct?.category_id || null,
      product_code: generateProductCode(),
      product_id: Number.parseInt(formData.product_id),
      vendor_id: formData.vendor_id ? Number.parseInt(formData.vendor_id) : null,
      chalan_no: generateChalanNo(),
      buying_price: Number.parseFloat(formData.buying_price),
      selling_price: Number.parseFloat(formData.selling_price),
      discount: Number.parseFloat(formData.discount) || 0,
      stock_quantity: Number.parseInt(formData.stock_quantity),
      current_quantity: Number.parseInt(formData.current_quantity || formData.stock_quantity),
      note: formData.note,
      status: 1,
    }

    console.log("Sending stock data:", stockData)

    let error
    if (editingStock) {
      const { error: updateError } = await supabase.from("stocks").update(stockData).eq("id", editingStock.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from("stocks").insert([stockData])
      error = insertError
    }

    if (error) {
      console.error("Database error:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `Stock ${editingStock ? "actualizado" : "agregado"} correctamente`,
      })
      setIsDialogOpen(false)
      resetForm()
      fetchStocks()
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este stock?")) {
      const { error } = await supabase.from("stocks").delete().eq("id", id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el stock",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Stock eliminado correctamente",
        })
        fetchStocks()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      product_id: "",
      vendor_id: "",
      buying_price: "",
      selling_price: "",
      discount: "0",
      stock_quantity: "",
      current_quantity: "",
      note: "",
    })
    setEditingStock(null)
  }

  const openEditDialog = (stock: Stock) => {
    setEditingStock(stock)
    setFormData({
      product_id: stock.product_id?.toString() || "",
      vendor_id: stock.vendor_id?.toString() || "",
      buying_price: stock.buying_price.toString(),
      selling_price: stock.selling_price.toString(),
      discount: stock.discount.toString(),
      stock_quantity: stock.stock_quantity.toString(),
      current_quantity: stock.current_quantity.toString(),
      note: stock.note || "",
    })
    setIsDialogOpen(true)
  }

  // Función de filtrado para productos en el modal
  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchTerm || product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      !selectedCategory || selectedCategory === "all" || product.category_id?.toString() === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Función para limpiar filtros del modal
  const clearProductFilters = () => {
    setSearchTerm("")
    setSelectedCategory("")
  }


if (loading) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <h2 className="text-xl font-semibold text-gray-700">Cargando datos...</h2>
          <p className="text-gray-500">Por favor espera mientras se cargan los productos</p>
        </div>
      </main>
    </div>
  )
}

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Stock</h1>
            <p className="text-gray-600">Administra las entradas de productos con precios y cantidades</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStock ? "Editar Stock" : "Agregar Stock de Producto"}</DialogTitle>
                <DialogDescription>
                  {editingStock
                    ? "Modifica los datos del stock"
                    : "Agrega un producto existente al inventario con precios y cantidades"}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="form" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="form">Formulario</TabsTrigger>
                  <TabsTrigger value="search">Buscar Producto</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-semibold">Buscar Producto</h3>
                      </div>
                      <Button variant="outline" size="sm" onClick={clearProductFilters}>
                        <X className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="search">Buscar por nombre</Label>
                        <Input
                          id="search"
                          placeholder="Nombre del producto..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Filtrar por categoría</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las categorías" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded">
                      <div className="grid gap-2 p-2">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${
                              formData.product_id === product.id.toString() ? "bg-blue-100 border-blue-500" : ""
                            }`}
                            onClick={() => setFormData({ ...formData, product_id: product.id.toString() })}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{product.product_name}</h4>
                                <p className="text-sm text-gray-500">
                                  Categoría:{" "}
                                  {categories.find((c) => c.id === product.category_id)?.name || "Sin categoría"}
                                </p>
                              </div>
                              {formData.product_id === product.id.toString() && (
                                <Badge variant="default">Seleccionado</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {filteredProducts.length === 0 && (
                          <p className="text-center text-gray-500 py-4">No se encontraron productos</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="form">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="product_id">Producto Seleccionado *</Label>
                        <div className="p-3 border rounded bg-gray-50">
                          {formData.product_id ? (
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {products.find((p) => p.id.toString() === formData.product_id)?.product_name ||
                                  "Producto no encontrado"}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, product_id: "" })}
                              >
                                Cambiar
                              </Button>
                            </div>
                          ) : (
                            <p className="text-gray-500">
                              Usa la pestaña "Buscar Producto" para seleccionar un producto
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_id">Proveedor</Label>
                        <Select
                          value={formData.vendor_id}
                          onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proveedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sin proveedor</SelectItem>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Cantidad Total *</Label>
                        <Input
                          id="stock_quantity"
                          type="number"
                          min="1"
                          value={formData.stock_quantity}
                          onChange={(e) => {
                            const quantity = e.target.value
                            setFormData({
                              ...formData,
                              stock_quantity: quantity,
                              current_quantity: formData.current_quantity || quantity,
                            })
                          }}
                          required
                          placeholder="Ej: 100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current_quantity">Cantidad Disponible *</Label>
                        <Input
                          id="current_quantity"
                          type="number"
                          min="0"
                          value={formData.current_quantity}
                          onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })}
                          required
                          placeholder="Ej: 100"
                        />
                        <p className="text-xs text-gray-500">Cantidad actualmente disponible para venta</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="buying_price">Precio de Compra *</Label>
                        <Input
                          id="buying_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.buying_price}
                          onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                          required
                          placeholder="Ej: 15.50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="selling_price">Precio de Venta *</Label>
                        <Input
                          id="selling_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.selling_price}
                          onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                          required
                          placeholder="Ej: 20.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount">Descuento</Label>
                        <Input
                          id="discount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                          placeholder="Ej: 2.50"
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="note">Notas</Label>
                        <Textarea
                          id="note"
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          placeholder="Observaciones sobre este lote de productos..."
                          rows={3}
                        />
                      </div>

                      {/* Información calculada */}
                      {formData.buying_price && formData.selling_price && (
                        <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Información Calculada:</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Margen de Ganancia:</span>
                              <p className="font-bold text-green-600">
                                $
                                {(
                                  Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.buying_price)
                                ).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">% de Ganancia:</span>
                              <p className="font-bold text-blue-600">
                                {formData.buying_price
                                  ? (
                                      ((Number.parseFloat(formData.selling_price) -
                                        Number.parseFloat(formData.buying_price)) /
                                        Number.parseFloat(formData.buying_price)) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Valor Total:</span>
                              <p className="font-bold text-purple-600">
                                $
                                {formData.stock_quantity
                                  ? (
                                      Number.parseFloat(formData.selling_price) *
                                      Number.parseInt(formData.stock_quantity)
                                    ).toFixed(2)
                                  : "0.00"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">{editingStock ? "Actualizar" : "Agregar"} Stock</Button>
                    </DialogFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de stocks */}
        <div className="grid gap-4">
          {stocks.map((stock) => (
            <Card key={stock.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-gray-500" />
                      <h3 className="text-lg font-semibold">{stock.products?.product_name}</h3>
                      {stock.current_quantity <= 10 && <AlertTriangle className="w-5 h-5 text-red-500" />}
                      {stock.current_quantity === 0 && <Badge variant="destructive">Sin stock</Badge>}
                      {stock.current_quantity > 0 && stock.current_quantity <= 10 && (
                        <Badge variant="secondary">Stock bajo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Código: {stock.product_code}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Categoría:</span>
                        <p>{stock.categories?.name || "Sin categoría"}</p>
                      </div>
                      <div>
                        <span className="font-medium">Proveedor:</span>
                        <p>{stock.vendors?.name || "Sin proveedor"}</p>
                      </div>
                      <div>
                        <span className="font-medium">P. Compra:</span>
                        <p>${stock.buying_price}</p>
                      </div>
                      <div>
                        <span className="font-medium">P. Venta:</span>
                        <p className="font-bold text-green-600">${stock.selling_price}</p>
                      </div>
                      <div>
                        <span className="font-medium">Stock Total:</span>
                        <p>{stock.stock_quantity}</p>
                      </div>
                      <div>
                        <span className="font-medium">Disponible:</span>
                        <p className={stock.current_quantity <= 10 ? "text-red-600 font-bold" : "font-bold"}>
                          {stock.current_quantity}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                      <div>
                        <span className="font-medium">Ganancia:</span>
                        <p className="font-bold text-blue-600">
                          ${(stock.selling_price - stock.buying_price).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">% Ganancia:</span>
                        <p className="font-bold text-purple-600">
                          {(((stock.selling_price - stock.buying_price) / stock.buying_price) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Valor Total:</span>
                        <p className="font-bold text-green-600">
                          ${(stock.selling_price * stock.current_quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {stock.note && <p className="text-sm text-gray-500 mt-2 italic">Nota: {stock.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(stock)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(stock.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {stocks.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay productos en stock</p>
                <p className="text-sm text-gray-400">Agrega productos del catálogo para comenzar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

