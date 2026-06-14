/**
 * createSoapFromInput.ts — 自然言語入力から SOAP を生成するパイプライン
 *
 * 実行順:
 *   1. scenarioSelector   — patientInput → scenarioId + confidence + reason
 *   2. validationRunner   — moduleData の健全性チェック（scenarioId の有無によらず実行）
 *   3. jsonScenarioBuilder — scenario → ScenarioOutput（scenarioId が null の場合はスキップ）
 *   4. soapComposer       — ScenarioOutput → ComposedSoap（validationが失敗した場合はスキップ）
 *
 * soap が null になる条件:
 *   - scenarioId が null（シナリオを特定できなかった）
 *   - validation.valid が false（モジュール定義に致命的エラーあり）
 *
 * any 禁止 / 純粋関数
 */

import type { ModuleData } from './types'
import { scenarioSelector } from './scenarioSelector'
import { jsonScenarioBuilder } from './jsonScenarioBuilder'
import { validationRunner } from './validationRunner'
import { soapComposer } from './soapComposer'
import type { ComposedSoap } from './soapComposer'
import type { ValidationResult } from './validationRunner'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export interface CreateSoapResult {
  scenarioId: string | null
  soap: ComposedSoap | null
  validation: ValidationResult
  selectorReason: string
  /** scenarioSelector の信頼スコア（0〜1） */
  confidence: number
}

// ─────────────────────────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────────────────────────

export function createSoapFromInput(
  module: ModuleData,
  patientInput: string,
): CreateSoapResult {
  // 1. シナリオ選択
  const selected = scenarioSelector({ module, patientInput })

  // 2. モジュール定義の健全性チェック（scenarioId の有無によらず常に実行）
  const validation = validationRunner(module)

  // soap 生成条件: scenarioId が存在し、かつバリデーションが通過していること
  if (!selected.scenarioId || !validation.valid) {
    return {
      scenarioId: selected.scenarioId,
      soap: null,
      validation,
      selectorReason: selected.reason,
      confidence: selected.confidence,
    }
  }

  // 3. シナリオオブジェクトを取得
  const scenario = module.scenarios.find(sc => sc.globalId === selected.scenarioId)
  if (!scenario) {
    // scenarioSelector が返した id が scenarios[] に存在しない（通常は発生しない）
    return {
      scenarioId: selected.scenarioId,
      soap: null,
      validation,
      selectorReason: `scenarioId="${selected.scenarioId}" が scenarios[] に見つかりません`,
      confidence: selected.confidence,
    }
  }

  // 4. ScenarioOutput 生成 → SOAP 合成
  // addonsRef の自動展開はスキップする。
  // ADDON の本文反映は UI 側の handleAddonToggle が selectedAddonIds を使って行う。
  // これにより Rapid 生成直後の本文は「addonsRef 未適用」の状態になり、
  // rapidBaseFieldsRef との整合が取れる。
  const scenarioOutput = jsonScenarioBuilder({ module, scenario, patientInput })
  const soap = soapComposer(scenarioOutput, module, { skipAddonsRef: true })

  return {
    scenarioId: selected.scenarioId,
    soap,
    validation,
    selectorReason: selected.reason,
    confidence: selected.confidence,
  }
}
