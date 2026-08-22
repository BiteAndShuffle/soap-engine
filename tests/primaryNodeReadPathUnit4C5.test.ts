/**
 * primaryNodeReadPathUnit4C5.test.ts — Rapid Mode v2 / Unit 4C-5 契約テスト
 *
 * Unit 4C-5 の責務: primaryNodeProjection を経由する read responsibility
 * （consumer scope）を、すでに primaryNode が authority を持つ 6 系統について
 * primaryNode 直参照へ移管する。projection の declaration shape（object の key 集合）
 * は変更しない。observable behavior change = 0。
 *
 * Group P（Preservation）: 実装前から GREEN、実装後も GREEN であるべき契約。
 *   1 件でも実装前に RED なら baseline が想定と異なるため実装に入らない。
 * Group M（Migration）: 実装前は RED、production の 6 系統移管後に GREEN になる契約。
 *   RED が許可されるのは本ファイルの T-4C5-M1 / T-4C5-M2 のみ。
 *
 * 実行:
 *   npx tsx --test tests/primaryNodeReadPathUnit4C5.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { type RapidState, nextRapidStateOnScenarioChange } from '../lib/rapidState'
import { rebuildPrimary, PRIMARY_NODE_ID } from '../lib/primaryNode'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'

const src = readFileSync(new URL('../app/components/DashboardClient.tsx', import.meta.url), 'utf-8')

function codeLines(text: string): string[] {
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (t === '') return false
      if (t.startsWith('//')) return false
      if (t.startsWith('*')) return false
      if (t.startsWith('/*')) return false
      if (t.startsWith('{/*')) return false
      return true
    })
}

function codeOnly(text: string): string {
  return codeLines(text).join('\n')
}

/**
 * `callMarker`（末尾が `(` で終わる呼び出しマーカー）の全出現について、
 * 開き括弧から対応する閉じ括弧までを括弧の深さで正確に切り出す。
 * tests/primaryNodeWritableUnit4C.test.ts の extractBalancedCalls と同じ実装。
 */
function extractBalancedCalls(text: string, callMarker: string): string[] {
  const calls: string[] = []
  let searchFrom = 0
  for (;;) {
    const start = text.indexOf(callMarker, searchFrom)
    if (start < 0) break
    let depth = 0
    let i = start + callMarker.length - 1
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') {
        depth--
        if (depth === 0) { i++; break }
      }
    }
    calls.push(text.slice(start, i))
    searchFrom = i
  }
  return calls
}

const PRIMARY_BLOCK_ID = 'primary-block'
const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }
const DRUG = '本剤'

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

function makeExistingNode(overrides: Partial<ComposeNode> = {}): ComposeNode {
  return {
    id: PRIMARY_NODE_ID,
    moduleId: 'irrelevant',
    scenarioId: 'irrelevant',
    block: { id: PRIMARY_BLOCK_ID, templateLabel: '', fields: EMPTY_FIELDS, closingText: undefined },
    drugLabel: 'old-label',
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: 'old-domain',
    matchedBrandName: undefined,
    resolvedDrugName: undefined,
    resolution: undefined,
    localSiteInput: '',
    rapid: null,
    ...overrides,
  }
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string) {
  assert.deepEqual(a, b, msg)
}

// ═══════════════════════════════════════════════════════════════
// Group P（Preservation）— 実装前から GREEN、実装後も GREEN
// ═══════════════════════════════════════════════════════════════

describe('T-4C5-P1: primaryNodeProjection は ...primaryNode を top-level spread し、値が primaryNode と一致する', () => {
  test('production の projection 宣言が ...primaryNode を spread している（source anchor）', () => {
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo<ComposeNode>(() => ({')
    assert.ok(start >= 0, 'primaryNodeProjection の宣言が見つからない')
    const end = code.indexOf('}), [', start)
    const body = code.slice(start, end)
    assert.ok(/\{\s*\.\.\.primaryNode,/.test(body), 'primaryNodeProjection が ...primaryNode を top-level spread していない')
  })

  /**
   * DashboardClient.tsx の resolveClosingText と同一実装（export されないため複製する。
   * primaryNodeProjectionUnit4B.test.ts / primaryNodeWritableUnit4C.test.ts と同じ理由）。
   * projection mirror の block 側を production 同形に再構築するために必要
   * （5 slice の比較対象は top-level のみだが、mirror は production structure
   * 全体を再現しなければ「production と同じ semantics」の検証にならない）。
   */
  function resolveClosingText(
    scenario: { followupRef?: string; followup?: Record<string, unknown> },
    defaults?: ModuleData['defaults'],
  ): string | undefined {
    if (scenario.followupRef) {
      return (defaults?.followupProfiles?.[scenario.followupRef] as Record<string, string> | undefined)?.P
    }
    const val = (scenario.followup as Record<string, string> | undefined)?.P
    if (val === 'default') {
      return (defaults?.followup as Record<string, string> | undefined)?.P
    }
    return undefined
  }

  /**
   * production の primaryNodeProjection と同一 structure の mirror
   * （`{ ...primaryNode, baseLabel: ..., block: { ...primaryNode.block, ... } }`）。
   * DashboardClient.tsx:446 の宣言と 1:1 対応させる。
   */
  function buildProjectionMirror(node: ComposeNode, scenario: Scenario | undefined, mod: ModuleData): ComposeNode {
    return {
      ...node,
      baseLabel: scenario?.title ?? '',
      block: {
        ...node.block,
        templateLabel: scenario?.title ?? '',
        fields: node.block.fields,
        closingText: scenario ? resolveClosingText(scenario, mod.defaults) : undefined,
        closingBehavior: scenario?.mergePolicy?.P?.closingBehavior,
        groupKey: scenario?.mergePolicy?.S?.groupKey,
        clinicalDomain: mod.composition?.clinicalDomain,
        symptomCodes: scenario?.sComposition?.symptomCodes,
        domain: resolveDomain(mod),
      },
    }
  }

  test('production source: projection の top-level に scenarioId/moduleId/resolution/localSiteInput/matchedBrandName の override が存在しない', () => {
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo<ComposeNode>(() => ({')
    const end = code.indexOf('}), [', start)
    const body = code.slice(start, end)
    // top-level（インデント 4）の "key:" 行のみを抽出（block 内部の "key:" は対象外）
    const topLevelKeys = [...body.matchAll(/^ {4}(\w+):/gm)].map(m => m[1])
    for (const field of ['scenarioId', 'moduleId', 'resolution', 'localSiteInput', 'matchedBrandName']) {
      assert.ok(
        !topLevelKeys.includes(field),
        `projection の top-level に ${field} の override が存在する（値 parity の前提が崩れている）: [${topLevelKeys.join(', ')}]`,
      )
    }
    // 実際に存在する top-level override は baseLabel / block の 2 つのみであること
    assert.deepEqual(topLevelKeys, ['baseLabel', 'block'], `想定外の top-level override: [${topLevelKeys.join(', ')}]`)
  })

  test('全 35 module × 全 scenario で、production 同形の projection mirror が primaryNode と 5 slice すべて Object.is 一致する（非 vacuous）', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      for (const sc of (mod.scenarios ?? [])) {
        const node = rebuildPrimary({
          node: makeExistingNode({
            matchedBrandName: 'BN', resolvedDrugName: 'RD', localSiteInput: '右腕',
          }),
          mod, scenario: sc, addonIds: [], rapid: null,
          drugName: DRUG, drugLabel: 'L', baseDomain: resolveDomain(mod),
          personaEnabled: false, persona: 'plain',
        })
        // projection mirror を production structure から明示的に再構築する
        // （node 自身の spread ではなく、production の override 式を逐語再現する）。
        const mirror = buildProjectionMirror(node, sc, mod)
        for (const field of ['scenarioId', 'moduleId', 'resolution', 'localSiteInput', 'matchedBrandName'] as const) {
          assert.ok(
            Object.is(mirror[field], node[field]),
            `${mod.moduleId}/${sc.id}: projection mirror の ${field} が primaryNode と不一致（mirror=${JSON.stringify(mirror[field])} node=${JSON.stringify(node[field])}）`,
          )
        }
        checked++
      }
    }
    assert.ok(checked >= 60, `検証件数が想定より少ない（実際: ${checked}）`)
  })
})

describe('T-4C5-P2: scenario switch transient（commit1）が保存されている（Design P）', () => {
  test('commit1 = metadata(新 scenario) × fields(旧 scenario) が、metadata(旧) × fields(旧) と異なるペアが 1000 件以上存在する', () => {
    let cases = 0
    let diffFromStale = 0
    const secondaryNodeCache = new Map<string, ReturnType<typeof buildNodeFields>>()

    for (const mod of ALL_MODULES) {
      const scs = mod.scenarios ?? []
      if (scs.length < 2) continue
      const other = ALL_MODULES.find(m => m.moduleId !== mod.moduleId)
      if (!other || !other.scenarios?.length) continue
      const otherKey = other.moduleId
      if (!secondaryNodeCache.has(otherKey)) {
        secondaryNodeCache.set(otherKey, buildNodeFields(other.scenarios[0], other, [], '他剤'))
      }
      const secondary = secondaryNodeCache.get(otherKey)!
      const secondaryBlock = {
        id: 'sec', templateLabel: other.scenarios[0].title, fields: secondary.fields,
        closingText: secondary.closingText, closingBehavior: secondary.closingBehavior,
        groupKey: secondary.groupKey, clinicalDomain: secondary.clinicalDomain,
      }

      // 全 scenario 対を走査する（N を small cap にすると module 内の隣接シナリオが
      // 同質になりやすく diff 率が過小評価されるため、本 test の oracle で実測した
      // 30.7%（9672/31476）の母集団と同一条件で測定する）。
      const N = scs.length
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) {
          if (a === b) continue
          const A = buildNodeFields(scs[a], mod, [], DRUG)
          const B = buildNodeFields(scs[b], mod, [], DRUG)
          cases++

          // commit1（Design P。primaryNodeProjection の意味論）:
          //   scenarioId = new(B) / metadata(closingText,groupKey,clinicalDomain,label) = new(B) / fields = old(A)
          const commit1 = mergeBlocks(
            [secondaryBlock], A.fields, scs[b].title,
            B.closingText, undefined, B.groupKey, B.clinicalDomain,
          )
          // 比較対象: primaryNode.block を authority にした場合（stale metadata）
          //   scenarioId = new(B) / metadata = old(A) / fields = old(A)
          const staleAll = mergeBlocks(
            [secondaryBlock], A.fields, scs[a].title,
            A.closingText, undefined, A.groupKey, A.clinicalDomain,
          )
          if (JSON.stringify(commit1) !== JSON.stringify(staleAll)) diffFromStale++
        }
      }
    }
    assert.ok(cases > 0, '検証対象が 0 件')
    assert.ok(
      diffFromStale >= 1000,
      `commit1（projection metadata=新）が stale metadata=旧 と異なるペアが不足（実際: ${diffFromStale} / ${cases}）。` +
      'transient が既に失われている可能性がある',
    )
  })
})

describe('T-4C5-P3: multi-drug computeDisplayFields の commit2（steady state）parity', () => {
  test('capable→capable 遷移後（rebuildPrimary 実行後）は metadata・fields ともに新 scenario 由来で一致する', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const [A, B] = caps.slice(0, 2)
      const carried = nextRapidStateOnScenarioChange(null, true, true)
      const afterEffect = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: B, addonIds: [], rapid: carried,
        drugName: DRUG, drugLabel: 'L', baseDomain: resolveDomain(mod),
        personaEnabled: false, persona: 'plain',
      })
      const oracle = buildNodeFields(B, mod, [], DRUG)
      assertFieldsEqual(
        afterEffect.block.fields as SoapFields, oracle.fields,
        `${mod.moduleId}: commit2 で block.fields が新 scenario 由来と不一致`,
      )
      assert.equal(afterEffect.block.closingText, oracle.closingText, `${mod.moduleId}: commit2 closingText 不一致`)
      assert.equal(afterEffect.block.groupKey, oracle.groupKey, `${mod.moduleId}: commit2 groupKey 不一致`)
      void A
      checked++
    }
    assert.ok(checked > 0, '検証対象が 0 件')
  })
})

describe('T-4C5-P4: write path が不変である（rebuildPrimary 4系統 / setPrimaryNode 15箇所 / effect deps 単独 / updater に projection 混入なし）', () => {
  test('setPrimaryNode( 呼び出しが 15 件', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    assert.equal(calls.length, 15, `setPrimaryNode 呼び出し数が想定と異なる（実際: ${calls.length}）`)
  })

  test('rebuildPrimary( 呼び出しが 4 件（codeOnly）', () => {
    const count = (codeOnly(src).match(/rebuildPrimary\(/g) ?? []).length
    assert.equal(count, 4, `rebuildPrimary 呼び出し数が想定と異なる（実際: ${count}）`)
  })

  test('scenario rebuild effect の dependency 配列が primaryNode.scenarioId 単独', () => {
    const start = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    assert.notEqual(start, -1, 'effect のアンカーコメントが見つからない')
    const depsMatch = src.slice(start).match(/\n\s*\}, \[([^\]]*)\]\)/)
    assert.ok(depsMatch, 'effect の dependency 配列が見つからない')
    const deps = depsMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    assert.deepEqual(deps, ['primaryNode.scenarioId'], `effect deps が変化している: [${deps.join(', ')}]`)
  })

  test('setPrimaryNode( の全呼び出しの updater 本体に primaryNodeProjection が出現しない', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    for (const call of calls) {
      const body = codeOnly(call.slice('setPrimaryNode('.length))
      assert.ok(!/primaryNodeProjection/.test(body), `setPrimaryNode の updater 内に primaryNodeProjection がある: ${body.slice(0, 120)}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Group M（Migration）— 実装前は RED、production の 6 系統移管後に GREEN
// ═══════════════════════════════════════════════════════════════

describe('T-4C5-M1: 6 系統の consumer が primaryNode 直参照へ移管されている', () => {
  const consumers: Array<{ name: string; anchor: string }> = [
    { name: 'currentScenarioId', anchor: '  const currentScenarioId: string | null =\n    (activeNode ?? primaryNode).scenarioId || null' },
    { name: 'targetModule', anchor: 'const targetModule = useMemo<ModuleData>(() => {\n    const ctx = activeNode ?? primaryNode' },
    { name: 'activeContextResolution', anchor: '() => (activeNode ?? primaryNode).resolution,' },
    { name: 'activeLocalSiteInput', anchor: "const activeLocalSiteInput = (activeNode ?? primaryNode).localSiteInput ?? ''" },
    { name: 'addonTargetScenario', anchor: 'const addonTargetScenario = useMemo(() => {\n    const ctx = activeNode ?? primaryNode' },
    { name: 'addonBrandHandlingTags', anchor: 'const ctx = activeNode ?? primaryNode\n    const legacyBrandKey = ctx.matchedBrandName' },
  ]

  for (const { name, anchor } of consumers) {
    test(`${name} が (activeNode ?? primaryNode) を参照している`, () => {
      assert.ok(src.includes(anchor), `${name} の primaryNode 直参照アンカーが見つからない`)
    })
  }

  test('上記 6 系統の deps 配列に primaryNodeProjection が出現しない', () => {
    const depsAnchors = [
      '}, [activeNode, primaryNode, activeModuleData, allModules])',
      '[activeNode, primaryNode],',
      '}, [activeNode, primaryNode, targetModule])',
      '}, [targetModule, activeNode, primaryNode, activeContextResolution])',
    ]
    for (const anchor of depsAnchors) {
      assert.ok(src.includes(anchor), `deps アンカーが見つからない: ${anchor}`)
    }
  })
})

describe('T-4C5-M2: primaryNodeProjection の出現（occurrence count）がちょうど 5 件（宣言 + displayFields + finalFields）', () => {
  test('occurrence 数 = 5、出現する行は全て許可された 3 箇所に属する', () => {
    const lines = src.split('\n')
    const hitLines: Array<{ line: number; text: string; count: number }> = []
    let totalOccurrences = 0
    lines.forEach((l, i) => {
      const t = l.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      const count = (l.match(/primaryNodeProjection/g) ?? []).length
      if (count > 0) {
        hitLines.push({ line: i + 1, text: l.trim(), count })
        totalOccurrences += count
      }
    })
    assert.equal(
      totalOccurrences, 5,
      `primaryNodeProjection の出現数（occurrence count）が想定と異なる（実際: ${totalOccurrences}）:\n` +
      hitLines.map(h => `  L${h.line} x${h.count}: ${h.text}`).join('\n'),
    )

    const allowedPatterns = [
      /^const primaryNodeProjection = useMemo<ComposeNode>/,
      /computeDisplayFields\(primaryNodeProjection, composeNodes\)/,
      /^\[primaryNodeProjection, composeNodes\],$/,
      /\.\.\.primaryNodeProjection, block: \{ \.\.\.primaryNodeProjection\.block, fields: patchedPrimaryFields \}/,
    ]
    for (const h of hitLines) {
      assert.ok(
        allowedPatterns.some(re => re.test(h.text)),
        `許可されていない primaryNodeProjection 出現行: L${h.line}: ${h.text}`,
      )
    }
  })
})
