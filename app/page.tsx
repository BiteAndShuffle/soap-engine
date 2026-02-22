// Server Component — 'use client' なし
// データ取得・整形を行い、Client Component にシリアライズして渡す

import type { ModuleData } from '../lib/types'
import rawModuleData from '../data/modules/dm_glp1ra_semaglutide_oral_sickday.json'
import DashboardClient from './components/DashboardClient'

const moduleData = rawModuleData as ModuleData

// ── サーバーサイドのデータ検証ログ ────────────────────────────
// Vercel のビルドログ / Function ログで確認できる。
// templates 数が 0 や MISSING の場合は JSON 読み込み失敗を示す。
console.log(
  '[SOAP Engine] moduleData loaded:',
  `moduleId=${moduleData?.moduleId ?? 'MISSING'}`,
  `templates=${moduleData?.templates?.length ?? 'MISSING'}`,
  `addons=${moduleData?.addons?.length ?? 'MISSING'}`,
)

// ── データ破損ガード ──────────────────────────────────────────
// テンプレートが 0 件または未定義の場合は空白画面ではなく
// 明示的なエラー画面を表示する。
const hasValidData =
  Array.isArray(moduleData?.templates) &&
  moduleData.templates.length > 0 &&
  Array.isArray(moduleData?.addons)

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
            templates: {String(moduleData?.templates?.length ?? '?')}件
          </code>
        </p>
      </div>
    )
  }

  return <DashboardClient moduleData={moduleData} />
}
