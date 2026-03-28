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
// S欄ドメイン別まとめユーティリティ
// ─────────────────────────────────────────────────────────────

/**
 * S欄の各ブロックテキストをドメイン別にグループ化し、
 * 同一 domain 内で文型が一致する行を自然文にまとめる。
 *
 * 「まとめる」条件（すべて満たす場合のみ）:
 *   1. 同一 domain のブロックが2件以上ある
 *   2. 各ブロックの S がそれぞれ「単一行」である（複数行は個別維持）
 *   3. 末尾の文型が一致する（「〜が出て薬が追加になりました。」等）
 *      → 文末 suffix を抽出し、先頭の「症状語」だけを置換してまとめる
 *
 * 上記に該当しない場合は各ブロックの S をそのまま改行区切りで返す。
 */
function groupSentencesS(
  entries: Array<{ domain: string | undefined; text: string }>,
): string {
  if (entries.length === 0) return ''
  if (entries.length === 1) return entries[0].text

  // domain ごとにグループ化
  const domainMap = new Map<string, string[]>()
  for (const e of entries) {
    const key = e.domain ?? '__none__'
    if (!domainMap.has(key)) domainMap.set(key, [])
    domainMap.get(key)!.push(e.text)
  }

  const resultLines: string[] = []

  for (const [, texts] of domainMap) {
    if (texts.length === 1) {
      resultLines.push(texts[0])
      continue
    }

    // すべてが「単一行」かつ文末 suffix が一致するときだけまとめる
    const singleLines = texts.filter(t => !t.includes('\n'))
    if (singleLines.length !== texts.length) {
      // 複数行が混在 → 個別維持
      resultLines.push(...texts)
      continue
    }

    // 共通 suffix を検出（最短一致）
    // 例: 「痰が出て薬が追加になりました。」「咳が出て薬が追加になりました。」
    //     → suffix = 「が出て薬が追加になりました。」、prefix = 「痰」「咳」
    const suffixes = singleLines.map(t => {
      // 「〜が〜」「〜で〜」「〜は〜」のような助詞で文を2分割
      const m = t.match(/^(.+?)([がではをにもと].+)$/)
      return m ? m[2] : null
    })
    const allSameSuffix = suffixes[0] !== null && suffixes.every(s => s === suffixes[0])

    if (!allSameSuffix) {
      // 文型不一致 → 個別維持
      resultLines.push(...texts)
      continue
    }

    // 文型一致 → 先頭語を「・」で結合してまとめる
    const suffix = suffixes[0]!
    const prefixes = singleLines.map(t => t.replace(suffix, ''))
    const joined = prefixes.join('・') + suffix
    resultLines.push(joined)
  }

  return resultLines.join('\n')
}

/**
 * mergeBlocks — 複数薬の SOAP ブロックを合成する。
 *
 * S / O / A: 本文をそのまま改行区切りで結合（ラベル行なし）。
 *   S 欄のみ、同一 domain かつ同一文型のブロックを自然文にまとめる（groupSentencesS）。
 *
 * P フィールドの closing deduplication:
 *   各ブロックに closingText が設定されている場合、
 *   同一 closing テキストは最後に1回だけ出力する。
 *   手順:
 *   1. 各ブロックの P から closingText を末尾で除去してボディを取得
 *   2. ボディを改行区切りで結合（ラベル行なし）
 *   3. 出現した unique closing テキストを収集し、末尾に追記
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
      // P: closing deduplication（ラベル行なし）
      const seenClosings = new Set<string>()
      const orderedClosings: string[] = []
      const parts: string[] = []

      for (const block of all) {
        const rawText = block.fields.P.trim()
        if (!rawText) continue

        const closing = block.closingText?.trim() ?? ''
        let body = rawText

        // closing が設定されており P の末尾に一致する場合に除去
        if (closing && body.endsWith(closing)) {
          body = body.slice(0, body.length - closing.length).trimEnd()
        }

        if (body) parts.push(body)

        // unique closing を順序付きで収集
        if (closing && !seenClosings.has(closing)) {
          seenClosings.add(closing)
          orderedClosings.push(closing)
        }
      }

      let merged = parts.join('\n')
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
