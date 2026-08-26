/**
 * decisionFallbackSafety.test.ts — buildS decision grouping fallback safety
 *
 * Owner Decision（Decision Grouping Fallback Safety / 境界 Y / 実装形 S1）:
 *   splitDecision が subject / predicate へ構造化できなかった decision entry
 *   （predicate === ''）は、統合可能な decision group として扱う根拠がない。
 *   したがって共有 predicate bucket へ入れず、独立 entry として入力順を保持する。
 *
 * 対象実装: lib/buildSoap.ts buildS() ③ decision セクション（predicateKey 算出のみ）。
 * 本テストは production export（mergeBlocks 経由）のみを使い、buildS の mirror
 * 実装は作らない（buildS は非 export のため mergeBlocks が唯一の入口）。
 *
 * Scope: 本 Unit は fallback grouping safety のみを扱う。
 *   Rapid UI gate / Unit 4D-4・dose_decreased classification・continued_do 意味論・
 *   clinicalDomain 不整合・primaryNodeProjection には触れない。
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mergeBlocks } from '../lib/buildSoap'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { resolveDrugName } from '../lib/drugSubject'
import { ALL_MODULES } from '../data/modules/index'
import type { ModuleData, Scenario, MergedBlock, SoapFields } from '../lib/types'
import type { RapidState } from '../lib/rapidState'
import { readFileSync } from 'node:fs'

const RELATIONS = ['new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do'] as const
const CONDITIONS = ['stable', 'improved', 'unchanged', 'not_improved'] as const
const SPLICE = /。・/
const EMPTY: SoapFields = { S: '', O: '', A: '', P: '' }

// ─────────────────────────────────────────────────────────────
// Layer A ヘルパー: 合成 MergedBlock を直接 mergeBlocks へ渡す
// ─────────────────────────────────────────────────────────────

let synthCounter = 0
function synthBlock(s: string, clinicalDomain = 'diabetes', groupKey?: string): MergedBlock {
  synthCounter++
  return {
    id: `synth-${synthCounter}`,
    templateLabel: 't',
    fields: { ...EMPTY, S: s },
    clinicalDomain,
    groupKey,
    domain: 'd',
  }
}

function mergeSynth(blocks: MergedBlock[]): SoapFields {
  const [first, ...rest] = blocks
  return mergeBlocks(rest, first.fields, first.templateLabel, first.closingText, undefined, first.groupKey, first.clinicalDomain)
}

// ─────────────────────────────────────────────────────────────
// Layer B ヘルパー: production corpus から MergedBlock を導出する
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function blockOf(mod: ModuleData, sc: Scenario, rapid: RapidState): MergedBlock {
  const core = deriveNodeBlockCore(sc, mod, [], rapid, resolveDrugName(mod.drug, undefined) ?? '')
  return { id: 'b', fields: core.rawFields, domain: resolveDomain(mod), ...core }
}

function mergeNodes(primary: MergedBlock, rest: MergedBlock[]): SoapFields {
  return mergeBlocks(rest, primary.fields, primary.templateLabel, primary.closingText, undefined, primary.groupKey, primary.clinicalDomain)
}

type Case = { mod: ModuleData; sc: Scenario }
function clinicalDomainOf(c: Case): string {
  return c.mod.composition?.clinicalDomain ?? '__none__'
}

// 1 module あたり 1 代表 scenario（capable / any）に絞って corpus invariant を軽量化する。
// module 追加時にも自動で拡張される（ALL_MODULES を直接参照するため golden 値を持たない）。
const anyRepresentative = new Map<string, Case>()
const capableRepresentative = new Map<string, Case>()
for (const mod of ALL_MODULES) {
  for (const sc of mod.scenarios) {
    if (!anyRepresentative.has(mod.moduleId)) anyRepresentative.set(mod.moduleId, { mod, sc })
    if (isScenarioSReplacementCapable(sc) && !capableRepresentative.has(mod.moduleId)) {
      capableRepresentative.set(mod.moduleId, { mod, sc })
    }
  }
}
const anyList = [...anyRepresentative.values()]
const capableList = [...capableRepresentative.values()]

// ═══════════════════════════════════════════════════════════════
// Layer A — rule contract（synthetic MergedBlock / module 非依存）
// ═══════════════════════════════════════════════════════════════

describe('Layer A: buildS decision fallback grouping — rule contract', () => {
  const FB1 = '前回からセマグルチドに変更となり、落ち着いている。'   // predicate === '' (fallback)
  const FB2 = '前回からリラグルチドに変更となり、落ち着いている。'   // predicate === '' (fallback)
  const NF1 = 'リナグリプチンは、効果不十分のため増量となった。'     // predicate !== '' (structured)
  const NF2 = 'メトホルミンは、効果不十分のため増量となった。'       // 同一 predicate → NF1 と統合されるべき

  test('A1: fallback entry 2件（異テキスト）は独立した2行になり、「。・」を含まない', () => {
    const out = mergeSynth([synthBlock(FB1), synthBlock(FB2)])
    assert.equal(out.S, `${FB1}\n${FB2}`)
    assert.equal(SPLICE.test(out.S), false)
  })

  test('A2: fallback entry 2件（完全同一テキスト）は1行に完全重複排除される', () => {
    const out = mergeSynth([synthBlock(FB1), synthBlock(FB1)])
    assert.equal(out.S, FB1)
  })

  test('A3: fallback entry 3件（うち2つ同一）は2行になる', () => {
    const out = mergeSynth([synthBlock(FB1), synthBlock(FB2), synthBlock(FB1)])
    assert.equal(out.S, `${FB1}\n${FB2}`)
  })

  test('A4: predicate !== \'\' の既存 subject 統合は byte 保存される（回帰ガード）', () => {
    const out = mergeSynth([synthBlock(NF1), synthBlock(NF2)])
    assert.equal(out.S, 'リナグリプチン・メトホルミンは、効果不十分のため増量となった。')
  })

  test('A5: fallback → 非fallback → fallback の入力順を保持する（前方集約しない）', () => {
    const out = mergeSynth([synthBlock(FB1), synthBlock(NF1), synthBlock(FB2)])
    assert.equal(out.S, `${FB1}\n${NF1}\n${FB2}`)
  })

  test('A6（回帰）: 非fallback → fallback → 非fallback は従来どおり統合される', () => {
    const out = mergeSynth([synthBlock(NF1), synthBlock(FB1), synthBlock(NF2)])
    assert.equal(out.S, `リナグリプチン・メトホルミンは、効果不十分のため増量となった。\n${FB1}`)
  })

  test('A7（回帰）: fallback 単独は無変化', () => {
    assert.equal(mergeSynth([synthBlock(FB1)]).S, FB1)
  })

  test('A8（回帰）: 非fallback 単独は無変化', () => {
    assert.equal(mergeSynth([synthBlock(NF1)]).S, NF1)
  })

  test('A9: cross-domain の fallback は domain 分離により2行になる（従来と同一）', () => {
    const out = mergeSynth([synthBlock(FB1, 'diabetes'), synthBlock(FB2, 'allergy')])
    assert.equal(out.S, `${FB1}\n${FB2}`)
  })
})

// ═══════════════════════════════════════════════════════════════
// Layer B — corpus invariant（module 依存・golden値を持たない）
// ═══════════════════════════════════════════════════════════════

describe('Layer B: corpus invariant', () => {
  test('B1: same-domain multi-Rapid（全module代表）で「。・」spliceが0件', () => {
    let checked = 0
    for (const p of capableList) {
      for (const q of capableList) {
        if (p.mod.moduleId === q.mod.moduleId) continue
        if (clinicalDomainOf(p) !== clinicalDomainOf(q)) continue
        for (const r1 of RELATIONS) {
          for (const r2 of RELATIONS) {
            checked++
            const out = mergeNodes(
              blockOf(p.mod, p.sc, { previousEvent: r1, currentOutcome: 'stable' }),
              [blockOf(q.mod, q.sc, { previousEvent: r2, currentOutcome: 'stable' })],
            )
            assert.equal(
              SPLICE.test(out.S), false,
              `splice detected: ${p.mod.moduleId}/${p.sc.id}[${r1}] + ${q.mod.moduleId}/${q.sc.id}[${r2}]\nS=${out.S}`,
            )
          }
        }
      }
    }
    assert.ok(checked > 0, 'no same-domain capable pairs were checked (test is vacuous)')
  })

  test('B2: baseline（Rapidなし・全module代表・同一domain）で「。・」spliceが0件', () => {
    let checked = 0
    for (const p of anyList) {
      for (const q of anyList) {
        if (p.mod.moduleId === q.mod.moduleId) continue
        if (clinicalDomainOf(p) !== clinicalDomainOf(q)) continue
        checked++
        const out = mergeNodes(blockOf(p.mod, p.sc, null), [blockOf(q.mod, q.sc, null)])
        assert.equal(SPLICE.test(out.S), false, `baseline splice: ${p.mod.moduleId}/${p.sc.id} + ${q.mod.moduleId}/${q.sc.id}\nS=${out.S}`)
      }
    }
    assert.ok(checked > 0, 'no same-domain pairs were checked (test is vacuous)')
  })

  test('B3: corpus に genuine multi-subject decision merge（predicate !== \'\'）が1件以上存在する', () => {
    // B1/B2 が「そもそも decision merge が発生しない corpus」で無意味に PASS していないことの保証。
    let found = 0
    let example: string | undefined
    for (const p of anyList) {
      for (const q of anyList) {
        if (p.mod.moduleId === q.mod.moduleId) continue
        if (clinicalDomainOf(p) !== clinicalDomainOf(q)) continue
        const out = mergeNodes(blockOf(p.mod, p.sc, null), [blockOf(q.mod, q.sc, null)])
        // 「・」で結合され、かつ「。・」splice ではない行 = 意図された subject 統合
        const hasIntendedMerge = out.S.split('\n').some(line => line.includes('・') && !SPLICE.test(line))
        if (hasIntendedMerge) {
          found++
          if (!example) example = out.S
        }
      }
    }
    assert.ok(found > 0, 'no genuine multi-subject decision merge found in corpus (B1/B2 may be vacuous)')
  })

  test('B4: lib/buildSoap.ts は Rapid を参照しない（Requirement 8: fallback safety は Rapid 固有条件ではない）', () => {
    const src = readFileSync(new URL('../lib/buildSoap.ts', import.meta.url), 'utf-8')
    assert.equal(/rapid/i.test(src), false, 'lib/buildSoap.ts が Rapid 概念を参照している（本 rule は Rapid 非依存でなければならない）')
  })

  test('B5: corpus上、fallback の subjectKey と非fallback の predicateKey が衝突しない', () => {
    // S1 実装（predicateKey = predicate === '' ? subjectKey : normalizeAdminVerbForKey(predicate)）は
    // fallback と非fallback を同一 key 空間で扱う。衝突すれば fallback が非fallback bucket へ
    // 誤って合流し、「・」結合が復活する。corpus 全体（capable scenario は全 Rapid 20 通り）で
    // この前提が成立することを実測ガードする。
    const OBS_PREFIX = '使用して、症状は落ち着いている。'
    function classify(t: string): 'decision' | 'reason' | 'observation' | 'other' {
      if (/(?:増量|中止|変更)(?:となった|になった|ました|となり)/.test(t)) return 'decision'
      if (/(?:減量|希望)(?:となった|になった|なりました|された)/.test(t)) return 'decision'
      if (/(?:追加|導入)となった/.test(t)) return 'reason'
      if (t.startsWith(OBS_PREFIX)) return 'observation'
      return 'other'
    }
    const MAX = 30
    function splitDecisionLocal(t: string): { subject: string; predicate: string } {
      const m = t.match(/^(.+?)(は[、,].+)$/)
      if (m) { const s = m[1].length <= MAX ? m[1] : m[1].slice(0, MAX); return { subject: s, predicate: t.slice(s.length) } }
      const m2 = t.match(/^(.+?)(が.+)$/)
      if (m2) { const s = m2[1].length <= MAX ? m2[1] : m2[1].slice(0, MAX); return { subject: s, predicate: t.slice(s.length) } }
      return { subject: t, predicate: '' }
    }
    const normalizeAdminVerb = (t: string) => t.replace(/服用により/g, '使用により').replace(/服用後/g, '使用後').replace(/服用中/g, '使用中')

    const fallbackKeys = new Set<string>()
    const predicateKeys = new Set<string>()
    const feed = (text: string) => {
      if (!text || classify(text) !== 'decision') return
      const { subject, predicate } = splitDecisionLocal(text)
      if (predicate === '') fallbackKeys.add(normalizeAdminVerb(subject))
      else predicateKeys.add(normalizeAdminVerb(predicate))
    }
    for (const c of anyList) feed(blockOf(c.mod, c.sc, null).fields.S.trim())
    for (const c of capableList) {
      for (const r of RELATIONS) {
        for (const cond of CONDITIONS) {
          feed(blockOf(c.mod, c.sc, { previousEvent: r, currentOutcome: cond }).fields.S.trim())
        }
      }
    }
    const collisions = [...fallbackKeys].filter(k => predicateKeys.has(k))
    assert.deepEqual(
      collisions, [],
      `fallback subjectKey と非fallback predicateKey が衝突している（S1 の key 空間前提が崩れた）: ${collisions.join(', ')}`,
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Layer C — one-shot regression evidence（permanent test にしない）
//
// 実装前 baseline（HEAD c69e5fe・35 module / 1,060 scenario）で実測した digest:
//   sha256 = 30e4185baaae5ccc8bf7604e1f10e8276b10d95453e65a82ac4372f1cdd68805
//   enumeration = E1(573,476) + E2(1,861,760) + E3(69,240) + E4(14,150) = 2,518,626
// module 追加で必ず変わるため permanent test 化しない。この digest は実装時に
// 手動スクリプトで一度だけ再現し、一致を確認したら破棄する（このファイルには含めない）。
// ═══════════════════════════════════════════════════════════════
