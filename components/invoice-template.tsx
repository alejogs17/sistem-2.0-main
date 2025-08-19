"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
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
  Plus,
  Trash2
} from "lucide-react"
import { getCompanyConfig } from "@/lib/company-config"

interface InvoiceTemplateProps {
  sell: any
  isOpen: boolean
  onClose: () => void
  onGenerateInvoice?: (sell: any) => void
}

interface InvoiceItem {
  quantity: number
  description: string
  unitPrice: number
  discount: number
  tax: number
  total: number
}

export function InvoiceTemplate({ sell, isOpen, onClose, onGenerateInvoice }: InvoiceTemplateProps) {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceNumber, setInvoiceNumber] = useState('F-0001')
  const [currency, setCurrency] = useState('COP')
  const [paymentMethod, setPaymentMethod] = useState('Transferencia')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])
  
  const companyConfig = getCompanyConfig()

  useEffect(() => {
    if (sell && sell.sell_details) {
      console.log('Datos de la venta:', sell)
      console.log('Detalles de la venta:', sell.sell_details)
      
      const initialItems = sell.sell_details.map((detail: any) => {
        const item = {
          quantity: detail.quantity || detail.sold_quantity || 0,
          description: detail.products?.product_name || 'Producto sin nombre',
          unitPrice: detail.unit_price || detail.sold_price || 0,
          discount: 0,
          tax: companyConfig.invoice.taxRate || 19,
          total: 0
        }
        console.log('Item procesado:', item)
        return item
      })
      setItems(initialItems)
    }
  }, [sell, companyConfig.invoice.taxRate])

  const calculateItemTotal = (item: InvoiceItem) => {
    const net = item.quantity * item.unitPrice * (1 - item.discount / 100)
    const total = net * (1 + item.tax / 100)
    return { net, tax: net * (item.tax / 100), total }
  }

  const calculateTotals = (currentItems: InvoiceItem[]) => {
    let subtotal = 0
    let taxes = 0
    let total = 0

    console.log('Calculando totales para items:', currentItems)

    currentItems.forEach((item, index) => {
      const { net, tax, total: itemTotal } = calculateItemTotal(item)
      console.log(`Item ${index}:`, { item, net, tax, itemTotal })
      subtotal += net
      taxes += tax
      total += itemTotal
    })

    console.log('Resultado final:', { subtotal, taxes, total })
    return { subtotal, taxes, total }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency
    }).format(amount || 0)
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      quantity: 1,
      description: '',
      unitPrice: 0,
      discount: 0,
      tax: companyConfig.invoice.taxRate || 19,
      total: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(newItems)
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handlePrint = () => {
    // Crear una nueva ventana solo con la factura
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      const invoiceContent = document.querySelector('.invoice-container')
      if (invoiceContent) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Factura Electrónica ${invoiceNumber}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                background: white;
                color: black;
                line-height: 1.4;
                padding: 20px;
              }
              
              .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              
              /* Header de la factura */
              .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              
              .brand {
                display: flex;
                align-items: center;
                gap: 16px;
              }
              
              .logo {
                width: 64px;
                height: 64px;
                background: #0d9488;
                color: white;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 18px;
              }
              
              .brand-info h1 {
                font-size: 28px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 4px;
              }
              
              .brand-info p {
                font-size: 14px;
                color: #6b7280;
              }
              
              .invoice-meta {
                text-align: right;
              }
              
              .meta-item {
                margin-bottom: 8px;
              }
              
              .meta-label {
                font-size: 12px;
                color: #6b7280;
                display: block;
                margin-bottom: 2px;
              }
              
              .meta-value {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
              }
              
              /* Secciones de emisor y cliente */
              .parties-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 30px;
              }
              
              .party-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                background: #f9fafb;
              }
              
              .party-title {
                font-size: 14px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 16px;
              }
              
              .party-fields {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              
              .field-item {
                margin-bottom: 12px;
              }
              
              .field-item.full-width {
                grid-column: 1 / -1;
              }
              
              .field-label {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 4px;
                display: block;
              }
              
              .field-value {
                font-size: 14px;
                font-weight: 500;
                color: #1f2937;
              }
              
              /* Tabla de productos */
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
              }
              
              .items-table th {
                background: #f8fafc;
                padding: 12px;
                text-align: left;
                font-size: 13px;
                font-weight: 600;
                color: #6b7280;
                border-bottom: 1px solid #e2e8f0;
              }
              
              .items-table td {
                padding: 12px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
              }
              
              .items-table tr:last-child td {
                border-bottom: none;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
              
              .font-mono {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              }
              
              /* Totales y notas */
              .totals-section {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 24px;
                margin-bottom: 30px;
              }
              
              .notes-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
              }
              
              .notes-title {
                font-size: 14px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 12px;
              }
              
              .notes-content {
                font-size: 14px;
                color: #6b7280;
                line-height: 1.5;
              }
              
              .totals-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px dashed #e5e7eb;
              }
              
              .total-row:last-child {
                border-bottom: none;
                padding-top: 16px;
                border-top: 2px solid #e2e8f0;
              }
              
              .total-label {
                font-size: 14px;
                color: #6b7280;
              }
              
              .total-value {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
              }
              
              .total-value.grand {
                font-size: 18px;
                font-weight: bold;
                color: #0d9488;
              }
              
              /* Footer */
              .invoice-footer {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                align-items: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
              
              .compliance-text {
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
              }
              
              .qr-placeholder {
                width: 120px;
                height: 120px;
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: auto;
                font-size: 12px;
                color: #9ca3af;
                text-align: center;
              }
              
              /* Estilos para impresión */
              @media print {
                body {
                  padding: 0;
                  margin: 0;
                }
                
                .invoice-container {
                  max-width: none;
                  margin: 0;
                }
                
                .party-card,
                .notes-card,
                .totals-card {
                  border: 1px solid #000;
                  background: white;
                }
                
                .items-table {
                  border: 1px solid #000;
                }
                
                .items-table th,
                .items-table td {
                  border: 1px solid #000;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <!-- Header de la factura -->
              <div class="invoice-header">
                <div class="brand">
                  <div class="logo">LOGO</div>
                  <div class="brand-info">
                    <h1>Factura Electrónica</h1>
                    <p>Sistema de Gestión 2.0</p>
                  </div>
                </div>
                <div class="invoice-meta">
                  <div class="meta-item">
                    <span class="meta-label">Serie y número</span>
                    <span class="meta-value">${invoiceNumber}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Fecha de emisión</span>
                    <span class="meta-value">${currentDate}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Moneda</span>
                    <span class="meta-value">${currency}</span>
                  </div>
                </div>
              </div>

              <!-- Información del emisor y cliente -->
              <div class="parties-grid">
                <!-- Emisor -->
                <div class="party-card">
                  <h2 class="party-title">Emisor</h2>
                  <div class="party-fields">
                    <div class="field-item">
                      <span class="field-label">Razón social</span>
                      <div class="field-value">${companyConfig.issuer.businessName}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">NIT</span>
                      <div class="field-value font-mono">${companyConfig.issuer.taxId}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">Dirección</span>
                      <div class="field-value">${companyConfig.issuer.address.line}, ${companyConfig.issuer.address.city}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">Email</span>
                      <div class="field-value">${companyConfig.issuer.email}</div>
                    </div>
                  </div>
                </div>

                <!-- Cliente -->
                <div class="party-card">
                  <h2 class="party-title">Cliente</h2>
                  <div class="party-fields">
                    <div class="field-item">
                      <span class="field-label">Nombre/Razón social</span>
                      <div class="field-value">${sell.customers?.customer_name || ''}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">Documento</span>
                      <div class="field-value font-mono">${sell.customers?.cedula || ''}</div>
                    </div>
                    <div class="field-item full-width">
                      <span class="field-label">Dirección</span>
                      <div class="field-value">${sell.customers?.address || ''}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">Email</span>
                      <div class="field-value">${sell.customers?.email || ''}</div>
                    </div>
                    <div class="field-item">
                      <span class="field-label">Método de pago</span>
                      <div class="field-value">${paymentMethod}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabla de productos -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">Cant.</th>
                    <th>Descripción</th>
                    <th style="width: 120px;">Precio unit.</th>
                    <th style="width: 100px;">Desc. %</th>
                    <th style="width: 100px;">Impuesto %</th>
                    <th style="width: 120px;" class="text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => {
                    const { total } = calculateItemTotal(item)
                    return `
                      <tr>
                        <td>${item.quantity}</td>
                        <td>${item.description}</td>
                        <td class="text-right font-mono">${formatCurrency(item.unitPrice)}</td>
                        <td class="text-right">${item.discount}%</td>
                        <td class="text-right">${item.tax}%</td>
                        <td class="text-right font-mono">${formatCurrency(total)}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>

              <!-- Totales y notas -->
              <div class="totals-section">
                <div class="notes-card">
                  <h3 class="notes-title">Notas</h3>
                  <div class="notes-content">
                    ${notes || 'Condiciones de pago, observaciones, etc.'}
                  </div>
                </div>
                
                <div class="totals-card">
                  <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value font-mono">${formatCurrency(subtotal)}</span>
                  </div>
                  <div class="total-row">
                    <span class="total-label">Impuestos</span>
                    <span class="total-value font-mono">${formatCurrency(taxes)}</span>
                  </div>
                  <div class="total-row">
                    <span class="total-label">Total</span>
                    <span class="total-value font-mono grand">${formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="invoice-footer">
                <div class="compliance-text">
                  Esta factura cumple con los requisitos de facturación electrónica de la DIAN. 
                  Para el envío oficial, se generará el archivo XML correspondiente.
                </div>
                <div class="qr-placeholder">
                  QR / Sello<br/>Digital
                </div>
              </div>
            </div>
          </body>
          </html>
        `)
        
        printWindow.document.close()
        printWindow.focus()
        
        // Esperar un momento y luego imprimir
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    }
  }

  const handleGenerateInvoice = () => {
    if (onGenerateInvoice) {
      onGenerateInvoice(sell)
    }
    onClose()
  }

  const { subtotal, taxes, total } = calculateTotals(items)
  
  // Debug: mostrar totales calculados
  console.log('Totales calculados:', { subtotal, taxes, total })
  console.log('Items actuales:', items)

  if (!sell) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Factura Electrónica #{sell.id}
          </DialogTitle>
          <DialogDescription>
            Plantilla de factura electrónica para DIAN
          </DialogDescription>
        </DialogHeader>

        <div className="invoice-container" style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
          {/* Header de la factura */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-lg flex items-center justify-center font-bold text-base">
                LOGO
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Factura Electrónica</h1>
                <p className="text-xs text-gray-600">Sistema de Gestión 2.0</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <label className="block text-xs text-gray-500">Serie y número</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-40 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                  placeholder="F-0001"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Fecha de emisión</label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información del emisor y cliente */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Emisor */}
            <div className="border border-gray-200 rounded-lg p-3">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Emisor</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Razón social</label>
                  <input
                    type="text"
                    value={companyConfig.issuer.businessName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">NIT</label>
                  <input
                    type="text"
                    value={companyConfig.issuer.taxId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={`${companyConfig.issuer.address.line}, ${companyConfig.issuer.address.city}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={companyConfig.issuer.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="border border-gray-200 rounded-lg p-3">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Cliente</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre/Razón social</label>
                  <input
                    type="text"
                    value={sell.customers?.customer_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Documento</label>
                  <input
                    type="text"
                    value={sell.customers?.cedula || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    readOnly
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={sell.customers?.address || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={sell.customers?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option>Transferencia</option>
                    <option>Tarjeta</option>
                    <option>Efectivo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 mb-4 print-hidden">
            <Button variant="outline" onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Añadir concepto
            </Button>
          </div>

          {/* Tabla de productos */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 border-b border-gray-200" style={{width: '70px'}}>Cant.</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 border-b border-gray-200">Descripción</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 border-b border-gray-200" style={{width: '100px'}}>Precio unit.</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 border-b border-gray-200" style={{width: '80px'}}>Desc. %</th>
                  <th className="text-left p-2 text-xs font-semibold text-gray-600 border-b border-gray-200" style={{width: '80px'}}>Impuesto %</th>
                  <th className="text-right p-2 text-xs font-semibold text-gray-600 border-b border-gray-200" style={{width: '100px'}}>Importe</th>
                  <th className="text-center p-2 text-xs font-semibold text-gray-600 border-b border-gray-200 print-hidden" style={{width: '40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const { total } = calculateItemTotal(item)
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                          placeholder="Servicio o producto"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax}
                          onChange={(e) => updateItem(index, 'tax', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        {formatCurrency(total)}
                      </td>
                      <td className="p-2 text-center print-hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 1}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales y notas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="border border-gray-200 rounded-lg p-3">
                <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Notas</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs min-h-[50px]"
                  placeholder="Condiciones de pago, observaciones, etc."
                />
              </div>
            </div>
            
            <div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Subtotal</span>
                    <span className="font-mono font-semibold text-xs">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Impuestos</span>
                    <span className="font-mono font-semibold text-xs">{formatCurrency(taxes)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">Total</span>
                      <span className="font-mono font-bold text-sm text-teal-600">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-xs text-gray-500">
                  Esta factura cumple con los requisitos de facturación electrónica de la DIAN. 
                  Para el envío oficial, se generará el archivo XML correspondiente.
                </p>
              </div>
              <div className="flex justify-end">
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-400 text-center">QR / Sello<br/>Digital</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 print-hidden">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleGenerateInvoice}>
            <FileText className="w-4 h-4 mr-2" />
            Generar Factura Electrónica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
