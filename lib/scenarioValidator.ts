/**
 * scenarioValidator.ts — Scenario の構造的妥当性チェック
 *
 * 用途:
 *   - ロード時に invalid な scenario を検出してログ・UI表示に使う
 *   - 本番でも動作（console.error や UI バッジに利用可能）
 *
 * チェック項目:
 *   1) 必須キー: id, title, scenarioType, scenarioGroup, sideEffectPresence, S, O, A, P
 *   2) S / O / A / P が空でないこと
 *   3) sideEffectPresence が有効な enum 値であること
 *   4) scenarioType が空でないこと
 */

import type { Scenario, SideEffectPresence } from './types'

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const REQUIRED_KEYS: (keyof Scenario)[] = [
  'id',
  'title',
  'scenarioType',
  'scenarioGroup',
  'sideEffectPresence',
  'S',
  'O',
  'A',
  'P',
]

const VALID_SIDE_EFFECT_PRESENCE: SideEffectPresence[] = [
  'absent_or_not_observed',
  'present',
  'not_applicable',
]

// ─────────────────────────────────────────────────────────────
// ValidationError
// ─────────────────────────────────────────────────────────────

export type ValidationErrorCode =
  | 'MISSING_KEY'       // 必須キーが存在しない
  | 'EMPTY_SOAP'        // S/O/A/P が空文字
  | 'INVALID_SEP'       // sideEffectPresence が不正な値
  | 'EMPTY_SCENARIO_TYPE' // scenarioType が空

export interface ValidationError {
  code: ValidationErrorCode
  field?: string
  message: string
}

export interface ScenarioValidationResult {
  scenarioId: string
  title: string
  isValid: boolean
  errors: ValidationError[]
}

// ─────────────────────────────────────────────────────────────
// ScenarioValidator
// ─────────────────────────────────────────────────────────────

/**
 * 単一 Scenario を検証し、ValidationError の配列を返す。
 * エラーがなければ isValid=true。
 */
export function validateScenario(sc: unknown): ScenarioValidationResult {
  const obj = sc as Record<string, unknown>
  const scenarioId = (typeof obj?.id === 'string' ? obj.id : '(unknown)')
  const title = (typeof obj?.title === 'string' ? obj.title : '(no title)')
  const errors: ValidationError[] = []

  // 1) 必須キー欠落チェック
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj) || obj[key] === undefined || obj[key] === null) {
      errors.push({
        code: 'MISSING_KEY',
        field: key,
        message: `必須キー "${key}" が存在しません`,
      })
    }
  }

  // 必須キーが揃っていない場合は以降のチェックをスキップ
  if (errors.length > 0) {
    return { scenarioId, title, isValid: false, errors }
  }

  const typed = obj as unknown as Scenario

  // 2) S/O/A/P 空チェック
  for (const key of ['S', 'O', 'A', 'P'] as const) {
    if (typed[key].trim() === '') {
      errors.push({
        code: 'EMPTY_SOAP',
        field: key,
        message: `SOAP フィールド "${key}" が空です`,
      })
    }
  }

  // 3) sideEffectPresence 有効値チェック
  if (
    !VALID_SIDE_EFFECT_PRESENCE.includes(typed.sideEffectPresence as SideEffectPresence)
  ) {
    errors.push({
      code: 'INVALID_SEP',
      field: 'sideEffectPresence',
      message: `sideEffectPresence の値 "${typed.sideEffectPresence}" は不正です。有効値: ${VALID_SIDE_EFFECT_PRESENCE.join(' | ')}`,
    })
  }

  // 4) scenarioType 空チェック
  if (typed.scenarioType.trim() === '') {
    errors.push({
      code: 'EMPTY_SCENARIO_TYPE',
      field: 'scenarioType',
      message: 'scenarioType が空です',
    })
  }

  return {
    scenarioId,
    title,
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * scenarios[] 全件を検証し、結果配列を返す。
 * isValid=false のエントリのみフィルタしたい場合は .filter(r => !r.isValid) を使う。
 */
export function validateAllScenarios(scenarios: unknown[]): ScenarioValidationResult[] {
  return scenarios.map(validateScenario)
}

/**
 * scenarios[] を検証し、コンソールに invalid なものをまとめて出力する。
 * page.tsx や DashboardClient のマウント時に呼ぶことを想定。
 * 戻り値: invalid な ScenarioValidationResult[]
 */
export function reportInvalidScenarios(
  scenarios: unknown[],
  moduleId = '(unknown module)',
): ScenarioValidationResult[] {
  const results = validateAllScenarios(scenarios)
  const invalid = results.filter(r => !r.isValid)

  if (invalid.length === 0) {
    console.log(`[ScenarioValidator] ${moduleId}: 全 ${results.length} 件 valid ✅`)
  } else {
    console.error(
      `[ScenarioValidator] ${moduleId}: ${invalid.length}/${results.length} 件 invalid ❌`,
    )
    for (const r of invalid) {
      console.error(
        `  ⚠️ [${r.scenarioId}] "${r.title}":`,
        r.errors.map(e => `${e.code}(${e.field ?? ''}): ${e.message}`).join(' / '),
      )
    }
  }

  return invalid
}
