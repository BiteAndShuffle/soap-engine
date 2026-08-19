'use client'

import { useCallback, useRef, useState } from 'react'
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
//
// 実体は lib/rapidSentence.ts へ移送済み（Rapid Mode v2 / Unit 1）。
// 本ファイルは CSS module を import するため node:test から直接 import できず、
// production 関数を test から検証できなかった（RAPID-V2-20 違反の原因）。
//
// 既存の import（`from './SoapEditor'`）を壊さないため re-export を維持する。
// 新規コードは lib/rapidSentence.ts から直接 import すること。
// ─────────────────────────────────────────────────────────────

export type {
  SRelation,
  SCondition,
  AdjustmentExpression,
} from '../../lib/rapidSentence'

export {
  S_RELATION_LABELS,
  S_CONDITION_LABELS,
  buildSFirstSentence,
  replaceSFirstSentence,
  buildResolvedSFirstSentence,
  firstSentenceOf,
  restoreScenarioFirstSentence,
} from '../../lib/rapidSentence'

// 後方互換エイリアス（既存の import を壊さないため残す）
export type SPrefix = import('../../lib/rapidSentence').SRelation
export type SStatus = import('../../lib/rapidSentence').SCondition

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
// SoapTextarea — IME composition ガード付き textarea
//
// React の controlled textarea は onChange が IME 変換中にも発火するため、
// 日本語入力時に value を外部から書き換えると IME の状態が壊れ、
// カーソル位置がずれたり文字が途中に挿入される問題が生じる。
//
// onCompositionStart/End で変換中フラグを管理し、
// 変換確定（compositionend）後のみ親の onChange を呼ぶ。
// 変換中は内部 localValue で文字を保持し、
// 外部からの value 変化（= SOAP再生成）は変換中は無視する。
// ─────────────────────────────────────────────────────────────

interface SoapTextareaProps {
  id: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder: string
  className: string
}

function SoapTextarea({ id, value, onChange, ariaLabel, placeholder, className }: SoapTextareaProps) {
  // 「保存の遅延」と「表示の遅延」を分離する:
  //   localValue (state) — textarea に表示する値。composition中も毎keystrokeで更新し、
  //                         変換中文字列を常に画面に見せる。
  //   isComposingRef     — composition中フラグ。親への通知タイミング制御のみに使う。
  //
  // 外部 value（親の editedSOAP / displayFields）が変化したとき:
  //   composition中でなければ localValue を外部値に追従させる（再生成時の反映）。
  //   composition中であれば追従しない（変換候補を壊さない）。
  const [localValue, setLocalValue] = useState(value)
  const isComposingRef = useRef(false)

  // 外部 value が変化し、かつ composition 中でない場合は表示を外部値に同期する
  if (!isComposingRef.current && localValue !== value) {
    setLocalValue(value)
  }

  return (
    <textarea
      id={id}
      className={className}
      value={localValue}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onCompositionStart={() => {
        isComposingRef.current = true
      }}
      onCompositionEnd={e => {
        isComposingRef.current = false
        const confirmed = (e.target as HTMLTextAreaElement).value
        setLocalValue(confirmed)
        // compositionend 確定値を親に通知（ここで初めて editedSOAP が更新される）
        onChange(confirmed)
      }}
      onChange={e => {
        // composition中・非composition中を問わず表示は常に更新する（変換候補を見せる）
        setLocalValue(e.target.value)
        // composition中でなければ（英数字など）即座に親へ通知する
        if (!isComposingRef.current) {
          onChange(e.target.value)
        }
      }}
    />
  )
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
                <SoapTextarea
                  id={`soap-${key}`}
                  className={s.soapTextarea}
                  value={fields[key]}
                  onChange={v => onChange(key, v)}
                  ariaLabel={`SOAP ${key}フィールド`}
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
