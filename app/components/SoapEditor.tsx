'use client'

import { useCallback, useState } from 'react'
import type { SoapFields, SoapKey, PinnedSoap } from '../../lib/types'
import { SOAP_KEYS } from '../../lib/types'
import { formatSoapForCopy } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SoapEditorProps {
  fields: SoapFields
  onChange: (key: SoapKey, value: string) => void
  templateLabel: string          // 現在のテンプレラベル（ピン時の表示用）
  pinnedSoaps: PinnedSoap[]
  onPin: () => void
  onUnpin: (id: string) => void
}

// ─────────────────────────────────────────────────────────────
// S/O/A/Pのラベル名（日本語併記）
// ─────────────────────────────────────────────────────────────

const FIELD_LABEL: Record<SoapKey, string> = {
  S: 'S',
  O: 'O',
  A: 'A',
  P: 'P',
}

// ─────────────────────────────────────────────────────────────
// ピン済みSOAPカード
// ─────────────────────────────────────────────────────────────

function PinnedCard({ pin, onUnpin }: { pin: PinnedSoap; onUnpin: (id: string) => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatSoapForCopy(pin.fields))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [pin.fields])

  return (
    <div className={s.pinnedCard}>
      <div className={s.pinnedCardHeader}>
        <span className={s.pinnedCardLabel}>{pin.templateLabel}</span>
        <div className={s.pinnedCardActions}>
          <button
            className={[s.pinActionBtn, copied ? s.pinActionBtnDone : ''].join(' ')}
            onClick={handleCopy}
            aria-label="保持したSOAPをコピー"
          >
            {copied ? '✓' : 'コピー'}
          </button>
          <button
            className={s.pinRemoveBtn}
            onClick={() => onUnpin(pin.id)}
            aria-label="保持を解除"
          >
            ✕
          </button>
        </div>
      </div>
      {SOAP_KEYS.map(k => (
        <div key={k} className={s.pinnedField}>
          <span className={s.pinnedFieldKey}>{k}</span>
          <span className={s.pinnedFieldValue}>{pin.fields[k]}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SoapEditor 本体
// ─────────────────────────────────────────────────────────────

export default function SoapEditor({
  fields,
  onChange,
  templateLabel,
  pinnedSoaps,
  onPin,
  onUnpin,
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

  const isEmpty = SOAP_KEYS.every(k => !fields[k].trim())

  return (
    <div className={s.editor} aria-label={isEmpty ? undefined : 'SOAPノート編集'} role={isEmpty ? undefined : 'region'}>

      {/* ── ピン済みSOAPエリア ── */}
      {pinnedSoaps.length > 0 && (
        <div className={s.pinnedArea}>
          <div className={s.pinnedAreaHeading}>
            保持中 ({pinnedSoaps.length})
          </div>
          {pinnedSoaps.map(pin => (
            <PinnedCard key={pin.id} pin={pin} onUnpin={onUnpin} />
          ))}
        </div>
      )}

      {/* ── Current SOAP ── */}
      {isEmpty ? (
        <div className={s.editorEmpty}>
          左のカテゴリ → 中央のテンプレートを選択してください
        </div>
      ) : (
        <>
          {/* S/O/A/P 横並び入力エリア */}
          <div className={s.soapFields}>
            {SOAP_KEYS.map(key => (
              <div key={key} className={s.soapField}>
                {/* ラベル + コピーボタン（横並びヘッダー） */}
                <div className={s.soapFieldHeader}>
                  <label className={s.soapFieldLabel} htmlFor={`soap-${key}`}>
                    {FIELD_LABEL[key]}
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
                <textarea
                  id={`soap-${key}`}
                  className={s.soapTextarea}
                  value={fields[key]}
                  onChange={e => onChange(key, e.target.value)}
                  aria-label={`SOAP ${key}フィールド`}
                />
              </div>
            ))}
          </div>

          {/* フッターボタン行: 保持 + 全コピー */}
          <div className={s.editorFooter}>
            <button
              className={s.pinBtn}
              onClick={onPin}
              aria-label="現在のSOAPを保持する"
              title={`「${templateLabel}」を保持`}
            >
              📌 保持
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
