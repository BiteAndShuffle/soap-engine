/**
 * generate-subject-migration-fixture.ts
 *
 * U-4b（Q-S2）の expected semantic delta を fixture として固定する生成スクリプト。
 *
 * **実装前に実行し、`tests/fixtures/subjectMigration.expected.json` を確定させる。**
 * 実装後に `tests/brandResolutionSubjectMigration.test.ts` が同じ projection を
 * 再計算し、本 fixture と完全一致することを検証する。
 *
 * 目的:
 *   U-4b は挙動不変 Unit ではない。「generic 候補の SOAP 主語が代表 brand 名から
 *   一般名へ変わる」という**意図された変更**があるため、変更前に全件を凍結し、
 *   実装後に「expected delta 以外が変化していないこと」を機械的に確認する。
 *
 * 実行:
 *   npx tsx scripts/generate-subject-migration-fixture.ts
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - 論点・工程 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 */
import { writeFileSync } from 'node:fs'
import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, type SearchEntry, type DrugSuggestionItem } from '../lib/search'
import { resolveDrugName, resolveSubjectFromResolution } from '../lib/drugSubject'
import type { ModuleData } from '../lib/types'

const index: SearchEntry[] = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const modOf = (id: string) => ALL_MODULES.find(m => m.moduleId === id) as unknown as ModuleData

/** 全 module の alias / brand / displayGenericName からクエリ母集団を構成する */
function buildQueries(): string[] {
  const qs = new Set<string>()
  for (const m of ALL_MODULES) {
    const s = (m.drug as { search?: Record<string, unknown> } | undefined)?.search ?? {}
    for (const k of ['exactAliases', 'nameAliases', 'prefixAliases', 'keywords']) {
      for (const a of ((s[k] as string[] | undefined) ?? [])) qs.add(String(a))
    }
    if (s.primaryDisplayName) qs.add(String(s.primaryDisplayName))
    for (const b of (m.drug?.brandNames ?? [])) qs.add(String(b))
    for (const [, e] of Object.entries(m.drug?.brandCatalog ?? {})) {
      for (const a of (e.aliases ?? [])) qs.add(String(a))
      if (e.displayGenericName) qs.add(String(e.displayGenericName))
    }
  }
  return [...qs].filter(q => q.length > 0).sort()
}

/**
 * U-4b 適用**前**の legacy subject（`handleSelectDrugSuggestion` :1070-1076 /
 * `handleComposeDrugSelect` :1111-1114 の文字列推論を再現）。
 */
export function legacySubjectOf(item: DrugSuggestionItem): string {
  const drug = modOf(item.moduleId).drug
  if (item.displayName !== undefined && item.displayName !== item.matchedBrandName) return item.displayName
  if (item.drugDisplayLabel !== undefined && item.drugDisplayLabel !== item.matchedBrandName) return item.drugDisplayLabel
  return resolveDrugName(drug, item.matchedBrandName)
}

export interface SubjectRow {
  query: string
  moduleId: string
  denotation: 'brand' | 'generic' | 'module'
  /** U-4b 適用前の主語（文字列推論由来） */
  legacySubject: string
  /** U-4b 適用後の主語（BrandResolution 由来）。null は denotation='module' のみ */
  resolutionSubject: string | null
  /** legacySubject !== (resolutionSubject ?? '') のとき true */
  changed: boolean
}

export function buildProjection(): SubjectRow[] {
  const rows: SubjectRow[] = []
  for (const query of buildQueries()) {
    for (const r of getDrugSuggestions(query, index, 8)) {
      const legacySubject = legacySubjectOf(r)
      const resolutionSubject = resolveSubjectFromResolution(r.resolution)
      rows.push({
        query,
        moduleId: r.moduleId,
        denotation: r.resolution.denotation,
        legacySubject,
        resolutionSubject,
        changed: legacySubject !== (resolutionSubject ?? ''),
      })
    }
  }
  return rows
}

// ─────────────────────────────────────────────────────────────

const rows = buildProjection()
const byDen = { brand: 0, generic: 0, module: 0 } as Record<string, number>
for (const r of rows) byDen[r.denotation]++

const changed = rows.filter(r => r.changed)
const toPatterns = (rs: SubjectRow[]) => [...new Map(
  rs.map(r => [`${r.moduleId}|${r.legacySubject}|${r.resolutionSubject}`, r]),
).values()]
  .map(r => ({
    moduleId: r.moduleId,
    denotation: r.denotation,
    legacySubject: r.legacySubject,
    resolutionSubject: r.resolutionSubject,
    exampleQuery: r.query,
  }))
  .sort((a, b) => a.moduleId.localeCompare(b.moduleId))

// production 到達可能な delta（denotation='brand' / 'generic'）と、
// U-5 gate により subject consumer へ到達しない delta（denotation='module'）を分離する。
// 前者だけが実際に SOAP 本文へ現れる意味論的変更である。
const reachable = changed.filter(r => r.denotation !== 'module')
const gated = changed.filter(r => r.denotation === 'module')

const fixture = {
  _comment: 'U-4b expected semantic delta。scripts/generate-subject-migration-fixture.ts で生成する。手で編集しない。',
  generatedAgainst: 'Q-S2 U-5 完了時点（U-4b 実装前）',
  summary: {
    queries: new Set(rows.map(r => r.query)).size,
    rows: rows.length,
    byDenotation: byDen,
    changedRows: changed.length,
    /** production の SOAP 本文へ実際に現れる変更（brand / generic） */
    reachableChangedRows: reachable.length,
    reachableChangedPatterns: toPatterns(reachable).length,
    reachableChangedModules: [...new Set(reachable.map(r => r.moduleId))].sort(),
    /** U-5 gate により subject consumer へ到達しないため SOAP には現れない（module） */
    gatedChangedRows: gated.length,
    gatedChangedModules: [...new Set(gated.map(r => r.moduleId))].sort(),
  },
  /**
   * **production 到達可能な期待 delta。** U-4b 実装後、SOAP 主語が変化するのは
   * ここに挙げた組み合わせだけでなければならない（denotation='brand' は 0 件が期待値）。
   */
  expectedReachableDelta: toPatterns(reachable),
  /**
   * denotation='module' の raw projection 差分。legacy は brandNames[0] を主語にしていたが
   * resolution は null を返す。**U-5 gate により subject consumer へ到達しないため
   * SOAP 本文には現れない。** 参考として記録する（正しさの検証は gate 側テストが担う）。
   */
  gatedDelta: toPatterns(gated),
  /** 全候補行の projection（実装後の完全一致検証用） */
  rows,
}

const out = new URL('../tests/fixtures/subjectMigration.expected.json', import.meta.url)
writeFileSync(out, JSON.stringify(fixture, null, 2) + '\n', 'utf-8')

console.log('=== U-4b expected semantic delta ===')
console.log(`  queries: ${fixture.summary.queries} / rows: ${rows.length}`)
console.log(`  denotation: ${JSON.stringify(byDen)}`)
console.log(`  changed rows (raw): ${changed.length}`)
console.log('\n  --- production 到達可能な expected delta（SOAP 本文に現れる）---')
for (const d of fixture.expectedReachableDelta) {
  console.log(`   [${d.denotation}] ${d.moduleId}  "${d.legacySubject}" → "${d.resolutionSubject}"  (q=${d.exampleQuery})`)
}
console.log(`   → ${fixture.summary.reachableChangedPatterns} パターン / ${fixture.summary.reachableChangedRows} 行 / ${fixture.summary.reachableChangedModules.length} module`)
console.log(`\n  --- U-5 gate 済み（subject consumer へ到達しないため SOAP には現れない）---`)
console.log(`   ${fixture.summary.gatedChangedRows} 行 / ${fixture.summary.gatedChangedModules.length} module（すべて denotation='module'）`)
console.log(`\n  brand の差分: ${changed.filter(r => r.denotation === 'brand').length} 件（0 期待）`)
console.log(`  module 行で resolutionSubject が null でないもの: ${rows.filter(r => r.denotation === 'module' && r.resolutionSubject !== null).length} 件（0 期待）`)
console.log(`\n  → ${out.pathname}`)
