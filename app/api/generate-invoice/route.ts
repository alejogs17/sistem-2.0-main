import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'

interface InvoiceData {
  document_number: string
  issue_date: string
  issue_time: string
  currency: string
  exchange_rate: number
  operation_type: string
  issuer: {
    tax_id: string
    business_name: string
    commercial_name?: string
    address: string
    city: string
    state: string
    country_code: string
    postal_code: string
    email: string
    phone: string
  }
  customer: {
    tax_id: string
    business_name: string
    commercial_name?: string
    address: string
    city: string
    state: string
    country_code: string
    postal_code: string
    email: string
    phone: string
    customer_type: string
  }
  lines: Array<{
    id: string
    description: string
    quantity: number
    unit_measure: string
    unit_price: number
    total_amount: number
    discount_amount: number
    tax_amount: number
    tax_rate: number
    product_code: string
  }>
  line_extension_amount: number
  tax_exclusive_amount: number
  tax_inclusive_amount: number
  allowance_total_amount: number
  charge_total_amount: number
  payable_amount: number
  tax_amount: number
  tax_rate: number
  notes: string[]
}

export async function POST(request: NextRequest) {
  try {
    const invoiceData: InvoiceData = await request.json()
    
    // Crear archivo temporal con los datos de la factura
    const tempFile = path.join(process.cwd(), 'scripts', 'temp_invoice.json')
    await writeFile(tempFile, JSON.stringify(invoiceData, null, 2))
    
    // Ejecutar script de Python para generar XML UBL 2.1
    const result = await executePythonScript(tempFile)
    
    // Limpiar archivo temporal
    await unlink(tempFile).catch(() => {})
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        document_uuid: result.document_uuid,
        document_number: invoiceData.document_number,
        xml_content: result.xml_content,
        response_code: result.response_code,
        response_message: result.response_message
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error desconocido en la generación de la factura'
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error en generate-invoice:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

async function executePythonScript(inputFile: string): Promise<{
  success: boolean
  document_uuid?: string
  xml_content?: string
  response_code?: string
  response_message?: string
  error?: string
}> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'scripts', 'generate_invoice.py'),
      '--input', inputFile,
      '--output', path.join(process.cwd(), 'scripts', 'xml_output'),
      '--format', 'xml'
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
          // Leer el resultado del archivo de salida
          const outputFile = path.join(process.cwd(), 'scripts', 'xml_output', 'result.json')
          const resultContent = await readFile(outputFile, 'utf-8')
          const result = JSON.parse(resultContent)
          
          // Limpiar archivo de resultado
          await unlink(outputFile).catch(() => {})
          
          resolve({
            success: true,
            document_uuid: result.document_uuid,
            xml_content: result.xml_content,
            response_code: result.response_code,
            response_message: result.response_message
          })
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
