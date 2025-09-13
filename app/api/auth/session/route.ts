import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createSupabaseServer()
  const { data: { session, user } } = await supabase.auth.getSession()
  return NextResponse.json({ authenticated: !!session, user: user ? { id: user.id, email: user.email } : null })
}

