/**
 * search.ts — 正規化・グループ分類・サジェスト検索
 *
 * 依存ライブラリなし。ピュア TypeScript。
 *
 * スコアリング優先順位（高→低）:
 *   7) drug.search.exactAliases 完全一致（suppressCrossModuleSuggestionsOnExactHit 発動）
 *   6) drug.search.primaryDisplayName 完全一致
 *   5) 薬剤名エイリアス（nameAliases）完全一致
 *   4) drug.search.prefixAliases 前方一致
 *   3) 薬剤名エイリアス前方一致
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
  /** 新スキーマ: scenario.id */
  templateId: string
  moduleId: string
  corpus: string
  exactAliasTokens: string[]
  primaryDisplayNameNorm: string
  prefixAliasTokens: string[]
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

  const prefixAliasTokens: string[] = (drugSearch?.prefixAliases ?? [])
    .map(normalizeText)
    .filter(Boolean)

  const rawAliases: string[] = [
    ...(drug?.nameAliases ?? []),
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
      templateId: scenario.id,
      moduleId: moduleData.moduleId,
      corpus,
      exactAliasTokens,
      primaryDisplayNameNorm,
      prefixAliasTokens,
      aliasTokens,
      label: scenario.title,
      shortLabel: scenario.title,  // 新スキーマでは title が既に短縮形
      groupLabel,
      drugDisplayLabel: exampleDrugName,
      suppressOnExactHit,
      priority,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// D) サジェスト検索（スコアリング）
// ─────────────────────────────────────────────────────────────

export interface SuggestionItem {
  templateId: string
  label: string
  shortLabel: string
  groupLabel: string
  drugDisplayLabel?: string
}

function scoreEntry(entry: SearchEntry, q: string): number {
  for (const alias of entry.exactAliasTokens) {
    if (alias === q) return 7
  }
  if (entry.primaryDisplayNameNorm && entry.primaryDisplayNameNorm === q) return 6
  for (const alias of entry.aliasTokens) {
    if (alias === q) return 5
  }
  for (const alias of entry.prefixAliasTokens) {
    if (alias.startsWith(q)) return 4
  }
  for (const alias of entry.aliasTokens) {
    if (alias.startsWith(q)) return 3
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
    results.push({
      templateId: entry.templateId,
      label: entry.label,
      shortLabel: entry.shortLabel,
      groupLabel: entry.groupLabel,
      drugDisplayLabel: entry.drugDisplayLabel,
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// E) フィルタ（後方互換エクスポート）
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
  return scenarios.filter(s => hitIds.has(s.id))
}
