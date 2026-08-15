/** @type {import('next').NextConfig} */
const { execSync } = require('child_process')

// ビルド時点のコミット SHA を解決する
// 優先順位: VERCEL_GIT_COMMIT_SHA（Vercel CI） > git rev-parse HEAD（ローカル / --prebuilt）
function resolveBuildSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

const BUILD_SHA = resolveBuildSha()

// EXPORT_STATIC=1 のとき完全静的 export モード
const isStaticExport = process.env.EXPORT_STATIC === '1'

const nextConfig = {
  // ビルド時に BUILD_SHA を埋め込む（サーバーコンポーネントから process.env で参照可能）
  env: {
    NEXT_PUBLIC_BUILD_SHA: BUILD_SHA,
    // file:// deployment 判定用（EXPORT_STATIC=1 のときのみ '1'）。
    // Topbar.tsx が persona-icon.webp の参照を絶対/相対で切り替えるために使用する。
    NEXT_PUBLIC_EXPORT_STATIC: isStaticExport ? '1' : '',
  },

  // 静的 export 設定（EXPORT_STATIC=1 のときのみ有効）
  ...(isStaticExport && {
    output: 'export',
    // file:// で index.html を直接開けるよう、_next/static 等の参照を
    // サイトルート相対（/...）ではなく HTML からの相対パス（./...）にする。
    // 通常ビルド（isStaticExport=false）では従来どおり未設定（絶対パス）のまま。
    assetPrefix: '.',
    images: {
      unoptimized: true,
    },
  }),

  // Vercel Edge/CDN が HTML / RSC ペイロードをキャッシュしないよう強制する。
  // ただし /_next/static/** はファイル名にコンテンツハッシュを含み内容が不変のため、
  // 長期 immutable cache の対象とする（F-1 Stage 2。設計根拠:
  // docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md §2）。
  // public/ 配下はコンテンツハッシュを持たないため対象に含めない（D-S2-1）。
  // 静的 export 時は headers() が使えないため無効化する
  ...(!isStaticExport && {
    async headers() {
      return [
        // ① 静的資産のみ長期キャッシュ（コンテンツハッシュ付き = 内容不変）
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        // ② それ以外（HTML / RSC ペイロード / public 配下）は従来どおりキャッシュ禁止。
        //    Next.js はマッチした全ルールのヘッダを適用するため、negative lookahead で
        //    ① の対象を除外し、Cache-Control が二重に付与されないようにする。
        {
          source: '/((?!_next/static).*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ],
        },
      ]
    },
  }),
}

module.exports = nextConfig
