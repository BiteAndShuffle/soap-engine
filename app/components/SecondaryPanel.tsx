'use client'

import type { Template, Addon } from '../../lib/types'
import type { MenuGroup } from '../../lib/menuGroups'
import { shortLabel, getMenuGroup } from '../../lib/menuGroups'
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

// ─────────────────────────────────────────────────────────────
// A) テンプレ一覧パネル（大分類選択時）
// ─────────────────────────────────────────────────────────────

interface TemplatePanelProps {
  group: MenuGroup
  templates: Template[]
  selectedTemplateId: string | null
  onSelectTemplate: (id: string) => void
}

export function TemplateListPanel({
  group,
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: TemplatePanelProps) {
  // 【混入検出】受け取った templates の中で group と一致しないものを検出
  const invalid = templates.filter(t => getMenuGroup(t.type) !== group)
  const total = templates.length

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
          <span> ⚠️ {invalid.slice(0, 5).map(t => `${t.templateId}[${t.type}→${getMenuGroup(t.type)}]`).join(', ')}</span>
        )}
      </div>

      {templates.map((tpl, i) => {
        const color = templateTypeToColor(tpl.type)
        const chipClass = CHIP_CLASS[color]
        const isActive = tpl.templateId === selectedTemplateId
        const label = shortLabel(tpl.label)
        // 混入テンプレには赤枠を付けて視認性を上げる
        const isMismatch = getMenuGroup(tpl.type) !== group
        return (
          <button
            key={tpl.templateId}
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
            onClick={() => onSelectTemplate(tpl.templateId)}
            aria-pressed={isActive}
            title={isMismatch ? `⚠️ 混入: type=${tpl.type} → ${getMenuGroup(tpl.type)}` : label}
          >
            {label}
            {isMismatch && <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#ff453a' }}>⚠️{tpl.type}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// B) アドオンパネル（テンプレ選択後）
// ─────────────────────────────────────────────────────────────

interface AddonPanelProps {
  template: Template
  addons: Addon[]
  activeAddonIds: Set<string>
  onToggleAddon: (addonId: string) => void
}

export function AddonPanel({
  template,
  addons,
  activeAddonIds,
  onToggleAddon,
}: AddonPanelProps) {
  const color = templateTypeToColor(template.type)
  const chipClass = CHIP_CLASS[color]

  return (
    <div className={s.secondaryList}>
      {/* 選択中テンプレ（ラベル表示のみ・無効ボタン） */}
      <div className={s.secondaryHeading}>選択中テンプレ</div>
      <button
        className={[s.secondaryBtn, s.secondaryBtnActive, chipClass, s.secondaryItemAnim].join(' ')}
        style={{ animationDelay: '0ms' }}
        aria-pressed="true"
        aria-disabled="true"
        disabled
      >
        {shortLabel(template.label)}
      </button>

      {/* アドオン */}
      {addons.length > 0 && (
        <>
          <div className={s.secondaryHeading}>アドオン</div>
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

      {addons.length === 0 && (
        <p className={s.secondaryNoAddon}>アドオンなし</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// デフォルトエクスポート（後方互換用: 旧 SecondaryPanel）
// → DashboardClient が直接 TemplateListPanel / AddonPanel を使う
// ─────────────────────────────────────────────────────────────

export default AddonPanel
