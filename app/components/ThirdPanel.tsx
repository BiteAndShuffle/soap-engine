'use client'

import type { MenuGroup } from '../../lib/menuGroups'
import type { SPrefix, SStatus } from './SoapEditor'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// S状態ボタン定義（3セクション × 4ボタン）
// ─────────────────────────────────────────────────────────────

/** Sボタン表示時のグループ（= menuGroupKey 相当） */
export const S_BUTTON_GROUPS = new Set<MenuGroup>([
  '副作用なし',
  'コンプライアンス良好',
  'コンプライアンス不良',
])

interface SectionDef {
  label: string
  prefix: SPrefix
}

interface StatusDef {
  label: string
  status: SStatus
}

const SECTIONS: SectionDef[] = [
  { label: '前回、新薬追加', prefix: 'new_drug' },
  { label: '前回、薬変更',   prefix: 'changed_drug' },
  { label: '前回、Do',       prefix: 'none' },
]

const STATUSES: StatusDef[] = [
  { label: '体調落ち着いている',   status: 'stable' },
  { label: '体調改善',             status: 'better' },
  { label: '体調変わりない',       status: 'unchanged' },
  { label: '体調良くなってない',   status: 'not_better' },
]

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface ThirdPanelProps {
  /** 現在選択中の大分類（null = 未選択） */
  selectedGroup: MenuGroup | null
  /** S欄トグル: 現在の接頭句 */
  currentSPrefix: SPrefix
  /** S欄トグル: 現在の状態 */
  currentSStatus: SStatus
  /** ボタン押下時コールバック */
  onSAction: (prefix: SPrefix, status: SStatus) => void
}

// ─────────────────────────────────────────────────────────────
// ThirdPanel 本体
// ─────────────────────────────────────────────────────────────

export default function ThirdPanel({
  selectedGroup,
  currentSPrefix,
  currentSStatus,
  onSAction,
}: ThirdPanelProps) {
  const showSButtons = selectedGroup !== null && S_BUTTON_GROUPS.has(selectedGroup)

  return (
    <div className={s.thirdPanel}>
      <div className={s.thirdPanelInner}>
        {showSButtons ? (
          <div className={s.sActionWrap}>
            <div className={s.sActionHeading}>S 先頭文</div>
            {SECTIONS.map(sec => (
              <div key={sec.prefix} className={s.sActionSection}>
                <div className={s.sActionSectionLabel}>{sec.label}</div>
                <div className={s.sActionBtnGrid}>
                  {STATUSES.map(st => {
                    const isActive =
                      currentSPrefix === sec.prefix && currentSStatus === st.status
                    return (
                      <button
                        key={st.status}
                        className={[
                          s.sActionBtn,
                          isActive ? s.sActionBtnActive : '',
                        ].join(' ')}
                        onClick={() => onSAction(sec.prefix, st.status)}
                        aria-pressed={isActive}
                      >
                        {st.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : selectedGroup !== null ? (
          <div className={s.thirdPanelHint} aria-hidden="true">
            <span className={s.thirdPanelHintText}>
              副作用なし・CP良好・CP不良<br />選択時にS先頭文ボタンが表示されます
            </span>
          </div>
        ) : (
          <div className={s.thirdPanelPlaceholder} aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
