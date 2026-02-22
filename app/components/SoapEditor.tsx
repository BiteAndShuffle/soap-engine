'use client'

import { useCallback, useState } from 'react'
import type { SoapFields, SoapKey } from '../../lib/types'
import { SOAP_KEYS } from '../../lib/types'
import { formatSoapForCopy } from '../../lib/buildSoap'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// 各フィールドの初期行数ヒント
// ─────────────────────────────────────────────────────────────

const FIELD_ROWS: Record<SoapKey, number> = {
  S: 3,
  O: 2,
  A: 4,
  P: 5,
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SoapEditorProps {
  fields: SoapFields
  onChange: (key: SoapKey, value: string) => void
}

// ─────────────────────────────────────────────────────────────
// コンポーネント
// ─────────────────────────────────────────────────────────────

export default function SoapEditor({ fields, onChange }: SoapEditorProps) {
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

  // ── 空状態の判定 ────────────────────────────────────────────
  // ルートノードのタグを div に統一することでハイドレーション不一致を防ぐ。
  // （isEmpty の分岐で div/section を切り替えると SSR とクライアントで
  //   異なるタグが生成されハイドレーション警告が発生する）
  const isEmpty = SOAP_KEYS.every(k => !fields[k].trim())

  return (
    <div className={s.editor} aria-label={isEmpty ? undefined : 'SOAPノート編集'} role={isEmpty ? undefined : 'region'}>
      {isEmpty ? (
        // ── 空状態: 選択を促すメッセージ ──────────────────────
        <div className={s.editorEmpty}>
          左のパネルからテンプレートを選択してください
        </div>
      ) : (
        // ── 入力状態: S/O/A/P テキストエリア ─────────────────
        <>
          <div className={s.soapFields}>
            {SOAP_KEYS.map(key => (
              <div key={key} className={s.soapField}>
                <div className={s.soapFieldHeader}>
                  <label className={s.soapFieldLabel} htmlFor={`soap-${key}`}>
                    {key}
                  </label>
                  <button
                    className={[
                      s.copySecBtn,
                      copyState[key] === 'done' ? s.copySecBtnDone : '',
                    ].join(' ')}
                    onClick={() => copySingle(key)}
                    aria-label={`${key}をコピー`}
                  >
                    {copyState[key] === 'done' ? '✓ コピー済' : 'コピー'}
                  </button>
                </div>
                <textarea
                  id={`soap-${key}`}
                  className={s.soapTextarea}
                  rows={FIELD_ROWS[key]}
                  value={fields[key]}
                  onChange={e => onChange(key, e.target.value)}
                  aria-label={`SOAP ${key}フィールド`}
                />
              </div>
            ))}
          </div>

          <button
            className={[s.copyAllBtn, allCopied ? s.copyAllBtnDone : ''].join(' ')}
            onClick={copyAll}
            aria-label="SOAPノート全体をコピー"
          >
            {allCopied ? '✓ コピーしました' : 'SOAPをすべてコピー'}
          </button>
        </>
      )}
    </div>
  )
}
