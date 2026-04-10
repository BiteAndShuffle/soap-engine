import type { Scenario, SoapFields, SoapKey, MergedBlock, AddonsData, ModuleData } from './types'
import { resolveDrugSubject } from './drugSubject'

// ─────────────────────────────────────────────────────────────
// buildS 用エントリ型（S 欄の合成メタデータ付きテキスト）
// ─────────────────────────────────────────────────────────────

interface SEntry {
  text: string
  /** scenario.mergePolicy.S.groupKey スナップショット */
  groupKey?: string
  /** composition.clinicalDomain スナップショット */
  clinicalDomain?: string
}

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
 * @param drugName      {{drug_subject}} スロットに代入するブランド名または一般名。
 *                      空文字の場合はスロットをそのまま残す。
 * @returns             fields（addon 込み・{{drug_subject}} 解決済み）、closingText、groupKey、
 *                      clinicalDomain、closingBehavior（現行 JSON では常に "dedupe_or_last" または undefined）
 */
export function buildNodeFields(
  scenario: Scenario,
  mod: ModuleData,
  addonIds: string[],
  drugName = '',
): {
  fields: SoapFields
  closingText: string | undefined
  groupKey: string | undefined
  clinicalDomain: string | undefined
  closingBehavior: 'dedupe_or_last' | 'append_all' | undefined
} {
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

  // 5. mergePolicy メタデータをスナップショットとして取得
  const groupKey = scenario.mergePolicy?.S?.groupKey
  const clinicalDomain = mod.composition?.clinicalDomain
  const closingBehavior = scenario.mergePolicy?.P?.closingBehavior

  // 6. {{drug_subject}} スロットを解決（S / A / P のみ。O は変更しない）
  const resolvedFields = resolveDrugSubject(result, drugName)

  return { fields: resolvedFields, closingText, groupKey, clinicalDomain, closingBehavior }
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
// S欄 構造ベース合成
// ─────────────────────────────────────────────────────────────

const OBS_PREFIX = '使用して、症状は落ち着いている。'

type SLineType = 'reason' | 'observation' | 'decision' | 'other'

function classifySLine(text: string): SLineType {
  if (/(?:増量|中止|変更)(?:となった|になった|ました|となり)/.test(text)) return 'decision'
  if (/(?:減量|希望)(?:となった|になった|なりました|された)/.test(text)) return 'decision'
  if (/(?:追加|導入)となった/.test(text)) return 'reason'
  if (text.startsWith(OBS_PREFIX)) return 'observation'
  return 'other'
}

/** subject の最大文字数（これを超える場合は先頭で打ち切る） */
const SUBJECT_MAX_LEN = 30

function splitDecision(text: string): { subject: string; predicate: string } {
  // 「は、」「は,」形式で最初に一致する位置を探す
  const m = text.match(/^(.+?)(は[、,].+)$/)
  if (m) {
    const subj = m[1].length <= SUBJECT_MAX_LEN ? m[1] : m[1].slice(0, SUBJECT_MAX_LEN)
    return { subject: subj, predicate: text.slice(subj.length) }
  }
  // 「が〜」形式
  const m2 = text.match(/^(.+?)(が.+)$/)
  if (m2) {
    const subj = m2[1].length <= SUBJECT_MAX_LEN ? m2[1] : m2[1].slice(0, SUBJECT_MAX_LEN)
    return { subject: subj, predicate: text.slice(subj.length) }
  }
  return { subject: text, predicate: '' }
}

/**
 * 複数ブロックの S テキストを構造ベースで合成する。
 *
 * 処理:
 *   1. 各テキストを SLineType に分類（reason / observation / decision / other）
 *   2. バケット単位で dedupe
 *   3. 固定順で再生成
 *      reason + obs → reason[0] + obs bodies を1行に結合
 *      decision → predicate ごとに subject を「・」結合
 *
 * groupKey ルール:
 *   - reason 結合は「同一 groupKey かつ同一 clinicalDomain」のエントリ間のみ許可
 *   - groupKey が異なる reason は other として個別出力する
 *   - clinicalDomain による分離は mergeBlocks 側で行う（buildS に渡る時点で同一ドメイン保証済み）
 */
function buildS(sEntries: SEntry[]): string {
  if (sEntries.length === 0) return ''

  const reasons: string[] = []
  const reasonGroupKeys: string[] = []   // reasons[i] に対応する groupKey
  const observations: string[] = []
  const decisions: string[] = []
  const others: string[] = []

  for (const entry of sEntries) {
    const t = entry.text.trim()
    if (!t) continue
    const type = classifySLine(t)
    if      (type === 'reason')      { reasons.push(t); reasonGroupKeys.push(entry.groupKey ?? '') }
    else if (type === 'observation') observations.push(t)
    else if (type === 'decision')    decisions.push(t)
    else                             others.push(t)
  }

  // ① reason: groupKey 単位で分類してから dedupe
  // 先頭 reason の groupKey を「基準キー」とし、一致するものだけ結合対象とする。
  // 異なる groupKey の reason は others 末尾に追加して個別出力（結合禁止）。
  const baseGroupKey = reasonGroupKeys[0] ?? ''
  const reasonsForMerge: string[] = []
  const reasonsOtherGroupKey: string[] = []
  for (let i = 0; i < reasons.length; i++) {
    if (reasonGroupKeys[i] === baseGroupKey) {
      reasonsForMerge.push(reasons[i])
    } else {
      reasonsOtherGroupKey.push(reasons[i])
    }
  }
  const uniqueReasons = [...new Set(reasonsForMerge)]
  // 異なる groupKey の reason を others に追加（重複のみ排除）
  for (const r of new Set(reasonsOtherGroupKey)) others.push(r)

  // ② observation: prefix を除いた body を unique 化
  const obsBodySeen = new Set<string>()
  const uniqueObsBodies: string[] = []
  for (const obs of observations) {
    const body = obs.startsWith(OBS_PREFIX) ? obs.slice(OBS_PREFIX.length) : obs
    if (!obsBodySeen.has(body)) { obsBodySeen.add(body); uniqueObsBodies.push(body) }
  }

  // ③ decision: predicate ごとにグループ化し subject を unique 結合
  const decisionByPredicate = new Map<string, Set<string>>()
  const predicateOrder: string[] = []
  for (const dec of decisions) {
    const { subject, predicate } = splitDecision(dec)
    if (!decisionByPredicate.has(predicate)) {
      decisionByPredicate.set(predicate, new Set())
      predicateOrder.push(predicate)
    }
    decisionByPredicate.get(predicate)!.add(subject)
  }
  const uniqueDecisions: string[] = []
  for (const predicate of predicateOrder) {
    const subjects = [...decisionByPredicate.get(predicate)!]
    uniqueDecisions.push(subjects.join('・') + predicate)
  }

  // ④ other: 完全 dedupe（入力順保持）
  const uniqueOthersSeen = new Set<string>()
  const uniqueOthers: string[] = []
  for (const o of others) {
    if (!uniqueOthersSeen.has(o)) { uniqueOthersSeen.add(o); uniqueOthers.push(o) }
  }

  // ⑤ 生成（reason + obs → 1行結合）
  const result: string[] = []
  if (uniqueReasons.length > 0) {
    if (uniqueObsBodies.length > 0) {
      result.push(uniqueReasons[0] + uniqueObsBodies.join(''))
      for (let i = 1; i < uniqueReasons.length; i++) result.push(uniqueReasons[i])
    } else {
      for (const r of uniqueReasons) result.push(r)
    }
  } else if (uniqueObsBodies.length > 0) {
    result.push(OBS_PREFIX + uniqueObsBodies.join(''))
  }
  for (const d of uniqueDecisions) result.push(d)
  for (const o of uniqueOthers) result.push(o)

  return result.join('\n')
}

// ─────────────────────────────────────────────────────────────
// P欄 合成
// ─────────────────────────────────────────────────────────────

/**
 * 複数ブロックの P テキストを合成する。
 *
 * 方針: 「P本文は消さない・まとめすぎない」
 *
 *   body: 入力順のまま全て出力する。dedupe しない。
 *   closing: closingBehavior に従って処理する。
 *
 *   "dedupe_or_last"（実運用値・省略時もこの挙動）:
 *     同一 closing が連続している間は body だけ積み上げ、
 *     closing が変わるタイミングで1回出力する。
 *     後処理 dedupeClosingLines() によって「次回」始まりの重複行も除去される。
 *
 *   "append_all"（将来拡張予約値 — 現在は未サポート）:
 *     分岐は実装済みだが、後処理 dedupeClosingLines() との組み合わせで
 *     意図どおりに動作しないことが確認されている（TC-P-03 参照）。
 *     現行 JSON では使用不可。正式サポート前に dedupeClosingLines との
 *     整合を取ること。
 *
 * 出力イメージ（dedupe_or_last）:
 *   本文A           ← closing「次回A」
 *   本文B           ← closing「次回A」（同一 → まだ出さない）
 *   次回A           ← closing が変わるタイミングで出力
 *   本文C           ← closing「次回B」
 *   次回B           ← 終端でそのまま出力
 */
function buildP(
  pEntries: Array<{
    body: string
    closing: string | null
    closingBehavior?: 'dedupe_or_last' | 'append_all'
  }>,
): string {
  const out: string[] = []
  let pendingClosing: string | null = null

  for (const entry of pEntries) {
    const body = entry.body
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.length > 0)
      .join('\n')
    const closing = entry.closing?.trim() || null
    const behavior = entry.closingBehavior ?? 'dedupe_or_last'

    if (behavior === 'append_all') {
      // ⚠️ append_all: 将来拡張予約値。現在は未サポート・現行 JSON での使用不可。
      // 後処理 dedupeClosingLines() によって意図どおりに動作しないことが確認済み。
      // 分岐は将来の正式サポート時の起点として残置する（動作保証なし）。
      if (pendingClosing !== null) {
        out.push(pendingClosing)
        pendingClosing = null
      }
      if (body) out.push(body)
      if (closing) out.push(closing)
    } else {
      // dedupe_or_last（実運用値・デフォルト）: 従来ロジックを維持
      // closing が前の entry と変わったら、積み上げた pending closing を先に出力
      if (pendingClosing !== null && closing !== pendingClosing) {
        out.push(pendingClosing)
        pendingClosing = null
      }
      if (body) out.push(body)
      // closing を pending に積む（まだ出力しない）
      pendingClosing = closing
    }
  }

  // 末尾の pending closing を出力
  if (pendingClosing !== null) out.push(pendingClosing)

  return out.join('\n')
}

/**
 * mergeBlocks — 複数薬の SOAP ブロックを合成する。
 *
 * S: buildS による構造ベース合成（reason/observation/decision/other に分類 → dedupe → 再生成）
 * O / A: 本文をそのまま改行区切りで結合（ラベル行なし）
 * P: buildP による構造ベース合成（medication_instruction/side_effect/discontinuation/other に分類
 *    → 完全一致 dedupe → 固定順出力 → closing 末尾）
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
      // S: 構造ベース合成（buildS）
      //
      // clinicalDomain 分離ルール:
      //   clinicalDomain が定義されているブロックが存在する場合、
      //   clinicalDomain ごとにグループ化して buildS を個別呼び出しし、
      //   結果を改行区切りで結合する。
      //   clinicalDomain が未定義のブロックは単一グループとして扱う。
      //
      // groupKey は buildS 内に SEntry として渡し、reason 結合の制限に使う。

      // clinicalDomain でグループ化
      const domainGroups = new Map<string, SEntry[]>()
      const NO_DOMAIN = '__none__'
      for (const block of all) {
        const text = block.fields.S.trim()
        if (!text) continue
        const cd = block.clinicalDomain ?? NO_DOMAIN
        if (!domainGroups.has(cd)) domainGroups.set(cd, [])
        domainGroups.get(cd)!.push({
          text,
          groupKey: block.groupKey,
          clinicalDomain: block.clinicalDomain,
        })
      }

      const sResults: string[] = []
      for (const entries of domainGroups.values()) {
        const s = buildS(entries)
        if (s) sResults.push(s)
      }
      result.S = sResults.join('\n')

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
      // P: 構造ベース合成（buildP）
      // closingBehavior は MergedBlock に格納された値を渡す（未定義時は "dedupe_or_last"）
      const pEntries = all
        .filter(block => block.fields.P.trim())
        .map(block => {
          const rawText = block.fields.P.trim()
          const closing = block.closingText?.trim() ?? ''
          let body = rawText
          if (closing && body.endsWith(closing)) {
            body = body.slice(0, body.length - closing.length).trimEnd()
          }
          return {
            body,
            closing: closing || null,
            closingBehavior: block.closingBehavior,
          }
        })
      result.P = buildP(pEntries)
    }
  }

  // 後処理: 全フィールドを正規化（空行除去 + 締め文重複排除）
  for (const key of keys) {
    result[key] = dedupeClosingLines(normalizeLines(result[key]))
  }

  return result
}
