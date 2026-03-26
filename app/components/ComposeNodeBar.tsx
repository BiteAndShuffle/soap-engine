'use client'

import type { ComposeNode } from '../../lib/types'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface ComposeNodeBarProps {
  /** 合成対象ノード一覧（2剤目以降） */
  nodes: ComposeNode[]
  /** 選択中ノードID（null = 1剤目操作中） */
  selectedNodeId: string | null
  /** ノード選択ハンドラ */
  onSelectNode: (nodeId: string) => void
  /** ノード削除ハンドラ */
  onRemove: (nodeId: string) => void
  /** 全リセットハンドラ */
  onReset: () => void
  /** 1剤目（ベース薬）の薬剤ラベル（常時表示用） */
  baseDrugLabel?: string
  /** シナリオ未確定ノードのID集合（pending状態表示用） */
  pendingNodeIds?: Set<string>
}

// ─────────────────────────────────────────────────────────────
// ComposeNodeBar
//
// ノードが0件のときは何も表示しない。
// ノードが1件以上のとき:
//   [1剤目ベースチップ(固定・グレー)] [2剤目チップ(クリックで選択)] ...
//   選択中チップはハイライト + ✎ アイコンで「編集中」を示す。
//
// 表示ラベル: scenario.title は非表示。薬剤ラベルのみ（最大6文字）。
// ─────────────────────────────────────────────────────────────

export default function ComposeNodeBar({
  nodes,
  selectedNodeId,
  onSelectNode,
  onRemove,
  onReset,
  baseDrugLabel,
  pendingNodeIds,
}: ComposeNodeBarProps) {
  if (nodes.length === 0) return null

  return (
    <div className={s.composeNodeBar} role="region" aria-label="合成対象薬剤">
      <div className={s.composeNodeList}>
        {/* ── 1剤目ベースチップ（クリック不可・グレー） ── */}
        {baseDrugLabel && (
          <div
            className={[
              s.composeNode,
              s.composeNodeBase,
              selectedNodeId === null ? s.composeNodeBaseActive : '',
            ].join(' ')}
            title={baseDrugLabel}
          >
            <span className={s.composeNodeDrug}>{baseDrugLabel}</span>
          </div>
        )}

        {/* ── 2剤目以降チップ（クリックで選択/解除） ── */}
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id
          const isPending = pendingNodeIds?.has(node.id) ?? false
          return (
            <button
              key={node.id}
              className={[
                s.composeNode,
                isSelected ? s.composeNodeSelected : '',
                isPending ? s.composeNodePending : '',
              ].join(' ')}
              onClick={() => onSelectNode(node.id)}
              aria-pressed={isSelected}
              title={
                isPending
                  ? `${node.drugLabel} — テンプレを選択してください`
                  : isSelected
                    ? `${node.drugLabel} のシナリオを変更中 — クリックで解除`
                    : `${node.drugLabel} — クリックしてシナリオを変更`
              }
            >
              {isPending && !isSelected && <span className={s.composeNodePendingIcon}>?</span>}
              {isSelected && <span className={s.composeNodeEditIcon}>✎</span>}
              <span className={s.composeNodeDrug}>{node.drugLabel}</span>
              <span
                className={s.composeNodeRemoveBtn}
                role="button"
                aria-label={`${node.drugLabel} を合成から除外`}
                title="除外"
                onClick={e => { e.stopPropagation(); onRemove(node.id) }}
              >
                ×
              </span>
            </button>
          )
        })}
      </div>

      <button
        className={s.composeNodeResetBtn}
        onClick={onReset}
        aria-label="合成をリセット"
        title="全ノードを削除して1剤目に戻す"
      >
        解除
      </button>
    </div>
  )
}
