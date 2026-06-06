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

  // 6. {{drug_subject}} スロットを解決（S / O / A / P すべて対象）
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
 * Scenario の sideEffectPresence と scenarioGroup/id からチップ色を決定する。
 *
 * treatment_start 系（初回・再開・他所開始）— 青/緑の差分:
 *   "restart" / restart_* → green  （全モジュール共通: bare id も prefix も対応）
 *   initial / initial_* / external_start / external_start_* → blue
 *   その他 start_or_change / treatment_start → blue
 *
 * 副作用対応系 — 表示順に赤/オレンジ交互（SEP_ACTION_ORDER 準拠）:
 *   present_mild(0)          → red
 *   present_moderate(1)      → orange
 *   present_dose_decrease(2) → red
 *   present_change(3)        → orange
 *   present_stop(4)          → red
 *
 * 副作用なし (absent_or_not_observed) → green
 * 増量 (dose_change increase系)       → blue
 * 減量 (dose_change reduce系)         → gray
 * CP良好 (adherence_good)             → green
 * CP不良 (adherence_poor)             → orange
 * 終了 (end_*)                        → purple
 * その他                              → gray
 */
export function scenarioToColor(scenario: Scenario): ChipColor {
  const sep = scenario.sideEffectPresence
  const sg = scenario.scenarioGroup
  const sid = scenario.id

  // ── 副作用対応系: 表示順に赤/オレンジ交互 ───────────────────
  // SEP_ACTION_ORDER 準拠: mild(0)→red, moderate(1)→orange,
  //   dose_decrease(2)→red, change(3)→orange, stop(4)→red
  if (sep === 'present_mild' || sep === 'present_dose_decrease' || sep === 'present_stop') return 'red'
  if (sep === 'present_moderate' || sep === 'present_change') return 'orange'

  // ── 副作用なし ────────────────────────────────────────────────
  if (sep === 'absent_or_not_observed') return 'green'

  // ── treatment_start 系: 青/緑の差分 ──────────────────────────
  // 再開判定: id が "restart" または "restart_" で始まる（全モジュール共通）
  if (sg === 'treatment_start' || sg === 'start_or_change') {
    if (sid === 'restart' || sid.startsWith('restart_')) return 'green'
    return 'blue'  // initial / initial_* / external_start / external_start_* / その他
  }

  // ── 増量・減量 ────────────────────────────────────────────────
  if (sg === 'dose_change' && sid.startsWith('dose_increase')) return 'blue'
  if (sg === 'dose_change') return 'gray'

  // ── アドヒアランス ────────────────────────────────────────────
  if (sg === 'adherence_good') return 'green'
  if (sg === 'adherence_poor') return 'orange'

  // ── 終了 ─────────────────────────────────────────────────────
  if (sg.startsWith('end_') || sg === 'treatment_end') return 'purple'

  // ── その他 ───────────────────────────────────────────────────
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
 * reason 行を「薬剤名は、本文」形式に分解する。
 *
 * 対象: /^(.+?)は、(.+)$/ にマッチする行のみ（drug_subject 解決済みの主語付き形式）。
 * 非対象: 主語なし形式（例: "血糖値が高いため、薬が追加となった。"）は null を返す。
 */
function splitReasonSubject(text: string): { subject: string; body: string } | null {
  const m = text.match(/^(.+?)は、(.+)$/)
  if (!m) return null
  return { subject: m[1], body: m[2] }
}

/**
 * decision / reason の比較キー用に、投与経路を表す動詞のみを正規化する。
 *
 * 正規化対象（経口服用 ↔ 注射使用 の表記揺れのみ）:
 *   服用により → 使用により
 *   服用後     → 使用後
 *   服用中     → 使用中
 *
 * ※ 出力テキスト自体は変更しない。比較キー生成専用。
 * ※ 医療的に意味が異なる語句（追加/中止/減量/増量/変更/改善/悪化 等）は正規化しない。
 */
function normalizeAdminVerbForKey(text: string): string {
  return text
    .replace(/服用により/g, '使用により')
    .replace(/服用後/g, '使用後')
    .replace(/服用中/g, '使用中')
}

/**
 * 複数ブロックの S テキストを構造ベースで合成する。
 *
 * 処理:
 *   1. 各テキストを SLineType に分類（reason / observation / decision / other）
 *   2. バケット単位で dedupe・統合
 *   3. 固定順で再生成
 *      reason + obs → reason[0] + obs bodies を1行に結合
 *      decision → predicate ごとに subject を「・」結合
 *
 * reason 統合ルール（2パス方式）:
 *
 * Pass 1 — groupKey × body 単位で主語統合（異なる薬剤が同一理由で追加された場合）:
 *   - 「薬剤名は、本文」形式: groupKey と body が同一なら主語を「と」で結合
 *     例: "Aは、目のかゆみ..." + "Bは、目のかゆみ..." → "AとBは、目のかゆみ..."
 *   - 主語なし形式（"血糖値が高いため..."等）: groupKey × 全文一致のみ重複排除、
 *     本文が異なれば別行維持
 *   - groupKey が '' / undefined: 独立キーとして個別出力（統合しない）
 *
 * Pass 2 — 同一主語 × 同一 groupKey で body が複数ある場合は body を「・」結合:
 *   - Express Mode で同一薬剤を複数シナリオで追加した場合（乾燥/湿疹/かぶれ等）
 *     "Aは、乾燥...追加" + "Aは、湿疹...追加" → "Aは、乾燥...・湿疹...追加となった。"
 *   - 主語が複数の場合（AとB）も同様に body を結合する
 *   - groupKey なし / 主語なし形式は従来通り個別出力
 *
 * 出力順:
 *   - reason は最初に出現した統合グループの順を保持する
 *   - observation / decision / other は reason の後
 */
function buildS(sEntries: SEntry[]): string {
  if (sEntries.length === 0) return ''

  // ① reason: groupKey × body 単位で主語統合する
  //
  // 統合キー: `${groupKey}::${body}`
  //   - 「薬剤名は、本文」形式: body = は、以降の本文
  //   - 主語なし形式: body = テキスト全体（統合キーにテキスト全体を使い、同一テキストのみ dedupe）
  //
  // subjects: 統合キーごとの主語リスト（空配列 = 主語なし形式）
  // keyOrder: 統合キーの出現順
  const reasonSubjects = new Map<string, string[]>()  // 統合キー → 主語リスト
  const reasonBody     = new Map<string, string>()    // 統合キー → body テキスト
  const reasonKeyOrder: string[] = []                 // 統合キーの出現順
  let anonymousReasonCounter = 0

  const observations: string[] = []
  const decisions: string[] = []
  const others: string[] = []

  for (const entry of sEntries) {
    const t = entry.text.trim()
    if (!t) continue
    const type = classifySLine(t)

    if (type === 'reason') {
      const split = splitReasonSubject(t)

      let mergeKey: string
      let subject: string | null
      let body: string

      if (split !== null) {
        // 「薬剤名は、本文」形式:
        //   groupKey が設定されていれば groupKey × body で統合。
        //   groupKey が未設定でも同一 clinicalDomain 内・同一 body なら統合する
        //   （Type B: 同一 reason body を持つ multi-drug initial の過剰重複を防ぐ）。
        subject  = split.subject
        body     = split.body
        const gk = entry.groupKey && entry.groupKey !== ''
          ? entry.groupKey
          : `__samebody__`  // groupKey なし・主語あり形式は body で統合
        mergeKey = `${gk}::${body}`
      } else {
        // 主語なし形式: groupKey × 全文で重複排除のみ（統合しない）
        const gk = entry.groupKey && entry.groupKey !== ''
          ? entry.groupKey
          : `__anon_${anonymousReasonCounter++}__`  // groupKey なし → 独立キー
        subject  = null
        body     = t
        mergeKey = `${gk}::${t}`
      }

      if (!reasonSubjects.has(mergeKey)) {
        reasonSubjects.set(mergeKey, subject !== null ? [subject] : [])
        reasonBody.set(mergeKey, body)
        reasonKeyOrder.push(mergeKey)
      } else if (subject !== null) {
        // 同一 mergeKey に新しい主語を追加（重複は除く）
        const existing = reasonSubjects.get(mergeKey)!
        if (!existing.includes(subject)) existing.push(subject)
      }
      // 主語なし形式の重複（subject === null）: mergeKey が既存なら何もしない（完全 dedupe）
    } else if (type === 'observation') {
      observations.push(t)
    } else if (type === 'decision') {
      decisions.push(t)
    } else {
      others.push(t)
    }
  }

  // reason を統合キー出現順に再構築。
  //
  // Pass 2 — 同一主語 × 同一 groupKey で body が複数ある場合はまとめる。
  //
  // 例: 同一薬剤を Express Mode で複数シナリオ（乾燥/湿疹/かぶれ）追加した場合、
  //   "ヒルドイドソフト軟膏は、乾燥が気になるため追加となった。"
  //   "ヒルドイドソフト軟膏は、湿疹が気になるため追加となった。"
  //   → "ヒルドイドソフト軟膏は、乾燥が気になるため・湿疹が気になるため追加となった。"
  //
  // 同一主語判定: subjects 配列をソートして文字列化したものを比較キーとする。
  //
  // 異なる薬剤（subjects が異なる）や groupKey なしエントリは従来通り個別出力。
  // body の末尾「追加となった。」などは末尾エントリからのみ取得する。
  // body を「・」結合するとき: 全 body の末尾を除いた prefix を「・」で繋ぎ、
  // 末尾 body の全体を最後に付ける（末尾の句点・助詞を保持する）。
  //
  // 実装: groupKey と subjects を key に body を集約する Map を構築し、
  //       入力順を維持しながら出力する。

  // subjectMergeKey → { subjects, groupKey, bodies[], firstMergeKey }
  const subjectBodyMerge = new Map<string, {
    subjects: string[]
    groupKey: string
    bodies: string[]
    firstMergeKey: string  // uniqueReasons での出力順管理用
  }>()
  // 出力順を保持: 先に出現した subjectMergeKey 順
  const subjectMergeOrder: string[] = []

  for (const mergeKey of reasonKeyOrder) {
    const subjects = reasonSubjects.get(mergeKey)!
    const body     = reasonBody.get(mergeKey)!

    if (subjects.length === 0) {
      // 主語なし形式はそのまま独立出力（変換しない）
      const smk = `__anon__::${mergeKey}`
      subjectBodyMerge.set(smk, { subjects: [], groupKey: '', bodies: [body], firstMergeKey: mergeKey })
      subjectMergeOrder.push(smk)
      continue
    }

    // 主語ありの場合: subjects をソートして canonical key を作る
    const gkPrefix = mergeKey.split('::')[0]  // groupKey 部分
    const subjectKey = [...subjects].sort().join('\x00')
    const smk = `${gkPrefix}::${subjectKey}`

    if (!subjectBodyMerge.has(smk)) {
      subjectBodyMerge.set(smk, { subjects, groupKey: gkPrefix, bodies: [body], firstMergeKey: mergeKey })
      subjectMergeOrder.push(smk)
    } else {
      // 同一主語 × 同一 groupKey → body を追加
      const existing = subjectBodyMerge.get(smk)!
      if (!existing.bodies.includes(body)) existing.bodies.push(body)
    }
  }

  const uniqueReasons: string[] = []
  for (const smk of subjectMergeOrder) {
    const { subjects, bodies } = subjectBodyMerge.get(smk)!
    if (subjects.length === 0) {
      // 主語なし形式
      uniqueReasons.push(bodies[0])
    } else if (bodies.length === 1) {
      // 従来通り: 単一 body
      uniqueReasons.push(subjects.join('と') + 'は、' + bodies[0])
    } else {
      // 複数 body を自然な日本語で結合する。
      //
      // 処理:
      //   1. 各 body から末尾の reason-verb（"追加となった。"等）を除いた prefix を取り出す。
      //   2. 各 prefix からさらに末尾の「ため」連結語（"のため" / "が気になるため" 等）を
      //      除いた「理由句のコア」を取り出す。
      //      全 prefix が ため 連結語を持つ場合: コアを「、」結合し末尾に「のため」+ verb。
      //      いずれかが持たない場合: prefix をそのまま「、」結合し末尾に verb。
      //   3. verb が見つからない場合は body 全体を「、」結合（安全フォールバック）。
      //
      // 例（全 prefix が ため 系）:
      //   ["乾燥が気になるため追加となった。", "湿疹が気になるため追加となった。",
      //    "パッチによるかぶれ防止のため追加となった。"]
      //   → "ヒルドイドソフト軟膏は、乾燥、湿疹、パッチによるかぶれ防止のため追加となった。"
      //
      // 例（混在: ため あり / なし）:
      //   ["血行促進目的で追加となった。", "皮膚バリア強化のため追加となった。"]
      //   → "ヒルドイドソフト軟膏は、血行促進目的で、皮膚バリア強化のため追加となった。"
      //
      // hardcode なし: ため連結語の判定はパターンマッチのみ。JSON/moduleId 依存なし。

      // 「ため」系の末尾パターン（長いものから順に試す）
      const TAME_PATTERNS: RegExp[] = [
        /が気になるため$/,
        /のため$/,
        /ため$/,
      ]

      function stripTameSuffix(prefix: string): { core: string; matched: boolean } {
        for (const pat of TAME_PATTERNS) {
          if (pat.test(prefix)) {
            return { core: prefix.replace(pat, ''), matched: true }
          }
        }
        return { core: prefix, matched: false }
      }

      const REASON_VERB = /(?:追加|導入)となった[。]?$/
      const lastBody = bodies[bodies.length - 1]
      const lastMatch = lastBody.match(REASON_VERB)
      if (lastMatch) {
        const verb = lastMatch[0]
        // 各 body から verb を除いた prefix を取り出す
        const prefixes = bodies.map(b => b.replace(REASON_VERB, ''))
        // 各 prefix から ため 連結語を除く試み
        const stripped = prefixes.map(p => stripTameSuffix(p))
        const allHadTame = stripped.every(s => s.matched)
        if (allHadTame) {
          // 全 prefix が ため 系 → コアを「、」結合し「のため」を末尾に付ける
          uniqueReasons.push(subjects.join('と') + 'は、' + stripped.map(s => s.core).join('、') + 'のため' + verb)
        } else {
          // 混在: prefix をそのまま「、」結合
          uniqueReasons.push(subjects.join('と') + 'は、' + prefixes.join('、') + verb)
        }
      } else {
        // verb が分離できない場合: body 全体を「、」結合（安全フォールバック）
        uniqueReasons.push(subjects.join('と') + 'は、' + bodies.join('、'))
      }
    }
  }

  // ② observation: prefix を除いた body を unique 化
  const obsBodySeen = new Set<string>()
  const uniqueObsBodies: string[] = []
  for (const obs of observations) {
    const body = obs.startsWith(OBS_PREFIX) ? obs.slice(OBS_PREFIX.length) : obs
    if (!obsBodySeen.has(body)) { obsBodySeen.add(body); uniqueObsBodies.push(body) }
  }

  // ③ decision: predicate ごとにグループ化し subject を unique 結合
  //
  // Type A 修正: 投与経路表記（服用/使用）の差異だけで predicate が分かれないよう、
  // 比較キー（predicateKey）は normalizeAdminVerbForKey() で正規化する。
  // 出力テキスト（predicate）は初出のものをそのまま使用する（本文を変更しない）。
  //
  // 同様に subject も投与経路表記で正規化したキーで重複排除し、
  // 初出のテキストを出力に使う。これにより oral「服用」と injection「使用」が
  // 同一グループ・同一主語として扱われ、症状語の重複出力を防ぐ。
  const decisionByPredicate = new Map<string, {
    predicate: string           // 出力用 (初出テキスト)
    subjectMap: Map<string, string>  // normalizedKey → 初出テキスト
    subjectOrder: string[]           // normalizedKey の出現順
  }>()
  const predicateOrder: string[] = []   // predicateKey の出現順
  for (const dec of decisions) {
    const { subject, predicate } = splitDecision(dec)
    const predicateKey = normalizeAdminVerbForKey(predicate)
    const subjectKey   = normalizeAdminVerbForKey(subject)
    if (!decisionByPredicate.has(predicateKey)) {
      decisionByPredicate.set(predicateKey, {
        predicate,
        subjectMap: new Map([[subjectKey, subject]]),
        subjectOrder: [subjectKey],
      })
      predicateOrder.push(predicateKey)
    } else {
      const entry = decisionByPredicate.get(predicateKey)!
      if (!entry.subjectMap.has(subjectKey)) {
        entry.subjectMap.set(subjectKey, subject)
        entry.subjectOrder.push(subjectKey)
      }
    }
  }
  const uniqueDecisions: string[] = []
  for (const predicateKey of predicateOrder) {
    const entry = decisionByPredicate.get(predicateKey)!
    const subjects = entry.subjectOrder.map(k => entry.subjectMap.get(k)!)
    uniqueDecisions.push(subjects.join('・') + entry.predicate)
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
 * closing テキストを正規化する。
 * chunk 判定（比較キー）と表示文（canonical text）の両方に使用する。
 *
 * 正規化内容:
 *   「服用できているか」→「使用できているか」
 *   （oral モジュールの「服用」と injection モジュールの「使用」を同一塊・同一表示に寄せるため）
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
      if (closing) output.push(normalizeClosingKey(closing)!)
      continue
    }

    // 初回エントリ: 塊を開始する
    if (!initialized) {
      currentBodies = body ? [body] : []
      currentClosing = normalizeClosingKey(closing)
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
      currentClosing = normalizeClosingKey(closing)
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
