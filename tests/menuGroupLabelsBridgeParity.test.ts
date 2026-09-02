/**
 * menuGroupLabelsBridgeParity.test.ts
 *
 * scripts/audit-menu-group-labels-bridge-chain.ts の検出ロジックが実際に機能することを
 * 検証する regression test。tests/adjustmentExpressionBridgeParity.test.ts と同じ設計方針を
 * 踏襲する（tautological coverage を避ける・synthetic fixture を使う・本番 registry を
 * 書き換えない）。
 *
 * ── なぜこのテストが必要か ──────────────────────────────────────────────
 *
 * P-R5 Unit 3 の目的は「bridge Header → canonical display.menuGroupLabels の
 * preservation invariant を machine-enforce する」こと。しかし guard 自体の検出感度が
 * 未検証であれば、検出できないまま silent false-negative を生み続ける可能性がある。
 *
 * 本ファイルは意図的に壊した bridge / canonical fixture を temp directory に生成し、
 * 期待した failure code が実際に emit されることを確認する。
 *
 * 本番の data/modules/index.ts / bridges/ / data/modules/ は一切変更しない。
 * fs.mkdtempSync(os.tmpdir()) で生成した独立ディレクトリのみを使用し、after() で必ず削除する。
 *
 * 実行:
 *   npx tsx --test tests/menuGroupLabelsBridgeParity.test.ts
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import {
  parseBridgeMenuGroupLabels,
  auditModule,
  runAudit,
} from '../scripts/audit-menu-group-labels-bridge-chain'
import { listModuleIds } from '../scripts/auditShared'

const REPO_ROOT = path.resolve(__dirname, '..')
const REAL_BRIDGES_DIR = path.join(REPO_ROOT, 'bridges')
const REAL_MODULES_DIR = path.join(REPO_ROOT, 'data', 'modules')

// bridge が menuGroupLabels を宣言しており、値が identity ではない実在モジュール
const PRESENT_NONIDENTITY_MODULE = 'derm_heparinoid_moisturizer_cream'
// bridge が menuGroupLabels を宣言しており、値が identity（増量:"増量" 等）である実在モジュール
// （Unit 2b が machine-enforce 対象化した「bridge 宣言が identity でも exact preservation は必須」
//  という契約を、実データでロックする）
const PRESENT_IDENTITY_MODULE = 'dm_glp1ra_semaglutide_oral'
// bridge が menuGroupLabels について沈黙しており、canonical が identity/default override を
// 持つ実在モジュール
const SILENT_IDENTITY_MODULE = 'dm_dpp4_oral'
// bridge・canonical とも menuGroupLabels について沈黙している実在モジュール
const BOTH_SILENT_MODULE = 'dm_dpp4_sglt2_combination_oral'

let tmpDir: string
let bridgesDir: string
let modulesDir: string
let presentNonIdentityBridgeText: string
let presentNonIdentityCanonicalJson: any
let presentIdentityBridgeText: string
let presentIdentityCanonicalJson: any
let silentIdentityBridgeText: string
let silentIdentityCanonicalJson: any
let bothSilentBridgeText: string
let bothSilentCanonicalJson: any

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-group-labels-parity-'))
  bridgesDir = path.join(tmpDir, 'bridges')
  modulesDir = path.join(tmpDir, 'data', 'modules')
  fs.mkdirSync(bridgesDir, { recursive: true })
  fs.mkdirSync(modulesDir, { recursive: true })

  presentNonIdentityBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${PRESENT_NONIDENTITY_MODULE}.md`), 'utf-8')
  presentNonIdentityCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${PRESENT_NONIDENTITY_MODULE}.json`), 'utf-8'))
  presentIdentityBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${PRESENT_IDENTITY_MODULE}.md`), 'utf-8')
  presentIdentityCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${PRESENT_IDENTITY_MODULE}.json`), 'utf-8'))
  silentIdentityBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${SILENT_IDENTITY_MODULE}.md`), 'utf-8')
  silentIdentityCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${SILENT_IDENTITY_MODULE}.json`), 'utf-8'))
  bothSilentBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${BOTH_SILENT_MODULE}.md`), 'utf-8')
  bothSilentCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${BOTH_SILENT_MODULE}.json`), 'utf-8'))

  // sanity check: fixture の前提が崩れていないか
  assert.deepEqual(
    presentNonIdentityCanonicalJson?.display?.menuGroupLabels,
    { 増量: '使用回数増', 減量: '使用回数減' },
    `${PRESENT_NONIDENTITY_MODULE} は non-identity な menuGroupLabels を持つ前提`,
  )
  assert.deepEqual(
    presentIdentityCanonicalJson?.display?.menuGroupLabels,
    { 増量: '増量', 減量: '減量' },
    `${PRESENT_IDENTITY_MODULE} は identity な menuGroupLabels を持つ前提`,
  )
  assert.deepEqual(
    silentIdentityCanonicalJson?.display?.menuGroupLabels,
    { 増量: '増量', 減量: '減量' },
    `${SILENT_IDENTITY_MODULE} は canonical のみに identity override を持つ前提`,
  )
  assert.equal(
    parseBridgeMenuGroupLabels(silentIdentityBridgeText).kind, 'ABSENT',
    `${SILENT_IDENTITY_MODULE} の bridge は menuGroupLabels について沈黙している前提`,
  )
  assert.equal(bothSilentCanonicalJson?.display?.menuGroupLabels, undefined, `${BOTH_SILENT_MODULE} は canonical も沈黙している前提`)
  assert.equal(
    parseBridgeMenuGroupLabels(bothSilentBridgeText).kind, 'ABSENT',
    `${BOTH_SILENT_MODULE} の bridge は menuGroupLabels について沈黙している前提`,
  )
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeFixture(id: string, opts: { bridge?: string | null; bridgeExt?: string; json?: unknown | null }) {
  const { bridge, bridgeExt = '.md', json } = opts
  if (bridge !== null && bridge !== undefined) {
    fs.writeFileSync(path.join(bridgesDir, `${id}${bridgeExt}`), bridge, 'utf-8')
  }
  if (json !== null && json !== undefined) {
    if (typeof json === 'string') {
      fs.writeFileSync(path.join(modulesDir, `${id}.json`), json, 'utf-8')
    } else {
      fs.writeFileSync(path.join(modulesDir, `${id}.json`), JSON.stringify(json, null, 2), 'utf-8')
    }
  }
}

function run(id: string) {
  return auditModule(id, path.join(bridgesDir, `${id}.md`), path.join(modulesDir, `${id}.json`))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

describe('audit-menu-group-labels-bridge-chain — T2〜T7: bridge PRESENT', () => {
  test('T2: bridge-present, canonical が exact match → GREEN', () => {
    writeFixture('t2', { bridge: presentNonIdentityBridgeText, json: clone(presentNonIdentityCanonicalJson) })
    assert.deepEqual(run('t2'), [])
  })

  test('T3: bridge-present identity 宣言 + canonical identity exact → GREEN（Unit 2b 契約のロック）', () => {
    writeFixture('t3', { bridge: presentIdentityBridgeText, json: clone(presentIdentityCanonicalJson) })
    assert.deepEqual(run('t3'), [])
  })

  test('T4: bridge-present + canonical menuGroupLabels 欠落 → RED CANONICAL_MGL_MISSING', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    delete json.display.menuGroupLabels
    writeFixture('t4', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t4')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'CANONICAL_MGL_MISSING')
  })

  test('T5: bridge-present、canonical が1 key 欠落 → RED MGL_KEYSET_MISMATCH', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    delete json.display.menuGroupLabels['減量']
    writeFixture('t5', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t5')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'MGL_KEYSET_MISMATCH')
  })

  test('T6: bridge-present、canonical に余剰 key → RED MGL_KEYSET_MISMATCH', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    json.display.menuGroupLabels['終了'] = '終了'
    writeFixture('t6', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t6')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'MGL_KEYSET_MISMATCH')
  })

  test('T7: bridge-present、key set 同一だが値が変化 → RED MGL_VALUE_MISMATCH', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    json.display.menuGroupLabels['増量'] = '使用量増'
    writeFixture('t7', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t7')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'MGL_VALUE_MISMATCH')
  })
})

describe('audit-menu-group-labels-bridge-chain — T8〜T11: bridge ABSENT', () => {
  test('T8: bridge-silent + canonical 省略 → GREEN', () => {
    writeFixture('t8', { bridge: bothSilentBridgeText, json: clone(bothSilentCanonicalJson) })
    assert.deepEqual(run('t8'), [])
  })

  test('T9: bridge-silent + canonical が full identity override → GREEN', () => {
    writeFixture('t9', { bridge: silentIdentityBridgeText, json: clone(silentIdentityCanonicalJson) })
    assert.deepEqual(run('t9'), [])
  })

  test('T10: bridge-silent + canonical が partial identity override → GREEN', () => {
    const json = clone(bothSilentCanonicalJson)
    json.display.menuGroupLabels = { 増量: '増量' } // 減量 キーを持たない部分的 identity mapping
    writeFixture('t10', { bridge: bothSilentBridgeText, json })
    assert.deepEqual(run('t10'), [])
  })

  test('T11: bridge-silent + canonical が non-identity semantic override → RED UNSOURCED_NON_IDENTITY_MGL', () => {
    const json = clone(bothSilentCanonicalJson)
    json.display.menuGroupLabels = { 増量: '使用回数増' }
    writeFixture('t11', { bridge: bothSilentBridgeText, json })
    const issues = run('t11')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'UNSOURCED_NON_IDENTITY_MGL')
  })
})

describe('audit-menu-group-labels-bridge-chain — T12〜T17: 構造・parse failure', () => {
  test('T12: bridge parse error（menuGroupLabels 内の壊れた子行）→ RED BRIDGE_PARSE_ERROR', () => {
    // 値をクオートなしにして壊す（正規の `key: "value"` パターンにマッチしなくする）
    const broken = presentNonIdentityBridgeText.replace(
      /^( {4}増量: )".*"$/m, '$1使用回数増',
    )
    writeFixture('t12', { bridge: broken, json: clone(presentNonIdentityCanonicalJson) })
    const issues = run('t12')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_PARSE_ERROR')
  })

  test('T13: real bridge が存在しない → RED BRIDGE_NOT_FOUND', () => {
    writeFixture('t13', { bridge: null, json: clone(presentNonIdentityCanonicalJson) })
    const issues = run('t13')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_NOT_FOUND')
  })

  test('T14: {id}.md.bak のみ存在し {id}.md が欠落 → RED BRIDGE_NOT_FOUND（.bak は bridge として認識されない）', () => {
    writeFixture('t14', { bridge: presentNonIdentityBridgeText, bridgeExt: '.md.bak', json: clone(presentNonIdentityCanonicalJson) })
    const issues = run('t14')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_NOT_FOUND')
  })

  test('T15: canonical menuGroupLabels が malformed shape（配列）→ RED CANONICAL_MGL_SHAPE', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    json.display.menuGroupLabels = ['増量', '減量']
    writeFixture('t15', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t15')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'CANONICAL_MGL_SHAPE')
  })

  test('T16: canonical JSON 自体が parse できない（壊れた JSON テキスト）→ RED JSON_PARSE_ERROR', () => {
    writeFixture('t16', { bridge: presentNonIdentityBridgeText, json: '{ not valid json' })
    const issues = run('t16')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'JSON_PARSE_ERROR')
  })

  test('T17: 末尾スペースのみの差異は等価とみなされない → RED MGL_VALUE_MISMATCH', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    json.display.menuGroupLabels['増量'] = json.display.menuGroupLabels['増量'] + ' '
    writeFixture('t17', { bridge: presentNonIdentityBridgeText, json })
    const issues = run('t17')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'MGL_VALUE_MISMATCH')
  })
})

describe('audit-menu-group-labels-bridge-chain — T18: responsibility separation', () => {
  test('T18: menuGroupLabels と adjustmentExpression が意図的に異なっていても、この監査は PASS する', () => {
    const json = clone(presentNonIdentityCanonicalJson)
    // adjustmentExpression をわざと menuGroupLabels と異なる値へ改変する。
    // menuGroupLabels 監査は adjustmentExpression の内容に一切関知しないはずである。
    json.display.adjustmentExpression = {
      increasePast: '全く異なる文言が増えた',
      decreasePast: '全く異なる文言が減った',
    }
    writeFixture('t18', { bridge: presentNonIdentityBridgeText, json })
    assert.deepEqual(run('t18'), [])
  })
})

describe('parseBridgeMenuGroupLabels — 単体', () => {
  test('menuGroupLabels を宣言している実在 bridge を PRESENT として parse する', () => {
    assert.equal(parseBridgeMenuGroupLabels(presentNonIdentityBridgeText).kind, 'PRESENT')
  })

  test('menuGroupLabels について沈黙している実在 bridge を ABSENT として parse する', () => {
    assert.equal(parseBridgeMenuGroupLabels(bothSilentBridgeText).kind, 'ABSENT')
  })
})

describe('T1: live corpus — Invariant divergence', () => {
  test('現行 registered corpus に menuGroupLabels preservation の divergence が存在しない', () => {
    // module 件数・分類件数はここでは一切 assert しない（corpus 成長に対して非依存であること自体を
    // 担保する）。検証するのは「現在の corpus に対して runAudit() が 0 issue を返す」という関係のみ。
    const issues = runAudit(listModuleIds())
    assert.deepEqual(issues, [], `menuGroupLabels preservation divergence が検出された: ${JSON.stringify(issues, null, 2)}`)
  })

  test('registry は非空であり、全 registered module が監査対象に含まれる', () => {
    const ids = listModuleIds()
    assert.ok(ids.length > 0, 'registry が空（監査が空振りしている）')
  })
})
