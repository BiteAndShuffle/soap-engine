import type { Template, Addon, SoapFields, SoapKey, Patch, MergedBlock } from './types'

// ─────────────────────────────────────────────────────────────
// 締め文（closing sentence）ホワイトリスト
// P欄の末尾に必ず来るべき定型句。
// アドオン合成後にこれらを末尾へ移動して「説明→補足→締め」の順を保証する。
// ─────────────────────────────────────────────────────────────

const CLOSING_SENTENCES: string[] = [
  '次回、治療経過の確認。',
  '次回、治療経過を確認。',
  '次回、治療経過の確認予定。',
  '次回、治療経過を確認予定。',
  '次回、経過確認。',
  '次回、経過を確認。',
]

/**
 * テキスト（P欄の内容）を受け取り、締め文を末尾に移動した結果を返す。
 * ロジック:
 *  1. 行単位に分解
 *  2. 締め文ホワイトリストに一致する行を closing として分離
 *  3. 重複を排除し 1 件に統合（複数あっても末尾に 1 回だけ）
 *  4. 残り行 + closing の順に再結合
 */
function reorderClosingSentence(text: string): string {
  if (!text) return text

  const lines = text.split('\n')
  const body: string[] = []
  const closing: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (CLOSING_SENTENCES.includes(trimmed)) {
      // 既に同じ締め文が closing に無ければ追加（重複排除）
      if (!closing.includes(trimmed)) closing.push(trimmed)
    } else {
      body.push(line)
    }
  }

  if (closing.length === 0) return text

  // body の末尾の空行を除去してから締め文を付ける
  const trimmedBody = body.join('\n').trimEnd()
  return trimmedBody
    ? `${trimmedBody}\n${closing[0]}`
    : closing[0]
}

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
//
// アドオン合成後に P 欄の締め文を末尾に移動する（reorderClosingSentence）。
// これにより「ベース説明 → アドオン補足 → 締め」の自然な順序が保たれる。
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

  // P欄の締め文を末尾に整列
  fields.P = reorderClosingSentence(fields.P)

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
    // 副作用なし（se_none）は緑で区別 — 副作用ありの赤とは別扱い
    case 'se_none':
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
