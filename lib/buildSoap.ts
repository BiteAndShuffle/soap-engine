import type { Template, Addon, SoapFields, SoapKey, Patch, MergedBlock } from './types'

// ─────────────────────────────────────────────────────────────
// 1 つの Patch を SOAP フィールドに適用
// 新スキーマ: patch.value（旧 patch.text）を使う
// ─────────────────────────────────────────────────────────────

function applyPatch(current: string, patch: Patch): string {
  const text = patch.value.trim()
  switch (patch.mode) {
    case 'append':
      return current ? `${current}\n${text}` : text
    case 'prepend':
      return current ? `${text}\n${current}` : text
    case 'replace':
      return text
    default:
      return current
  }
}

// ─────────────────────────────────────────────────────────────
// テンプレート + アクティブなアドオンから SOAP フィールドを構築
//
// 新スキーマ: Template.addonIds → ModuleData.addons[] の参照方式。
// addonMap を引数で受け取ることで buildSoap 単体をピュアに保つ。
// ─────────────────────────────────────────────────────────────

export function buildSoap(
  template: Template,
  activeAddonIds: Set<string>,
  addonMap: Map<string, Addon>,
): SoapFields {
  const fields: SoapFields = {
    S: template.soap.S ?? '',
    O: template.soap.O ?? '',
    A: template.soap.A ?? '',
    P: template.soap.P ?? '',
  }

  // JSON 定義順（addonIds の並び順）でアドオンを適用し、出力の一貫性を保つ
  for (const addonId of template.addonIds) {
    if (!activeAddonIds.has(addonId)) continue
    const addon = addonMap.get(addonId)
    if (!addon) continue
    for (const patch of addon.patches) {
      fields[patch.target] = applyPatch(fields[patch.target], patch)
    }
  }

  return fields
}

// ─────────────────────────────────────────────────────────────
// addons 配列から高速参照用の Map を構築
// ─────────────────────────────────────────────────────────────

export function buildAddonMap(addons: Addon[]): Map<string, Addon> {
  return new Map(addons.map(a => [a.addonId, a]))
}

// ─────────────────────────────────────────────────────────────
// テンプレートタイプ → 色クラス名
// ─────────────────────────────────────────────────────────────

export type ChipColor = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray'

export function templateTypeToColor(type: string): ChipColor {
  switch (type) {
    case 'initial':
    case 'uptitrate':
      return 'blue'
    case 'cp_good':
    case 'down_improved':
      return 'green'
    case 'se_hypoglycemia':
    case 'se_gi':
    case 'se_appetite':
    case 'se_pancreatitis':
    case 'se_mild_continue':
    case 'se_strong_consult':
    case 'se_change':
    case 'se_reduce':
    case 'se_stop':
      return 'red'
    case 'sickday':
      return 'orange'
    case 'stop_improved':
    case 'stop_ineffective':
    case 'stop_noeffect':
      return 'purple'
    case 'cp_poor_forget':
    case 'cp_poor_selfadjust':
    case 'cp_poor_delay':
    case 'down_lowbenefit':
    case 'down_adjust_other':
    case 'lifestyle':
      return 'gray'
    default:
      return 'gray'
  }
}

// ─────────────────────────────────────────────────────────────
// SOAP フィールド全体をコピー用テキストに変換
// ─────────────────────────────────────────────────────────────

export function formatSoapForCopy(fields: SoapFields): string {
  const keys: SoapKey[] = ['S', 'O', 'A', 'P']
  return keys.map(k => `【${k}】\n${fields[k]}`).join('\n\n')
}

// ─────────────────────────────────────────────────────────────
// 複数薬のSOAPブロックを現在フィールドへ合成
// 区切り: "----\n▶ {薬剤名}" をセパレータとして追記
// ─────────────────────────────────────────────────────────────

const SEPARATOR = '----'

/**
 * 保持済みブロック群 + 現在フィールドを合成した新しいフィールドを返す。
 * 各ブロックは SEPARATOR + ラベルヘッダで区切られる。
 */
export function mergeBlocks(
  blocks: MergedBlock[],
  currentFields: SoapFields,
  currentLabel: string,
): SoapFields {
  const keys: SoapKey[] = ['S', 'O', 'A', 'P']
  const result: SoapFields = { S: '', O: '', A: '', P: '' }

  // 既存ブロック + 現在を順に連結
  const all = [
    ...blocks,
    { id: 'current', templateLabel: currentLabel, fields: currentFields },
  ]

  for (const key of keys) {
    const parts: string[] = []
    for (const block of all) {
      const text = block.fields[key].trim()
      if (!text) continue
      const header = `${SEPARATOR}\n▶ ${block.templateLabel}`
      parts.push(`${header}\n${text}`)
    }
    result[key] = parts.join('\n\n')
  }

  return result
}
