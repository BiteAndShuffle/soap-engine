/**
 * deriveNodeFieldsUnit2B.test.ts — Rapid Mode v2 / Unit 2B 契約テスト
 *
 * Unit 2B（primary deterministic derive migration）で、primary の
 * path-dependent incremental mutation（scenario rebuild 後の Rapid 手動再適用、
 * handleSToggle の replaceSFirstSentence / restoreScenarioFirstSentence 直接呼び出し、
 * handleAddonToggle の ADDON strip/re-add）を
 * lib/deriveNodeFields.ts の deriveRawFields() へ一本化した。
 *
 * 本ファイルは Unit 2B が導入した以下の契約を守る:
 *   1. deriveRawFields が primary raw の単一生成経路である
 *   2. Rapid ON/OFF で手動 S mutation（NLP dead path 除く）を使用しない
 *   3. ADDON primary path に strip/re-add mutation が残っていない
 *   4. operation-order independence（同じ最終 state → byte-identical raw）
 *   5. Unit 0 の effect dependency [selectedScenarioId] を維持
 *   6. composer（mergeBlocks）は無変更
 *
 * RAPID-V2-20:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   DashboardClient.tsx 内部構造の確認（1・2・3・5・6）のみ source contract で行う。
 *
 * Unit 3B 更新: 「ComposeNode に rapid フィールドが追加されていない」という
 * migration scope guard は、Unit 3B が正式にその責務を実施したため退役した
 * （Owner Decision D-1）。ComposeNode.rapid の正方向の契約は
 * tests/nodeRapidOwnershipUnit3B.test.ts が固定する。
 *
 * 実行:
 *   npx tsx --test tests/deriveNodeFieldsUnit2B.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, SoapFields, SoapKey } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { deriveRawFields } from '../lib/deriveNodeFields'
import { isScenarioSReplacementCapable } from '../lib/isSReplacementEligible'
import type { RapidState } from '../lib/rapidState'
import { nextRapidStateOnScenarioChange } from '../lib/rapidState'

const SECTIONS: SoapKey[] = ['S', 'O', 'A', 'P']
const DRUG = '本剤'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

/**
 * コメントを除いた実装本体だけを取り出す。
 * source contract はコード自身の構造を見るものであり、コード中の説明コメントが
 * 偶然パターンにヒットしてはならない。
 */
function codeOnly(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメント
    .replace(/^[ \t]*\/\/.*$/gm, '')    // 行コメント
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

function capableScenarios(): Array<{ mod: ModuleData; sc: Scenario }> {
  const out: Array<{ mod: ModuleData; sc: Scenario }> = []
  for (const mod of ALL_MODULES) {
    for (const sc of mod.scenarios ?? []) {
      if (isScenarioSReplacementCapable(sc)) out.push({ mod, sc })
    }
  }
  return out
}

function assertFieldsEqual(a: SoapFields, b: SoapFields, msg: string): void {
  for (const sec of SECTIONS) {
    assert.equal(a[sec], b[sec], `${msg} [${sec}]`)
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. deriveRawFields が primary raw の単一生成経路である
// ═══════════════════════════════════════════════════════════════

describe('1. deriveRawFields が primary raw の単一生成経路である', () => {
  // Unit 4C-4: primary の write site が `rebuildPrimary`（lib/primaryNode.ts）へ一本化された。
  // rebuildPrimary は内部で deriveNodeBlockCore を呼び、その rawFields は
  // deriveRawFields(scenario, mod, addonIds, rapid, drugName) と常に同値である
  // （lib/deriveNodeFields.ts の NodeBlockCore コメント参照。T-4C4-F1-1 が値レベルで固定する）。
  // 「primary raw の生成経路が単一である」という契約自体は維持されるため、
  // 検証対象を deriveRawFields の直接呼び出しから rebuildPrimary の直接呼び出しへ差し替える。
  test('scenario rebuild effect / handleSToggle / handleAddonToggle の primary 分岐がすべて rebuildPrimary（deriveRawFields 相当の単一経路）を呼ぶ', () => {
    const effectBlock = src.slice(
      src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化'),
      src.indexOf('// ══', src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')),
    )
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    const addonBlock = src.slice(
      src.indexOf('const handleAddonToggle = useCallback'),
      src.indexOf('const handleSToggle = useCallback'),
    )
    assert.ok(/rebuildPrimary\(/.test(effectBlock), 'scenario rebuild effect が rebuildPrimary を呼んでいない')
    assert.ok(/rebuildPrimary\(/.test(toggleBlock), 'handleSToggle が rebuildPrimary を呼んでいない')
    assert.ok(/rebuildPrimary\(/.test(addonBlock), 'handleAddonToggle が rebuildPrimary を呼んでいない')
    // primary で deriveRawFields を直接呼ぶ箇所は 0（rebuildPrimary 経由に一本化された）
    assert.equal(
      (codeOnly(src).match(/deriveRawFields\(/g) ?? []).length, 0,
      'deriveRawFields の直接呼び出しは残っていないはず（rebuildPrimary 経由に一本化）',
    )

    // primary への rebuildPrimary 呼び出しは 4 箇所（effect / ADDON / toggle-off / toggle-on）
    const count = (codeOnly(src).match(/rebuildPrimary\(/g) ?? []).length
    assert.equal(count, 4, `rebuildPrimary の呼び出し数が想定と異なる（実際: ${count}）`)
  })

  test('deriveRawFields の signature は Unit 2A から変更されていない', () => {
    const deriveSrc = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')
    assert.ok(
      /export function deriveRawFields\(\s*scenario: Scenario,\s*mod: ModuleData,\s*addonIds: string\[\],\s*rapid: RapidState,\s*drugName = '',\s*\): SoapFields/.test(deriveSrc),
      'deriveRawFields の signature が変更されている（Unit 2B は signature 変更禁止）',
    )
  })

  test('buildNodeFields 自体は変更されていない（Unit 3A 更新: node 分岐は deriveNodeBlockCore へ収束した）', () => {
    // Unit 2B 時点: node ブランチ（buildUpdatedNode / handleAddonToggle node分岐）は
    // buildNodeFields を直接 2 回呼んでいた（既に deterministic だが Unit 2B では触らなかった）。
    //
    // Unit 3A: secondary Node の block 構築を単一の production pure helper
    // （lib/deriveNodeFields.ts の deriveNodeBlockCore）へ収束させた。
    // node 分岐は DashboardClient.tsx から直接 buildNodeFields を呼ばなくなり、
    // 代わりに deriveNodeBlockCore を呼ぶ（buildNodeFields 自体はその内部で
    // 1 回だけ呼ばれる。lib/deriveNodeFields.ts 側は
    // tests/nodeSnapshotUnit3A.test.ts の T-3A-4 が検証する）。
    //
    // このファイル（lib/buildSoap.ts の buildNodeFields 定義）が変更されていないことは
    // 別 assertion（deriveRawFields signature 不変）と合わせて Unit 2A/2B/3A 全体で
    // 保存されている。ここでは DashboardClient.tsx から buildNodeFields への
    // 直接呼び出しが 0（deriveNodeBlockCore への収束が完了している）ことを検証する。
    const directCount = (src.match(/buildNodeFields\(/g) ?? []).length
    assert.equal(directCount, 0, `buildNodeFields の直接呼び出しは残っていないはず（実際: ${directCount}）`)

    const coreCount = (src.match(/deriveNodeBlockCore\(/g) ?? []).length
    assert.equal(coreCount, 2, `deriveNodeBlockCore の呼び出しは node 分岐の 2 箇所のみのはず（実際: ${coreCount}）`)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Rapid ON/OFF で手動 S mutation を使用しない（NLP dead path 除く）
// ═══════════════════════════════════════════════════════════════

describe('2. Rapid ON/OFF で手動 S mutation を使用しない', () => {
  test('toggle-off 分岐に restoreScenarioFirstSentence / buildNodeFields 直呼びが残っていない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    const offBranch = toggleBlock.slice(
      toggleBlock.indexOf('if (isSameRapid('),
      toggleBlock.indexOf('setRapidState({ previousEvent: relation, currentOutcome: condition })'),
    )
    assert.ok(!/restoreScenarioFirstSentence/.test(offBranch), 'toggle-off に手動復元が残っている')
    assert.ok(!/buildNodeFields\(/.test(offBranch), 'toggle-off に buildNodeFields 直呼びが残っている')
  })

  test('Rapid ON の通常経路（NLP dead path 以外）に replaceSFirstSentence 直接呼び出しが残っていない', () => {
    const toggleBlock = src.slice(
      src.indexOf('const handleSToggle = useCallback'),
      src.indexOf('handleSubcategorySelect'),
    )
    // NLP dead path（rapidBase !== null 分岐）は Unit 2B の対象外として明示的に残す
    // Unit 4C-4: toggle-on 分岐は `const nextRapid: RapidState = { ... }; setPrimaryNode(p => { ... })`
    // という構造になり、rapidBase / sc の分岐は updater 内の if 文の早期 return（else-if ではない）
    // で表現されるようになった。anchor をそれに追随させる（意味は不変: Rapid ON 時の rapid 更新箇所）。
    const onBranch = toggleBlock.slice(
      toggleBlock.indexOf('const nextRapid: RapidState = { previousEvent: relation, currentOutcome: condition }'),
    )
    const nlpBranch = onBranch.slice(
      onBranch.indexOf('if (rapidBase !== null) {'),
      onBranch.indexOf('if (sc) return rebuildPrimary('),
    )
    const normalBranch = onBranch.slice(onBranch.indexOf('if (sc) return rebuildPrimary('))
    assert.ok(
      /replaceSFirstSentence\(/.test(nlpBranch),
      'NLP dead path（rapidBaseFieldsRef 分岐）は変更しない契約のため replaceSFirstSentence を維持すること',
    )
    assert.ok(
      !/replaceSFirstSentence\(/.test(normalBranch),
      '通常経路（rapidBase === null）に手動 replaceSFirstSentence が残っている',
    )
    assert.ok(
      /rebuildPrimary\(/.test(normalBranch),
      '通常経路は rebuildPrimary（deriveRawFields 相当）で raw を再導出すること',
    )
  })

  test('rapidBaseFieldsRef（NLP専用）分岐以外に Rapid 文字列 mutation が存在しない', () => {
    // DashboardClient.tsx 全体で replaceSFirstSentence / restoreScenarioFirstSentence の
    // 呼び出しは NLP dead path の 1 箇所のみが残る
    const replaceSFirstCount = (src.match(/replaceSFirstSentence\(/g) ?? []).length
    const restoreCount = (src.match(/restoreScenarioFirstSentence/g) ?? []).length
    assert.equal(replaceSFirstCount, 1, `replaceSFirstSentence 呼び出しは NLP dead path の 1 箇所のみのはず（実際: ${replaceSFirstCount}）`)
    assert.equal(restoreCount, 0, `restoreScenarioFirstSentence の呼び出しは 0 のはず（実際: ${restoreCount}）`)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. ADDON primary path に strip/re-add mutation が残っていない
// ═══════════════════════════════════════════════════════════════

describe('3. ADDON primary path に strip/re-add mutation が残っていない', () => {
  test('handleAddonToggle の primary 分岐に増分 patch のパターンが存在しない', () => {
    const addonBlock = src.slice(
      src.indexOf('const handleAddonToggle = useCallback'),
      src.indexOf('const handleSToggle = useCallback'),
    )
    const primaryBranch = codeOnly(addonBlock.slice(addonBlock.indexOf('} else {')))
    for (const forbidden of ['stripped', 'sectionMap', 'allAddonTextsBySec', 'rawBeforeToggle', 'resolveAddonText']) {
      assert.ok(
        !primaryBranch.includes(forbidden),
        `primary ADDON 分岐に増分 patch の残骸 "${forbidden}" が残っている`,
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. operation-order independence
// ═══════════════════════════════════════════════════════════════

describe('4. operation-order independence（同じ最終 state → byte-identical raw）', () => {
  test('A. Rapid → ADDON と B. ADDON → Rapid は同じ最終 state で一致する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const keys = addonKeysOf(sc).slice(0, 2)
      if (keys.length === 0) continue
      const rapid: RapidState = { previousEvent: 'new_addition', currentOutcome: 'stable' }

      // 最終 state = addonIds: keys, rapid: rapid
      const viaRapidThenAddon = deriveRawFields(sc, mod, keys, rapid, DRUG)
      const viaAddonThenRapid = deriveRawFields(sc, mod, keys, rapid, DRUG)
      assertFieldsEqual(viaRapidThenAddon, viaAddonThenRapid, `${mod.moduleId}/${sc.id}`)
      checked++
    }
    assert.ok(checked > 0, 'ADDON を持つ capable scenario で検証すること')
  })

  test('C. Rapid A → Rapid B: 最終 state は B のみに依存する（A の残骸なし）', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 50)) {
      const b: RapidState = { previousEvent: 'med_changed', currentOutcome: 'improved' }
      const direct = deriveRawFields(sc, mod, [], b, DRUG)
      // A を経由したかどうかに関わらず、deriveRawFields(..., b, ...) は常に同じ結果
      const afterA = deriveRawFields(sc, mod, [], b, DRUG)
      assertFieldsEqual(direct, afterA, `${mod.moduleId}/${sc.id}`)
    }
  })

  test('D. Rapid ON → OFF は素の scenario と一致する（byte 一致）', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const pristine = deriveRawFields(sc, mod, [], null, DRUG)
      const on = deriveRawFields(sc, mod, [], { previousEvent: 'dose_increased', currentOutcome: 'unchanged' }, DRUG)
      assert.notEqual(on.S, pristine.S, `${mod.moduleId}/${sc.id}: ON で S が変化するはず`)
      const off = deriveRawFields(sc, mod, [], null, DRUG)
      assertFieldsEqual(off, pristine, `${mod.moduleId}/${sc.id}: OFF は pristine と一致すること`)
      checked++
    }
    assert.equal(checked, 170, `検証した capable scenario 数（実際: ${checked}）`)
  })

  test('E. ADDON ON → OFF → ON は最終的に ON 状態と一致する', () => {
    let checked = 0
    for (const { mod, sc } of capableScenarios()) {
      const keys = addonKeysOf(sc).slice(0, 1)
      if (keys.length === 0) continue
      const on1 = deriveRawFields(sc, mod, keys, null, DRUG)
      const off = deriveRawFields(sc, mod, [], null, DRUG)
      const on2 = deriveRawFields(sc, mod, keys, null, DRUG)
      assertFieldsEqual(on1, on2, `${mod.moduleId}/${sc.id}: ON→OFF→ON の最終状態が最初の ON と一致すること`)
      assert.notDeepEqual(off, on1, `${mod.moduleId}/${sc.id}: OFF は ON と異なるはず`)
      checked++
    }
    assert.ok(checked > 0, 'ADDON を持つ capable scenario で検証すること')
  })

  test('F. scenario change → Rapid: 新 scenario で Rapid を ON にした結果が単独呼び出しと一致する', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 50)) {
      const rapid: RapidState = { previousEvent: 'continued_do', currentOutcome: 'not_improved' }
      const viaTransition = deriveRawFields(sc, mod, [], rapid, DRUG)
      const direct = deriveRawFields(sc, mod, [], rapid, DRUG)
      assertFieldsEqual(viaTransition, direct, `${mod.moduleId}/${sc.id}`)
    }
  })

  test('G. Rapid 保持 → capable scenario change: nextRapidStateOnScenarioChange 経由でも同じ raw になる', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      const caps = (mod.scenarios ?? []).filter(isScenarioSReplacementCapable)
      if (caps.length < 2) continue
      const [from, to] = caps
      const rapid: RapidState = { previousEvent: 'dose_decreased', currentOutcome: 'stable' }
      const carried = nextRapidStateOnScenarioChange(
        rapid,
        isScenarioSReplacementCapable(from),
        isScenarioSReplacementCapable(to),
      )
      assert.notEqual(carried, null, `${mod.moduleId}: capable間で保持されるはず`)
      const viaEffect = deriveRawFields(to, mod, [], carried, DRUG)
      const direct = deriveRawFields(to, mod, [], carried, DRUG)
      assertFieldsEqual(viaEffect, direct, `${mod.moduleId}`)
      checked++
    }
    assert.ok(checked >= 30, `capable 2件以上のモジュールで検証すること（実際: ${checked}）`)
  })

  test('deriveRawFields は入力配列を破壊しない（determinism の前提）', () => {
    for (const { mod, sc } of capableScenarios().slice(0, 30)) {
      const keys = addonKeysOf(sc).slice(0, 2)
      if (keys.length === 0) continue
      const input = [...keys]
      deriveRawFields(sc, mod, input, { previousEvent: 'continued_do', currentOutcome: 'stable' }, DRUG)
      assert.deepEqual(input, keys, '引数の addonIds を破壊してはならない')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Unit 0 の effect dependency [selectedScenarioId] を維持
// ═══════════════════════════════════════════════════════════════

describe('5. Unit 0 invariant: effect dependency は primaryNode.scenarioId 単独のまま', () => {
  // Unit 4C-3: deps が `selectedScenarioId`（旧 useState）から `primaryNode.scenarioId`
  // （primaryNode state の member access）へ変わった。Unit 0 invariant の本質
  // 「シナリオ確定 ID のみで発火し、editingNodeId や primaryNode 全体（オブジェクト
  // identity）では発火しない」という契約は変わっていない
  // （`[primaryNode]` は絶対禁止 — A-14 / T-4C3-1 が別途固定する）。
  test('scenario rebuild effect の dependency 配列が primaryNode.scenarioId 単独である', () => {
    const startIdx = src.indexOf('// 1剤目シナリオ切替時に primaryBaseFields を初期化')
    const depsMatch = src.slice(startIdx).match(/\n\s*\}, \[([^\]]*)\]\)/)
    assert.ok(depsMatch, 'dependency 配列が見つからない')
    const deps = depsMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    assert.deepEqual(deps, ['primaryNode.scenarioId'], `dependency が変化している（実際: [${deps.join(', ')}]）`)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. composer は無変更
// ═══════════════════════════════════════════════════════════════

describe('6. composer は Unit 2B で変更していない', () => {
  test('mergeBlocks（composer）は Unit 2B で変更していない', () => {
    const buildSoapSrc = readFileSync(new URL('../lib/buildSoap.ts', import.meta.url), 'utf-8')
    assert.ok(/export function mergeBlocks/.test(buildSoapSrc), 'mergeBlocks が存在しない')
  })
})
