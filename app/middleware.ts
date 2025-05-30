import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Busca la cookie de sesión de Supabase (puede ser sb-access-token o sb-session)
  const hasSession =
    request.cookies.get('sb-access-token') ||
    request.cookies.get('sb-session') ||
    request.cookies.get('supabase-auth-token')

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

// Proteger todas las rutas menos /login y archivos estáticos
export const config = {
  matcher: [
    '/((?!login|_next|favicon.ico|logo.png|api|images|fonts).*)',
  ],
}