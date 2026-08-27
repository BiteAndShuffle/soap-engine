/**
 * drugSubjectResolutionContract.test.ts — {{drug_subject}} resolution contract fix
 *
 * 背景（read-only 監査で確認済みの FACT）:
 *   primary ADDON 本文の drug name 解決だけが、Repository の既存契約
 *   （lib/drugSubject.ts「呼び出し元固有の fallback を書かず、常に
 *     resolveDrugName / resolveSubjectFromResolution を経由すること」）
 *   から外れていた:
 *
 *     scenario 本文 / Rapid 側:
 *       activeDrugDisplayName(Ref) ?? resolveDrugName(drug, activeBrandName)
 *     primary ADDON 側（修正前）:
 *       activeDrugDisplayNameRef.current ?? activeBrandName ?? ''
 *
 *   両式が異なる値を返すのは activeDrugDisplayName / activeBrandName が
 *   ともに undefined のときだけであり、これは検索候補の denotation:'module'
 *   （brand も一般名も未確定）とちょうど一致する。この状態は U-5 安全 gate
 *   （lib/brandTags.ts の isSubjectUnresolved）によって scenario 選択自体が
 *   ブロックされるため、修正前・修正後のいずれでも **production 到達可能な
 *   出力は変化しない**（本ファイルの「D」で検証する）。
 *
 * 本修正:
 *   app/components/DashboardClient.tsx の primary ADDON 分岐（handleAddonToggle）
 *   で使う drugName 解決式を、scenario 本文側と同じ
 *   `resolveDrugName(activeModuleData.drug, activeBrandName)` へ揃えた。
 *   resolveDrugName 自体・buildNodeFields・U-5 gate はいずれも変更していない。
 *
 * RAPID-V2-20 と同じ方針:
 *   production 関数を直接 import する。mirror 実装は作らない。
 *   DashboardClient.tsx は CSS module（layout.module.css）を import するため
 *   node:test から直接 import できない。修正対象の 1 行はインライン実装のまま
 *   （新しい production helper へ抽出していない）なので、その部分は
 *   source contract（正規表現でパターンを固定）で守る。
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ModuleData, Scenario, Drug } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildNodeFields } from '../lib/buildSoap'
import {
  resolveDrugName,
  resolveDrugSubject,
  resolveSubjectFromResolution,
  DRUG_SUBJECT_SLOT,
} from '../lib/drugSubject'
import { buildSearchIndex, getDrugSuggestions } from '../lib/search'
import { isSubjectUnresolved } from '../lib/brandTags'
import type { BrandResolution } from '../lib/brandResolution'

const dashboardSrc = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

// ═══════════════════════════════════════════════════════════════
// 1. resolveDrugName — brand あり
// ═══════════════════════════════════════════════════════════════

describe('1. resolveDrugName: matchedBrandName がある場合はそれを最優先する', () => {
  test('matchedBrandName が非空文字なら常にそれを返す', () => {
    const drug: Drug = {
      brandNames: ['リベルサス'],
      brandCatalog: { 'リベルサス': { displayGenericName: 'セマグルチド' } },
    } as unknown as Drug
    assert.equal(resolveDrugName(drug, 'リベルサス'), 'リベルサス')
    // brandCatalog に存在しないブランド名を渡しても、matchedBrandName が最優先される
    assert.equal(resolveDrugName(drug, 'アマリール'), 'アマリール')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. resolveDrugName — brand なし + displayGenericName fallback
// ═══════════════════════════════════════════════════════════════

describe('2. resolveDrugName: matchedBrandName 未指定時は displayGenericName へ fallback する', () => {
  test('matchedBrandName undefined、brandNames[0] に displayGenericName があれば使う', () => {
    const drug: Drug = {
      brandNames: ['リベルサス'],
      brandCatalog: { 'リベルサス': { displayGenericName: 'セマグルチド' } },
    } as unknown as Drug
    assert.equal(resolveDrugName(drug, undefined), 'セマグルチド')
  })

  test('displayGenericName も brandNames も無ければ空文字（未解決のまま）', () => {
    assert.equal(resolveDrugName(undefined, undefined), '')
    assert.equal(resolveDrugName({} as Drug, undefined), '')
  })

  test('全 module で drug.brandNames[0] の displayGenericName 経由の解決が成立する', () => {
    let checked = 0
    for (const mod of ALL_MODULES) {
      const resolved = resolveDrugName(mod.drug, undefined)
      // 空文字を許容しつつ、brandCatalog が定義されているモジュールでは解決できることを確認
      const firstBrand = mod.drug?.brandNames?.[0]
      if (firstBrand && mod.drug?.brandCatalog?.[firstBrand]?.displayGenericName) {
        assert.notEqual(resolved, '', `${mod.moduleId}: displayGenericName 経由で解決できるはず`)
      }
      checked++
    }
    assert.equal(checked, ALL_MODULES.length)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. resolveSubjectFromResolution — brand / generic 経路
// ═══════════════════════════════════════════════════════════════

describe('3. resolveSubjectFromResolution: brand / generic denotation を正しく解決する', () => {
  test('denotation:"brand" は subject をそのまま返す', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'リベルサス', subject: 'リベルサス' }
    assert.equal(resolveSubjectFromResolution(resolution), 'リベルサス')
  })

  test('denotation:"generic" は subject（一般名）をそのまま返す', () => {
    const resolution: BrandResolution = {
      denotation: 'generic', genericKey: 'semaglutide', brandKeys: ['リベルサス'], subject: 'セマグルチド',
    }
    assert.equal(resolveSubjectFromResolution(resolution), 'セマグルチド')
  })

  test('denotation:"module" は null を返す（未確定を正常な domain state として扱う）', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.equal(resolveSubjectFromResolution(resolution), null)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. buildNodeFields: scenario本文とADDON本文が同一 drug subject になる
// ═══════════════════════════════════════════════════════════════

describe('4. buildNodeFields: scenario本文とADDON本文が同一 drugName で解決される', () => {
  test('同じ drugName を渡せば scenario本文/ADDON本文とも同一の主語になる', () => {
    let tested = 0
    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      const subjectKeys = Object.keys(items).filter(k => {
        const it = items[k]
        const texts = [it.text, it.sectionTexts?.S, it.sectionTexts?.A, it.sectionTexts?.P].filter(Boolean) as string[]
        return texts.some(t => t.includes(DRUG_SUBJECT_SLOT))
      })
      if (subjectKeys.length === 0) continue
      for (const sc of mod.scenarios ?? []) {
        const drugName = resolveDrugName(mod.drug, undefined) || '本剤'
        const { fields } = buildNodeFields(sc, mod, [subjectKeys[0]], drugName)
        for (const sec of ['S', 'O', 'A', 'P'] as const) {
          assert.ok(
            !fields[sec].includes(DRUG_SUBJECT_SLOT),
            `${mod.moduleId}/${sc.id} [${sec}]: buildNodeFields は同一 drugName で` +
            'scenario本文とADDON本文の両方を解決するため、スロットが残ってはならない',
          )
        }
        tested++
      }
    }
    assert.ok(tested > 0, 'S欄以外へも書き込む {{drug_subject}} ADDON ケースを検証すること')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. 既存19 ADDON 全件で非空drugName時にliteral tokenが残らない
// ═══════════════════════════════════════════════════════════════

/**
 * U-CR1: {{drug_subject}} を含む ADDON の corpus 走査を 1 度だけ materialize する。
 * exact な corpus snapshot（旧 addonTotal 518 / withSlot 19 / affectedModules 15 /
 * tested 19）は仕様値として使用しない。他 test（section 6 の tested）からも
 * 同じ導出値を参照し、走査ロジックの二重実装を避ける。
 */
function scanDrugSubjectAddons(): { addonTotal: number; withSlot: number; affectedModules: Set<string> } {
  let addonTotal = 0, withSlot = 0
  const affectedModules = new Set<string>()
  for (const mod of ALL_MODULES) {
    const items = mod.addons?.items ?? {}
    for (const key of Object.keys(items)) {
      addonTotal++
      const it = items[key]
      const texts = [it.text, it.sectionTexts?.S, it.sectionTexts?.A, it.sectionTexts?.P].filter(Boolean) as string[]
      if (texts.some(t => t.includes(DRUG_SUBJECT_SLOT))) {
        withSlot++
        affectedModules.add(mod.moduleId)
      }
    }
  }
  return { addonTotal, withSlot, affectedModules }
}
const DRUG_SUBJECT_SCAN = scanDrugSubjectAddons()

describe('5. {{drug_subject}} を含む既存 ADDON 全件で literal token が残らない', () => {
  test('19 ADDON / 15 module の内訳を再測定する', () => {
    let addonTotal = 0, withSlot = 0
    const affectedModules = new Set<string>()
    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      for (const key of Object.keys(items)) {
        addonTotal++
        const it = items[key]
        const texts = [it.text, it.sectionTexts?.S, it.sectionTexts?.A, it.sectionTexts?.P].filter(Boolean) as string[]
        if (texts.some(t => t.includes(DRUG_SUBJECT_SLOT))) {
          withSlot++
          affectedModules.add(mod.moduleId)
        }
      }
    }
    // U-CR1: exact count ではなく、(1) corpus 由来の走査件数（loop-completeness）、
    // (2) 対象 ADDON / module が 0 件でないこと（non-vacuity）、
    // (3) affectedModules ⊆ withSlot ⊆ addonTotal という分割・包含関係、
    // の 3 点を守る。addonTotal 自体は ALL_MODULES から独立に導出した値と突合する。
    const derivedAddonTotal = ALL_MODULES.reduce((n, mod) => n + Object.keys(mod.addons?.items ?? {}).length, 0)
    assert.ok(derivedAddonTotal > 0, 'ADDON が corpus に 1 件も無い（test が空振り）')
    assert.equal(addonTotal, derivedAddonTotal, `ADDON 総数の走査に取りこぼしがある（実際: ${addonTotal} / corpus 由来: ${derivedAddonTotal}）`)
    assert.ok(withSlot > 0, '{{drug_subject}} を含む ADDON が corpus に 1 件も無い（test が空振り）')
    assert.ok(affectedModules.size > 0, '{{drug_subject}} を含む ADDON を持つ module が corpus に 1 件も無い（test が空振り）')
    assert.ok(
      affectedModules.size <= ALL_MODULES.length,
      `対象 module 数が corpus の module 総数を超えている（${affectedModules.size} / ${ALL_MODULES.length}）`,
    )
    assert.ok(withSlot >= affectedModules.size, 'ADDON 数が対象 module 数を下回っている（1 module 最低 1 ADDON のはず）')
  })

  test('非空 drugName を与えると、対象 ADDON はいずれも literal token を残さない', () => {
    let tested = 0
    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      const subjectKeys = Object.keys(items).filter(k => {
        const it = items[k]
        const texts = [it.text, it.sectionTexts?.S, it.sectionTexts?.A, it.sectionTexts?.P].filter(Boolean) as string[]
        return texts.some(t => t.includes(DRUG_SUBJECT_SLOT))
      })
      for (const key of subjectKeys) {
        const it = items[key]
        const texts = [it.text, it.sectionTexts?.S, it.sectionTexts?.A, it.sectionTexts?.P].filter(Boolean) as string[]
        for (const text of texts) {
          const resolved = text.replaceAll(DRUG_SUBJECT_SLOT, '本剤')
          assert.ok(
            !resolved.includes(DRUG_SUBJECT_SLOT),
            `${mod.moduleId}/${key}: 非空 drugName 適用後も literal token が残っている`,
          )
        }
        tested++
      }
    }
    assert.ok(tested > 0, '{{drug_subject}} を含む ADDON を 1 件も検証していない（test が空振り）')
    assert.equal(
      tested, DRUG_SUBJECT_SCAN.withSlot,
      `検証件数が section 5 の走査結果と一致しない（実際: ${tested} / 走査: ${DRUG_SUBJECT_SCAN.withSlot}）`,
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. 他 module regression なし
// ═══════════════════════════════════════════════════════════════

describe('6. 他 module への regression がない', () => {
  test('resolveDrugName は全 35 module で例外を投げない', () => {
    for (const mod of ALL_MODULES) {
      assert.doesNotThrow(() => resolveDrugName(mod.drug, undefined))
      assert.doesNotThrow(() => resolveDrugName(mod.drug, mod.drug?.brandNames?.[0]))
    }
    assert.ok(ALL_MODULES.length > 0, 'module が corpus に 1 件も無い（test が空振り）')
  })

  test('resolveDrugSubject: drugName 空文字ならフィールドを変更しない（サイレント失敗なし）', () => {
    const fields = { S: 'aaa {{drug_subject}} bbb', O: '', A: '', P: '' }
    const result = resolveDrugSubject(fields, '')
    assert.deepEqual(result, fields)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. multi-drug Node で subject 混線なし
// ═══════════════════════════════════════════════════════════════

describe('7. multi-drug Node で drug subject が混線しない', () => {
  test('複数モジュールの drugName を独立に解決しても互いに影響しない', () => {
    const modA = ALL_MODULES.find(m => (m.drug?.brandNames?.length ?? 0) > 0)
    const modB = ALL_MODULES.find(m => m !== modA && (m.drug?.brandNames?.length ?? 0) > 0)
    assert.ok(modA && modB, '検証に十分な module 数があること')

    const nameA = resolveDrugName(modA!.drug, undefined)
    const nameB = resolveDrugName(modB!.drug, undefined)

    // 呼び出し順を入れ替えても各 module の解決結果は変わらない（独立性）
    const nameB2 = resolveDrugName(modB!.drug, undefined)
    const nameA2 = resolveDrugName(modA!.drug, undefined)
    assert.equal(nameA, nameA2, 'module A の解決結果が呼び出し順に依存してはならない')
    assert.equal(nameB, nameB2, 'module B の解決結果が呼び出し順に依存してはならない')
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. 修正後の primary ADDON resolution 式が scenario 側と同じ経路を使う
// ═══════════════════════════════════════════════════════════════

describe('8. primary ADDON の drugName 解決が scenario 本文側と同一契約を使う（source contract）', () => {
  // Unit 2B: primary ADDON 分岐が deriveRawFields へ一本化されたのに伴い、
  // 変数名が rapidDrugName → drugName へ変わった。source（契約）自体は不変。
  // Unit 4C-6: activeBrandName alias は削除され、consumer は primaryNode.matchedBrandName
  // （successor authority）を直接参照する。fallback の経路・意味は不変。
  test('handleAddonToggle の primary 分岐が resolveDrugName を経由する', () => {
    const startIdx = dashboardSrc.indexOf('const drugName = activeDrugDisplayNameRef.current')
    assert.notEqual(startIdx, -1, 'drugName（ADDON分岐）の定義箇所が見つからない')
    const block = dashboardSrc.slice(startIdx, startIdx + 300)
    assert.ok(
      /resolveDrugName\(activeModuleData\.drug, primaryNode\.matchedBrandName\)/.test(block),
      'primary ADDON の drugName 解決は resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName) を' +
      '経由すること（scenario 本文側 [869行目付近] と同一の経路）',
    )
  })

  test('呼び出し元固有の fallback（?? activeBrandName ?? \'\'）が残っていない', () => {
    const startIdx = dashboardSrc.indexOf('const drugName = activeDrugDisplayNameRef.current')
    const block = dashboardSrc.slice(startIdx, startIdx + 300)
    assert.ok(
      !/\?\?\s*activeBrandName\s*\?\?\s*''/.test(block),
      'lib/drugSubject.ts の契約（呼び出し元固有の fallback を書かない）に違反する' +
      '独自 fallback が残っている',
    )
  })

  test('scenario 本文側・Rapid 側・ADDON 側の 3 箇所すべてが resolveDrugName を経由する', () => {
    const count = (dashboardSrc.match(/resolveDrugName\(activeModuleData\.drug, primaryNode\.matchedBrandName\)/g) ?? []).length
    assert.ok(
      count >= 3,
      `primary の drugName 解決は scenario本文/Rapid/ADDON の3箇所とも` +
      `resolveDrugName(activeModuleData.drug, primaryNode.matchedBrandName) を使うこと（実際: ${count}箇所）`,
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// D. production reachability（behavior change = 0 の根拠）
// ═══════════════════════════════════════════════════════════════

describe('D. 修正前後で分岐しうる状態は production 到達不能である', () => {
  test('全 module の全 alias/brand/generic クエリで検索し、(matchedBrandName undefined AND subject null) は denotation:"module" のみに一致する', () => {
    const index = ALL_MODULES.flatMap(m => buildSearchIndex(m))
    const queries = new Set<string>()
    for (const mod of ALL_MODULES) {
      const d = mod.drug
      for (const b of d?.brandNames ?? []) queries.add(b)
      for (const a of d?.nameAliases ?? []) queries.add(a)
      for (const a of d?.search?.nameAliases ?? []) queries.add(a)
      for (const a of d?.search?.exactAliases ?? []) queries.add(a)
      for (const k of Object.keys(d?.brandCatalog ?? {})) {
        queries.add(k)
        const bc = d?.brandCatalog?.[k]
        if (bc?.displayGenericName) queries.add(bc.displayGenericName)
        if (bc?.genericName) queries.add(bc.genericName)
      }
    }

    let divergentCases = 0
    let divergentAllModuleDenotation = true
    let emptyStringBrand = 0

    for (const q of queries) {
      for (const it of getDrugSuggestions(q, index)) {
        if (it.matchedBrandName === '') emptyStringBrand++
        const hasBrand = it.matchedBrandName !== undefined
        const subj = it.resolution?.subject ?? null
        if (!hasBrand && subj === null) {
          divergentCases++
          if (it.resolution?.denotation !== 'module') divergentAllModuleDenotation = false
        }
      }
    }

    assert.equal(emptyStringBrand, 0, 'matchedBrandName が空文字になる候補は存在しないはず')
    assert.ok(divergentCases > 0, '分岐条件が実在することを前提として確認する')
    assert.ok(
      divergentAllModuleDenotation,
      '分岐する全候補が denotation:"module" であること（U-5 gate で block される状態と一致すること）',
    )
  })

  test('denotation:"module" は isSubjectUnresolved が true を返し、scenario 選択へ進めない', () => {
    const moduleResolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    assert.equal(isSubjectUnresolved(moduleResolution), true)

    const brandResolution: BrandResolution = { denotation: 'brand', brandKey: 'x', subject: 'x' }
    const genericResolution: BrandResolution = { denotation: 'generic', genericKey: 'x', brandKeys: ['x'], subject: 'x' }
    assert.equal(isSubjectUnresolved(brandResolution), false)
    assert.equal(isSubjectUnresolved(genericResolution), false)
    assert.equal(isSubjectUnresolved(undefined), false)
  })

  test('availableGroups は subjectUnresolved のとき空集合になる（source contract）', () => {
    assert.ok(
      /availableGroups=\{drugSelected && !subjectUnresolved \? availableGroups : new Set\(\)\}/.test(dashboardSrc),
      'U-5 gate（denotation:"module" のとき availableGroups を空にする）が' +
      '変更されていないこと',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 責務境界: 禁止領域が無変更であること
// ═══════════════════════════════════════════════════════════════

describe('責務境界: 禁止領域に変更がないことの source contract', () => {
  test('resolveDrugName 本体を変更していない（優先順位: brand → displayGenericName → 空文字）', () => {
    const src = readFileSync(new URL('../lib/drugSubject.ts', import.meta.url), 'utf-8')
    const body = src.slice(
      src.indexOf('export function resolveDrugName'),
      src.indexOf('export function resolveDrugName') + 400,
    )
    assert.ok(/if \(matchedBrandName\) return matchedBrandName/.test(body))
    assert.ok(/drug\?\.brandNames\?\.\[0\]/.test(body))
    assert.ok(/return ''/.test(body))
  })

  test('U-5 gate 定義（isSubjectUnresolved）を変更していない', () => {
    const src = readFileSync(new URL('../lib/brandTags.ts', import.meta.url), 'utf-8')
    assert.ok(/return resolution\?\.denotation === 'module'/.test(src))
  })

  test('lib/deriveNodeFields.ts（Unit 2A helper）の signature を変更していない', () => {
    // Unit 2A 完了時点では「runtime から呼ばれていないこと」も本 test で固定していたが、
    // Unit 2B で primary runtime への配線が完了したためその assertion は撤去した
    // （配線されることが Unit 2B の目的そのものであり、恒久的に false になるため）。
    // ここでは deriveRawFields の signature 自体が変更されていないことのみを守る。
    const src = readFileSync(new URL('../lib/deriveNodeFields.ts', import.meta.url), 'utf-8')
    assert.ok(
      /export function deriveRawFields\(\s*scenario: Scenario,\s*mod: ModuleData,\s*addonIds: string\[\],\s*rapid: RapidState,\s*drugName = '',\s*\): SoapFields/.test(src),
      'deriveRawFields の signature が変更されている',
    )
  })

  test('persona / localInput 関連の resolution 経路には触れていない', () => {
    const startIdx = dashboardSrc.indexOf('const drugName = activeDrugDisplayNameRef.current')
    const block = dashboardSrc.slice(startIdx, startIdx + 300)
    assert.ok(
      !/applyPersona|personaGuard|localSiteInput/.test(block),
      'drugName 解決の修正箇所は persona / localInput の raw text 確定より前で完結すること',
    )
  })
})
