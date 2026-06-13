/**
 * search.ts — 正規化・グループ分類・サジェスト検索
 *
 * 依存ライブラリなし。ピュア TypeScript。
 *
 * スコアリング優先順位（高→低）:
 *   7) drug.search.exactAliases 完全一致（suppressCrossModuleSuggestionsOnExactHit 発動）
 *   6) drug.search.primaryDisplayName 完全一致
 *   5) 薬剤名エイリアス（nameAliases + brandNames）完全一致
 *   4) 薬剤名エイリアス（nameAliases + brandNames）前方一致（JSON prefixAliases 不要）
 *   2) タイトル前方一致 / エイリアス部分一致
 *   1) コーパス（keywords・一般語）部分一致
 *   0) マッチなし
 */

import type { Scenario, ModuleData } from './types'
import { getMenuGroupFromScenario } from './menuGroups'

// ─────────────────────────────────────────────────────────────
// A) テキスト正規化
// ─────────────────────────────────────────────────────────────

/** カタカナ → ひらがな */
function kataToHira(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  )
}

/**
 * 検索クエリ・検索対象テキストを正規化する。
 * - NFKC 正規化（全角英数・半角カナ → 通常形）
 * - 小文字化
 * - カタカナ → ひらがな
 * - 空白・中点・ハイフン系を除去
 */
export function normalizeText(s: string): string {
  return kataToHira(
    s.normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\u3000\u30FB\u00B7\-_/()（）・]+/g, ''),
  )
}

// ─────────────────────────────────────────────────────────────
// B) 検索エントリ
// ─────────────────────────────────────────────────────────────

export interface SearchEntry {
  /** 新スキーマ: scenario.globalId（アプリ全体で一意） */
  templateId: string
  moduleId: string
  corpus: string
  exactAliasTokens: string[]
  primaryDisplayNameNorm: string
  aliasTokens: string[]
  /** 表示用タイトル（scenario.title） */
  label: string
  /** 短縮ラベル（薬効群名プレフィックスを除いたもの） */
  shortLabel: string
  /** 大分類グループ名（サブテキスト表示用） */
  groupLabel: string
  /** 薬剤表示名（例: リベルサス（セマグルチド）） */
  drugDisplayLabel?: string
  suppressOnExactHit: boolean
  priority: number
  /**
   * ブランド名リスト（drug.brandNames）。
   * resolveBrandName でクエリと照合し、どのブランドにヒットしたか特定するために使用。
   */
  brandNames: string[]
  /**
   * ブランド名 → 正規化エイリアスリスト（brandCatalog[brand].aliases から構築）。
   * resolveBrandName でブランド固有エイリアス（一般名ひらがな等）との照合に使用。
   */
  brandCatalogAliasMap: Record<string, string[]>
  /**
   * ブランド名 → 一般名（brandCatalog[brand].genericName から構築）。
   * 一般名検索時に drugDisplayLabel を一般名寄りに解決するために使用。
   */
  brandCatalogGenericMap: Record<string, string>
  /**
   * 剤形識別トークン（drug.search.formulationSearchTokens の正規化済みリスト）。
   * AND 検索の第2トークン以降でこのリストを優先評価し、剤形による絞り込みを強化する。
   * 未定義モジュールでは空配列となり、既存の scoreEntry にフォールバックする。
   */
  formulationTokens: string[]
}

// ─────────────────────────────────────────────────────────────
// C) 検索インデックス構築（新スキーマ: scenarios[]）
// ─────────────────────────────────────────────────────────────

/**
 * ModuleData（新スキーマ）からサジェスト用エントリ一覧を生成する。
 * scenarios[] を対象とし、各 scenario の title / S / O / A / P を使う。
 * グローバルコーパスには drug 情報 + display.title/subtitle + categoryPath を含む。
 */
export function buildSearchIndex(moduleData: ModuleData): SearchEntry[] {
  const drug = moduleData.drug
  const drugSearch = drug?.search

  const exactAliasTokens: string[] = (drugSearch?.exactAliases ?? [])
    .map(normalizeText)
    .filter(Boolean)

  const primaryDisplayNameNorm = normalizeText(drugSearch?.primaryDisplayName ?? '')

  const rawAliases: string[] = [
    ...(drug?.nameAliases ?? []),
    ...(drugSearch?.nameAliases ?? []),
    ...(drug?.brandNames ?? []),
  ]
  const aliasTokens = rawAliases.map(normalizeText).filter(Boolean)

  const keywordTexts: string[] = drugSearch?.keywords ?? []

  // グローバルコーパス: drug情報 + display.title/subtitle + categoryPath
  const globalTags: string[] = [
    ...(drug?.drugSpecificTags ?? []),
    ...(drug?.drugClass ?? []),
    ...(drug?.brandNames ?? []),
    ...rawAliases,
    ...keywordTexts,
    moduleData.display?.title ?? '',
    moduleData.display?.subtitle ?? '',
    ...(moduleData.categoryPath ?? []),
  ]
  const globalCorpus = normalizeText(globalTags.join(' '))

  const exampleDrugName = drug?.brandNames?.[0]
  const brandNames = drug?.brandNames ?? []

  // brandCatalog[brand].aliases を正規化してマップ化（matchedBrandName 精度向上用）
  // brandCatalog[brand].genericName もマップ化（一般名検索時の drugDisplayLabel 解決用）
  const brandCatalogAliasMap: Record<string, string[]> = {}
  const brandCatalogGenericMap: Record<string, string> = {}
  const brandCatalog = drug?.brandCatalog ?? {}
  for (const [brand, entry] of Object.entries(brandCatalog)) {
    const aliases = (entry as { aliases?: string[]; genericName?: string }).aliases ?? []
    brandCatalogAliasMap[brand] = aliases.map(normalizeText).filter(Boolean)
    // displayGenericName を優先（Topbar・S先頭文・{{drug_subject}} 解決で統一表示するため）
    const e = entry as { displayGenericName?: string; genericName?: string }
    const resolvedGenericName = e.displayGenericName ?? e.genericName
    if (resolvedGenericName) brandCatalogGenericMap[brand] = resolvedGenericName
  }

  // 剤形識別トークン（AND 検索の第2トークン以降で優先評価）
  const formulationTokens: string[] = (drugSearch?.formulationSearchTokens ?? [])
    .map(normalizeText)
    .filter(Boolean)

  const suppressOnExactHit =
    drugSearch?.matchPolicy?.suppressCrossModuleSuggestionsOnExactHit ?? false
  const priority = drugSearch?.priority ?? 0

  return moduleData.scenarios.map(scenario => {
    // per-scenario コーパス: title + scenarioGroup + S / O / A / P 全文
    const perScenario = [
      scenario.title,
      scenario.scenarioGroup,
      scenario.S ?? '',
      scenario.O ?? '',
      scenario.A ?? '',
      scenario.P ?? '',
    ].join(' ')
    const corpus = normalizeText(perScenario) + ' ' + globalCorpus
    const groupLabel = getMenuGroupFromScenario(scenario)

    return {
      templateId: scenario.globalId,
      moduleId: moduleData.moduleId,
      corpus,
      exactAliasTokens,
      primaryDisplayNameNorm,
      aliasTokens,
      label: scenario.title,
      shortLabel: scenario.title,  // 新スキーマでは title が既に短縮形
      groupLabel,
      drugDisplayLabel: exampleDrugName,
      suppressOnExactHit,
      priority,
      brandNames,
      brandCatalogAliasMap,
      brandCatalogGenericMap,
      formulationTokens,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// D) サジェスト検索（スコアリング）
// ─────────────────────────────────────────────────────────────

export interface SuggestionItem {
  templateId: string
  moduleId: string
  label: string
  shortLabel: string
  groupLabel: string
  drugDisplayLabel?: string
  /**
   * 検索クエリに最も近かったブランド名。
   * exactAliases / aliasTokens でヒットしたブランドを特定して格納。
   * ブランド特定できない場合は undefined（DashboardClient 側でフォールバック）。
   */
  matchedBrandName?: string
}

/**
 * クエリに最も近いブランド名を特定し、UI表示用の正式ブランド名を返す。
 *
 * 【重要】戻り値の不変条件:
 *   - 必ず drug.brandNames[] の要素をそのまま返す（正式表示名）
 *   - alias / normalized token / raw input / partial match string を返してはいけない
 *   - 戻り値は drugDisplayLabel / matchedBrandName としてUIに直接表示される前提である
 *   - 照合はクエリ（正規化済み）との比較に alias を使うが、返すのは常に正式ブランド名
 *
 * 照合順（優先度 高→低）:
 *   1) brandNames[i] の正規化 === q（正式名と完全一致）
 *   2) brandCatalogAliasMap[brand] のいずれか === q（エイリアスと完全一致）
 *   3) brandNames[i] の正規化.startsWith(q)（正式名の前方一致）
 *   4) brandCatalogAliasMap[brand] のいずれか.startsWith(q)（エイリアスの前方一致）
 *   5) brandNames[i] の正規化.includes(q)（正式名の部分一致）
 *
 * いずれにも一致しない場合は undefined を返す（DashboardClient 側でフォールバック）。
 */
function resolveBrandName(entry: SearchEntry, q: string): string | undefined {
  // 1. 正式ブランド名と完全一致
  for (const officialBrandName of entry.brandNames) {
    if (normalizeText(officialBrandName) === q) return officialBrandName
  }
  // 2. ブランド固有エイリアスと完全一致 → 対応する正式ブランド名を返す
  for (const officialBrandName of entry.brandNames) {
    const aliases = entry.brandCatalogAliasMap[officialBrandName] ?? []
    if (aliases.some(a => a === q)) return officialBrandName
  }
  // 3. 正式ブランド名の前方一致
  for (const officialBrandName of entry.brandNames) {
    if (normalizeText(officialBrandName).startsWith(q)) return officialBrandName
  }
  // 4. ブランド固有エイリアスの前方一致 → 対応する正式ブランド名を返す
  for (const officialBrandName of entry.brandNames) {
    const aliases = entry.brandCatalogAliasMap[officialBrandName] ?? []
    if (aliases.some(a => a.startsWith(q))) return officialBrandName
  }
  // 5. 正式ブランド名の部分一致（1文字では暴発するためq.length >= 2 でガード）
  if (q.length >= 2) {
    for (const officialBrandName of entry.brandNames) {
      if (normalizeText(officialBrandName).includes(q)) return officialBrandName
    }
  }
  return undefined
}

function scoreEntry(entry: SearchEntry, q: string): number {
  for (const alias of entry.exactAliasTokens) {
    if (alias === q) return 7
  }
  if (entry.primaryDisplayNameNorm && entry.primaryDisplayNameNorm === q) return 6
  for (const alias of entry.aliasTokens) {
    if (alias === q) return 5
  }
  for (const alias of entry.aliasTokens) {
    if (alias.startsWith(q)) return 4
  }
  const normLabel = normalizeText(entry.label)
  if (normLabel.startsWith(q)) return 2
  for (const alias of entry.aliasTokens) {
    if (alias.includes(q)) return 2
  }
  if (normLabel.includes(q)) return 1
  if (entry.corpus.includes(q)) return 1
  return 0
}

/**
 * スペース区切りクエリを正規化済みトークン列に分割する。
 * トークンが 1 件のときは既存の単一文字列検索と同等になる。
 */
function tokenizeQuery(query: string): string[] {
  return query.trim().split(/\s+/).map(normalizeText).filter(Boolean)
}

/**
 * 剤形識別トークンによるスコアリング。
 * - 完全一致 → 6（exactAlias 相当。剤形を明確に指定した場合）
 * - 前方一致 → 4（alias_pfx 相当。短縮入力での剤形絞り込み）
 * - その他   → 0（マッチなし。scoreEntry にフォールバックさせる）
 *
 * formulationTokens が空のモジュール（eye_drops 等）では常に 0 を返す。
 */
function scoreFormulation(entry: SearchEntry, q: string): number {
  for (const ft of entry.formulationTokens) {
    if (ft === q) return 6
    if (ft.startsWith(q)) return 4
  }
  return 0
}

/**
 * AND 検索の第2トークン以降用スコアリング。
 * 「剤形・検索補助トークン」として扱い、corpus へのフォールバックを禁止する。
 *
 * 評価順（優先度 高→低）:
 *   1) scoreFormulation（formulationTokens との完全一致→6 / 前方一致→4）
 *   2) exactAliasTokens との完全一致 → 7
 *   3) primaryDisplayNameNorm との完全一致 → 6
 *   4) aliasTokens との完全一致 → 5
 *   5) aliasTokens の前方一致 → 4
 *   6) label の前方一致 → 2
 *   7) aliasTokens の部分一致 → 2
 *   8) label の部分一致 → 1
 *   ※ corpus.includes() は評価しない（SOAP本文への誤爆を防ぐ）
 *
 * formulationTokens が空かつ alias/label にもマッチしない場合は 0 を返し、AND 除外する。
 */
function scoreSecondaryToken(entry: SearchEntry, q: string): number {
  // 1. formulationTokens を優先評価
  const fs = scoreFormulation(entry, q)
  if (fs > 0) return fs
  // 2–5. 明示された検索フィールドのみ評価（corpus は含まない）
  for (const alias of entry.exactAliasTokens) {
    if (alias === q) return 7
  }
  if (entry.primaryDisplayNameNorm && entry.primaryDisplayNameNorm === q) return 6
  for (const alias of entry.aliasTokens) {
    if (alias === q) return 5
  }
  for (const alias of entry.aliasTokens) {
    if (alias.startsWith(q)) return 4
  }
  const normLabel = normalizeText(entry.label)
  if (normLabel.startsWith(q)) return 2
  for (const alias of entry.aliasTokens) {
    if (alias.includes(q)) return 2
  }
  if (normLabel.includes(q)) return 1
  // corpus.includes(q) は評価しない
  return 0
}

/**
 * トークン列に対して AND スコアを計算する。
 * - トークンが 1 件: scoreEntry をそのまま使用（既存挙動と同一）
 * - トークンが 2 件以上: 全トークンが score > 0 のときのみ採用（AND 除外）。
 *   第1トークン → scoreEntry（薬剤名マッチ、corpus フォールバックあり）
 *   第2トークン以降 → scoreSecondaryToken（corpus フォールバックなし）
 * - いずれか 1 トークンでも score = 0 なら 0 を返す（AND 除外）。
 */
function scoreEntryAND(entry: SearchEntry, tokens: string[]): number {
  if (tokens.length === 1) return scoreEntry(entry, tokens[0])
  let total = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const s = i === 0 ? scoreEntry(entry, t) : scoreSecondaryToken(entry, t)
    if (s === 0) return 0
    total += s
  }
  return total
}

export function getSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): SuggestionItem[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []
  const q = tokens[tokens.length - 1]  // ブランド名解決用（末尾トークン or 単一）

  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntryAND(index[i], tokens)
    if (score > 0) scored.push({ entry: index[i], score, originalIndex: i })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    b.entry.priority - a.entry.priority ||
    a.originalIndex - b.originalIndex,
  )

  const topScore = scored[0]?.score ?? 0
  let filtered = scored
  let suppressModuleIds: Set<string> | null = null
  if (topScore >= 5) {
    const suppressCandidates = scored.filter(s => s.score >= 5 && s.entry.suppressOnExactHit)
    if (suppressCandidates.length > 0) {
      suppressModuleIds = new Set(suppressCandidates.map(s => s.entry.moduleId))
      const nonSuppressFiltered = scored.filter(s => !suppressModuleIds!.has(s.entry.moduleId))
      const suppressRepresentatives: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
      for (const moduleId of suppressModuleIds) {
        const rep = scored.find(s => s.entry.moduleId === moduleId)
        if (rep) suppressRepresentatives.push(rep)
      }
      filtered = [...suppressRepresentatives, ...nonSuppressFiltered]
    }
  }

  const seenShortLabels = new Set<string>()
  const seenSuppressModules = new Set<string>()
  const results: SuggestionItem[] = []

  for (const { entry } of filtered) {
    if (results.length >= limit) break
    if (suppressModuleIds?.has(entry.moduleId)) {
      if (seenSuppressModules.has(entry.moduleId)) continue
      seenSuppressModules.add(entry.moduleId)
    }
    if (seenShortLabels.has(entry.shortLabel)) continue
    seenShortLabels.add(entry.shortLabel)

    // 全トークンを順に評価し、最初にブランド名が特定できたトークンを採用する。
    // lastToken だけでは 1 文字トークン（く/な/ろ）が全ステップ不一致になり
    // undefined フォールバック → brandNames[0] 固定という問題を防ぐ。
    let matchedBrandName: string | undefined
    let matchedByTokenSug: string | undefined
    for (const t of tokens) {
      const resolved = resolveBrandName(entry, t)
      if (resolved !== undefined) { matchedBrandName = resolved; matchedByTokenSug = t; break }
    }
    // isDirectBrandMatch: マッチしたトークンがブランド名本体と直接 eq/startsWith するか
    const isDirectBrandMatchSug = matchedBrandName !== undefined && matchedByTokenSug !== undefined &&
      entry.brandNames.some(b => normalizeText(b) === matchedByTokenSug || normalizeText(b).startsWith(matchedByTokenSug!))
    const resolvedDisplayLabelSug = (() => {
      if (!matchedBrandName) return entry.drugDisplayLabel
      if (isDirectBrandMatchSug) return matchedBrandName
      return entry.brandCatalogGenericMap[matchedBrandName] ?? matchedBrandName
    })()
    results.push({
      templateId: entry.templateId,
      moduleId: entry.moduleId,
      label: entry.label,
      shortLabel: entry.shortLabel,
      groupLabel: entry.groupLabel,
      drugDisplayLabel: resolvedDisplayLabelSug ?? entry.drugDisplayLabel,
      matchedBrandName,
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// E) 薬剤専用サジェスト（シナリオを除く・モジュール単位）
// ─────────────────────────────────────────────────────────────

/**
 * DrugSuggestionItem — モジュール（薬剤）単位の候補。
 * templateId はそのモジュールの代表シナリオ（先頭）のIDであり、
 * 薬剤選択後のモジュール特定に使う。
 */
export interface DrugSuggestionItem {
  moduleId: string
  /** 表示用薬剤名（brandNames[0] / primaryDisplayName） */
  drugDisplayLabel: string
  /** クエリに最もマッチしたブランド名 */
  matchedBrandName?: string
  /**
   * SOAP {{drug_subject}} / ノード表示に使う名前。
   * 通常フローでは matchedBrandName と同値（undefined）。
   * Express GEモード選択時に GE名が入る。
   * undefined のとき matchedBrandName にフォールバックする。
   */
  displayName?: string
  /** モジュール代表シナリオのID（モジュール特定用） */
  representativeTemplateId: string
}

/**
 * 薬剤（モジュール）単位のサジェスト候補を返す。
 * 各モジュールから代表1件のみ選出し、シナリオ名はドロップダウンに出さない。
 * getSuggestions と同じスコアリングを使いつつ、moduleId でデデュープする。
 */
export function getDrugSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): DrugSuggestionItem[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []
  const q = tokens[tokens.length - 1]  // ブランド名解決用（末尾トークン or 単一）

  // スコアリング（getSuggestions と同じロジック、AND 対応）
  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntryAND(index[i], tokens)
    if (score > 0) scored.push({ entry: index[i], score, originalIndex: i })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    b.entry.priority - a.entry.priority ||
    a.originalIndex - b.originalIndex,
  )

  // moduleId 単位でデデュープ（先頭＝最高スコア代表のみ採用）
  const seenModules = new Set<string>()
  const results: DrugSuggestionItem[] = []

  for (const { entry } of scored) {
    if (results.length >= limit) break
    if (seenModules.has(entry.moduleId)) continue
    seenModules.add(entry.moduleId)

    // 全トークンを順に評価し、最初にブランド名が特定できたトークンを採用する。
    // lastToken だけでは 1 文字トークン（く/な/ろ）が全ステップ不一致になり
    // undefined フォールバック → brandNames[0] 固定という問題を防ぐ。
    let matchedBrandName: string | undefined
    let matchedByToken: string | undefined
    for (const t of tokens) {
      const resolved = resolveBrandName(entry, t)
      if (resolved !== undefined) { matchedBrandName = resolved; matchedByToken = t; break }
    }
    // isDirectBrandMatch: マッチしたトークンがブランド名本体と直接 eq/startsWith するか。
    // true → ブランド名をそのまま表示。false → brandCatalogGenericMap の表示一般名を使用。
    const isDirectBrandMatch = matchedBrandName !== undefined && matchedByToken !== undefined &&
      entry.brandNames.some(b => normalizeText(b) === matchedByToken || normalizeText(b).startsWith(matchedByToken!))
    const resolvedDisplayLabel = (() => {
      if (!matchedBrandName) return entry.drugDisplayLabel ?? entry.brandNames[0] ?? entry.moduleId
      if (isDirectBrandMatch) return matchedBrandName
      return entry.brandCatalogGenericMap[matchedBrandName] ?? matchedBrandName
    })()
    results.push({
      moduleId: entry.moduleId,
      drugDisplayLabel: resolvedDisplayLabel,
      matchedBrandName,
      representativeTemplateId: entry.templateId,
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// F) フィルタ（後方互換エクスポート）
// ─────────────────────────────────────────────────────────────

export function filterTemplates(
  scenarios: Scenario[],
  query: string,
  index: SearchEntry[],
): Scenario[] {
  const q = normalizeText(query)
  if (!q) return scenarios
  const hitIds = new Set(
    index.filter(e => e.corpus.includes(q)).map(e => e.templateId),
  )
  return scenarios.filter(s => hitIds.has(s.globalId))
}
