'use client'

import { useCallback, useState } from 'react'
import type { SoapFields, SoapKey } from '../../lib/types'
import { SOAP_KEYS } from '../../lib/types'
import { formatSoapForCopy } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SoapEditorProps {
  fields: SoapFields
  onChange: (key: SoapKey, value: string) => void
  templateLabel: string       // 現在のテンプレラベル（保持ボタンのtitle用）
  mergedBlockCount: number    // 保持済みブロック数（バッジ表示用）
  onMerge: () => void         // 保持（合成）ボタン押下
  onResetMerge: () => void    // 合成リセット
  canMerge: boolean           // テンプレ選択中のみ保持可
}

// ─────────────────────────────────────────────────────────────
// S欄トグル型定義
// ─────────────────────────────────────────────────────────────

/** 接頭句バリアント */
export type SPrefix = 'none' | 'new_drug' | 'changed_drug'

/** 状態バリアント */
export type SStatus = 'stable' | 'better' | 'unchanged' | 'not_better'

/** 接頭句の表示ラベル */
export const S_PREFIX_LABELS: Record<SPrefix, string> = {
  none:         'なし',
  new_drug:     '新しく使用して',
  changed_drug: '変更になって',
}

/** 状態の表示ラベル */
export const S_STATUS_LABELS: Record<SStatus, string> = {
  stable:     '落ち着いている',
  better:     '良くなってきた',
  unchanged:  '変わりない',
  not_better: 'あまり良くなっていない',
}

/**
 * prefix + status から「S欄先頭文」を生成する。
 * 例:
 *   none + stable      → 「使用して、症状は落ち着いている。」
 *   new_drug + better  → 「前回から新しく薬を使用して良くなってきた。」
 *   changed_drug + unchanged → 「前回から薬が変更になって使用して変わりない。」
 */
export function buildSFirstSentence(prefix: SPrefix, status: SStatus): string {
  switch (prefix) {
    case 'none':
      return `使用して、症状は${S_STATUS_LABELS[status]}。`
    case 'new_drug':
      return `前回から新しく薬を使用して${S_STATUS_LABELS[status]}。`
    case 'changed_drug':
      return `前回から薬が変更になって使用して${S_STATUS_LABELS[status]}。`
  }
}

/**
 * Sフィールドの先頭文（最初の「。」まで）を新しい文に差し替える。
 * 2文目以降は保持する。
 */
export function replaceSFirstSentence(current: string, newFirst: string): string {
  const dotIdx = current.indexOf('。')
  if (dotIdx === -1) {
    // 「。」がない場合は全体を置換
    return newFirst
  }
  const rest = current.slice(dotIdx + 1)
  // restが空白・改行のみの場合はそのまま置換
  const restTrimmed = rest.replace(/^[\n\r\s]+/, '')
  return restTrimmed ? `${newFirst}\n${restTrimmed}` : newFirst
}

// ─────────────────────────────────────────────────────────────
// S/O/A/Pのラベル名
// ─────────────────────────────────────────────────────────────

const FIELD_LABEL: Record<SoapKey, string> = {
  S: 'S',
  O: 'O',
  A: 'A',
  P: 'P',
}

// ─────────────────────────────────────────────────────────────
// SoapEditor 本体
// ─────────────────────────────────────────────────────────────

export default function SoapEditor({
  fields,
  onChange,
  templateLabel,
  mergedBlockCount,
  onMerge,
  onResetMerge,
  canMerge,
}: SoapEditorProps) {
  const [copyState, setCopyState] = useState<Partial<Record<SoapKey, 'done'>>>({})
  const [allCopied, setAllCopied] = useState(false)
  const [mergeFlash, setMergeFlash] = useState(false)

  const copySingle = useCallback(
    async (key: SoapKey) => {
      await navigator.clipboard.writeText(fields[key])
      setCopyState(prev => ({ ...prev, [key]: 'done' }))
      setTimeout(
        () => setCopyState(prev => { const n = { ...prev }; delete n[key]; return n }),
        1500,
      )
    },
    [fields],
  )

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(formatSoapForCopy(fields))
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 1500)
  }, [fields])

  const handleMerge = useCallback(() => {
    onMerge()
    setMergeFlash(true)
    setTimeout(() => setMergeFlash(false), 1200)
  }, [onMerge])

  // テンプレ未選択かつ合成なしの場合のみ空状態とみなす（テンプレ選択後は常に編集UIを表示）
  const isNoContent = SOAP_KEYS.every(k => !fields[k].trim()) && mergedBlockCount === 0 && !templateLabel

  return (
    <div
      className={s.editor}
      aria-label="SOAPノート編集"
      role="region"
    >
      {/* ── 合成済みバナー（保持後） ── */}
      {mergedBlockCount > 0 && (
        <div className={s.mergedBanner}>
          <span className={s.mergedBannerText}>
            📋 {mergedBlockCount}件合成済み — 次の薬剤を選択して追記できます
          </span>
          <button
            className={s.mergedResetBtn}
            onClick={onResetMerge}
            aria-label="合成内容をリセット"
          >
            リセット
          </button>
        </div>
      )}

      {/* ── Current SOAP ── */}
      {isNoContent ? (
        <div className={s.editorEmpty}>
          左のカテゴリ → 右のテンプレートを選択してください
        </div>
      ) : (
        <>
          {/* S/O/A/P 1行形式: [textarea(左・flex:1)] [右カラム: ⬜S ラベル + copyBtn] */}
          <div className={s.soapFields}>
            {SOAP_KEYS.map(key => (
              <div key={key} className={s.soapField}>
                {/* テキストエリア（左・横幅最大確保） */}
                <textarea
                  id={`soap-${key}`}
                  className={s.soapTextarea}
                  value={fields[key]}
                  onChange={e => onChange(key, e.target.value)}
                  aria-label={`SOAP ${key}フィールド`}
                  placeholder={`${key}欄を入力...`}
                />
                {/* 右カラム: S/O/A/Pラベル（上）+ copyBtn（下） */}
                <div className={s.soapFieldSide}>
                  <label className={s.soapFieldLabel} htmlFor={`soap-${key}`}>
                    <span className={s.soapLabelChar}>{FIELD_LABEL[key]}</span>
                  </label>
                  <button
                    className={[
                      s.copySecBtn,
                      copyState[key] === 'done' ? s.copySecBtnDone : '',
                    ].join(' ')}
                    onClick={() => copySingle(key)}
                    aria-label={`${key}をコピー`}
                  >
                    {copyState[key] === 'done' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* フッターボタン行: 保持（合成） + 全コピー */}
          <div className={s.editorFooter}>
            <button
              className={[
                s.pinBtn,
                mergeFlash ? s.pinBtnFlash : '',
                !canMerge ? s.pinBtnDisabled : '',
              ].join(' ')}
              onClick={handleMerge}
              disabled={!canMerge}
              aria-label="現在のSOAPを保持して合成する"
              title={
                canMerge
                  ? `「${templateLabel}」を保持して次の薬剤に追記`
                  : 'テンプレートを選択してください'
              }
            >
              {mergeFlash ? '✓ 保持しました' : '📌 保持'}
              {mergedBlockCount > 0 && (
                <span className={s.mergedBadge}>{mergedBlockCount}</span>
              )}
            </button>
            <button
              className={[s.copyAllBtn, allCopied ? s.copyAllBtnDone : ''].join(' ')}
              onClick={copyAll}
              aria-label="SOAPノート全体をコピー"
            >
              {allCopied ? '✓ コピーしました' : 'SOAPをすべてコピー'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
