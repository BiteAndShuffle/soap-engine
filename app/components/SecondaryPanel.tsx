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
// テンプレ一覧パネル（大分類選択時）
// 【仕様】選択済みシナリオも含め全候補を常時表示。
//         selectedScenarioId と一致するボタンのみ選択色を当てる（トグル可）。
// ─────────────────────────────────────────────────────────────

interface TemplatePanelProps {
  group: MenuGroup
  scenarios: Scenario[]
  selectedScenarioId: string | null
  onSelectScenario: (id: string) => void
}

export function TemplateListPanel({
  group,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
}: TemplatePanelProps) {
  // 【混入検出SSOT】受け取った scenarios の中で group と一致しないものを検出
  const invalid = scenarios.filter(sc => getMenuGroupFromScenario(sc) !== group)
  const total = scenarios.length

  return (
    <div className={s.secondaryList}>
      <div className={s.secondaryHeading}>{group}</div>

      {/* ── 混入検出バッジ（常時表示・本番でも確認可能） ── */}
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

      {scenarios.map((sc, i) => {
        const color = scenarioToColor(sc)
        const chipClass = CHIP_CLASS[color]
        const isActive = sc.id === selectedScenarioId
        const label = displayTitleForCol2(sc.title, group)
        const isMismatch = getMenuGroupFromScenario(sc) !== group
        return (
          <button
            key={sc.id}
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
            onClick={() => onSelectScenario(sc.id)}
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
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// デフォルトエクスポート（後方互換）
// ─────────────────────────────────────────────────────────────

export default TemplateListPanel
