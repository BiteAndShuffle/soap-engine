/**
 * isSReplacementEligible.ts
 *
 * S置換UI（S先頭文ボタン群）の表示可否を汎用判定する。
 *
 * 設計方針:
 *   - JSON に thirdPanelSPlacement を追記することなく、
 *     新規モジュールでも自動的にS置換UIが有効になる。
 *   - thirdPanelSPlacement が明示されている場合は最優先（override 禁止）。
 *     特に enabled: false の明示は fallback で true にしてはならない。
 *   - 単剤・primary drug・main search 選択時のみ有効。
 *     追加薬剤・SOAP合成時・composed state では必ず false。
 *
 * Context 条件（すべて満たす場合のみ eligibility 判定に進む）:
 *   - thirdPanelEnabled: シナリオ確定済み
 *   - isSingleDrug: composeNodes が空（追加薬剤なし）
 *
 * Generic fallback（thirdPanelSPlacement 未設定時）:
 *   1. sideEffectPresence === "absent_or_not_observed"
 *   2. scenarioType === "side_effect" かつ scenarioTags に "absent" または "none"
 *   3. scenarioType === "adherence" かつ scenarioTags に "good"
 *   4. id === "cp_good" で始まる（後方互換）
 */

import type { Scenario } from './types'

/**
 * S置換UI 表示コンテキスト。
 *
 * isSingleDrug: composeNodes.length === 0 かつ 1剤目確定済み。
 *   多剤合成中・追加薬剤側では false にすること。
 *
 * thirdPanelEnabled: currentScenarioId !== null かつ !== ''。
 *   シナリオ未確定では false にすること。
 */
export interface SReplacementContext {
  /** シナリオ確定済み（currentScenarioId が有効） */
  thirdPanelEnabled: boolean
  /**
   * 単剤かつ primary drug。
   * composeNodes が空（追加薬剤なし）かつ 1剤目のシナリオ確定済みの場合のみ true。
   * 追加薬剤側・合成窓・composed SOAP 再編集中は false にすること。
   */
  isSingleDrug: boolean
}

/**
 * S置換UI（S先頭文ボタン群）の表示可否を返す。
 *
 * @param scenario - 現在選択中の primary scenario（null/undefined なら false）
 * @param context  - 表示コンテキスト（単剤判定・シナリオ確定判定）
 * @returns true ならS置換UIを表示してよい
 */
export function isSReplacementEligible(
  scenario: Scenario | null | undefined,
  context: SReplacementContext,
): boolean {
  // Context 条件: すべて満たさなければ即 false
  if (!context.thirdPanelEnabled || !context.isSingleDrug) return false
  if (!scenario) return false

  // ── 明示設定優先（override 禁止） ──────────────────────────
  // thirdPanelSPlacement が明示されている場合はそれを最優先とする。
  // enabled: false の明示は fallback で覆さない。
  if (scenario.thirdPanelSPlacement !== undefined) {
    return (
      scenario.thirdPanelSPlacement.enabled === true &&
      scenario.thirdPanelSPlacement.trigger === 'single_drug_only'
    )
  }

  // ── Generic fallback（thirdPanelSPlacement 未設定時のみ） ──
  // 新規モジュールは以下の条件を満たせば自動的に S置換UI が有効になる。

  // 1. 副作用なし（sideEffectPresence SSOT）
  if (scenario.sideEffectPresence === 'absent_or_not_observed') return true

  const tags = scenario.scenarioTags ?? []

  // 2. 副作用系シナリオかつ "absent" / "none" タグ
  if (
    scenario.scenarioType === 'side_effect' &&
    (tags.includes('absent') || tags.includes('none'))
  ) return true

  // 3. adherence 系シナリオかつ "good" タグ
  if (scenario.scenarioType === 'adherence' && tags.includes('good')) return true

  // 4. id が cp_good で始まる（後方互換 fallback）
  if (scenario.id.startsWith('cp_good')) return true

  return false
}
