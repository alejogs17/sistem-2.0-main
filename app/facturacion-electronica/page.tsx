"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function FacturacionElectronicaPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [loadingToken, setLoadingToken] = useState(false)

  const [invoiceJson, setInvoiceJson] = useState<string>("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)

  const [documentId, setDocumentId] = useState<string>("")
  const [checking, setChecking] = useState(false)
  const [statusResult, setStatusResult] = useState<any>(null)

  useEffect(() => {
    setSessionChecked(true)
  }, [])

  const dummyInvoice = useMemo(() => ({
    InvoiceGeneralInformation: {
      IssueDate: new Date().toISOString().slice(0, 10),
      IssueTime: "10:00:00",
      DocumentType: "01",
      Prefix: "SETT",
      Number: "12345",
      Currency: "COP",
      OperationType: "10",
      PaymentMeans: "1",
      PaymentMeansID: "10",
      LineExtensionAmount: 100000,
      TaxExclusiveAmount: 100000,
      TaxInclusiveAmount: 119000,
      AllowanceTotalAmount: 0,
      ChargeTotalAmount: 0,
      PayableAmount: 119000,
    },
    CustomerInformation: {
      IdentificationType: "31",
      IdentificationNumber: "800123456",
      Name: "Cliente de Prueba S.A.S.",
      Email: "cliente@ejemplo.com",
      Address: "Calle 10 # 20-30",
      City: "Bogota",
      CountryCode: "CO",
    },
    ItemInformation: [
      {
        LineExtensionAmount: 100000,
        Quantity: 1,
        UnitMeasure: "94",
        Description: "Servicio de Consultoría",
        PriceAmount: 100000,
        BaseQuantity: 1,
        TaxInformation: [
          { TaxID: "01", TaxAmount: 19000, TaxableAmount: 100000, Percent: 19 },
        ],
      },
    ],
  }), [])

  useEffect(() => {
    // Precargar ejemplo en el editor
    setInvoiceJson(JSON.stringify(dummyInvoice, null, 2))
  }, [dummyInvoice])

  const obtenerToken = async () => {
    setLoadingToken(true)
    try {
      const res = await fetch('/api/autenticacion/iniciar-sesion', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo obtener token')
      setHasToken(true)
      toast({ title: 'Éxito', description: 'Token obtenido correctamente' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setLoadingToken(false)
    }
  }

  const enviarFactura = async () => {
    setSending(true)
    try {
      let payload: any
      try {
        payload = JSON.parse(invoiceJson)
      } catch {
        throw new Error('El JSON de la factura no es válido')
      }
      const res = await fetch('/api/facturas/insertar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceData: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar la factura')
      setSendResult(data)
      // Si viene un DocumentId, lo colocamos para consultar
      if (data?.DocumentId) setDocumentId(String(data.DocumentId))
      toast({ title: 'Factura enviada', description: 'Revisa el resultado abajo' })
    } catch (e: any) {
      setSendResult(null)
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const consultarEstado = async () => {
    if (!documentId) {
      toast({ title: 'Datos incompletos', description: 'Document ID es requerido', variant: 'destructive' })
      return
    }
    setChecking(true)
    try {
      const res = await fetch('/api/facturas/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo consultar estado')
      setStatusResult(data)
      toast({ title: 'Consulta realizada', description: 'Estado obtenido' })
    } catch (e: any) {
      setStatusResult(null)
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setChecking(false)
    }
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación Electrónica</h1>
          <p className="text-gray-600">Prueba de integración con la API de la DIAN</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Autenticación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={obtenerToken} disabled={loadingToken}>
                {loadingToken ? 'Obteniendo...' : 'Obtener Token'}
              </Button>
              <Input readOnly value={hasToken ? 'Sesión activa' : ''} placeholder="Token (no visible)" className="flex-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Enviar Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>JSON de la factura</Label>
              <Textarea rows={12} value={invoiceJson} onChange={(e) => setInvoiceJson(e.target.value)} />
            </div>
            <Button onClick={enviarFactura} disabled={sending || !hasToken}>
              {sending ? 'Enviando...' : 'Enviar Factura de Prueba'}
            </Button>
            {sendResult && (
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">{JSON.stringify(sendResult, null, 2)}</pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Consultar Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="docId">Document ID</Label>
                <Input id="docId" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="ID devuelto por la API" />
              </div>
              <Button onClick={consultarEstado} disabled={checking || !hasToken || !documentId}>
                {checking ? 'Consultando...' : 'Consultar Estado'}
              </Button>
            </div>
            {statusResult && (
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">{JSON.stringify(statusResult, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
