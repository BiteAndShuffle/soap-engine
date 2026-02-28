// ─────────────────────────────────────────────────────────────
// 基本型
// ─────────────────────────────────────────────────────────────

export type SoapKey = 'S' | 'O' | 'A' | 'P'

export const SOAP_KEYS: SoapKey[] = ['S', 'O', 'A', 'P']

export type SoapFields = Record<SoapKey, string>

// ─────────────────────────────────────────────────────────────
// sideEffectPresence — グルーピングの唯一のソース（SSOT）
//
//   "absent_or_not_observed" → 副作用なし
//   "present"                → 副作用あり
//   "not_applicable"         → 副作用メニュー対象外（初回・増量・減量・CP・終了 等）
// ─────────────────────────────────────────────────────────────

export type SideEffectPresence =
  | 'absent_or_not_observed'
  | 'present'
  | 'not_applicable'

// ─────────────────────────────────────────────────────────────
// Scenario（新スキーマ: scenarios[] で定義）
//
// 旧 Template の後継。SOAP フィールドを直接持ち、
// sideEffectPresence でグルーピングを管理する。
// ─────────────────────────────────────────────────────────────

export interface Scenario {
  /** 一意識別子（旧 templateId に相当） */
  id: string
  /** 表示タイトル（Col2 表示の元）*/
  title: string
  /** シナリオ種別（治療一般 / 副作用 / アドヒアランス 等） */
  scenarioType: string
  /** シナリオグループ（検索・フィルタ用） */
  scenarioGroup: string
  /**
   * 副作用存在フラグ — グルーピングの SSOT。
   *   "absent_or_not_observed" → 副作用なし グループ
   *   "present"                → 副作用あり グループ
   *   "not_applicable"         → 副作用軸以外のグループ
   */
  sideEffectPresence: SideEffectPresence
  /** SOAP フィールド（直接持つ） */
  S: string
  O: string
  A: string
  P: string
}

// ─────────────────────────────────────────────────────────────
// Addon（新スキーマ: addons オブジェクト内のカテゴリ配列）
// ─────────────────────────────────────────────────────────────

export interface AddonItem {
  id: string
  text: string
}

export interface AddonsMap {
  counseling?: AddonItem[]
  sickday?: AddonItem[]
  oral?: AddonItem[]
  sideEffects?: AddonItem[]
  [key: string]: AddonItem[] | undefined
}

// ─────────────────────────────────────────────────────────────
// DrugSearch（drug.search ブロック）
// ─────────────────────────────────────────────────────────────

export interface DrugSearchMatchPolicy {
  preferExactAlias: boolean
  allowPrefixMatch: boolean
  suppressCrossModuleSuggestionsOnExactHit: boolean
}

export interface DrugSearch {
  primaryDisplayName: string
  priority: number
  exactAliases: string[]
  prefixAliases: string[]
  keywords: string[]
  matchPolicy: DrugSearchMatchPolicy
}

export interface Drug {
  genericName?: string
  brandNames?: string[]
  drugClass?: string[]
  route?: string
  dosageForms?: string[]
  drugSpecificTags?: string[]
  nameAliases?: string[]
  search?: DrugSearch
}

// ─────────────────────────────────────────────────────────────
// MergedBlock（保持＝合成機能）
// ─────────────────────────────────────────────────────────────

export interface MergedBlock {
  /** ユニークID */
  id: string
  /** 合成時のシナリオタイトル（区切りヘッダ表示用） */
  templateLabel: string
  /** 合成時の SOAP フィールド（スナップショット） */
  fields: SoapFields
}

// ─────────────────────────────────────────────────────────────
// ModuleData（新スキーマ JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface ModuleData {
  moduleId: string
  categoryPath?: string[]
  drug?: Drug
  display?: { title: string; subtitle: string }
  /** 新スキーマ: scenarios[] がメインデータ */
  scenarios: Scenario[]
  /** 新スキーマ: addons はカテゴリ別オブジェクト */
  addons: AddonsMap
}

// ─────────────────────────────────────────────────────────────
// 後方互換: 旧スキーマ用 Template / Addon 型
// （旧 JSON が残っている場合のフォールバック用。新規開発では使わない）
// ─────────────────────────────────────────────────────────────

export type PatchMode = 'append' | 'prepend' | 'replace'

export interface Patch {
  target: SoapKey
  mode: PatchMode
  value: string
}

export interface Addon {
  addonId: string
  label: string
  patches: Patch[]
}

export interface Template {
  templateId: string
  label: string
  type: string
  soap: Record<SoapKey, string>
  addonIds: string[]
}
