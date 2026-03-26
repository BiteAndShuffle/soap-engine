'use client'

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
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
  /** Sブロックの上に挿入するノードバー（ComposeNodeBarなど） */
  nodeBarSlot?: ReactNode
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
 */
export function replaceSFirstSentence(current: string, newFirst: string): string {
  const dotIdx = current.indexOf('。')
  if (dotIdx === -1) {
    return newFirst
  }
  const rest = current.slice(dotIdx + 1)
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
  nodeBarSlot,
}: SoapEditorProps) {
  const [copyState, setCopyState] = useState<Partial<Record<SoapKey, 'done'>>>({})
  const [allCopied, setAllCopied] = useState(false)

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

  const isNoContent = SOAP_KEYS.every(k => !fields[k].trim())

  return (
    <div
      className={s.editor}
      aria-label="SOAPノート編集"
      role="region"
    >
      {isNoContent ? (
        <div className={s.editorEmpty}>
          左のカテゴリ → 右のテンプレートを選択してください
        </div>
      ) : (
        <>
          {/* Sブロック上部: ノードバースロット */}
          {nodeBarSlot && (
            <div className={s.soapNodeBarSlot}>
              {nodeBarSlot}
            </div>
          )}

          {/* S/O/A/P フィールド */}
          <div className={s.soapFields}>
            {SOAP_KEYS.map(key => (
              <div key={key} className={s.soapField}>
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

          {/* フッター: SOAPをすべてコピー（単独配置） */}
          <div className={s.editorFooter}>
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
