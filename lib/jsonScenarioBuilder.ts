/**
 * jsonScenarioBuilder.ts — Scenario → ScenarioOutput 変換
 *
 * - S/O/A/P はシナリオの値をそのまま使う（patientInput の内容は混入しない）
 * - followup: scenario.followup が定義されていればそのまま渡す
 * - addonsRef: scenario.addonsRef をそのまま渡す
 *
 * any 禁止 / 純粋関数
 */

import type { ModuleData, Scenario, SideEffectPresence } from './types'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export interface ScenarioBuilderInput {
  module: ModuleData
  scenario: Scenario
  patientInput: string
}

export interface ScenarioOutput {
  moduleId: string
  scenarioId: string
  scenarioType: string
  scenarioGroup: string
  sideEffectPresence: SideEffectPresence
  S: string
  O: string
  A: string
  P: string
  addonsRef?: Scenario['addonsRef']
  followup?: Scenario['followup']
}

// ─────────────────────────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────────────────────────

export function jsonScenarioBuilder(
  input: ScenarioBuilderInput,
): ScenarioOutput {
  const { module, scenario } = input

  return {
    moduleId: module.moduleId,
    scenarioId: scenario.id,
    scenarioType: scenario.scenarioType,
    scenarioGroup: scenario.scenarioGroup,
    sideEffectPresence: scenario.sideEffectPresence,
    // S/O/A/P はシナリオの値をそのまま使う
    S: scenario.S,
    O: scenario.O,
    A: scenario.A,
    P: scenario.P,
    // addonsRef / followup は scenario に定義がある場合のみ渡す
    ...(scenario.addonsRef !== undefined && { addonsRef: scenario.addonsRef }),
    ...(scenario.followup !== undefined && { followup: scenario.followup }),
  }
}
