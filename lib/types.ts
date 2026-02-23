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
// ModuleData（JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface DrugDisplay {
  class: string
  examples: string[]
}

// ─────────────────────────────────────────────────────────────
// PinnedSoap（保持機能）
// ─────────────────────────────────────────────────────────────

export interface PinnedSoap {
  /** ユニークID（Date.now() + Math.random() で生成） */
  id: string
  /** 保持時のテンプレートラベル（表示用） */
  templateLabel: string
  /** スナップショット時点の SOAP フィールド */
  fields: SoapFields
}

// ─────────────────────────────────────────────────────────────
// ModuleData（JSON ルート）
// ─────────────────────────────────────────────────────────────

export interface ModuleData {
  moduleId: string
  categoryPath?: string[]
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
