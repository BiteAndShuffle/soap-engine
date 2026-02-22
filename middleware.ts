import { NextRequest, NextResponse } from 'next/server'

// Paths that must be publicly accessible for Next.js to function
const PUBLIC_PREFIXES = [
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function middleware(req: NextRequest): NextResponse {
  // Skip auth for static assets and Next.js internals
  if (isPublic(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS

  // If env vars are not set, fail open with a clear server log (dev convenience)
  // but still block access so the app is never silently unprotected in production.
  if (!user || !pass) {
    console.warn(
      '[middleware] BASIC_AUTH_USER / BASIC_AUTH_PASS are not set. ' +
      'Blocking all requests until credentials are configured.'
    )
    return new NextResponse('Authentication credentials not configured.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const authHeader = req.headers.get('authorization')

  if (authHeader) {
    // Authorization: Basic <base64(user:pass)>
    const [scheme, encoded] = authHeader.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      const colonIndex = decoded.indexOf(':')
      if (colonIndex !== -1) {
        const reqUser = decoded.slice(0, colonIndex)
        const reqPass = decoded.slice(colonIndex + 1)
        if (reqUser === user && reqPass === pass) {
          return NextResponse.next()
        }
      }
    }
  }

  // Prompt the browser to show its native Basic Auth dialog
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SOAP Engine", charset="UTF-8"',
      'Content-Type': 'text/plain',
    },
  })
}

// Run middleware on every request except Next.js internals handled above
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
