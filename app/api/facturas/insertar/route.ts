import { NextResponse } from 'next/server'
import { insertarFacturaDian } from '@/lib/facturacion-electronica'

export async function POST(request: Request) {
  try {
    const { invoiceData, token } = await request.json()

    if (!invoiceData || !token) {
      return NextResponse.json({ error: 'Missing invoice data or token' }, { status: 400 })
    }

    const data = await insertarFacturaDian({ invoiceData, token })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('API Insert Invoice Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to insert invoice', details: err?.details ?? err?.message }, { status })
  }
}
