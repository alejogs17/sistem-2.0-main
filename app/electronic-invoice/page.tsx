"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { DianaService, defaultDianaConfig } from "@/lib/diana"
import { useToast } from "@/hooks/use-toast"
import { InvoiceTemplate } from "@/components/invoice-template"
import { 
  FileText, 
  Send, 
  Eye,
  Settings,
  RefreshCw,
  Search
} from "lucide-react"
import { useRouter } from "next/navigation"


interface ElectronicInvoicePageProps {}

export default function ElectronicInvoicePage({}: ElectronicInvoicePageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [sells, setSells] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSell, setSelectedSell] = useState<any>(null)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [config, setConfig] = useState(defaultDianaConfig)
  const [dianaService] = useState(() => new DianaService(defaultDianaConfig))

  // Función para cerrar todos los modales
  const closeAllModals = () => {
    setSelectedSell(null)
    setIsConfigDialogOpen(false)
  }

  // Función para abrir modal de detalles de venta
  const openSaleDetails = (sell: any) => {
    closeAllModals()
    setSelectedSell(sell)
  }

  // Función para abrir modal de configuración
  const openConfiguration = () => {
    closeAllModals()
    setIsConfigDialogOpen(true)
  }

  // Estados para configuración
  const [configForm, setConfigForm] = useState({
    taxId: defaultDianaConfig.issuer.taxId,
    businessName: defaultDianaConfig.issuer.businessName,
    commercialName: defaultDianaConfig.issuer.commercialName || '',
    address: defaultDianaConfig.issuer.address.line,
    city: defaultDianaConfig.issuer.address.city,
    state: defaultDianaConfig.issuer.address.state,
    countryCode: defaultDianaConfig.issuer.address.countryCode,
    postalCode: defaultDianaConfig.issuer.address.postalCode,
    email: defaultDianaConfig.issuer.email,
    phone: defaultDianaConfig.issuer.phone,
    softwareId: defaultDianaConfig.technical.softwareId,
    softwareVersion: defaultDianaConfig.technical.softwareVersion,
    environment: defaultDianaConfig.technical.environment,
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
          return
        }

        setSession(session)
        await fetchSells()

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
    
    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])



  const fetchSells = async () => {
    try {
      // Obtener solo las ventas del día actual
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const { data, error } = await supabase
        .from("sells")
        .select(`
          *,
          customers(customer_name, cedula, email, phone, address),
          sell_details(
            *,
            products(product_name)
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching sells:", error)
      } else {
        setSells(data || [])
      }
    } catch (error) {
      console.error('Error fetching sells:', error)
    }
  }

  const generateElectronicInvoice = async (sell: any) => {
    try {
      setLoading(true)

      // Obtener detalles completos de la venta
      const { data: details, error: detailsError } = await supabase
        .from("sell_details")
        .select(`
          *,
          products(product_name)
        `)
        .eq("sell_id", sell.id)

      if (detailsError) {
        throw detailsError
      }

      // Preparar datos de la factura para DIAN
      const invoiceData = {
        document_number: `F-${sell.id.toString().padStart(4, '0')}`,
        issue_date: new Date().toISOString().slice(0, 10),
        issue_time: new Date().toTimeString().slice(0, 8),
        currency: 'COP',
        exchange_rate: 1.0,
        operation_type: '10', // Venta estándar
        
        // Datos del emisor (desde configuración)
        issuer: {
          tax_id: config.issuer.taxId,
          business_name: config.issuer.businessName,
          commercial_name: config.issuer.commercialName,
          address: config.issuer.address.line,
          city: config.issuer.address.city,
          state: config.issuer.address.state,
          country_code: config.issuer.address.countryCode,
          postal_code: config.issuer.address.postalCode,
          email: config.issuer.email,
          phone: config.issuer.phone,
        },
        
        // Datos del cliente
        customer: {
          tax_id: sell.customers?.cedula || '22222222',
          business_name: sell.customers?.customer_name || 'Cliente sin nombre',
          commercial_name: sell.customers?.customer_name,
          address: sell.customers?.address || 'Dirección no especificada',
          city: 'Bogotá',
          state: 'Cundinamarca',
          country_code: 'CO',
          postal_code: '110111',
          email: sell.customers?.email || 'cliente@example.com',
          phone: sell.customers?.phone || '3001234567',
          customer_type: 'PERSONA_JURIDICA'
        },
        
        // Líneas de producto
        lines: details?.map((detail: any, index: number) => ({
          id: `item-${index + 1}`,
          description: detail.products?.product_name || 'Producto sin nombre',
          quantity: detail.quantity || detail.sold_quantity || 1,
          unit_measure: '94', // Unidad
          unit_price: detail.unit_price || detail.sold_price || 0,
          total_amount: (detail.quantity || 1) * (detail.unit_price || 0),
          discount_amount: 0,
          tax_amount: 0,
          tax_rate: 19.0,
          product_code: detail.products?.id?.toString() || ''
        })) || [],
        
        // Totales
        line_extension_amount: sell.total_amount || 0,
        tax_exclusive_amount: sell.total_amount || 0,
        tax_inclusive_amount: sell.total_amount || 0,
        allowance_total_amount: 0,
        charge_total_amount: 0,
        payable_amount: sell.total_amount || 0,
        tax_amount: 0,
        tax_rate: 19.0,
        
        // Notas
        notes: ['Factura generada automáticamente por Sistema de Gestión 2.0']
      }

      console.log('Datos de factura preparados:', invoiceData)

      // Llamar al endpoint para generar XML UBL 2.1
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        throw new Error('Error en la generación de la factura')
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Factura electrónica generada",
          description: `CUFE: ${result.document_uuid}`,
        })

        // Opcional: Descargar XML
        if (result.xml_content) {
          const blob = new Blob([result.xml_content], { type: 'application/xml' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `factura-${invoiceData.document_number}.xml`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        }

        // Actualizar lista de ventas
        await fetchSells()
      } else {
        throw new Error(result.error || 'Error desconocido')
      }

    } catch (error) {
      console.error('Error generating electronic invoice:', error)
      toast({
        title: "❌ Error",
        description: `Error al generar factura: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }



  const saveConfiguration = () => {
    const newConfig = {
      ...config,
      issuer: {
        ...config.issuer,
        taxId: configForm.taxId,
        businessName: configForm.businessName,
        commercialName: configForm.commercialName,
        address: {
          line: configForm.address,
          city: configForm.city,
          state: configForm.state,
          countryCode: configForm.countryCode,
          postalCode: configForm.postalCode,
        },
        email: configForm.email,
        phone: configForm.phone,
      },
      technical: {
        ...config.technical,
        softwareId: configForm.softwareId,
        softwareVersion: configForm.softwareVersion,
        environment: configForm.environment as 'HABILITACION' | 'PRODUCCION',
      }
    }

    setConfig(newConfig)
    closeAllModals()

    toast({
      title: "Configuración guardada",
      description: "La configuración de facturación electrónica ha sido actualizada",
    })
  }



  const filteredSells = sells.filter(sell =>
    sell.customers?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sell.id.toString().includes(searchTerm)
  )

  if (!session || loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h2 className="text-xl font-semibold text-gray-700">Cargando facturación electrónica...</h2>
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
            <h1 className="text-3xl font-bold text-gray-900">Facturación Electrónica</h1>
            <p className="text-gray-600">Sube las facturas del día a la DIAN de forma individual</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openConfiguration}>
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </Button>
            <Button onClick={() => fetchSells()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Facturas del Día</h2>
              <p className="text-gray-600">Ventas realizadas hoy que requieren facturación electrónica</p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredSells.map((sell) => (
              <Card key={sell.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-semibold">Venta #{sell.id}</h3>
                        <Badge variant="outline">Pendiente de facturación</Badge>
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
                          <span className="font-medium">Documento:</span>
                          <p>{sell.customers?.cedula || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openSaleDetails(sell)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Plantilla
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => generateElectronicInvoice(sell)}
                        disabled={loading}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Subir Factura
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredSells.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay ventas del día</p>
                  <p className="text-sm text-gray-400">Las ventas realizadas hoy aparecerán aquí</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Plantilla de Factura */}
        <InvoiceTemplate
          sell={selectedSell}
          isOpen={!!selectedSell && !isConfigDialogOpen}
          onClose={closeAllModals}
          onGenerateInvoice={generateElectronicInvoice}
        />

        {/* Dialog de configuración */}
        <Dialog 
          open={isConfigDialogOpen && !selectedSell} 
          onOpenChange={(open) => !open && closeAllModals()}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configuración de Facturación Electrónica</DialogTitle>
              <DialogDescription>
                Configura los datos de tu empresa para la facturación electrónica DIANA
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="issuer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issuer">Datos del Emisor</TabsTrigger>
                <TabsTrigger value="technical">Configuración Técnica</TabsTrigger>
              </TabsList>

              <TabsContent value="issuer" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">NIT *</Label>
                    <Input
                      id="taxId"
                      value={configForm.taxId}
                      onChange={(e) => setConfigForm({ ...configForm, taxId: e.target.value })}
                      placeholder="Ej: 900123456-7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Razón Social *</Label>
                    <Input
                      id="businessName"
                      value={configForm.businessName}
                      onChange={(e) => setConfigForm({ ...configForm, businessName: e.target.value })}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commercialName">Nombre Comercial</Label>
                    <Input
                      id="commercialName"
                      value={configForm.commercialName}
                      onChange={(e) => setConfigForm({ ...configForm, commercialName: e.target.value })}
                      placeholder="Nombre comercial (opcional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={configForm.email}
                      onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })}
                      placeholder="facturacion@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={configForm.phone}
                      onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                      placeholder="+57 1 1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección *</Label>
                    <Input
                      id="address"
                      value={configForm.address}
                      onChange={(e) => setConfigForm({ ...configForm, address: e.target.value })}
                      placeholder="Calle 123 # 45-67"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={configForm.city}
                      onChange={(e) => setConfigForm({ ...configForm, city: e.target.value })}
                      placeholder="Bogotá"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Departamento *</Label>
                    <Input
                      id="state"
                      value={configForm.state}
                      onChange={(e) => setConfigForm({ ...configForm, state: e.target.value })}
                      placeholder="Cundinamarca"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="countryCode">Código País *</Label>
                    <Input
                      id="countryCode"
                      value={configForm.countryCode}
                      onChange={(e) => setConfigForm({ ...configForm, countryCode: e.target.value })}
                      placeholder="CO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Código Postal *</Label>
                    <Input
                      id="postalCode"
                      value={configForm.postalCode}
                      onChange={(e) => setConfigForm({ ...configForm, postalCode: e.target.value })}
                      placeholder="110111"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="softwareId">ID del Software *</Label>
                    <Input
                      id="softwareId"
                      value={configForm.softwareId}
                      onChange={(e) => setConfigForm({ ...configForm, softwareId: e.target.value })}
                      placeholder="SW123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="softwareVersion">Versión del Software *</Label>
                    <Input
                      id="softwareVersion"
                      value={configForm.softwareVersion}
                      onChange={(e) => setConfigForm({ ...configForm, softwareVersion: e.target.value })}
                      placeholder="1.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="environment">Ambiente *</Label>
                    <Select
                      value={configForm.environment}
                      onValueChange={(value) => setConfigForm({ ...configForm, environment: value as 'HABILITACION' | 'PRODUCCION' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HABILITACION">Habilitación (Pruebas)</SelectItem>
                        <SelectItem value="PRODUCCION">Producción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveConfiguration}>
                Guardar Configuración
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



      </main>
    </div>
  )
}
