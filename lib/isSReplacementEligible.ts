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
 *   - isSingleDrug: 「右上メイン検索で選択した1剤目 primary drug が確定済み、
 *                   かつ追加薬剤（composeNodes）がゼロ件」を意味する。
 *                   以下のすべてが成立する場合のみ true とすること:
 *                     isPrimaryDrug         — 1剤目のシナリオ（selectedScenarioId 非null）
 *                     isPrimaryScenario     — primary drug のシナリオを表示中
 *                     isMainSearchSelection — サードパネル薬剤追加検索ではなく右上メイン検索由来
 *                     !isAdditionalDrugSelection — composeNodes への追加薬剤選択中ではない
 *                     !isSynthesisMode      — 多剤合成中（composeNodes.length > 0）ではない
 *                     !isComposedSoapMode   — 合成済み SOAP の再編集中ではない
 *                   DashboardClient では
 *                     selectedScenarioId !== null && composeNodes.length === 0
 *                   がこれらすべてを包含して isSingleDrug として計算される。
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
 * ## isSingleDrug の意味（= primary main-search context）
 *
 * このフィールドは単なる「薬剤が1剤か」ではなく、以下をすべて包含する:
 *   - isPrimaryDrug:          右上メイン検索で選ばれた1剤目（selectedScenarioId 非null）
 *   - isPrimaryScenario:      その primary drug のシナリオを表示・編集中
 *   - isMainSearchSelection:  サードパネル内「薬剤追加」検索経由ではない
 *   - !isAdditionalDrugSelection: composeNodes への2剤目以降追加中ではない
 *   - !isSynthesisMode:       composeNodes が空（多剤合成未開始）
 *   - !isComposedSoapMode:    合成済み SOAP 再編集中ではない
 *
 * DashboardClient での算出式:
 *   isSingleDrug = selectedScenarioId !== null && composeNodes.length === 0
 *
 * S置換UI はこのすべてが成立する場合のみ表示する。
 * 追加薬剤（2剤目以降）・合成窓・合成済み SOAP 再編集中は必ず false にすること。
 *
 * thirdPanelEnabled: currentScenarioId !== null かつ !== ''。
 *   シナリオ未確定では false にすること。
 */
export interface SReplacementContext {
  /** シナリオ確定済み（currentScenarioId が有効） */
  thirdPanelEnabled: boolean
  /**
   * primary drug / main-search / non-synthesis context。
   *
   * 以下をすべて包含する複合条件（詳細は上記 JSDoc 参照）:
   *   isPrimaryDrug / isPrimaryScenario / isMainSearchSelection /
   *   !isAdditionalDrugSelection / !isSynthesisMode / !isComposedSoapMode
   *
   * DashboardClient: selectedScenarioId !== null && composeNodes.length === 0
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
