import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'

// Configuración Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice_id } = body

    if (!invoice_id) {
      return NextResponse.json({
        success: false,
        error: 'invoice_id es requerido'
      }, { status: 400 })
    }

    // 1. Obtener factura con datos completos
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        organization:organizations(*),
        items:invoice_items(*)
      `)
      .eq('id', invoice_id)
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // 2. Verificar si ya existe PDF
    if (invoice.pdf_url) {
      return NextResponse.json({
        success: true,
        pdf_url: invoice.pdf_url,
        message: 'PDF ya existe'
      })
    }

    // 3. Generar código QR
    const qrCode = await generateQRCode(invoice)

    // 4. Generar PDF
    const pdfResult = await generatePDF(invoice, qrCode)
    if (!pdfResult.success) {
      return NextResponse.json({
        success: false,
        error: pdfResult.error
      }, { status: 500 })
    }

    // 5. Guardar PDF en storage
    const pdfUrl = await savePDFToStorage(invoice_id, pdfResult.pdf!)

    // 6. Actualizar factura con URL del PDF
    await supabase
      .from('invoices')
      .update({ 
        pdf_url: pdfUrl,
        qr_url: qrCode
      })
      .eq('id', invoice_id)

    // 7. Crear evento
    await supabase
      .from('events')
      .insert({
        invoice_id: invoice_id,
        type: 'PDF_GENERATED',
        payload_json: { pdf_url: pdfUrl },
        status: 'COMPLETED'
      })

    return NextResponse.json({
      success: true,
      pdf_url: pdfUrl,
      qr_code: qrCode
    })

  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

async function generateQRCode(invoice: any): Promise<string> {
  try {
    // Crear datos para QR
    const qrData = {
      cufe: invoice.cufe,
      dian_uuid: invoice.dian_uuid,
      verification_url: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${invoice.cufe}`,
      invoice_data: {
        number: invoice.number,
        series: invoice.series,
        issue_date: invoice.issue_date,
        total: invoice.payable_amount
      }
    }

    // Crear archivo temporal con datos QR
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_qr_data.json')
    await writeFile(tempFile, JSON.stringify(qrData, null, 2))

    // Ejecutar script Python para generar QR
    const result = await executePythonScript(tempFile, 'generate_qr')
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})

    if (result.success) {
      return result.qr_code || ''
    }

    return ''
  } catch (error) {
    console.error('Error generando QR:', error)
    return ''
  }
}

async function generatePDF(invoice: any, qrCode: string): Promise<{ success: boolean; pdf?: Buffer; error?: string }> {
  try {
    // Crear datos para PDF
    const pdfData = {
      invoice: invoice,
      qr_code: qrCode,
      template: 'dian_invoice'
    }

    // Crear archivo temporal con datos PDF
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_pdf_data.json')
    await writeFile(tempFile, JSON.stringify(pdfData, null, 2))

    // Ejecutar script Python para generar PDF
    const result = await executePythonScript(tempFile, 'generate_pdf')
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})

    if (result.success && result.pdf_path) {
      // Leer archivo PDF generado
      const pdfBuffer = await readFile(result.pdf_path)
      
      // Limpiar archivo temporal
      await unlink(result.pdf_path).catch(() => {})

      return {
        success: true,
        pdf: pdfBuffer
      }
    }

    return {
      success: false,
      error: result.error || 'Error generando PDF'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error generando PDF'
    }
  }
}

async function savePDFToStorage(invoiceId: number, pdfBuffer: Buffer): Promise<string> {
  try {
    const fileName = `invoice_${invoiceId}_${Date.now()}.pdf`
    const filePath = `invoices/${fileName}`

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      })

    if (error) throw error

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error guardando PDF:', error)
    throw error
  }
}

async function executePythonScript(inputFile: string, operation: string): Promise<any> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'scripts', 'diana_service.py'),
      '--operation', operation,
      '--input', inputFile,
      '--output', path.join(process.cwd(), 'scripts', 'pdf_output')
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
          const outputFile = path.join(process.cwd(), 'scripts', 'pdf_output', 'result.json')
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
