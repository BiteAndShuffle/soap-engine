// Server Component — 'use client' なし
// データ取得・整形を行い、Client Component にシリアライズして渡す

// Next.js 15 はルートセグメント設定をASTで静的解析するためリテラル値のみ有効。
// 通常は force-dynamic（Vercel 向け）を維持する。
// EXPORT_STATIC=1 の場合は next.config.js 側で output:'export' を設定することで
// 静的ビルドとして扱われるため、page.tsx の dynamic 設定はそのまま無視される。
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { ALL_MODULES } from '../data/modules/index'
import DashboardClient from './components/DashboardClient'
import { reportInvalidScenarios } from '../lib/scenarioValidator'
import { assertModuleValid } from '../lib/moduleValidator'
import { assertCrossModuleValid } from '../lib/crossModuleValidator'

const INITIAL_MODULE_ID = 'dm_glp1ra_semaglutide_oral'
const moduleData = ALL_MODULES.find(m => m.moduleId === INITIAL_MODULE_ID) ?? ALL_MODULES[0]

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

// ── ModuleValidator: モジュールレベル整合性チェック ───────────
// addonsRef 参照切れ / panelOrder 不整合 / key 不一致 等を起動時に検出（致命的エラーはスロー）
ALL_MODULES.forEach((m, i) => {
  try {
    assertModuleValid(m)
  } catch (e) {
    console.error(`[page.tsx] ModuleValidator でエラーが検出されました (index=${i}, moduleId=${m?.moduleId}):`, e)
    // 本番でも起動を止めず、エラーをログに残す（UI バッジで表示する）
  }
})

// ── CrossModuleValidator: モジュール横断一意性チェック ─────────
// moduleId 重複 / scenario.globalId クロスモジュール重複を起動時に検出。
// 致命的エラーがある場合はスローし、build/runtime を停止させる（握り潰しなし）。
assertCrossModuleValid(ALL_MODULES)

// ── ScenarioValidator: 構造的妥当性チェック ───────────────────
// invalid な scenario（必須キー欠落 / S/O/A/P空 / sideEffectPresence不正 等）をログ出力
const invalidScenarios = Array.isArray(moduleData?.scenarios)
  ? reportInvalidScenarios(moduleData.scenarios, moduleData.moduleId)
  : []

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
      <DashboardClient moduleData={moduleData} allModules={ALL_MODULES} />

      {/* ── ScenarioValidator バッジ（invalid > 0 の場合のみ表示） ── */}
      {invalidScenarios.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            right: 8,
            background: 'rgba(255,69,58,0.18)',
            color: '#ff453a',
            border: '1px solid #ff453a44',
            fontFamily: 'monospace',
            fontSize: '0.62rem',
            padding: '4px 8px',
            borderRadius: 4,
            zIndex: 9999,
            pointerEvents: 'none',
            userSelect: 'none',
            maxWidth: 340,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            ⚠️ ScenarioValidator: {invalidScenarios.length}件 invalid
          </div>
          {invalidScenarios.slice(0, 5).map(r => (
            <div key={r.scenarioId} style={{ opacity: 0.9 }}>
              [{r.scenarioId}] {r.errors.map(e => e.code).join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* ── ビルド識別子バッジ ── */}
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
