/**
 * bridgeAddonGrammar.ts
 *
 * bridge の SCENARIO 本文から、addon 参照（通常 `P_ADDON` / P 本文内部の `P_ADDON_INLINE`）を
 * 抽出する parser。scripts/audit-addon-bridge-chain.ts と tests から共通利用する
 * （audit script は import 時に監査を実行するため、parser を独立 module に置く）。
 *
 * 文法（prompts/vNext/PN1-Text-Extraction.md §1 / §3、docs/DESIGN_PRINCIPLES.md DP-22）:
 *
 *   P
 *   {P 本文}
 *   P_ADDON_INLINE          ← P セクション内に 0..n 個。marker 位置そのものが挿入位置の正本
 *   - addon_xxx             ← 直後の連続する `- addon_` 行を inline list として consume
 *   {P 本文の続き}          ← 最初の non-addon 行から P 本文へ戻る
 *   P_ADDON                 ← 通常（tail）addon。従来どおり
 *   - addon_yyy
 *   P_CLOSING
 *
 * afterLine は inline block を除外した original P 行列上の位置（直前の行数）。
 * P 行列は P セクション内の行（inline block を除く）で、末尾の空行（セクション区切り）は含めない。
 * P 本文中の空行は本文の一部として数える（global には禁止しない）。
 */

/** bridge 上の inline block 1 個（canonical scenarios[].addonInsertions[] と同形） */
export interface BridgeAddonInsertion {
  afterLine: number
  keys: string[]
}

export interface BridgeScenarioAddons {
  /** P_ADDON_INLINE / P_ADDON に現れた addon key の出現順（canonical addonsRef.P と比較する） */
  refs: string[]
  /** P_ADDON_INLINE block（上から順）。block がない scenario では空配列 */
  insertions: BridgeAddonInsertion[]
  /** 局所的な文法エラー（inline block の曖昧さ・位置・二重記載） */
  errors: string[]
}

const ADDON_LINE = /^- ?(addon_[a-zA-Z0-9_]+)/
const ADDON_LINE_EXACT = /^- ?addon_[a-zA-Z0-9_]+$/
const LABEL_LINE = /^[A-Z_]+$/

/** bridge から scenario id ごとの addon 参照（通常 / inline）を抽出する */
export function parseBridgeAddonRefs(bridgeText: string): Map<string, BridgeScenarioAddons> {
  const result = new Map<string, BridgeScenarioAddons>()

  let curId: string | null = null
  let cur: BridgeScenarioAddons | null = null
  let section: string | null = null
  // P セクション行（inline block 除外）。末尾空行の除去と afterLine 検証は finalize で行う
  let pLines: string[] = []
  let inInline = false
  let inlineKeys: string[] = []
  let inlineAfterLine = 0
  let tailKeys: string[] = []

  const closeInline = () => {
    if (!inInline || !cur) return
    if (inlineKeys.length === 0) cur.errors.push('P_ADDON_INLINE の直後に addon 行がありません')
    else cur.insertions.push({ afterLine: inlineAfterLine, keys: inlineKeys })
    inInline = false
    inlineKeys = []
  }

  const finalize = () => {
    if (!curId || !cur) return
    closeInline()
    // P 行数: 末尾の空行（セクション区切り）は本文に含めない
    let pCount = pLines.length
    while (pCount > 0 && pLines[pCount - 1].trim() === '') pCount--
    let prev = 0
    for (const ins of cur.insertions) {
      if (ins.afterLine < 1 || ins.afterLine >= pCount) {
        cur.errors.push(
          `P_ADDON_INLINE の位置 afterLine=${ins.afterLine} は 1 以上 P 行数（${pCount}）未満である必要があります（P 先頭 / 末尾は禁止）`,
        )
      } else if (ins.afterLine <= prev) {
        cur.errors.push(`P_ADDON_INLINE が連続しています（afterLine=${ins.afterLine}。block 間に P 本文が必要）`)
      }
      prev = Math.max(prev, ins.afterLine)
    }
    const inline = cur.insertions.flatMap(i => i.keys)
    const seen = new Set<string>()
    for (const k of inline) {
      if (seen.has(k)) cur.errors.push(`"${k}" が P_ADDON_INLINE 内 / 間で重複しています`)
      seen.add(k)
    }
    for (const k of tailKeys) {
      if (seen.has(k)) cur.errors.push(`"${k}" が P_ADDON_INLINE と P_ADDON の両方に記載されています`)
    }
    result.set(curId, cur)
  }

  for (const line of bridgeText.split('\n')) {
    const scenarioMatch = line.match(/【SCENARIO｜.*?id=([a-zA-Z0-9_]+)｜/)
    const addonMatch = line.match(/【ADDON｜.*?id=([a-zA-Z0-9_]+)｜/)
    if (scenarioMatch || addonMatch) {
      finalize()
      curId = scenarioMatch ? scenarioMatch[1] : null
      cur = scenarioMatch ? { refs: [], insertions: [], errors: [] } : null
      section = null
      pLines = []
      inInline = false
      inlineKeys = []
      tailKeys = []
      continue
    }
    if (!curId || !cur) continue

    const trimmed = line.trim()

    // inline list の consume（直後の連続する `- addon_` 行）
    if (inInline) {
      if (trimmed.startsWith('- addon_') || trimmed.startsWith('-addon_')) {
        if (!ADDON_LINE_EXACT.test(trimmed)) {
          cur.errors.push(`P_ADDON_INLINE の list 行が addon id のみではありません（P 本文との曖昧さ）: "${trimmed}"`)
          continue
        }
        const key = trimmed.match(ADDON_LINE)![1]
        inlineKeys.push(key)
        cur.refs.push(key)
        continue
      }
      closeInline()
      // 最初の non-addon 行から P 本文へ戻る（ラベル行なら下のラベル処理へ）
    }

    if (trimmed === 'P_ADDON_INLINE') {
      if (section !== 'P') {
        cur.errors.push(`P_ADDON_INLINE が P セクションの外にあります（section=${section ?? 'なし'}）`)
        continue
      }
      inInline = true
      inlineAfterLine = pLines.length
      continue
    }
    if (LABEL_LINE.test(trimmed)) {
      section = trimmed
      continue
    }
    if (section === 'P') {
      pLines.push(line)
    } else if (section === 'P_ADDON') {
      const m = trimmed.match(ADDON_LINE)
      if (m) {
        tailKeys.push(m[1])
        cur.refs.push(m[1])
      }
    }
  }
  finalize()
  return result
}
