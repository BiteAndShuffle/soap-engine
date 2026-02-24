/**
 * search.ts — 正規化・グループ分類・サジェスト検索
 *
 * 依存ライブラリなし。ピュア TypeScript。
 */

import type { Template, ModuleData } from './types'
import { getMenuGroup, shortLabel as getShortLabel } from './menuGroups'

// ─────────────────────────────────────────────────────────────
// A) グループ定義
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

/** JSON の type 文字列 → グループキー */
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

/** テンプレ一覧を GROUP_ORDER 順のグループ配列に変換 */
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
  /** 結合済み・正規化済みの検索対象テキスト */
  corpus: string
  /** 表示用スニペット（label をそのまま） */
  label: string
  /** 薬効群名を省いた短縮ラベル */
  shortLabel: string
  /** 大分類グループ名（サブテキスト表示用） */
  groupLabel: string
  /** 薬剤表示名（例: リベルサス（セマグルチド）） */
  drugDisplayLabel?: string
}

/** 静的キーワード（薬品名・表記揺れ）— モジュール横断で使う */
const STATIC_KEYWORDS: string[] = [
  'リベルサス', 'りべるさす', 'Rybelsus', 'rybelsus',
  'セマグルチド', 'せまぐるちど', 'semaglutide',
  'glp1', 'glp-1', 'glp1ra', 'glp-1ra',
  'インスリン', 'いんすりん',
  'sglt2', 'メトホルミン', 'めとほるみん',
  '糖尿病', 'とうにょうびょう', 'シックデイ', 'しっくでい',
  '低血糖', 'ていけっとう', '消化器', '膵炎', '食欲不振',
  'コンプライアンス', 'こんぷらいあんす', '服薬', '副作用',
]

/**
 * ModuleData からサジェスト用エントリ一覧を生成する。
 * 各テンプレに対して: label + type + タグ + 静的キーワード を結合し正規化。
 */
export function buildSearchIndex(moduleData: ModuleData): SearchEntry[] {
  const globalTags: string[] = [
    ...(moduleData.drugTags ?? []),
    ...(moduleData.drugSpecificTags ?? []),
    ...(moduleData.situationTags ?? []),
    ...(moduleData.riskTags ?? []),
    ...(moduleData.conditionalRiskTags ?? []),
    ...(moduleData.severityTags ?? []),
    ...(moduleData.drugDisplay?.examples ?? []),
    moduleData.drugDisplay?.class ?? '',
    ...STATIC_KEYWORDS,
  ]
  const globalCorpus = normalizeText(globalTags.join(' '))

  const exampleDrugName = moduleData.drugDisplay?.examples?.[0]

  return moduleData.templates.map(tpl => {
    const perTemplate = [tpl.label, tpl.type].join(' ')
    const corpus = normalizeText(perTemplate) + ' ' + globalCorpus
    return {
      templateId: tpl.templateId,
      corpus,
      label: tpl.label,
      shortLabel: getShortLabel(tpl.label),
      groupLabel: getMenuGroup(tpl.type),
      drugDisplayLabel: exampleDrugName,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// D) サジェスト検索
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
 * クエリにマッチするテンプレを最大 `limit` 件返す。
 * - 空文字は [] を返す（候補なし）
 * - label 前方一致を優先 → corpus 部分一致を後続に
 * - 同一 shortLabel のエントリは1件のみ採用（薬剤名でユニーク化）
 *   同一薬剤がカテゴリ違いで複数ヒットしても1件だけ出す。
 */
export function getSuggestions(
  query: string,
  index: SearchEntry[],
  limit = 8,
): SuggestionItem[] {
  const q = normalizeText(query)
  if (!q) return []

  const priority: SuggestionItem[] = []
  const secondary: SuggestionItem[] = []

  // shortLabel ベースで重複排除（同一薬剤はカテゴリが違っても1件）
  const seenShortLabels = new Set<string>()

  for (const entry of index) {
    if (!entry.corpus.includes(q)) continue

    if (seenShortLabels.has(entry.shortLabel)) continue
    seenShortLabels.add(entry.shortLabel)

    const item: SuggestionItem = {
      templateId: entry.templateId,
      label: entry.label,
      shortLabel: entry.shortLabel,
      groupLabel: entry.groupLabel,
      drugDisplayLabel: entry.drugDisplayLabel,
    }
    if (normalizeText(entry.label).startsWith(q)) {
      priority.push(item)
    } else {
      secondary.push(item)
    }
  }

  return [...priority, ...secondary].slice(0, limit)
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
