import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoice_id')
    const cufe = searchParams.get('cufe')
    const dianUuid = searchParams.get('dian_uuid')

    if (!invoiceId && !cufe && !dianUuid) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere invoice_id, cufe o dian_uuid'
      }, { status: 400 })
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        organization:organizations(*),
        items:invoice_items(*),
        events(*)
      `)

    if (invoiceId) {
      query = query.eq('id', invoiceId)
    } else if (cufe) {
      query = query.eq('cufe', cufe)
    } else if (dianUuid) {
      query = query.eq('dian_uuid', dianUuid)
    }

    const { data: invoice, error } = await query.single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Obtener eventos ordenados por fecha
    const events = invoice.events?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || []

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        series: invoice.series,
        status: invoice.status,
        cufe: invoice.cufe,
        dian_uuid: invoice.dian_uuid,
        issue_date: invoice.issue_date,
        payable_amount: invoice.payable_amount,
        customer: invoice.customer,
        organization: invoice.organization,
        items: invoice.items,
        events: events
      }
    })

  } catch (error) {
    console.error('Error consultando estado de factura:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

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

    // Obtener factura
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Si la factura ya tiene CUFE, consultar estado en DIAN
    if (invoice.cufe) {
      const dianStatus = await checkDianStatus(invoice.cufe)
      
      // Actualizar estado si cambió
      if (dianStatus.status !== invoice.status) {
        await supabase
          .from('invoices')
          .update({ status: dianStatus.status })
          .eq('id', invoice_id)

        // Crear evento
        await supabase
          .from('events')
          .insert({
            invoice_id: invoice_id,
            type: 'DIAN_STATUS_UPDATED',
            payload_json: { 
              old_status: invoice.status, 
              new_status: dianStatus.status 
            },
            status: 'COMPLETED'
          })

        invoice.status = dianStatus.status
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id,
          number: invoice.number,
          series: invoice.series,
          status: invoice.status,
          cufe: invoice.cufe,
          dian_uuid: invoice.dian_uuid,
          dian_status: dianStatus
        }
      })
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        series: invoice.series,
        status: invoice.status,
        message: 'Factura sin CUFE - no se puede consultar en DIAN'
      }
    })

  } catch (error) {
    console.error('Error consultando estado en DIAN:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

async function checkDianStatus(cufe: string): Promise<any> {
  try {
    // Aquí implementarías la consulta real a DIAN
    // Por ahora retornamos un mock
    return {
      status: 'ACCEPTED',
      message: 'Documento aceptado por DIAN',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'UNKNOWN',
      message: 'Error consultando DIAN',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
