// ─────────────────────────────────────────────────────────────
// 基本型
// ─────────────────────────────────────────────────────────────

export type SoapKey = 'S' | 'O' | 'A' | 'P'

export const SOAP_KEYS: SoapKey[] = ['S', 'O', 'A', 'P']

export type SoapFields = Record<SoapKey, string>

// ─────────────────────────────────────────────────────────────
// Patch（アドオンの差分操作）
// 新スキーマ: mode は 'append' 固定、値フィールドは value
// ─────────────────────────────────────────────────────────────

export type PatchMode = 'append' | 'prepend' | 'replace'

export interface Patch {
  target: SoapKey
  mode: PatchMode
  value: string
}

// ─────────────────────────────────────────────────────────────
// Addon（ルートの addons[] で定義）
// ─────────────────────────────────────────────────────────────

export interface Addon {
  addonId: string
  label: string
  patches: Patch[]
}

// ─────────────────────────────────────────────────────────────
// Template（templates[] で定義）
// addonIds で addons[] を参照する間接参照方式
// type は文字列リテラル — JSON の値をそのまま許容する
// ─────────────────────────────────────────────────────────────

export interface Template {
  templateId: string
  label: string
  type: string          // 'initial' | 'uptitrate' | 'sickday' … 拡張可能
  soap: Record<SoapKey, string>
  addonIds: string[]    // addons[].addonId への参照
}

// ─────────────────────────────────────────────────────────────
// DrugSearch（drug.search ブロック — v1.2 スキーマ）
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
// ModuleData（JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface DrugDisplay {
  class: string
  examples: string[]
}

// ─────────────────────────────────────────────────────────────
// MergedSoap（保持＝合成機能）
// ─────────────────────────────────────────────────────────────

export interface MergedBlock {
  /** ユニークID */
  id: string
  /** 合成時のテンプレートラベル（区切りヘッダ表示用） */
  templateLabel: string
  /** 合成時の SOAP フィールド（スナップショット） */
  fields: SoapFields
}

// ─────────────────────────────────────────────────────────────
// ModuleData（JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface ModuleData {
  moduleId: string
  categoryPath?: string[]
  drug?: Drug
  drugTags?: string[]
  drugSpecificTags?: string[]
  situationTags?: string[]
  riskTags?: string[]
  conditionalRiskTags?: string[]
  severityTags?: string[]
  emergencyFlag?: boolean
  drugDisplay?: DrugDisplay
  templates: Template[]
  addons: Addon[]         // テンプレートから addonId で参照されるアドオン一覧
}
