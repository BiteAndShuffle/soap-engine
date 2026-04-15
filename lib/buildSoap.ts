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

  // 2. followup S のみ先に追記（P は addon の後に追記するため分離）
  {
    let appendText: string | null | undefined
    const followupRef = scenario.followupRef
    if (followupRef) {
      const profile = mod.defaults?.followupProfiles?.[followupRef]
      if (profile) appendText = (profile as Record<string, string | null>)['S']
    } else {
      const followupVal = (scenario.followup as Record<string, string> | undefined)?.['S']
      if (followupVal === 'default') {
        appendText = (mod.defaults?.followup as Record<string, string> | undefined)?.['S']
      }
    }
    if (appendText) result['S'] = result['S'] ? `${result['S']}\n${appendText}` : appendText
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

  // 3b. followup P を addon の後に追記（P の組み立て順: scenario.P → addon → followup.P）
  // closing は常に P の末尾に来る必要があるため、addon より後に追記する。
  {
    let appendText: string | null | undefined
    const followupRef = scenario.followupRef
    if (followupRef) {
      const profile = mod.defaults?.followupProfiles?.[followupRef]
      if (profile) appendText = (profile as Record<string, string | null>)['P']
    } else {
      const followupVal = (scenario.followup as Record<string, string> | undefined)?.['P']
      if (followupVal === 'default') {
        appendText = (mod.defaults?.followup as Record<string, string> | undefined)?.['P']
      }
    }
    if (appendText) result['P'] = result['P'] ? `${result['P']}\n${appendText}` : appendText
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
 * P本文中で隣接する完全一致行を除去する（P専用）。
 *
 * 連続して同じ行が出たときのみ後者を削除する。
 * 連続していない重複（離れた位置）は残す。
 * 意味解釈・言い換え統合は一切行わない。
 */
function dedupeAdjacentLines(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i] === lines[i - 1]) continue
    result.push(lines[i])
  }
  return result.join('\n')
}

/**
 * Pセクション末尾に連続して出現する締め文を整理する。
 *
 * 「次回」で始まる行のみを "closing 行" とみなす。
 * 末尾から連続している closing 行ブロックを特定し、その中から最後の1行だけを残す。
 * 連続ブロックの外（本文）には一切手を加えない。
 * 連続していない場合（締め文が末尾にない）は何もしない。
 */
function dedupeClosingLines(text: string): string {
  const lines = text.split('\n')

  // 末尾行が closing でなければ何もしない（最重要ガード）
  const lastLine = lines[lines.length - 1]
  if (!lastLine.trimStart().startsWith('次回')) return text

  // 末尾から連続する closing 行ブロックの先頭インデックスを探す
  let tailStart = lines.length - 1
  while (tailStart > 0 && lines[tailStart - 1].trimStart().startsWith('次回')) {
    tailStart--
  }

  // closing 行が末尾に1行のみ → 重複なし、何もしない
  if (tailStart === lines.length - 1) return text

  // 連続 closing ブロックの最後の1行だけ残す（後勝ち）
  const body = lines.slice(0, tailStart)
  const lastClosing = lines[lines.length - 1]
  return [...body, lastClosing].join('\n')
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
 *   - reason は「clinicalDomain × groupKey」単位で最初の1件のみ採用する
 *   - 同一 groupKey の2件目以降はテキストが異なっても切り捨てる
 *   - groupKey が '' の場合は各エントリを独立キーとして扱い、すべて個別出力（結合禁止）
 *   - clinicalDomain による分離は mergeBlocks 側で行う（buildS に渡る時点で同一ドメイン保証済み）
 *
 * 出力順:
 *   - reason は最初に出現した groupKey の順を保持する
 *   - observation / decision / other は reason の後
 */
function buildS(sEntries: SEntry[]): string {
  if (sEntries.length === 0) return ''

  // ① reason: groupKey ごとに「最初の1件のみ」採用する
  //
  // 採用ルール:
  //   - groupKey が非空文字: そのキーで最初に出現したテキストを確定、以降の同一キーは捨てる
  //   - groupKey が '' または undefined: キーとしてエントリごとのユニークIDを使い個別出力
  //     （groupKey 未設定の reason は統合しない）
  //
  // 出力順: groupKey が最初に出現した順
  const reasonByGroupKey = new Map<string, string>()  // groupKey → 採用テキスト（最初の1件）
  const reasonGroupKeyOrder: string[]           = []  // groupKey の出現順（重複なし）
  let anonymousReasonCounter                    = 0   // groupKey='' エントリの連番キー

  const observations: string[] = []
  const decisions: string[] = []
  const others: string[] = []

  for (const entry of sEntries) {
    const t = entry.text.trim()
    if (!t) continue
    const type = classifySLine(t)

    if (type === 'reason') {
      const gk = entry.groupKey && entry.groupKey !== ''
        ? entry.groupKey
        : `__anon_${anonymousReasonCounter++}__`   // 空 groupKey → 独立キーとして個別出力
      if (!reasonByGroupKey.has(gk)) {
        reasonByGroupKey.set(gk, t)
        reasonGroupKeyOrder.push(gk)
      }
      // 同一 groupKey の2件目以降は無視（最初の1件が確定済み）
    } else if (type === 'observation') {
      observations.push(t)
    } else if (type === 'decision') {
      decisions.push(t)
    } else {
      others.push(t)
    }
  }

  // 採用された reason を出現順に並べる（groupKey ごとに1件確定済み）
  const uniqueReasons = reasonGroupKeyOrder.map(gk => reasonByGroupKey.get(gk)!)

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
 * 方針: 「連続して同じ closing を持つ entry 群を1塊にまとめ、塊末尾に closing を1回置く」
 *
 *   entry を順に走査し、closing が同じ間は body を同じ塊に蓄積する。
 *   closing が変わった時点で現在の塊を flush（body群 + closing）する。
 *   非連続で同じ closing が再登場した場合は別塊として扱う（全文統合しない）。
 *
 *   closing が null のエントリ同士も「null === null」で連続扱いになり1塊にまとまる。
 *
 *   "append_all"（将来拡張予約値 — 現在は未サポート）:
 *     分岐は実装済みだが、現行 JSON での使用不可。append_all エントリは
 *     連続 closing 塊を一度 flush したうえで即時出力する。
 *
 * 出力イメージ（closing A → A → B → A の場合）:
 *   本文1（A薬継続）
 *   本文2（A薬継続）
 *   次回、A薬の確認。   ← 塊1 closing
 *   本文3（B薬中止）
 *   次回、B薬の確認。   ← 塊2 closing
 *   本文4（A薬再追加）
 *   次回、A薬の確認。   ← 塊3 closing（非連続再登場 → 別塊）
 */
/**
 * closing テキストを chunk 判定用に正規化する。
 * 表示文は変えず、比較キーのみを統一する。
 *
 * 現在の正規化:
 *   「服用できているか」→「使用できているか」
 *   （oral モジュールの「服用」と injection モジュールの「使用」を同一塊に入れるため）
 */
function normalizeClosingKey(text: string | null): string | null {
  if (!text) return text
  return text.replace('服用できているか', '使用できているか')
}

function buildP(
  pEntries: Array<{
    body: string
    closing: string | null
    closingBehavior?: 'dedupe_or_last' | 'append_all'
  }>,
): string {
  const output: string[] = []

  // 現在蓄積中の塊
  // currentClosing: 出力用 original text
  // currentClosingKey: chunk 判定用 normalized key
  let currentClosing: string | null = undefined as unknown as string | null
  let currentClosingKey: string | null = undefined as unknown as string | null
  let currentBodies: string[] = []

  const flushChunk = () => {
    if (currentBodies.length === 0 && !currentClosing) return
    for (const b of currentBodies) output.push(b)
    if (currentClosing) output.push(currentClosing)
    currentBodies = []
    currentClosing = undefined as unknown as string | null
    currentClosingKey = undefined as unknown as string | null
  }

  let initialized = false

  for (const entry of pEntries) {
    const body = entry.body
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.length > 0)
      .join('\n')
    const closing = entry.closing?.trim() || null
    const closingKey = normalizeClosingKey(closing)
    const behavior = entry.closingBehavior ?? 'dedupe_or_last'

    if (behavior === 'append_all') {
      // ⚠️ append_all: 将来拡張予約値。現在は未サポート・現行 JSON での使用不可。
      // 現在の塊を flush してから即時出力する。
      flushChunk()
      initialized = false
      if (body) output.push(body)
      if (closing) output.push(closing)
      continue
    }

    // 初回エントリ: 塊を開始する
    if (!initialized) {
      currentBodies = body ? [body] : []
      currentClosing = closing
      currentClosingKey = closingKey
      initialized = true
      continue
    }

    if (closingKey === currentClosingKey) {
      // 同じ closing（正規化後一致）→ 同じ塊に body を追加
      if (body) currentBodies.push(body)
    } else {
      // closing が変わった → 現在の塊を flush して新しい塊を開始
      flushChunk()
      currentBodies = body ? [body] : []
      currentClosing = closing
      currentClosingKey = closingKey
    }
  }

  // 最後の塊を flush
  flushChunk()

  return output.join('\n')
}

/**
 * mergeBlocks — 複数薬の SOAP ブロックを合成する。
 *
 * S: buildS による構造ベース合成（reason/observation/decision/other に分類 → dedupe → 再生成）
 * O / A: 本文をそのまま改行区切りで結合（ラベル行なし）
 * P: buildP による合成（全 body を入力順に先出し → closing を末尾に集約・dedup）
 *
 * 後処理（全フィールド共通）:
 *   - 空行を除去して行を詰める（normalizeLines）
 *   - 締め文の重複行を排除する（dedupeClosingLines）
 *
 * currentClosingText: 現在選択中シナリオの closing テキスト（省略可）
 * currentGroupKey: 1剤目シナリオの mergePolicy.S.groupKey（S合成の reason dedupe に使用）
 * currentClinicalDomain: 1剤目モジュールの composition.clinicalDomain（S合成のドメイン分離に使用）
 */
export function mergeBlocks(
  blocks: MergedBlock[],
  currentFields: SoapFields,
  currentLabel: string,
  currentClosingText?: string,
  currentDomain?: string,
  currentGroupKey?: string,
  currentClinicalDomain?: string,
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
      groupKey: currentGroupKey,
      clinicalDomain: currentClinicalDomain,
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
  // P のみ追加で隣接重複行も除去する（完全一致行が連続した場合のみ）
  for (const key of keys) {
    const normalized = normalizeLines(result[key])
    result[key] = dedupeClosingLines(
      key === 'P' ? dedupeAdjacentLines(normalized) : normalized
    )
  }

  return result
}
