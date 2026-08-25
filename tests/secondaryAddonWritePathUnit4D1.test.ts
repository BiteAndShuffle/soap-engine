/**
 * secondaryAddonWritePathUnit4D1.test.ts — Rapid Mode v2 / Unit 4D-1 契約テスト
 *
 * Unit 4D-1 は architecture-only change である。
 * `handleAddonToggle` の node（secondary）ブランチを、primary ブランチで既に
 * 成立している purity contract へ揃えた:
 *
 *   ① updater の外で次の ADDON 選択を確定する（updater 内で mutable ref を読まない）
 *   ② setSelectedAddonIds を値形式で呼ぶ（updater から別 setter を呼ばない）
 *   ③ setComposeNodes を prev のみを入力に取る pure functional updater で呼ぶ
 *      （composeNodesRef.current から次の配列全体を確定しない）
 *
 * **derive の意味論は変更していない。** 入力（scenario / mod / newAddonIds /
 * node.rapid / node.resolvedDrugName / persona）も block の組み立て方も従来どおりである。
 * 本ファイルはその 2 点 — purity contract の成立と、値の非変化 — を固定する。
 *
 * ## テスト手法について（rapidNodeStateSafety.test.ts と同じ方針）
 * 本リポジトリには React renderer（@testing-library/react 等）が導入されていないため、
 * handler そのものを実行して state 遷移を観測することはできない。したがって:
 *
 *   - **値（主）**: node ブランチが実際に呼ぶ production helper
 *     （deriveNodeBlockCore / applyPersonaToFieldsWithGuard）を直接組み合わせ、
 *     ADDON 再構築の意味論と updater の畳み込み規則を値レベルで検証する。
 *   - **ソース契約（補助）**: production ソースの node ブランチ領域を切り出し、
 *     purity 違反（nested setter / updater 内 ref read）が無いことと、
 *     値テストが前提とする式が実際にその形で存在することを構造で検証する。
 *
 * ソース契約は単純な occurrence count に依存させない。「どの領域の」「どの構文が」
 * 存在する / しないかを判定する（RAPID-V2-20: production ロジックを test 側へ複製した
 * mirror を正本にしない。下記 applyNodeAddonUpdater は production と同一の式であることを
 * G 群のソース契約で拘束する）。
 *
 * 実行:
 *   npx tsx --test tests/secondaryAddonWritePathUnit4D1.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, ComposeNode } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveNodeBlockCore } from '../lib/deriveNodeFields'
import { applyPersonaToFieldsWithGuard, PERSONA_LABELS, type PersonaId } from '../lib/applyPersona'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import { rebuildNode } from '../lib/primaryNode'
import type { RapidState } from '../lib/rapidState'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

const PERSONA_IDS = Object.keys(PERSONA_LABELS) as PersonaId[]
const RAPID_A: RapidState = { previousEvent: 'dose_increased', currentOutcome: 'stable' }

// ─────────────────────────────────────────────────────────────
// ソース領域の切り出し
// ─────────────────────────────────────────────────────────────

/**
 * `handleAddonToggle` の宣言から useCallback の deps 配列までを切り出す。
 * アンカーが見つからない場合は明示的に失敗させる（リファクタで無言に検証が
 * 無効化されるのを防ぐ）。
 */
function extractHandleAddonToggle(): string {
  const START = 'const handleAddonToggle = useCallback('
  const startIdx = src.indexOf(START)
  assert.notEqual(startIdx, -1, 'handleAddonToggle の宣言が見つからない')
  const rest = src.slice(startIdx)
  const endMatch = rest.match(/\n\s*\}, \[[^\]]*\]\)/)
  assert.ok(endMatch, 'handleAddonToggle の dependency 配列が見つからない')
  return rest.slice(0, endMatch!.index! + endMatch![0].length)
}

/** handleAddonToggle のうち node ブランチ（`if (nodeId !== null) {` 〜 `} else {`）だけを返す */
function extractNodeBranch(): string {
  const body = extractHandleAddonToggle()
  const s = body.indexOf('if (nodeId !== null) {')
  assert.notEqual(s, -1, 'node ブランチの開始アンカーが見つからない')
  const e = body.indexOf('} else {', s)
  assert.notEqual(e, -1, 'node ブランチの終了アンカー（} else {）が見つからない')
  return body.slice(s, e)
}

/** 行コメント（// 〜）と行頭 * のブロックコメント行を除いたコード行だけを返す */
function codeOnly(region: string): string {
  return region
    .split('\n')
    .filter(l => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    })
    .map(l => l.replace(/\s+\/\/.*$/, ''))   // 行末の同一行コメントを除去
    .join('\n')
}

/**
 * 指定 setter の updater 本体（`setter(arg => {` の `{` から対応する `}` まで）を
 * すべて返す。updater 形式で呼ばれていない（値形式の）呼び出しは対象外。
 */
function updaterBodies(region: string, setter: string): string[] {
  const out: string[] = []
  const re = new RegExp(`${setter}\\(\\s*(\\w+)\\s*=>\\s*\\{`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(region)) !== null) {
    let depth = 0
    let i = m.index + m[0].length - 1   // 最初の `{`
    const start = i
    for (; i < region.length; i++) {
      if (region[i] === '{') depth++
      else if (region[i] === '}') { depth--; if (depth === 0) break }
    }
    out.push(region.slice(start, i + 1))
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// production helper の組み合わせ（node ブランチが実行する式そのもの）
//
// G 群のソース契約が、この 5 式が production の node ブランチに
// この形で存在することを拘束する。
// ─────────────────────────────────────────────────────────────

function resolveDomain(mod: ModuleData): string {
  return mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
}

/**
 * production の `setComposeNodes(prev => { ... })` updater と同一の畳み込み。
 * prev 以外の入力（nodeId / newAddonIds / persona）はすべて引数で受け取る
 * ＝ updater が prev と hoist 済み値のみに依存することを型で表現している。
 */
function applyNodeAddonUpdater(
  prev: ComposeNode[],
  nodeId: string,
  newAddonIds: string[],
  personaEnabled: boolean,
  selectedPersona: PersonaId,
  allModules: ModuleData[],
  moduleData: ModuleData,
): ComposeNode[] {
  const node = prev.find(n => n.id === nodeId)
  if (!node) return prev
  const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData
  const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)
  if (!sc) return prev
  // Unit 4D-2: block 再構築は production の canonical rebuild core をそのまま呼ぶ。
  // 4D-1 時点はここに derive を複製していたが、4D-2 で委譲先が生まれたため mirror を廃止した。
  const updated = rebuildNode({
    node, mod, scenario: sc, addonIds: newAddonIds, rapid: node.rapid,
    drugName: node.resolvedDrugName ?? '',
    drugLabel: node.drugLabel, baseDomain: resolveDomain(mod),
    personaEnabled, persona: selectedPersona,
  })
  return prev.map(n => n.id !== nodeId ? n : updated)
}

/** production の hoist 部（updater の外で次の ADDON 選択を確定する）と同一 */
function nextAddonSelection(current: Set<string>, addonKey: string): { next: Set<string>; newAddonIds: string[] } {
  const next = new Set(current)
  next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)
  return { next, newAddonIds: [...next] }
}

// ─────────────────────────────────────────────────────────────
// fixture
// ─────────────────────────────────────────────────────────────

function addonKeysOf(sc: Scenario): string[] {
  const ref = (sc as unknown as { addonsRef?: Record<string, string[]> }).addonsRef
  return ref ? Object.values(ref).flat() : []
}

/** ADDON を 1 件以上持つ scenario を module 横断で列挙する */
function scenariosWithAddons(): { mod: ModuleData; sc: Scenario; keys: string[] }[] {
  const out: { mod: ModuleData; sc: Scenario; keys: string[] }[] = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      const keys = addonKeysOf(sc).filter(k => mod.addons?.items?.[k])
      if (keys.length > 0) out.push({ mod, sc, keys })
    }
  }
  return out
}

/** production の Node 生成経路（handleComposeDrugSelect / buildUpdatedNode）と同形の node */
function makeNode(
  id: string, mod: ModuleData, sc: Scenario, addonIds: string[], rapid: RapidState,
  personaEnabled: boolean, persona: PersonaId,
): ComposeNode {
  const drug = '本剤'
  const core = deriveNodeBlockCore(sc, mod, addonIds, rapid, drug)
  const fields = personaEnabled
    ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
    : core.rawFields
  const domain = resolveDomain(mod)
  return {
    id, moduleId: mod.moduleId, scenarioId: sc.globalId,
    block: { id: `block-${id}`, ...core, fields, domain },
    drugLabel: `label-${id}`,
    selectedAddonIds: addonIds,
    baseLabel: sc.title,
    baseDomain: domain,
    matchedBrandName: `brand-${id}`,
    resolvedDrugName: drug,
    resolution: undefined,
    localSiteInput: `site-${id}`,
    rapid,
  }
}

const CASES = scenariosWithAddons()

// ═══════════════════════════════════════════════════════════════
// A. setSelectedAddonIds updater 内に別 setter が存在しない
// ═══════════════════════════════════════════════════════════════

describe('A. setSelectedAddonIds updater 内の nested setter = 0（A-13）', () => {
  test('handleAddonToggle 全体で setSelectedAddonIds( の updater 本体に他の setXxx( が無い', () => {
    const region = codeOnly(extractHandleAddonToggle())
    const bodies = updaterBodies(region, 'setSelectedAddonIds')
    for (const b of bodies) {
      const nested = [...b.matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
      assert.deepEqual(
        nested, [],
        `setSelectedAddonIds updater 内に別 setter がある: ${nested.join(', ')}\n${b}`,
      )
    }
  })

  test('node ブランチの setSelectedAddonIds は値形式（updater 形式ではない）', () => {
    const region = codeOnly(extractNodeBranch())
    assert.ok(
      /setSelectedAddonIds\(next\)/.test(region),
      'node ブランチが setSelectedAddonIds(next) の値形式で呼んでいない',
    )
    assert.equal(
      updaterBodies(region, 'setSelectedAddonIds').length, 0,
      'node ブランチに setSelectedAddonIds の updater 形式呼び出しが残っている',
    )
  })

  test('node ブランチの setComposeNodes updater 本体にも別 setter が無い', () => {
    const region = codeOnly(extractNodeBranch())
    const bodies = updaterBodies(region, 'setComposeNodes')
    assert.equal(bodies.length, 1, 'node ブランチの setComposeNodes updater は 1 つであるべき')
    const nested = [...bodies[0].matchAll(/\bset[A-Z]\w*\(/g)].map(m => m[0])
    assert.deepEqual(nested, [], `setComposeNodes updater 内に別 setter がある: ${nested.join(', ')}`)
  })
})

// ═══════════════════════════════════════════════════════════════
// B. updater 内で mutable ref を読まない（A-9）
// ═══════════════════════════════════════════════════════════════

describe('B. secondary ADDON write path の updater 内 ref read = 0（A-9）', () => {
  test('node ブランチの全 updater 本体に *.current が出現しない', () => {
    const region = codeOnly(extractNodeBranch())
    const bodies = [
      ...updaterBodies(region, 'setComposeNodes'),
      ...updaterBodies(region, 'setSelectedAddonIds'),
    ]
    assert.ok(bodies.length > 0, 'updater が 1 つも見つからない（アンカー破損）')
    for (const b of bodies) {
      const refs = [...b.matchAll(/\w+Ref\.current/g)].map(m => m[0])
      assert.deepEqual(refs, [], `updater 内で ref を読んでいる: ${refs.join(', ')}\n${b}`)
    }
  })

  test('node ブランチが composeNodesRef を一切参照しない（次の配列全体を ref から確定しない）', () => {
    const region = codeOnly(extractNodeBranch())
    assert.equal(
      /composeNodesRef/.test(region), false,
      'node ADDON ブランチに composeNodesRef の参照が残っている',
    )
  })

  test('ref read は updater の外でのみ行う（selectedAddonIdsRef は hoist 位置にある）', () => {
    const region = codeOnly(extractNodeBranch())
    assert.ok(
      /const next = new Set\(selectedAddonIdsRef\.current\)/.test(region),
      'updater 外での selectedAddonIdsRef.current hoist が見つからない',
    )
    // hoist 行が setComposeNodes 呼び出しより前にあること
    assert.ok(
      region.indexOf('selectedAddonIdsRef.current') < region.indexOf('setComposeNodes('),
      'ref read が setComposeNodes より後ろにある（hoist されていない）',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// C. setComposeNodes が pure functional updater で id 更新する
// ═══════════════════════════════════════════════════════════════

describe('C. setComposeNodes は prev のみを入力に取り node.id で更新する', () => {
  test('setComposeNodes(prev => { ... }) の updater 形式である', () => {
    const region = codeOnly(extractNodeBranch())
    assert.ok(
      /setComposeNodes\(prev => \{/.test(region),
      'setComposeNodes が prev updater 形式で呼ばれていない',
    )
  })

  test('updater が prev.find / prev.map と n.id 比較で addressing する', () => {
    const body = updaterBodies(codeOnly(extractNodeBranch()), 'setComposeNodes')[0]
    assert.ok(/prev\.find\(n => n\.id === nodeId\)/.test(body), 'prev.find による id addressing が無い')
    assert.ok(/prev\.map\(n => n\.id !== nodeId \? n : updated\)/.test(body), 'prev.map による id 更新が無い')
  })

  test('index による node addressing を使っていない', () => {
    const body = updaterBodies(codeOnly(extractNodeBranch()), 'setComposeNodes')[0]
    for (const bad of [/prev\[\d+\]/, /nodes\[\w+\]/, /\bfindIndex\b/, /\bindex\b/, /composeNodes\[/]) {
      assert.equal(bad.test(body), false, `index addressing が混入している: ${bad}`)
    }
  })

  test('対象が見つからない / scenario 未確定なら prev をそのまま返す（composeNodes を触らない）', () => {
    const body = updaterBodies(codeOnly(extractNodeBranch()), 'setComposeNodes')[0]
    const returns = [...body.matchAll(/return prev(?![.\w])/g)].length
    assert.equal(returns, 2, '早期 return prev が 2 本（node なし / sc なし）存在するべき')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. 対象 node のみ更新され、他 node は同一参照のまま
// ═══════════════════════════════════════════════════════════════

describe('D. 非対象 node の identity / value が変化しない', () => {
  test('3 node 中 1 node を ADDON 更新しても、他 2 node は参照一致のまま', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES.slice(0, 60)) {
      const other1 = makeNode('n1', mod, sc, [], null, false, 'plain')
      const target = makeNode('t', mod, sc, [], RAPID_A, false, 'plain')
      const other2 = makeNode('n2', mod, sc, [], null, false, 'plain')
      const prev: ComposeNode[] = [other1, target, other2]

      const { newAddonIds } = nextAddonSelection(new Set<string>(), keys[0])
      const next = applyNodeAddonUpdater(prev, 't', newAddonIds, false, 'plain', ALL_MODULES, mod)

      assert.equal(next.length, 3)
      assert.ok(Object.is(next[0], other1), `非対象 node の参照が変わった: ${mod.moduleId}/${sc.id}`)
      assert.ok(Object.is(next[2], other2), `非対象 node の参照が変わった: ${mod.moduleId}/${sc.id}`)
      assert.equal(Object.is(next[1], target), false, '対象 node が更新されていない')
      checked++
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('対象 node が存在しない場合は prev がそのまま返る（配列 identity も不変）', () => {
    const { mod, sc, keys } = CASES[0]
    const prev: ComposeNode[] = [makeNode('a', mod, sc, [], null, false, 'plain')]
    const next = applyNodeAddonUpdater(prev, 'missing-id', keys.slice(0, 1), false, 'plain', ALL_MODULES, mod)
    assert.ok(Object.is(next, prev), 'node 未発見時に新しい配列を返している')
  })

  test('scenario 未確定（pending node）の場合も prev がそのまま返る', () => {
    const { mod, sc } = CASES[0]
    const pending: ComposeNode = { ...makeNode('p', mod, sc, [], null, false, 'plain'), scenarioId: '' }
    const prev: ComposeNode[] = [pending]
    const next = applyNodeAddonUpdater(prev, 'p', ['whatever'], false, 'plain', ALL_MODULES, mod)
    assert.ok(Object.is(next, prev), 'scenario 未確定時に新しい配列を返している')
  })
})

// ═══════════════════════════════════════════════════════════════
// E. primaryNode に触れない
// ═══════════════════════════════════════════════════════════════

describe('E. node ブランチは primaryNode を書き換えない', () => {
  /**
   * Unit 4D-3a contract migration（Owner Decision D-4D3-OD1 / D-4D3-7）。
   *
   * 4D-1 時点の本テストは `confirmDiscard(` も禁止していたが、それは
   * 「secondary content write は editedSOAP を無視してよい」という historical
   * asymmetry を契約として固定してしまっていた。D-4D3-OD1 により、editedSOAP は
   * 合成 SOAP 全体の manual override であり secondary content write も同じ
   * discard contract を通すことが確定したため、`confirmDiscard(` を **必須へ反転**する。
   *
   * これは test weakening / retirement ではなく successor contract である:
   *   - setPrimaryNode(  … 禁止を維持（primary state を汚さない）
   *   - setEditedSOAP(   … 禁止を維持（破棄 authority は dialog 側。D-4D3-5）
   *   - confirmDiscard(  … 禁止 → 必須（本 Unit で反転）
   */
  test('node ブランチに setPrimaryNode / setEditedSOAP が無く、confirmDiscard を通す', () => {
    const region = codeOnly(extractNodeBranch())
    for (const forbidden of ['setPrimaryNode(', 'setEditedSOAP(']) {
      assert.equal(
        region.includes(forbidden), false,
        `node ブランチに ${forbidden} が混入している（primary 側の意味論を持ち込まない）`,
      )
    }
    assert.ok(
      region.includes('confirmDiscard(() => {'),
      'node ブランチが confirmDiscard を通していない（Unit 4D-3a の統一 contract）',
    )
  })

  test('node ブランチが primaryNode / primaryNodeRef / primaryAddonIdsRef を参照しない', () => {
    const region = codeOnly(extractNodeBranch())
    for (const forbidden of [/\bprimaryNode\b/, /primaryNodeRef/, /primaryAddonIdsRef/, /primaryScenarioRef/]) {
      assert.equal(forbidden.test(region), false, `node ブランチに ${forbidden} が混入している`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// F. ADDON ON/OFF 往復で block 出力が一致する（値の非変化）
// ═══════════════════════════════════════════════════════════════

describe('F. ADDON ON/OFF 往復の値保存', () => {
  test('ON → OFF で block / selectedAddonIds が元の値へ byte 復元する（persona 全種 × ON/OFF）', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES.slice(0, 40)) {
      for (const personaEnabled of [false, true]) {
        for (const persona of personaEnabled ? PERSONA_IDS : (['plain'] as PersonaId[])) {
          const start = makeNode('t', mod, sc, [], RAPID_A, personaEnabled, persona)
          const prev: ComposeNode[] = [start]

          const on = nextAddonSelection(new Set<string>(), keys[0])
          const afterOn = applyNodeAddonUpdater(prev, 't', on.newAddonIds, personaEnabled, persona, ALL_MODULES, mod)
          const off = nextAddonSelection(on.next, keys[0])
          const afterOff = applyNodeAddonUpdater(afterOn, 't', off.newAddonIds, personaEnabled, persona, ALL_MODULES, mod)

          assert.deepStrictEqual(off.newAddonIds, [], 'OFF 後の ADDON 選択が空でない')
          assert.deepStrictEqual(
            afterOff[0].block, start.block,
            `ON→OFF で block が復元しない: ${mod.moduleId}/${sc.id} persona=${personaEnabled ? persona : 'off'}`,
          )
          assert.deepStrictEqual(afterOff[0].selectedAddonIds, start.selectedAddonIds)
          checked++
        }
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('ON 状態の block が deriveNodeBlockCore + persona の出力と値一致する（derive 意味論の非変化）', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES.slice(0, 40)) {
      for (const personaEnabled of [false, true]) {
        const persona: PersonaId = personaEnabled ? 'gentle' : 'plain'
        const start = makeNode('t', mod, sc, [], RAPID_A, personaEnabled, persona)
        const { newAddonIds } = nextAddonSelection(new Set<string>(), keys[0])
        const after = applyNodeAddonUpdater([start], 't', newAddonIds, personaEnabled, persona, ALL_MODULES, mod)

        const core = deriveNodeBlockCore(sc, mod, newAddonIds, RAPID_A, start.resolvedDrugName ?? '')
        const expectedFields = personaEnabled
          ? applyPersonaToFieldsWithGuard(core.rawFields, true, persona, core.guard)
          : core.rawFields
        assert.deepStrictEqual(after[0].block.rawFields, core.rawFields, `rawFields 不一致: ${mod.moduleId}/${sc.id}`)
        assert.deepStrictEqual(after[0].block.guard, core.guard, `guard 不一致: ${mod.moduleId}/${sc.id}`)
        assert.deepStrictEqual(after[0].block.fields, expectedFields, `fields 不一致: ${mod.moduleId}/${sc.id}`)
        assert.equal(after[0].block.id, start.block.id, 'block.id が carry-forward されていない')
        checked++
      }
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('lifecycle field（rapid / brand / resolution / localSiteInput / id）が保存される', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES.slice(0, 40)) {
      const start = makeNode('t', mod, sc, [], RAPID_A, false, 'plain')
      const { newAddonIds } = nextAddonSelection(new Set<string>(), keys[0])
      const after = applyNodeAddonUpdater([start], 't', newAddonIds, false, 'plain', ALL_MODULES, mod)[0]
      assert.deepStrictEqual(after.rapid, RAPID_A, 'rapid が ADDON トグルで変化した')
      assert.equal(after.id, start.id)
      assert.equal(after.moduleId, start.moduleId)
      assert.equal(after.scenarioId, start.scenarioId)
      assert.equal(after.matchedBrandName, start.matchedBrandName)
      assert.equal(after.resolvedDrugName, start.resolvedDrugName)
      assert.equal(after.resolution, start.resolution)
      assert.equal(after.localSiteInput, start.localSiteInput)
      assert.equal(after.drugLabel, start.drugLabel)
      checked++
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('updater は冪等である（StrictMode の二重実行で同じ結果になる）', () => {
    let checked = 0
    for (const { mod, sc, keys } of CASES.slice(0, 40)) {
      const prev: ComposeNode[] = [makeNode('t', mod, sc, [], RAPID_A, false, 'plain')]
      const { newAddonIds } = nextAddonSelection(new Set<string>(), keys[0])
      const once  = applyNodeAddonUpdater(prev, 't', newAddonIds, false, 'plain', ALL_MODULES, mod)
      const twice = applyNodeAddonUpdater(prev, 't', newAddonIds, false, 'plain', ALL_MODULES, mod)
      assert.deepStrictEqual(once, twice, `updater が非冪等: ${mod.moduleId}/${sc.id}`)
      assert.deepStrictEqual(prev[0], makeNode('t', mod, sc, [], RAPID_A, false, 'plain'), 'updater が prev を破壊した')
      checked++
    }
    assert.ok(checked > 0, '検証件数が 0 件')
  })

  test('ADDON 選択順が本文順序になる契約（Set 挿入順 = newAddonIds 順）が維持されている', () => {
    const multi = CASES.filter(c => c.keys.length >= 2).slice(0, 20)
    assert.ok(multi.length > 0, 'ADDON を 2 件以上持つ scenario が見つからない')
    for (const { keys } of multi) {
      const a = nextAddonSelection(new Set<string>(), keys[0])
      const b = nextAddonSelection(a.next, keys[1])
      assert.deepStrictEqual(b.newAddonIds, [keys[0], keys[1]], 'Set 挿入順が保たれていない')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// G. 値テストが前提とする式が production に存在する（mirror drift 防止）
// ═══════════════════════════════════════════════════════════════

describe('G. applyNodeAddonUpdater は production node ブランチと同一の式である', () => {
  // Unit 4D-2 更新: derive は canonical rebuild core（rebuildNode）へ委譲された。
  // 本群の目的（値テストが production と同じ式を使っていることの担保）は不変で、
  // 期待する式が委譲形になっただけである。
  const EXPECTED_EXPRESSIONS = [
    'const node = prev.find(n => n.id === nodeId)',
    'const mod = allModules.find(m => m.moduleId === node.moduleId) ?? moduleData',
    'const sc = mod.scenarios.find(s => s.globalId === node.scenarioId)',
    'const updated = rebuildNode({',
    'node, mod, scenario: sc, addonIds: newAddonIds, rapid: node.rapid,',
    "drugName: node.resolvedDrugName ?? '',",
    'drugLabel: node.drugLabel, baseDomain: resolveDomain(mod),',
    'personaEnabled, persona: selectedPersona,',
    'return prev.map(n => n.id !== nodeId ? n : updated)',
  ]

  for (const expr of EXPECTED_EXPRESSIONS) {
    test(`node ブランチに存在する: ${expr}`, () => {
      const region = codeOnly(extractNodeBranch())
      assert.ok(region.includes(expr), `production の node ブランチに式が無い: ${expr}`)
    })
  }

  test('hoist 部が production と同一である', () => {
    const region = codeOnly(extractNodeBranch())
    assert.ok(region.includes('const next = new Set(selectedAddonIdsRef.current)'))
    assert.ok(region.includes('next.has(addonKey) ? next.delete(addonKey) : next.add(addonKey)'))
    assert.ok(region.includes('const newAddonIds = [...next]'))
  })
})

// ═══════════════════════════════════════════════════════════════
// H. Unit 4D-1 のスコープ外が変わっていない
// ═══════════════════════════════════════════════════════════════

describe('H. スコープ外の不変（4D-2 以降の論点を先取りしていない）', () => {
  test('buildUpdatedNode が存続し、canonical rebuild core へ委譲している（Unit 4D-2）', () => {
    // 4D-1 時点では「rebuildNode が先取り導入されていないこと」を守る scope guard だった。
    // 4D-2 で一般化が正式に行われたため、guard を「委譲が成立していること」へ反転する。
    assert.ok(src.includes('const buildUpdatedNode = useCallback('), 'buildUpdatedNode が消えている')
    assert.ok(/\brebuildNode\b/.test(src), 'rebuildNode への委譲が無い（4D-2 未適用）')
    assert.equal(
      (src.match(/deriveNodeBlockCore\(/g) ?? []).length, 0,
      'DashboardClient に block derive の inline 実装が残っている',
    )
  })

  test('handleSToggle の 1剤目限定 early return が維持されている（node Rapid 未解禁）', () => {
    assert.ok(
      src.includes('if (editingNodeIdRef.current !== null) return'),
      'handleSToggle の node early return が消えている（Rapid UI gate 変更は 4D-4 の責務）',
    )
  })

  test('Rapid UI gate（isSingleDrug）が変更されていない', () => {
    assert.ok(
      src.includes('const isSingleDrug = selectedScenarioId !== null && composeNodes.length === 0'),
      'isSingleDrug の定義が変わっている（multi-Rapid 解禁は本 Unit の責務ではない）',
    )
  })

  test('primaryNodeProjection が存続している', () => {
    assert.ok(src.includes('const primaryNodeProjection = useMemo<ComposeNode>('), 'projection が変更されている')
  })

  test('primary ブランチの rebuildPrimary 経路が変更されていない', () => {
    const body = codeOnly(extractHandleAddonToggle())
    assert.ok(body.includes('setSelectedAddonIds(next)'), 'primary の値形式 setSelectedAddonIds が消えた')
    assert.ok(body.includes('rebuildPrimary({ node: p, mod, scenario: sc, addonIds: newAddonIds, rapid: rapidNow,'),
      'primary の rebuildPrimary 呼び出しが変更されている')
  })

  test('handleAddonToggle の dependency 配列が変わっていない', () => {
    const body = extractHandleAddonToggle()
    const deps = body.match(/\}, \[([^\]]*)\]\)$/)
    assert.ok(deps, 'deps 配列が取得できない')
    assert.deepStrictEqual(
      deps![1].split(',').map(s => s.trim()).filter(Boolean),
      ['activeModuleData', 'primaryNode.matchedBrandName', 'allModules', 'moduleData',
       'personaEnabled', 'selectedPersona', 'confirmDiscard'],
      'handleAddonToggle の deps が変化している',
    )
  })
})
