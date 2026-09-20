/**
 * drugClassBridgeParity.test.ts
 *
 * scripts/audit-drugclass-bridge-chain.ts の検出ロジックが実際に機能することを検証する
 * regression test。tests/adjustmentExpressionBridgeParity.test.ts /
 * tests/menuGroupLabelsBridgeParity.test.ts と同じ設計方針を踏襲する
 * （tautological coverage を避ける・synthetic fixture を使う・本番 registry を書き換えない）。
 *
 * ── なぜこのテストが必要か ──────────────────────────────────────────────
 *
 * D-9 の目的は「bridge Header → canonical `drug.drugClass` の preservation invariant を
 * machine-enforce する」こと。しかし guard 自体の検出感度が未検証であれば、検出できないまま
 * silent false-negative を生み続ける可能性がある（D-2 の欠落が 83 日間、D-8 の不一致が約 3 か月間
 * 検出されなかったのは、そもそも検査が存在しなかったため）。
 *
 * 本ファイルは意図的に壊した bridge / canonical fixture を temp directory に生成し、
 * 期待した failure code が実際に emit されることを確認する。あわせて、
 * **課していない invariant（reverse invariant / requiredness）が誤って発火しないこと**も固定する。
 *
 * 本番の data/modules/index.ts / bridges/ / data/modules/ は一切変更しない。
 * fs.mkdtempSync(os.tmpdir()) で生成した独立ディレクトリのみを使用し、after() で必ず削除する。
 *
 * 実行:
 *   npx tsx --test tests/drugClassBridgeParity.test.ts
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import {
  parseBridgeDrugClass,
  auditModule,
  runAudit,
  severityOf,
  DRUGCLASS_AUTHORING_PATTERN,
} from '../scripts/audit-drugclass-bridge-chain'
import { listModuleIds } from '../scripts/auditShared'

const REPO_ROOT = path.resolve(__dirname, '..')
const REAL_BRIDGES_DIR = path.join(REPO_ROOT, 'bridges')
const REAL_MODULES_DIR = path.join(REPO_ROOT, 'data', 'modules')

/** D-8 の当事者 module。bridge / canonical とも `H1_ANTIHISTAMINE_SECOND_GEN` で一致している。 */
const BASE_MODULE = 'allergy_h1_antihistamine_second_gen_oral'
/** D-8 で canonical 側に存在していた旧値（historical。現在は corpus に存在しない）。 */
const D8_LEGACY_CANONICAL_VALUE = 'H1_antihistamine_2nd_gen'

let tmpDir: string
let bridgesDir: string
let modulesDir: string
let baseBridgeText: string
let baseCanonicalJson: any

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drugclass-parity-'))
  bridgesDir = path.join(tmpDir, 'bridges')
  modulesDir = path.join(tmpDir, 'data', 'modules')
  fs.mkdirSync(bridgesDir, { recursive: true })
  fs.mkdirSync(modulesDir, { recursive: true })

  baseBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${BASE_MODULE}.md`), 'utf-8')
  baseCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${BASE_MODULE}.json`), 'utf-8'))

  // sanity check: fixture の前提が崩れていないか
  const parsed = parseBridgeDrugClass(baseBridgeText)
  assert.equal(parsed.kind, 'PRESENT', `${BASE_MODULE} の bridge は drugClass を宣言している前提`)
  assert.deepEqual(
    (parsed as { kind: 'PRESENT'; values: string[] }).values,
    ['H1_ANTIHISTAMINE_SECOND_GEN'],
    `${BASE_MODULE} の bridge 宣言値の前提`,
  )
  assert.deepEqual(
    baseCanonicalJson?.drug?.drugClass,
    ['H1_ANTIHISTAMINE_SECOND_GEN'],
    `${BASE_MODULE} の canonical は bridge と一致している前提（D-8 remediation 後）`,
  )
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeFixture(id: string, opts: { bridge?: string | null; json?: unknown | null }) {
  const { bridge, json } = opts
  if (bridge !== null && bridge !== undefined) {
    fs.writeFileSync(path.join(bridgesDir, `${id}.md`), bridge, 'utf-8')
  }
  if (json !== null && json !== undefined) {
    fs.writeFileSync(path.join(modulesDir, `${id}.json`), JSON.stringify(json, null, 2), 'utf-8')
  }
}

function run(id: string) {
  return auditModule(id, path.join(bridgesDir, `${id}.md`), path.join(modulesDir, `${id}.json`))
}

function codes(id: string): string[] {
  return run(id).map(i => i.code)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/** base bridge の drugClass 値ブロックを差し替えた synthetic bridge を作る。 */
function bridgeWithValues(values: string[]): string {
  const block = values.map(v => `    - "${v}"`).join('\n')
  return baseBridgeText.replace(/^ {2}drugClass:\n(?: {4}- "[^"]*"\n)+/m, `  drugClass:\n${block}\n`)
}

/** base bridge から drugClass ブロックごと削除した synthetic bridge を作る（bridge 沈黙）。 */
function bridgeWithoutDrugClass(): string {
  return baseBridgeText.replace(/^ {2}drugClass:\n(?: {4}- "[^"]*"\n)+/m, '')
}

/** base bridge の drugClass ブロックを任意の生テキストへ差し替える（malformed fixture 用）。 */
function bridgeWithRawBlock(raw: string): string {
  return baseBridgeText.replace(/^ {2}drugClass:\n(?: {4}- "[^"]*"\n)+/m, raw)
}

function canonicalWithDrugClass(value: unknown): any {
  const json = clone(baseCanonicalJson)
  json.drug.drugClass = value
  return json
}

describe('audit-drugclass-bridge-chain — fixture helper の健全性', () => {
  test('bridgeWithValues / bridgeWithoutDrugClass / bridgeWithRawBlock が意図どおり置換する', () => {
    const two = parseBridgeDrugClass(bridgeWithValues(['ALPHA', 'BETA']))
    assert.deepEqual(two, { kind: 'PRESENT', values: ['ALPHA', 'BETA'] })
    assert.deepEqual(parseBridgeDrugClass(bridgeWithoutDrugClass()), { kind: 'ABSENT' })
    assert.notEqual(bridgeWithoutDrugClass(), baseBridgeText)
  })
})

describe('audit-drugclass-bridge-chain — T-1〜T-8: bridge PRESENT', () => {
  test('T-1: bridge PRESENT + canonical 逐語一致 → GREEN', () => {
    writeFixture('t1', { bridge: baseBridgeText, json: clone(baseCanonicalJson) })
    assert.deepEqual(run('t1'), [])
  })

  test('T-2: canonical に drugClass キーがない → DRUGCLASS_MISSING_IN_CANONICAL（D-2 の再現）', () => {
    const json = clone(baseCanonicalJson)
    delete json.drug.drugClass
    writeFixture('t2', { bridge: baseBridgeText, json })
    assert.deepEqual(codes('t2'), ['DRUGCLASS_MISSING_IN_CANONICAL'])
  })

  test('T-3: canonical が D-8 の旧値 → DRUGCLASS_VALUE_MISMATCH（D-8 の再現）', () => {
    writeFixture('t3', { bridge: baseBridgeText, json: canonicalWithDrugClass([D8_LEGACY_CANONICAL_VALUE]) })
    const issues = run('t3')
    assert.deepEqual(issues.map(i => i.code), ['DRUGCLASS_VALUE_MISMATCH'])
    assert.match(issues[0].detail, /H1_ANTIHISTAMINE_SECOND_GEN/)
    assert.match(issues[0].detail, /H1_antihistamine_2nd_gen/)
  })

  test('T-4: 大文字小文字のみ相違 → DRUGCLASS_VALUE_MISMATCH（casing 差を見逃さない）', () => {
    writeFixture('t4', {
      bridge: bridgeWithValues(['SGLT2_INHIBITOR']),
      json: canonicalWithDrugClass(['sglt2_inhibitor']),
    })
    assert.deepEqual(codes('t4'), ['DRUGCLASS_VALUE_MISMATCH'])
  })

  test('T-5: 要素数の相違（過剰・不足）→ DRUGCLASS_VALUE_MISMATCH', () => {
    writeFixture('t5a', {
      bridge: bridgeWithValues(['ALPHA']),
      json: canonicalWithDrugClass(['ALPHA', 'BETA']),
    })
    assert.deepEqual(codes('t5a'), ['DRUGCLASS_VALUE_MISMATCH'])

    writeFixture('t5b', {
      bridge: bridgeWithValues(['ALPHA', 'BETA']),
      json: canonicalWithDrugClass(['ALPHA']),
    })
    assert.deepEqual(codes('t5b'), ['DRUGCLASS_VALUE_MISMATCH'])
  })

  test('T-6: 2 要素で順序のみ相違 → DRUGCLASS_VALUE_MISMATCH（順序敏感）', () => {
    writeFixture('t6', {
      bridge: bridgeWithValues(['ALPHA', 'BETA']),
      json: canonicalWithDrugClass(['BETA', 'ALPHA']),
    })
    assert.deepEqual(codes('t6'), ['DRUGCLASS_VALUE_MISMATCH'])
  })

  test('T-7: 2 要素で完全一致 → GREEN（要素数 1 を前提にしていない）', () => {
    writeFixture('t7', {
      bridge: bridgeWithValues(['ALPHA', 'BETA']),
      json: canonicalWithDrugClass(['ALPHA', 'BETA']),
    })
    assert.deepEqual(run('t7'), [])
  })

  test('T-8: bridge 値が authoring 規約違反 → DRUGCLASS_AUTHORING_FORMAT_VIOLATION（parity 成立時も検出）', () => {
    // parity は成立しているが authoring 規約に違反している
    writeFixture('t8a', {
      bridge: bridgeWithValues(['h1_antihistamine']),
      json: canonicalWithDrugClass(['h1_antihistamine']),
    })
    assert.deepEqual(codes('t8a'), ['DRUGCLASS_AUTHORING_FORMAT_VIOLATION'])

    // authoring 違反と parity 違反は独立に報告される
    writeFixture('t8b', {
      bridge: bridgeWithValues(['h1_antihistamine']),
      json: canonicalWithDrugClass(['H1_ANTIHISTAMINE']),
    })
    assert.deepEqual(codes('t8b'), ['DRUGCLASS_AUTHORING_FORMAT_VIOLATION', 'DRUGCLASS_VALUE_MISMATCH'])
  })

  test('T-8c: canonical が配列でない / 要素が string でない → DRUGCLASS_VALUE_MISMATCH', () => {
    writeFixture('t8c', { bridge: bridgeWithValues(['ALPHA']), json: canonicalWithDrugClass('ALPHA') })
    assert.deepEqual(codes('t8c'), ['DRUGCLASS_VALUE_MISMATCH'])

    writeFixture('t8d', { bridge: bridgeWithValues(['ALPHA']), json: canonicalWithDrugClass([123]) })
    assert.deepEqual(codes('t8d'), ['DRUGCLASS_VALUE_MISMATCH'])
  })
})

describe('audit-drugclass-bridge-chain — T-9 / T-10: bridge 沈黙（reverse invariant を課さない）', () => {
  test('T-9: bridge に drugClass キーがなく canonical は保持 → FAIL 0（NOT_CHECKED）', () => {
    writeFixture('t9', { bridge: bridgeWithoutDrugClass(), json: clone(baseCanonicalJson) })
    assert.deepEqual(run('t9'), [], 'bridge 沈黙時に canonical の存在を FAIL にしてはならない（OD-D9-5）')
  })

  test('T-10: bridge に drugClass キーがなく canonical にも存在しない → FAIL 0', () => {
    const json = clone(baseCanonicalJson)
    delete json.drug.drugClass
    writeFixture('t10', { bridge: bridgeWithoutDrugClass(), json })
    assert.deepEqual(run('t10'), [], 'requiredness は D-9 の対象外であり、欠落を FAIL にしてはならない')
  })
})

describe('audit-drugclass-bridge-chain — T-11: bridge missing / parse failure の分離', () => {
  test('T-11a: bridge ファイルが存在しない → BRIDGE_NOT_FOUND（CHECK）', () => {
    const json = clone(baseCanonicalJson)
    fs.writeFileSync(path.join(modulesDir, 't11a.json'), JSON.stringify(json, null, 2), 'utf-8')
    const issues = run('t11a')
    assert.deepEqual(issues.map(i => i.code), ['BRIDGE_NOT_FOUND'])
    assert.equal(severityOf('BRIDGE_NOT_FOUND'), 'CHECK', 'bridge existence contract は D-9 で未決定のため FAIL にしない')
  })

  test('T-11b: inline 配列記法 → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11b', {
      bridge: bridgeWithRawBlock('  drugClass: ["H1_ANTIHISTAMINE_SECOND_GEN"]\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t11b'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11c: drugClass 宣言だけで値がない → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11c', { bridge: bridgeWithRawBlock('  drugClass:\n'), json: clone(baseCanonicalJson) })
    assert.deepEqual(codes('t11c'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11d: 値がダブルクオートされていない → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11d', {
      bridge: bridgeWithRawBlock('  drugClass:\n    - H1_ANTIHISTAMINE_SECOND_GEN\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t11d'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11e: drugClass 宣言が 2 回出現 → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11e', {
      bridge: bridgeWithRawBlock(
        '  drugClass:\n    - "H1_ANTIHISTAMINE_SECOND_GEN"\n  drugClass:\n    - "OTHER_CLASS"\n',
      ),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t11e'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11f: 宣言の indent が contract 形式でない → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11f', {
      bridge: bridgeWithRawBlock('    drugClass:\n      - "H1_ANTIHISTAMINE_SECOND_GEN"\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t11f'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11g: drugClass が drug ブロックの外側にある → DRUGCLASS_BRIDGE_PARSE_ERROR', () => {
    const moved = bridgeWithoutDrugClass().replace(
      /^display:$/m,
      'display:\n  drugClass:\n    - "H1_ANTIHISTAMINE_SECOND_GEN"',
    )
    writeFixture('t11g', { bridge: moved, json: clone(baseCanonicalJson) })
    assert.deepEqual(codes('t11g'), ['DRUGCLASS_BRIDGE_PARSE_ERROR'])
  })

  test('T-11h: canonical JSON が存在しない → JSON_NOT_FOUND（FAIL）', () => {
    fs.writeFileSync(path.join(bridgesDir, 't11h.md'), baseBridgeText, 'utf-8')
    const issues = run('t11h')
    assert.deepEqual(issues.map(i => i.code), ['JSON_NOT_FOUND'])
    assert.equal(severityOf('JSON_NOT_FOUND'), 'FAIL')
  })

  test('severityOf: BRIDGE_NOT_FOUND のみ CHECK、FAIL 系 4 code は FAIL', () => {
    assert.equal(severityOf('BRIDGE_NOT_FOUND'), 'CHECK')
    for (const code of [
      'DRUGCLASS_MISSING_IN_CANONICAL',
      'DRUGCLASS_VALUE_MISMATCH',
      'DRUGCLASS_AUTHORING_FORMAT_VIOLATION',
      'DRUGCLASS_BRIDGE_PARSE_ERROR',
    ]) {
      assert.equal(severityOf(code), 'FAIL', `${code} は FAIL`)
    }
  })
})

describe('audit-drugclass-bridge-chain — T-12: 本番 corpus', () => {
  test('T-12: registered module 全件で FAIL 0（現行 parity の regression 固定）', () => {
    assert.deepEqual(runAudit(), [], 'current corpus の bridge ⇔ canonical drugClass parity は成立している')
  })

  test('T-12b: registered 全 bridge が drugClass を contract 形式で宣言している', () => {
    const moduleIds = listModuleIds()
    assert.ok(moduleIds.length > 0, 'registry からモジュールを取得できる')
    for (const moduleId of moduleIds) {
      const text = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${moduleId}.md`), 'utf-8')
      const parsed = parseBridgeDrugClass(text)
      assert.equal(parsed.kind, 'PRESENT', `${moduleId}: bridge の drugClass が PRESENT`)
      for (const value of (parsed as { kind: 'PRESENT'; values: string[] }).values) {
        assert.match(value, DRUGCLASS_AUTHORING_PATTERN, `${moduleId}: ${value} は UPPER_SNAKE 規約に合致`)
      }
    }
  })
})
