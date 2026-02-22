import type { Template, SoapFields, SoapKey, Patch } from './types'

// ─────────────────────────────────────────────────────────────
// 1つのパッチをSOAPフィールドに適用
// ─────────────────────────────────────────────────────────────

function applyPatch(current: string, patch: Patch): string {
  const text = patch.text.trim()
  switch (patch.op) {
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
// テンプレート＋アクティブなアドオンからSOAPを構築
// ─────────────────────────────────────────────────────────────

export function buildSoap(
  template: Template,
  activeAddonIds: Set<string>,
): SoapFields {
  // ベースSOAPをコピー
  const fields: SoapFields = {
    S: template.soap.S ?? '',
    O: template.soap.O ?? '',
    A: template.soap.A ?? '',
    P: template.soap.P ?? '',
  }

  // アクティブなアドオンをJSON定義順に適用（順序保証）
  for (const addon of template.addons) {
    if (!activeAddonIds.has(addon.addonId)) continue
    for (const patch of addon.patches) {
      // patch.target は型定義上 SoapKey なのでキャスト不要
      fields[patch.target] = applyPatch(fields[patch.target], patch)
    }
  }

  return fields
}

// ─────────────────────────────────────────────────────────────
// テンプレートタイプに対応する表示色クラス名を返す
// ─────────────────────────────────────────────────────────────

export type ChipColor = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray'

export function templateTypeToColor(type: string): ChipColor {
  switch (type) {
    case 'base':      return 'blue'
    case 'followup':  return 'green'
    case 'situation': return 'orange'
    default:          return 'gray'
  }
}

// ─────────────────────────────────────────────────────────────
// SOAPフィールド全体を改行区切りのテキストに結合（コピー用）
// ─────────────────────────────────────────────────────────────

export function formatSoapForCopy(fields: SoapFields): string {
  const keys: SoapKey[] = ['S', 'O', 'A', 'P']
  return keys
    .map(k => `【${k}】\n${fields[k]}`)
    .join('\n\n')
}
