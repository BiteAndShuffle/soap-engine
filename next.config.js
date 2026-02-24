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

const nextConfig = {
  // ビルド時に BUILD_SHA を埋め込む（サーバーコンポーネントから process.env で参照可能）
  env: {
    NEXT_PUBLIC_BUILD_SHA: BUILD_SHA,
  },

  // Vercel Edge/CDN がレスポンスをキャッシュしないよう強制
  async headers() {
    return [
      {
        source: '/(.*)',
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
}

module.exports = nextConfig
