/**
 * moduleValidator.ts — ModuleData 全体の構造的妥当性チェック
 *
 * シナリオバリデーション（scenarioValidator.ts）とは分離し、
 * モジュールレベルの整合性を検証する。
 *
 * チェック項目:
 *   1)   moduleId が存在・非空
 *   2)   moduleVersion が存在（警告扱い）
 *   3)   drug.search.primaryDisplayName が存在
 *   3a)  drug.nameAliases と drug.search.nameAliases の完全一致（P0-A SSOT）
 *   3b)  drug.search.formulationSearchTokens / commonSearchTokens が alias 系フィールドに混入していないか（警告）
 *   4)   addons.items の各アイテムで key フィールドが存在する場合、マップキーと一致
 *   5)   scenarios[].addonsRef.* の全参照が addons.items に存在
 *   6)   ui.panelOrder と ui.panels[].id が整合（panelOrder に含まれる全 id が panels に存在）
 *   7)   addons.orderPresets の必須確認・型確認・全参照が addons.items に存在（P0-A SSOT）
 *   8)   scenarios[].followupRef が defaults.followupProfiles に存在するか（警告）
 *   9)   tagCatalog メンバーシップチェック（警告）
 *   10)  addon.text の責務逸脱チェック（禁止語）（警告）
 *   11)  defaults.followup* の責務逸脱チェック（禁止語）（警告）
 *   12)  scenario 競合制御メタデータの型チェック（priority / exclusiveGroup / combinable）（警告）
 *   13)  drug.brandNames と drug.brandCatalog のキーが集合として一致
 *   13b) brandCatalog[key].displayName が key と完全一致すること（ERROR）。
 *        検索alias→canonical薬剤名→SOAP主語の解決経路のうち、Express Mode 等一部の
 *        コードパスが displayName を直接参照するため、key との乖離を検出する
 *   14)  followupProfiles が存在するのに scenarios[].followupRef が未設定（警告）
 *   15)  addon.requiredTags のタグをいずれの brandCatalog も持たない（到達可能性、警告）
 *   16)  *Structured text 連結と S/A/P 本文の不一致（警告）
 *   17)  expressModes[] の必須フィールド・参照整合チェック（P0-A SSOT）
 *   18)  scenarios[].mergePolicy.S.groupKey が composition.groupKeyRegistry に存在すること
 *        （groupKeyRegistry が未定義または空の場合はスキップ）
 *   19)  display.localInput.enabled === true の場合、display.localInput.applyScenarioIds[]
 *        の全要素が scenarios[].id に存在すること
 *        （display.localInput 未定義 / enabled !== true / applyScenarioIds 未定義の場合はスキップ）
 *   20)  drugResolution.brandToTags が存在する場合、その全キーが drug.brandCatalog に存在すること
 *        （drugResolution 未定義 / brandToTags 未定義 / drug.brandCatalog 未定義の場合はスキップ）
 *   21)  drug.aliasToBrand の全 value（brandKey）が drug.brandCatalog に存在すること
 *        （drug 未定義 / aliasToBrand 未定義 / brandCatalog 未定義の場合はスキップ）
 *   22)  scenarios[].followup[].addonId が addons.items に存在すること
 *        （followup 未定義 / addonId 未定義 / addons.items 未定義の場合はスキップ）
 *   23)  scenarios[].id がモジュール内で重複していないこと
 *        （scenarios 未定義 / id 未定義の場合はスキップ）
 *   24)  scenarios[].globalId がモジュール内で重複していないこと
 *        （scenarios 未定義 / globalId 未定義の場合はスキップ）
 *   25)  scenarios[].sideEffectPresence が有効 7 値のいずれかであること（ERROR）
 *        （sideEffectPresence 未定義の場合はスキップ）
 *   26)  scenarios[].sComposition.template が "symptom_based" / "status_based" であること（WARNING）
 *        （sComposition / template 未定義の場合はスキップ）
 *   27)  scenarios[].sComposition に禁止キーが存在しないこと（WARNING）
 *        （adjustmentCodes / adherenceCodes / outcomeCodes / severity）
 *   28)  scenarios[].sComposition.intent が禁止値でないこと（WARNING）
 *        （side_effect_absent / adherence_good / adherence_poor）
 *   29)  scenarios[].SStructured / AStructured の role が禁止語彙でないこと（WARNING）
 *   30)  scenarios[].SStructured / AStructured / PStructured の notes に
 *        "ROLE_MAPPING_UNCLEAR" を含む item が存在しないこと（WARNING）
 *   31)  scenarios[].PStructured の role が禁止語彙でないこと（WARNING）
 *   32)  scenarios[].scenarioRequiredTags の各タグがいずれかの brandCatalog[].handlingTags に
 *        存在すること。存在しない場合、template.reservedHandlingTags にそのタグが明示的に
 *        宣言されていれば WARNING（将来のブランド追加まで意図的に非表示にしている予約タグ）、
 *        宣言されていなければ ERROR（タグの typo によるシナリオのサイレントな非表示を防ぐ）。
 *        check 15（addon.requiredTags の到達可能性）にも同じ reservedHandlingTags 条件を適用する
 *        （brandCatalog 未定義の場合はスキップ）
 *   33)  template.reservedHandlingTags の各タグが、いずれかの scenarios[].scenarioRequiredTags /
 *        addons.items[].requiredTags で実際に使用されていること（WARNING）。
 *        誤記や設定漏れの免責ではなく「将来ブランド追加まで意図的に非表示」という宣言専用の
 *        フィールドであるため、一度も参照されない予約タグは余剰として報告する
 *   34)  template.reservedHandlingTags の各タグが、いずれかの brandCatalog[].handlingTags に
 *        既に存在していないこと（WARNING）。既にブランドが保持しているタグを予約タグとして
 *        宣言する必要はなく、宣言が古くなっている可能性を示す
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
  | 'FOLLOWUP_REF_MISSING'     // followupProfiles が存在するのに scenarios[].followupRef が未設定（警告）
  | 'TAG_NOT_IN_CATALOG'       // scenario/addon の各 *Tags 値が tagCatalog に存在しない（警告）
  | 'ADDON_SCOPE_VIOLATION'    // addon.text に医療判断・受診判断を示す禁止語が含まれる（警告）
  | 'FOLLOWUP_SCOPE_VIOLATION' // defaults.followup* のテキストに同禁止語が含まれる（警告）
  | 'SCENARIO_PRIORITY_INVALID'       // scenario.priority が不正（負値・number以外）（警告）
  | 'SCENARIO_EXCLUSIVE_GROUP_INVALID' // scenario.exclusiveGroup が string/null 以外（警告）
  | 'SCENARIO_COMBINABLE_INVALID'     // scenario.combinable が boolean/null 以外（警告）
  | 'BRAND_CATALOG_MISMATCH'          // drug.brandNames と drug.brandCatalog のキーが不一致
  | 'BRAND_DISPLAY_NAME_MISMATCH'     // brandCatalog[key].displayName が key と不一致（ERROR）
  | 'ADDON_REQUIRED_TAG_UNREACHABLE'  // addon.requiredTags のタグをいずれの brandCatalog も持たない（警告）
  | 'STRUCTURED_TEXT_MISMATCH'        // *Structured text 連結と S/A/P 本文の不一致（警告）
  | 'ORDERPRESETS_MISSING'            // addons.items 存在時に addons.orderPresets が欠落
  | 'ORDERPRESETS_TYPE_INVALID'       // addons.orderPresets が object 型以外（array / null / string）
  | 'NAME_ALIASES_MISMATCH'           // drug.nameAliases と drug.search.nameAliases が不一致
  | 'SEARCH_TOKEN_ALIAS_POLLUTION'    // drug.search.formulationSearchTokens が alias 系フィールドに混入（警告）
  | 'EXPRESS_MODE_MISSING_FIELD'      // expressModes[] の必須フィールド欠落
  | 'EXPRESS_MODE_REF_BROKEN'         // expressModes[] の defaultBrandName / genericBrandName / defaultScenarioId / scenarioCandidates 参照切れ
  | 'MERGE_POLICY_GROUPKEY_INVALID'   // scenarios[].mergePolicy.S.groupKey が composition.groupKeyRegistry に存在しない
  | 'LOCALINPUT_SCENARIOID_BROKEN'    // display.localInput.applyScenarioIds の参照先が scenarios[].id に存在しない
  | 'DRUGRESOLUTION_REF_BROKEN'       // drugResolution.brandToTags のキーが drug.brandCatalog に存在しない
  | 'ALIAS_TO_BRAND_VALUE_BROKEN'    // drug.aliasToBrand の value（brandKey）が drug.brandCatalog に存在しない
  | 'FOLLOWUP_ADDONID_BROKEN'       // scenarios[].followup[].addonId が addons.items に存在しない
  | 'SCENARIO_ID_DUPLICATE'         // scenarios[].id がモジュール内で重複している
  | 'SCENARIO_GLOBALID_DUPLICATE'   // scenarios[].globalId がモジュール内で重複している
  | 'SIDE_EFFECT_PRESENCE_INVALID'  // sideEffectPresence が有効 7 値以外（ERROR）
  | 'SCOMPOSITION_TEMPLATE_NONSTANDARD' // sComposition.template が symptom_based/status_based 以外（WARNING）
  | 'SCOMPOSITION_NONSTANDARD_KEY'  // sComposition に禁止キーが存在する（WARNING）
  | 'SCOMPOSITION_INTENT_FORBIDDEN' // sComposition.intent が禁止値（WARNING）
  | 'STRUCTURED_ROLE_FORBIDDEN'     // SStructured/AStructured/PStructured.role が禁止語彙（WARNING）
  | 'ROLE_MAPPING_NOTE_PRESENT'     // SStructured/AStructured/PStructured の notes に ROLE_MAPPING_UNCLEAR が残存（WARNING）
  | 'SCENARIO_REQUIRED_TAG_UNREACHABLE' // scenarios[].scenarioRequiredTags のタグをいずれの brandCatalog も持たない（reservedHandlingTags 宣言時は警告、未宣言時は ERROR）
  | 'DISPLAY_GENERIC_NAME_MISSING'    // brandCatalog[brand].displayGenericName が未設定（ERROR）
  | 'DISPLAY_GENERIC_NAME_EMPTY'      // brandCatalog[brand].displayGenericName が空文字（ERROR）
  | 'DISPLAY_GENERIC_NAME_SALT_COPY'  // genericName が塩類名を含み、displayGenericName と完全一致（旧コピーパターン）（ERROR）
  | 'RESERVED_TAG_UNUSED'             // template.reservedHandlingTags のタグが scenario/addon の requiredTags で一度も使用されていない（警告）
  | 'RESERVED_TAG_REACHABLE'          // template.reservedHandlingTags のタグが既にいずれかの brandCatalog[].handlingTags に存在する（警告）

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
// sideEffectPresence / sComposition / Structured.role 語彙定数
// ─────────────────────────────────────────────────────────────

const VALID_SIDE_EFFECT_PRESENCE = new Set([
  'not_applicable',
  'absent_or_not_observed',
  'present_mild',
  'present_moderate',
  'present_change',
  'present_dose_decrease',
  'present_stop',
])

const VALID_SCOMPOSITION_TEMPLATES = new Set(['symptom_based', 'status_based'])

const FORBIDDEN_SCOMPOSITION_KEYS = new Set([
  'adjustmentCodes',
  'adherenceCodes',
  'outcomeCodes',
  'severity',
])

const FORBIDDEN_SCOMPOSITION_INTENTS = new Set([
  'side_effect_absent',
  'adherence_good',
  'adherence_poor',
])

const FORBIDDEN_S_STRUCTURED_ROLES = new Set([
  'treatment_adjustment_reason',
  'adherence_observation',
  'side_effect_observation',
  'symptom_observation',
  'lifestyle_assessment',
])

const FORBIDDEN_A_STRUCTURED_ROLES = new Set(['drug_mechanism', 'lifestyle_assessment'])

const FORBIDDEN_P_STRUCTURED_ROLES = new Set([
  'treatment_start_reason',
  'followup_monitoring',
])

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
// expressModes バリデーション（P0-A SSOT）
// ─────────────────────────────────────────────────────────────

function validateExpressModes(
  entries: unknown[],
  brandCatalogKeys: Set<string>,
  scenarioIds: Set<string>,
): ModuleValidationError[] {
  const errs: ModuleValidationError[] = []
  const requiredFields = ['enabled', 'expressCategory', 'expressGroup', 'expressSubGroup', 'label'] as const

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as Record<string, unknown>
    const entryLabel = typeof entry.label === 'string' ? `["${entry.label}"]` : `[${i}]`

    // 必須5フィールドの確認
    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null) {
        errs.push({
          code: 'EXPRESS_MODE_MISSING_FIELD',
          detail: `expressModes${entryLabel} の必須フィールド "${field}" が存在しません`,
          isWarning: false,
        })
      }
    }

    // 有効エントリ（enabled !== false かつ disabled !== true）の参照整合
    if (entry.enabled !== false && entry.disabled !== true) {
      const defaultBrandName = entry.defaultBrandName
      if (defaultBrandName !== undefined) {
        if (typeof defaultBrandName !== 'string') {
          errs.push({
            code: 'EXPRESS_MODE_MISSING_FIELD',
            detail: `expressModes${entryLabel}.defaultBrandName は string 型である必要があります`,
            isWarning: false,
          })
        } else if (brandCatalogKeys.size > 0 && !brandCatalogKeys.has(defaultBrandName)) {
          errs.push({
            code: 'EXPRESS_MODE_REF_BROKEN',
            detail: `expressModes${entryLabel}.defaultBrandName = "${defaultBrandName}" が drug.brandCatalog に存在しません`,
            isWarning: false,
          })
        }
      }

      const genericBrandName = entry.genericBrandName
      if (genericBrandName !== undefined) {
        if (typeof genericBrandName !== 'string') {
          errs.push({
            code: 'EXPRESS_MODE_MISSING_FIELD',
            detail: `expressModes${entryLabel}.genericBrandName は string 型である必要があります`,
            isWarning: false,
          })
        } else if (brandCatalogKeys.size > 0 && !brandCatalogKeys.has(genericBrandName)) {
          errs.push({
            code: 'EXPRESS_MODE_REF_BROKEN',
            detail: `expressModes${entryLabel}.genericBrandName = "${genericBrandName}" が drug.brandCatalog に存在しません`,
            isWarning: false,
          })
        }
      }

      const defaultScenarioId = entry.defaultScenarioId
      if (defaultScenarioId !== undefined) {
        if (typeof defaultScenarioId !== 'string') {
          errs.push({
            code: 'EXPRESS_MODE_MISSING_FIELD',
            detail: `expressModes${entryLabel}.defaultScenarioId は string 型である必要があります`,
            isWarning: false,
          })
        } else if (!scenarioIds.has(defaultScenarioId)) {
          errs.push({
            code: 'EXPRESS_MODE_REF_BROKEN',
            detail: `expressModes${entryLabel}.defaultScenarioId = "${defaultScenarioId}" が scenarios[].id に存在しません`,
            isWarning: false,
          })
        }
      }
    }

    // scenarioCandidates の参照整合（disabled/enabled に関わらず確認）
    if (Array.isArray(entry.scenarioCandidates)) {
      for (const candidate of entry.scenarioCandidates as Array<Record<string, unknown>>) {
        const sid = candidate.scenarioId
        if (typeof sid !== 'string') {
          errs.push({
            code: 'EXPRESS_MODE_REF_BROKEN',
            detail: `expressModes${entryLabel}.scenarioCandidates の scenarioId は string 型である必要があります`,
            isWarning: false,
          })
        } else if (!scenarioIds.has(sid)) {
          errs.push({
            code: 'EXPRESS_MODE_REF_BROKEN',
            detail: `expressModes${entryLabel}.scenarioCandidates に参照切れ: scenarioId = "${sid}" が scenarios[].id に存在しません`,
            isWarning: false,
          })
        }
      }
    }
  }

  return errs
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
  const brandCatalog = drug?.brandCatalog as Record<string, Record<string, unknown>> | undefined
  if (!drugSearch?.primaryDisplayName) {
    errors.push({
      code: 'MISSING_PRIMARY_DISPLAY_NAME',
      detail: 'drug.search.primaryDisplayName が存在しません',
      isWarning: false,
    })
  }

  // 3-dgn) brandCatalog[brand].displayGenericName の必須化・旧コピーパターン検出
  //
  // displayGenericName は表示用一般名の SSOT（塩類名を含まない）。
  // genericName（正式名称・塩類名を含む）へは暗黙にも明示にもフォールバックしない設計のため、
  // ここで構造的に「存在しないデータを作れない」ことを保証する。
  //
  // SALT_TERMS は genericName に含まれうる塩類・結晶水由来の修飾語。
  // displayGenericName がこれと完全一致する場合は「genericName をそのままコピーした」
  // 旧アンチパターンとみなし、機械的な名称生成・修正は行わずエラーとして停止する
  // （値の決定は常に bridge の人間判断に委ねる）。
  const SALT_TERMS = [
    '塩酸塩', 'メシル酸塩', 'マレイン酸塩', 'リン酸塩', '硫酸塩',
    'クエン酸塩', '酒石酸塩', 'フマル酸塩', '臭化水素酸塩', 'コハク酸塩',
    '酢酸塩', '安息香酸塩', '水和物', 'カルシウム', 'ナトリウム', 'カリウム',
  ]
  if (brandCatalog) {
    for (const [brand, entry] of Object.entries(brandCatalog)) {
      const displayGenericName = entry.displayGenericName
      const genericName = entry.genericName
      if (displayGenericName === undefined) {
        errors.push({
          code: 'DISPLAY_GENERIC_NAME_MISSING',
          detail: `brandCatalog["${brand}"].displayGenericName が存在しません`,
          isWarning: false,
        })
      } else if (typeof displayGenericName === 'string' && displayGenericName.trim() === '') {
        errors.push({
          code: 'DISPLAY_GENERIC_NAME_EMPTY',
          detail: `brandCatalog["${brand}"].displayGenericName が空文字です`,
          isWarning: false,
        })
      } else if (
        typeof displayGenericName === 'string' &&
        typeof genericName === 'string' &&
        displayGenericName === genericName &&
        SALT_TERMS.some(term => genericName.includes(term))
      ) {
        errors.push({
          code: 'DISPLAY_GENERIC_NAME_SALT_COPY',
          detail: `brandCatalog["${brand}"]: genericName（"${genericName}"）が塩類名を含むにもかかわらず displayGenericName と完全一致しています（genericName のコピーとみなされます）`,
          isWarning: false,
        })
      }
    }
  }

  // 3a) drug.nameAliases と drug.search.nameAliases の完全一致チェック（P0-A SSOT）
  const drugNameAliases = drug?.nameAliases as string[] | undefined
  const searchNameAliases = drugSearch?.nameAliases as string[] | undefined

  if (drugNameAliases !== undefined || searchNameAliases !== undefined) {
    if (drugNameAliases === undefined) {
      errors.push({
        code: 'NAME_ALIASES_MISMATCH',
        detail: 'drug.search.nameAliases が存在しますが drug.nameAliases が存在しません（完全一致が必須）',
        isWarning: false,
      })
    } else if (searchNameAliases === undefined) {
      errors.push({
        code: 'NAME_ALIASES_MISMATCH',
        detail: 'drug.nameAliases が存在しますが drug.search.nameAliases が存在しません（完全一致が必須）',
        isWarning: false,
      })
    } else if (drugNameAliases.length !== searchNameAliases.length) {
      errors.push({
        code: 'NAME_ALIASES_MISMATCH',
        detail: `drug.nameAliases（${drugNameAliases.length}件）と drug.search.nameAliases（${searchNameAliases.length}件）のエントリ数が一致しません`,
        isWarning: false,
      })
    } else {
      const mismatchIdx = drugNameAliases.findIndex((a, i) => a !== searchNameAliases[i])
      if (mismatchIdx >= 0) {
        errors.push({
          code: 'NAME_ALIASES_MISMATCH',
          detail: `drug.nameAliases[${mismatchIdx}] = "${drugNameAliases[mismatchIdx]}" と drug.search.nameAliases[${mismatchIdx}] = "${searchNameAliases[mismatchIdx]}" が一致しません`,
          isWarning: false,
        })
      }
    }
  }

  // 3b) drug.search.formulationSearchTokens / commonSearchTokens が alias 系フィールドに混入していないか（警告）
  const tokenAliasTargets: Array<{ fieldName: string; values: string[] }> = [
    { fieldName: 'drug.search.exactAliases', values: (drugSearch?.exactAliases as string[] | undefined) ?? [] },
    { fieldName: 'drug.search.prefixAliases', values: (drugSearch?.prefixAliases as string[] | undefined) ?? [] },
    { fieldName: 'drug.search.nameAliases', values: searchNameAliases ?? [] },
  ]
  const formulationSearchTokens = drugSearch?.formulationSearchTokens as string[] | undefined
  if (formulationSearchTokens && formulationSearchTokens.length > 0) {
    for (const { fieldName, values } of tokenAliasTargets) {
      const polluted = formulationSearchTokens.filter(t => values.includes(t))
      if (polluted.length > 0) {
        errors.push({
          code: 'SEARCH_TOKEN_ALIAS_POLLUTION',
          detail: `drug.search.formulationSearchTokens のトークン [${polluted.map(t => `"${t}"`).join(', ')}] が ${fieldName} に混入しています`,
          isWarning: true,
        })
      }
    }
  }
  const commonSearchTokens = drugSearch?.commonSearchTokens as string[] | undefined
  if (commonSearchTokens && commonSearchTokens.length > 0) {
    for (const { fieldName, values } of tokenAliasTargets) {
      const polluted = commonSearchTokens.filter(t => values.includes(t))
      if (polluted.length > 0) {
        errors.push({
          code: 'SEARCH_TOKEN_ALIAS_POLLUTION',
          detail: `drug.search.commonSearchTokens のトークン [${polluted.map(t => `"${t}"`).join(', ')}] が ${fieldName} に混入しています`,
          isWarning: true,
        })
      }
    }
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

  // 7) addons.orderPresets の必須確認・型確認・参照切れ確認（P0-A SSOT）
  const orderPresets = addons?.orderPresets as Record<string, unknown> | undefined

  if (orderPresets != null && (typeof orderPresets !== 'object' || Array.isArray(orderPresets))) {
    errors.push({
      code: 'ORDERPRESETS_TYPE_INVALID',
      detail: `addons.orderPresets は object 型である必要があります（現在: ${Array.isArray(orderPresets) ? 'array' : typeof orderPresets}）`,
      isWarning: false,
    })
  }

  if (addonItems && orderPresets == null) {
    errors.push({
      code: 'ORDERPRESETS_MISSING',
      detail: 'addons.items が存在しますが addons.orderPresets が存在しません',
      isWarning: false,
    })
  }

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
  //     group='sickday' の addon はシックデイ緊急対応案内が設計目的のため対象外とする
  const ADDON_SCOPE_EXEMPT_GROUPS = new Set(['sickday'])

  if (addonItems) {
    for (const [mapKey, item] of Object.entries(addonItems)) {
      const group = (item as Record<string, unknown>).group
      if (typeof group === 'string' && ADDON_SCOPE_EXEMPT_GROUPS.has(group)) continue
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

  // 18) scenarios[].mergePolicy.S.groupKey が composition.groupKeyRegistry に存在すること
  //     groupKeyRegistry が未定義または空配列の場合はスキップ（後方互換）
  const groupKeyRegistry = (obj?.composition as Record<string, unknown> | undefined)
    ?.groupKeyRegistry as string[] | undefined
  if (Array.isArray(groupKeyRegistry) && groupKeyRegistry.length > 0 && Array.isArray(scenarios)) {
    const groupKeySet = new Set(groupKeyRegistry)
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String(sc.id ?? '(unknown)')
      const groupKey = (
        (sc.mergePolicy as Record<string, unknown> | undefined)
          ?.S as Record<string, unknown> | undefined
      )?.groupKey
      if (groupKey !== undefined && groupKey !== null) {
        if (typeof groupKey !== 'string' || !groupKeySet.has(groupKey)) {
          errors.push({
            code: 'MERGE_POLICY_GROUPKEY_INVALID',
            detail: `scenarios["${scId}"].mergePolicy.S.groupKey = "${groupKey}" が composition.groupKeyRegistry に存在しません（registry: [${groupKeyRegistry.join(', ')}]）`,
            isWarning: false,
          })
        }
      }
    }
  }

  // 19) display.localInput.applyScenarioIds の参照整合チェック
  //     display.localInput.enabled === true の場合のみ実行（後方互換）
  const localInput = (obj?.display as Record<string, unknown> | undefined)
    ?.localInput as Record<string, unknown> | undefined
  if (localInput?.enabled === true) {
    const applyScenarioIds = localInput.applyScenarioIds as string[] | undefined
    if (Array.isArray(applyScenarioIds) && applyScenarioIds.length > 0 && Array.isArray(scenarios)) {
      const scenarioIdSet = new Set(
        (scenarios as Record<string, unknown>[]).map(sc => String(sc.id ?? '')),
      )
      for (const refId of applyScenarioIds) {
        if (!scenarioIdSet.has(refId)) {
          errors.push({
            code: 'LOCALINPUT_SCENARIOID_BROKEN',
            detail: `display.localInput.applyScenarioIds に参照切れ: "${refId}" が scenarios[].id に存在しません`,
            isWarning: false,
          })
        }
      }
    }
  }

  // 20) drugResolution.brandToTags のキー参照整合チェック
  //     drug.brandCatalog が未定義の場合はスキップ（後方互換）
  const drugResolution = obj?.drugResolution as Record<string, unknown> | undefined
  const brandToTags = drugResolution?.brandToTags as Record<string, unknown> | undefined
  if (brandToTags && brandCatalog) {
    for (const brandKey of Object.keys(brandToTags)) {
      if (!(brandKey in brandCatalog)) {
        errors.push({
          code: 'DRUGRESOLUTION_REF_BROKEN',
          detail: `drugResolution.brandToTags["${brandKey}"] が drug.brandCatalog に存在しません`,
          isWarning: false,
        })
      }
    }
  }

  // 21) drug.aliasToBrand の value 参照整合チェック
  //     drug / aliasToBrand / brandCatalog が未定義の場合はスキップ（後方互換）
  const aliasToBrand = drug?.aliasToBrand as Record<string, unknown> | undefined
  if (aliasToBrand && brandCatalog) {
    for (const [alias, brandKey] of Object.entries(aliasToBrand)) {
      if (typeof brandKey === 'string' && !(brandKey in brandCatalog)) {
        errors.push({
          code: 'ALIAS_TO_BRAND_VALUE_BROKEN',
          detail: `drug.aliasToBrand["${alias}"] = "${brandKey}" が drug.brandCatalog に存在しません`,
          isWarning: false,
        })
      }
    }
  }

  // 22) scenarios[].followup[].addonId 参照整合チェック
  //     addonItems / followup / addonId が未定義の場合はスキップ（後方互換）
  if (Array.isArray(scenarios) && addonItems) {
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String((sc as Record<string, unknown>).id ?? '(unknown)')
      const followup = (sc as Record<string, unknown>).followup
      if (!Array.isArray(followup)) continue
      for (const fu of followup as Record<string, unknown>[]) {
        const addonId = fu.addonId
        if (typeof addonId === 'string' && !(addonId in addonItems)) {
          errors.push({
            code: 'FOLLOWUP_ADDONID_BROKEN',
            detail: `scenarios["${scId}"].followup[].addonId = "${addonId}" が addons.items に存在しません`,
            isWarning: false,
          })
        }
      }
    }
  }

  // 23/24) scenarios[].id / scenarios[].globalId のモジュール内一意性チェック
  //        scenarios 未定義 / 各フィールド未定義の場合はスキップ（後方互換）
  if (Array.isArray(scenarios)) {
    const idSeen = new Map<string, number>()
    const globalIdSeen = new Map<string, number>()
    for (const sc of scenarios as Record<string, unknown>[]) {
      const id = sc.id
      if (typeof id === 'string' && id !== '') {
        idSeen.set(id, (idSeen.get(id) ?? 0) + 1)
      }
      const globalId = sc.globalId
      if (typeof globalId === 'string' && globalId !== '') {
        globalIdSeen.set(globalId, (globalIdSeen.get(globalId) ?? 0) + 1)
      }
    }
    for (const [id, count] of idSeen.entries()) {
      if (count > 1) {
        errors.push({
          code: 'SCENARIO_ID_DUPLICATE',
          detail: `scenarios[].id = "${id}" がモジュール内で ${count} 件重複しています`,
          isWarning: false,
        })
      }
    }
    for (const [globalId, count] of globalIdSeen.entries()) {
      if (count > 1) {
        errors.push({
          code: 'SCENARIO_GLOBALID_DUPLICATE',
          detail: `scenarios[].globalId = "${globalId}" がモジュール内で ${count} 件重複しています`,
          isWarning: false,
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

  // 13b) brandCatalog[key].displayName が key と完全一致すること（ERROR）
  //      検索alias → canonical薬剤名 → SOAP主語 の解決経路（Drug Subject Resolution）は
  //      brandCatalog のキー自体を正本とする。displayName はこのキーの写像であるべきだが、
  //      Express Mode 等の一部コードパス（DashboardClient.tsx の resolvedSoapDisplayName 計算）は
  //      key ではなく displayName を直接参照するため、両者が乖離すると
  //      「検索・aliasToBrand は正しいのに表示名だけ古い名称に戻る」というサイレントな退行が起こる。
  //      通常の brandNames/brandCatalog キー集合一致チェック（check 13）では検出できない。
  if (brandCatalog) {
    for (const [key, entry] of Object.entries(brandCatalog)) {
      const displayName = (entry as Record<string, unknown>).displayName
      if (typeof displayName === 'string' && displayName !== key) {
        errors.push({
          code: 'BRAND_DISPLAY_NAME_MISMATCH',
          detail: `brandCatalog["${key}"].displayName = "${displayName}" は brandCatalog のキー自体（正本）と一致していません`,
          isWarning: false,
        })
      }
    }
  }

  // 14) followupProfiles が存在するのに scenarios[].followupRef が未設定（警告）
  if (followupProfiles && Array.isArray(scenarios)) {
    for (const sc of scenarios as Scenario[]) {
      if (!sc.followupRef) {
        errors.push({
          code: 'FOLLOWUP_REF_MISSING',
          detail: `scenarios["${sc.id}"].followupRef が未設定です（followupProfiles が存在します）`,
          isWarning: true,
        })
      }
    }
  }

  // 15) addon.requiredTags の到達可能性チェック
  //     requiredTags の各タグをいずれの brandCatalog エントリも持たない場合、
  //     template.reservedHandlingTags に宣言されていれば警告（意図的な予約タグ）、
  //     宣言されていなければ ERROR（typo・設定漏れによるサイレントな非表示事故を防ぐ）
  const reservedHandlingTags = new Set<string>(
    ((obj?.template as Record<string, unknown> | undefined)?.reservedHandlingTags as string[] | undefined) ?? [],
  )
  if (addonItems && brandCatalog) {
    const allBrandHandlingTags = new Set<string>(
      Object.values(brandCatalog)
        .flatMap(entry => (entry.handlingTags as string[] | undefined) ?? []),
    )
    for (const [mapKey, item] of Object.entries(addonItems)) {
      const required = (item as Record<string, unknown>).requiredTags as string[] | undefined
      if (!required || required.length === 0) continue
      for (const tag of required) {
        if (!allBrandHandlingTags.has(tag)) {
          const reserved = reservedHandlingTags.has(tag)
          errors.push({
            code: 'ADDON_REQUIRED_TAG_UNREACHABLE',
            detail: reserved
              ? `addons.items["${mapKey}"].requiredTags に "${tag}" が含まれますが、いずれの brandCatalog エントリも持っていません（template.reservedHandlingTags に宣言済みのため意図的な非表示として扱う）`
              : `addons.items["${mapKey}"].requiredTags に "${tag}" が含まれますが、いずれの brandCatalog エントリも持っていません`,
            isWarning: reserved,
          })
        }
      }
    }
  }

  // 16) *Structured text 連結と S/A/P 本文の不一致チェック（警告）
  //     連結時は \n 区切りで結合し、正規化後に比較する
  if (Array.isArray(scenarios)) {
    const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim()
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String(sc.id ?? '(unknown)')
      const pairs: Array<{ field: string; flat: unknown; structured: unknown[] }> = [
        { field: 'S', flat: sc.S, structured: (sc.SStructured as unknown[] | undefined) ?? [] },
        { field: 'A', flat: sc.A, structured: (sc.AStructured as unknown[] | undefined) ?? [] },
        { field: 'P', flat: sc.P, structured: (sc.PStructured as unknown[] | undefined) ?? [] },
      ]
      for (const { field, flat, structured } of pairs) {
        if (!Array.isArray(structured) || structured.length === 0) continue
        if (typeof flat !== 'string') continue
        const joined = (structured as Array<Record<string, unknown>>)
          .map(item => String(item.text ?? ''))
          .join('\n')
        if (normalize(joined) !== normalize(flat)) {
          errors.push({
            code: 'STRUCTURED_TEXT_MISMATCH',
            detail: `scenarios["${scId}"].${field}Structured text 連結が ${field} 本文と一致しません`,
            isWarning: true,
          })
        }
      }
    }
  }

  // 17) expressModes[] の必須フィールド・参照整合チェック（P0-A SSOT）
  const expressModesArr = obj?.expressModes
  if (Array.isArray(expressModesArr) && expressModesArr.length > 0) {
    const scenarioIdSet = new Set(
      Array.isArray(scenarios)
        ? (scenarios as Array<Record<string, unknown>>).map(sc => String(sc.id ?? ''))
        : [],
    )
    const brandCatalogKeySet = new Set(brandCatalog ? Object.keys(brandCatalog) : [])
    errors.push(...validateExpressModes(expressModesArr, brandCatalogKeySet, scenarioIdSet))
  }

  // 25) scenarios[].sideEffectPresence が有効 7 値であること（ERROR）
  //     sideEffectPresence が未定義の場合はスキップ（後方互換）
  if (Array.isArray(scenarios)) {
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String(sc.id ?? '(unknown)')
      const sep = sc.sideEffectPresence
      if (sep !== undefined && !VALID_SIDE_EFFECT_PRESENCE.has(sep as string)) {
        errors.push({
          code: 'SIDE_EFFECT_PRESENCE_INVALID',
          detail: `scenarios["${scId}"].sideEffectPresence = "${sep}" は有効値ではありません（有効値: ${[...VALID_SIDE_EFFECT_PRESENCE].join(' / ')}）`,
          isWarning: false,
        })
      }
    }
  }

  // 26–29) sComposition / Structured.role 語彙チェック（WARNING）
  if (Array.isArray(scenarios)) {
    for (const sc of scenarios as Record<string, unknown>[]) {
      const scId = String(sc.id ?? '(unknown)')
      const sComp = sc.sComposition as Record<string, unknown> | undefined

      // 26) sComposition.template 有効値チェック
      if (sComp?.template !== undefined && !VALID_SCOMPOSITION_TEMPLATES.has(sComp.template as string)) {
        errors.push({
          code: 'SCOMPOSITION_TEMPLATE_NONSTANDARD',
          detail: `scenarios["${scId}"].sComposition.template = "${sComp.template}" は有効値ではありません（有効値: status_based / symptom_based）`,
          isWarning: true,
        })
      }

      // 27) sComposition 禁止キー検出
      if (sComp) {
        for (const key of FORBIDDEN_SCOMPOSITION_KEYS) {
          if (key in sComp) {
            errors.push({
              code: 'SCOMPOSITION_NONSTANDARD_KEY',
              detail: `scenarios["${scId}"].sComposition に禁止キー "${key}" が存在します（symptomCodes / symptoms への置換が必要）`,
              isWarning: true,
            })
          }
        }
      }

      // 28) sComposition.intent 禁止値検出
      if (sComp?.intent !== undefined && FORBIDDEN_SCOMPOSITION_INTENTS.has(sComp.intent as string)) {
        errors.push({
          code: 'SCOMPOSITION_INTENT_FORBIDDEN',
          detail: `scenarios["${scId}"].sComposition.intent = "${sComp.intent}" は禁止値です（side_effect_check / adherence_check への置換が必要）`,
          isWarning: true,
        })
      }

      // 29) SStructured.role 禁止語彙検出
      for (const entry of (sc.SStructured as Array<Record<string, unknown>> | undefined) ?? []) {
        const role = entry.role
        if (typeof role === 'string' && FORBIDDEN_S_STRUCTURED_ROLES.has(role)) {
          errors.push({
            code: 'STRUCTURED_ROLE_FORBIDDEN',
            detail: `scenarios["${scId}"].SStructured に禁止 role "${role}" が存在します（dose_adjustment_reason / adherence_status / side_effect_status / side_effect_presence への置換が必要）`,
            isWarning: true,
          })
        }
      }

      // 29) AStructured.role 禁止語彙検出
      for (const entry of (sc.AStructured as Array<Record<string, unknown>> | undefined) ?? []) {
        const role = entry.role
        if (typeof role === 'string' && FORBIDDEN_A_STRUCTURED_ROLES.has(role)) {
          errors.push({
            code: 'STRUCTURED_ROLE_FORBIDDEN',
            detail: `scenarios["${scId}"].AStructured に禁止 role "${role}" が存在します（treatment_assessment への置換が必要）`,
            isWarning: true,
          })
        }
      }

      // 31) PStructured.role 禁止語彙検出
      for (const entry of (sc.PStructured as Array<Record<string, unknown>> | undefined) ?? []) {
        const role = entry.role
        if (typeof role === 'string' && FORBIDDEN_P_STRUCTURED_ROLES.has(role)) {
          const hint = role === 'treatment_start_reason'
            ? 'drug_effect_explanation への置換が必要'
            : 'followup_guidance への置換が必要'
          errors.push({
            code: 'STRUCTURED_ROLE_FORBIDDEN',
            detail: `scenarios["${scId}"].PStructured に禁止 role "${role}" が存在します（${hint}）`,
            isWarning: true,
          })
        }
      }

      // 30) ROLE_MAPPING_UNCLEAR note 残存検出
      const structuredFields = ['SStructured', 'AStructured', 'PStructured'] as const
      for (const field of structuredFields) {
        for (const entry of (sc[field] as Array<Record<string, unknown>> | undefined) ?? []) {
          const notes = entry.notes
          if (typeof notes === 'string' && notes.includes('ROLE_MAPPING_UNCLEAR')) {
            errors.push({
              code: 'ROLE_MAPPING_NOTE_PRESENT',
              detail: `scenarios["${scId}"].${field} に ROLE_MAPPING_UNCLEAR note が残存しています（role を確立済み語彙へ置換し notes を削除してください）`,
              isWarning: true,
            })
          }
        }
      }
    }
  }

  // 32) scenarios[].scenarioRequiredTags の到達可能性チェック
  //     addons.items[].requiredTags の到達可能性チェック（check 15）とは
  //     独立した別チェックだが、reservedHandlingTags による免責条件は共通。
  //     scenarioRequiredTags の各タグをいずれの brandCatalog エントリも持たない場合、
  //     template.reservedHandlingTags に宣言されていれば警告（意図的な予約タグ）、
  //     宣言されていなければ ERROR（タグの typo によりシナリオがどのブランドでも
  //     表示されなくなるサイレントな非表示事故を防ぐ）。
  const usedReservedTags = new Set<string>()
  if (Array.isArray(scenarios) && brandCatalog) {
    const allBrandHandlingTagsForScenario = new Set<string>(
      Object.values(brandCatalog)
        .flatMap(entry => (entry.handlingTags as string[] | undefined) ?? []),
    )
    for (const sc of scenarios as Array<Record<string, unknown>>) {
      const scId = String(sc.id ?? '(unknown)')
      const required = sc.scenarioRequiredTags as string[] | undefined
      if (!required || required.length === 0) continue
      for (const tag of required) {
        if (!allBrandHandlingTagsForScenario.has(tag)) {
          const reserved = reservedHandlingTags.has(tag)
          if (reserved) usedReservedTags.add(tag)
          errors.push({
            code: 'SCENARIO_REQUIRED_TAG_UNREACHABLE',
            detail: reserved
              ? `scenarios["${scId}"].scenarioRequiredTags に "${tag}" が含まれますが、いずれの brandCatalog エントリも持っていません（template.reservedHandlingTags に宣言済みのため意図的な非表示として扱う）`
              : `scenarios["${scId}"].scenarioRequiredTags に "${tag}" が含まれますが、いずれの brandCatalog エントリも持っていません`,
            isWarning: reserved,
          })
        }
      }
    }
  }

  // addon 側の reserved タグ使用も集計する（check 33 の「一度も使用されていない」判定に必要）
  if (addonItems) {
    for (const item of Object.values(addonItems)) {
      const required = (item as Record<string, unknown>).requiredTags as string[] | undefined
      for (const tag of required ?? []) {
        if (reservedHandlingTags.has(tag)) usedReservedTags.add(tag)
      }
    }
  }

  // 33) reservedHandlingTags の余剰チェック（警告）
  //     宣言されているが、どの scenario/addon の requiredTags にも使用されていない予約タグ
  for (const tag of reservedHandlingTags) {
    if (!usedReservedTags.has(tag)) {
      errors.push({
        code: 'RESERVED_TAG_UNUSED',
        detail: `template.reservedHandlingTags に "${tag}" が宣言されていますが、scenario/addon の requiredTags で一度も使用されていません`,
        isWarning: true,
      })
    }
  }

  // 34) reservedHandlingTags の陳腐化チェック（警告）
  //     宣言されているタグが既にいずれかの brandCatalog[].handlingTags に存在する
  //     （到達可能になっているのに予約タグとして残っている＝宣言が古い可能性）
  if (brandCatalog) {
    const allBrandHandlingTagsForReserved = new Set<string>(
      Object.values(brandCatalog)
        .flatMap(entry => (entry.handlingTags as string[] | undefined) ?? []),
    )
    for (const tag of reservedHandlingTags) {
      if (allBrandHandlingTagsForReserved.has(tag)) {
        errors.push({
          code: 'RESERVED_TAG_REACHABLE',
          detail: `template.reservedHandlingTags に "${tag}" が宣言されていますが、既にいずれかの brandCatalog エントリが保持しており到達可能です（予約宣言が不要になっている可能性）`,
          isWarning: true,
        })
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
