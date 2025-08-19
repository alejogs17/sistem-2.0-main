import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'

// Tipos
import type { 
  CreateInvoiceRequest, 
  Invoice, 
  DianResponse,
  DianConfig 
} from '@/lib/types/dian'

// Configuración Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuración DIAN
const dianConfig: DianConfig = {
  software_id: process.env.DIAN_SOFTWARE_ID || 'SOFTWARE_ID_DEFAULT',
  software_pin: process.env.DIAN_SOFTWARE_PIN || 'SOFTWARE_PIN_DEFAULT',
  technical_key: process.env.DIAN_TECHNICAL_KEY || 'TECHNICAL_KEY_DEFAULT',
  certificate_path: process.env.DIAN_CERTIFICATE_P12_URL || '',
  certificate_password: process.env.DIAN_CERTIFICATE_PASSWORD || '',
  environment: (process.env.DIAN_ENVIRONMENT as 'HABILITACION' | 'PRODUCCION') || 'HABILITACION',
  pst_base_url: process.env.PST_BASE_URL,
  pst_api_key: process.env.PST_API_KEY
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateInvoiceRequest = await request.json()
    
    // 1. Validar datos de entrada
    const validation = validateInvoiceRequest(body)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 })
    }

    // 2. Crear factura en base de datos
    const invoice = await createInvoice(body)
    if (!invoice) {
      return NextResponse.json({
        success: false,
        error: 'Error creando factura en base de datos'
      }, { status: 500 })
    }

    // 3. Generar XML UBL 2.1
    const xmlResult = await generateUBLXML(invoice)
    if (!xmlResult.success) {
      await updateInvoiceStatus(invoice.id, 'DRAFT')
      return NextResponse.json({
        success: false,
        error: xmlResult.error
      }, { status: 500 })
    }

    // 4. Firmar XML
    const signedXmlResult = await signXML(xmlResult.xml!)
    if (!signedXmlResult.success) {
      await updateInvoiceStatus(invoice.id, 'DRAFT')
      return NextResponse.json({
        success: false,
        error: signedXmlResult.error
      }, { status: 500 })
    }

    // 5. Enviar a DIAN para validación previa
    const dianResult = await sendToDian(signedXmlResult.xml!)
    if (!dianResult.success) {
      await updateInvoiceStatus(invoice.id, 'DRAFT')
      await createEvent(invoice.id, 'ERROR_OCCURRED', {
        error: dianResult.error,
        response_code: dianResult.response_code
      })
      return NextResponse.json({
        success: false,
        error: dianResult.error
      }, { status: 500 })
    }

    // 6. Actualizar factura con respuesta DIAN
    await updateInvoiceWithDianResponse(invoice.id, dianResult)

    // 7. Crear evento de éxito
    await createEvent(invoice.id, 'INVOICE_ACCEPTED', {
      dian_uuid: dianResult.document_uuid,
      cufe: dianResult.document_uuid // CUFE es el UUID en DIAN
    })

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      dian_uuid: dianResult.document_uuid,
      cufe: dianResult.document_uuid,
      status: 'ACCEPTED'
    })

  } catch (error) {
    console.error('Error en issue invoice:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

// Funciones auxiliares
function validateInvoiceRequest(data: CreateInvoiceRequest): { valid: boolean; error?: string } {
  if (!data.customer_id) return { valid: false, error: 'customer_id es requerido' }
  if (!data.series) return { valid: false, error: 'series es requerido' }
  if (!data.number) return { valid: false, error: 'number es requerido' }
  if (!data.issue_date) return { valid: false, error: 'issue_date es requerido' }
  if (!data.issue_time) return { valid: false, error: 'issue_time es requerido' }
  if (!data.items || data.items.length === 0) return { valid: false, error: 'items es requerido y no puede estar vacío' }
  
  return { valid: true }
}

async function createInvoice(data: CreateInvoiceRequest): Promise<Invoice | null> {
  try {
    // Calcular totales
    const totals = calculateTotals(data.items)
    
    // Crear factura
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        customer_id: data.customer_id,
        series: data.series,
        number: data.number,
        issue_date: data.issue_date,
        issue_time: data.issue_time,
        currency: data.currency || 'COP',
        exchange_rate: data.exchange_rate || 1.0,
        operation_type: data.operation_type || '10',
        line_extension_amount: totals.line_extension_amount,
        tax_exclusive_amount: totals.tax_exclusive_amount,
        tax_inclusive_amount: totals.tax_inclusive_amount,
        allowance_total_amount: totals.allowance_total_amount,
        charge_total_amount: totals.charge_total_amount,
        payable_amount: totals.payable_amount,
        tax_amount: totals.tax_amount,
        tax_rate: totals.tax_rate,
        status: 'DRAFT',
        notes: data.notes || []
      })
      .select()
      .single()

    if (error) throw error

    // Crear items de factura
    const invoiceItems = data.items.map(item => ({
      invoice_id: invoice.id,
      item_id: item.item_id,
      description: item.description,
      quantity: item.quantity,
      unit_measure: item.unit_measure || '94',
      unit_price: item.unit_price,
      discount_pct: item.discount_pct || 0,
      discount_amount: (item.unit_price * item.quantity * (item.discount_pct || 0)) / 100,
      tax_rate: item.tax_rate || 19,
      tax_amount: ((item.unit_price * item.quantity) - ((item.unit_price * item.quantity * (item.discount_pct || 0)) / 100)) * ((item.tax_rate || 19) / 100),
      line_subtotal: item.unit_price * item.quantity,
      line_tax: ((item.unit_price * item.quantity) - ((item.unit_price * item.quantity * (item.discount_pct || 0)) / 100)) * ((item.tax_rate || 19) / 100),
      line_total: (item.unit_price * item.quantity) + (((item.unit_price * item.quantity) - ((item.unit_price * item.quantity * (item.discount_pct || 0)) / 100)) * ((item.tax_rate || 19) / 100)),
      product_code: item.product_code,
      notes: item.notes
    }))

    await supabase.from('invoice_items').insert(invoiceItems)

    // Crear evento
    await createEvent(invoice.id, 'INVOICE_CREATED', { invoice_data: data })

    return invoice
  } catch (error) {
    console.error('Error creating invoice:', error)
    return null
  }
}

function calculateTotals(items: any[]) {
  let line_extension_amount = 0
  let allowance_total_amount = 0
  let tax_amount = 0

  items.forEach(item => {
    const lineTotal = item.unit_price * item.quantity
    const discountAmount = lineTotal * ((item.discount_pct || 0) / 100)
    const taxableAmount = lineTotal - discountAmount
    const itemTax = taxableAmount * ((item.tax_rate || 19) / 100)

    line_extension_amount += lineTotal
    allowance_total_amount += discountAmount
    tax_amount += itemTax
  })

  const tax_exclusive_amount = line_extension_amount - allowance_total_amount
  const tax_inclusive_amount = tax_exclusive_amount + tax_amount
  const charge_total_amount = 0 // Cargos adicionales
  const payable_amount = tax_inclusive_amount + charge_total_amount

  return {
    line_extension_amount,
    tax_exclusive_amount,
    tax_inclusive_amount,
    allowance_total_amount,
    charge_total_amount,
    payable_amount,
    tax_amount,
    tax_rate: 19 // Tasa por defecto
  }
}

async function generateUBLXML(invoice: Invoice): Promise<{ success: boolean; xml?: string; error?: string }> {
  try {
    // Crear archivo temporal con datos de la factura
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_invoice.json')
    const invoiceData = await prepareInvoiceDataForXML(invoice)
    await writeFile(tempFile, JSON.stringify(invoiceData, null, 2))

    // Ejecutar script Python
    const result = await executePythonScript(tempFile, 'generate_ubl')
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error generando XML'
    }
  }
}

async function signXML(xml: string): Promise<{ success: boolean; xml?: string; error?: string }> {
  try {
    // Crear archivo temporal con XML
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_xml.xml')
    await writeFile(tempFile, xml)

    // Ejecutar script Python para firma
    const result = await executePythonScript(tempFile, 'sign_xml')
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error firmando XML'
    }
  }
}

async function sendToDian(signedXml: string): Promise<DianResponse> {
  try {
    // Crear archivo temporal con XML firmado
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_signed_xml.xml')
    await writeFile(tempFile, signedXml)

    // Ejecutar script Python para envío
    const result = await executePythonScript(tempFile, 'send_to_dian')
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error enviando a DIAN'
    }
  }
}

async function executePythonScript(inputFile: string, operation: string): Promise<any> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'scripts', 'diana_service.py'),
      '--operation', operation,
      '--input', inputFile,
      '--output', path.join(process.cwd(), 'scripts', 'xml_output')
    ], {
      cwd: path.join(process.cwd(), 'scripts')
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const outputFile = path.join(process.cwd(), 'scripts', 'xml_output', 'result.json')
          const resultContent = await readFile(outputFile, 'utf-8')
          const result = JSON.parse(resultContent)
          await unlink(outputFile).catch(() => {})
          resolve(result)
        } catch (error) {
          resolve({
            success: false,
            error: 'Error leyendo resultado del script Python'
          })
        }
      } else {
        resolve({
          success: false,
          error: stderr || `Script Python falló con código ${code}`
        })
      }
    })

    pythonProcess.on('error', (error) => {
      resolve({
        success: false,
        error: `Error ejecutando script Python: ${error.message}`
      })
    })
  })
}

async function prepareInvoiceDataForXML(invoice: Invoice): Promise<any> {
  // Obtener datos completos de la factura
  const { data: fullInvoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      organization:organizations(*),
      items:invoice_items(*)
    `)
    .eq('id', invoice.id)
    .single()

  return {
    invoice: fullInvoice,
    config: dianConfig
  }
}

async function updateInvoiceStatus(invoiceId: number, status: string): Promise<void> {
  await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
}

async function updateInvoiceWithDianResponse(invoiceId: number, dianResponse: DianResponse): Promise<void> {
  await supabase
    .from('invoices')
    .update({
      status: dianResponse.success ? 'ACCEPTED' : 'REJECTED',
      dian_uuid: dianResponse.document_uuid,
      cufe: dianResponse.document_uuid
    })
    .eq('id', invoiceId)
}

async function createEvent(invoiceId: number, type: string, payload?: any): Promise<void> {
  await supabase
    .from('events')
    .insert({
      invoice_id: invoiceId,
      type,
      payload_json: payload,
      status: 'COMPLETED'
    })
}
