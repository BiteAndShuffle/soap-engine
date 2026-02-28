// Server Component — 'use client' なし
// データ取得・整形を行い、Client Component にシリアライズして渡す

export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { ModuleData } from '../lib/types'
import rawModuleData from '../data/modules/dm_glp1ra_semaglutide_oral_sickday.json'
import DashboardClient from './components/DashboardClient'

const moduleData = rawModuleData as unknown as ModuleData

// ビルド識別子
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'local'

// ── サーバーサイドのデータ検証ログ ────────────────────────────
const drugSearch = moduleData?.drug?.search
const validationErrors: string[] = []

if (!moduleData?.moduleId) validationErrors.push('moduleId が存在しない')
if (!Array.isArray(moduleData?.scenarios) || moduleData.scenarios.length === 0)
  validationErrors.push('scenarios が空または未定義')
if (drugSearch) {
  if (!Array.isArray(drugSearch.exactAliases))
    validationErrors.push('drug.search.exactAliases が配列でない')
  if (!Array.isArray(drugSearch.prefixAliases))
    validationErrors.push('drug.search.prefixAliases が配列でない')
}

console.log(
  '[SOAP Engine] moduleData loaded:',
  `moduleId=${moduleData?.moduleId ?? 'MISSING'}`,
  `scenarios=${moduleData?.scenarios?.length ?? 'MISSING'}`,
  `drug.search.exactAliases=${drugSearch?.exactAliases?.length ?? 'none'}件`,
  `suppress=${drugSearch?.matchPolicy?.suppressCrossModuleSuggestionsOnExactHit ?? 'none'}`,
)
if (validationErrors.length > 0) {
  console.error('[SOAP Engine] バリデーションエラー:', validationErrors.join(', '))
}

// ── データ破損ガード ──────────────────────────────────────────
const hasValidData =
  Array.isArray(moduleData?.scenarios) &&
  moduleData.scenarios.length > 0

export default function Page() {
  if (!hasValidData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          gap: '0.75rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#1a1a2e',
          color: '#e8e8ff',
        }}
      >
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#ff453a' }}>
          ⚠️ データを読み込めませんでした
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: '#a0a0c0',
            textAlign: 'center',
            maxWidth: 320,
            lineHeight: 1.7,
          }}
        >
          モジュール JSON の読み込みに失敗しました。
          <br />
          Vercel のデプロイログを確認してください。
          <br />
          <code style={{ fontSize: '0.72rem', opacity: 0.7 }}>
            moduleId: {moduleData?.moduleId ?? '（取得不可）'}
            {' / '}
            scenarios: {String(moduleData?.scenarios?.length ?? '?')}件
          </code>
        </p>
      </div>
    )
  }

  return (
    <>
      <DashboardClient moduleData={moduleData} />
      {/* ビルド識別子バッジ */}
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          background: 'rgba(0,0,0,0.65)',
          color: '#a0ffa0',
          fontFamily: 'monospace',
          fontSize: '0.65rem',
          padding: '2px 6px',
          borderRadius: 4,
          zIndex: 9999,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        BUILD: {BUILD_SHA.slice(0, 7)}
      </div>
    </>
  )
}
