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
// S欄先頭文: relation × condition の2軸
// ─────────────────────────────────────────────────────────────

/**
 * 前回との関係性（新規追加 / 薬変更 / Do継続）
 * UI上の「前回、新薬追加」「前回、薬変更」「前回、Do」に対応する。
 */
export type SRelation = 'new_addition' | 'med_changed' | 'continued_do'

/**
 * 体調状態（落ち着いている / 改善 / 変わりない / 改善不十分）
 * UI上の4ボタンに対応する。
 */
export type SCondition = 'stable' | 'improved' | 'unchanged' | 'not_improved'

// 後方互換エイリアス（既存の import を壊さないため残す）
export type SPrefix = SRelation
export type SStatus = SCondition

/** relation の表示ラベル */
export const S_RELATION_LABELS: Record<SRelation, string> = {
  new_addition:  '新規追加',
  med_changed:   '薬変更',
  continued_do:  'Do',
}

/** condition の表示ラベル */
export const S_CONDITION_LABELS: Record<SCondition, string> = {
  stable:       '落ち着いている',
  improved:     '良くなってきた',
  unchanged:    '変わりない',
  not_improved: 'あまり良くなっていない',
}

/**
 * relation × condition から「S欄先頭文」を汎用生成する。
 *
 * 糖尿病・感染症・整形など診療科を問わず使用できる汎用関数。
 * シナリオ種別（副作用なし系/CP系など）による分岐は行わない。
 * シナリオ固有の観察文（「低血糖症状は認めない」等）は
 * replaceSFirstSentence により先頭文の後ろに連結される。
 */
export function buildSFirstSentence(relation: SRelation, condition: SCondition): string {
  const cond = S_CONDITION_LABELS[condition]
  switch (relation) {
    case 'new_addition':
      return `前回から新しく薬を使用して${cond}。`
    case 'med_changed':
      return `前回から薬が変更になり、使用して${cond}。`
    case 'continued_do':
      return condition === 'not_improved'
        ? `引き続き使用しているが、十分な改善はみられない。`
        : `引き続き使用して${cond}。`
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
      {/* ノードバースロット: SOAP内容に関係なく常時表示 */}
      {nodeBarSlot && (
        <div className={s.editorTopBar}>
          <div className={s.editorTopBarLeft}>
            {nodeBarSlot}
          </div>
        </div>
      )}

      {isNoContent ? (
        <div className={s.editorEmpty}>
          左のカテゴリ → 右のテンプレートを選択してください
        </div>
      ) : (
        <>
          {/* 上部エリア: 全文コピーボタン（右） */}
          <div className={s.editorTopBar}>
            <div className={s.editorTopBarLeft} />
            <button
              className={[s.copyAllBtn, allCopied ? s.copyAllBtnDone : ''].join(' ')}
              onClick={copyAll}
              aria-label="SOAPノート全体をコピー"
            >
              {allCopied ? '✓ コピー済' : 'すべてコピー'}
            </button>
          </div>

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
        </>
      )}
    </div>
  )
}
