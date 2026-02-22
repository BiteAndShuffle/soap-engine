import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────
// パスレベルの公開ホワイトリスト
// Next.js が内部で使うパス (_next/*) はすべて認証をスキップする。
// ここを狭くしすぎると RSC payload / static chunk が 401/503 になり
// Vercel 本番で画面が空白になる。
// ─────────────────────────────────────────────────────────────

function isNextInternal(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||   // static, data, image, chunk すべて
    pathname === '/favicon.ico'
  )
}

export function middleware(req: NextRequest): NextResponse {
  // Next.js 内部リクエストは無条件パス
  if (isNextInternal(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS

  // 環境変数が未設定の場合はロック機能を無効にして素通りさせる。
  // Vercel 環境変数が設定されていない状態で 503 を返すと
  // 画面が完全に空白になるため、fail-open にする。
  if (!user || !pass) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization')

  if (authHeader) {
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

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SOAP Engine", charset="UTF-8"',
      'Content-Type': 'text/plain',
    },
  })
}

// /_next/* を matcher から除外することで
// ミドルウェア自体が呼ばれる範囲を最小化する（パフォーマンス改善）
export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
}
