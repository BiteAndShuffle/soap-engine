/**
 * crossModuleValidator.ts — クロスモジュール横断整合性チェック
 *
 * 単一モジュール validator（moduleValidator.ts）では検出できない、
 * 全モジュール横断の一意性違反を検出する。
 *
 * checks:
 *   1) MODULE_ID_DUPLICATE
 *      全 ModuleData の moduleId がモジュール間で重複していないこと
 *      （allModules.find(m => m.moduleId === ...) が最初の一致しか返さないため、
 *       重複があると後続モジュールが runtime で到達不能になる）
 *   2) SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE
 *      全 ModuleData の scenarios[].globalId がモジュール間で重複していないこと
 *      （同一モジュール内の重複は moduleValidator.ts check 23/24 で検出済み）
 *      （search.ts の SearchEntry.templateId = scenario.globalId はアプリ全体で一意を前提とする）
 */

import type { ModuleData } from './types'

// ─────────────────────────────────────────────────────────────
// 公開型
// ─────────────────────────────────────────────────────────────

export type CrossModuleValidationErrorCode =
  | 'MODULE_ID_DUPLICATE'                       // moduleId が複数モジュール間で重複
  | 'SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE'  // scenario.globalId が複数モジュール間で重複

export interface CrossModuleValidationError {
  code: CrossModuleValidationErrorCode
  /** 重複に関与するモジュールの moduleId リスト */
  moduleIds: string[]
  detail: string
  isWarning: boolean
}

export interface CrossModuleValidationResult {
  errors: CrossModuleValidationError[]
}

// ─────────────────────────────────────────────────────────────
// バリデーション本体
// ─────────────────────────────────────────────────────────────

export function validateCrossModule(modules: ModuleData[]): CrossModuleValidationResult {
  const errors: CrossModuleValidationError[] = []

  // 1) moduleId クロスモジュール重複チェック
  const moduleIdCount = new Map<string, number>()
  for (const mod of modules) {
    const id = typeof mod.moduleId === 'string' ? mod.moduleId : ''
    if (!id) continue
    moduleIdCount.set(id, (moduleIdCount.get(id) ?? 0) + 1)
  }
  for (const [moduleId, count] of moduleIdCount.entries()) {
    if (count > 1) {
      errors.push({
        code: 'MODULE_ID_DUPLICATE',
        moduleIds: [moduleId],
        detail: `moduleId = "${moduleId}" が ALL_MODULES 内で ${count} 件重複しています`,
        isWarning: false,
      })
    }
  }

  // 2) scenario.globalId クロスモジュール重複チェック
  //    globalId → 出現箇所 [{moduleId, scenarioId}] を収集し、
  //    distinctModuleIds が 2 以上の場合に ERROR
  const globalIdIndex = new Map<string, Array<{ moduleId: string; scenarioId: string }>>()
  for (const mod of modules) {
    const moduleId = typeof mod.moduleId === 'string' && mod.moduleId
      ? mod.moduleId
      : '(unknown)'
    if (!Array.isArray(mod.scenarios)) continue
    for (const sc of mod.scenarios as unknown as Record<string, unknown>[]) {
      const globalId = sc.globalId
      if (typeof globalId !== 'string' || !globalId) continue
      const scenarioId = typeof sc.id === 'string' ? sc.id : '(unknown)'
      const existing = globalIdIndex.get(globalId) ?? []
      existing.push({ moduleId, scenarioId })
      globalIdIndex.set(globalId, existing)
    }
  }
  for (const [globalId, entries] of globalIdIndex.entries()) {
    const distinctModuleIds = [...new Set(entries.map(e => e.moduleId))]
    if (distinctModuleIds.length < 2) continue
    const scenarioSummary = entries
      .map(e => `${e.moduleId}/${e.scenarioId}`)
      .join(', ')
    errors.push({
      code: 'SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE',
      moduleIds: distinctModuleIds,
      detail: `scenario.globalId = "${globalId}" が複数モジュールに存在します: [${scenarioSummary}]`,
      isWarning: false,
    })
  }

  return { errors }
}

// ─────────────────────────────────────────────────────────────
// アサーション（起動時呼び出し用）
// ─────────────────────────────────────────────────────────────

/**
 * 全モジュールをクロスモジュール検証し、結果をコンソール出力する。
 * 致命的エラーがある場合はスロー（起動時に検出）。
 *
 * @throws Error  致命的なバリデーションエラーがある場合
 */
export function assertCrossModuleValid(modules: ModuleData[]): void {
  const result = validateCrossModule(modules)
  const fatals = result.errors.filter(e => !e.isWarning)

  if (fatals.length > 0) {
    console.error(
      `[CrossModuleValidator] ${fatals.length}件の致命的エラー`,
    )
    for (const e of fatals) {
      console.error(`  ❌ [${e.code}] (${e.moduleIds.join(', ')}) ${e.detail}`)
    }
    throw new Error(
      `[CrossModuleValidator] バリデーションに失敗しました: ` +
      fatals.map(e => `${e.code}: ${e.detail}`).join(' / '),
    )
  }

  console.log(
    `[CrossModuleValidator] バリデーション OK ✅ (${modules.length} モジュール)`,
  )
}
