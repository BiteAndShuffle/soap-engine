'use client'

import type { Scenario } from '../../lib/types'
import type { MenuGroup } from '../../lib/menuGroups'
import { getMenuGroupFromScenario, displayTitleForCol2 } from '../../lib/menuGroups'
import { scenarioToColor, type ChipColor } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// ChipColor → CSS クラス名マップ
// ─────────────────────────────────────────────────────────────

const CHIP_CLASS: Record<ChipColor, string> = {
  blue:   s.chipBlue,
  green:  s.chipGreen,
  red:    s.chipRed,
  purple: s.chipPurple,
  orange: s.chipOrange,
  gray:   s.chipGray,
}

// ─────────────────────────────────────────────────────────────
// 副作用ありグループ内のアクションヘッダー
//
// sideEffectPresence → アクション表示名のマップ。
// 同一アクション内で連続するシナリオをまとめる見出しとして使う。
// sortSideEffectScenarios() で既にソート済みの配列が渡ることを前提とする。
// ─────────────────────────────────────────────────────────────

const SEP_ACTION_LABEL: Partial<Record<string, string>> = {
  present_mild:           '継続',
  present_moderate:       '継続',
  present_dose_decrease:  '減量',
  present_change:         '変更',
  present_stop:           '中止',
}

// ─────────────────────────────────────────────────────────────
// テンプレ一覧パネル（大分類選択時）
// 【仕様】選択済みシナリオも含め全候補を常時表示。
//         selectedScenarioId と一致するボタンのみ選択色を当てる（トグル可）。
// ─────────────────────────────────────────────────────────────

interface TemplatePanelProps {
  group: MenuGroup | null
  scenarios: Scenario[]
  selectedScenarioId: string | null
  onSelectScenario: (id: string) => void
  modulePrefix?: string
}

export function TemplateListPanel({
  group,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  modulePrefix,
}: TemplatePanelProps) {
  // 【混入検出SSOT】group 指定がある場合のみ一致チェック。null=全表示モードでは無効。
  const invalid = group ? scenarios.filter(sc => getMenuGroupFromScenario(sc) !== group) : []
  const total = scenarios.length

  return (
    <div className={s.secondaryList}>
      {group && <div className={s.secondaryHeading}>{group}</div>}

      {/* ── 混入検出バッジ（group 指定時のみ表示） ── */}
      {group && (
        <div style={{
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          padding: '2px 6px',
          marginBottom: 4,
          borderRadius: 3,
          background: invalid.length > 0 ? 'rgba(255,69,58,0.18)' : 'rgba(48,209,88,0.12)',
          color: invalid.length > 0 ? '#ff453a' : '#30d158',
          border: `1px solid ${invalid.length > 0 ? '#ff453a44' : '#30d15844'}`,
        }}>
          {group} total:{total} / invalid:{invalid.length}
          {invalid.length > 0 && (
            <span>
              {' '}⚠️{' '}
              {invalid.slice(0, 5).map(sc =>
                `${sc.id}[sep=${sc.sideEffectPresence}→${getMenuGroupFromScenario(sc)}]`
              ).join(', ')}
            </span>
          )}
        </div>
      )}

      {scenarios.map((sc, i) => {
        const color = scenarioToColor(sc)
        const chipClass = CHIP_CLASS[color]
        const isActive = sc.globalId === selectedScenarioId
        const label = displayTitleForCol2(sc.title, group ?? getMenuGroupFromScenario(sc), modulePrefix)
        const isMismatch = group ? getMenuGroupFromScenario(sc) !== group : false

        // 副作用ありグループ時のみ、アクションが切り替わるタイミングでヘッダーを挿入する
        const showActionHeader = group === '副作用あり' && (() => {
          const thisAction = SEP_ACTION_LABEL[sc.sideEffectPresence ?? '']
          if (!thisAction) return false
          if (i === 0) return true
          const prevAction = SEP_ACTION_LABEL[scenarios[i - 1].sideEffectPresence ?? '']
          return thisAction !== prevAction
        })()

        return (
          <div key={sc.id}>
            {showActionHeader && (
              <div className={s.secondaryHeading} style={{ marginTop: i === 0 ? 0 : 8 }}>
                {SEP_ACTION_LABEL[sc.sideEffectPresence ?? '']}
              </div>
            )}
            <button
              className={[
                s.secondaryBtn,
                chipClass,
                isActive ? s.secondaryBtnActive : '',
                s.secondaryItemAnim,
              ].join(' ')}
              style={{
                animationDelay: `${i * 30}ms`,
                ...(isMismatch ? { outline: '2px solid #ff453a', outlineOffset: '-2px' } : {}),
              }}
              onClick={() => onSelectScenario(sc.globalId)}
              aria-pressed={isActive}
              title={isMismatch
                ? `⚠️ 混入: sep=${sc.sideEffectPresence} → ${getMenuGroupFromScenario(sc)}`
                : label}
            >
              {label}
              {isMismatch && (
                <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#ff453a' }}>
                  ⚠️{sc.sideEffectPresence}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// デフォルトエクスポート（後方互換）
// ─────────────────────────────────────────────────────────────

export default TemplateListPanel
