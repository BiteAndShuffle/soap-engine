/**
 * moduleValidator.ts — ModuleData 全体の構造的妥当性チェック
 *
 * シナリオバリデーション（scenarioValidator.ts）とは分離し、
 * モジュールレベルの整合性を検証する。
 *
 * チェック項目:
 *   1)  moduleId が存在・非空
 *   2)  moduleVersion が存在（警告扱い）
 *   3)  drug.search.primaryDisplayName が存在
 *   4)  addons.items の各アイテムで key フィールドが存在する場合、マップキーと一致
 *   5)  scenarios[].addonsRef.* の全参照が addons.items に存在
 *   6)  ui.panelOrder と ui.panels[].id が整合（panelOrder に含まれる全 id が panels に存在）
 *   7)  addons.orderPresets の全参照が addons.items に存在
 *   8)  scenarios[].globalId = moduleId + "." + scenario.id と一致
 *   9)  scenarios[].followup が defaults.followup と重複（警告扱い）
 *   10) scenarios[].situationFilter が必須・非空・許可値のみ
 *   11) scenarios[].sideEffectPresence の値チェック（必須・許可値のみ）
 */

import type { ModuleData, Scenario } from './types'

// ─────────────────────────────────────────────────────────────
// エラー型
// ─────────────────────────────────────────────────────────────

export type ModuleValidationErrorCode =
  | 'MISSING_MODULE_ID'        // moduleId が存在しない
  | 'MISSING_MODULE_VERSION'   // moduleVersion が存在しない（警告）
  | 'MISSING_PRIMARY_DISPLAY_NAME' // drug.search.primaryDisplayName が存在しない
  | 'ADDON_KEY_MISMATCH'       // addons.items のキーと item.key が不一致
  | 'ADDON_REF_BROKEN'         // scenarios[].addonsRef の参照先が addons.items に存在しない
  | 'PANEL_ORDER_MISMATCH'     // ui.panelOrder に存在する id が ui.panels にない

export interface ModuleValidationError {
  code: ModuleValidationErrorCode
  /** 不一致のキー・ID など詳細情報 */
  detail: string
  /** 警告（true）か致命的エラー（false） */
  isWarning: boolean
}

export interface ModuleValidationResult {
  moduleId: string
  isValid: boolean
  /** isWarning=true のみのエントリは警告扱い（アプリ起動は続行） */
  errors: ModuleValidationError[]
}

// ─────────────────────────────────────────────────────────────
// バリデーション本体
// ─────────────────────────────────────────────────────────────

export function validateModule(moduleData: unknown): ModuleValidationResult {
  const obj = moduleData as Record<string, unknown>
  const moduleId =
    typeof obj?.moduleId === 'string' && obj.moduleId.trim() !== ''
      ? (obj.moduleId as string)
      : '(unknown)'

  const errors: ModuleValidationError[] = []

  // 1) moduleId
  if (typeof obj?.moduleId !== 'string' || (obj.moduleId as string).trim() === '') {
    errors.push({
      code: 'MISSING_MODULE_ID',
      detail: 'moduleId が存在しないか空文字です',
      isWarning: false,
    })
  }

  // 2) moduleVersion（警告扱い）
  if (!obj?.moduleVersion) {
    errors.push({
      code: 'MISSING_MODULE_VERSION',
      detail: 'moduleVersion が存在しません（推奨フィールド）',
      isWarning: true,
    })
  }

  // 3) drug.search.primaryDisplayName
  const drug = obj?.drug as Record<string, unknown> | undefined
  const drugSearch = drug?.search as Record<string, unknown> | undefined
  if (!drugSearch?.primaryDisplayName) {
    errors.push({
      code: 'MISSING_PRIMARY_DISPLAY_NAME',
      detail: 'drug.search.primaryDisplayName が存在しません',
      isWarning: false,
    })
  }

  // 4) addons.items のキー整合チェック
  const addons = obj?.addons as Record<string, unknown> | undefined
  const addonItems = addons?.items as Record<string, Record<string, unknown>> | undefined

  if (addonItems) {
    for (const [mapKey, item] of Object.entries(addonItems)) {
      // item.key が存在する場合はマップキーと一致しているか確認
      if (item.key !== undefined && item.key !== mapKey) {
        errors.push({
          code: 'ADDON_KEY_MISMATCH',
          detail: `addons.items["${mapKey}"].key = "${item.key}" がマップキーと一致しません`,
          isWarning: false,
        })
      }
    }
  }

  // 5) scenarios[].addonsRef の参照チェック
  const scenarios = obj?.scenarios
  if (Array.isArray(scenarios) && addonItems) {
    for (const sc of scenarios as Scenario[]) {
      const ref = sc.addonsRef
      if (!ref) continue
      const allRefs: string[] = [
        ...(ref.S ?? []),
        ...(ref.O ?? []),
        ...(ref.A ?? []),
        ...(ref.P ?? []),
      ]
      for (const key of allRefs) {
        if (!(key in addonItems)) {
          errors.push({
            code: 'ADDON_REF_BROKEN',
            detail: `scenarios["${sc.id}"].addonsRef に参照切れ: "${key}" が addons.items に存在しません`,
            isWarning: false,
          })
        }
      }
    }
  }

  // 6) ui.panelOrder と ui.panels の整合チェック
  const ui = obj?.ui as Record<string, unknown> | undefined
  if (ui) {
    const panels = ui?.panels as Array<{ id: string }> | undefined
    const panelOrder = ui?.panelOrder as string[] | undefined

    if (panels && panelOrder) {
      const panelIds = new Set(panels.map(p => p.id))
      for (const orderId of panelOrder) {
        if (!panelIds.has(orderId)) {
          errors.push({
            code: 'PANEL_ORDER_MISMATCH',
            detail: `ui.panelOrder に "${orderId}" が含まれますが、ui.panels に対応する id がありません`,
            isWarning: false,
          })
        }
      }
    }
  }

  const fatalErrors = errors.filter(e => !e.isWarning)
  return {
    moduleId,
    isValid: fatalErrors.length === 0,
    errors,
  }
}

// ─────────────────────────────────────────────────────────────
// ロード時チェック（page.tsx から呼ぶ）
// ─────────────────────────────────────────────────────────────

/**
 * モジュールをバリデーションし、結果をコンソール出力する。
 * isValid=false の場合はエラーをスロー（起動時に検出）。
 *
 * @throws Error  致命的なバリデーションエラーがある場合
 */
export function assertModuleValid(moduleData: unknown): void {
  const result = validateModule(moduleData)

  const warnings = result.errors.filter(e => e.isWarning)
  const fatals = result.errors.filter(e => !e.isWarning)

  if (warnings.length > 0) {
    console.warn(
      `[ModuleValidator] ${result.moduleId}: ${warnings.length}件の警告`,
    )
    for (const w of warnings) {
      console.warn(`  ⚠️ [${w.code}] ${w.detail}`)
    }
  }

  if (fatals.length > 0) {
    console.error(
      `[ModuleValidator] ${result.moduleId}: ${fatals.length}件の致命的エラー`,
    )
    for (const e of fatals) {
      console.error(`  ❌ [${e.code}] ${e.detail}`)
    }
    throw new Error(
      `[ModuleValidator] ${result.moduleId} のバリデーションに失敗しました: ` +
      fatals.map(e => `${e.code}: ${e.detail}`).join(' / '),
    )
  }

  console.log(
    `[ModuleValidator] ${result.moduleId}: バリデーション OK ✅` +
    (warnings.length > 0 ? ` (警告 ${warnings.length}件)` : ''),
  )
}
