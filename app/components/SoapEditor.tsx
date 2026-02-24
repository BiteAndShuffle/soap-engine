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

  const isEmpty = SOAP_KEYS.every(k => !fields[k].trim())

  return (
    <div
      className={s.editor}
      aria-label={isEmpty ? undefined : 'SOAPノート編集'}
      role={isEmpty ? undefined : 'region'}
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
      {isEmpty ? (
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
                />
                {/* 右カラム: ⬜S ラベル（上）+ copyBtn（下） */}
                <div className={s.soapFieldSide}>
                  {/*
                    ⬜S: ボックス要素（soapLabelBox）と文字（S/O/A/P）を
                    inline-flex / gap:0 / align-items:center で隙間ゼロ密着
                  */}
                  <label className={s.soapFieldLabel} htmlFor={`soap-${key}`}>
                    <span className={s.soapLabelBox} aria-hidden="true" />
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
