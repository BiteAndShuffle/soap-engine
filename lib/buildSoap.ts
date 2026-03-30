import type { Scenario, SoapFields, SoapKey, MergedBlock, AddonsData, ModuleData } from './types'

// ─────────────────────────────────────────────────────────────
// SOAP フィールド構築（新スキーマ: Scenario）
// ─────────────────────────────────────────────────────────────

/**
 * Scenario から SOAP フィールドを構築する（シンプル版）。
 * addonsRef / followup を考慮しない。
 * UI側でアドオンを手動トグルする場合はこちらを使う。
 */
export function buildSoapFromScenario(scenario: Scenario): SoapFields {
  return {
    S: scenario.S ?? '',
    O: scenario.O ?? '',
    A: scenario.A ?? '',
    P: scenario.P ?? '',
  }
}

/**
 * addons.items からキーに対応するテキストを解決する。
 * キーが存在しない場合は空文字を返す。
 */
function resolveAddonText(key: string, addonsData: AddonsData): string {
  return addonsData.items[key]?.text ?? ''
}

/**
 * ノード確定用: シナリオ + followup + addon を組み合わせて SoapFields を構築する。
 * rebuildNodeBlock / handleAddonToggle の両方から呼ぶ共通ロジック。
 *
 * @param scenario      対象シナリオ
 * @param mod           対象モジュール（followup / addon 解決に使用）
 * @param addonIds      このノードで選択された addon キー配列（確定時点のスナップショット）
 * @returns             fields（addon 込み完成済み） と closingText
 */
export function buildNodeFields(
  scenario: Scenario,
  mod: ModuleData,
  addonIds: string[],
): { fields: SoapFields; closingText: string | undefined } {
  // 1. シナリオ本文
  const result: SoapFields = {
    S: scenario.S ?? '',
    O: scenario.O ?? '',
    A: scenario.A ?? '',
    P: scenario.P ?? '',
  }

  // 2. followup（S / P のみ）
  for (const key of ['S', 'P'] as const) {
    let appendText: string | null | undefined
    const followupRef = scenario.followupRef
    if (followupRef) {
      const profile = mod.defaults?.followupProfiles?.[followupRef]
      if (profile) appendText = (profile as Record<string, string | null>)[key]
    } else {
      const followupVal = (scenario.followup as Record<string, string> | undefined)?.[key]
      if (followupVal === 'default') {
        appendText = (mod.defaults?.followup as Record<string, string> | undefined)?.[key]
      }
    }
    if (appendText) result[key] = result[key] ? `${result[key]}\n${appendText}` : appendText
  }

  // 3. addon テキストを targetSection に追記
  if (mod.addons && addonIds.length > 0) {
    // section ごとに addon テキストを集める
    const sectionMap = new Map<string, string[]>()
    for (const key of addonIds) {
      const item = mod.addons.items[key]
      if (!item) continue
      const sec = item.targetSection
      if (!sectionMap.has(sec)) sectionMap.set(sec, [])
      sectionMap.get(sec)!.push(item.text)
    }
    for (const [sec, texts] of sectionMap) {
      const k = sec as SoapKey
      result[k] = result[k] ? `${result[k]}\n${texts.join('\n')}` : texts.join('\n')
    }
  }

  // 4. closingText（P dedup 用）
  const closingText = (() => {
    const followupRef = scenario.followupRef
    if (followupRef) {
      const profile = mod.defaults?.followupProfiles?.[followupRef]
      return (profile as Record<string, string> | undefined)?.P ?? undefined
    }
    const followupVal = (scenario.followup as Record<string, string> | undefined)?.P
    if (followupVal === 'default') {
      return (mod.defaults?.followup as Record<string, string> | undefined)?.P ?? undefined
    }
    return undefined
  })()

  return { fields: result, closingText }
}

/**
 * Scenario + addonsRef + followup + emergencyFlag を考慮して
 * SOAP フィールドを完全構築する。
 *
 * 生成手順:
 * 1. S/O/A/P を scenario から取得
 * 2. addonsRef を targetSection に追記
 *    - scenario.addonsRef がない場合は orderPresets.initial_default を P に使用
 * 3. followup:
 *    - scenario.followup.P === "default" → defaults.followup.P を P末尾に追加
 *    - null / 省略時は何も追加しない
 * 4. emergencyFlag が true の場合:
 *    - emergencyCriteria を P末尾に別ブロックとして追加
 */
export function buildSoapFull(
  scenario: Scenario,
  moduleData: ModuleData,
): SoapFields {
  const fields: SoapFields = {
    S: scenario.S ?? '',
    O: scenario.O ?? '',
    A: scenario.A ?? '',
    P: scenario.P ?? '',
  }

  const addonsData = moduleData.addons
  const SOAP_KEYS_LOCAL: SoapKey[] = ['S', 'O', 'A', 'P']

  // 2. addonsRef を各セクションに追記（addons が存在する場合のみ）
  if (addonsData) {
    if (scenario.addonsRef) {
      for (const key of SOAP_KEYS_LOCAL) {
        const refs = scenario.addonsRef[key]
        if (!refs || refs.length === 0) continue
        const texts = refs
          .map(ref => resolveAddonText(ref, addonsData))
          .filter(Boolean)
        if (texts.length > 0) {
          fields[key] = fields[key]
            ? `${fields[key]}\n${texts.join('\n')}`
            : texts.join('\n')
        }
      }
    } else {
      // addonsRef がない場合は orderPresets.initial_default を P に使用
      const defaultRefs = addonsData.orderPresets['initial_default'] ?? []
      const texts = defaultRefs
        .map(ref => resolveAddonText(ref, addonsData))
        .filter(Boolean)
      if (texts.length > 0) {
        fields.P = fields.P
          ? `${fields.P}\n${texts.join('\n')}`
          : texts.join('\n')
      }
    }
  }

  // 3. followup（4段階フォールバック）
  //
  // 優先順位:
  //   1) scenario.followupRef → defaults.followupProfiles[followupRef][key]  (新スキーマ)
  //   2) scenario.followup?.[key] === 'default' → defaults.followup[key]     (旧スキーマ後方互換)
  //   3) 何も追加しない
  for (const key of ['S', 'P'] as const) {
    let appendText: string | null | undefined = undefined

    const followupRef = scenario.followupRef
    if (followupRef) {
      // 新スキーマ: followupRef → followupProfiles
      const profile = moduleData.defaults?.followupProfiles?.[followupRef]
      if (profile) {
        appendText = profile[key]
      }
    } else {
      // 旧スキーマ後方互換: followup + defaults.followup
      const followupVal = scenario.followup?.[key]
      if (followupVal === 'default') {
        appendText = moduleData.defaults?.followup?.[key]
      }
    }

    if (appendText) {
      fields[key] = fields[key]
        ? `${fields[key]}\n${appendText}`
        : appendText
    }
    // null / undefined / 省略時は何も追加しない
  }

  // 4. urgentFlag / emergencyFlag（新旧どちらも対応）
  const template = moduleData.template

  // 新スキーマ: urgentFlag + urgentCriteria、旧スキーマ: emergencyFlag + emergencyCriteria
  const isUrgent = template?.urgentFlag || template?.emergencyFlag
  const criteria = template?.urgentCriteria ?? template?.emergencyCriteria

  if (isUrgent && criteria) {
    const lines: string[] = []
    if (criteria.seekUrgentCareIf && criteria.seekUrgentCareIf.length > 0) {
      lines.push('【以下の場合は救急受診を検討してください】')
      criteria.seekUrgentCareIf.forEach(item => lines.push(`・${item}`))
    }
    if (criteria.contactPrescriberIf && criteria.contactPrescriberIf.length > 0) {
      lines.push('【以下の場合は処方医へご相談ください】')
      criteria.contactPrescriberIf.forEach(item => lines.push(`・${item}`))
    }
    if (lines.length > 0) {
      const block = lines.join('\n')
      fields.P = fields.P ? `${fields.P}\n\n${block}` : block
    }
  }

  return fields
}

// ─────────────────────────────────────────────────────────────
// テンプレートタイプ → 色クラス名
// sideEffectPresence ベースに変更
// ─────────────────────────────────────────────────────────────

export type ChipColor = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray'

/**
 * Scenario の sideEffectPresence と scenarioGroup からチップ色を決定する。
 *   副作用あり (present)              → red
 *   副作用なし (absent_or_not_observed) → green
 *   初回・増量 (start_or_change / dose_change/increase) → blue
 *   減量       (dose_change reduce系) → gray
 *   CP良好     (adherence_good)        → green
 *   CP不良     (adherence_poor)        → orange
 *   終了       (end_*)                 → purple
 *   その他                             → gray
 */
export function scenarioToColor(scenario: Scenario): ChipColor {
  if (
    scenario.sideEffectPresence === 'present_mild' ||
    scenario.sideEffectPresence === 'present_moderate' ||
    scenario.sideEffectPresence === 'present_dose_decrease' ||
    scenario.sideEffectPresence === 'present_change' ||
    scenario.sideEffectPresence === 'present_stop'
  ) return 'red'
  if (scenario.sideEffectPresence === 'absent_or_not_observed') return 'green'

  const sg = scenario.scenarioGroup
  if (sg === 'start_or_change') return 'blue'
  if (sg === 'dose_change' && scenario.id.startsWith('dose_increase')) return 'blue'
  if (sg === 'dose_change') return 'gray'
  if (sg === 'adherence_good') return 'green'
  if (sg === 'adherence_poor') return 'orange'
  if (sg.startsWith('end_')) return 'purple'
  if (sg === 'sickday') return 'orange'

  return 'gray'
}

/**
 * 後方互換: 旧 type 文字列からチップ色を返す。
 * 新スキーマでは scenarioToColor() を使うこと。
 */
export function templateTypeToColor(type: string): ChipColor {
  switch (type) {
    case 'initial':
    case 'uptitrate':
      return 'blue'
    case 'cp_good':
    case 'down_improved':
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
// 複数薬の SOAP ブロックを合成
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// mergeBlocks 内部ユーティリティ
// ─────────────────────────────────────────────────────────────

/**
 * 空行を除去して行を詰める（O / A / P 用）。
 * 各行のトリミングと空行フィルタのみ行い、改行コードで再結合する。
 */
function normalizeLines(text: string): string {
  return text
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l !== '')
    .join('\n')
}

/**
 * 締め文の重複行を排除する。
 *
 * 「次回」で始まる行のみを "closing 行" とみなす。
 * 本文中に「確認」が含まれる行を誤判定しないよう、先頭マッチに限定する。
 * 同一文字列の closing 行が複数あれば最後の1件だけ残す。
 * 異なる締め文（例: 「次回、副作用の有無を確認。」と「次回、治療経過を確認。」）は
 * 別扱いでそれぞれ残す。
 */
function dedupeClosingLines(text: string): string {
  const lines = text.split('\n')
  // 末尾から走査して「すでに見た closing 行」を除去する
  const seen = new Set<string>()
  const reversed: string[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    // 「次回」で始まる行のみを締め文とみなす（本文中の「確認」は対象外）
    const isClosing = line.trimStart().startsWith('次回')
    if (isClosing) {
      if (seen.has(line)) continue   // 重複: スキップ
      seen.add(line)
    }
    reversed.push(line)
  }
  return reversed.reverse().join('\n')
}

// ─────────────────────────────────────────────────────────────
// S欄文型別まとめユーティリティ
// ─────────────────────────────────────────────────────────────

/**
 * S欄の各行を文型で分類する。
 *
 * reason      — 薬追加・導入理由文 (「〜ため薬が追加となった。」)
 * observation — 症状観察文 (「使用して、症状は落ち着いている。〜」)
 * decision    — 薬剤判断文 (増量・減量・中止・変更)
 * other       — その他
 */
type SLineType = 'reason' | 'observation' | 'decision' | 'other'

function classifySLine(text: string): SLineType {
  if (/(?:増量|中止|変更)(?:となった|になった|ました|となり)/.test(text)) return 'decision'
  if (/(?:減量|希望)(?:となった|になった|なりました|された)/.test(text)) return 'decision'
  if (/(?:追加|導入)となった/.test(text)) return 'reason'
  if (/^使用して、症状は落ち着いている。/.test(text)) return 'observation'
  return 'other'
}

/** observation 文から「使用して、症状は落ち着いている。」プレフィックスを除いた本体を返す */
function observationBody(text: string): string {
  return text.replace(/^使用して、症状は落ち着いている。/, '')
}

/**
 * S欄行リストを文型分類に基づいて整形する。
 *
 * 整形ルール:
 *   1. reason + observation →「reason文 + observationの本体」を1行に結合
 *      observation が複数ある場合は全 body を連結（重複 body は除外）
 *   2. observation のみ複数 →「使用して、症状は落ち着いている。body1body2...」に統合
 *      全て同一 body の場合は1行に縮約
 *   3. decision / other はそのまま末尾に保持（suffix merge は後段で処理）
 *
 * 出力: 整形済み行の配列
 */
function reformatSLines(lines: string[]): string[] {
  if (lines.length === 0) return []

  const classified = lines.map(text => ({ text, type: classifySLine(text) }))
  const reasons      = classified.filter(c => c.type === 'reason')
  const observations = classified.filter(c => c.type === 'observation')
  const rest         = classified.filter(c => c.type !== 'reason' && c.type !== 'observation')

  const result: string[] = []

  if (reasons.length > 0 && observations.length > 0) {
    // reason + observation を結合（observation body は重複を除去）
    const seenBodies = new Set<string>()
    const dedupedBodies = observations
      .map(o => observationBody(o.text))
      .filter(b => { if (seenBodies.has(b)) return false; seenBodies.add(b); return true })
    result.push(reasons[0].text + dedupedBodies.join(''))
    for (let i = 1; i < reasons.length; i++) result.push(reasons[i].text)
  } else if (reasons.length > 0) {
    for (const r of reasons) result.push(r.text)
  } else if (observations.length === 1) {
    result.push(observations[0].text)
  } else if (observations.length > 1) {
    // observation のみ複数: body を重複除去して統合
    const seenBodies = new Set<string>()
    const dedupedBodies = observations
      .map(o => observationBody(o.text))
      .filter(b => { if (seenBodies.has(b)) return false; seenBodies.add(b); return true })
    if (dedupedBodies.length === 1) {
      // 全て同一 → 1行に縮約
      result.push(observations[0].text)
    } else {
      result.push('使用して、症状は落ち着いている。' + dedupedBodies.join(''))
    }
  }

  for (const o of rest) result.push(o.text)
  return result
}

/**
 * S欄の各ブロックテキストを文型（suffix）ベースでまとめる。
 *
 * 処理の流れ:
 *   1. reformatSLines: 文型分類 → reason/observation の結合
 *   2. groupSentencesS（suffix merge）: decision/other 系の同一文型エントリを統合
 *
 * suffix merge ルール:
 *   - domain 一致は不要。文型（助詞以降の suffix）の一致のみを判定する。
 *   - 同一 suffix を持つ単一行エントリを「先頭語・先頭語 + suffix」にまとめる。
 *   - 複数行テキストは個別維持。suffix が取れないテキストも個別維持。
 *   - まとめる対象が1件のみの suffix グループは個別維持。
 *
 * 例（suffix merge）:
 *   「GLP-1受容体作動薬(内服)は、効果が実感できないので増量となった。」
 *   「GLP-1受容体作動薬(注射)は、効果が実感できないので増量となった。」
 *   → 「GLP-1受容体作動薬(内服)・GLP-1受容体作動薬(注射)は、効果が実感できないので増量となった。」
 */
function groupSentencesS(
  entries: Array<{ domain: string | undefined; text: string }>,
): string {
  if (entries.length === 0) return ''
  if (entries.length === 1) return entries[0].text

  // ── ステップ1: 文型整形 ──────────────────────────────────
  const inputLines = entries.map(e => e.text).filter(Boolean)
  const reformatted = reformatSLines(inputLines)
  if (reformatted.length === 0) return ''
  if (reformatted.length === 1) return reformatted[0]

  // ── ステップ2: suffix merge ──────────────────────────────
  type Entry = { text: string; suffix: string | null; isSingleLine: boolean }
  const annotated: Entry[] = reformatted.map(text => {
    const isSingleLine = !text.includes('\n')
    if (!isSingleLine) return { text, suffix: null, isSingleLine: false }
    const m = text.match(/^(.+?)([がではをにもと].+)$/)
    return { text, suffix: m ? m[2] : null, isSingleLine: true }
  })

  const suffixMap = new Map<string, Entry[]>()
  for (const entry of annotated) {
    const key = (entry.isSingleLine && entry.suffix !== null) ? entry.suffix : '__individual__'
    if (!suffixMap.has(key)) suffixMap.set(key, [])
    suffixMap.get(key)!.push(entry)
  }

  const seen = new Set<string>()
  const orderedKeys: string[] = []
  for (const entry of annotated) {
    const key = (entry.isSingleLine && entry.suffix !== null) ? entry.suffix : '__individual__'
    if (!seen.has(key)) { seen.add(key); orderedKeys.push(key) }
  }

  const resultLines: string[] = []
  for (const key of orderedKeys) {
    const group = suffixMap.get(key)!
    if (key === '__individual__' || group.length === 1) {
      resultLines.push(...group.map(e => e.text))
      continue
    }
    // 同一 suffix を持つ複数エントリ → prefix を unique 化して「・」結合
    // （同一主語が2回渡された場合でも重複しない）
    const suffix = key
    const prefixSeen = new Set<string>()
    const uniquePrefixes: string[] = []
    for (const e of group) {
      const p = e.text.replace(suffix, '')
      if (!prefixSeen.has(p)) { prefixSeen.add(p); uniquePrefixes.push(p) }
    }
    resultLines.push(uniquePrefixes.join('・') + suffix)
  }

  return resultLines.join('\n')
}

/**
 * mergeBlocks — 複数薬の SOAP ブロックを合成する。
 *
 * S / O / A: 本文をそのまま改行区切りで結合（ラベル行なし）。
 *   S 欄のみ、同一 domain かつ同一文型のブロックを自然文にまとめる（groupSentencesS）。
 *
 * P フィールドの body dedupe + closing deduplication:
 *   各ブロックの P テキストから closingText を末尾で除去してボディを取得する。
 *   ボディを正規化（行末トリム + 空行除去）し、完全一致で dedupe してから結合する。
 *   同一内容のブロック（内服/注射で末尾改行違いなど）は1回のみ出力する。
 *   unique closing テキストを収集し、末尾に追記する。
 *
 * 後処理（全フィールド共通）:
 *   - 空行を除去して行を詰める（normalizeLines）
 *   - 締め文の重複行を排除する（dedupeClosingLines）
 *
 * currentClosingText: 現在選択中シナリオの closing テキスト（省略可）
 */
export function mergeBlocks(
  blocks: MergedBlock[],
  currentFields: SoapFields,
  currentLabel: string,
  currentClosingText?: string,
  currentDomain?: string,
): SoapFields {
  const keys: SoapKey[] = ['S', 'O', 'A', 'P']
  const result: SoapFields = { S: '', O: '', A: '', P: '' }

  // currentFields（1剤目ベース）を先頭、blocks（2剤目以降）をその後に並べる
  // → 操作順（先に確定した薬剤が上）でSOAPが出力される
  const all: Array<MergedBlock & { isCurrent?: boolean }> = [
    {
      id: 'current',
      templateLabel: currentLabel,
      fields: currentFields,
      closingText: currentClosingText,
      domain: currentDomain,
    },
    ...blocks,
  ]

  for (const key of keys) {
    if (key === 'S') {
      // S: ドメイン別まとめ（同一文型のときのみ統合）
      const entries = all
        .map(block => ({ domain: block.domain, text: block.fields.S.trim() }))
        .filter(e => e.text)
      result.S = groupSentencesS(entries)
    } else if (key !== 'P') {
      // O / A: 本文のみ結合（ラベル行なし）
      const parts: string[] = []
      for (const block of all) {
        const text = block.fields[key].trim()
        if (!text) continue
        parts.push(text)
      }
      result[key] = parts.join('\n')
    } else {
      // P: body dedupe + closing deduplication
      //
      // 処理手順:
      //   1. 各ブロックの P から closingText を末尾で除去してボディを取得
      //   2. ボディを正規化（行末トリム + 空行除去）して完全一致 dedupe
      //   3. unique closing を収集して末尾に追記
      //
      // 「正規化後一致」で dedupe するため、内服/注射で末尾改行の違いなどがあっても
      // 実質同一のブロックを重複出力しない。
      const seenBodies   = new Set<string>()
      const seenClosings = new Set<string>()
      const orderedBodies:   string[] = []
      const orderedClosings: string[] = []

      for (const block of all) {
        const rawText = block.fields.P.trim()
        if (!rawText) continue

        const closing = block.closingText?.trim() ?? ''
        let body = rawText

        // closing が設定されており P の末尾に一致する場合に除去
        if (closing && body.endsWith(closing)) {
          body = body.slice(0, body.length - closing.length).trimEnd()
        }

        // body を正規化（行末空白除去 + 空行除去）して dedupe キーに使用
        const normalizedBody = body
          .split('\n')
          .map(l => l.trimEnd())
          .filter(l => l.length > 0)
          .join('\n')

        if (normalizedBody && !seenBodies.has(normalizedBody)) {
          seenBodies.add(normalizedBody)
          orderedBodies.push(normalizedBody)
        }

        // unique closing を順序付きで収集
        if (closing && !seenClosings.has(closing)) {
          seenClosings.add(closing)
          orderedClosings.push(closing)
        }
      }

      let merged = orderedBodies.join('\n')
      if (orderedClosings.length > 0) {
        const closingBlock = orderedClosings.join('\n')
        merged = merged ? `${merged}\n${closingBlock}` : closingBlock
      }
      result.P = merged
    }
  }

  // 後処理: 全フィールドを正規化（空行除去 + 締め文重複排除）
  for (const key of keys) {
    result[key] = dedupeClosingLines(normalizeLines(result[key]))
  }

  return result
}
