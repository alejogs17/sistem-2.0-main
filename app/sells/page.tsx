"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Sell, type Customer, type Stock, type SellDetail } from "@/lib/supabase"
import { Plus, ShoppingCart, Trash2, Search, Package, Eye, Printer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { InvoiceTemplate } from "@/components/invoice-template"
import { useRouter } from "next/navigation"

interface SellItem {
  stock_id: string
  product_name: string
  quantity: number
  price: number
  total: number
  available_stock: number
}

interface SellWithDetails extends Sell {
  details?: SellDetail[]
  customer?: Customer
}

export default function SellsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null) // Movido aquí
  const [sells, setSells] = useState<Sell[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItems, setSelectedItems] = useState<SellItem[]>([])
  const [selectedSell, setSelectedSell] = useState<SellWithDetails | null>(null)
  const [isInvoiceView, setIsInvoiceView] = useState(false)
  const invoicePrintRef = useRef<HTMLDivElement>(null)

  // Estados para búsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState("")

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    customer_id: "",
    sell_date: new Date().toISOString().split("T")[0],
    payment_method: "0",
    discount_amount: "0",
  })

  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false)
  const [newCustomerFormData, setNewCustomerFormData] = useState({
    customer_name: "",
    cedula: "",
    email: "",
    phone: "",
    address: "",
    status: true,
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        setSession(session) // Guardar sesión

        // Timeout para las llamadas a la API
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000)
        )

        await Promise.race([
          Promise.all([
            fetchSells(),
            fetchCustomers(), 
            fetchStocks()
          ]),
          timeoutPromise
        ])

      } catch (error) {
        console.error('Error durante la carga inicial:', error)
        toast({
          title: "Error",
          description: "Hubo un problema al cargar los datos",
          variant: "destructive",
        })
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    
    // Ejecutar checkUser inmediatamente
    checkUser()

    // Suscribirse a cambios en la sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      } else {
        setSession(session)
      }
    })

    // Limpiar suscripción
    return () => subscription.unsubscribe()
  }, [router])

  const fetchSells = async () => {
    const { data, error } = await supabase
      .from("sells")
      .select(`
        *,
        customers(customer_name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sells:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas",
        variant: "destructive",
      })
    } else {
      setSells(data || [])
    }
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("customers").select("*").eq("status", 1).order("customer_name")
    if (error) {
      console.error("Error fetching customers:", error)
    } else {
      setCustomers(data || [])
    }
  }

  const fetchStocks = async () => {
    try {
      const { data: stocksData, error: stocksError } = await supabase
        .from("stocks")
        .select("*")
        .gt("current_quantity", 0)
        .eq("status", 1)
        .order("created_at", { ascending: false })

      if (stocksError) {
        console.error("Error fetching stocks:", stocksError)
        return
      }

      // Obtener los productos relacionados
      const stocksWithProducts = await Promise.all(
        (stocksData || []).map(async (stock) => {
          const productResult = await supabase
            .from("products")
            .select("product_name")
            .eq("id", stock.product_id)
            .single()
          
          return {
            ...stock,
            products: productResult.data
          }
        })
      )

      setStocks(stocksWithProducts)
    } catch (error) {
      console.error("Error in fetchStocks:", error)
    }
  }

  const fetchSellDetails = async (sellId: number) => {
    try {
      // Obtener la venta
      const { data: sellData, error: sellError } = await supabase
        .from("sells")
        .select(`
          *,
          customers(*)
        `)
        .eq("id", sellId)
        .single()

      if (sellError) throw sellError

      // Obtener los detalles de la venta
      const { data: detailsData, error: detailsError } = await supabase
        .from("sell_details")
        .select(`
          *,
          products(product_name)
        `)
        .eq("sell_id", sellId)

      if (detailsError) throw detailsError

      const sellWithDetails: SellWithDetails = {
        ...sellData,
        details: detailsData || [],
        customer: sellData.customers,
      }

      setSelectedSell(sellWithDetails)
      setIsDetailDialogOpen(true)
    } catch (error) {
      console.error("Error fetching sell details:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la venta",
        variant: "destructive",
      })
    }
  }

  const addProductToSale = (stock: Stock) => {
    // Verificar si el producto ya está en la venta
    const existingItem = selectedItems.find((item) => item.stock_id === stock.id.toString())

    if (existingItem) {
      toast({
        title: "Producto ya agregado",
        description: "Este producto ya está en la venta. Puedes modificar la cantidad.",
        variant: "destructive",
      })
      return
    }

    const newItem: SellItem = {
      stock_id: stock.id.toString(),
      product_name: stock.products?.product_name || "Producto sin nombre",
      quantity: 1,
      price: stock.selling_price,
      total: stock.selling_price,
      available_stock: stock.current_quantity,
    }

    setSelectedItems([...selectedItems, newItem])
    toast({
      title: "Producto agregado",
      description: `${newItem.product_name} agregado a la venta`,
    })
  }

  const removeItemFromSale = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
  }

  const updateItem = (index: number, field: keyof SellItem, value: any) => {
    const newItems = [...selectedItems]
    const item = newItems[index]

    if (field === "quantity") {
      const quantity = Number.parseInt(value) || 1
      if (quantity > item.available_stock) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${item.available_stock} unidades disponibles`,
          variant: "destructive",
        })
        return
      }
      item.quantity = quantity
      item.total = item.quantity * item.price
    } else if (field === "price") {
      item.price = Number.parseFloat(value) || 0
      item.total = item.quantity * item.price
    }

    setSelectedItems(newItems)
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = Number.parseFloat(formData.discount_amount) || 0
    return Math.max(0, subtotal - discount)
  }

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCustomerFormData.customer_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del cliente es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      const customerData = {
        customer_name: newCustomerFormData.customer_name.trim(),
        cedula: newCustomerFormData.cedula.trim() || null,
        email: newCustomerFormData.email.trim() || null,
        phone: newCustomerFormData.phone.trim() || null,
        address: newCustomerFormData.address.trim() || null,
        status: newCustomerFormData.status ? 1 : 0,
      }

      console.log("Creating customer with data:", customerData)

      const { data, error } = await supabase.from("customers").insert([customerData]).select().single()

      if (error) {
        console.error("Error creating customer:", error)
        toast({
          title: "Error",
          description: `Error al crear cliente: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      console.log("Customer created successfully:", data)

      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      })

      setIsNewCustomerDialogOpen(false)
      resetNewCustomerForm()
      await fetchCustomers()

      // Seleccionar automáticamente el nuevo cliente
      setFormData({ ...formData, customer_id: data.id.toString() })
    } catch (error) {
      console.error("Unexpected error creating customer:", error)
      toast({
        title: "Error",
        description: "Error inesperado al crear el cliente",
        variant: "destructive",
      })
    }
  }

  const resetNewCustomerForm = () => {
    setNewCustomerFormData({
      customer_name: "",
      cedula: "",
      email: "",
      phone: "",
      address: "",
      status: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto a la venta",
        variant: "destructive",
      })
      return
    }

    if (!formData.customer_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    const total = calculateTotal()

    try {
      // Crear la venta
      const sellData = {
        customer_id: Number.parseInt(formData.customer_id),
        branch_id: 1,
        total_amount: total,
        paid_amount: total, // Por ahora asumimos que se paga completo
        sell_date: formData.sell_date,
        discount_amount: Number.parseFloat(formData.discount_amount) || 0,
        payment_method: Number.parseInt(formData.payment_method),
        payment_status: 1, // Pagado
      }

      console.log("Creating sell with data:", sellData)

      const { data: sellResult, error: sellError } = await supabase.from("sells").insert([sellData]).select().single()

      if (sellError) {
        console.error("Error creating sell:", sellError)
        toast({
          title: "Error",
          description: `Error al crear la venta: ${sellError.message}`,
          variant: "destructive",
        })
        return
      }

      console.log("Sell created successfully:", sellResult)

      // Insertar detalles de venta y actualizar stock
      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stock_id)
        if (!stock) continue

        // Insertar detalle de venta
        const sellDetailData = {
          stock_id: Number.parseInt(item.stock_id),
          sell_id: sellResult.id,
          product_id: stock.product_id,
          category_id: stock.category_id,
          vendor_id: stock.vendor_id,
          chalan_no: stock.chalan_no || "",
          selling_date: formData.sell_date,
          customer_id: formData.customer_id,
          sold_quantity: item.quantity,
          buy_price: stock.buying_price,
          sold_price: item.price,
          total_buy_price: stock.buying_price * item.quantity,
          total_sold_price: item.total,
          discount: 0,
          discount_type: 1,
          discount_amount: 0,
        }

        console.log("Creating sell detail:", sellDetailData)

        const { error: detailError } = await supabase.from("sell_details").insert([sellDetailData])

        if (detailError) {
          console.error("Error creating sell detail:", detailError)
          toast({
            title: "Advertencia",
            description: `Error al guardar detalle para ${item.product_name}: ${detailError.message}`,
            variant: "destructive",
          })
          continue
        }

        // Actualizar stock
        const newQuantity = stock.current_quantity - item.quantity
        const { error: stockError } = await supabase
          .from("stocks")
          .update({ current_quantity: newQuantity })
          .eq("id", stock.id)

        if (stockError) {
          console.error("Error updating stock:", stockError)
          toast({
            title: "Advertencia",
            description: `Error al actualizar stock para ${item.product_name}`,
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Éxito",
        description: `Venta #${sellResult.id} registrada correctamente`,
      })

      setIsDialogOpen(false)
      resetForm()
      fetchSells()
      fetchStocks()
    } catch (error) {
      console.error("Unexpected error:", error)
      toast({
        title: "Error",
        description: "Error inesperado al procesar la venta",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: "",
      sell_date: new Date().toISOString().split("T")[0],
      payment_method: "0",
      discount_amount: "0",
    })
    setSelectedItems([])
    setProductSearchTerm("")
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta venta?")) {
      const { error } = await supabase.from("sells").delete().eq("id", id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la venta",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Venta eliminada correctamente",
        })
        fetchSells()
      }
    }
  }

  const handlePrint = () => {
    setIsInvoiceView(true)
    setTimeout(() => {
      if (invoicePrintRef.current) {
        const printContent = invoicePrintRef.current.innerHTML
        const originalContent = document.body.innerHTML
        document.body.innerHTML = printContent
        window.print()
        document.body.innerHTML = originalContent
        window.location.reload()
      }
    }, 500)
  }

  const filteredSells = sells.filter(
    (sell) =>
      sell.customers?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sell.id.toString().includes(searchTerm),
  )

  const filteredStocks = stocks.filter((stock) =>
    stock.products?.product_name.toLowerCase().includes(productSearchTerm.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // No mostrar nada si no hay sesión
  if (!session || loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h2 className="text-xl font-semibold text-gray-700">Verificando acceso...</h2>
            <p className="text-gray-500">Por favor espera mientras verificamos tu sesión</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
            <p className="text-gray-600">Gestiona las ventas y facturación</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Venta</DialogTitle>
                <DialogDescription>Registra una nueva venta de productos</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="customer" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer">1. Cliente</TabsTrigger>
                  <TabsTrigger value="products">2. Productos</TabsTrigger>
                  <TabsTrigger value="summary">3. Resumen</TabsTrigger>
                </TabsList>

                <TabsContent value="customer" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_id">Cliente *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.customer_id}
                          onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.customer_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewCustomerDialogOpen(true)}
                          className="px-3"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell_date">Fecha de Venta *</Label>
                      <Input
                        id="sell_date"
                        type="date"
                        value={formData.sell_date}
                        onChange={(e) => setFormData({ ...formData, sell_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Método de Pago</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Efectivo</SelectItem>
                          <SelectItem value="1">Tarjeta</SelectItem>
                          <SelectItem value="2">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.customer_id && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        ✅ Cliente seleccionado:{" "}
                        {customers.find((c) => c.id.toString() === formData.customer_id)?.customer_name}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Lista de productos disponibles */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Productos Disponibles</h3>
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-500" />
                          <Input
                            placeholder="Buscar productos..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="w-48"
                          />
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        <div className="space-y-2 p-2">
                          {filteredStocks.map((stock) => (
                            <Card
                              key={stock.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => addProductToSale(stock)}
                            >
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <h4 className="font-medium">{stock.products?.product_name}</h4>
                                    <div className="flex gap-4 text-sm text-gray-600">
                                      <span>Stock: {stock.current_quantity}</span>
                                      <span>Precio: ${stock.selling_price}</span>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {filteredStocks.length === 0 && (
                            <p className="text-center text-gray-500 py-8">No hay productos disponibles</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Productos seleccionados */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Productos en Venta</h3>
                        <Badge variant="secondary">{selectedItems.length} productos</Badge>
                      </div>

                      <div className="max-h-96 overflow-y-auto border rounded-lg">
                        <div className="space-y-2 p-2">
                          {selectedItems.map((item, index) => (
                            <Card key={index}>
                              <CardContent className="p-3">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-medium">{item.product_name}</h4>
                                    <Button size="sm" variant="outline" onClick={() => removeItemFromSale(index)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Cantidad</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={item.available_stock}
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Precio</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => updateItem(index, "price", e.target.value)}
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Total</Label>
                                      <Input value={`$${item.total.toFixed(2)}`} disabled className="h-8" />
                                    </div>
                                  </div>

                                  <p className="text-xs text-gray-500">
                                    Stock disponible: {item.available_stock} unidades
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {selectedItems.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                              <p>No hay productos seleccionados</p>
                              <p className="text-sm">Haz clic en los productos de la izquierda para agregarlos</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4">
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-6">
                      {/* Resumen del cliente */}
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">Información del Cliente</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Cliente:</span>
                              <p>
                                {customers.find((c) => c.id.toString() === formData.customer_id)?.customer_name ||
                                  "No seleccionado"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Fecha:</span>
                              <p>{formData.sell_date}</p>
                            </div>
                            <div>
                              <span className="font-medium">Método de Pago:</span>
                              <p>
                                {formData.payment_method === "0" && "Efectivo"}
                                {formData.payment_method === "1" && "Tarjeta"}
                                {formData.payment_method === "2" && "Transferencia"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Resumen de productos */}
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">Productos ({selectedItems.length})</h3>
                          <div className="space-y-2">
                            {selectedItems.map((item, index) => (
                              <div key={index} className="flex justify-between items-center py-2 border-b">
                                <div>
                                  <span className="font-medium">{item.product_name}</span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    {item.quantity} x ${item.price}
                                  </span>
                                </div>
                                <span className="font-bold">${item.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Totales */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="discount_amount">Descuento</Label>
                                <Input
                                  id="discount_amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={calculateSubtotal()}
                                  value={formData.discount_amount}
                                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Totales</Label>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>${calculateSubtotal().toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Descuento:</span>
                                    <span>-${(Number.parseFloat(formData.discount_amount) || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                                    <span>Total:</span>
                                    <span>${calculateTotal().toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={!formData.customer_id || selectedItems.length === 0}>
                        Registrar Venta
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Dialog para nuevo cliente */}
          <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Cliente</DialogTitle>
                <DialogDescription>Agrega un nuevo cliente al sistema</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateNewCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="new_customer_name">Nombre *</Label>
                    <Input
                      id="new_customer_name"
                      value={newCustomerFormData.customer_name}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, customer_name: e.target.value })
                      }
                      required
                      placeholder="Nombre completo del cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_cedula">Cédula</Label>
                    <Input
                      id="new_cedula"
                      value={newCustomerFormData.cedula}
                      onChange={(e) => setNewCustomerFormData({ ...newCustomerFormData, cedula: e.target.value })}
                      placeholder="Ej: 1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_phone">Teléfono</Label>
                    <Input
                      id="new_phone"
                      value={newCustomerFormData.phone}
                      onChange={(e) => setNewCustomerFormData({ ...newCustomerFormData, phone: e.target.value })}
                      placeholder="Ej: +593 99 123 4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_email">Email</Label>
                    <Input
                      id="new_email"
                      type="email"
                      value={newCustomerFormData.email}
                      onChange={(e) => setNewCustomerFormData({ ...newCustomerFormData, email: e.target.value })}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="new_address">Dirección</Label>
                    <Textarea
                      id="new_address"
                      value={newCustomerFormData.address}
                      onChange={(e) => setNewCustomerFormData({ ...newCustomerFormData, address: e.target.value })}
                      placeholder="Dirección completa del cliente"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Switch
                      id="new_status"
                      checked={newCustomerFormData.status}
                      onCheckedChange={(checked) => setNewCustomerFormData({ ...newCustomerFormData, status: checked })}
                    />
                    <Label htmlFor="new_status">Cliente activo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsNewCustomerDialogOpen(false)
                      resetNewCustomerForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Cliente</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <Input
            placeholder="Buscar ventas por cliente o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Lista de ventas */}
        <div className="grid gap-4">
          {filteredSells.map((sell) => (
            <Card key={sell.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-5 h-5 text-gray-500" />
                      <h3 className="text-lg font-semibold">Venta #{sell.id}</h3>
                      <Badge variant={sell.payment_status === 1 ? "default" : "destructive"}>
                        {sell.payment_status === 1 ? "Pagado" : "Pendiente"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Cliente:</span>
                        <p>{sell.customers?.customer_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Total:</span>
                        <p className="font-bold text-green-600">${sell.total_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>
                        <p>{new Date(sell.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Método:</span>
                        <p>
                          {sell.payment_method === 0 && "Efectivo"}
                          {sell.payment_method === 1 && "Tarjeta"}
                          {sell.payment_method === 2 && "Transferencia"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchSellDetails(sell.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(sell.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSells.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay ventas registradas</p>
                <p className="text-sm text-gray-400">Crea tu primera venta para comenzar</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog para ver detalles de venta */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de Venta #{selectedSell?.id}</DialogTitle>
              <DialogDescription>Información completa de la venta</DialogDescription>
            </DialogHeader>

            {selectedSell && (
              <div className="space-y-6">
                {/* Información del cliente y venta */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Información del Cliente</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Nombre:</span>
                          <p>{selectedSell.customer?.customer_name}</p>
                        </div>
                        {selectedSell.customer?.cedula && (
                          <div>
                            <span className="font-medium">Cédula:</span>
                            <p>{selectedSell.customer.cedula}</p>
                          </div>
                        )}
                        {selectedSell.customer?.phone && (
                          <div>
                            <span className="font-medium">Teléfono:</span>
                            <p>{selectedSell.customer.phone}</p>
                          </div>
                        )}
                        {selectedSell.customer?.email && (
                          <div>
                            <span className="font-medium">Email:</span>
                            <p>{selectedSell.customer.email}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Información de la Venta</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Fecha:</span>
                          <p>{selectedSell.sell_date || formatDate(selectedSell.created_at)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Método de Pago:</span>
                          <p>
                            {selectedSell.payment_method === 0 && "Efectivo"}
                            {selectedSell.payment_method === 1 && "Tarjeta"}
                            {selectedSell.payment_method === 2 && "Transferencia"}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Estado:</span>
                          <Badge variant={selectedSell.payment_status === 1 ? "default" : "destructive"}>
                            {selectedSell.payment_status === 1 ? "Pagado" : "Pendiente"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Productos vendidos */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Productos Vendidos</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Producto</th>
                            <th className="text-right py-2">Cantidad</th>
                            <th className="text-right py-2">Precio Unit.</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSell.details && selectedSell.details.length > 0 ? (
                            selectedSell.details.map((detail, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">{detail.products?.product_name || "Producto desconocido"}</td>
                                <td className="text-right py-2">{detail.sold_quantity}</td>
                                <td className="text-right py-2">${detail.sold_price.toFixed(2)}</td>
                                <td className="text-right py-2">${detail.total_sold_price.toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center py-4 text-gray-500">
                                No hay detalles disponibles
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          {selectedSell.discount_amount > 0 && (
                            <tr>
                              <td colSpan={3} className="text-right py-2 font-medium">
                                Subtotal:
                              </td>
                              <td className="text-right py-2 font-medium">
                                ${(selectedSell.total_amount + selectedSell.discount_amount).toFixed(2)}
                              </td>
                            </tr>
                          )}
                          {selectedSell.discount_amount > 0 && (
                            <tr>
                              <td colSpan={3} className="text-right py-2 font-medium">
                                Descuento:
                              </td>
                              <td className="text-right py-2 font-medium">
                                -${selectedSell.discount_amount.toFixed(2)}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t-2">
                            <td colSpan={3} className="text-right py-2 font-bold">
                              Total:
                            </td>
                            <td className="text-right py-2 font-bold">${selectedSell.total_amount.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Vista de impresión */}
                {isInvoiceView && selectedSell.customer && (
                  <div ref={invoicePrintRef} className="hidden">
                    <InvoiceTemplate
                      sell={selectedSell}
                      details={selectedSell.details || []}
                      customer={selectedSell.customer}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Cerrar
              </Button>
              {selectedSell?.customer && (
                <Button onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Factura
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
