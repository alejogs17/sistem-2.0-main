import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mirror cookies onto the response so auth refresh works
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isLogin = pathname.startsWith('/login')
  const isApi = pathname.startsWith('/api')

  // Basic rate limit for API endpoints (per user or IP)
  if (isApi) {
    const userId = session?.user?.id
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const id = userId ? `user:${userId}` : `ip:${ip}`
    try {
      const rl = await rateLimit(id, { limit: 60, windowSec: 60 })
      if (!rl.ok) {
        return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        })
      }
    } catch {
      // Fail open if rate limiter backend is unavailable
    }
  }

  // Redirect unauthenticated users for app pages (let API handlers return 401 themselves)
  if (!session && !isLogin && !isApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Optionally, redirect authenticated users away from the login page
  if (session && isLogin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// Protect everything except the login page and static assets
export const config = {
  matcher: [
    // Exclude Next internals, API rate-limited separately, and all static assets in public/
    '/((?!_next|favicon.ico|logo.png|images|fonts|brand|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|woff|woff2|ttf|eot|otf|map)).*)',
  ],
}
