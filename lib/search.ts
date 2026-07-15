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
  // brandCatalog[brand].genericName もマップ化（一般名検索時の drugDisplayLabel 解決用）
  const brandCatalogAliasMap: Record<string, string[]> = {}
  const brandCatalogGenericMap: Record<string, string> = {}
  const brandCatalogGenericKeyMap: Record<string, string> = {}
  const brandCatalog = drug?.brandCatalog ?? {}
  for (const [brand, entry] of Object.entries(brandCatalog)) {
    const aliases = (entry as { aliases?: string[]; genericName?: string }).aliases ?? []
    brandCatalogAliasMap[brand] = aliases.map(normalizeText).filter(Boolean)
    // displayGenericName を優先（Topbar・S先頭文・{{drug_subject}} 解決で統一表示するため）
    const e = entry as { genericKey?: string; displayGenericName?: string; genericName?: string }
    const resolvedGenericName = e.displayGenericName ?? e.genericName
    if (resolvedGenericName) brandCatalogGenericMap[brand] = resolvedGenericName
    // グルーピング判定専用キー: genericKey が未設定のモジュールは表示文字列に後方互換フォールバックする
    const resolvedGenericKey = e.genericKey ?? resolvedGenericName
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

  return moduleData.scenarios.map(scenario => {
    // per-scenario コーパス: title / scenarioGroup / S / O / A / P を個別に正規化する。
    // フィールドをまとめて join してから正規化すると、フィールド境界をまたいだ
    // ゴースト一致（例: S の末尾 + O の先頭が偶然クエリと一致）が発生するため、
    // 各フィールドを独立したトークンとして保持する。
    const perScenarioTokens: string[] = [
      scenario.title,
      scenario.scenarioGroup,
      scenario.S ?? '',
      scenario.O ?? '',
      scenario.A ?? '',
      scenario.P ?? '',
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
    const genericOnlyMatch =
      normGeneric === q ||                             // priority 5: displayGenericName 完全一致
      (normGeneric !== undefined && normGeneric.startsWith(q)) // priority 6: displayGenericName 前方一致
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

  // スコアリング（AND 対応）
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
  }
  const bucketed: Record<Bucket, BucketedCandidate[]> = {
    genericMode: [],
    direct: [],
    sibling: [],
    genericHeader: [],
    lowConfidence: [],
  }

  // opt-in モジュール（preferOwnNameMatchOverGenericMatch / suppressRedundantGenericHeaderOnDirectMatch）
  // が、このクエリで実際に自身のブランド識別による direct 候補を得た場合に true になる。
  // true の場合のみ、最終結合順で [direct/sibling/genericHeader] を [genericMode] より先に処理する
  // （未設定モジュールはこのフラグが立たないため、従来の [genericMode] 優先順を完全維持する）。
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
      candidates.push({
        brand: concatBrand,
        displayLabel: isDirectBrandMatch ? concatBrand :
          (entry.brandCatalogGenericMap[concatBrand] ?? concatBrand),
        bucket: 'direct',
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
          for (const { brand } of hpBrands) {
            const key = entry.brandCatalogGenericKeyMap[brand]
            if (key === undefined) { ungrouped.push(brand); continue }
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(brand)
          }
          // 各グループ内を、第2トークン以降（数字・XR/OD/HD等の剤形サフィックス）まで
          // 一致したブランドが上位に来るよう並び替える（tokens[0] は全員一致するため
          // 通常は差が出ず、tokens[1] 以降の一致差で順位が決まる）。
          // 単一トークンのクエリでは全候補が同スコアになり安定ソートで元の順序を維持するため、
          // 既存の単一トークン時の挙動は変わらない。
          if (tokens.length > 1) {
            for (const brandsInGroup of groups.values()) {
              brandsInGroup
                .map((brand, originalIndex) => ({ brand, originalIndex, score: countMatchedTokens(entry, brand, tokens) }))
                .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
                .forEach((x, i) => { brandsInGroup[i] = x.brand })
            }
          }
          for (const [key, brandsInGroup] of groups) {
            const genericName = entry.brandCatalogGenericMap[brandsInGroup[0]]
            if (genericName) {
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
                })
              }
              for (const brand of brandsInGroup) {
                candidates.push({
                  brand,
                  displayLabel: brand,
                  uiLabel: `${brand}（${genericName}）`,
                  bucket: 'genericMode',
                })
              }
            } else {
              for (const brand of brandsInGroup) {
                candidates.push({ brand, displayLabel: brand, bucket: 'genericMode' })
              }
            }
          }
          for (const brand of ungrouped) {
            candidates.push({
              brand,
              displayLabel: entry.brandCatalogGenericMap[brand] ?? brand,
              bucket: 'genericMode',
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
          for (const brand of orderedHpBrands) {
            if (pushedBrands.has(brand)) continue
            pushedBrands.add(brand)
            const genericKey = entry.brandCatalogGenericKeyMap[brand]
            const generic = entry.brandCatalogGenericMap[brand]
            if (genericKey && generic) {
              candidates.push({ brand, displayLabel: brand, uiLabel: `${brand}（${generic}）`, bucket: 'direct' })
              const siblings = entry.brandNames.filter(
                b => b !== brand && entry.brandCatalogGenericKeyMap[b] === genericKey,
              )
              for (const sib of siblings) {
                if (pushedBrands.has(sib)) continue
                pushedBrands.add(sib)
                candidates.push({ brand: sib, displayLabel: sib, uiLabel: `${sib}（${generic}）`, bucket: 'sibling' })
              }
              trailingGeneric = generic
            } else {
              candidates.push({ brand, displayLabel: brand, bucket: 'direct' })
            }
          }
          // suppressRedundantGenericHeaderOnDirectMatch が有効なモジュールでは、
          // direct/sibling 候補が既にブランドを提示しているため、同じ成分を示す
          // 塩名単独の generic header（例:「メトホルミン塩酸塩」）は追加しない。
          if (trailingGeneric && !entry.suppressRedundantGenericHeaderOnDirectMatch) {
            candidates.push({
              brand: orderedHpBrands[0],
              displayLabel: trailingGeneric,
              uiLabel: trailingGeneric,
              isGenericLabel: true,
              // モジュール横断で同一表示一般名の見出しが重複しないよう、
              // moduleId を含めず表示文字列のみで dedup する
              dedupKeyOverride: `__generic__:${trailingGeneric}`,
              bucket: 'genericHeader',
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
          })
        } else {
          const isDirectBrandMatch = matchedByToken !== undefined &&
            entry.brandNames.some(b => normalizeText(b) === matchedByToken || normalizeText(b).startsWith(matchedByToken!))
          candidates.push({
            brand: matchedBrandName,
            displayLabel: isDirectBrandMatch
              ? matchedBrandName
              : (entry.brandCatalogGenericMap[matchedBrandName] ?? matchedBrandName),
            bucket: isDirectBrandMatch ? 'direct' : 'genericMode',
          })
        }
      }
    }

    // PF クエリの場合は PF品のみに絞る（concat-first が alias 未登録クエリにも対応する安全網）
    const activeCandidates = hasPFQuery
      ? candidates.filter(c => c.brand !== undefined && isPFBrand(entry, c.brand))
      : candidates

    // バケツへ振り分ける（モジュール横断の結合は最後にまとめて行う）
    for (const { brand, displayLabel, uiLabel, isGenericLabel, dedupKeyOverride, bucket } of activeCandidates) {
      bucketed[bucket].push({
        moduleId: entry.moduleId,
        templateId: entry.templateId,
        brand,
        displayLabel,
        uiLabel,
        tokenMatchScore: brand !== undefined ? countMatchedTokens(entry, brand, tokens) : 0,
        isGenericLabel,
        dedupKeyOverride,
      })
      if (bucket === 'direct' && entry.preferOwnNameMatchOverGenericMatch) {
        promoteDirectOverGenericMode = true
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

  const runGenericModeStep = () => {
    // genericMode（一般名検索の見出し→ブランド群）は従来どおり limit を直接消費する
    for (const c of bucketed.genericMode) {
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
