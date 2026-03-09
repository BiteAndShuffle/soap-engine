/**
 * validationRunner.ts — モジュール定義の健全性チェック
 *
 * 対象: ModuleData の構造的整合性（addonsRef 参照切れ / panelOrder 不整合など）
 *      および scenarios[] の必須フィールド検証。
 *
 * 生成した SOAP テキストの内容は検証しない。
 *
 * 依存:
 *   - lib/moduleValidator.ts: validateModule() → 致命的エラーのみ収集
 *   - lib/scenarioValidator.ts: validateAllScenarios() → scenarios[] の構造チェック
 *
 * any 禁止 / 純粋関数
 */

import { validateModule } from './moduleValidator'
import { validateAllScenarios } from './scenarioValidator'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  moduleErrors: string[]
  scenarioErrors: string[]
}

// ─────────────────────────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────────────────────────

export function validationRunner(moduleData: unknown): ValidationResult {
  // ── モジュールレベル検証 ────────────────────────────────────
  // isWarning=false（致命的）のエラーのみ収集する
  const moduleResult = validateModule(moduleData)
  const moduleErrors = moduleResult.errors
    .filter(e => !e.isWarning)
    .map(e => `[${e.code}] ${e.detail}`)

  // ── シナリオレベル検証 ─────────────────────────────────────
  // scenarios を取得（moduleData の型は unknown のため安全にアクセス）
  const obj = moduleData as Record<string, unknown>
  const scenarios = Array.isArray(obj?.scenarios) ? obj.scenarios : []
  const scenarioResults = validateAllScenarios(scenarios)

  const scenarioErrors = scenarioResults
    .filter(r => !r.isValid)
    .flatMap(r =>
      r.errors.map(
        e => `[${r.scenarioId}][${e.code}](${e.field ?? ''}) ${e.message}`,
      ),
    )

  const valid = moduleErrors.length === 0 && scenarioErrors.length === 0

  return { valid, moduleErrors, scenarioErrors }
}
