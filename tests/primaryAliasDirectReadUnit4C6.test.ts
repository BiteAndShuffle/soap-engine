/**
 * primaryAliasDirectReadUnit4C6.test.ts — Rapid Mode v2 / Unit 4C-6 契約テスト
 *
 * Unit 4C-6 の責務: primaryNode の authority を意味変換なしでそのまま読み替えている
 * pure direct alias 5 種（activeBrandName / activeDrugDisplayName / activeResolution /
 * rapidState / primaryBaseFields）を削除し、consumer を primaryNode の authoritative
 * field 直参照へ移管する。observable behavior change = 0。
 *
 * Unit 4C-6 の対象外（semantic derived value として恒久的に残す）:
 *   activeModuleData / primaryAddonIds / selectedScenarioId / localSiteInput
 *
 * Group P（Preservation）: 実装前から GREEN、実装後も GREEN であるべき契約。
 *   1 件でも実装前に RED なら baseline が想定と異なるため実装に入らない。
 * Group M（Migration）: 実装前は RED、production の 5 alias 削除後に GREEN になる契約。
 *   RED が許可されるのは本ファイルの M1〜M4 のみ。
 *
 * 実行:
 *   npx tsx --test tests/primaryAliasDirectReadUnit4C6.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'

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

const DRUG = '本剤'

// ═══════════════════════════════════════════════════════════════
// Group P（Preservation）— 実装前から GREEN、実装後も GREEN
// ═══════════════════════════════════════════════════════════════

describe('P1: write path が不変である（setPrimaryNode=15 / rebuildPrimary(=4 / effect deps 単独）', () => {
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
})

describe('P2: primaryNodeProjection の occurrence = 5、consumer = 2 系統のまま（Unit 4C-5 契約の据え置き）', () => {
  test('occurrence（コード行の出現回数）が 5', () => {
    const lines = src.split('\n')
    let total = 0
    const hits: string[] = []
    lines.forEach((l, i) => {
      const t = l.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      const c = (l.match(/primaryNodeProjection/g) ?? []).length
      if (c > 0) { total += c; hits.push(`L${i + 1} x${c}: ${t.slice(0, 100)}`) }
    })
    assert.equal(total, 5, `primaryNodeProjection の出現数が想定と異なる（実際: ${total}）:\n${hits.join('\n')}`)
  })

  test('consumer は computeDisplayFields と finalFields 多剤 re-merge の 2 系統のみ', () => {
    const code = codeOnly(src)
    assert.ok(/computeDisplayFields\(primaryNodeProjection, composeNodes\)/.test(code), 'computeDisplayFields consumer が見つからない')
    assert.ok(/\.\.\.primaryNodeProjection, block: \{ \.\.\.primaryNodeProjection\.block, fields: patchedPrimaryFields \}/.test(code), 'finalFields consumer が見つからない')
  })
})

describe('P3: scenario switch transient（commit1）が保存されている（Design P）', () => {
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

      const N = scs.length
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) {
          if (a === b) continue
          const A = buildNodeFields(scs[a], mod, [], DRUG)
          const B = buildNodeFields(scs[b], mod, [], DRUG)
          cases++

          const commit1 = mergeBlocks(
            [secondaryBlock], A.fields, scs[b].title,
            B.closingText, undefined, B.groupKey, B.clinicalDomain,
          )
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

describe('P4: 削除対象 5 alias について旧 writable authority（useState / setter / 専用 ref）が 0 件', () => {
  test('useState 宣言が 0 件', () => {
    const code = codeOnly(src)
    for (const decl of [
      'const [activeBrandName, setActiveBrandName] = useState',
      'const [activeDrugDisplayName, setActiveDrugDisplayName] = useState',
      'const [activeResolution, setActiveResolution] = useState',
      'const [rapidState, setRapidState] = useState',
      'const [primaryBaseFields, setPrimaryBaseFields] = useState',
    ]) {
      assert.ok(!code.includes(decl), `旧 useState 宣言が残っている: ${decl}`)
    }
  })

  test('旧 setter 呼び出しが 0 件', () => {
    const code = codeOnly(src)
    for (const setter of ['setActiveBrandName(', 'setActiveDrugDisplayName(', 'setActiveResolution(', 'setRapidState(', 'setPrimaryBaseFields(']) {
      assert.ok(!code.includes(setter), `旧 setter 呼び出しが残っている: ${setter}`)
    }
  })

  test('専用 ref（rawPrimaryFieldsRef / primaryGuardRef / primaryBaseFieldsRef / rapidStateRef / activeResolutionRef）が 0 件', () => {
    const code = codeOnly(src)
    for (const ref of ['rawPrimaryFieldsRef', 'primaryGuardRef', 'primaryBaseFieldsRef', 'rapidStateRef', 'activeResolutionRef']) {
      assert.ok(!code.includes(ref), `旧専用 ref が残っている: ${ref}`)
    }
  })
})

describe('P5: Unit 4C-6 対象外の 4 derived value（activeModuleData / localSiteInput / selectedScenarioId / primaryAddonIds）の宣言が存在し続ける', () => {
  test('4 種の宣言が production source に存在する', () => {
    const code = codeOnly(src)
    assert.ok(code.includes('const activeModuleData = useMemo('), 'activeModuleData の宣言が見つからない')
    assert.ok(code.includes("const localSiteInput        = primaryNode.localSiteInput ?? ''"), 'localSiteInput の宣言が見つからない')
    assert.ok(code.includes("const selectedScenarioId = primaryNode.scenarioId === '' ? null : primaryNode.scenarioId"), 'selectedScenarioId の宣言が見つからない')
    assert.ok(code.includes('const primaryAddonIds    = useMemo('), 'primaryAddonIds の宣言が見つからない')
  })
})

// ═══════════════════════════════════════════════════════════════
// Group M（Migration）— 実装前は RED、production の 5 alias 削除後に GREEN
// ═══════════════════════════════════════════════════════════════

describe('M1: 削除対象 5 alias の宣言が production source から 0 件', () => {
  const declarations: Array<{ name: string; pattern: RegExp }> = [
    { name: 'activeBrandName', pattern: /^\s*const activeBrandName\b/m },
    { name: 'activeDrugDisplayName', pattern: /^\s*const activeDrugDisplayName\b/m },
    { name: 'activeResolution', pattern: /^\s*const activeResolution\b/m },
    { name: 'rapidState', pattern: /^\s*const rapidState\b/m },
    { name: 'primaryBaseFields', pattern: /^\s*const primaryBaseFields\b/m },
  ]
  for (const { name, pattern } of declarations) {
    test(`${name} の宣言が存在しない`, () => {
      assert.ok(!pattern.test(codeOnly(src)), `${name} の宣言がまだ存在する`)
    })
  }
})

describe('M2: 全 read site が primaryNode の authoritative field を直参照している', () => {
  const anchors: Array<{ name: string; text: string }> = [
    { name: 'ref 同期（activeDrugDisplayNameRef）', text: 'activeDrugDisplayNameRef.current = primaryNode.resolvedDrugName' },
    { name: 'resolvedBrand', text: 'const resolvedBrand = primaryNode.matchedBrandName ?? activeModuleData.drug?.brandNames?.[0]' },
    { name: 'tagBrandKey', text: 'const tagBrandKey = resolveDataAccessBrandKey(primaryNode.resolution, primaryNode.matchedBrandName ?? activeModuleData.drug?.brandNames?.[0])' },
    { name: 'genericPart', text: 'const genericPart = brandCatalogGenericName ?? primaryNode.resolvedDrugName' },
    { name: 'scenario rebuild effect / primaryDrugName', text: 'resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName)' },
    { name: 'handleSToggle / drugName 宣言', text: 'const drugName = primaryNode.resolvedDrugName' },
    // Unit 4D-4 successor（D-4D4-6）: ThirdPanel は active context（primary または
    // 編集中 ComposeNode）の authoritative rapid を直接読む。alias state / alias
    // variable を介さない意味論は不変。activeNode が null なら primaryNode.rapid へ
    // 自然に fallback する。
    { name: 'JSX rapidState（active context の authoritative ComposeNode.rapid を直接参照）', text: 'rapidState={(activeNode ?? primaryNode).rapid}' },
    { name: 'projection fields override', text: 'fields:          primaryNode.block.fields,' },
    { name: 'finalFields / primaryS', text: 'const primaryS = primaryNode.block.fields.S' },
    { name: 'finalFields / patchedPrimaryFields', text: '{ ...primaryNode.block.fields, S: patchedPrimaryS }' },
  ]
  for (const { name, text } of anchors) {
    test(`${name} が direct authority read になっている`, () => {
      assert.ok(src.includes(text), `期待する direct read が見つからない: ${text}`)
    })
  }

  test('handleAddonToggle deps に primaryNode.matchedBrandName が含まれる', () => {
    assert.ok(
      src.includes('}, [activeModuleData, primaryNode.matchedBrandName, allModules, moduleData, personaEnabled, selectedPersona, confirmDiscard])'),
      'handleAddonToggle の deps 配列が想定と異なる',
    )
  })

  test('handleSToggle deps に primaryNode.matchedBrandName / primaryNode.resolvedDrugName が含まれる（Unit 4D-3b: node branch の module 解決用に allModules / moduleData を追加）', () => {
    assert.ok(
      src.includes('}, [primaryNode.matchedBrandName, primaryNode.resolvedDrugName, activeModuleData, allModules, moduleData, confirmDiscard])'),
      'handleSToggle の deps 配列が想定と異なる',
    )
  })
})

describe('M3: primaryNodeProjection の deps 配列が primaryBaseFields を含まず、primaryNode.block.fields を含む', () => {
  test('deps 配列の 3 番目要素が primaryNode.block.fields になっている', () => {
    assert.ok(
      src.includes('}), [primaryNode, primaryScenario, primaryNode.block.fields, activeModuleData])'),
      'projection の deps 配列が想定と異なる',
    )
  })
})

describe('M4: projection の fields override が primaryNode.block.fields を直接使い、re-derive していない', () => {
  test('projection body の fields: override RHS が primaryNode.block.fields', () => {
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo<ComposeNode>(() => ({')
    assert.ok(start >= 0, 'primaryNodeProjection の宣言が見つからない')
    const end = code.indexOf('}), [', start)
    const body = code.slice(start, end)
    assert.ok(/fields:\s*primaryNode\.block\.fields,/.test(body), 'projection の fields override が primaryNode.block.fields になっていない')
    assert.ok(!/deriveRawFields\(/.test(body), 'projection 内で deriveRawFields を呼んではならない')
    assert.ok(!/deriveNodeBlockCore\(/.test(body), 'projection 内で deriveNodeBlockCore を呼んではならない')
    assert.ok(!/buildPrimaryNodeSnapshot\(/.test(body), 'projection 内で buildPrimaryNodeSnapshot を呼んではならない')
  })
})
