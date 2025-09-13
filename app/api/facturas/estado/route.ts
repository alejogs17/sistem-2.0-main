import { NextResponse } from 'next/server'
import { consultarEstadoDocumentoDian } from '@/lib/facturacion-electronica'

export async function POST(request: Request) {
  try {
    const { documentId, token, documentType } = await request.json()

    if (!documentId || !token) {
      return NextResponse.json({ error: 'Missing document ID or token' }, { status: 400 })
    }

    const data = await consultarEstadoDocumentoDian({ documentId, token, documentType })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('API Get Document Status Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to get document status', details: err?.details ?? err?.message }, { status })
  }
}
