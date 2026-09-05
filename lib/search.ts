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
import type { BrandResolution, MatchStrength } from './brandResolution'
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
/**
 * normalizeText が除去する区切り文字パターン（空白・中点・ハイフン系）。
 * buildSearchIndex 側で「区切り文字で分割してからトークンごとに正規化する」際に
 * normalizeText と同一の区切り文字集合を使うことで、区切り文字をまたいだ
 * ゴースト一致（例: display.subtitle の「アレグラ・クラリチン・ザイザル」のような
 * 「・」区切り列挙が単一トークンとして残ってしまう問題）を防止する。
 */
const SEPARATOR_PATTERN = /[\s\u3000\u30FB\u00B7\-_/()（）・]/

export function normalizeText(s: string): string {
  return kataToHira(
    s.normalize('NFKC')
      .toLowerCase()
      .replace(new RegExp(SEPARATOR_PATTERN.source, 'g'), ''),
  )
}

// ─────────────────────────────────────────────────────────────
// B) 検索エントリ
// ─────────────────────────────────────────────────────────────

export interface SearchEntry {
  /** 新スキーマ: scenario.globalId（アプリ全体で一意） */
  templateId: string
  moduleId: string
  /**
   * 正規化済みコーパストークン配列（旧 corpus: string から置換）。
   * 各トークンは個別に normalizeText() 済みであり、結合前に正規化することで
   * トークン境界をまたいだ部分一致（ゴースト一致）を構造的に防止する。
   * 部分一致判定は必ず `corpusTokens.some(t => t.includes(q))` のように
   * 単一トークン内で行うこと（結合してからの includes は禁止）。
   */
  corpusTokens: string[]
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
   * ブランド名 → 一般名（表示専用。brandCatalog[brand].displayGenericName ?? genericName から構築）。
   * 一般名検索時に drugDisplayLabel を一般名寄りに解決するために使用。
   * 同一成分グルーピングの判定には使わない（→ brandCatalogGenericKeyMap を使う）。
   */
  brandCatalogGenericMap: Record<string, string>
  /**
   * ブランド名 → 一般名グルーピングキー（判定専用）。
   * brandCatalog[brand].genericKey ?? displayGenericName ?? genericName の優先順で構築。
   * 「同一成分として展開してよいか」の判定にのみ使用し、表示文字列には使わない。
   */
  brandCatalogGenericKeyMap: Record<string, string>
  /**
   * 剤形識別トークン（drug.search.formulationSearchTokens の正規化済みリスト）。
   * AND 検索の第2トークン以降でこのリストを優先評価し、剤形による絞り込みを強化する。
   * 未定義モジュールでは空配列となり、既存の scoreEntry にフォールバックする。
   */
  formulationTokens: string[]
  /** drug.search.matchPolicy.preferOwnNameMatchOverGenericMatch のコピー（既定 false） */
  preferOwnNameMatchOverGenericMatch: boolean
  /** drug.search.matchPolicy.suppressRedundantGenericHeaderOnDirectMatch のコピー（既定 false） */
  suppressRedundantGenericHeaderOnDirectMatch: boolean
  /** drug.search.matchPolicy.crossModuleIndicationLabel のコピー（既定 false） */
  crossModuleIndicationLabel: boolean
  /**
   * ブランド名 → 適応ラベル（例: "糖尿病"/"心・腎"/"腎"）。
   * crossModuleIndicationLabel が有効なモジュールでのみ使用する。
   * categoryPath[0] と brandCatalog[brand].handlingTags
   * （heart_failure_supported / ckd_supported）から動的に導出する。
   */
  brandCatalogIndicationLabelMap: Record<string, string>
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
  // 各タグは個別に normalizeText() してからトークン配列として保持する（結合してから
  // 正規化すると、トークン境界をまたいだ部分一致＝ゴースト一致が発生するため禁止）。
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
  // 各タグを SEPARATOR_PATTERN で分割してから正規化する。
  // display.subtitle 等、著者が「・」区切りでブランド名を列挙した単一フィールド
  // （例:「アレグラ・クラリチン・ザイザル・ビラノア 他」）が1トークンのまま残ると、
  // フィールド内部でも境界またぎのゴースト一致が発生するため、区切り文字ごとに
  // 独立したトークンへ分割する。区切り文字を持たないタグ（ブランド名単体等）は
  // 分割してもそのまま1要素の配列になるため無害。
  const globalCorpusTokens: string[] = globalTags
    .flatMap(tag => tag.split(SEPARATOR_PATTERN))
    .map(normalizeText)
    .filter(Boolean)

  const exampleDrugName = drug?.brandNames?.[0]
  const brandNames = drug?.brandNames ?? []

  // brandCatalog[brand].aliases を正規化してマップ化（matchedBrandName 精度向上用）
  // brandCatalog[brand].displayGenericName もマップ化（一般名検索時の drugDisplayLabel 解決用）
  const brandCatalogAliasMap: Record<string, string[]> = {}
  const brandCatalogGenericMap: Record<string, string> = {}
  const brandCatalogGenericKeyMap: Record<string, string> = {}
  const brandCatalog = drug?.brandCatalog ?? {}
  for (const [brand, entry] of Object.entries(brandCatalog)) {
    const aliases = (entry as { aliases?: string[]; genericName?: string }).aliases ?? []
    brandCatalogAliasMap[brand] = aliases.map(normalizeText).filter(Boolean)
    // displayGenericName は BrandEntry 上で必須（表示用一般名のSSOT。genericName へはフォールバックしない）。
    // ここでの truthy チェックは型を疑ってのものではなく、ModuleValidator を経由しない
    // 未知データ（テスト用フィクスチャ等）に対する局所的な防御としてのみ残す。
    const resolvedGenericName = entry.displayGenericName
    if (resolvedGenericName) brandCatalogGenericMap[brand] = resolvedGenericName
    // グルーピング判定専用キー: genericKey が未設定のモジュールは表示文字列に後方互換フォールバックする
    const resolvedGenericKey = entry.genericKey ?? resolvedGenericName
    if (resolvedGenericKey) brandCatalogGenericKeyMap[brand] = resolvedGenericKey
  }

  // 剤形識別トークン（AND 検索の第2トークン以降で優先評価）
  const formulationTokens: string[] = (drugSearch?.formulationSearchTokens ?? [])
    .map(normalizeText)
    .filter(Boolean)

  const suppressOnExactHit =
    drugSearch?.matchPolicy?.suppressCrossModuleSuggestionsOnExactHit ?? false
  const priority = drugSearch?.priority ?? 0
  const preferOwnNameMatchOverGenericMatch =
    drugSearch?.matchPolicy?.preferOwnNameMatchOverGenericMatch ?? false
  const suppressRedundantGenericHeaderOnDirectMatch =
    drugSearch?.matchPolicy?.suppressRedundantGenericHeaderOnDirectMatch ?? false
  const crossModuleIndicationLabel =
    drugSearch?.matchPolicy?.crossModuleIndicationLabel ?? false

  // 適応ラベル（crossModuleIndicationLabel opt-in モジュールでのみ使用）:
  // categoryPath[0] を既定値とし、heart_failure_supported / ckd_supported の
  // handlingTags が付与されているブランドはそれに応じた短縮ラベルへ差し替える。
  // 新規データフィールドは追加せず、既存の categoryPath / handlingTags のみから導出する。
  const brandCatalogIndicationLabelMap: Record<string, string> = {}
  if (crossModuleIndicationLabel) {
    const cat0 = moduleData.categoryPath?.[0] ?? ''
    for (const [brand, entry] of Object.entries(brandCatalog)) {
      const tags = entry.handlingTags ?? []
      const hasHeartFailure = tags.includes('heart_failure_supported')
      const hasCkd = tags.includes('ckd_supported')
      brandCatalogIndicationLabelMap[brand] =
        hasHeartFailure && hasCkd ? '心・腎' : hasCkd ? '腎' : hasHeartFailure ? '心' : cat0
    }
  }

  return moduleData.scenarios.map(scenario => {
    // per-scenario コーパス: title / scenarioGroup を個別に正規化する。
    // フィールドをまとめて join してから正規化すると、フィールド境界をまたいだ
    // ゴースト一致が発生するため、各フィールドを独立したトークンとして保持する。
    //
    // SOAP 本文（S / O / A / P）は検索コーパスへ含めない（F-1 Stage 4-a）。
    // 薬剤検索の対象は構造化メタデータ（brand / generic / alias / 剤形 /
    // 薬効領域 / 薬効分類）に限定し、SOAP 本文から偶然語句を拾う方式を排除する。
    // 設計根拠: docs/reviews/f1/F1_SEARCH_MANIFEST_DESIGN_2026-07-30.md §2 / §4
    // 意図的な喪失範囲は tests/searchBodyExclusion.test.ts が仕様として固定する。
    const perScenarioTokens: string[] = [
      scenario.title,
      scenario.scenarioGroup,
    ].map(normalizeText).filter(Boolean)
    const corpusTokens: string[] = [...new Set([...perScenarioTokens, ...globalCorpusTokens])]
    const groupLabel = getMenuGroupFromScenario(scenario)

    return {
      templateId: scenario.globalId,
      moduleId: moduleData.moduleId,
      corpusTokens,
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
      brandCatalogGenericKeyMap,
      formulationTokens,
      preferOwnNameMatchOverGenericMatch,
      suppressRedundantGenericHeaderOnDirectMatch,
      crossModuleIndicationLabel,
      brandCatalogIndicationLabelMap,
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

/**
 * score/priority が同点の場合の最終 tie-break にのみ使う、解決済み表示名。
 * resolveBrandName と同じ「全トークンを順に評価し最初に一致したブランドを採用する」
 * ロジックを使い、getSuggestions/getDrugSuggestions 双方の候補表示ロジック
 * （resolvedDisplayLabelSug 等）と同じ優先順位で解決する。
 * ブランド未解決時は entry.drugDisplayLabel にフォールバックする。
 * module 固定値（entry.drugDisplayLabel 単体）を tie-break に直接使わないのは、
 * それが drug.brandNames[0]（クエリと無関係な配列先頭要素）であり、
 * 配列の宣言順が変わるだけで結果が反転しうるため。
 */
function resolveSortLabel(entry: SearchEntry, tokens: string[]): string {
  let matchedBrandName: string | undefined
  let matchedByToken: string | undefined
  for (const t of tokens) {
    const resolved = resolveBrandName(entry, t)
    if (resolved !== undefined) { matchedBrandName = resolved; matchedByToken = t; break }
  }
  if (!matchedBrandName) return entry.drugDisplayLabel ?? ''
  const isDirectBrandMatch = matchedByToken !== undefined &&
    entry.brandNames.some(b => normalizeText(b) === matchedByToken || normalizeText(b).startsWith(matchedByToken!))
  if (isDirectBrandMatch) return matchedBrandName
  return entry.brandCatalogGenericMap[matchedBrandName] ?? matchedBrandName
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
  if (entry.corpusTokens.some(t => t.includes(q))) return 1
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
 * 「剤形・検索補助トークン」として扱い、シナリオ本文・タイトル部分一致へのフォールバックを禁止する。
 *
 * 評価順（優先度 高→低）:
 *   1) scoreFormulation（formulationTokens との完全一致→6 / 前方一致→4）
 *   2) exactAliasTokens との完全一致 → 7
 *   3) primaryDisplayNameNorm との完全一致 → 6
 *   4) aliasTokens との完全一致 → 5
 *   5) aliasTokens の前方一致 → 4
 *   6) label の前方一致 → 2
 *   7) aliasTokens の部分一致 → 2
 *   ※ normLabel.includes() は評価しない（"副作用なし"等のシナリオタイトルへの誤爆を防ぐ）
 *   ※ corpus.includes() は評価しない（SOAP本文への誤爆を防ぐ）
 *
 * formulationTokens が空かつ alias/label にもマッチしない場合は 0 を返し、AND 除外する。
 */
function scoreSecondaryToken(entry: SearchEntry, q: string): number {
  // 1. formulationTokens を優先評価
  const fs = scoreFormulation(entry, q)
  if (fs > 0) return fs
  // 2–7. 明示された検索フィールドのみ評価（label部分一致・corpus は含まない）
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
  // normLabel.includes(q) は評価しない（"副作用なし"等シナリオタイトルへの誤爆を防ぐ）
  // corpus.includes(q) は評価しない（SOAP本文への誤爆を防ぐ）
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

  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number; sortLabel: string }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntryAND(index[i], tokens)
    if (score > 0) scored.push({ entry: index[i], score, originalIndex: i, sortLabel: resolveSortLabel(index[i], tokens) })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    b.entry.priority - a.entry.priority ||
    a.sortLabel.localeCompare(b.sortLabel, 'ja') ||
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
      const suppressRepresentatives: typeof scored = []
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
  /**
   * UI 表示専用のラベル（例: "ヒューマログ（インスリンリスプロ）"）。
   * 指定時は drugDisplayLabel の代わりにこちらを画面表示に使う。
   * drugDisplayLabel 自体は {{drug_subject}} 解決に使われる意味的な値のため、
   * 装飾目的の合成文字列を drugDisplayLabel に混在させない。
   */
  uiLabel?: string
  /**
   * true の場合、UI側で matchedBrandName を別途セカンドラインとして重複表示してはならない
   * （一般名単独の見出し候補など、drugDisplayLabel と matchedBrandName が意図的に異なる場合）。
   */
  isGenericLabel?: boolean
  /**
   * この候補が「何を指しているか」を表す domain state（`lib/brandResolution.ts`）。
   *
   * **既存フィールドの意味論を置き換えるものではなく、新しい semantic metadata として付与する。**
   * `matchedBrandName` / `drugDisplayLabel` / `uiLabel` / `isGenericLabel` の値は
   * 本フィールドの導入によって一切変化しない。
   *
   * **ranking / bucket / dedup / limit の入力に使用してはならない**
   * （`docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §9.2）。
   *
   * 注意: `denotation: 'generic'` / `'module'` の候補では、`resolution.subject` が
   * `drugDisplayLabel` と一致しないことがある。これは意図された設計であり、
   * `drugDisplayLabel` が `brandNames[0]` へ縮退している既存の欠陥を
   * `resolution` 側が正しく表現しているためである。この差が実際の挙動へ現れるのは
   * consumer が `resolution` を参照し始める U-4 / U-5 以降である。
   */
  resolution: BrandResolution
  /**
   * クエリ先頭トークンの一致の強さ（`lib/brandResolution.ts`）。
   * `resolution` と直交する軸であり、同様に ranking の入力に使用してはならない。
   */
  matchStrength: MatchStrength
}

/**
 * module の brand 構成（既存 SearchEntry フィールドのみから導出する）。
 * brand が一切解決できなかった候補の denotation 判定に用いる。
 */
function resolveModuleShape(entry: SearchEntry): {
  brandCount: number
  groups: Map<string, string[]>
} {
  const groups = new Map<string, string[]>()
  for (const b of entry.brandNames) {
    const key = entry.brandCatalogGenericKeyMap[b]
    if (key === undefined) continue
    const list = groups.get(key)
    if (list) list.push(b)
    else groups.set(key, [b])
  }
  return { brandCount: entry.brandNames.length, groups }
}

/**
 * brand が解決できなかった候補（lowConfidence 経路）の resolution を、
 * module の静的構造から決定論的に導出する。
 *
 * - brand が 1 件      → module 同定は brand 同定を含意する（推測ではなく論理的導出）
 * - generic group 1 件 → 一般名主語として確定できる
 * - それ以外           → 未確定（subject を生成しない）
 */
function deriveUnresolvedResolution(entry: SearchEntry): BrandResolution {
  const { brandCount, groups } = resolveModuleShape(entry)
  if (brandCount === 1) {
    const only = entry.brandNames[0]
    return { denotation: 'brand', brandKey: only, subject: only }
  }
  if (groups.size === 1) {
    const [genericKey, brandKeys] = [...groups.entries()][0]
    const subject = entry.brandCatalogGenericMap[brandKeys[0]]
    if (subject) return { denotation: 'generic', genericKey, brandKeys, subject }
  }
  return { denotation: 'module', brandKey: null, subject: null }
}

/**
 * 一般名グループを指す候補（generic header）の resolution を組み立てる。
 *
 * **grouping key は呼び出し元が保持している値をそのまま受け取る。**
 * `brandCatalogGenericKeyMap` から再導出しないため、「key を解決できない」という
 * 状態が構造的に発生しない（silent fallback を持ち込まないための設計）。
 *
 * **authoritative な単一 brandKey は持たせない。** group 内の代表 brand から
 * handlingTags 等を取得することは禁止であり、その方法は U-8 で判断する。
 */
function makeGenericResolution(
  entry: SearchEntry,
  genericKey: string,
  subject: string,
): BrandResolution {
  const brandKeys = entry.brandNames.filter(b => entry.brandCatalogGenericKeyMap[b] === genericKey)
  return { denotation: 'generic', genericKey, brandKeys, subject }
}

/**
 * 単一 brand を指す候補の resolution。
 * `subject` には候補の表示ラベルを用いる（現行の SOAP 主語解決結果と一致させるため）。
 */
function makeBrandResolution(brandKey: string, subject: string): BrandResolution {
  return { denotation: 'brand', brandKey, subject }
}

/**
 * クエリ先頭トークンの一致の強さを、既存 scoreEntry の戻り値から決定論的に導出する。
 *
 * **scoreEntry 自体は変更しない**（純粋関数の再呼び出しのみ）。閾値は 4 とする:
 *   7 exactAlias / 6 primaryDisplayName / 5 aliasExact / 4 aliasPrefix → strong
 *   2 labelPrefix・aliasIncludes / 1 labelIncludes・corpusIncludes     → weak
 *
 * score 2 は「構造化フィールドの部分一致」と「シナリオタイトルの前方一致」の双方から
 * 到達し score だけでは分離できないため、保守的に weak 側へ寄せる（Owner Decision U2-1）。
 */
function deriveMatchStrength(entry: SearchEntry, primaryToken: string): MatchStrength {
  return scoreEntry(entry, primaryToken) >= 4 ? 'strong' : 'weak'
}

/**
 * 薬剤（モジュール）単位のサジェスト候補を返す。
 * 各モジュールから代表1件のみ選出し、シナリオ名はドロップダウンに出さない。
 * getSuggestions と同じスコアリングを使いつつ、moduleId でデデュープする。
 */
/**
 * クエリ q に対して priority 1–4（完全一致・前方一致）で一致するブランド名をすべて返す。
 * priority 5（部分一致）は一般名を含む広範クエリで全ブランドが暴発するため除外する。
 * 同一モジュール内の複数ブランドを候補として列挙するために使用する。
 *
 * priority 1–4 は brandNames / brandCatalog[brand].aliases（表記揺れ）のみを見るため、
 * 一般名のフルストリング自体がクエリの module の brandCatalog[brand].aliases に
 * 複製されていない場合は該当ブランドを1件も返せない（Q-S1）。
 * これを避けるため、brandCatalogGenericMap（brand → displayGenericName ?? genericName）
 * との完全一致・前方一致も同精度で追加評価する。
 * この一致判定は「クエリ文字列がこのブランド自身の一般名と一致するか」の
 * 1ブランド単位の判定にのみ使い、「どのブランドを同一成分としてまとめるか」という
 * グルーピング判断（genericKey の役割）には使わない（RULES.md §21）。
 */
/**
 * ブランドの一致根拠を示す tier。
 *   1 = 自身のブランド識別（正式名／alias の完全一致・前方一致。priority 1-4）
 *   2 = brandCatalog.genericName 経由のみの一致（priority 5-6）
 * preferOwnNameMatchOverGenericMatch が有効なモジュールでのみ、tier1 を tier2 より
 * 優先する並び替えに使用する（RULES.md 新設 §matchPolicy 拡張・2026-07 確定）。
 *
 * tier2 の一致対象は本来 displayGenericName 自体（priority 5-6）のみだったが、
 * DP-18（一般名の読みaliasは一般名候補にのみ帰属し、ペアの先発品エントリへ複製しない）
 * を守ったまま「先発品の一般名読みでのフルクエリ」を先発品自身の候補として復元するには、
 * ペアの一般名候補が保持する alias（displayGenericName の文字列一致だけではカバーできない
 * 送り仮名・読みのバリエーション。例:「てんがん」等の剤形かな読みを含むalias）をも
 * tier2 の一致面として評価できる必要がある（2026-09 追加）。
 * これらの alias の所有権は一般名候補側に残ったままであり、先発品側の own alias（tier1）
 * には一切追加されない。preferOwnNameMatchOverGenericMatch が有効な同一
 * genericKey/グルーピング内のペアに限定してのみ適用する（他モジュールへの波及や
 * metformin/pioglitazone等の異なるgenericKeyを持つペアへの誤爆を防ぐための必須ゲート）。
 */
type BrandMatchTier = 1 | 2

function resolveAllHighPrecisionBrands(entry: SearchEntry, q: string): Array<{ brand: string; tier: BrandMatchTier }> {
  const matched = new Map<string, BrandMatchTier>()
  for (const b of entry.brandNames) {
    const norm = normalizeText(b)
    const aliases = entry.brandCatalogAliasMap[b] ?? []
    const generic = entry.brandCatalogGenericMap[b]
    const normGeneric = generic ? normalizeText(generic) : undefined
    const ownNameMatch =
      norm === q ||                                    // priority 1: 正式名完全一致
      aliases.some(a => a === q) ||                    // priority 2: alias 完全一致
      norm.startsWith(q) ||                            // priority 3: 正式名前方一致
      aliases.some(a => a.startsWith(q))                // priority 4: alias 前方一致
    // ペアの一般名候補が保持する alias を tier2 の一致面として追加評価する。
    // 一般名候補自身のエントリ（generic === b）は対象外（自分自身は既に ownNameMatch 側で判定済み）。
    // 同一グルーピングキー（genericKey が無ければ displayGenericName にフォールバック）を
    // 共有するペアに限定することで、「既に同一表示単位として扱われている」ことが
    // データ上保証されている関係にのみ適用する。
    const pairedSameGroup =
      generic !== undefined && generic !== b &&
      entry.brandCatalogGenericKeyMap[b] !== undefined &&
      entry.brandCatalogGenericKeyMap[b] === entry.brandCatalogGenericKeyMap[generic]
    const pairedGenericAliases =
      entry.preferOwnNameMatchOverGenericMatch && pairedSameGroup
        ? (entry.brandCatalogAliasMap[generic!] ?? [])
        : []
    const genericOnlyMatch =
      normGeneric === q ||                             // priority 5: displayGenericName 完全一致
      (normGeneric !== undefined && normGeneric.startsWith(q)) || // priority 6: displayGenericName 前方一致
      pairedGenericAliases.some(a => a === q || a.startsWith(q))  // priority 6b: ペア一般名候補の alias 経由
    if (ownNameMatch) {
      matched.set(b, 1)
    } else if (genericOnlyMatch && !matched.has(b)) {
      matched.set(b, 2)
    }
  }
  return [...matched.entries()].map(([brand, tier]) => ({ brand, tier }))
}

/**
 * クエリの全トークンのうち、指定ブランドの正式名・alias・一般名のいずれかに
 * 含まれるトークン数を数える（数字・XR/OD/HD等の剤形サフィックスを特別扱いしない
 * 汎用ロジック）。同一ファミリー/同一一般名グループ内で、より多くのトークンに
 * 一致した候補を上位表示するための並び替えキーとして使う。
 * tokens[0] は候補選定条件そのものなので通常は全候補が一致し、
 * tokens[1] 以降（数字・剤形サフィックス等）の一致差でグループ内の順位が変わる。
 */
function countMatchedTokens(entry: SearchEntry, brand: string, tokens: string[]): number {
  const normBrand = normalizeText(brand)
  const aliases = entry.brandCatalogAliasMap[brand] ?? []
  const generic = entry.brandCatalogGenericMap[brand]
  const normGeneric = generic ? normalizeText(generic) : undefined
  let count = 0
  for (const t of tokens) {
    if (
      normBrand.includes(t) ||
      aliases.some(a => a.includes(t)) ||
      (normGeneric !== undefined && normGeneric.includes(t))
    ) {
      count++
    }
  }
  return count
}

/**
 * 正規化済みブランド名またはそのエイリアスに PF 指示子（"pf" / "ぴーえふ"）を含むか判定する。
 * brandCatalogAliasMap はビルド時に normalizeText 済みのため、追加の正規化は不要。
 */
function isPFBrand(entry: SearchEntry, brand: string): boolean {
  const norm = normalizeText(brand)
  if (norm.includes('pf') || norm.includes('ぴーえふ')) return true
  const aliases = entry.brandCatalogAliasMap[brand] ?? []
  return aliases.some(a => a.includes('pf') || a.includes('ぴーえふ'))
}

export function getDrugSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): DrugSuggestionItem[] {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return []

  // クエリに "pf" または "ぴーえふ" が単独トークンとして含まれる場合、
  // PF 品のみを候補に残す（isPFBrand でフィルタ）。
  // normalizeText 後の形が "pf" / "ぴーえふ" に一致するすべての入力変種（PF / ＰＦ / ピーエフ 等）を捕捉する。
  const PF_TOKENS = new Set(['pf', 'ぴーえふ'])
  const hasPFQuery = tokens.some(t => PF_TOKENS.has(t))

  // crossModuleIndicationLabel が有効なモジュール間で、実際に複数モジュールにまたがって
  // 存在する genericKey のみを特定する。単一モジュールにしか存在しないブランド
  // （例: crossModuleIndicationLabel が有効なモジュール内でも、他モジュールに同一成分の
  // ブランドが存在しない場合）は対象外とし、通常どおり一般名を表示する。
  const genericKeyModuleIds = new Map<string, Set<string>>()
  for (const entry of index) {
    if (!entry.crossModuleIndicationLabel) continue
    for (const key of Object.values(entry.brandCatalogGenericKeyMap)) {
      if (!genericKeyModuleIds.has(key)) genericKeyModuleIds.set(key, new Set())
      genericKeyModuleIds.get(key)!.add(entry.moduleId)
    }
  }
  const multiModuleGenericKeys = new Set(
    [...genericKeyModuleIds.entries()].filter(([, mods]) => mods.size >= 2).map(([key]) => key),
  )

  // スコアリング（AND 対応）
  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number; sortLabel: string }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntryAND(index[i], tokens)
    if (score > 0) scored.push({ entry: index[i], score, originalIndex: i, sortLabel: resolveSortLabel(index[i], tokens) })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    b.entry.priority - a.entry.priority ||
    a.sortLabel.localeCompare(b.sortLabel, 'ja') ||
    a.originalIndex - b.originalIndex,
  )

  // 候補は最終的に4つのバケツへ振り分け、
  // [genericMode] → [direct] → [sibling] → [genericHeader] の順で結合する。
  //
  // - genericMode: 一般名（成分名）検索の結果（見出し→同一genericKeyブランド群、
  //   モジュールごとの相対順序をそのまま維持する）
  // - direct: ブランド名検索で入力に直接一致したブランド候補（モジュール横断でまとめる）
  // - sibling: ブランド名検索で同一genericKeyの併売ブランド候補（モジュール横断でまとめる）
  // - genericHeader: ブランド名検索時の一般名単独候補（モジュール横断で最後にまとめる）
  //
  // これにより、同一ブランドファミリー（例: ヒューマリン系）が複数モジュール
  // （regular / intermediate / mixed 等）に分散していても、直接一致ブランドが
  // 先頭にまとまって表示される。
  // lowConfidence: ブランド名・一般名のいずれも解決できず、corpus部分一致（keywords等の
  // 弱い一致）だけで候補に残ったエントリ専用のバケツ。genericMode（正当な一般名検索）とは
  // 区別し、既存4バケツをすべて処理し終えた後、残り枠がある場合のみ追加する。
  type Bucket = 'genericMode' | 'direct' | 'sibling' | 'genericHeader' | 'lowConfidence'
  interface BucketedCandidate {
    moduleId: string
    templateId: string
    brand: string | undefined
    displayLabel: string
    uiLabel?: string
    isGenericLabel?: boolean
    dedupKeyOverride?: string
    /**
     * クエリの全トークンのうち、このブランドの正式名・alias・一般名に一致した数。
     * ファミリーグルーピング後の並び替え（第2トークン以降による優先順位付け）に使う。
     */
    tokenMatchScore: number
    /**
     * 生成地点で確定した domain state。**バケツ振り分け・並び替え・dedup には使用しない**
     * （semantic metadata として最終結果へ透過的に転送するのみ）。
     */
    resolution: BrandResolution
    /** 同上。ranking へは使用しない。 */
    matchStrength: MatchStrength
  }
  const bucketed: Record<Bucket, BucketedCandidate[]> = {
    genericMode: [],
    direct: [],
    sibling: [],
    genericHeader: [],
    lowConfidence: [],
  }

  // 単一トークンのクエリが、いずれかのモジュールの「完全な一般名識別」
  // （brandCatalogGenericMap 経由の displayGenericName 完全一致）そのものである場合、
  // そのモジュールIDを記録する。促進（promoteDirectOverGenericMode）は「配合剤の成分名が
  // たまたま部分一致しただけの弱い候補」を抑制するためのものであり、クエリそのものと
  // 完全に一致する一般名を持つ別モジュールは弱い候補ではなく同格の正当な候補である
  // （2026-09 追加。前方一致・部分一致は対象外＝ここでの「完全一致」判定が本質。
  //   例: "ぴおぐり" に前方一致する "ピオグリタゾン／グリメピリド"（ソニアス側）は
  //   完全一致ではないため対象にならず、⑧ の既存促進は維持される）。
  // 複数トークンのクエリは既にトークン自体に剤形等の追加シグナルを含むため対象外とする。
  const exactGenericIdentityModules = new Set<string>()
  if (tokens.length === 1) {
    for (const { entry } of scored) {
      if (exactGenericIdentityModules.has(entry.moduleId)) continue
      for (const b of entry.brandNames) {
        const g = entry.brandCatalogGenericMap[b]
        if (g !== undefined && normalizeText(g) === tokens[0]) {
          exactGenericIdentityModules.add(entry.moduleId)
          break
        }
      }
    }
  }

  // opt-in モジュール（preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch）
  // が、このクエリで実際に自身のブランド識別による direct 候補を得た場合に true になる。
  // true の場合のみ、最終結合順で [direct/sibling/genericHeader] を [genericMode] より先に処理する
  // （未設定モジュールはこのフラグが立たないため、従来の [genericMode] 優先順を完全維持する）。
  // ただし、別モジュールがこのクエリを自身の完全な一般名識別として保有している場合
  // （exactGenericIdentityModules）、その別モジュールは促進で追い抜いてよい弱い候補ではないため、
  // 自モジュール以外がそこに含まれるときは促進を発動しない（剤形間の既存表示順を維持する）。
  let promoteDirectOverGenericMode = false

  for (const { entry } of scored) {
    // ブランド候補リストを収集する
    const candidates: Array<{
      brand: string | undefined
      displayLabel: string
      uiLabel?: string
      isGenericLabel?: boolean
      /** dedup キーの上書き（一般名見出し候補が特定ブランドのキーと衝突しないようにする） */
      dedupKeyOverride?: string
      bucket: Bucket
      /**
       * この候補が何を指しているかの domain state。**必須**とすることで、
       * 生成地点ごとに（その地点が保持している完全な情報から）明示的に決定させ、
       * 「解決できなかったときにもっともらしい既存値へ静かに落ちる」経路を
       * 型レベルで排除する。
       */
      resolution: BrandResolution
    }> = []

    // Step 1: 複数トークンの場合、全トークン連結を先に試す。
    //   "とらにらすと pf" → concat "とらにらすとpf" → alias 完全一致 → トラメラスPF のみ返す
    let concatBrand: string | undefined
    let concatToken: string | undefined
    if (tokens.length > 1) {
      const concatenated = tokens.join('')
      const resolved = resolveBrandName(entry, concatenated)
      if (resolved !== undefined) { concatBrand = resolved; concatToken = concatenated }
    }

    if (concatBrand !== undefined) {
      // 連結で特定できた場合: 1 ブランドのみ返す（スペース区切り PF 指定など）
      const isDirectBrandMatch = entry.brandNames.some(b =>
        normalizeText(b) === concatToken || normalizeText(b).startsWith(concatToken!)
      )
      const concatLabel = isDirectBrandMatch ? concatBrand :
        (entry.brandCatalogGenericMap[concatBrand] ?? concatBrand)
      candidates.push({
        brand: concatBrand,
        displayLabel: concatLabel,
        bucket: 'direct',
        resolution: makeBrandResolution(concatBrand, concatLabel),
      })
    } else {
      // Step 2: primaryToken に対して priority 1-4 で一致する全ブランドを展開。
      //   "とらにらすと" → リザベン（exact alias）+ トラメラスPF（alias startsWith）を両方返す。
      const pt = tokens[0]
      const hpBrands = resolveAllHighPrecisionBrands(entry, pt)
      const isDirectBrandMatchPt = entry.brandNames.some(b =>
        normalizeText(b) === pt || normalizeText(b).startsWith(pt)
      )
      if (hpBrands.length > 0) {
        if (!isDirectBrandMatchPt) {
          // 一般名（成分名）検索:
          //   ヒットしたブランドを genericKey（判定専用）でグルーピングし、
          //   グループごとに「一般名見出し（先頭・代表ブランド=グループ先頭ブランドとして扱う）
          //   → ブランド候補（uiLabelで「ブランド名（一般名）」表示）」を展開する。
          //   例: "とらにらすと" が リザベン（tranilast_ophthalmic）と
          //       トラメラスPF（tranilast_ophthalmic_pf）の両方に前方一致する場合、
          //       genericKeyが異なるため2グループとして別々に見出し付きで表示する。
          //   genericKeyが解決できないブランドは従来通り個別表示にフォールバックする。
          const groups = new Map<string, string[]>()
          const ungrouped: string[] = []
          const tierOf = new Map<string, BrandMatchTier>(hpBrands.map(x => [x.brand, x.tier]))
          for (const { brand } of hpBrands) {
            const key = entry.brandCatalogGenericKeyMap[brand]
            if (key === undefined) { ungrouped.push(brand); continue }
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(brand)
          }
          // 各グループ内の並び替え。
          //   - preferOwnNameMatchOverGenericMatch が有効なモジュールでは、まず tier
          //     （1=自身のブランド識別一致 / 2=ペア一般名経由の一致）を最優先キーとする。
          //     direct（ブランド名検索）側の tier 優先ロジック（本ファイル内、後述の
          //     orderedHpBrands 生成箇所）と同一の優先順位契約をこの genericMode
          //     （成分名検索）側にも適用し、両経路で tier 契約を一貫させる。
          //   - 続いて、複数トークンクエリでは第2トークン以降（数字・XR/OD/HD等の
          //     剤形サフィックス）まで一致したブランドが上位に来るよう score で並べる（既存動作）。
          //   - フラグ未設定かつ単一トークンのクエリでは並び替えを一切行わず、
          //     既存の宣言順（hpBrands 挿入順）維持という現行動作を完全に保つ。
          const useTierOrder = entry.preferOwnNameMatchOverGenericMatch
          const useScoreOrder = tokens.length > 1
          if (useTierOrder || useScoreOrder) {
            for (const brandsInGroup of groups.values()) {
              brandsInGroup
                .map((brand, originalIndex) => ({
                  brand,
                  originalIndex,
                  tier: useTierOrder ? (tierOf.get(brand) ?? 1) : 1,
                  score: useScoreOrder ? countMatchedTokens(entry, brand, tokens) : 0,
                }))
                .sort((a, b) => a.tier - b.tier || b.score - a.score || a.originalIndex - b.originalIndex)
                .forEach((x, i) => { brandsInGroup[i] = x.brand })
            }
          }
          for (const [key, brandsInGroup] of groups) {
            const genericName = entry.brandCatalogGenericMap[brandsInGroup[0]]
            if (genericName && entry.crossModuleIndicationLabel && multiModuleGenericKeys.has(key)) {
              // crossModuleIndicationLabel が有効なモジュールでも、この genericKey が
              // 実際に複数モジュールにまたがっている場合のみ、適応領域の異なる
              // 複数モジュールにまたがる同一一般名を1件に集約せず、モジュールごとに
              // 適応ラベル付きの一般名見出しを独立表示する。
              // dedupKeyOverride に moduleId を含めることで、他モジュールの同名見出しと
              // 衝突・集約されないようにする。
              const indicationLabel = entry.brandCatalogIndicationLabelMap[brandsInGroup[0]] ?? ''
              candidates.push({
                brand: brandsInGroup[0],
                displayLabel: genericName,
                uiLabel: indicationLabel ? `${genericName}（${indicationLabel}）` : genericName,
                isGenericLabel: true,
                dedupKeyOverride: `__generic__:${genericName}:${entry.moduleId}`,
                bucket: 'genericMode',
                // グルーピングキーは呼び出し元が保持している `key` をそのまま渡す
                // （再導出しないため「解決できない」状態が構造的に発生しない）
                resolution: makeGenericResolution(entry, key, genericName),
              })
              // 一般名見出しに続けて、対応するブランド候補（適応ラベル付き）も表示する。
              // genericMode バケツではなく direct バケツへ積むことで、結合順
              // [genericMode] → [direct/sibling] → [genericHeader] により
              // 「一般名見出し（糖尿病→心腎）→ ブランド候補（糖尿病→心腎）」の順を保証する。
              // isDirectBrandMatchPt=false のクエリでは direct バケツは他に使われないため、
              // 通常のブランド名検索候補と混同・重複することはない。
              for (const brand of brandsInGroup) {
                candidates.push({
                  brand,
                  displayLabel: brand,
                  uiLabel: indicationLabel ? `${brand}（${indicationLabel}）` : `${brand}（${genericName}）`,
                  bucket: 'direct',
                  resolution: makeBrandResolution(brand, brand),
                })
              }
            } else if (genericName) {
              // suppressRedundantGenericHeaderOnDirectMatch が有効なモジュールでは、
              // このグループ自体が既にブランド候補（brandsInGroup）を持つため、
              // 同じ成分を示す塩名単独見出し（genericHeader相当）は追加しない。
              if (!entry.suppressRedundantGenericHeaderOnDirectMatch) {
                candidates.push({
                  brand: brandsInGroup[0],
                  displayLabel: genericName,
                  uiLabel: genericName,
                  isGenericLabel: true,
                  // モジュール横断で同一表示一般名の見出しが重複しないよう、
                  // moduleId を含めず表示文字列のみで dedup する
                  // （例: dm_insulin_rapid_analog と dm_insulin_mixed_rapid_intermediate が
                  // 同じ「インスリンアスパルト」を指す場合、見出しは1回のみ表示する）
                  dedupKeyOverride: `__generic__:${genericName}`,
                  bucket: 'genericMode',
                  resolution: makeGenericResolution(entry, key, genericName),
                })
              }
              for (const brand of brandsInGroup) {
                candidates.push({
                  brand,
                  displayLabel: brand,
                  uiLabel: `${brand}（${genericName}）`,
                  bucket: 'genericMode',
                  resolution: makeBrandResolution(brand, brand),
                })
              }
            } else {
              for (const brand of brandsInGroup) {
                candidates.push({
                  brand,
                  displayLabel: brand,
                  bucket: 'genericMode',
                  resolution: makeBrandResolution(brand, brand),
                })
              }
            }
          }
          for (const brand of ungrouped) {
            const ungroupedLabel = entry.brandCatalogGenericMap[brand] ?? brand
            candidates.push({
              brand,
              displayLabel: ungroupedLabel,
              bucket: 'genericMode',
              // グルーピングキーが解決できない brand（現行データでは 0 件）。
              // brand 自体は確定しているため brand denotation として扱う。
              resolution: makeBrandResolution(brand, ungroupedLabel),
            })
          }
        } else {
          // ブランド名検索（入力が公式ブランド名そのもの、またはその前方一致）:
          //   1) 入力にヒットした各ブランドを先頭に追加し、uiLabel で「ブランド名（一般名）」を表示する
          //      （drugDisplayLabel=ブランド名のまま＝{{drug_subject}}挙動は従来のブランド名検索と同一）
          //   2) 同一 genericKey（判定専用）を持つ同モジュール内の他ブランドを
          //      brandNames 宣言順で後続に展開する（表示は genericMap の表示文字列を使う）
          //   3) 最後に一般名単独候補を追加する（{{drug_subject}}は一般名表示＝GEモードと同じ挙動）
          // 第2トークン以降（数字・XR/OD/HD等の剤形サフィックス）まで一致するブランドを
          // 先頭に来るよう並び替える。これにより、そのブランドが「direct」候補になり、
          // 残りは「sibling」に回る（direct が sibling より優先表示されるため、
          // 一致トークン数が多い候補が結果的に上位に来る）。単一トークンのクエリでは
          // 全 hpBrands が同スコアになり安定ソートで元の順序を維持するため、
          // 既存の単一トークン時の挙動は変わらない。
          //
          // preferOwnNameMatchOverGenericMatch が有効なモジュールでは、まず tier
          // （1=自身のブランド識別一致 / 2=genericName経由のみの一致）を優先キーとし、
          // 同tier内でのみ従来の tokenMatchScore → 宣言順を適用する。未設定モジュールは
          // 従来どおり tier を無視し、宣言順（tokenMatchScoreありなら score 優先）を維持する。
          const orderedHpBrands: string[] = entry.preferOwnNameMatchOverGenericMatch
            ? [...hpBrands]
                .map((x, originalIndex) => ({
                  brand: x.brand,
                  tier: x.tier,
                  originalIndex,
                  score: tokens.length > 1 ? countMatchedTokens(entry, x.brand, tokens) : 0,
                }))
                .sort((a, b) => a.tier - b.tier || b.score - a.score || a.originalIndex - b.originalIndex)
                .map(x => x.brand)
            : tokens.length > 1
              ? [...hpBrands]
                  .map((x, originalIndex) => ({ brand: x.brand, originalIndex, score: countMatchedTokens(entry, x.brand, tokens) }))
                  .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
                  .map(x => x.brand)
              : hpBrands.map(x => x.brand)
          const pushedBrands = new Set<string>()
          let trailingGeneric: string | undefined
          // trailingGeneric と同時にのみ代入されるため、trailingGeneric が truthy な
          // 分岐では必ず解決済みの grouping key が入っている（再導出を不要にするための捕捉）。
          let trailingGenericKey: string | undefined
          let trailingGenericIsMultiModule = false
          for (const brand of orderedHpBrands) {
            if (pushedBrands.has(brand)) continue
            pushedBrands.add(brand)
            const genericKey = entry.brandCatalogGenericKeyMap[brand]
            const generic = entry.brandCatalogGenericMap[brand]
            if (genericKey && generic) {
              // crossModuleIndicationLabel が有効なモジュールでも、この genericKey が
              // 実際に複数モジュールにまたがっている場合のみ、括弧内を一般名ではなく
              // 適応ラベル（例:「糖尿病」「心・腎」「腎」）に差し替える。単一モジュールにしか
              // 存在しないブランド（例: スーグラ）は対象外とし、通常どおり一般名を表示する。
              const useIndicationLabel =
                entry.crossModuleIndicationLabel && multiModuleGenericKeys.has(genericKey)
              const ownLabel = useIndicationLabel
                ? entry.brandCatalogIndicationLabelMap[brand] || generic
                : generic
              candidates.push({
                brand, displayLabel: brand, uiLabel: `${brand}（${ownLabel}）`, bucket: 'direct',
                resolution: makeBrandResolution(brand, brand),
              })
              const siblings = entry.brandNames.filter(
                b => b !== brand && entry.brandCatalogGenericKeyMap[b] === genericKey,
              )
              for (const sib of siblings) {
                if (pushedBrands.has(sib)) continue
                pushedBrands.add(sib)
                const sibLabel = useIndicationLabel
                  ? entry.brandCatalogIndicationLabelMap[sib] || generic
                  : generic
                candidates.push({
                  brand: sib, displayLabel: sib, uiLabel: `${sib}（${sibLabel}）`, bucket: 'sibling',
                  resolution: makeBrandResolution(sib, sib),
                })
              }
              trailingGeneric = generic
              trailingGenericKey = genericKey
              trailingGenericIsMultiModule = useIndicationLabel
            } else {
              candidates.push({
                brand, displayLabel: brand, bucket: 'direct',
                resolution: makeBrandResolution(brand, brand),
              })
            }
          }
          // trailingGenericKey は trailingGeneric と同一箇所でのみ代入されるため、
          // この追加条件は論理的に等価であり分岐の成立条件を変えない（型の絞り込み目的）。
          if (trailingGeneric && trailingGenericKey && trailingGenericIsMultiModule) {
            // crossModuleIndicationLabel により適応ラベル表示へ切り替わったモジュールでは、
            // ブランド候補（direct/sibling）に続けて、対応する一般名見出し（適応ラベル付き）も
            // 表示する。dedupKeyOverride に moduleId を含めることで、他モジュールの同名見出しと
            // 衝突・集約されないようにする（ブランド名⇔一般名の相互候補表示を維持するため）。
            const indicationLabel = entry.brandCatalogIndicationLabelMap[orderedHpBrands[0]] ?? ''
            candidates.push({
              brand: orderedHpBrands[0],
              displayLabel: trailingGeneric,
              uiLabel: indicationLabel ? `${trailingGeneric}（${indicationLabel}）` : trailingGeneric,
              isGenericLabel: true,
              dedupKeyOverride: `__generic__:${trailingGeneric}:${entry.moduleId}`,
              bucket: 'genericHeader',
              resolution: makeGenericResolution(entry, trailingGenericKey, trailingGeneric),
            })
          } else if (trailingGeneric && trailingGenericKey && !entry.suppressRedundantGenericHeaderOnDirectMatch) {
            // suppressRedundantGenericHeaderOnDirectMatch が有効なモジュールでは、
            // direct/sibling 候補が既にブランドを提示しているため、同じ成分を示す
            // 塩名単独の generic header（例:「メトホルミン塩酸塩」）は追加しない。
            candidates.push({
              brand: orderedHpBrands[0],
              displayLabel: trailingGeneric,
              uiLabel: trailingGeneric,
              isGenericLabel: true,
              // モジュール横断で同一表示一般名の見出しが重複しないよう、
              // moduleId を含めず表示文字列のみで dedup する
              dedupKeyOverride: `__generic__:${trailingGeneric}`,
              bucket: 'genericHeader',
              resolution: makeGenericResolution(entry, trailingGenericKey, trailingGeneric),
            })
          }
        }
      } else {
        // Step 3: フォールバック — 各トークンを順に評価して最初の一致を採用する。
        //   priority 5（部分一致）でしか一致しない場合や、高精度一致が 0 件の場合に使用。
        //   lastToken だけでは 1 文字トークン（く/な/ろ）が不一致になるため前向き評価を継続。
        let matchedBrandName: string | undefined
        let matchedByToken: string | undefined
        for (const t of tokens) {
          const resolved = resolveBrandName(entry, t)
          if (resolved !== undefined) { matchedBrandName = resolved; matchedByToken = t; break }
        }
        if (matchedBrandName === undefined) {
          // ブランド名・一般名のいずれも解決できなかった候補。
          // corpus部分一致（keywords等）のみで scored に残っているため、
          // 正当な一般名検索（genericMode）とは区別し、専用バケツへ送る。
          candidates.push({
            brand: undefined,
            displayLabel: entry.drugDisplayLabel ?? entry.brandNames[0] ?? entry.moduleId,
            bucket: 'lowConfidence',
            // brand が一切解決できていない唯一の経路。module の静的構造から
            // brand / generic / module のいずれかを決定論的に導出する。
            resolution: deriveUnresolvedResolution(entry),
          })
        } else {
          const isDirectBrandMatch = matchedByToken !== undefined &&
            entry.brandNames.some(b => normalizeText(b) === matchedByToken || normalizeText(b).startsWith(matchedByToken!))
          const fallbackLabel = isDirectBrandMatch
            ? matchedBrandName
            : (entry.brandCatalogGenericMap[matchedBrandName] ?? matchedBrandName)
          candidates.push({
            brand: matchedBrandName,
            displayLabel: fallbackLabel,
            bucket: isDirectBrandMatch ? 'direct' : 'genericMode',
            resolution: makeBrandResolution(matchedBrandName, fallbackLabel),
          })
        }
      }
    }

    // PF クエリの場合は PF品のみに絞る（concat-first が alias 未登録クエリにも対応する安全網）
    const activeCandidates = hasPFQuery
      ? candidates.filter(c => c.brand !== undefined && isPFBrand(entry, c.brand))
      : candidates

    // matchStrength は候補ではなく entry（＝どの module へどう一致したか）に依存するため、
    // モジュールごとに 1 回だけ算出する。scoreEntry は純粋関数であり再呼び出しは副作用を持たない。
    const entryMatchStrength = deriveMatchStrength(entry, tokens[0])

    // バケツへ振り分ける（モジュール横断の結合は最後にまとめて行う）
    for (const { brand, displayLabel, uiLabel, isGenericLabel, dedupKeyOverride, bucket, resolution } of activeCandidates) {
      bucketed[bucket].push({
        moduleId: entry.moduleId,
        templateId: entry.templateId,
        brand,
        displayLabel,
        uiLabel,
        tokenMatchScore: brand !== undefined ? countMatchedTokens(entry, brand, tokens) : 0,
        isGenericLabel,
        dedupKeyOverride,
        resolution,
        matchStrength: entryMatchStrength,
      })
      if (bucket === 'direct' && entry.preferOwnNameMatchOverGenericMatch) {
        // 自モジュール以外が、このクエリを完全な一般名識別として保有している場合は
        // 促進を発動しない（上記 exactGenericIdentityModules のコメント参照）。
        const blockedByOtherModuleGenericIdentity =
          [...exactGenericIdentityModules].some(mid => mid !== entry.moduleId)
        if (!blockedByOtherModuleGenericIdentity) promoteDirectOverGenericMode = true
      }
    }
  }

  // 最終結合は [genericMode] → [direct] → [sibling] → [genericHeader] の順を維持しつつ、
  // ブランド名検索（direct/sibling/genericHeader が使われるケース）では genericHeader に
  // 最低表示枠を確保する。direct+sibling候補が多いクエリ（例: 複数モジュールにまたがる
  // ブランドファミリー）でも、一般名見出しが limit 切れで全滅しないようにするため。
  //
  // 予約数 = min(genericHeaderの種類数, 3, 残り枠)。genericMode（一般名検索）は
  // この予約ロジックの対象外で、従来どおり limit を直接消費する。
  const seenModuleBrands = new Set<string>()
  const results: DrugSuggestionItem[] = []

  const pushCandidate = (c: BucketedCandidate): boolean => {
    if (results.length >= limit) return false
    const key = c.dedupKeyOverride ?? `${c.moduleId}:${c.brand ?? '__no_brand__'}`
    if (seenModuleBrands.has(key)) return false
    seenModuleBrands.add(key)
    results.push({
      moduleId: c.moduleId,
      drugDisplayLabel: c.displayLabel,
      matchedBrandName: c.brand,
      representativeTemplateId: c.templateId,
      uiLabel: c.uiLabel,
      isGenericLabel: c.isGenericLabel,
      resolution: c.resolution,
      matchStrength: c.matchStrength,
    })
    return true
  }

  // direct bucket 内をブランドファミリー単位でまとめる（安定グルーピング）。
  // クエリに一致した部分より後ろの文字列の先頭1文字を「ファミリーキー」とし、
  // 同じキーを持つ候補をまとめる。グループの並び順は元の bucketed.direct の
  // 出現順（stable order）を維持する（辞書順ソートはしない）。例: "ひゅーま" クエリでは
  // "りんr"/"りんn"/"りん37"が先頭1文字"り"で1グループにまとまり、
  // "ろぐ"/"ろぐみっくす25"は"ろ"で別グループになる。
  // 特定ブランド名のハードコードは行わず、文字列比較のみで判定する。
  // sibling / genericMode / genericHeader の並び順には影響しない。
  const queryPt = tokens[0] ?? ''
  const familyGroups = new Map<string, BucketedCandidate[]>()
  for (const c of bucketed.direct) {
    const norm = normalizeText(c.brand ?? c.displayLabel ?? '')
    const suffix = norm.startsWith(queryPt) ? norm.slice(queryPt.length) : norm
    const familyKey = suffix.length > 0 ? suffix[0] : suffix
    if (!familyGroups.has(familyKey)) familyGroups.set(familyKey, [])
    familyGroups.get(familyKey)!.push(c)
  }
  // グループ内は、第2トークン以降（数字・XR/OD/HD等の剤形サフィックス）まで
  // 一致した候補が上位に来るよう並び替える（tokenMatchScore 降順・同点は元の順序を維持）。
  // 単一トークンのクエリでは全候補が同スコアになり安定ソートで元の順序を維持するため、
  // 既存の単一トークン時の挙動は変わらない。
  if (tokens.length > 1) {
    for (const group of familyGroups.values()) {
      group
        .map((c, originalIndex) => ({ c, originalIndex }))
        .sort((a, b) => b.c.tokenMatchScore - a.c.tokenMatchScore || a.originalIndex - b.originalIndex)
        .forEach((x, i) => { group[i] = x.c })
    }
  }
  const sortedDirect = [...familyGroups.values()].flat()

  /**
   * 適応ラベル付きの一般名見出しか判定する。
   * crossModuleIndicationLabel 経路の見出しは dedupKeyOverride に moduleId を含めて
   * `__generic__:{genericName}:{moduleId}` の3セグメント形式になる（通常の見出しは
   * `__generic__:{genericName}` の2セグメント）。適応ラベル付き見出しは
   * 「同一一般名が複数モジュールにまたがる」ことを示す固有の情報を持つため、
   * 下記の枠逼迫時の後回し対象から除外する。
   */
  const isIndicationLabeledHeader = (c: BucketedCandidate): boolean =>
    c.isGenericLabel === true &&
    typeof c.dedupKeyOverride === 'string' &&
    c.dedupKeyOverride.split(':').length >= 3

  const runGenericModeStep = () => {
    // genericMode（一般名検索の見出し→ブランド群）は limit を直接消費する。
    //
    // ただし候補が残り枠を超える場合に限り、通常の一般名見出しを brand 行より
    // 後回しにする。見出しと brand 行が 1 枠ずつ消費するため、成分名を共有する
    // 配合剤が複数 group へ展開されるクエリ（例:「メトホルミン」）では、見出しが
    // 枠の半分を占めて brand 行が表示枠外へ押し出されるためである。ユーザーが
    // 候補として選択できるのは brand 行のみ（見出し選択では brand が確定しない）
    // なので、枠が不足する場面では brand 行を優先する。
    //
    // 枠に余裕がある場合は従来どおり宣言順（見出し→brand 行）をそのまま維持する。
    // 適応ラベル付き見出し（crossModuleIndicationLabel 経路）は後回し対象に含めない。
    // 後回しにした見出しは、brand 行を詰めたあとに残枠があれば宣言順で追加する
    // （genericHeader 予約枠と同じく、枠を無駄にしない）。
    const available = Math.max(limit - results.length, 0)
    const distinctKeys = new Set(
      bucketed.genericMode.map(c => c.dedupKeyOverride ?? `${c.moduleId}:${c.brand ?? '__no_brand__'}`),
    )
    const needsDeferral = distinctKeys.size > available

    if (!needsDeferral) {
      for (const c of bucketed.genericMode) {
        if (results.length >= limit) break
        pushCandidate(c)
      }
      return
    }

    const deferredHeaders: BucketedCandidate[] = []
    for (const c of bucketed.genericMode) {
      if (c.isGenericLabel === true && !isIndicationLabeledHeader(c)) {
        deferredHeaders.push(c)
        continue
      }
      if (results.length >= limit) break
      pushCandidate(c)
    }
    for (const c of deferredHeaders) {
      if (results.length >= limit) break
      pushCandidate(c)
    }
  }

  const runDirectSiblingAndHeaderSteps = () => {
    // genericHeader の予約枠を決定する（重複キーを除いた種類数 / 上限3 / 残り枠が上限）
    const uniqueHeaderKeys = new Set(
      bucketed.genericHeader.map(c => c.dedupKeyOverride ?? `${c.moduleId}:${c.brand ?? '__no_brand__'}`),
    )
    const remaining = Math.max(limit - results.length, 0)
    const reserved = Math.min(uniqueHeaderKeys.size, 3, remaining)
    const directSiblingBudget = remaining - reserved

    // direct（ファミリー順にソート済み） → sibling の順で、確保した残り枠まで詰める
    let directSiblingAdded = 0
    for (const c of [...sortedDirect, ...bucketed.sibling]) {
      if (directSiblingAdded >= directSiblingBudget) break
      if (pushCandidate(c)) directSiblingAdded++
    }

    // genericHeader を予約枠まで詰める（種類の重複は pushCandidate の dedup で自然に防がれる）
    let headerAdded = 0
    for (const c of bucketed.genericHeader) {
      if (headerAdded >= reserved) break
      if (pushCandidate(c)) headerAdded++
    }
  }

  // Step 1〜4: 通常は [genericMode] → [direct/sibling] → [genericHeader] の順で結合する。
  // ただし promoteDirectOverGenericMode が true の場合（opt-in モジュールが自身のブランド
  // 識別で direct 候補を得ている場合）のみ、[direct/sibling] → [genericHeader] を先に処理する。
  // これにより、無関係な他モジュールが偶然 genericName 経由で一致しただけの弱い候補
  // （例: 配合剤の成分名がたまたま前方一致するケース）が、opt-in モジュール自身の
  // ブランド一致候補より先に表示されることを防ぐ。フラグが立たない場合は
  // 従来の [genericMode] 優先順を完全に維持する（他モジュールへの影響なし）。
  if (promoteDirectOverGenericMode) {
    runDirectSiblingAndHeaderSteps()
    runGenericModeStep()
  } else {
    runGenericModeStep()
    runDirectSiblingAndHeaderSteps()
  }

  // Step 5: 予約枠・direct/sibling枠のいずれかが余った場合（候補数が枠より少なかった等）、
  // 余った枠を direct → sibling → genericHeader の優先順で埋め直す
  if (results.length < limit) {
    for (const c of [...sortedDirect, ...bucketed.sibling, ...bucketed.genericHeader]) {
      if (results.length >= limit) break
      pushCandidate(c)
    }
  }

  // Step 6: lowConfidence（ブランド未解決の弱い fallback）は genericMode/direct/sibling/
  // genericHeader をすべて処理し終えた後、残り枠がある場合のみ末尾に追加する。
  // 既存4バケツの処理順・優先度には一切影響しない。
  if (results.length < limit) {
    for (const c of bucketed.lowConfidence) {
      if (results.length >= limit) break
      pushCandidate(c)
    }
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
    index.filter(e => e.corpusTokens.some(t => t.includes(q))).map(e => e.templateId),
  )
  return scenarios.filter(s => hitIds.has(s.globalId))
}
