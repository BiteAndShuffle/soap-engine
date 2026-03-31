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

function splitDecision(text: string): { subject: string; predicate: string } {
  const m = text.match(/^(.+?)(は[、,].+)$/)
  if (m) return { subject: m[1], predicate: m[2] }
  const m2 = text.match(/^(.+?)(が.+)$/)
  if (m2) return { subject: m2[1], predicate: m2[2] }
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
 */
function buildS(sTexts: string[]): string {
  if (sTexts.length === 0) return ''

  const reasons: string[] = []
  const observations: string[] = []
  const decisions: string[] = []
  const others: string[] = []

  for (const text of sTexts) {
    const t = text.trim()
    if (!t) continue
    const type = classifySLine(t)
    if      (type === 'reason')      reasons.push(t)
    else if (type === 'observation') observations.push(t)
    else if (type === 'decision')    decisions.push(t)
    else                             others.push(t)
  }

  // ① reason: 完全 dedupe（入力順保持）
  const uniqueReasons = [...new Set(reasons)]

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
// P欄 構造ベース合成
// ─────────────────────────────────────────────────────────────

type PBlockType = 'medication_instruction' | 'side_effect' | 'discontinuation' | 'other'

/**
 * 出力順: medication_instruction → side_effect → other → discontinuation
 *
 * discontinuation を最後にすることで、継続薬の follow_up が
 * 終了後説明より前に自然に来る。
 */
const P_ORDER: PBlockType[] = ['medication_instruction', 'side_effect', 'other', 'discontinuation']

function classifyPBlock(body: string): PBlockType {
  const head = body.slice(0, 150)
  if (/(?:終了後|中止により|変更により|減量後も|の中止|の変更)/.test(head))
    return 'discontinuation'
  if (/(?:継続中に|の継続中|副作用|低血糖症状|消化器症状|食欲低下|吐き気|下痢|便秘|腹痛|膵炎|増量により|減量により|注射部|症状が(?:軽|強))/.test(head))
    return 'side_effect'
  if (/(?:血糖値を改善|服用後30分|PTPシート|起床後すぐ|継続してください|継続投与|血糖コントロール|将来の合併症予防のため継続|指導せん|注射の具体的|手技)/.test(head))
    return 'medication_instruction'
  return 'other'
}

type PEntry = {
  body: string
  closing: string | null
  category: PBlockType
  semanticKey: string
}

/**
 * body 先頭の「薬剤名(剤形)」トークンを抽出する。
 *
 * 抽出ルール（優先順）:
 *   1. 「〜(内服)」「〜(注射)」など括弧付き剤形トークン → 括弧閉じまで
 *   2. 先頭から最初の助詞（は・が・の）の前まで
 *   3. fallback: 先頭 20 文字
 */
function extractDrugToken(body: string): string {
  const m = body.match(/^(.+?[（(][^）)]*[）)])/)
  if (m) return m[1]
  const m2 = body.match(/^(.+?)[はがの]/)
  if (m2) return m2[1]
  return body.slice(0, 20)
}

/**
 * semanticKey を生成する: `薬剤名トークン_category`
 *
 * 例:
 *   GLP-1受容体作動薬(内服)_medication_instruction
 *   GLP-1受容体作動薬(注射)_side_effect
 *   GLP-1受容体作動薬(内服)_discontinuation
 *
 * 同じ category でも薬剤名が異なれば別キーとなるため、
 * 内服と注射の同カテゴリブロックは共存できる。
 * 同一薬剤・同一 category の重複エントリは初出のみ残す。
 */
function makeSemanticKey(body: string, category: PBlockType): string {
  return extractDrugToken(body) + '_' + category
}

/**
 * 複数ブロックの P テキストを構造ベースで合成する。
 *
 * 処理:
 *   1. 各ブロックの body を正規化・分類し semanticKey を付与して PEntry[] を作成
 *   2. semanticKey による dedupe（同一薬剤×同一 category は初出のみ残す）
 *      ※ body が完全一致でなくても同 semanticKey なら統合対象
 *      ※ 同 body でも semanticKey が異なれば（薬剤名違い）両方残る
 *   3. 固定順 (medication_instruction → side_effect → other → discontinuation) で並べ替え
 *   4. 各 entry の closing は body 直後に出力（closing を一括末尾に寄せない）
 *
 * これにより「継続薬の follow_up → 終了後説明 → 終了後 follow_up」という
 * 意味順が自然に保たれる。
 */
function buildP(pEntries: Array<{ body: string; closing: string | null }>): string {
  const seenKeys = new Set<string>()
  const entries: PEntry[] = []
  const orphanClosings: string[] = []   // body 空で closing のみのケース用

  for (const entry of pEntries) {
    const norm = entry.body
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.length > 0)
      .join('\n')
    const c = entry.closing?.trim() || null
    if (!norm) {
      // body がないが closing はある → 末尾に孤立 closing として保持
      if (c) orphanClosings.push(c)
      continue
    }
    const category = classifyPBlock(norm)
    const semanticKey = makeSemanticKey(norm, category)
    if (seenKeys.has(semanticKey)) continue   // 同一薬剤×同一 category は初出のみ残す
    seenKeys.add(semanticKey)
    entries.push({ body: norm, closing: c, category, semanticKey })
  }

  // category の固定順でソート（入力順を安定的に保持するため stable sort）
  const categoryIndex = (c: PBlockType) => P_ORDER.indexOf(c)
  entries.sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category))

  const parts: string[] = []
  for (const entry of entries) {
    parts.push(entry.body)
    if (entry.closing) parts.push(entry.closing)
  }
  for (const c of orphanClosings) parts.push(c)

  return parts.join('\n')
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
      const sTexts = all.map(block => block.fields.S.trim()).filter(Boolean)
      result.S = buildS(sTexts)
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
      const pEntries = all
        .filter(block => block.fields.P.trim())
        .map(block => {
          const rawText = block.fields.P.trim()
          const closing = block.closingText?.trim() ?? ''
          let body = rawText
          if (closing && body.endsWith(closing)) {
            body = body.slice(0, body.length - closing.length).trimEnd()
          }
          return { body, closing: closing || null }
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
