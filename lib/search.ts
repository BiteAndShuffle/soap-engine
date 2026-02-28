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
 *   2) ラベル前方一致 / エイリアス部分一致
 *   1) コーパス（keywords・一般語）部分一致
 *   0) マッチなし
 *
 * exactAlias ヒット時は suppressCrossModuleSuggestionsOnExactHit=true により
 * 当該モジュールのみを返す（他モジュール候補を抑制する）。
 *
 * 同スコア内は元の配列順を維持する（安定ソート）。
 */

import type { Template, ModuleData } from './types'
import { getMenuGroup, shortLabel as getShortLabel } from './menuGroups'

// ─────────────────────────────────────────────────────────────
// A) 旧グループ定義（後方互換のみ・UI分類には使わない）
//
// 【重要】UI の大分類グループには menuGroups.ts の getMenuGroup() を使うこと。
//         この getGroupKey / GroupKey / groupTemplates は search.ts 内部の
//         後方互換エクスポートとして残しているだけで、UIグルーピングとは無関係。
//         特に se_none が「副作用」に入るなど、UIの MenuGroup とは意味が異なる。
// ─────────────────────────────────────────────────────────────

export type GroupKey =
  | '導入・増量'
  | '減量'
  | '副作用'
  | 'コンプライアンス'
  | '終了/中止'
  | '生活指導'
  | 'シックデイ'
  | 'その他'

/**
 * JSON の type 文字列 → 検索用グループキー（後方互換エクスポート）。
 * ⚠️ UIの MenuGroup 分類には使わないこと — menuGroups.ts の getMenuGroup() を使う。
 *    se_none はここでは「副作用」に分類されるが、UI では「副作用なし」である。
 */
export function getGroupKey(type: string): GroupKey {
  if (type === 'initial' || type === 'uptitrate') return '導入・増量'
  if (type.startsWith('down_'))                   return '減量'
  if (type.startsWith('se_'))                     return '副作用'
  if (type.startsWith('cp_'))                     return 'コンプライアンス'
  if (type.startsWith('stop_'))                   return '終了/中止'
  if (type === 'lifestyle')                       return '生活指導'
  if (type === 'sickday')                         return 'シックデイ'
  return 'その他'
}

/** 表示順（上から並ぶ順序） */
export const GROUP_ORDER: GroupKey[] = [
  '導入・増量',
  '減量',
  '副作用',
  'コンプライアンス',
  '終了/中止',
  '生活指導',
  'シックデイ',
  'その他',
]

export interface TemplateGroup {
  groupKey: GroupKey
  templates: Template[]
}

/**
 * テンプレ一覧を GROUP_ORDER 順のグループ配列に変換（後方互換エクスポート）。
 * ⚠️ UIのサイドバー分類には使わないこと — menuGroups.ts の groupByMenuGroup() を使う。
 */
export function groupTemplates(templates: Template[]): TemplateGroup[] {
  const map = new Map<GroupKey, Template[]>()
  for (const tpl of templates) {
    const key = getGroupKey(tpl.type)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tpl)
  }
  return GROUP_ORDER
    .filter(key => map.has(key))
    .map(key => ({ groupKey: key, templates: map.get(key)! }))
}

// ─────────────────────────────────────────────────────────────
// B) テキスト正規化
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
// C) 検索対象の構築
// ─────────────────────────────────────────────────────────────

/** テンプレ 1 件分の検索対象文字列をまとめた正規化済みコーパス */
export interface SearchEntry {
  templateId: string
  moduleId: string
  /** 結合済み・正規化済みの検索対象テキスト（全体コーパス） */
  corpus: string
  /**
   * drug.search.exactAliases の正規化済みトークン群。
   * スコア最高（7）のヒット判定に使う。
   */
  exactAliasTokens: string[]
  /**
   * drug.search.primaryDisplayName の正規化済みトークン。
   * スコア6のヒット判定に使う。
   */
  primaryDisplayNameNorm: string
  /**
   * drug.search.prefixAliases の正規化済みトークン群。
   * スコア4の前方一致に使う。
   */
  prefixAliasTokens: string[]
  /**
   * 薬剤名エイリアスのみの正規化済みトークン群（nameAliases）。
   * スコアリングで「エイリアス一致」と「一般カテゴリ語一致」を区別するために使う。
   */
  aliasTokens: string[]
  /** 表示用スニペット（label をそのまま） */
  label: string
  /** 薬効群名を省いた短縮ラベル */
  shortLabel: string
  /** 大分類グループ名（サブテキスト表示用） */
  groupLabel: string
  /** 薬剤表示名（例: リベルサス（セマグルチド）） */
  drugDisplayLabel?: string
  /**
   * exactAlias ヒット時に他モジュール候補を抑制するかどうか。
   * drug.search.matchPolicy.suppressCrossModuleSuggestionsOnExactHit の値。
   */
  suppressOnExactHit: boolean
  /**
   * タイブレーク用優先度。
   * drug.search.priority の値（高いほど優先）。
   */
  priority: number
}

/**
 * ModuleData からサジェスト用エントリ一覧を生成する。
 * drug.search が存在する場合はそのデータをSSOTとして優先使用する。
 * 各テンプレに対して: label + type + タグ + エイリアス を結合し正規化。
 */
export function buildSearchIndex(moduleData: ModuleData): SearchEntry[] {
  const drug = moduleData.drug
  const drugSearch = drug?.search

  // ── drug.search.exactAliases（スコア7用）──
  const exactAliasTokens: string[] = (drugSearch?.exactAliases ?? [])
    .map(normalizeText)
    .filter(Boolean)

  // ── drug.search.primaryDisplayName（スコア6用）──
  const primaryDisplayNameNorm = normalizeText(drugSearch?.primaryDisplayName ?? '')

  // ── drug.search.prefixAliases（スコア4用）──
  const prefixAliasTokens: string[] = (drugSearch?.prefixAliases ?? [])
    .map(normalizeText)
    .filter(Boolean)

  // ── 薬剤名エイリアス（スコア5/3用）──
  // drug.nameAliases（v1.1 スキーマ）と drugDisplay.examples（旧スキーマ）の両方を拾う
  const rawAliases: string[] = [
    ...(drug?.nameAliases ?? []),
    ...(moduleData.drugDisplay?.examples ?? []),
    ...(moduleData.drugSpecificTags ?? []),
  ]
  const aliasTokens = rawAliases.map(normalizeText).filter(Boolean)

  // ── drug.search.keywords（コーパスに含める）──
  const keywordTexts: string[] = drugSearch?.keywords ?? []

  // ── 全体コーパス（一般カテゴリ語含む）──
  const globalTags: string[] = [
    ...(moduleData.drugTags ?? []),
    ...(moduleData.drugSpecificTags ?? []),
    ...(moduleData.situationTags ?? []),
    ...(moduleData.riskTags ?? []),
    ...(moduleData.conditionalRiskTags ?? []),
    ...(moduleData.severityTags ?? []),
    ...(moduleData.drugDisplay?.examples ?? []),
    moduleData.drugDisplay?.class ?? '',
    ...rawAliases,
    ...keywordTexts,
    // v1.1 スキーマの index.searchableText
    ...((moduleData as unknown as Record<string, unknown>)['index'] as { searchableText?: string[] } | undefined)?.searchableText ?? [],
  ]
  const globalCorpus = normalizeText(globalTags.join(' '))

  const exampleDrugName = drug?.brandNames?.[0]
    ?? moduleData.drugDisplay?.examples?.[0]

  const suppressOnExactHit =
    drugSearch?.matchPolicy?.suppressCrossModuleSuggestionsOnExactHit ?? false
  const priority = drugSearch?.priority ?? 0

  return moduleData.templates.map(tpl => {
    const perTemplate = [tpl.label, tpl.type].join(' ')
    const corpus = normalizeText(perTemplate) + ' ' + globalCorpus
    return {
      templateId: tpl.templateId,
      moduleId: moduleData.moduleId,
      corpus,
      exactAliasTokens,
      primaryDisplayNameNorm,
      prefixAliasTokens,
      aliasTokens,
      label: tpl.label,
      shortLabel: getShortLabel(tpl.label),
      groupLabel: getMenuGroup(tpl.type),
      drugDisplayLabel: exampleDrugName,
      suppressOnExactHit,
      priority,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// D) サジェスト検索（スコアリング強化版）
// ─────────────────────────────────────────────────────────────

export interface SuggestionItem {
  templateId: string
  label: string
  /** 薬効群名を省いた短縮ラベル */
  shortLabel: string
  /** 大分類グループ名（サブテキスト表示用） */
  groupLabel: string
  /** 薬剤名（例: リベルサス（セマグルチド）） */
  drugDisplayLabel?: string
}

/**
 * スコア定義（高い = 上位表示）
 *   7: drug.search.exactAliases 完全一致（suppress 発動）
 *   6: drug.search.primaryDisplayName 完全一致
 *   5: 薬剤名エイリアス（nameAliases）完全一致
 *   4: drug.search.prefixAliases 前方一致
 *   3: 薬剤名エイリアス前方一致
 *   2: ラベル前方一致 / エイリアス部分一致
 *   1: コーパス（一般語・keywords）部分一致
 *   0: マッチなし
 */
function scoreEntry(entry: SearchEntry, q: string): number {
  // exactAliases 完全一致（最優先）
  for (const alias of entry.exactAliasTokens) {
    if (alias === q) return 7
  }

  // primaryDisplayName 完全一致
  if (entry.primaryDisplayNameNorm && entry.primaryDisplayNameNorm === q) return 6

  // nameAliases 完全一致
  for (const alias of entry.aliasTokens) {
    if (alias === q) return 5
  }

  // prefixAliases 前方一致（エイリアスが入力で始まる場合 = 入力はエイリアスの前方部分）
  for (const alias of entry.prefixAliasTokens) {
    if (alias.startsWith(q)) return 4
  }

  // nameAliases 前方一致
  for (const alias of entry.aliasTokens) {
    if (alias.startsWith(q)) return 3
  }

  // ラベル前方一致 / エイリアス部分一致
  const normLabel = normalizeText(entry.label)
  if (normLabel.startsWith(q)) return 2
  for (const alias of entry.aliasTokens) {
    if (alias.includes(q)) return 2
  }

  // ラベル部分一致
  if (normLabel.includes(q)) return 1

  // コーパス（一般語）一致
  if (entry.corpus.includes(q)) return 1

  return 0
}

/**
 * クエリにマッチするテンプレを最大 `limit` 件返す。
 * - 空文字は [] を返す（候補なし）
 * - スコア降順 → priority 降順 → 元配列順でソート
 * - 同一 shortLabel のエントリは1件のみ採用（薬剤名でユニーク化）
 * - スコア≥5（exactAlias / primaryDisplayName / nameAlias 完全一致）かつ suppressOnExactHit=true の場合:
 *   1) 他モジュール候補を除外（suppressモジュールのみ残す）
 *   2) suppress モジュール内でも moduleId 単位で代表1件のみ返す
 */
export function getSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): SuggestionItem[] {
  const q = normalizeText(query)
  if (!q) return []

  // スコア付きでフィルタ
  const scored: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntry(index[i], q)
    if (score > 0) scored.push({ entry: index[i], score, originalIndex: i })
  }

  // スコア降順、同スコアは priority 降順、同 priority は元配列順（安定ソート）
  scored.sort((a, b) =>
    b.score - a.score ||
    b.entry.priority - a.entry.priority ||
    a.originalIndex - b.originalIndex,
  )

  // exactAlias / primaryDisplayName / nameAlias 完全一致（score≥5）かつ suppress が true なら:
  //   1) 他モジュールを除外
  //   2) 同一モジュール内でも moduleId 単位で1件のみに絞る（薬剤名入力 → 薬剤代表1件）
  // ※ score5以上 = exactAliases(7) / primaryDisplayName(6) / nameAliases(5) の完全一致
  const topScore = scored[0]?.score ?? 0
  let filtered = scored
  let suppressModuleIds: Set<string> | null = null
  if (topScore >= 5) {
    const suppressCandidates = scored.filter(s => s.score >= 5 && s.entry.suppressOnExactHit)
    if (suppressCandidates.length > 0) {
      // suppress 対象 moduleId の集合
      suppressModuleIds = new Set(suppressCandidates.map(s => s.entry.moduleId))
      // suppress 対象モジュールのエントリは除外し、suppress モジュールは代表1件ずつに差し替える
      const nonSuppressFiltered = scored.filter(s => !suppressModuleIds!.has(s.entry.moduleId))
      // suppress モジュールごとに先頭エントリ（最高スコア・最高priority・配列順先頭）を1件
      const suppressRepresentatives: Array<{ entry: SearchEntry; score: number; originalIndex: number }> = []
      for (const moduleId of suppressModuleIds) {
        const rep = scored.find(s => s.entry.moduleId === moduleId)
        if (rep) suppressRepresentatives.push(rep)
      }
      // suppress代表を先頭に、非suppress候補を後に並べる
      filtered = [...suppressRepresentatives, ...nonSuppressFiltered]
    }
  }

  // shortLabel ベースで重複排除（同一薬剤はカテゴリが違っても1件）
  const seenShortLabels = new Set<string>()
  // suppress モジュールは moduleId ベースでも1件に限定（shortLabel が異なる場合も含む）
  const seenSuppressModules = new Set<string>()
  const results: SuggestionItem[] = []

  for (const { entry } of filtered) {
    if (results.length >= limit) break
    // suppress モジュールは1件のみ
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
// E) フィルタ（Sidebar 用：既存の filteredTemplates 置き換え）
// ─────────────────────────────────────────────────────────────

/**
 * クエリに部分一致するテンプレ一覧を返す。
 * 空文字なら全件返す。
 */
export function filterTemplates(
  templates: Template[],
  query: string,
  index: SearchEntry[],
): Template[] {
  const q = normalizeText(query)
  if (!q) return templates
  const hitIds = new Set(
    index.filter(e => e.corpus.includes(q)).map(e => e.templateId),
  )
  return templates.filter(t => hitIds.has(t.templateId))
}
