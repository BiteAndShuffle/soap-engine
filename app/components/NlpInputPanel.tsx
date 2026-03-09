'use client'

/**
 * NlpInputPanel — 自然言語生成モード UI
 *
 * 呼び出し元: DashboardClient（自然言語生成モード時のみレンダリング）
 *
 * 責務:
 *   - 患者入力テキストエリアの表示・編集
 *   - 「SOAP を生成」ボタンで onGenerate() を呼ぶ
 *   - バリデーションエラー / セレクターの理由 / confidence を表示
 *
 * 生成結果（soap / scenarioId）は親 (DashboardClient) が管理し、
 * SoapEditor に渡す。
 */

import { useState, useCallback } from 'react'
import type { ValidationResult } from '../../lib/validationRunner'
import s from '../styles/layout.module.css'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface NlpInputPanelProps {
  /** 最後に選択されたシナリオID（null = 未選択 or 特定失敗） */
  scenarioId: string | null
  /** バリデーション結果 */
  validation: ValidationResult | null
  /** セレクター理由文字列 */
  selectorReason: string
  /** confidence (0〜1) */
  confidence: number
  /** 生成処理中フラグ */
  isGenerating: boolean
  /** 生成ボタン押下コールバック */
  onGenerate: (patientInput: string) => void
  /** モード切替（手動選択モードへ戻る）コールバック */
  onSwitchToManual: () => void
}

// ─────────────────────────────────────────────────────────────
// NlpInputPanel 本体
// ─────────────────────────────────────────────────────────────

export default function NlpInputPanel({
  scenarioId,
  validation,
  selectorReason,
  confidence,
  isGenerating,
  onGenerate,
  onSwitchToManual,
}: NlpInputPanelProps) {
  const [patientInput, setPatientInput] = useState('')

  const handleGenerate = useCallback(() => {
    if (!patientInput.trim()) return
    onGenerate(patientInput)
  }, [patientInput, onGenerate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter / Cmd+Enter で生成
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate],
  )

  // バリデーションエラーがあるかどうか
  const hasValidationError =
    validation !== null && !validation.valid

  return (
    <div className={s.nlpPanel}>
      {/* ── ヘッダー ──────────────────────────────────────── */}
      <div className={s.nlpPanelHeader}>
        <span className={s.nlpPanelTitle}>
          🤖 自然言語生成モード
        </span>
        <button
          className={s.nlpSwitchBtn}
          onClick={onSwitchToManual}
          aria-label="手動選択モードに切り替え"
        >
          ← 手動選択に戻る
        </button>
      </div>

      {/* ── 患者入力エリア ────────────────────────────────── */}
      <div className={s.nlpInputSection}>
        <label className={s.nlpInputLabel} htmlFor="nlp-patient-input">
          患者の状況・症状を入力してください
        </label>
        <textarea
          id="nlp-patient-input"
          className={s.nlpTextarea}
          value={patientInput}
          onChange={e => setPatientInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={[
            '例: 吐き気が続いていて、食欲がなく食べられない状態が3日続いています。',
            '    Ctrl+Enter で生成',
          ].join('\n')}
          rows={4}
          aria-label="患者入力テキスト"
        />
      </div>

      {/* ── 生成ボタン ────────────────────────────────────── */}
      <button
        className={[
          s.nlpGenerateBtn,
          isGenerating ? s.nlpGenerateBtnLoading : '',
        ].join(' ')}
        onClick={handleGenerate}
        disabled={isGenerating || !patientInput.trim()}
        aria-label="SOAP を生成"
      >
        {isGenerating ? '生成中…' : '✨ SOAP を生成'}
      </button>

      {/* ── バリデーションエラー ──────────────────────────── */}
      {hasValidationError && (
        <div className={s.nlpValidationError} role="alert">
          <div className={s.nlpValidationErrorTitle}>
            ⚠️ モジュール定義にエラーがあります（SOAP 生成不可）
          </div>
          {validation.moduleErrors.length > 0 && (
            <ul className={s.nlpErrorList}>
              {validation.moduleErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
          {validation.scenarioErrors.length > 0 && (
            <ul className={s.nlpErrorList}>
              {validation.scenarioErrors.slice(0, 5).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {validation.scenarioErrors.length > 5 && (
                <li>… 他 {validation.scenarioErrors.length - 5} 件</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* ── 選択結果（生成後のみ表示） ───────────────────── */}
      {selectorReason && (
        <div className={s.nlpResult}>
          {/* scenarioId */}
          <div className={s.nlpResultRow}>
            <span className={s.nlpResultLabel}>選択シナリオ</span>
            <span className={s.nlpResultValue}>
              {scenarioId ?? '（特定できませんでした）'}
            </span>
          </div>

          {/* confidence */}
          <div className={s.nlpResultRow}>
            <span className={s.nlpResultLabel}>信頼度</span>
            <span
              className={[
                s.nlpResultValue,
                confidence >= 0.7
                  ? s.nlpConfidenceHigh
                  : confidence >= 0.4
                    ? s.nlpConfidenceMid
                    : s.nlpConfidenceLow,
              ].join(' ')}
            >
              {Math.round(confidence * 100)}%
            </span>
          </div>

          {/* reason */}
          <div className={s.nlpResultReason}>{selectorReason}</div>
        </div>
      )}
    </div>
  )
}
