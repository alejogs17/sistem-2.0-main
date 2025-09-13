import { NextResponse } from 'next/server'
import { iniciarSesionDian } from '@/lib/facturacion-electronica'

export async function POST(request: Request) {
  try {
    let body: any = null
    try {
      body = await request.json()
    } catch {}
    const username = body?.username as string | undefined
    const password = body?.password as string | undefined

    const data = await iniciarSesionDian({ username, password })
    // Expecting { token: string, ... } from external API
    return NextResponse.json({ token: (data as any).token ?? data })
  } catch (err: any) {
    console.error('API Login Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to authenticate with external API', details: err?.details ?? err?.message }, { status })
  }
}
