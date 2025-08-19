"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  FileText, 
  Download, 
  Printer, 
  X,
  Eye
} from "lucide-react"
import { getCompanyConfig } from "@/lib/company-config"

interface InvoiceViewerProps {
  sell: any
  isOpen: boolean
  onClose: () => void
}

export function InvoiceViewer({ sell, isOpen, onClose }: InvoiceViewerProps) {
  const [currentDate] = useState(new Date().toISOString().slice(0, 10))
  const companyConfig = getCompanyConfig()
  
  if (!sell) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount || 0)
  }

  const calculateSubtotal = () => {
    if (!sell.sell_details) return 0
    return sell.sell_details.reduce((total: number, detail: any) => {
      const quantity = detail.quantity || 0
      const unitPrice = detail.unit_price || 0
      return total + (quantity * unitPrice)
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    return subtotal * (companyConfig.invoice.taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Aquí se implementaría la descarga del PDF
    console.log('Descargando factura...')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Factura Electrónica #{sell.id}
          </DialogTitle>
          <DialogDescription>
            Vista previa de la factura electrónica para DIAN
          </DialogDescription>
        </DialogHeader>

        <div className="invoice-container" style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
          {/* Header de la factura */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                LOGO
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Factura Electrónica</h1>
                <p className="text-sm text-gray-600">Sistema de Gestión 2.0</p>
              </div>
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Serie y número</p>
                <p className="font-mono font-semibold">F-{sell.id.toString().padStart(4, '0')}</p>
                <p className="text-sm text-gray-600">Fecha de emisión</p>
                <p className="font-semibold">{currentDate}</p>
                <p className="text-sm text-gray-600">Moneda</p>
                <p className="font-semibold">COP</p>
              </div>
            </div>
          </div>

          {/* Información del emisor y cliente */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Emisor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Emisor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                                 <div>
                   <p className="text-xs text-gray-500">Razón social</p>
                   <p className="font-semibold">{companyConfig.issuer.businessName}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500">NIT</p>
                   <p className="font-mono">{companyConfig.issuer.taxId}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500">Dirección</p>
                   <p>{companyConfig.issuer.address.line}, {companyConfig.issuer.address.city}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500">Email</p>
                   <p>{companyConfig.issuer.email}</p>
                 </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Nombre/Razón social</p>
                  <p className="font-semibold">{sell.customers?.customer_name || 'Cliente sin nombre'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Documento</p>
                  <p className="font-mono">{sell.customers?.cedula || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dirección</p>
                  <p>{sell.customers?.address || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p>{sell.customers?.email || 'No especificado'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de productos */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold text-gray-600 border-b">Cant.</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-600 border-b">Descripción</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-600 border-b">Precio unit.</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-600 border-b">Desc. %</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-600 border-b">Impuesto %</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-600 border-b">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sell.sell_details && sell.sell_details.length > 0 ? (
                      sell.sell_details.map((detail: any, index: number) => {
                                                 const quantity = detail.quantity || 0
                         const unitPrice = detail.unit_price || 0
                         const discount = 0 // Por defecto sin descuento
                         const tax = companyConfig.invoice.taxRate
                        const netAmount = quantity * unitPrice * (1 - discount / 100)
                        const taxAmount = netAmount * (tax / 100)
                        const totalAmount = netAmount + taxAmount

                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="p-3 text-sm">{quantity}</td>
                            <td className="p-3 text-sm font-medium">
                              {detail.products?.product_name || 'Producto sin nombre'}
                            </td>
                            <td className="p-3 text-sm text-right font-mono">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="p-3 text-sm text-right font-mono">
                              {discount}%
                            </td>
                            <td className="p-3 text-sm text-right font-mono">
                              {tax}%
                            </td>
                            <td className="p-3 text-sm text-right font-mono font-semibold">
                              {formatCurrency(totalAmount)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">
                          No hay productos registrados en esta venta
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Factura generada automáticamente por el Sistema de Gestión 2.0. 
                    Esta factura cumple con los requisitos de facturación electrónica de la DIAN.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="font-mono font-semibold">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                                         <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">IVA ({companyConfig.invoice.taxRate}%)</span>
                       <span className="font-mono font-semibold">{formatCurrency(calculateTax())}</span>
                     </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">Total</span>
                        <span className="font-mono font-bold text-lg text-teal-600">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-xs text-gray-500">
                  Esta factura cumple con los requisitos de facturación electrónica de la DIAN. 
                  Para el envío oficial, se generará el archivo XML correspondiente.
                </p>
              </div>
              <div className="flex justify-end">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-400 text-center">QR / Sello<br/>Digital</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
