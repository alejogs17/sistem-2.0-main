/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
          // Enable HSTS when served over HTTPS (Vercel); adjust max-age as needed
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              // allow Supabase REST/Realtime
              `connect-src 'self' https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')} wss://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}`,
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
