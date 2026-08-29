/**
 * adjustmentExpressionBridgeParity.test.ts
 *
 * scripts/audit-adjustment-expression-bridge-chain.ts の検出ロジックが実際に機能することを
 * 検証する regression test。
 *
 * ── なぜこのテストが必要か ──────────────────────────────────────────────
 *
 * P-R3D の目的は「bridge Header → canonical display.adjustmentExpression の preservation
 * invariant を machine-enforce する」こと。しかし guard 自体の検出感度が未検証であれば、
 * 検出できないまま silent false-negative を生み続ける可能性がある
 * （tests/moduleRegistry.test.ts「検出ロジックの健全性」と同じ「壊したデータでテストする」方針）。
 *
 * このテストは意図的に壊した bridge / canonical fixture を temp directory に生成し、
 * 期待した failure code が実際に emit されることを確認する。
 *
 * 本番の data/modules/index.ts / bridges/ / data/modules/ は一切変更しない。
 * fs.mkdtempSync(os.tmpdir()) で生成した独立ディレクトリのみを使用し、after() で必ず削除する。
 *
 * 実行:
 *   npx tsx --test tests/adjustmentExpressionBridgeParity.test.ts
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import {
  parseBridgeAdjustmentExpression,
  auditModule,
  runAudit,
} from '../scripts/audit-adjustment-expression-bridge-chain'
import { listModuleIds } from '../scripts/auditShared'

const REPO_ROOT = path.resolve(__dirname, '..')
const REAL_BRIDGES_DIR = path.join(REPO_ROOT, 'bridges')
const REAL_MODULES_DIR = path.join(REPO_ROOT, 'data', 'modules')

// AE を宣言している実在 bridge / canonical のペア（fixture のベースとして使う）
const AE_SOURCE_MODULE = 'dm_glp1ra_semaglutide_oral'
// AE について沈黙している実在 bridge / canonical のペア
const SILENT_SOURCE_MODULE = 'dm_dpp4_oral'

let tmpDir: string
let bridgesDir: string
let modulesDir: string
let aeBridgeText: string
let aeCanonicalJson: any
let silentBridgeText: string
let silentCanonicalJson: any

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adjustment-expression-parity-'))
  bridgesDir = path.join(tmpDir, 'bridges')
  modulesDir = path.join(tmpDir, 'data', 'modules')
  fs.mkdirSync(bridgesDir, { recursive: true })
  fs.mkdirSync(modulesDir, { recursive: true })

  aeBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${AE_SOURCE_MODULE}.md`), 'utf-8')
  aeCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${AE_SOURCE_MODULE}.json`), 'utf-8'))
  silentBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${SILENT_SOURCE_MODULE}.md`), 'utf-8')
  silentCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${SILENT_SOURCE_MODULE}.json`), 'utf-8'))

  // sanity check: fixture の前提が崩れていないか（AE_SOURCE は宣言あり、SILENT_SOURCE は沈黙）
  assert.ok(aeCanonicalJson?.display?.adjustmentExpression, `${AE_SOURCE_MODULE} は adjustmentExpression を持つ前提`)
  assert.equal(silentCanonicalJson?.display?.adjustmentExpression, undefined, `${SILENT_SOURCE_MODULE} は adjustmentExpression を持たない前提`)
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
    fs.writeFileSync(path.join(modulesDir, `${id}.json`), JSON.stringify(json, null, 2), 'utf-8')
  }
}

function run(id: string) {
  return auditModule(id, path.join(bridgesDir, `${id}.md`), path.join(modulesDir, `${id}.json`))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

describe('audit-adjustment-expression-bridge-chain — mutation matrix（P-R3D Design Review §J）', () => {
  test('M1: bridge declares AE / canonical AE removed → RED CANONICAL_AE_MISSING', () => {
    const json = clone(aeCanonicalJson)
    delete json.display.adjustmentExpression
    writeFixture('m1', { bridge: aeBridgeText, json })

    const issues = run('m1')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'CANONICAL_AE_MISSING')
  })

  test('M2: bridge declares AE / canonical increasePast mismatch → RED INCREASE_PAST_MISMATCH', () => {
    const json = clone(aeCanonicalJson)
    json.display.adjustmentExpression.increasePast = '増量した'
    writeFixture('m2', { bridge: aeBridgeText, json })

    const issues = run('m2')
    assert.ok(issues.some(i => i.code === 'INCREASE_PAST_MISMATCH'), JSON.stringify(issues))
  })

  test('M3: bridge declares AE / canonical decreasePast mismatch → RED DECREASE_PAST_MISMATCH', () => {
    const json = clone(aeCanonicalJson)
    json.display.adjustmentExpression.decreasePast = '減量した'
    writeFixture('m3', { bridge: aeBridgeText, json })

    const issues = run('m3')
    assert.ok(issues.some(i => i.code === 'DECREASE_PAST_MISMATCH'), JSON.stringify(issues))
  })

  test('M4: bridge silent / canonical AE invented → RED CANONICAL_AE_UNEXPECTED', () => {
    const json = clone(silentCanonicalJson)
    json.display = json.display ?? {}
    json.display.adjustmentExpression = { increasePast: '増量となった', decreasePast: '減量となった' }
    writeFixture('m4', { bridge: silentBridgeText, json })

    const issues = run('m4')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'CANONICAL_AE_UNEXPECTED')
  })

  test('M5: both silent → GREEN', () => {
    writeFixture('m5', { bridge: silentBridgeText, json: clone(silentCanonicalJson) })

    const issues = run('m5')
    assert.deepEqual(issues, [])
  })

  test('M6: synthetic 36th-like module, bridge + canonical exact AE → GREEN', () => {
    writeFixture('m6_synthetic_new_module', { bridge: aeBridgeText, json: clone(aeCanonicalJson) })

    const issues = run('m6_synthetic_new_module')
    assert.deepEqual(issues, [])
  })

  test('M7: synthetic 36th-like module, both silent → GREEN', () => {
    writeFixture('m7_synthetic_new_module', { bridge: silentBridgeText, json: clone(silentCanonicalJson) })

    const issues = run('m7_synthetic_new_module')
    assert.deepEqual(issues, [])
  })

  test('M8a: bridge partial AE（decreasePast欠落）→ RED BRIDGE_PARSE_ERROR', () => {
    const brokenBridge = aeBridgeText.replace(/^ {4}decreasePast: ".*"$/m, '')
    writeFixture('m8a', { bridge: brokenBridge, json: clone(aeCanonicalJson) })

    const issues = run('m8a')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_PARSE_ERROR')
  })

  test('M8b: bridge malformed AE（unquoted child value）→ RED BRIDGE_PARSE_ERROR', () => {
    const brokenBridge = aeBridgeText.replace(/^( {4}increasePast: )".*"$/m, '$1増量となった')
    writeFixture('m8b', { bridge: brokenBridge, json: clone(aeCanonicalJson) })

    const issues = run('m8b')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_PARSE_ERROR')
  })

  test('M8c: display block が特定できない → RED BRIDGE_PARSE_ERROR', () => {
    const brokenBridge = aeBridgeText.replace(/^display:$/m, '# display:')
    writeFixture('m8c', { bridge: brokenBridge, json: clone(aeCanonicalJson) })

    const issues = run('m8c')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_PARSE_ERROR')
  })

  test('M9: registered-style module fixture, bridge missing → RED BRIDGE_NOT_FOUND', () => {
    writeFixture('m9', { bridge: null, json: clone(aeCanonicalJson) })

    const issues = run('m9')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_NOT_FOUND')
  })

  test('M10: {id}.md.bak のみ存在し {id}.md が欠落 → RED BRIDGE_NOT_FOUND（.bak は bridge として認識されない）', () => {
    writeFixture('m10', { bridge: aeBridgeText, bridgeExt: '.md.bak', json: clone(aeCanonicalJson) })

    const issues = run('m10')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'BRIDGE_NOT_FOUND')
  })

  test('exact-preservation: canonical に trailing space が1文字あるだけでも RED INCREASE_PAST_MISMATCH（trim/normalize は禁止。=== のみが正）', () => {
    // "増量となった" と "増量となった "（末尾ASCIIスペース1文字）は .trim() すれば等しくなるが、
    // 保持契約は raw string の === のみを正とする（trim / normalize は明示的に禁止）。
    // この1件は「比較が trim() や normalize() に弱められた場合に RED で検出する」ための
    // regression lock であり、production 側の挙動を変更するものではない。
    const json = clone(aeCanonicalJson)
    json.display.adjustmentExpression.increasePast = json.display.adjustmentExpression.increasePast + ' '
    writeFixture('m11_exact_preservation', { bridge: aeBridgeText, json })

    const issues = run('m11_exact_preservation')
    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'INCREASE_PAST_MISMATCH')
  })
})

describe('parseBridgeAdjustmentExpression — 単体', () => {
  test('AE を宣言している実在 bridge を PRESENT として parse する', () => {
    const result = parseBridgeAdjustmentExpression(aeBridgeText)
    assert.equal(result.kind, 'PRESENT')
  })

  test('AE について沈黙している実在 bridge を ABSENT として parse する', () => {
    const result = parseBridgeAdjustmentExpression(silentBridgeText)
    assert.equal(result.kind, 'ABSENT')
  })
})

describe('live corpus — Invariant F divergence（P-R3D Design Review §20）', () => {
  test('現行 registered corpus に adjustmentExpression preservation の divergence が存在しない', () => {
    // module 件数・AE 件数はここでは一切 assert しない（corpus 成長に対して非依存であること自体を担保する）。
    // 検証するのは「現在の corpus に対して runAudit() が 0 issue を返す」という関係のみ。
    const issues = runAudit(listModuleIds())
    assert.deepEqual(issues, [], `Invariant F divergence が検出された: ${JSON.stringify(issues, null, 2)}`)
  })
})
