'use client'

import type { Template } from '../../lib/types'
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
  base:      '基本',
  followup:  '経過',
  situation: '状況',
}

// ─────────────────────────────────────────────────────────────
// Props
// animKey は削除。アニメーションの再生は親が key prop を
// このコンポーネントに渡すことで制御する（React の正規パターン）。
// ─────────────────────────────────────────────────────────────

interface SecondaryPanelProps {
  template: Template
  activeAddonIds: Set<string>
  onToggleAddon: (addonId: string) => void
}

export default function SecondaryPanel({
  template,
  activeAddonIds,
  onToggleAddon,
}: SecondaryPanelProps) {
  const color = templateTypeToColor(template.type)
  const chipClass = CHIP_CLASS[color]
  const hasAddons = template.addons.length > 0

  return (
    <div className={s.secondaryList}>

      {/* ── テンプレートタイプ見出し ── */}
      <div className={s.secondaryHeading}>
        {TYPE_LABEL[template.type] ?? template.type}
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
      {hasAddons && (
        <>
          <div className={s.secondaryHeading}>
            アドオン
          </div>

          {template.addons.map((addon, i) => {
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
