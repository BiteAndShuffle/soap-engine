// ─────────────────────────────────────────────────────────────
// SOAPパッチの操作定義
// ─────────────────────────────────────────────────────────────

export type SoapKey = 'S' | 'O' | 'A' | 'P'

export interface Patch {
  target: SoapKey
  mode: 'block'
  op: 'append' | 'prepend' | 'replace'
  text: string
}

// ─────────────────────────────────────────────────────────────
// アドオン
// ─────────────────────────────────────────────────────────────

export interface Addon {
  addonId: string
  label: string
  patches: Patch[]
}

// ─────────────────────────────────────────────────────────────
// テンプレート
// ─────────────────────────────────────────────────────────────

export type TemplateType = 'base' | 'followup' | 'situation'

export interface Template {
  templateId: string
  label: string
  type: TemplateType
  conditions: Record<string, unknown>
  soap: Record<SoapKey, string>
  addons: Addon[]
}

// ─────────────────────────────────────────────────────────────
// モジュール（JSONルート）
// ─────────────────────────────────────────────────────────────

export interface ModuleData {
  schemaVersion: string
  moduleId: string
  title: string
  categoryPath?: string[]
  tags?: {
    drugTags?: string[]
    drugSpecificTags?: string[]
    situationTags?: string[]
    riskTags?: string[]
    conditionalRiskTags?: string[]
  }
  search?: {
    keywords?: string[]
    synonyms?: string[]
  }
  templates: Template[]
}

// ─────────────────────────────────────────────────────────────
// UIの状態型
// ─────────────────────────────────────────────────────────────

export type SoapFields = Record<SoapKey, string>

export const SOAP_KEYS: SoapKey[] = ['S', 'O', 'A', 'P']
