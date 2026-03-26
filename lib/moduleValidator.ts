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
 *   12) scenario 競合制御メタデータの型チェック（priority / exclusiveGroup / combinable）
 *   13) drug.brandNames と drug.brandCatalog のキーが集合として一致
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
  | 'FOLLOWUP_REF_BROKEN'      // scenarios[].followupRef が defaults.followupProfiles に存在しない（警告）
  | 'TAG_NOT_IN_CATALOG'       // scenario/addon の各 *Tags 値が tagCatalog に存在しない（警告）
  | 'ADDON_SCOPE_VIOLATION'    // addon.text に医療判断・受診判断を示す禁止語が含まれる（警告）
  | 'FOLLOWUP_SCOPE_VIOLATION' // defaults.followup* のテキストに同禁止語が含まれる（警告）
  | 'SCENARIO_PRIORITY_INVALID'       // scenario.priority が不正（負値・number以外）（警告）
  | 'SCENARIO_EXCLUSIVE_GROUP_INVALID' // scenario.exclusiveGroup が string/null 以外（警告）
  | 'SCENARIO_COMBINABLE_INVALID'     // scenario.combinable が boolean/null 以外（警告）
  | 'BRAND_CATALOG_MISMATCH'          // drug.brandNames と drug.brandCatalog のキーが不一致

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
// addon / followup 責務逸脱チェック用 禁止語
// ─────────────────────────────────────────────────────────────

const FORBIDDEN_DECISION_WORDS = [
  '中止してください',
  '休薬してください',
  '受診してください',
  '救急受診',
  '救急',
  '緊急受診',
  '直ちに受診',
  'すぐ受診',
  '至急受診',
  '受診を検討してください',
  '直ちに',
  'ただちに',
] as const

/** テキストに禁止語が含まれるか確認し、最初にマッチした語を返す */
function findForbiddenWord(text: string | null | undefined): string | null {
  if (!text) return null
  for (const word of FORBIDDEN_DECISION_WORDS) {
    if (text.includes(word)) return word
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// brandNames / brandCatalog 整合チェック
// ─────────────────────────────────────────────────────────────

/**
 * drug.brandNames と drug.brandCatalog のキーの整合性を検証する。
 *
 * ## 設計メモ
 * brandCatalog を持つモジュールでは、brandNames は brandCatalog の表示順リストとして機能する。
 * - 集合一致（必須）: brandNames ↔ brandCatalog のキーが過不足なく一致すること
 * - 順序一致（任意）: checkOrder=true のとき、brandNames の並びが brandCatalog の挿入順と一致すること
 *
 * 将来的に順序が表示順として意味を持つ場合は、呼び出し側で checkOrder: true を渡すことで有効化できる。
 * brandCatalog が存在しない場合はチェック全体をスキップする（injection以外のモジュールへの影響なし）。
 *
 * @param checkOrder - true のとき、集合一致に加えて順序一致も検証する（デフォルト: false）
 */
function validateBrandConsistency(
  drug: Record<string, unknown>,
  checkOrder = false,
): ModuleValidationError | null {
  const brandNames = (drug.brandNames as string[] | undefined) ?? []
  const brandCatalog = drug.brandCatalog as Record<string, unknown> | undefined
  if (!brandCatalog) return null

  const catalogKeys = Object.keys(brandCatalog)

  // ── 集合一致チェック（必須）──
  const missingInCatalog = brandNames.filter(b => !catalogKeys.includes(b))
  const missingInBrandNames = catalogKeys.filter(b => !brandNames.includes(b))

  const lines: string[] = []

  if (missingInCatalog.length > 0 || missingInBrandNames.length > 0) {
    lines.push('brandNames と brandCatalog の不整合を検出')
    if (missingInCatalog.length > 0) {
      lines.push(`brandNames に存在するが catalog にない: ${missingInCatalog.join(', ')}`)
    }
    if (missingInBrandNames.length > 0) {
      lines.push(`catalog に存在するが brandNames にない: ${missingInBrandNames.join(', ')}`)
    }
  }

  // ── 順序一致チェック（任意）──
  // brandCatalog の挿入順（Object.keys の返却順）と brandNames の並びが一致するか検証する。
  // 集合不一致がある場合は比較不能のためスキップ。
  if (checkOrder && lines.length === 0) {
    const outOfOrder = brandNames
      .map((name, i) => ({ name, expected: catalogKeys[i] }))
      .filter(({ name, expected }) => name !== expected)

    if (outOfOrder.length > 0) {
      lines.push('brandNames と brandCatalog の順序が一致しません')
      for (const { name, expected } of outOfOrder) {
        lines.push(`  brandNames: "${name}" / brandCatalog の期待値: "${expected}"`)
      }
    }
  }

  if (lines.length === 0) return null

  return {
    code: 'BRAND_CATALOG_MISMATCH',
    detail: lines.join('\n'),
    isWarning: false,
  }
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

  // 7) addons.orderPresets の全参照が addons.items に存在するか
  const orderPresets = addons?.orderPresets as Record<string, unknown> | undefined
  if (orderPresets && addonItems) {
    for (const [presetKey, refs] of Object.entries(orderPresets)) {
      if (!Array.isArray(refs)) continue
      for (const ref of refs as string[]) {
        if (!(ref in addonItems)) {
          errors.push({
            code: 'ADDON_REF_BROKEN',
            detail: `addons.orderPresets["${presetKey}"] に参照切れ: "${ref}" が addons.items に存在しません`,
            isWarning: false,
          })
        }
      }
    }
  }

  // 8) scenarios[].followupRef が defaults.followupProfiles に存在するか（警告）
  const followupProfiles = (obj?.defaults as Record<string, unknown> | undefined)
    ?.followupProfiles as Record<string, unknown> | undefined

  if (Array.isArray(scenarios) && followupProfiles) {
    for (const sc of scenarios as Scenario[]) {
      const ref = sc.followupRef
      if (ref && !(ref in followupProfiles)) {
        errors.push({
          code: 'FOLLOWUP_REF_BROKEN',
          detail: `scenarios["${sc.id}"].followupRef = "${ref}" が defaults.followupProfiles に存在しません`,
          isWarning: true,
        })
      }
    }
  }

  // 9) tagCatalog メンバーシップチェック（警告）
  //    tagCatalog が存在し、かつ対象配列が非空の場合のみ検証する
  const tagCatalog = obj?.tagCatalog as Record<string, unknown> | undefined

  if (tagCatalog) {
    type TagField = 'intentTags' | 'clinicalTags' | 'counselingTags' | 'workflowTags'
    const tagFields: TagField[] = ['intentTags', 'clinicalTags', 'counselingTags', 'workflowTags']

    // 有効値セットを構築（空配列の場合はチェックをスキップ）
    const catalogSets: Partial<Record<TagField, Set<string>>> = {}
    for (const field of tagFields) {
      const catalog = tagCatalog[field]
      if (Array.isArray(catalog) && catalog.length > 0) {
        catalogSets[field] = new Set(catalog as string[])
      }
    }

    // scenarios のタグをチェック
    if (Array.isArray(scenarios)) {
      for (const sc of scenarios as Record<string, unknown>[]) {
        for (const field of tagFields) {
          const validSet = catalogSets[field]
          if (!validSet) continue
          const tags = sc[field]
          if (!Array.isArray(tags)) continue
          for (const tag of tags as string[]) {
            if (!validSet.has(tag)) {
              errors.push({
                code: 'TAG_NOT_IN_CATALOG',
                detail: `scenarios["${sc.id}"].${field} に未定義タグ: "${tag}" が tagCatalog.${field} に存在しません`,
                isWarning: true,
              })
            }
          }
        }
      }
    }

    // addons.items のタグをチェック
    if (addonItems) {
      for (const [mapKey, item] of Object.entries(addonItems)) {
        for (const field of tagFields) {
          const validSet = catalogSets[field]
          if (!validSet) continue
          const tags = (item as Record<string, unknown>)[field]
          if (!Array.isArray(tags)) continue
          for (const tag of tags as string[]) {
            if (!validSet.has(tag)) {
              errors.push({
                code: 'TAG_NOT_IN_CATALOG',
                detail: `addons.items["${mapKey}"].${field} に未定義タグ: "${tag}" が tagCatalog.${field} に存在しません`,
                isWarning: true,
              })
            }
          }
        }
      }
    }
  }

  // 10) addon.text の責務逸脱チェック（警告）
  if (addonItems) {
    for (const [mapKey, item] of Object.entries(addonItems)) {
      const text = (item as Record<string, unknown>).text
      const hit = findForbiddenWord(typeof text === 'string' ? text : null)
      if (hit) {
        errors.push({
          code: 'ADDON_SCOPE_VIOLATION',
          detail: `[ADDON_SCOPE_VIOLATION] addon "${mapKey}" contains decision-level wording: "${hit}"`,
          isWarning: true,
        })
      }
    }
  }

  // 11) defaults.followupProfiles / defaults.followup の責務逸脱チェック（警告）
  const defaultsObj = obj?.defaults as Record<string, unknown> | undefined

  // 新スキーマ: followupProfiles
  const followupProfilesForScope = defaultsObj?.followupProfiles as
    Record<string, Record<string, unknown>> | undefined
  if (followupProfilesForScope) {
    for (const [profileKey, profile] of Object.entries(followupProfilesForScope)) {
      for (const fieldKey of ['S', 'P'] as const) {
        const val = profile[fieldKey]
        const hit = findForbiddenWord(typeof val === 'string' ? val : null)
        if (hit) {
          errors.push({
            code: 'FOLLOWUP_SCOPE_VIOLATION',
            detail: `[FOLLOWUP_SCOPE_VIOLATION] followup profile "${profileKey}" contains decision-level wording: "${hit}"`,
            isWarning: true,
          })
        }
      }
    }
  }

  // 旧スキーマ: defaults.followup
  const legacyFollowup = defaultsObj?.followup as Record<string, unknown> | undefined
  if (legacyFollowup) {
    for (const fieldKey of ['S', 'P'] as const) {
      const val = legacyFollowup[fieldKey]
      const hit = findForbiddenWord(typeof val === 'string' ? val : null)
      if (hit) {
        errors.push({
          code: 'FOLLOWUP_SCOPE_VIOLATION',
          detail: `[FOLLOWUP_SCOPE_VIOLATION] defaults.followup.${fieldKey} contains decision-level wording: "${hit}"`,
          isWarning: true,
        })
      }
    }
  }

  // 12) scenario 競合制御メタデータの型チェック（警告）
  //     フィールドが省略・null の場合はスキップ。値が存在する場合のみ型を検証する。
  if (Array.isArray(scenarios)) {
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String(sc.id ?? '(unknown)')

      // priority: number かつ非負
      if (sc.priority !== undefined && sc.priority !== null) {
        if (typeof sc.priority !== 'number' || sc.priority < 0) {
          errors.push({
            code: 'SCENARIO_PRIORITY_INVALID',
            detail: `scenarios["${scId}"].priority = ${JSON.stringify(sc.priority)} は非負の number である必要があります`,
            isWarning: true,
          })
        }
      }

      // exclusiveGroup: string または null
      if (sc.exclusiveGroup !== undefined && sc.exclusiveGroup !== null) {
        if (typeof sc.exclusiveGroup !== 'string') {
          errors.push({
            code: 'SCENARIO_EXCLUSIVE_GROUP_INVALID',
            detail: `scenarios["${scId}"].exclusiveGroup = ${JSON.stringify(sc.exclusiveGroup)} は string または null である必要があります`,
            isWarning: true,
          })
        }
      }

      // combinable: boolean または null
      if (sc.combinable !== undefined && sc.combinable !== null) {
        if (typeof sc.combinable !== 'boolean') {
          errors.push({
            code: 'SCENARIO_COMBINABLE_INVALID',
            detail: `scenarios["${scId}"].combinable = ${JSON.stringify(sc.combinable)} は boolean または null である必要があります`,
            isWarning: true,
          })
        }
      }
    }
  }

  // 13) drug.brandNames と drug.brandCatalog のキー整合チェック
  if (drug) {
    const brandError = validateBrandConsistency(drug)
    if (brandError) errors.push(brandError)
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
    console.warn(`[ModuleValidator Warning] ${result.moduleId}`, warnings)
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
