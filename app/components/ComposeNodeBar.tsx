'use client'

import type { ComposeNode } from '../../lib/types'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface ComposeNodeBarProps {
  /** 合成対象ノード一覧（2剤目以降） */
  nodes: ComposeNode[]
  /** ノード削除ハンドラ */
  onRemove: (nodeId: string) => void
  /** 全リセットハンドラ */
  onReset: () => void
}

// ─────────────────────────────────────────────────────────────
// ComposeNodeBar
//
// ノードが0件のときは何も表示しない。
// ノードが1件以上のとき:
//   [drugLabel シナリオタイトル ×] ... [リセット]
// ─────────────────────────────────────────────────────────────

export default function ComposeNodeBar({ nodes, onRemove, onReset }: ComposeNodeBarProps) {
  if (nodes.length === 0) return null

  return (
    <div className={s.composeNodeBar} role="region" aria-label="合成対象薬剤">
      <span className={s.composeNodeBarLabel}>合成中:</span>
      <div className={s.composeNodeList}>
        {nodes.map(node => (
          <div key={node.id} className={s.composeNode}>
            <span className={s.composeNodeDrug}>{node.drugLabel}</span>
            <span className={s.composeNodeScenario}>{node.block.templateLabel}</span>
            <button
              className={s.composeNodeRemoveBtn}
              onClick={() => onRemove(node.id)}
              aria-label={`${node.drugLabel} を合成から除外`}
              title="このノードを削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className={s.composeNodeResetBtn}
        onClick={onReset}
        aria-label="合成をリセット"
      >
        リセット
      </button>
    </div>
  )
}
