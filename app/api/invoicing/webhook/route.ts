import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verificar autenticación del webhook
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Procesar diferentes tipos de webhooks
    const webhookType = body.type || body.event_type
    
    switch (webhookType) {
      case 'invoice_accepted':
        return await handleInvoiceAccepted(body)
      
      case 'invoice_rejected':
        return await handleInvoiceRejected(body)
      
      case 'invoice_pending':
        return await handleInvoicePending(body)
      
      case 'status_update':
        return await handleStatusUpdate(body)
      
      default:
        return NextResponse.json({
          success: false,
          error: `Tipo de webhook no soportado: ${webhookType}`
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error procesando webhook:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 })
  }
}

async function handleInvoiceAccepted(data: any) {
  try {
    const { cufe, dian_uuid, invoice_id, response_xml } = data
    
    // Buscar factura por CUFE o invoice_id
    let query = supabase.from('invoices').select('*')
    
    if (cufe) {
      query = query.eq('cufe', cufe)
    } else if (invoice_id) {
      query = query.eq('id', invoice_id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Se requiere cufe o invoice_id'
      }, { status: 400 })
    }

    const { data: invoice, error } = await query.single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Actualizar estado de la factura
    await supabase
      .from('invoices')
      .update({
        status: 'ACCEPTED',
        dian_uuid: dian_uuid || invoice.dian_uuid,
        cufe: cufe || invoice.cufe
      })
      .eq('id', invoice.id)

    // Guardar XML de respuesta si existe
    if (response_xml) {
      const xmlFileName = `response_${invoice.id}_${Date.now()}.xml`
      const xmlPath = `responses/${xmlFileName}`
      
      await supabase.storage
        .from('documents')
        .upload(xmlPath, response_xml, {
          contentType: 'application/xml',
          cacheControl: '3600'
        })

      // Actualizar factura con URL del XML
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(xmlPath)

      await supabase
        .from('invoices')
        .update({ xml_url: urlData.publicUrl })
        .eq('id', invoice.id)
    }

    // Crear evento
    await supabase
      .from('events')
      .insert({
        invoice_id: invoice.id,
        type: 'INVOICE_ACCEPTED',
        payload_json: {
          cufe,
          dian_uuid,
          response_xml: !!response_xml
        },
        status: 'COMPLETED'
      })

    return NextResponse.json({
      success: true,
      message: 'Factura aceptada procesada correctamente'
    })

  } catch (error) {
    console.error('Error procesando factura aceptada:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error procesando webhook'
    }, { status: 500 })
  }
}

async function handleInvoiceRejected(data: any) {
  try {
    const { cufe, dian_uuid, invoice_id, errors, response_xml } = data
    
    // Buscar factura
    let query = supabase.from('invoices').select('*')
    
    if (cufe) {
      query = query.eq('cufe', cufe)
    } else if (invoice_id) {
      query = query.eq('id', invoice_id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Se requiere cufe o invoice_id'
      }, { status: 400 })
    }

    const { data: invoice, error } = await query.single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Actualizar estado de la factura
    await supabase
      .from('invoices')
      .update({
        status: 'REJECTED'
      })
      .eq('id', invoice.id)

    // Guardar XML de respuesta si existe
    if (response_xml) {
      const xmlFileName = `rejection_${invoice.id}_${Date.now()}.xml`
      const xmlPath = `responses/${xmlFileName}`
      
      await supabase.storage
        .from('documents')
        .upload(xmlPath, response_xml, {
          contentType: 'application/xml',
          cacheControl: '3600'
        })
    }

    // Crear evento
    await supabase
      .from('events')
      .insert({
        invoice_id: invoice.id,
        type: 'INVOICE_REJECTED',
        payload_json: {
          cufe,
          dian_uuid,
          errors,
          response_xml: !!response_xml
        },
        status: 'COMPLETED'
      })

    return NextResponse.json({
      success: true,
      message: 'Factura rechazada procesada correctamente'
    })

  } catch (error) {
    console.error('Error procesando factura rechazada:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error procesando webhook'
    }, { status: 500 })
  }
}

async function handleInvoicePending(data: any) {
  try {
    const { cufe, dian_uuid, invoice_id } = data
    
    // Buscar factura
    let query = supabase.from('invoices').select('*')
    
    if (cufe) {
      query = query.eq('cufe', cufe)
    } else if (invoice_id) {
      query = query.eq('id', invoice_id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Se requiere cufe o invoice_id'
      }, { status: 400 })
    }

    const { data: invoice, error } = await query.single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Actualizar estado de la factura
    await supabase
      .from('invoices')
      .update({
        status: 'SENT'
      })
      .eq('id', invoice.id)

    // Crear evento
    await supabase
      .from('events')
      .insert({
        invoice_id: invoice.id,
        type: 'INVOICE_SENT_TO_DIAN',
        payload_json: {
          cufe,
          dian_uuid
        },
        status: 'COMPLETED'
      })

    return NextResponse.json({
      success: true,
      message: 'Factura pendiente procesada correctamente'
    })

  } catch (error) {
    console.error('Error procesando factura pendiente:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error procesando webhook'
    }, { status: 500 })
  }
}

async function handleStatusUpdate(data: any) {
  try {
    const { cufe, dian_uuid, invoice_id, new_status, message } = data
    
    // Buscar factura
    let query = supabase.from('invoices').select('*')
    
    if (cufe) {
      query = query.eq('cufe', cufe)
    } else if (invoice_id) {
      query = query.eq('id', invoice_id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Se requiere cufe o invoice_id'
      }, { status: 400 })
    }

    const { data: invoice, error } = await query.single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    // Actualizar estado de la factura
    await supabase
      .from('invoices')
      .update({
        status: new_status
      })
      .eq('id', invoice.id)

    // Crear evento
    await supabase
      .from('events')
      .insert({
        invoice_id: invoice.id,
        type: 'DIAN_STATUS_UPDATED',
        payload_json: {
          cufe,
          dian_uuid,
          old_status: invoice.status,
          new_status,
          message
        },
        status: 'COMPLETED'
      })

    return NextResponse.json({
      success: true,
      message: 'Actualización de estado procesada correctamente'
    })

  } catch (error) {
    console.error('Error procesando actualización de estado:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error procesando webhook'
    }, { status: 500 })
  }
}
