/**
 * audit-generic-name-reachability.ts
 *
 * `brandCatalog[brand].displayGenericName` の各構成成分の読みが、当該 brand を
 * 検索結果上で解決できる形で登録されているかを検証する（errorCode:
 * GENERIC_NAME_UNREACHABLE）。
 *
 * 実行:
 *   npx tsx scripts/audit-generic-name-reachability.ts
 *
 * 原則は docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）、
 * 経緯と残課題は docs/OPEN_DESIGN_QUESTIONS.md Q-S1「残課題3」、
 * check の位置づけは docs/VALIDATOR_STANDARD.md §7 将来候補を参照。
 *
 * ── 何を検出するか ────────────────────────────────────────────
 *
 * 「その読みが1件も登録されていない brand があるか」という存在確認のみを行う。
 * 「どの読みを登録すべきか」という網羅性の判断は含まない（docs/VALIDATOR_STANDARD.md
 * §7「Human Review に委ねるもの」）。
 *
 * ── なぜ brand 単位で判定するか ───────────────────────────────
 *
 * lib/search.ts の resolveAllHighPrecisionBrands() は、brand 正式名・
 * brandCatalog[brand].aliases・displayGenericName に対する完全一致／前方一致のみで
 * 候補ブランドを特定する。module 単位の drug.search.nameAliases に読みがあっても、
 * brand 単位で解決できなければ matchedBrandName が undefined のまま候補が返る。
 * 配合剤（displayGenericName が "A/B" 形式）では第2成分が前方一致にならないため、
 * 構成成分の読みを brandCatalog[brand].aliases へ個別登録する必要がある（DP-09）。
 * ソリクア / ゾルトファイ / ライゾデグ が当該パターンの実装済み事例である。
 *
 * ── 判定 ──────────────────────────────────────────────────
 *
 * displayGenericName を成分へ分割し、各成分について次の2条件をともに満たせば PASS。
 *
 *   条件1（brand 解決可能性）: 成分の正規化形が、brand 正式名 / aliases /
 *     normalizedAliases / displayGenericName のいずれかに完全一致または前方一致する
 *   条件2（module ゲート通過可能性）: 成分の正規化形が、drug.search.exactAliases /
 *     nameAliases / drug.nameAliases / brandNames / drug.search.keywords のいずれかに
 *     完全一致・前方一致・部分一致する
 *
 * 正規化は lib/search.ts の normalizeText() をそのまま用いる（独自実装を持たない）。
 * commonSearchTokens / formulationSearchTokens は alias ではないため判定に用いない
 * （DP-05 の AND 検索は本 check が扱う一般名読み到達性とは別の保証である）。
 *
 * ── severity ─────────────────────────────────────────────
 *
 * GENERIC_NAME_UNREACHABLE は CHECK として報告する（exit 0 を維持）。既存データに
 * 未充足が残る段階で build を止めないための暫定 severity であり、データ補完の完了後に
 * FAIL へ昇格させる。
 * DISPLAY_GENERIC_NAME_SEPARATOR_UNKNOWN は FAIL とする（下記）。
 *
 * ── 成分区切り ────────────────────────────────────────────
 *
 * 区切り文字は Repository 実測に基づき "/" "／" "・" の3種に固定する。
 * 未知の区切り・複合表現が現れた場合は推測で分解規則を追加せず、
 * DISPLAY_GENERIC_NAME_SEPARATOR_UNKNOWN として停止する。
 *
 * 終了コード: FAIL が1件でもあれば 1、なければ 0
 */

import fs from 'fs'
import path from 'path'
import type { ModuleData } from '../lib/types'
import { normalizeText } from '../lib/search'
import { listModuleIds, printAuditReport, type AuditIssue } from './auditShared'

const MODULES_DIR = path.resolve('./data/modules')

/** 確定済みの成分区切り（OD-2）。ここを推測で拡張してはならない。 */
const COMPONENT_SEPARATORS = ['/', '／', '・']
const COMPONENT_SPLIT = new RegExp(`[${COMPONENT_SEPARATORS.join('')}]`)

/**
 * 成分区切りとして解釈しうるが COMPONENT_SEPARATORS に含まれない文字。
 * 出現した場合は分解規則を推測せず停止する。
 * 長音記号 U+30FC はカタカナ語の一部であり区切りではないため含めない。
 */
const UNKNOWN_SEPARATOR_CANDIDATES = [
  '＋', '+', '，', ',', '、', '；', ';', '｜', '|', '＆', '&', '･', '‧', '＼', '\\',
]

/** 複合を示唆する語。出現した場合は分解規則を推測せず停止する。 */
const UNKNOWN_COMPOUND_WORDS = ['配合', '合剤', 'および', '及び']

const issues: AuditIssue[] = []
const moduleIds = listModuleIds()

for (const moduleId of moduleIds) {
  const json: ModuleData = JSON.parse(
    fs.readFileSync(path.join(MODULES_DIR, `${moduleId}.json`), 'utf-8'),
  )
  const drug = json.drug
  const drugSearch = drug?.search

  // module 単位の alias プール（条件2 用）
  const modulePool: string[] = [
    ...(drugSearch?.exactAliases ?? []),
    ...(drugSearch?.nameAliases ?? []),
    ...(drug?.nameAliases ?? []),
    ...(drug?.brandNames ?? []),
    ...(drugSearch?.keywords ?? []),
  ]
    .map(normalizeText)
    .filter(Boolean)

  for (const [brand, entry] of Object.entries(drug?.brandCatalog ?? {})) {
    const displayGenericName = entry.displayGenericName
    // displayGenericName の欠落・空文字は ModuleValidator の
    // DISPLAY_GENERIC_NAME_MISSING / _EMPTY が別途 ERROR として検出する。
    if (!displayGenericName) continue

    // 未知の区切り・複合表現の検出（OD-2: 推測で分解規則を追加しない）
    const unknownSeparator = UNKNOWN_SEPARATOR_CANDIDATES.find(c => displayGenericName.includes(c))
    const unknownCompound = UNKNOWN_COMPOUND_WORDS.find(w => displayGenericName.includes(w))
    if (unknownSeparator || unknownCompound) {
      issues.push({
        moduleId,
        target: brand,
        code: 'DISPLAY_GENERIC_NAME_SEPARATOR_UNKNOWN',
        detail:
          `displayGenericName "${displayGenericName}" が未知の区切り・複合表現` +
          `（${JSON.stringify(unknownSeparator ?? unknownCompound)}）を含む。` +
          `成分分解規則を推測で拡張せず停止する（確定済みの区切りは ${JSON.stringify(COMPONENT_SEPARATORS)}）`,
      })
      continue
    }

    // brand 単位の識別子プール（条件1 用）
    const brandPool: string[] = [
      brand,
      ...(entry.aliases ?? []),
      ...(entry.normalizedAliases ?? []),
      displayGenericName,
    ]
      .map(normalizeText)
      .filter(Boolean)

    const components = displayGenericName
      .split(COMPONENT_SPLIT)
      .map(s => s.trim())
      .filter(Boolean)

    for (const component of components) {
      const q = normalizeText(component)
      if (!q) continue

      // 条件1: brand 解決可能性（resolveAllHighPrecisionBrands と同じ完全一致／前方一致）
      const brandResolvable = brandPool.some(a => a === q || a.startsWith(q))
      // 条件2: module ゲート通過可能性（scoreEntry と同じ完全一致・前方一致・部分一致）
      const moduleReachable = modulePool.some(a => a === q || a.startsWith(q) || a.includes(q))

      if (brandResolvable && moduleReachable) continue

      const missing = !brandResolvable
        ? !moduleReachable
          ? 'brand 単位・module 単位のいずれの alias 群にも存在しない'
          : `brand 単位の alias 群に存在しない（brandCatalog["${brand}"].aliases への読み登録が必要）`
        : 'module 単位の alias 群に存在しない（drug.search.nameAliases への読み登録が必要）'

      issues.push({
        moduleId,
        target: brand,
        code: 'GENERIC_NAME_UNREACHABLE',
        detail:
          `displayGenericName "${displayGenericName}" の成分 "${component}"` +
          `（正規化形 "${q}"）の読みが${missing}`,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────
// レポート出力
// ─────────────────────────────────────────────────────────────

function severity(code: string): 'FAIL' | 'CHECK' {
  return 'FAIL'
}

const exitCode = printAuditReport(
  'Generic name reading reachability',
  moduleIds.length,
  issues,
  severity,
)
process.exit(exitCode)
