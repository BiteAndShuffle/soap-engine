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
 *   - active context（primary、または編集中の ComposeNode）のシナリオに対して判定する。
 *     Unit 4D-4 で 1剤目限定を撤廃し、任意の node で判定可能にした。
 *
 * Context 条件（満たす場合のみ eligibility 判定に進む）:
 *   - thirdPanelEnabled: active context のシナリオが確定済み
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
 * thirdPanelEnabled: active context（primary または編集中 ComposeNode）の
 *   シナリオが確定済みであること。シナリオ未確定では false にすること。
 *
 * Unit 4D-4 より前は isSingleDrug（primary main-search context）フィールドを
 * 併せ持ち、1剤目にのみ表示を限定していた。Unit 4D-4 でこの制約を撤廃し、
 * 本 context は thirdPanelEnabled 単独で判定する（D-4D4-2）。
 */
export interface SReplacementContext {
  /** active context のシナリオが確定済み */
  thirdPanelEnabled: boolean
}

/**
 * scenario 単体で S置換（Rapid）の適用可否を返す（RAPID-V2-08）。
 *
 * **UI context に依存しない scenario intrinsic predicate である。**
 * 以下に依存してはならない:
 *   isSingleDrug / editingNodeId / ThirdPanel visibility / compose 状態 / UI context
 *
 * Rapid Mode v2 / Unit 1 で isSReplacementEligible から分離した。
 * 判定内容は分離前と完全に同一であり、behavior を変更していない
 * （分離前の関数から context 判定 2 行だけを取り除いたもの）。
 *
 * scenario 変更時の RapidState 遷移（RAPID-V2-07）は、UI の表示可否ではなく
 * 本 predicate の結果を根拠に判定する。
 *
 * @param scenario - 判定対象シナリオ（null/undefined なら false）
 * @returns true ならこのシナリオは Rapid を適用できる
 */
export function isScenarioSReplacementCapable(
  scenario: Scenario | null | undefined,
): boolean {
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

/**
 * S置換UI（S先頭文ボタン群）の表示可否を返す。
 *
 * context 条件（UI）と scenario intrinsic 条件（capability）の 2 段構成:
 *   1. context: active context のシナリオ確定済み
 *   2. capability: isScenarioSReplacementCapable
 *
 * Unit 4D-4 より前は 1剤目（primary main-search context）にのみ表示を限定していたが、
 * この制約は撤廃した（D-4D4-3）。同一 clinicalDomain を含め、複数 ComposeNode が
 * 同時に non-null Rapid を持つことを制限しない。
 *
 * @param scenario - active context（primary または編集中 ComposeNode）のシナリオ（null/undefined なら false）
 * @param context  - 表示コンテキスト（シナリオ確定判定）
 * @returns true ならS置換UIを表示してよい
 */
export function isSReplacementEligible(
  scenario: Scenario | null | undefined,
  context: SReplacementContext,
): boolean {
  // Context 条件: 満たさなければ即 false
  if (!context.thirdPanelEnabled) return false
  return isScenarioSReplacementCapable(scenario)
}
