"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { toCamelCaseKeys } from "@/lib/utils/case"
import { BarChart3, TrendingUp, Package, DollarSign, Users, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReportsPage() {
  // 1. Todos los useState deben ir al inicio
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>({})
  const [reportType, setReportType] = useState("sales")
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])

  // 2. Todos los useEffect deben ir después de los useState
  // UseEffect para verificación de sesión
  useEffect(() => {
    // Middleware ya garantiza sesión; no verificamos aquí para acelerar.
  }, [])

  // UseEffect para recuperar filtros guardados
  useEffect(() => {
    const savedFilters = localStorage.getItem('reportFilters')
    if (savedFilters) {
      const { reportType: savedType, dateFrom: savedFrom, dateTo: savedTo } = JSON.parse(savedFilters)
      setReportType(savedType)
      setDateFrom(savedFrom)
      setDateTo(savedTo)
    }
  }, [])

  // UseEffect para guardar filtros
  useEffect(() => {
    localStorage.setItem('reportFilters', JSON.stringify({
      reportType,
      dateFrom,
      dateTo
    }))
  }, [reportType, dateFrom, dateTo])

  // 3. Resto del código (funciones, renderizado, etc.)
  // Asegúrate de que la verificación de loading sea correcta
  

  const validateDates = () => {
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    
    if (fromDate > toDate) {
      toast({
        title: "Error",
        description: "La fecha inicial no puede ser mayor que la fecha final",
        variant: "destructive",
      })
      return false
    }

    // Validar que no sea un rango mayor a 1 año
    const yearInMs = 365 * 24 * 60 * 60 * 1000
    if (toDate.getTime() - fromDate.getTime() > yearInMs) {
      toast({
        title: "Error",
        description: "El rango de fechas no puede ser mayor a 1 año",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  async function generateReport(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault()
    
    if (!validateDates()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Define la función reportPromise fuera del Promise.race
      const reportPromise = async () => {
        let data = {}
        
        try {
          if (reportType === "sales") {
            const { data: salesData, error } = await supabase.rpc("get_sales_report", {
              date_from: dateFrom,
              date_to: dateTo,
            })
            if (error) throw error
            return salesData || {}
          } 
          
          if (reportType === "inventory") {
            const { data: inventoryData, error } = await supabase.rpc("get_inventory_report", {
              date_from: dateFrom,
              date_to: dateTo,
            })
            if (error) throw error
            return inventoryData || {}
          } 
          
          if (reportType === "products") {
            const { data: productsData, error } = await supabase.rpc("get_products_report", {
              date_from: dateFrom,
              date_to: dateTo,
            })
            if (error) throw error
            return productsData || {}
          }

          return {}
        } catch (error: any) {
          throw new Error(`Error al obtener datos: ${error.message}`)
        }
      }

      // Timeout para la generación de reportes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La generación del reporte tomó demasiado tiempo')), 15000)
      )

      // Ejecutar la promesa con timeout
      const raw = await Promise.race([
        reportPromise(),
        timeoutPromise
      ])

      // Verificar si hay datos
      if (Object.keys(raw as any).length === 0) {
        throw new Error('No se obtuvieron datos del reporte')
      }

      setReportData(toCamelCaseKeys(raw))
      
      toast({
        title: "Éxito",
        description: "Reporte generado correctamente",
        variant: "default",
      })

    } catch (error: any) {
      console.error('Error al generar reporte:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el reporte",
        variant: "destructive",
      })
      setReportData({})
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">Analiza el rendimiento de tu negocio</p>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros de Reporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Reporte</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Ventas</SelectItem>
                    <SelectItem value="inventory">Inventario</SelectItem>
                    <SelectItem value="products">Productos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Fecha Desde</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Fecha Hasta</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={generateReport} className="w-full" disabled={isLoading}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {isLoading ? "Generando..." : "Generar Reporte"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span>Generando reporte...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reporte de Ventas */}
        {reportType === "sales" && !isLoading && reportData.totalSales !== undefined && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${reportData.totalSales?.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${reportData.averageOrderValue?.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topProducts?.length > 0 ? (
                      reportData.topProducts.map((product: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">Cantidad: {product.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${product.revenue.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mejores Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.bestCustomers?.length > 0 ? (
                      reportData.bestCustomers.map((customer: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{customer.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${customer.total.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Reporte de Inventario */}
        {reportType === "inventory" && !isLoading && reportData.totalProducts !== undefined && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${reportData.totalValue?.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{reportData.lowStockCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Valor por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topCategories?.length > 0 ? (
                      reportData.topCategories.map((category: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{category.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${category.value.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Productos con Stock Bajo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.lowStockItems?.length > 0 ? (
                      reportData.lowStockItems.slice(0, 10).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.products?.productName}</p>
                            <p className="text-sm text-gray-500">Código: {item.productCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{item.currentQuantity} unidades</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No hay productos con stock bajo</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Reporte de Productos */}
        {reportType === "products" && !isLoading && reportData.totalProducts !== undefined && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
                  <Package className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{reportData.activeProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalCategories}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalVendors}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Categoría</CardTitle>
                <CardDescription>Cantidad de productos por categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.categoryDistribution?.length > 0 ? (
                    reportData.categoryDistribution.map((category: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{category.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{category.count} productos</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mensaje cuando no hay datos */}
        {!isLoading &&
          ((reportType === "sales" && reportData.totalSales === undefined) ||
            (reportType === "inventory" && reportData.totalProducts === undefined) ||
            (reportType === "products" && reportData.totalProducts === undefined)) && (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos disponibles</p>
                <p className="text-sm text-gray-400">Haz clic en "Generar Reporte" para ver los resultados</p>
              </CardContent>
            </Card>
          )}
      </main>
    </div>
  )
}
