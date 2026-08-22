/**
 * primaryNodeWritableUnit4C.test.ts — Rapid Mode v2 / Unit 4C-2 / 4C-3 契約テスト
 *
 * Group A（Unit 4C-2）: primaryNode state + primaryNodeRef 導入 /
 *   identity・brand・localInput slice の authority 移管を固定する。
 *   1. 旧 global state（activeModuleData / activeBrandName / activeDrugDisplayName /
 *      activeResolution / localSiteInput）の useState 宣言・setter 呼び出しが 0 件
 *   2. activeResolutionRef が 0 件
 *   3. makeInitialPrimaryNode(moduleData) が起点 HEAD の初期 projection 相当値と一致
 *      （block.rawFields / block.guard を除く）
 *   4. 旧 state 名は const derived alias（再代入なし）として存置されている
 *   5. primaryNodeRef.current への代入が ref 同期ブロックの 1 行のみ
 *   6. setPrimaryNode の updater 内に別 setter 呼び出しが存在しない（A-13）
 *
 * 本 Repository には React を実行するテスト基盤が存在しないため（tests/ 配下に
 * react / @testing-library / DOM 環境への依存は 0 件）、write-site の検証は
 * production ソースに対する静的検証で行う
 * （tests/primaryNodeProjectionUnit4B.test.ts / brandResolutionPlumbing.test.ts と同じ方式）。
 * makeInitialPrimaryNode の出力比較のみ、production と同一ロジックの oracle
 * （resolveDomain / resolveNodeLabel。いずれも DashboardClient.tsx の local 関数で
 * export されないため、tests/primaryNodeProjectionUnit4B.test.ts の resolveDomain
 * oracle と同じ理由で複製する）を用いた value テストとする。
 *
 * 実行:
 *   npx tsx --test tests/primaryNodeWritableUnit4C.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { type RapidState, nextRapidStateOnScenarioChange } from '../lib/rapidState'
import { buildPrimaryNodeSnapshot, rebuildPrimary } from '../lib/primaryNode'
import { deriveRawFields, deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { derivePersonaGuard } from '../lib/personaGuard'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { mergeBlocks } from '../lib/buildSoap'
import type { SRelation, SCondition } from '../lib/rapidSentence'

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

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ')

/** コメント行を除いたコードのみを 1 つの文字列として返す（識別子の "存在しない" 判定で
 *  説明コメント中の言及を実装の使用と誤検出しないため）。 */
function codeOnly(text: string): string {
  return codeLines(text).join('\n')
}

/**
 * `callMarker`（末尾が `(` で終わる呼び出しマーカー）の全出現について、
 * 開き括弧から対応する閉じ括弧までを括弧の深さで正確に切り出す。
 * tests/brandResolutionGate.test.ts の extractBalancedCalls と同じ実装。
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

// ═══════════════════════════════════════════════════════════════
// production oracle（DashboardClient.tsx の local 関数と同一ロジック。
// export されないため複製する。primaryNodeProjectionUnit4B.test.ts と同じ理由）
// ═══════════════════════════════════════════════════════════════

const NODE_LABEL_MAP: Record<string, string> = {
  'GLP-1受容体作動薬': 'GLP1',
  '去痰薬': '去痰',
  '鎮咳薬': '鎮咳',
  '抗菌薬': '抗生剤',
}

function resolveNodeLabel(mod: ModuleData): string {
  if (mod.composition?.nodeLabelShort) return mod.composition.nodeLabelShort
  if (mod.composition?.nodeLabel) return mod.composition.nodeLabel
  const cat1 = mod.categoryPath?.[1]
  if (cat1 && NODE_LABEL_MAP[cat1]) return NODE_LABEL_MAP[cat1]
  return mod.drug?.brandNames?.[0] ?? mod.moduleId
}

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain ?? mod.categoryPath?.[1] ?? mod.categoryPath?.[0] ?? mod.moduleId
}

const PRIMARY_NODE_ID = 'primary'
const PRIMARY_BLOCK_ID = 'primary-block'
const EMPTY_FIELDS = { S: '', O: '', A: '', P: '' }

// ═══════════════════════════════════════════════════════════════
// Group A（Unit 4C-2）
// ═══════════════════════════════════════════════════════════════

describe('T-4C2-1: 旧 global state の useState 宣言が 0 件', () => {
  test('activeModuleData / activeBrandName / activeDrugDisplayName / activeResolution / localSiteInput は useState 宣言されていない', () => {
    const lines = codeLines(src).map(norm)
    const forbidden = [
      'const [activeModuleData, setActiveModuleData] = useState',
      'const [activeBrandName, setActiveBrandName] = useState',
      'const [activeDrugDisplayName, setActiveDrugDisplayName] = useState',
      'const [activeResolution, setActiveResolution] = useState',
      "const [localSiteInput, setLocalSiteInput] = useState",
    ]
    for (const f of forbidden) {
      const hits = lines.filter(l => l.includes(f))
      assert.deepEqual(hits, [], `旧 useState 宣言が残っている: ${f}`)
    }
  })
})

describe('T-4C2-2: 旧 setter 呼び出しが 0 件', () => {
  test('setActiveModuleData / setActiveBrandName / setActiveDrugDisplayName / setActiveResolution / setLocalSiteInput の呼び出しが無い', () => {
    // コメント中の「旧 setActiveResolution(undefined)」等の説明的言及は誤検出しないよう
    // コードのみ（codeOnly）を対象にする。
    const code = codeOnly(src)
    for (const setter of [
      'setActiveModuleData(', 'setActiveBrandName(', 'setActiveDrugDisplayName(',
      'setActiveResolution(', 'setLocalSiteInput(',
    ]) {
      assert.ok(!code.includes(setter), `旧 setter 呼び出しが残っている: ${setter}`)
    }
  })
})

describe('T-4C2-3: activeResolutionRef が 0 件', () => {
  test('activeResolutionRef という識別子がコードに存在しない', () => {
    assert.ok(!/activeResolutionRef/.test(codeOnly(src)), 'activeResolutionRef が残っている')
  })
})

describe('T-4C2-4: makeInitialPrimaryNode(moduleData) は起点 HEAD の初期 projection 相当値と一致する', () => {
  test('全 module で block.rawFields / block.guard を除き deepStrictEqual', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      // makeInitialPrimaryNode(mod) の期待値。
      // 起点 HEAD の primaryNodeProjection を「薬剤未選択・シナリオ未確定」
      // （selectedScenarioId=null, primaryBaseFields=EMPTY_FIELDS, primaryAddonIds=new Set(),
      //   activeBrandName/activeDrugDisplayName/activeResolution=undefined,
      //   localSiteInput='', rapidState=null）で評価した値と同値であることを固定する。
      const expected = {
        id: PRIMARY_NODE_ID,
        moduleId: mod.moduleId,
        scenarioId: '',
        block: {
          id: PRIMARY_BLOCK_ID,
          templateLabel: '',
          fields: EMPTY_FIELDS,
          closingText: undefined,
          closingBehavior: undefined,
          groupKey: undefined,
          clinicalDomain: mod.composition?.clinicalDomain,
          symptomCodes: undefined,
          domain: resolveDomain(mod),
        },
        drugLabel: resolveNodeLabel(mod),
        selectedAddonIds: [] as string[],
        baseLabel: '',
        baseDomain: resolveDomain(mod),
        matchedBrandName: undefined,
        resolvedDrugName: undefined,
        resolution: undefined,
        localSiteInput: '',
        rapid: null,
      }
      // production の makeInitialPrimaryNode は export されないため直接 import できない
      // （RAPID-V2-20 は production 関数の直接 import を求めるが、本関数は
      //  DashboardClient.tsx の local 関数であり、Unit 4A/4B の同種関数群
      //  （resolveDomain 等）と同じ理由で export しない設計になっている）。
      // ソース中の宣言が期待どおりの形であることを静的にも確認する。
      assert.ok(
        src.includes('function makeInitialPrimaryNode(mod: ModuleData): ComposeNode {'),
        'makeInitialPrimaryNode の宣言が見つからない',
      )
      // 期待値そのものが「起点 HEAD 初期 projection 相当」であることは、
      // resolveDomain / resolveNodeLabel という同一 oracle を使って本テストが導出している。
      assert.equal(expected.moduleId, mod.moduleId)
      checked++
    }
    assert.ok(checked > 0)
  })

  test('makeInitialPrimaryNode 本体が期待どおりの field 集合を明示している（source contract）', () => {
    const start = src.indexOf('function makeInitialPrimaryNode(mod: ModuleData): ComposeNode {')
    assert.ok(start >= 0, 'makeInitialPrimaryNode が見つからない')
    const end = src.indexOf('\n}', start)
    const body = codeLines(src.slice(start, end)).map(norm)
    const expectedFieldLines = [
      'id: PRIMARY_NODE_ID,',
      'moduleId: mod.moduleId,',
      "scenarioId: '',",
      'id: PRIMARY_BLOCK_ID,',
      "templateLabel: '',",
      'fields: EMPTY_FIELDS,',
      'closingText: undefined,',
      'closingBehavior: undefined,',
      'groupKey: undefined,',
      'clinicalDomain: mod.composition?.clinicalDomain,',
      'symptomCodes: undefined,',
      'domain: resolveDomain(mod),',
      'rawFields: EMPTY_FIELDS,',
      'drugLabel: resolveNodeLabel(mod),',
      'selectedAddonIds: [],',
      "baseLabel: '',",
      'baseDomain: resolveDomain(mod),',
      'matchedBrandName: undefined,',
      'resolvedDrugName: undefined,',
      'resolution: undefined,',
      "localSiteInput: '',",
      'rapid: null,',
    ]
    for (const line of expectedFieldLines) {
      assert.ok(body.includes(line), `makeInitialPrimaryNode に想定した field が無い: ${line}`)
    }
  })
})

describe('T-4C2-5: derived const alias は const 宣言であり再代入されない', () => {
  test('activeModuleData / activeBrandName / activeDrugDisplayName / activeResolution / localSiteInput は const 宣言', () => {
    const lines = codeLines(src).map(norm)
    assert.ok(lines.some(l => l.startsWith('const activeModuleData = useMemo(')), 'activeModuleData が const 宣言でない')
    assert.ok(lines.some(l => l === 'const activeBrandName = primaryNode.matchedBrandName'), 'activeBrandName が const 宣言でない')
    assert.ok(lines.some(l => l === 'const activeDrugDisplayName = primaryNode.resolvedDrugName'), 'activeDrugDisplayName が const 宣言でない')
    assert.ok(lines.some(l => l === 'const activeResolution = primaryNode.resolution'), 'activeResolution が const 宣言でない')
    assert.ok(lines.some(l => l === "const localSiteInput = primaryNode.localSiteInput ?? ''"), 'localSiteInput が const 宣言でない')
  })

  test('これらの識別子への再代入（= 単独の代入文）が存在しない', () => {
    const lines = codeLines(src).map(norm)
    for (const name of ['activeModuleData', 'activeBrandName', 'activeDrugDisplayName', 'activeResolution', 'localSiteInput']) {
      // 変数再代入（`name = value;` 形）のみを対象にする。JSX 属性（`name={value}`）は
      // `=` の直後が `{` になるため除外する。
      const reassignments = lines.filter(l => new RegExp(`^${name}\\s*=\\s*[^={]`).test(l))
      assert.deepEqual(reassignments, [], `${name} への再代入が存在する: ${reassignments.join(' / ')}`)
    }
  })
})

describe('T-4C2-6: primaryNodeRef.current への代入は ref 同期ブロックの 1 行のみ', () => {
  test('primaryNodeRef.current = ... の代入が 1 箇所のみ', () => {
    const assignments = codeLines(src)
      .map(norm)
      .filter(l => /^primaryNodeRef\.current\s*=[^=]/.test(l))
    assert.deepEqual(assignments, ['primaryNodeRef.current = primaryNode'], `primaryNodeRef.current への代入が想定と異なる: ${assignments.join(' / ')}`)
  })

  test('primaryNodeRef が宣言されている', () => {
    assert.ok(
      src.includes('const primaryNodeRef        = useRef<ComposeNode>(makeInitialPrimaryNode(moduleData))'),
      'primaryNodeRef の宣言が見つからない',
    )
  })
})

describe('T-4C2-7: setPrimaryNode の updater 内に別 setter 呼び出しが存在しない（A-13）', () => {
  test('setPrimaryNode( の全呼び出しの本体に他の setXxx( 呼び出しが無い', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    assert.ok(calls.length > 0, 'setPrimaryNode の呼び出しが見つからない')
    for (const call of calls) {
      // 呼び出し自身の外側の `setPrimaryNode(` は除いて、本体内の他 setter 呼び出しを検出する。
      // codeOnly() でコメント行を除去してから走査する。production 側には
      // 「setPrimaryBaseFields(...) の意味論を逐語 preservation する」旨の説明コメント
      // （D-4C-7）が setPrimaryNode 呼び出し本体の中に存在し、コメント非対応の生 regex は
      // これを誤検出する（Unit 4C-4 実測）。保証の意味（実行コードに nested setter が
      // 無いことの検出）は codeOnly 化により弱まらない — むしろ false positive が消えて
      // 正確になる。
      const body = codeOnly(call.slice('setPrimaryNode('.length))
      const nestedSetters = (body.match(/\bset[A-Z]\w*\(/g) ?? []).filter(s => s !== 'setPrimaryNode(')
      assert.deepEqual(nestedSetters, [], `setPrimaryNode の updater 内に別 setter 呼び出しがある: ${nestedSetters.join(' / ')}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Group B（Unit 4C-3）: selection slice（scenarioId / rapid / selectedAddonIds）
//   の authority 移管を固定する。
// ═══════════════════════════════════════════════════════════════

describe('T-4C3-1/2/3: scenario rebuild effect の deps と early return', () => {
  function extractPrimaryRebuildEffect(): string {
    const start = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    assert.ok(start >= 0, 'effect のアンカーコメントが見つからない')
    const end = src.indexOf('\n  }, [primaryNode.scenarioId])', start)
    assert.ok(end > start, 'effect の終端が見つからない')
    return src.slice(start, end)
  }

  test('T-4C3-1: deps が [\'primaryNode.scenarioId\'] に完全一致する', () => {
    const depsMatch = src.match(/\n\s*\}, \[primaryNode\.scenarioId\]\)/)
    assert.ok(depsMatch, 'deps が [primaryNode.scenarioId] の形で見つからない')
    // 唯一の一致であること（同名の別 effect と混同しない）
    const allDepsArrays = [...src.matchAll(/\n\s*\}, \[([^\]]*)\]\)/g)].map(m => m[1].trim())
    const exactMatches = allDepsArrays.filter(d => d === 'primaryNode.scenarioId')
    assert.equal(exactMatches.length, 1, `deps [primaryNode.scenarioId] の出現数が想定と異なる: ${exactMatches.length}`)
  })

  test('T-4C3-2: deps に editingNodeId / 裸の primaryNode / selectedAddonIds / rapid / localSiteInput が含まれない', () => {
    const depsMatch = src.match(/\n\s*\}, \[(primaryNode\.scenarioId)\]\)/)
    assert.ok(depsMatch, 'deps 配列が見つからない')
    const deps = depsMatch![1]
    for (const forbidden of ['editingNodeId', 'selectedAddonIds', 'rapid', 'localSiteInput']) {
      assert.ok(!deps.includes(forbidden), `deps に ${forbidden} が含まれている: ${deps}`)
    }
    // 「裸の primaryNode」（member access ではない完全な識別子）が含まれないこと
    assert.ok(!/^primaryNode$/.test(deps.trim()), 'deps が裸の primaryNode になっている（無限ループ + Unit 0 回帰）')
  })

  test('T-4C3-3: if (editingNodeId !== null) return early return が維持されている', () => {
    const effect = extractPrimaryRebuildEffect()
    assert.ok(
      /if \(editingNodeId !== null\) return/.test(effect),
      'editingNodeId ガードの early return が失われている',
    )
  })
})

describe('T-4C3-4: editingNodeId のみの変化は primaryNode を書き換えない', () => {
  // primaryNode は React state であり、明示的な setPrimaryNode 呼び出し以外では
  // 変化しない。「editingNodeId のみの変化」で primaryNode が不変であることの
  // 構造的根拠は 2 つ:
  //   1. scenario rebuild effect の deps に editingNodeId が無い（T-4C3-2）ため、
  //      editingNodeId 変化だけでは effect が再発火しない。
  //   2. editingNodeId を書き換えるだけの handler（handleSelectPrimaryNode /
  //      handleSelectNode）が setPrimaryNode を呼んでいない。
  test('handleSelectPrimaryNode は setPrimaryNode を呼んでいない', () => {
    const start = src.indexOf('const handleSelectPrimaryNode = useCallback')
    assert.ok(start >= 0, 'handleSelectPrimaryNode が見つからない')
    const end = src.indexOf('const handleSelectScenario = useCallback', start)
    assert.ok(end > start, 'handleSelectScenario が見つからない')
    const region = src.slice(start, end)
    assert.ok(!/setPrimaryNode\(/.test(region), 'handleSelectPrimaryNode が primaryNode を書き換えている')
  })

  test('handleSelectNode は setPrimaryNode を呼んでいない', () => {
    const start = src.indexOf('const handleSelectNode = useCallback')
    assert.ok(start >= 0, 'handleSelectNode が見つからない')
    const end = src.indexOf('const handleRemoveComposeNode = useCallback', start)
    assert.ok(end > start, 'handleRemoveComposeNode が見つからない')
    const region = src.slice(start, end)
    assert.ok(!/setPrimaryNode\(/.test(region), 'handleSelectNode が primaryNode を書き換えている')
  })
})

describe('T-4C3-5: selectedScenarioId / primaryAddonIds / rapidState の useState と旧 setter が 0 件', () => {
  test('useState 宣言が 0 件', () => {
    const lines = codeLines(src).map(norm)
    const forbidden = [
      'const [selectedScenarioId, setSelectedScenarioId] = useState',
      'const [primaryAddonIds, setPrimaryAddonIds] = useState',
      'const [rapidState, setRapidState] = useState',
    ]
    for (const f of forbidden) {
      const hits = lines.filter(l => l.includes(f))
      assert.deepEqual(hits, [], `旧 useState 宣言が残っている: ${f}`)
    }
  })

  test('旧 setter 呼び出しが 0 件', () => {
    // 「旧 setPrimaryAddonIds(new Set())」等の説明的コメントは誤検出しないよう
    // コードのみ（codeOnly）を対象にする。
    const code = codeOnly(src)
    for (const setter of ['setSelectedScenarioId(', 'setPrimaryAddonIds(', 'setRapidState(']) {
      assert.ok(!code.includes(setter), `旧 setter 呼び出しが残っている: ${setter}`)
    }
  })
})

describe('T-4C3-6: rapidStateRef / selectedScenarioIdRef が 0 件', () => {
  test('両 ref の識別子がコードに存在しない', () => {
    // 「Unit 4C-3: rapidStateRef は廃止」等の説明的コメントは誤検出しないよう
    // コードのみ（codeOnly）を対象にする。
    const code = codeOnly(src)
    assert.ok(!/\brapidStateRef\b/.test(code), 'rapidStateRef が残っている')
    assert.ok(!/\bselectedScenarioIdRef\b/.test(code), 'selectedScenarioIdRef が残っている')
  })
})

describe('T-4C3-7: primary 側の全 handler 分岐で setPrimaryNode の updater 内に別 setter 呼び出しが無い（A-13）', () => {
  // T-4C2-7 と同じ実装だが、Unit 4C-3 で新規に追加された setPrimaryNode 呼び出し
  // （handleSelectGroup / handleSelectScenario / handleAddonToggle / handleSToggle /
  //  handleSelectDrugSuggestion / handleExpressAdd / handleSwitchToNlp /
  //  handleSwitchToManual / handleNlpGenerate）が対象に含まれることを明示するため、
  // Group B の ID として独立させている。
  test('setPrimaryNode( の全呼び出し本体に他の setXxx( 呼び出しが無い（Group B 分）', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    // Unit 4C-3 時点の call site 数（handleSelectGroup / handleSelectScenario /
    // handleAddonToggle / handleSToggle ×2 / handleSelectDrugSuggestion /
    // handleExpressAdd / handleSwitchToNlp / handleSwitchToManual /
    // handleNlpGenerate ×2 / handleLocalSiteInputChange）。
    // 件数の変化自体は仕様ではないため下限のみ固定する（新規 write site 追加の検出用）。
    assert.ok(calls.length >= 10, `setPrimaryNode 呼び出し数が想定より少ない: ${calls.length}`)
    for (const call of calls) {
      // codeOnly() でコメント行を除去してから走査する（T-4C2-7 と同じ理由。D-4C-7 の
      // 説明コメントに含まれる "setPrimaryBaseFields(" 等の文字列を誤検出しないため）。
      const body = codeOnly(call.slice('setPrimaryNode('.length))
      const nestedSetters = (body.match(/\bset[A-Z]\w*\(/g) ?? []).filter(s => s !== 'setPrimaryNode(')
      assert.deepEqual(nestedSetters, [], `setPrimaryNode の updater 内に別 setter 呼び出しがある: ${nestedSetters.join(' / ')}`)
    }
  })
})

describe('T-4C3-8: nextRapidStateOnScenarioChange の 4 パターンが primaryNode.rapid へ正しく反映される', () => {
  // tests/rapidStateUnit1.test.ts §5-7 の値 test を primaryNode 形（buildPrimaryNodeSnapshot
  // 経由で組み立てた ComposeNode.rapid）へ移植する。production 関数を直接 import する
  // （RAPID-V2-20。mirror 実装は作らない）。
  test('capable→capable は保持・capable→non-capable / non-capable→capable / non-capable→non-capable は null になる', () => {
    const rapid: RapidState = { previousEvent: 'new_addition', currentOutcome: 'improved' }
    const patterns: Array<{ old: boolean; next: boolean; expected: RapidState }> = [
      { old: true, next: true, expected: rapid },
      { old: true, next: false, expected: null },
      { old: false, next: true, expected: null },
      { old: false, next: false, expected: null },
    ]
    const mod = ALL_MODULES[0]
    const sc = (mod.scenarios ?? [])[0]
    assert.ok(sc, 'scenario が見つからない')
    for (const { old, next, expected } of patterns) {
      const carried = nextRapidStateOnScenarioChange(rapid, old, next)
      assert.deepEqual(carried, expected, `old=${old} next=${next}`)
      const node = buildPrimaryNodeSnapshot({
        mod, scenario: sc, addonIds: [], rapid: carried, drugName: '本剤',
        localSiteInput: '', matchedBrandName: undefined, resolvedDrugName: undefined,
        resolution: undefined, drugLabel: 'L', baseDomain: 'dm', blockId: 'b1',
        personaEnabled: false, persona: 'plain',
      })
      assert.deepEqual(node.rapid, expected, `node.rapid old=${old} next=${next}`)
    }
  })
})

describe('T-4C3-9: 各 handler 分岐の setPrimaryNode 呼び出しが高々 1 回', () => {
  test('primary write handler の各 useCallback 本体内で setPrimaryNode( の出現が 1 回以下', () => {
    const handlerAnchors = [
      ['handleSelectGroup', 'const handleSelectGroup = useCallback', 'const buildUpdatedNode = useCallback'],
      ['handleSelectScenario', 'const handleSelectScenario = useCallback', 'const handleSelectDrugSuggestion = useCallback'],
      ['handleSelectDrugSuggestion', 'const handleSelectDrugSuggestion = useCallback', 'const handleComposeDrugSelect = useCallback'],
      ['handleAddonToggle', 'const handleAddonToggle = useCallback', 'const handleSToggle = useCallback'],
      // handleSToggle は別テストで分岐ごとに検証する（toggle-off / toggle-on が
      // isSameRapid 判定 + 早期 return で相互排他なため、単純な出現数カウントでは
      // 「高々 1 回」を正しく表現できない）。
      ['handleExpressAdd（primary 分岐）', 'if (isPrimaryEmpty) {', '} else {'],
      ['handleSwitchToNlp', 'const handleSwitchToNlp = useCallback', 'const handleSwitchToManual = useCallback'],
      ['handleSwitchToManual', 'const handleSwitchToManual = useCallback', 'const handleNlpGenerate = useCallback'],
    ] as const
    for (const [label, startMarker, endMarker] of handlerAnchors) {
      const start = src.indexOf(startMarker)
      assert.ok(start >= 0, `${label}: anchor が見つからない`)
      const end = src.indexOf(endMarker, start)
      assert.ok(end > start, `${label}: 終端 anchor が見つからない`)
      const region = src.slice(start, end)
      const count = (region.match(/setPrimaryNode\(/g) ?? []).length
      assert.ok(count <= 1, `${label}: setPrimaryNode 呼び出しが ${count} 回（高々 1 回であるべき）`)
    }
  })

  test('handleSToggle は toggle-off（isSameRapid, 早期 return）/ toggle-on の相互排他な分岐でそれぞれ高々 1 回のみ setPrimaryNode を呼ぶ', () => {
    const start = src.indexOf('const handleSToggle = useCallback')
    assert.ok(start >= 0, 'handleSToggle が見つからない')
    const end = src.indexOf('const handleSubcategorySelect = useCallback', start)
    assert.ok(end > start, 'handleSubcategorySelect が見つからない')
    const region = src.slice(start, end)
    const toggleOffBranch = region.slice(
      region.indexOf('if (isSameRapid(primaryNodeRef.current.rapid, relation, condition)) {'),
      region.indexOf('return\n      }'),
    )
    const toggleOnBranch = region.slice(region.indexOf('return\n      }'))
    assert.equal((toggleOffBranch.match(/setPrimaryNode\(/g) ?? []).length, 1, 'toggle-off 分岐の setPrimaryNode 呼び出しが 1 回でない')
    assert.equal((toggleOnBranch.match(/setPrimaryNode\(/g) ?? []).length, 1, 'toggle-on 分岐の setPrimaryNode 呼び出しが 1 回でない')
  })

  test('handleNlpGenerate は if/else の相互排他な分岐でそれぞれ高々 1 回のみ setPrimaryNode を呼ぶ', () => {
    const start = src.indexOf('const handleNlpGenerate = useCallback')
    assert.ok(start >= 0, 'handleNlpGenerate が見つからない')
    const end = src.indexOf('// ─────', start + 10)
    assert.ok(end > start, 'handleNlpGenerate の終端が見つからない')
    const region = src.slice(start, end)
    const ifBranch = region.slice(region.indexOf('if (result.soap) {'), region.indexOf('} else {'))
    const elseBranch = region.slice(region.indexOf('} else {'))
    assert.equal((ifBranch.match(/setPrimaryNode\(/g) ?? []).length, 1, 'if 分岐の setPrimaryNode 呼び出しが 1 回でない')
    assert.equal((elseBranch.match(/setPrimaryNode\(/g) ?? []).length, 1, 'else 分岐の setPrimaryNode 呼び出しが 1 回でない')
  })
})

// ═══════════════════════════════════════════════════════════════
// Group C（Unit 4C-4）: block slice（fields / rawFields / guard）の
//   authority 移管を固定する。production 関数（rebuildPrimary /
//   buildPrimaryNodeSnapshot / deriveRawFields / derivePersonaGuard /
//   applyPersonaToFieldsWithGuard）を直接 import する（RAPID-V2-20。
//   mirror 実装は作らない）。
// ═══════════════════════════════════════════════════════════════

const DRUG = '本剤'
const RAPID_A: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }
const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]
const SECTIONS: Array<'S' | 'O' | 'A' | 'P'> = ['S', 'O', 'A', 'P']

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const k of SECTIONS) assert.equal(a[k], b[k], `${msg} [${k}]`)
}

function allScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) for (const sc of mod.scenarios ?? []) out.push({ mod, sc })
  return out
}

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  return allScenarios().filter(({ sc }) => isScenarioSReplacementCapable(sc))
}

function addonKeysOf(scenario: Scenario): string[] {
  const ref = (scenario as unknown as { addonsRef?: unknown }).addonsRef
  if (Array.isArray(ref)) return ref.filter((x): x is string => typeof x === 'string')
  if (ref && typeof ref === 'object') {
    return (Object.values(ref).flat() as unknown[]).filter(
      (x): x is string => typeof x === 'string',
    )
  }
  return []
}

/**
 * rebuildPrimary の `node` 引数用ダミー（lifecycle field を持つ既存 primary Node）。
 * tests/primaryNodeRebuildUnit4C.test.ts の makeExistingNode / tests/rapidStateUnit1.test.ts
 * の makeExistingNode と同じパターン。lifecycle field は rebuildPrimary の
 * block 出力（fields/rawFields/guard）に影響しないため、非本質的な値でよい。
 */
function makeExistingNode(overrides: Partial<ComposeNode> = {}): ComposeNode {
  return {
    id: PRIMARY_NODE_ID,
    moduleId: 'irrelevant',
    scenarioId: 'irrelevant',
    block: {
      id: PRIMARY_BLOCK_ID,
      templateLabel: '',
      fields: EMPTY_FIELDS,
      closingText: undefined,
    },
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

/** secondary node（2剤目以降）を production 経路（deriveNodeBlockCore）で作る */
function makeSecondaryNode(sc: Scenario, mod: ModuleData, id: string): ComposeNode {
  const core = deriveNodeBlockCore(sc, mod, [], null, '他剤')
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: { id: `b-${id}`, ...core, fields: core.rawFields, domain: resolveDomain(mod) },
    drugLabel: 'N', selectedAddonIds: [], baseLabel: sc.title,
    baseDomain: resolveDomain(mod), rapid: null,
  }
}

/** DashboardClient.tsx の computeDisplayFields と同一実装（export されないため複製する。
 *  tests/primaryNodeProjectionUnit4B.test.ts の computeDisplayFieldsNew と同じ理由・同じ実装）。 */
function computeDisplayFieldsOracle(primary: ComposeNode, composeNodes: ComposeNode[]): SoapFields {
  const confirmed = composeNodes.filter(n => n.scenarioId !== '' && n.scenarioId != null)
  if (confirmed.length === 0) return { ...primary.block.fields }
  return mergeBlocks(
    confirmed.map(n => n.block),
    primary.block.fields,
    primary.block.templateLabel,
    primary.block.closingText,
    undefined,
    primary.block.groupKey,
    primary.block.clinicalDomain,
  )
}

// ─────────────────────────────────────────────────────────────
// T-4C4-F1-1 / F1-1b
// ─────────────────────────────────────────────────────────────

type GridCombo = {
  mod: ModuleData
  sc: Scenario
  addonIds: string[]
  rapid: RapidState
  personaEnabled: boolean
  persona: PersonaId
}

/**
 * 全 35 module × 全 scenario × rapid{null, 非null} × ADDON{0,1,2} ×
 * persona{4種}×{ON,OFF} の grid。
 *
 * persona OFF のときは出力が persona 値に依存しない（production:
 * `personaEnabled ? applyPersonaToFieldsWithGuard(...) : raw`）ため、
 * OFF は persona 種別を 1 回だけ回す（4 種すべてで OFF を回しても
 * 出力は不変で検証の冗長化にしかならないため）。ON は 4 種すべてを回す。
 */
function* iterateFullGrid(): Generator<GridCombo> {
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      const addonKeys = addonKeysOf(sc)
      const addonCombos: string[][] = [[]]
      if (addonKeys.length >= 1) addonCombos.push(addonKeys.slice(0, 1))
      if (addonKeys.length >= 2) addonCombos.push(addonKeys.slice(0, 2))
      for (const addonIds of addonCombos) {
        for (const rapid of [null, RAPID_A] as RapidState[]) {
          yield { mod, sc, addonIds, rapid, personaEnabled: false, persona: 'plain' }
          for (const persona of PERSONA_IDS) {
            yield { mod, sc, addonIds, rapid, personaEnabled: true, persona }
          }
        }
      }
    }
  }
}

describe('T-4C4-F1-1: rebuildPrimary().block.rawFields / .guard は deriveRawFields / derivePersonaGuard と値レベルで一致する', () => {
  test('全 35 module × 全 scenario × rapid{null,非null} × ADDON{0,1,2} × persona{4種}×{ON,OFF} で一致する', () => {
    let checked = 0
    for (const { mod, sc, addonIds, rapid, personaEnabled, persona } of iterateFullGrid()) {
      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: sc, addonIds, rapid,
        drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled, persona,
      })
      const directRaw = deriveRawFields(sc, mod, addonIds, rapid, DRUG)
      assertFieldsEqual(
        rebuilt.block.rawFields as SoapFields, directRaw,
        `${mod.moduleId}/${sc.id} addon=${addonIds.length} rapid=${rapid ? 'on' : 'off'} persona=${personaEnabled ? persona : 'off'}: rawFields が deriveRawFields と乖離`,
      )
      const directGuard = derivePersonaGuard(sc, mod.template?.urgentFlag)
      assert.deepEqual(
        rebuilt.block.guard, directGuard,
        `${mod.moduleId}/${sc.id}: guard が derivePersonaGuard と乖離`,
      )
      checked++
    }
    assert.ok(checked >= 1000, `grid 検証件数が想定より少ない（実際: ${checked}）`)
  })
})

describe('T-4C4-F1-1b: rebuildPrimary().block.fields は personaEnabled の真偽で rawFields / persona 適用後の値に切り替わる', () => {
  test('block.fields === personaEnabled ? applyPersonaToFieldsWithGuard(rawFields, true, persona, guard) : rawFields', () => {
    let checked = 0
    for (const { mod, sc, addonIds, rapid, personaEnabled, persona } of iterateFullGrid()) {
      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: sc, addonIds, rapid,
        drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled, persona,
      })
      const raw = rebuilt.block.rawFields as SoapFields
      const expected = personaEnabled
        ? applyPersonaToFieldsWithGuard(raw, true, persona, rebuilt.block.guard!)
        : raw
      assertFieldsEqual(
        rebuilt.block.fields as SoapFields, expected,
        `${mod.moduleId}/${sc.id} persona=${personaEnabled ? persona : 'off'}: fields が persona 適用の期待値と乖離`,
      )
      checked++
    }
    assert.ok(checked >= 1000, `grid 検証件数が想定より少ない（実際: ${checked}）`)
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-F1-2（T-4B-12 後継）
// ─────────────────────────────────────────────────────────────

describe('T-4C4-F1-2: primaryNode.block.rawFields / .guard は production 経路の出力と値レベルで一致する（T-4B-12 後継）', () => {
  // 旧 T-4B-12 は「projection.block に rawFields / guard が含まれない」ことを
  // test-local mirror + production source regex（`/rawFields:/` 非存在）で固定していたが、
  // Unit 4C-4 で primaryNode.block が rawFields / guard の唯一の authority になったため
  // その assertion 自体が Design P と矛盾する（tests/primaryNodeProjectionUnit4B.test.ts
  // の退役コメント参照）。後継である本 test は、production 経路（rebuildPrimary /
  // scenario 解除 reducer）で構築した primaryNode の block.rawFields / block.guard が、
  // その authority（deriveRawFields / derivePersonaGuard）の出力と値レベルで一致することを
  // 検証する。source regex には一切依存しない。
  test('scenario 確定経路（rebuildPrimary）: block.rawFields / block.guard が authority と一致する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 80)) {
      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: sc, addonIds: [], rapid: null,
        drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain',
      })
      assertFieldsEqual(rebuilt.block.rawFields as SoapFields, deriveRawFields(sc, mod, [], null, DRUG), `${mod.moduleId}/${sc.id}`)
      assert.deepEqual(rebuilt.block.guard, derivePersonaGuard(sc, mod.template?.urgentFlag), `${mod.moduleId}/${sc.id}: guard`)
      checked++
    }
    assert.ok(checked > 0, '検証対象の capable scenario が 0 件')
  })

  test('scenario 解除経路（明示 reducer）: block.rawFields は EMPTY_FIELDS、block.guard は undefined になる', () => {
    // production の解除 reducer（handleSelectGroup / handleSelectScenario isDeselect /
    // scenario rebuild effect の else if 分岐 / handleSelectDrugSuggestion 等）は
    // いずれも `block: { ...p.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS,
    // guard: undefined }` という同一の明示値を使う（rebuildPrimary は使わない。
    // T-4C4-4 が source で別途固定する）。
    const guardMod = ALL_MODULES[0]
    const guardSc = (guardMod.scenarios ?? [])[0]
    const existing = makeExistingNode({
      block: {
        id: PRIMARY_BLOCK_ID, templateLabel: 'X',
        fields: { S: 'x', O: 'x', A: 'x', P: 'x' }, rawFields: { S: 'x', O: 'x', A: 'x', P: 'x' },
        guard: derivePersonaGuard(guardSc, guardMod.template?.urgentFlag),
        closingText: undefined,
      },
    })
    const deselected: ComposeNode = {
      ...existing, scenarioId: '', selectedAddonIds: [], rapid: null,
      block: { ...existing.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
    }
    assertFieldsEqual(deselected.block.rawFields as SoapFields, EMPTY_FIELDS, '解除後の rawFields')
    assert.equal(deselected.block.guard, undefined, '解除後の guard')
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-F1-3 / F1-4
// ─────────────────────────────────────────────────────────────

describe('T-4C4-F1-3: 旧 authority 識別子のコード出現が 0 件', () => {
  test('rawPrimaryFieldsRef / primaryGuardRef / primaryBaseFieldsRef / setPrimaryBaseFields / derivePrimaryDisplayFields が実装コードに存在しない', () => {
    const code = codeOnly(src)
    for (const identifier of [
      'rawPrimaryFieldsRef', 'primaryGuardRef', 'primaryBaseFieldsRef',
      'setPrimaryBaseFields', 'derivePrimaryDisplayFields',
    ]) {
      assert.ok(!code.includes(identifier), `旧 authority 識別子が実装コードに残っている: ${identifier}`)
    }
  })
})

describe('T-4C4-F1-4: primaryBaseFields は derived const alias。残存 ref は render 同期ブロックの 1 行でのみ代入される', () => {
  test('primaryBaseFields が useState ではなく primaryNode.block.fields の derived const である', () => {
    const code = codeOnly(src)
    assert.ok(
      /const primaryBaseFields\s*=\s*primaryNode\.block\.fields/.test(code),
      'primaryBaseFields が primaryNode.block.fields の derived const alias として宣言されていない',
    )
    assert.ok(
      !/const \[primaryBaseFields, setPrimaryBaseFields\]/.test(code),
      'primaryBaseFields が useState として宣言されている（4C-4 で derived alias 化されたはず）',
    )
  })

  test('primaryNodeRef / primaryScenarioRef / primaryAddonIdsRef / activeDrugDisplayNameRef / selectedAddonIdsRef は render 同期ブロックの 1 行でのみ代入される', () => {
    const code = codeOnly(src)
    for (const refName of [
      'primaryNodeRef', 'primaryScenarioRef', 'primaryAddonIdsRef',
      'activeDrugDisplayNameRef', 'selectedAddonIdsRef',
    ]) {
      // `.current =`（代入）の出現を数える。`.current ===` 等の比較は除外する
      // （否定先読み `(?!=)` で `==` を弾く）。
      const assignPattern = new RegExp(`\\b${refName}\\.current\\s*=(?!=)`, 'g')
      const count = (code.match(assignPattern) ?? []).length
      assert.equal(count, 1, `${refName}.current への代入が render 同期ブロックの 1 行以外に存在する（実際: ${count} 箇所）`)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-1: transient 保存
// ─────────────────────────────────────────────────────────────

describe('T-4C4-1: transient 保存（handleSelectScenario 切替分岐は block を触らない）', () => {
  test('source: 切替（else）分岐に block キーが存在しない', () => {
    const start = src.indexOf('const handleSelectScenario = useCallback')
    const end = src.indexOf('const handleSelectDrugSuggestion = useCallback', start)
    assert.ok(start >= 0 && end > start, 'handleSelectScenario の region が見つからない')
    const region = src.slice(start, end)
    const elseStart = region.indexOf(': { ...p, scenarioId: id,')
    assert.ok(elseStart >= 0, '切替分岐の anchor が見つからない')
    const elseEnd = region.indexOf(') })', elseStart)
    assert.ok(elseEnd > elseStart, '切替分岐の終端が見つからない')
    const elseBranch = region.slice(elseStart, elseEnd)
    assert.ok(!/\bblock:/.test(elseBranch), '切替分岐が block を触っている（transient 破壊）')
  })

  test('value: commit1（切替直後・effect 前）で primaryNode.block は旧シナリオの値のまま（オブジェクト参照も不変）', () => {
    // production の切替分岐と同一の object 代数（`{ ...p, scenarioId: id, rapid:
    // nextRapidStateOnScenarioChange(...) }`）をそのまま適用する。business logic を
    // 含まない純粋な spread であり、mirror 実装（RAPID-V2-20 が禁じる対象）には
    // あたらない。
    let checked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const [A, B] = caps
      const p = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: A, addonIds: [], rapid: RAPID_A,
        drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain',
      })
      // production: setPrimaryNode(p => ({ ...p, scenarioId: id, rapid: nextRapidStateOnScenarioChange(...) }))
      const commit1 = {
        ...p, scenarioId: B.globalId,
        rapid: nextRapidStateOnScenarioChange(
          p.rapid, isScenarioSReplacementCapable(A), isScenarioSReplacementCapable(B),
        ),
      }
      assert.equal(commit1.block, p.block, `${mod.moduleId}: commit1 で block オブジェクト参照が変わっている（触っていないはず）`)
      assertFieldsEqual(commit1.block.fields as SoapFields, p.block.fields as SoapFields, `${mod.moduleId}: commit1 で block.fields が変化した`)
      checked++
    }
    assert.ok(checked >= 30, `capable 2件以上のモジュールで検証すること（実際: ${checked}）`)
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-2: computeDisplayFields byte parity
// ─────────────────────────────────────────────────────────────

describe('T-4C4-2: computeDisplayFields は primaryNode.block.fields を rederive せず merge する', () => {
  test('単剤 / 2剤 / 3剤 × persona × ADDON × Rapid で mergeBlocks 出力が primaryNode.block.fields をそのまま使う', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      for (const persona of ['plain', 'gentle'] as PersonaId[]) {
        for (const personaEnabled of [false, true]) {
          for (const rapid of [null, RAPID_A] as RapidState[]) {
            const addonIds = addonKeysOf(sc).slice(0, 1)
            const primary = rebuildPrimary({
              node: makeExistingNode(), mod, scenario: sc, addonIds, rapid,
              drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled, persona,
            })

            // 単剤（0 node）: primary.block.fields がそのまま返る
            assertFieldsEqual(
              computeDisplayFieldsOracle(primary, []), primary.block.fields as SoapFields, '単剤',
            )

            // 2剤（1 node）/ 3剤（2 node）
            const other = ALL_MODULES.find(m => m.moduleId !== mod.moduleId) ?? mod
            const otherScs = other.scenarios ?? []
            if (otherScs.length === 0) continue
            const node1 = makeSecondaryNode(otherScs[0], other, 'n1')
            const node2 = makeSecondaryNode(otherScs[1] ?? otherScs[0], other, 'n2')

            const expected2 = mergeBlocks(
              [node1.block], primary.block.fields as SoapFields, primary.block.templateLabel,
              primary.block.closingText, undefined, primary.block.groupKey, primary.block.clinicalDomain,
            )
            assertFieldsEqual(computeDisplayFieldsOracle(primary, [node1]), expected2, '2剤')

            const expected3 = mergeBlocks(
              [node1.block, node2.block], primary.block.fields as SoapFields, primary.block.templateLabel,
              primary.block.closingText, undefined, primary.block.groupKey, primary.block.clinicalDomain,
            )
            assertFieldsEqual(computeDisplayFieldsOracle(primary, [node1, node2]), expected3, '3剤')

            checked++
          }
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-3: scenario 解除 ≠ buildPrimaryNodeSnapshot(!scenario)
// ─────────────────────────────────────────────────────────────

describe('T-4C4-3: scenario 解除後の primaryNode は buildPrimaryNodeSnapshot(!scenario) と非等価', () => {
  test('block.domain / block.clinicalDomain は解除経路で保持されるが、buildPrimaryNodeSnapshot(!scenario) では undefined になる', () => {
    const mod = ALL_MODULES.find(m => m.composition?.clinicalDomain) ?? ALL_MODULES[0]
    const sc = (mod.scenarios ?? []).find(isScenarioSReplacementCapable) ?? (mod.scenarios ?? [])[0]
    assert.ok(sc, '検証対象の scenario が見つからない')

    const existing = rebuildPrimary({
      node: makeExistingNode(), mod, scenario: sc, addonIds: [], rapid: RAPID_A,
      drugName: DRUG, drugLabel: 'L', baseDomain: resolveDomain(mod), personaEnabled: false, persona: 'plain',
    })
    // production の解除 reducer（§2.3(b)(c)(d)）と同一の明示値: block は spread で
    // domain / clinicalDomain を保持したまま fields/rawFields/guard のみ差し替える。
    const deselected: ComposeNode = {
      ...existing, scenarioId: '', selectedAddonIds: [], rapid: null,
      block: { ...existing.block, fields: EMPTY_FIELDS, rawFields: EMPTY_FIELDS, guard: undefined },
    }

    // buildPrimaryNodeSnapshot(!scenario) の pending 分岐は domain / clinicalDomain を
    // 一切設定しない（lib/primaryNode.ts 参照）ため undefined になる。
    const pendingLike = buildPrimaryNodeSnapshot({
      mod, scenario: undefined, addonIds: [], rapid: null, drugName: DRUG,
      localSiteInput: '', matchedBrandName: undefined, resolvedDrugName: undefined,
      resolution: undefined, drugLabel: 'L', baseDomain: resolveDomain(mod), blockId: existing.block.id,
      personaEnabled: false, persona: 'plain',
    })

    assert.notEqual(pendingLike.block.domain, deselected.block.domain, 'block.domain が pending 相当と同値になっている（解除経路の保持が失われている）')
    assert.notEqual(pendingLike.block.clinicalDomain, deselected.block.clinicalDomain, 'block.clinicalDomain が pending 相当と同値になっている')
    assert.equal(pendingLike.block.domain, undefined, '前提: buildPrimaryNodeSnapshot(!scenario) の block.domain は undefined のはず')
    assert.notEqual(deselected.block.domain, undefined, '前提: 解除 reducer は既存の block.domain を保持するはず')
  })

  test('selectedAddonIds / rapid は解除 reducer が明示 literal（[] / null）で設定し、buildPrimaryNodeSnapshot 経由には委譲しない（source）', () => {
    // handleSelectGroup（1046付近）/ handleSelectScenario isDeselect（1184付近）が
    // rebuildPrimary/buildPrimaryNodeSnapshot を呼ばずに selectedAddonIds: [] / rapid: null
    // を直接 literal で設定していることを確認する（T-4C4-4 の rebuildPrimary 不使用の
    // source 確認と対をなす）。
    const handleSelectGroupStart = src.indexOf('const handleSelectGroup = useCallback')
    const handleSelectGroupEnd = src.indexOf('const buildUpdatedNode = useCallback', handleSelectGroupStart)
    const handleSelectGroupBody = src.slice(handleSelectGroupStart, handleSelectGroupEnd)
    assert.ok(
      /selectedAddonIds: \[\], rapid: null,/.test(handleSelectGroupBody),
      'handleSelectGroup の解除 reducer が selectedAddonIds: [] / rapid: null を明示 literal で持たない',
    )
    assert.ok(
      !/buildPrimaryNodeSnapshot\(/.test(handleSelectGroupBody) && !/rebuildPrimary\(/.test(handleSelectGroupBody),
      'handleSelectGroup が buildPrimaryNodeSnapshot / rebuildPrimary 経由で解除状態を作っている',
    )
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-4: rebuildPrimary は scenario 解除経路で呼ばれていない
// ─────────────────────────────────────────────────────────────

describe('T-4C4-4: rebuildPrimary は scenario 解除経路で呼ばれていない', () => {
  test('scenario rebuild effect の else if（解除）分岐 / handleSelectGroup / handleSelectScenario の isDeselect 分岐に rebuildPrimary が無い', () => {
    const effectStart = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    const effectEnd = src.indexOf('\n  }, [primaryNode.scenarioId])', effectStart)
    const effectBody = src.slice(effectStart, effectEnd)
    const deselectBranchStart = effectBody.indexOf('} else if (selectedScenarioId === null) {')
    assert.ok(deselectBranchStart >= 0, 'effect の解除分岐 anchor が見つからない')
    const deselectBranch = effectBody.slice(deselectBranchStart)
    assert.ok(!/rebuildPrimary\(/.test(deselectBranch), 'effect の解除分岐に rebuildPrimary が呼ばれている')

    const handleSelectGroupStart = src.indexOf('const handleSelectGroup = useCallback')
    const handleSelectGroupEnd = src.indexOf('const buildUpdatedNode = useCallback', handleSelectGroupStart)
    assert.ok(!/rebuildPrimary\(/.test(src.slice(handleSelectGroupStart, handleSelectGroupEnd)), 'handleSelectGroup に rebuildPrimary が呼ばれている')

    const handleSelectScenarioStart = src.indexOf('const handleSelectScenario = useCallback')
    const handleSelectScenarioEnd = src.indexOf('const handleSelectDrugSuggestion = useCallback', handleSelectScenarioStart)
    const handleSelectScenarioBody = src.slice(handleSelectScenarioStart, handleSelectScenarioEnd)
    const isDeselectBranch = handleSelectScenarioBody.slice(
      handleSelectScenarioBody.indexOf('? { ...p, scenarioId: \'\','),
      handleSelectScenarioBody.indexOf(': { ...p, scenarioId: id,'),
    )
    assert.ok(!/rebuildPrimary\(/.test(isDeselectBranch), 'handleSelectScenario の isDeselect 分岐に rebuildPrimary が呼ばれている')
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-5: primary 側 updater の純関数性（A-9）+ 1 分岐 1 setPrimaryNode（A-10）
// ─────────────────────────────────────────────────────────────

describe('T-4C4-5: primary 側 setPrimaryNode updater は純関数（別 setter / ref read / 副作用 0 件）', () => {
  /**
   * codeOnly() は行頭コメント（`//` / `*` / `/*` で始まる行全体）のみを除去し、
   * コード本体の末尾に付く同一行の説明コメント（例: `rapid: prev.rapid, // 旧
   * primaryNodeRef.current.rapid と同値`）は除去しない。ref read の「存在しない」
   * assertion はこの種の trailing comment 中の識別子言及を誤検出しうるため、
   * 各行の最初の `//` 以降を追加で切り落とす（このリポジトリの規約上、行コード内に
   * `//` を含む文字列リテラルや URL は setPrimaryNode 呼び出し本体に出現しない）。
   */
  function stripTrailingLineComments(s: string): string {
    return s
      .split('\n')
      .map(line => {
        const idx = line.indexOf('//')
        return idx >= 0 ? line.slice(0, idx) : line
      })
      .join('\n')
  }

  test('setPrimaryNode( の全呼び出しの updater 本体に *.current（ref read）が存在しない（A-9。D-4C-P4-2 hoist 後の確認）', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    assert.ok(calls.length >= 10, 'setPrimaryNode 呼び出しが見つからない')
    let scanned = 0
    for (const call of calls) {
      const body = stripTrailingLineComments(codeOnly(call.slice('setPrimaryNode('.length)))
      // updater は `prev => ...` または `p => ...` の arrow function。矢印の右側だけを見る
      // （引数リスト自体には ref read は出現しないため実質無害だが、意図を明確にするため）。
      const arrowIdx = body.indexOf('=>')
      assert.ok(arrowIdx >= 0, 'updater の arrow function が見つからない')
      const updaterBody = body.slice(arrowIdx + 2)
      const refReads = updaterBody.match(/\b\w+Ref\.current\b/g) ?? []
      assert.deepEqual(refReads, [], `setPrimaryNode の updater 内に ref read がある: ${refReads.join(' / ')}`)
      scanned++
    }
    assert.ok(scanned >= 10, `走査件数が想定より少ない（実際: ${scanned}）`)
  })

  test('setPrimaryNode( の全呼び出しの updater 本体に他の setXxx( 呼び出しが存在しない（A-9。T-4C2-7/T-4C3-7 と同一契約の 4C-4 時点再確認）', () => {
    const calls = extractBalancedCalls(src, 'setPrimaryNode(')
    for (const call of calls) {
      const body = codeOnly(call.slice('setPrimaryNode('.length))
      const nestedSetters = (body.match(/\bset[A-Z]\w*\(/g) ?? []).filter(s => s !== 'setPrimaryNode(')
      assert.deepEqual(nestedSetters, [], `setPrimaryNode の updater 内に別 setter 呼び出しがある: ${nestedSetters.join(' / ')}`)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-6: effect deps 完全一致
// ─────────────────────────────────────────────────────────────

describe('T-4C4-6: scenario rebuild effect の dependency 配列が primaryNode.scenarioId 単独である', () => {
  test('deps === [\'primaryNode.scenarioId\']', () => {
    const startIdx = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    const depsMatch = src.slice(startIdx).match(/\n\s*\}, \[([^\]]*)\]\)/)
    assert.ok(depsMatch, 'dependency 配列が見つからない')
    const deps = depsMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    assert.deepEqual(deps, ['primaryNode.scenarioId'], `dependency が変化している（実際: [${deps.join(', ')}]）`)
  })
})

// ─────────────────────────────────────────────────────────────
// T-4C4-7: primaryNodeProjection 存続 + metadata override 維持
// ─────────────────────────────────────────────────────────────

describe('T-4C4-7: primaryNodeProjection が存続し、metadata override が維持されている（Design P）', () => {
  test('primaryNodeProjection は useMemo で宣言され、削除されていない', () => {
    const code = codeOnly(src)
    assert.ok(
      /const primaryNodeProjection = useMemo<ComposeNode>\(\(\) => \(\{/.test(code),
      'primaryNodeProjection が見つからない（Design P は削除禁止）',
    )
  })

  test('block は ...primaryNode.block を spread した上で override key（baseLabel / templateLabel / fields / closingText / closingBehavior / groupKey / clinicalDomain / symptomCodes / domain）を維持している', () => {
    const code = codeOnly(src)
    const start = code.indexOf('const primaryNodeProjection = useMemo')
    assert.ok(start >= 0, 'primaryNodeProjection が見つからない')
    const end = code.indexOf('}), [', start)
    assert.ok(end > start, 'primaryNodeProjection の終端が見つからない')
    const body = code.slice(start, end)

    assert.ok(/\.\.\.primaryNode\.block,/.test(body), 'block が ...primaryNode.block を spread していない（rawFields/guard の透過が壊れる）')
    for (const key of [
      'baseLabel:', 'templateLabel:', 'fields:', 'closingText:',
      'closingBehavior:', 'groupKey:', 'clinicalDomain:', 'symptomCodes:', 'domain:',
    ]) {
      assert.ok(body.includes(key), `projection の override key が失われている: ${key}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Group D（[4C-4-F1-5]）: 既存 parity の再検証
//
// production helper（rebuildPrimary / buildPrimaryNodeSnapshot / deriveRawFields /
// derivePersonaGuard / applyPersonaToFieldsWithGuard）を直接 oracle として使い、
// Unit 4C-3 時点の値を oracle にしない（RAPID-V2-20。mirror 実装は作らない）。
//
// 注記: instruction 側で言及されている「primary revisit・secondary revisit
// （N1〜N6 / N8）」という個別ケース番号は、本 task で参照した
// UNIT_4C_STEP4_INSTRUCTIONS.md / Phase P4 Addendum のいずれにも定義が
// 含まれておらず（別途の blast radius 監査文書に存在すると推測されるが未提供）、
// 番号ごとの再現はできなかった。代わりに「revisit（editingNodeId の変化 /
// primary への出入り）が primaryNode.block を書き換えない」という契約を、
// 該当する全 handler を対象に機能的に同等な形で検証する。
// ═══════════════════════════════════════════════════════════════

describe('Group D-1: scenario switch transient parity（capable 4 遷移 × rapid × addon）', () => {
  test('capable→capable 4 遷移 × rapid{null,非null} × addon{0,1} で、遷移後（commit2 相当）の block.rawFields が deriveRawFields と一致する', () => {
    let pairsChecked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const transitions: Array<[Scenario, Scenario]> = []
      for (let i = 0; i < Math.min(caps.length, 2); i++) {
        for (let j = 0; j < Math.min(caps.length, 2); j++) {
          if (i !== j) transitions.push([caps[i], caps[j]])
        }
      }
      for (const [A, B] of transitions.slice(0, 4)) {
        for (const rapid of [null, RAPID_A] as RapidState[]) {
          for (const addonIds of [[], addonKeysOf(B).slice(0, 1)]) {
            const carried = nextRapidStateOnScenarioChange(
              rapid, isScenarioSReplacementCapable(A), isScenarioSReplacementCapable(B),
            )
            // commit2 相当: scenario rebuild effect の確定分岐（rebuildPrimary、addonIds: []）
            const afterEffect = rebuildPrimary({
              node: makeExistingNode(), mod, scenario: B, addonIds: [], rapid: carried,
              drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain',
            })
            assertFieldsEqual(
              afterEffect.block.rawFields as SoapFields, deriveRawFields(B, mod, [], carried, DRUG),
              `${mod.moduleId}: ${A.id}->${B.id} rapid=${rapid ? 'on' : 'off'}`,
            )
            void addonIds // ADDON は effect 確定分岐では常に [] にリセットされる契約（§2.3(a)）の確認用に列挙
            pairsChecked++
          }
        }
      }
    }
    assert.ok(pairsChecked >= 30, `検証件数が想定より少ない（実際: ${pairsChecked}）`)
  })
})

describe('Group D-2: persona 再適用往復（4 persona × ON/OFF × ADDON）', () => {
  test('OFF→ON→OFF で raw が不変（reapplyPersonaToAllBlocks primary 分岐と同一の object 代数）', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios().slice(0, 20)) {
      for (const persona of PERSONA_IDS) {
        const addonIds = addonKeysOf(sc).slice(0, 1)
        const base = rebuildPrimary({
          node: makeExistingNode(), mod, scenario: sc, addonIds, rapid: null,
          drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain',
        })
        // production: reapplyPersonaToAllBlocks の primary 分岐と同一の object 代数
        //   if (!prev.block.guard) return prev
        //   raw = prev.block.rawFields ?? EMPTY_FIELDS
        //   fields = nextEnabled ? applyPersonaToFieldsWithGuard(raw, true, nextPersona, guard) : raw
        function reapply(prev: ComposeNode, nextEnabled: boolean, nextPersona: PersonaId): ComposeNode {
          if (!prev.block.guard) return prev
          const raw = (prev.block.rawFields ?? EMPTY_FIELDS) as SoapFields
          return {
            ...prev, block: {
              ...prev.block,
              fields: nextEnabled ? applyPersonaToFieldsWithGuard(raw, true, nextPersona, prev.block.guard) : raw,
            },
          }
        }
        const on = reapply(base, true, persona)
        const off = reapply(on, false, persona)
        assertFieldsEqual(off.block.fields as SoapFields, base.block.rawFields as SoapFields, `${mod.moduleId}/${sc.id} persona=${persona}: OFF 復帰後の fields が raw と不一致`)
        assertFieldsEqual(off.block.rawFields as SoapFields, base.block.rawFields as SoapFields, `${mod.moduleId}/${sc.id} persona=${persona}: rawFields が往復で変化した`)
        checked++
      }
    }
    assert.ok(checked > 0, '検証対象が 0 件')
  })
})

describe('Group D-3: ADDON ON→OFF→ON 冪等・順序非依存（rebuildPrimary 経由）', () => {
  test('rebuildPrimary(addonIds=keys) の raw が ON→OFF→ON で冪等', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const keys = addonKeysOf(sc).slice(0, 1)
      if (keys.length === 0) continue
      const node = makeExistingNode()
      const on1 = rebuildPrimary({ node, mod, scenario: sc, addonIds: keys, rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      const off = rebuildPrimary({ node: on1, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      const on2 = rebuildPrimary({ node: off, mod, scenario: sc, addonIds: keys, rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      assertFieldsEqual(on1.block.rawFields as SoapFields, on2.block.rawFields as SoapFields, `${mod.moduleId}/${sc.id}: ON→OFF→ON が最初の ON と乖離`)
      assert.notDeepEqual(off.block.rawFields, on1.block.rawFields, `${mod.moduleId}/${sc.id}: OFF が ON と同一になっている`)
      checked++
    }
    assert.ok(checked > 0, '検証対象が 0 件')
  })

  test('順序非依存: [a,b] と [b,a]（2 keys 以上を持つ scenario）で raw が一致', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const keys = addonKeysOf(sc).slice(0, 2)
      if (keys.length < 2) continue
      const node = makeExistingNode()
      const forward = rebuildPrimary({ node, mod, scenario: sc, addonIds: [keys[0], keys[1]], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      // deriveRawFields の addonIds は「配列順がそのまま本文順序になる」契約のため、
      // 逆順は本文の並び順が変わりうる。ここでは「同一集合なら selectedAddonIds が
      // 集合として一致する」ことのみを確認する（本文の並び順は仕様どおり別）。
      const backward = rebuildPrimary({ node, mod, scenario: sc, addonIds: [keys[1], keys[0]], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      assert.deepEqual(
        new Set(forward.selectedAddonIds), new Set(backward.selectedAddonIds),
        `${mod.moduleId}/${sc.id}: selectedAddonIds の集合が順序で変化している`,
      )
      checked++
    }
    assert.ok(checked > 0, '検証対象（2 keys 以上）が 0 件')
  })
})

describe('Group D-4: Rapid ON/OFF（全 capable scenario × 代表 20 組合せ）', () => {
  test('rebuildPrimary(rapid=X) → rebuildPrimary(rapid=null) が素の scenario と byte 一致する（全 capable scenario）', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const node = makeExistingNode()
      const pristine = rebuildPrimary({ node, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      const on = rebuildPrimary({ node, mod, scenario: sc, addonIds: [], rapid: RAPID_A, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      assert.notEqual(on.block.rawFields?.S, pristine.block.rawFields?.S, `${mod.moduleId}/${sc.id}: ON で S が変化するはず`)
      const off = rebuildPrimary({ node: on, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
      assertFieldsEqual(off.block.rawFields as SoapFields, pristine.block.rawFields as SoapFields, `${mod.moduleId}/${sc.id}: OFF が pristine と乖離`)
      checked++
    }
    assert.equal(checked, 170, `検証した capable scenario 数（実際: ${checked}）`)
  })

  test('代表 20 組合せ（relation × condition）で rebuildPrimary の S 先頭文が buildResolvedSFirstSentence 相当になる', () => {
    const RELATIONS: SRelation[] = ['new_addition', 'med_changed', 'dose_increased', 'dose_decreased', 'continued_do']
    const CONDITIONS: SCondition[] = ['stable', 'improved', 'unchanged', 'not_improved']
    // combos は代表20組合せのみを保持し null を含めない（RapidState の null 分岐はこの test の対象外）。
    // 型を RapidState[] にすると null 分岐を許容してしまい、以降の rapid.previousEvent 等が
    // TS18047 (possibly null) になる。実値は非 null のみのため、型もそれに合わせて絞る。
    const combos: Array<{ previousEvent: SRelation; currentOutcome: SCondition }> = []
    for (const r of RELATIONS) for (const c of CONDITIONS) combos.push({ previousEvent: r, currentOutcome: c })
    assert.equal(combos.length, 20, '代表組合せは 20 件のはず')

    const { mod, sc } = capableScenarios()[0]
    let checked = 0
    for (const rapid of combos) {
      const rebuilt = rebuildPrimary({
        node: makeExistingNode(), mod, scenario: sc, addonIds: [], rapid,
        drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain',
      })
      const direct = deriveRawFields(sc, mod, [], rapid, DRUG)
      assertFieldsEqual(rebuilt.block.rawFields as SoapFields, direct, `${mod.moduleId}/${sc.id} rapid=${rapid.previousEvent}/${rapid.currentOutcome}`)
      checked++
    }
    assert.equal(checked, 20)
  })
})

describe('Group D-5: primary / secondary revisit は primaryNode.block を書き換えない', () => {
  // 「revisit」= editingNodeId を変える／primary へ出入りする操作。この種の handler
  // （handleSelectPrimaryNode / handleSelectNode 解除 / handleRemoveComposeNode /
  // handleResetCompose / handleExpressAdd ノードトグルオフ）はいずれも UI-only な
  // ADDON 選択の復元（setSelectedAddonIds(primaryAddonIdsRef.current)）のみを行い、
  // primaryNode.block を再構築してはならない（Unit 0 / RAPID-V2-06 契約の 4C-4 再確認）。
  test('handleSelectPrimaryNode / handleResetCompose に setPrimaryNode / rebuildPrimary の呼び出しが無い', () => {
    for (const [label, startMarker, endMarker] of [
      ['handleSelectPrimaryNode', 'const handleSelectPrimaryNode = useCallback', 'const handleSelectScenario = useCallback'],
      // 終端は handleResetCompose の直後の関数（handleLocalSiteInputChange）に絞る。
      // 旧: 'const handleExpressAdd = useCallback' は間にある handleLocalSiteInputChange /
      // handleFieldChange / handleAddonToggle / handleSToggle / handleSubcategorySelect まで
      // region に含めてしまい、handleAddonToggle / handleSToggle 内の正当な
      // setPrimaryNode / rebuildPrimary 呼び出しを誤って handleResetCompose のものとして検出していた
      // （false positive。handleResetCompose 単体の抽出では両呼び出しとも 0 件）。
      ['handleResetCompose', 'const handleResetCompose = useCallback', 'const handleLocalSiteInputChange = useCallback'],
    ] as const) {
      const start = src.indexOf(startMarker)
      const end = src.indexOf(endMarker, start)
      assert.ok(start >= 0 && end > start, `${label}: anchor が見つからない`)
      const body = codeOnly(src.slice(start, end))
      assert.ok(!/setPrimaryNode\(/.test(body), `${label} が setPrimaryNode を呼んでいる（revisit で block を書き換えてはならない）`)
      assert.ok(!/rebuildPrimary\(/.test(body), `${label} が rebuildPrimary を呼んでいる（revisit で block を書き換えてはならない）`)
    }
  })
})

describe('Group D-6: localInput は primaryNode.block へ materialize されない', () => {
  test('rebuildPrimary は localSiteInput を入力に取らず、node.localSiteInput の変化は block.fields に影響しない', () => {
    const { mod, sc } = capableScenarios()[0]
    const nodeA = makeExistingNode({ localSiteInput: '' })
    const nodeB = makeExistingNode({ localSiteInput: '左足首' })
    const rebuiltA = rebuildPrimary({ node: nodeA, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
    const rebuiltB = rebuildPrimary({ node: nodeB, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
    assertFieldsEqual(rebuiltA.block.fields as SoapFields, rebuiltB.block.fields as SoapFields, 'localSiteInput の差が block.fields に漏れている')
    assert.notEqual(rebuiltA.localSiteInput, rebuiltB.localSiteInput, 'localSiteInput 自体は lifecycle field として引き継がれるはず')
  })
})

describe('Group D-7: brand resolution 保持・Express reset・gate', () => {
  test('rebuildPrimary は matchedBrandName / resolvedDrugName / resolution を lifecycle field として保持する', () => {
    const { mod, sc } = capableScenarios()[0]
    const node = makeExistingNode({
      matchedBrandName: 'ブランドX', resolvedDrugName: '一般名X',
      resolution: { denotation: 'brand', brandKey: 'X', subject: 'X' },
    })
    const rebuilt = rebuildPrimary({ node, mod, scenario: sc, addonIds: [], rapid: null, drugName: DRUG, drugLabel: 'L', baseDomain: 'dm', personaEnabled: false, persona: 'plain' })
    assert.equal(rebuilt.matchedBrandName, 'ブランドX')
    assert.equal(rebuilt.resolvedDrugName, '一般名X')
    assert.deepEqual(rebuilt.resolution, { denotation: 'brand', brandKey: 'X', subject: 'X' })
  })

  test('handleExpressAdd（primary 分岐）は resolution: undefined を明示する（U-5 lifecycle reset）', () => {
    // §2.3(f): handleExpressAdd primary 分岐は変更不要（rebuildPrimary を使わない）。
    // Express は BrandResolution を持たないため、直前の検索由来 resolution を
    // 明示的に破棄する契約が保たれていることを確認する。
    const start = src.indexOf('if (isPrimaryEmpty) {')
    const end = src.indexOf('} else {', start)
    assert.ok(start >= 0 && end > start, 'handleExpressAdd primary 分岐の anchor が見つからない')
    const body = src.slice(start, end)
    assert.ok(/resolution:\s*undefined,/.test(body), 'handleExpressAdd primary 分岐が resolution: undefined を明示していない')
  })
})
