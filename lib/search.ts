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
   * getSuggestions でクエリと照合し、どのブランドにヒットしたか特定するために使用。
   */
  brandNames: string[]
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

export function getSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): SuggestionItem[] {
  const q = normalizeText(query)
  if (!q) return []

  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntry(index[i], q)
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

    // クエリに最も近いブランド名を特定する
    // 優先順: exactAlias完全一致 → aliasToken前方一致 → aliasToken部分一致
    let matchedBrandName: string | undefined
    for (const brand of entry.brandNames) {
      const norm = normalizeText(brand)
      if (norm === q) { matchedBrandName = brand; break }
    }
    if (!matchedBrandName) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand).startsWith(q)) { matchedBrandName = brand; break }
      }
    }
    if (!matchedBrandName) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand).includes(q)) { matchedBrandName = brand; break }
      }
    }

    results.push({
      templateId: entry.templateId,
      moduleId: entry.moduleId,
      label: entry.label,
      shortLabel: entry.shortLabel,
      groupLabel: entry.groupLabel,
      drugDisplayLabel: entry.drugDisplayLabel,
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
  const q = normalizeText(query)
  if (!q) return []

  // スコアリング（getSuggestions と同じロジック）
  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntry(index[i], q)
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

    // マッチしたブランド名を特定
    let matchedBrandName: string | undefined
    for (const brand of entry.brandNames) {
      if (normalizeText(brand) === q) { matchedBrandName = brand; break }
    }
    if (!matchedBrandName) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand).startsWith(q)) { matchedBrandName = brand; break }
      }
    }
    if (!matchedBrandName) {
      for (const brand of entry.brandNames) {
        if (normalizeText(brand).includes(q)) { matchedBrandName = brand; break }
      }
    }

    results.push({
      moduleId: entry.moduleId,
      drugDisplayLabel: entry.drugDisplayLabel ?? entry.brandNames[0] ?? entry.moduleId,
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
