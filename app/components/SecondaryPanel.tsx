'use client'

import type { Template, Addon } from '../../lib/types'
import { templateTypeToColor, type ChipColor } from '../../lib/buildSoap'
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

// テンプレートタイプ → 日本語ラベル
const TYPE_LABEL: Record<string, string> = {
  initial:            '初回',
  uptitrate:          '増量',
  down_improved:      '減量',
  down_lowbenefit:    '減量',
  down_adjust_other:  '減量',
  se_hypoglycemia:    '副作用',
  se_gi:              '副作用',
  se_appetite:        '副作用',
  se_pancreatitis:    '副作用',
  se_mild_continue:   '副作用',
  se_strong_consult:  '副作用',
  se_change:          '変更',
  se_reduce:          '減量',
  se_stop:            '中止',
  cp_good:            'CP良',
  cp_poor_forget:     'CP不良',
  cp_poor_selfadjust: 'CP不良',
  cp_poor_delay:      'CP不良',
  stop_improved:      '終了',
  stop_ineffective:   '終了',
  stop_noeffect:      '終了',
  lifestyle:          '生活指導',
  sickday:            'シックデイ',
}

// ─────────────────────────────────────────────────────────────
// Props
// addons: テンプレートの addonIds 順に解決済みの Addon 配列
//         （親 DashboardClient が addonMap で解決して渡す）
// key は親側で selectedId を渡すことで再マウント＝アニメーション再生
// ─────────────────────────────────────────────────────────────

interface SecondaryPanelProps {
  template: Template
  addons: Addon[]
  activeAddonIds: Set<string>
  onToggleAddon: (addonId: string) => void
}

export default function SecondaryPanel({
  template,
  addons,
  activeAddonIds,
  onToggleAddon,
}: SecondaryPanelProps) {
  const color = templateTypeToColor(template.type)
  const chipClass = CHIP_CLASS[color]
  const typeLabel = TYPE_LABEL[template.type] ?? template.type

  return (
    <div className={s.secondaryList}>

      {/* ── テンプレートタイプ見出し ── */}
      <div className={s.secondaryHeading}>
        {typeLabel}
      </div>

      {/* ── 選択中テンプレート（常にアクティブ・無効ボタン） ── */}
      <button
        className={[s.secondaryBtn, s.secondaryBtnActive, chipClass, s.secondaryItemAnim].join(' ')}
        style={{ animationDelay: '0ms' }}
        aria-pressed="true"
        aria-disabled="true"
        disabled
      >
        {template.label}
      </button>

      {/* ── アドオン一覧 ── */}
      {addons.length > 0 && (
        <>
          <div className={s.secondaryHeading}>
            アドオン
          </div>

          {addons.map((addon, i) => {
            const isActive = activeAddonIds.has(addon.addonId)
            return (
              <button
                key={addon.addonId}
                className={[
                  s.secondaryBtn,
                  chipClass,
                  isActive ? s.secondaryBtnActive : '',
                  s.secondaryItemAnim,
                ].join(' ')}
                style={{ animationDelay: `${(i + 1) * 40}ms` }}
                onClick={() => onToggleAddon(addon.addonId)}
                aria-pressed={isActive}
              >
                {addon.label}
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
