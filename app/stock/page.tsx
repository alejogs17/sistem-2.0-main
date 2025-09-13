"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SearchFilter } from "@/components/ui/search-filter"
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
import { supabase } from "@/lib/supabase"
import type { Stock, Product, Vendor, Category } from "@/types/domain"
import { StocksRepository } from "@/lib/repositories/stocksRepository"
import { ProductsRepository } from "@/lib/repositories/productsRepository"
import { VendorsRepository } from "@/lib/repositories/vendorsRepository"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
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
    productId: "",
    vendorId: "",
    buyingPrice: "",
    sellingPrice: "",
    discount: "0",
    stockQuantity: "",
    currentQuantity: "",
    note: "",
  })

useEffect(() => {
  const load = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000));
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
      toast({ title: 'Error', description: 'Hubo un problema al cargar los datos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
const [loadingStates, setLoadingStates] = useState({
  stocks: true,
  products: true,
  vendors: true,
  categories: true
})

 const stocksRepository = new StocksRepository(supabase)
 const productsRepository = new ProductsRepository(supabase)
 const vendorsRepository = new VendorsRepository(supabase)
 const categoriesRepository = new CategoriesRepository(supabase)

 const fetchStocks = async () => {
  try {
    setLoadingStates(prev => ({ ...prev, stocks: true }))
    console.log("Fetching stocks...")
    const stocksData = await stocksRepository.listWithRelations()
    setStocks(stocksData)
  } catch (error) {
    console.error("Error fetching stocks:", error)
    toast({
      title: "Error",
      description: "No se pudieron cargar los stocks: " + (error as any).message,
      variant: "destructive",
    })
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
  try {
    if (cache.products) return cache.products
    const data = await productsRepository.list()
    setCache(prev => ({...prev, products: data as any}))
    setProducts(data)
  } catch (error) {
    console.error("Error in fetchProducts:", error)
  }
}

  const fetchVendors = async () => {
    const data = await vendorsRepository.list()
    setVendors(data)
  }

  const fetchCategories = async () => {
    const data = await categoriesRepository.listActive()
    setCategories(data)
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

    if (!formData.productId || !formData.buyingPrice || !formData.sellingPrice || !formData.stockQuantity) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const selectedProduct = products.find((p) => p.id === Number.parseInt(formData.productId))

    const stockData = {
      categoryId: selectedProduct?.categoryId || null,
      productCode: generateProductCode(),
      productId: Number.parseInt(formData.productId),
      vendorId: formData.vendorId ? Number.parseInt(formData.vendorId) : null,
      chalanNo: generateChalanNo(),
      buyingPrice: Number.parseFloat(formData.buyingPrice),
      sellingPrice: Number.parseFloat(formData.sellingPrice),
      discount: Number.parseFloat(formData.discount) || 0,
      stockQuantity: Number.parseInt(formData.stockQuantity),
      currentQuantity: Number.parseInt(formData.currentQuantity || formData.stockQuantity),
      note: formData.note,
      status: 1,
    }

    console.log("Sending stock data:", stockData)

    try {
      if (editingStock) {
        await stocksRepository.update(editingStock.id, stockData as any)
      } else {
        await stocksRepository.create(stockData as any)
      }
      toast({
        title: "Éxito",
        description: `Stock ${editingStock ? "actualizado" : "agregado"} correctamente`,
      })
      setIsDialogOpen(false)
      resetForm()

      // Forzar actualización inmediata
      console.log("Actualizando lista de stocks...")
      setTimeout(() => {
        fetchStocks()
      }, 100)
    } catch (e: any) {
      console.error("Database error:", e)
      toast({
        title: "Error",
        description: e?.message || 'No se pudo guardar el stock',
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este stock?")) {
      try {
        // Primero verificar si hay sell_details que referencian este stock
        const { data: sellDetails, error: checkError } = await supabase
          .from("sell_details")
          .select("id")
          .eq("stock_id", id)

        if (checkError) {
          console.error("Error checking sell_details:", checkError)
          toast({
            title: "Error",
            description: "Error al verificar referencias del stock",
            variant: "destructive",
          })
          return
        }

        // Si hay sell_details, mostrar advertencia
        if (sellDetails && sellDetails.length > 0) {
          const shouldContinue = confirm(
            `Este stock tiene ${sellDetails.length} venta(s) asociada(s). ` +
            "Al eliminar el stock, las referencias en las ventas se establecerán como NULL. " +
            "¿Deseas continuar?"
          )
          
          if (!shouldContinue) {
            return
          }
        }

        // Intentar eliminar el stock
        try {
          await stocksRepository.remove(id)
          toast({
            title: "Éxito",
            description: "Stock eliminado correctamente",
          })
          fetchStocks()
        } catch (error: any) {
          console.error("Error deleting stock:", error)
          // Si es un error de restricción de clave foránea, intentar solución manual
          if (error?.code === '23503' || (error?.message && error.message.includes('violates foreign key constraint'))) {
            toast({
              title: "Error de Restricción",
              description: "No se puede eliminar el stock porque tiene ventas asociadas. " +
                          "Ejecuta el script de corrección en la base de datos.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: "No se pudo eliminar el stock" + (error?.message ? `: ${error.message}` : ''),
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Unexpected error in handleDelete:", error)
        toast({
          title: "Error Inesperado",
          description: "Ocurrió un error inesperado al eliminar el stock",
          variant: "destructive",
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      productId: "",
      vendorId: "",
      buyingPrice: "",
      sellingPrice: "",
      discount: "0",
      stockQuantity: "",
      currentQuantity: "",
      note: "",
    })
    setEditingStock(null)
  }

  const openEditDialog = (stock: Stock) => {
    setEditingStock(stock)
    setFormData({
      productId: stock.productId?.toString() || "",
      vendorId: stock.vendorId?.toString() || "",
      buyingPrice: stock.buyingPrice.toString(),
      sellingPrice: stock.sellingPrice.toString(),
      discount: stock.discount.toString(),
      stockQuantity: stock.stockQuantity.toString(),
      currentQuantity: stock.currentQuantity.toString(),
      note: stock.note || "",
    })
    setIsDialogOpen(true)
  }

  // Función de filtrado para productos en el modal
  const filteredProducts = products.filter((product) => {
    const matchesSearch = !searchTerm || product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      !selectedCategory || selectedCategory === "all" || product.categoryId?.toString() === selectedCategory
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log("Recargando stocks manualmente...")
                fetchStocks()
              }}
              disabled={loadingStates.stocks}
            >
              {loadingStates.stocks ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              Recargar
            </Button>
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
                        <SearchFilter
                          placeholder="Nombre del producto..."
                          onFilter={(value) => setSearchTerm(value)}
                          className="w-full"
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
                              formData.productId === product.id.toString() ? "bg-blue-100 border-blue-500" : ""
                            }`}
                            onClick={() => setFormData({ ...formData, productId: product.id.toString() })}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{product.productName}</h4>
                                <p className="text-sm text-gray-500">
                                  Categoría:{" "}
                                  {categories.find((c) => c.id === product.categoryId)?.name || "Sin categoría"}
                                </p>
                              </div>
                              {formData.productId === product.id.toString() && (
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
                          {formData.productId ? (
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {products.find((p) => p.id.toString() === formData.productId)?.productName ||
                                  "Producto no encontrado"}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, productId: "" })}
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
                          value={formData.vendorId}
                          onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
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
                          value={formData.stockQuantity}
                          onChange={(e) => {
                            const quantity = e.target.value
                            setFormData({
                              ...formData,
                              stockQuantity: quantity,
                              currentQuantity: formData.currentQuantity || quantity,
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
                          value={formData.currentQuantity}
                          onChange={(e) => setFormData({ ...formData, currentQuantity: e.target.value })}
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
                          value={formData.buyingPrice}
                          onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
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
                          value={formData.sellingPrice}
                          onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
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
                      {formData.buyingPrice && formData.sellingPrice && (
                        <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Información Calculada:</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Margen de Ganancia:</span>
                              <p className="font-bold text-green-600">
                                $
                                {(
                                  Number.parseFloat(formData.sellingPrice) - Number.parseFloat(formData.buyingPrice)
                                ).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">% de Ganancia:</span>
                              <p className="font-bold text-blue-600">
                                {formData.buyingPrice
                                  ? (
                                      ((Number.parseFloat(formData.sellingPrice) -
                                        Number.parseFloat(formData.buyingPrice)) /
                                        Number.parseFloat(formData.buyingPrice)) *
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
                                {formData.stockQuantity
                                  ? (
                                      Number.parseFloat(formData.sellingPrice) *
                                      Number.parseInt(formData.stockQuantity)
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
        </div>

        {/* Lista de stocks */}
        <div className="grid gap-4">
          {loadingStates.stocks && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando stocks...</p>
              </CardContent>
            </Card>
          )}
          
          {!loadingStates.stocks && stocks.map((stock) => (
            <Card key={stock.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-gray-500" />
                      <h3 className="text-lg font-semibold">
                        {stock.products?.productName || `Producto ID: ${stock.productId || 'N/A'}`}
                      </h3>
                      {stock.currentQuantity <= 10 && <AlertTriangle className="w-5 h-5 text-red-500" />}
                      {stock.currentQuantity === 0 && <Badge variant="destructive">Sin stock</Badge>}
                      {stock.currentQuantity > 0 && stock.currentQuantity <= 10 && (
                        <Badge variant="secondary">Stock bajo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Código: {stock.productCode}</p>
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
                        <p>${stock.buyingPrice}</p>
                      </div>
                      <div>
                        <span className="font-medium">P. Venta:</span>
                        <p className="font-bold text-green-600">${stock.sellingPrice}</p>
                      </div>
                      <div>
                        <span className="font-medium">Stock Total:</span>
                        <p>{stock.stockQuantity}</p>
                      </div>
                      <div>
                        <span className="font-medium">Disponible:</span>
                        <p className={stock.currentQuantity <= 10 ? "text-red-600 font-bold" : "font-bold"}>
                          {stock.currentQuantity}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                      <div>
                        <span className="font-medium">Ganancia:</span>
                        <p className="font-bold text-blue-600">
                          ${(stock.sellingPrice - stock.buyingPrice).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">% Ganancia:</span>
                        <p className="font-bold text-purple-600">
                          {(((stock.sellingPrice - stock.buyingPrice) / stock.buyingPrice) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Valor Total:</span>
                        <p className="font-bold text-green-600">
                          ${(stock.sellingPrice * stock.currentQuantity).toFixed(2)}
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
                <div className="mt-4 p-4 bg-gray-100 rounded text-left">
                  <p className="text-sm font-medium mb-2">Información de Debug:</p>
                  <p className="text-xs text-gray-600">Total de stocks: {stocks.length}</p>
                  <p className="text-xs text-gray-600">Estado de carga: {loadingStates.stocks ? 'Cargando' : 'Completado'}</p>
                  <p className="text-xs text-gray-600">Última actualización: {new Date().toLocaleTimeString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
