/**
 * drugSpecificTagsBridgeParity.test.ts
 *
 * scripts/audit-drug-specific-tags-bridge-chain.ts の検出ロジックが実際に機能することを検証する
 * regression test。tests/drugClassBridgeParity.test.ts / adjustmentExpressionBridgeParity.test.ts /
 * menuGroupLabelsBridgeParity.test.ts と同じ設計方針を踏襲する（tautological coverage を避ける・
 * synthetic fixture を使う・本番 registry を書き換えない）。
 *
 * ── なぜこのテストが必要か ──────────────────────────────────────────────
 *
 * D-15c の目的は「bridge Header → canonical `drug.drugSpecificTags` の preservation invariant を
 * machine-enforce する」こと。guard 自体の検出感度が未検証であれば、検出できないまま
 * silent false-negative を生み続ける可能性がある。
 *
 * 本ファイルは意図的に壊した bridge / canonical fixture を temp directory に生成し、期待した
 * failure code が emit されることを確認する。あわせて **課していない判定が誤って発火しないこと**
 * —— 重複 token・空配列・表記形式・bridge 沈黙時の canonical 存在 —— も固定する
 * （Owner Decision OD-D15c-3 / OD-D15c-4 / OD-D15c-6 / OD-D15c-7）。
 *
 * 本番の data/modules/index.ts / bridges/ / data/modules/ は一切変更しない。
 * fs.mkdtempSync(os.tmpdir()) で生成した独立ディレクトリのみを使用し、after() で必ず削除する。
 *
 * 実行:
 *   npx tsx --test tests/drugSpecificTagsBridgeParity.test.ts
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import {
  parseBridgeDrugSpecificTags,
  auditModule,
  runAudit,
  severityOf,
} from '../scripts/audit-drug-specific-tags-bridge-chain'
import { parseBridgeDrugClass } from '../scripts/audit-drugclass-bridge-chain'
import { listModuleIds } from '../scripts/auditShared'

const REPO_ROOT = path.resolve(__dirname, '..')
const REAL_BRIDGES_DIR = path.join(REPO_ROOT, 'bridges')
const REAL_MODULES_DIR = path.join(REPO_ROOT, 'data', 'modules')

/** D-15c の当事者 module。remediation 後は bridge / canonical とも 4 token で一致している。 */
const BASE_MODULE = 'allergy_h1_antihistamine_second_gen_oral'
/** D-15c remediation 前に canonical が保持していた値（historical）。 */
const LEGACY_CANONICAL_TAGS = ['h1_antihistamine_oral', 'second_gen_antihistamine']

let tmpDir: string
let bridgesDir: string
let modulesDir: string
let baseBridgeText: string
let baseCanonicalJson: any

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drug-specific-tags-parity-'))
  bridgesDir = path.join(tmpDir, 'bridges')
  modulesDir = path.join(tmpDir, 'data', 'modules')
  fs.mkdirSync(bridgesDir, { recursive: true })
  fs.mkdirSync(modulesDir, { recursive: true })

  baseBridgeText = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${BASE_MODULE}.md`), 'utf-8')
  baseCanonicalJson = JSON.parse(fs.readFileSync(path.join(REAL_MODULES_DIR, `${BASE_MODULE}.json`), 'utf-8'))

  // sanity check: fixture の前提が崩れていないか
  const parsed = parseBridgeDrugSpecificTags(baseBridgeText)
  assert.equal(parsed.kind, 'PRESENT', `${BASE_MODULE} の bridge は drugSpecificTags を宣言している前提`)
  assert.deepEqual(
    (parsed as { kind: 'PRESENT'; values: string[] }).values,
    ['antihistamine', 'second_generation', 'allergy', 'oral'],
    `${BASE_MODULE} の bridge 宣言値の前提`,
  )
  assert.deepEqual(
    baseCanonicalJson?.drug?.drugSpecificTags,
    ['antihistamine', 'second_generation', 'allergy', 'oral'],
    `${BASE_MODULE} の canonical は bridge と一致している前提（D-15c remediation 後）`,
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

const TAGS_BLOCK_RE = /^ {2}drugSpecificTags:\n(?: {4}- "[^"]*"\n)+/m

/** base bridge の drugSpecificTags 値ブロックを差し替えた synthetic bridge を作る。 */
function bridgeWithTags(values: string[]): string {
  const block = values.map(v => `    - "${v}"`).join('\n')
  return baseBridgeText.replace(TAGS_BLOCK_RE, `  drugSpecificTags:\n${block}\n`)
}

/** drugSpecificTags ブロックごと削除した synthetic bridge を作る（bridge 沈黙）。 */
function bridgeWithoutTags(): string {
  return baseBridgeText.replace(TAGS_BLOCK_RE, '')
}

/** drugSpecificTags ブロックを任意の生テキストへ差し替える（malformed / empty fixture 用）。 */
function bridgeWithRawBlock(raw: string): string {
  return baseBridgeText.replace(TAGS_BLOCK_RE, raw)
}

function canonicalWithTags(value: unknown): any {
  const json = clone(baseCanonicalJson)
  json.drug.drugSpecificTags = value
  return json
}

describe('audit-drug-specific-tags-bridge-chain — fixture helper の健全性', () => {
  test('bridgeWithTags / bridgeWithoutTags が意図どおり置換する', () => {
    assert.deepEqual(parseBridgeDrugSpecificTags(bridgeWithTags(['alpha', 'beta'])), {
      kind: 'PRESENT',
      values: ['alpha', 'beta'],
    })
    assert.deepEqual(parseBridgeDrugSpecificTags(bridgeWithoutTags()), { kind: 'ABSENT' })
  })
})

describe('audit-drug-specific-tags-bridge-chain — T-1〜T-6: bridge PRESENT の parity', () => {
  test('T-1: bridge PRESENT + canonical 逐語一致 → GREEN', () => {
    writeFixture('t1', { bridge: baseBridgeText, json: clone(baseCanonicalJson) })
    assert.deepEqual(run('t1'), [])
  })

  test('T-2: canonical に drugSpecificTags キーがない → DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL', () => {
    const json = clone(baseCanonicalJson)
    delete json.drug.drugSpecificTags
    writeFixture('t2', { bridge: baseBridgeText, json })
    assert.deepEqual(codes('t2'), ['DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL'])
  })

  test('T-3: D-15c 以前の canonical 値（2 token）→ DRUG_SPECIFIC_TAGS_VALUE_MISMATCH', () => {
    writeFixture('t3', { bridge: baseBridgeText, json: canonicalWithTags(LEGACY_CANONICAL_TAGS) })
    const issues = run('t3')
    assert.deepEqual(issues.map(i => i.code), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])
    assert.match(issues[0].detail, /antihistamine/)
    assert.match(issues[0].detail, /h1_antihistamine_oral/)
  })

  test('T-4: 順序のみ相違 → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH（exact order preservation）', () => {
    writeFixture('t4', {
      bridge: bridgeWithTags(['alpha', 'beta', 'gamma']),
      json: canonicalWithTags(['beta', 'alpha', 'gamma']),
    })
    assert.deepEqual(codes('t4'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'], 'set equality ではなく順序込みで比較する')
  })

  test('T-5: 要素数の過不足 → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH', () => {
    writeFixture('t5a', { bridge: bridgeWithTags(['alpha']), json: canonicalWithTags(['alpha', 'beta']) })
    assert.deepEqual(codes('t5a'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])

    writeFixture('t5b', { bridge: bridgeWithTags(['alpha', 'beta']), json: canonicalWithTags(['alpha']) })
    assert.deepEqual(codes('t5b'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])
  })

  test('T-6: 大文字小文字のみ相違 → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH（専用 code は作らない）', () => {
    writeFixture('t6', { bridge: bridgeWithTags(['antihistamine']), json: canonicalWithTags(['Antihistamine']) })
    assert.deepEqual(codes('t6'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])
  })

  test('T-6b: canonical が配列でない / 要素が string でない → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH', () => {
    writeFixture('t6b', { bridge: bridgeWithTags(['alpha']), json: canonicalWithTags('alpha') })
    assert.deepEqual(codes('t6b'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])

    writeFixture('t6c', { bridge: bridgeWithTags(['alpha']), json: canonicalWithTags([123]) })
    assert.deepEqual(codes('t6c'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])
  })
})

describe('audit-drug-specific-tags-bridge-chain — T-7〜T-10: 判定しないことの固定', () => {
  test('T-7: bridge に重複 token + canonical 逐語一致 → GREEN（dedupe もエラー化もしない）', () => {
    writeFixture('t7', {
      bridge: bridgeWithTags(['alpha', 'alpha', 'beta']),
      json: canonicalWithTags(['alpha', 'alpha', 'beta']),
    })
    assert.deepEqual(run('t7'), [], '重複 token は FAIL にも CHECK にもしない（OD-D15c-6）')
  })

  test('T-8: bridge 空配列 + canonical 空配列 → GREEN（空配列 issue を作らない）', () => {
    writeFixture('t8', { bridge: bridgeWithRawBlock('  drugSpecificTags:\n'), json: canonicalWithTags([]) })
    assert.deepEqual(
      parseBridgeDrugSpecificTags(bridgeWithRawBlock('  drugSpecificTags:\n')),
      { kind: 'PRESENT', values: [] },
      'item 0 件は PRESENT + 空配列として扱う（OD-D15c §11-B）',
    )
    assert.deepEqual(run('t8'), [])
  })

  test('T-9: bridge 空配列 + canonical に要素あり → DRUG_SPECIFIC_TAGS_VALUE_MISMATCH', () => {
    writeFixture('t9', {
      bridge: bridgeWithRawBlock('  drugSpecificTags:\n'),
      json: canonicalWithTags(['alpha']),
    })
    assert.deepEqual(codes('t9'), ['DRUG_SPECIFIC_TAGS_VALUE_MISMATCH'])
  })

  test('T-9b: 空配列の扱いは drugClass audit と意図的に異なる（field-specific contract の差）', () => {
    const emptyTagsBridge = bridgeWithRawBlock('  drugSpecificTags:\n')
    assert.equal(
      parseBridgeDrugSpecificTags(emptyTagsBridge).kind,
      'PRESENT',
      'drugSpecificTags: 値 0 件 → PRESENT（空配列）',
    )
    const emptyClassBridge = baseBridgeText.replace(/^ {2}drugClass:\n(?: {4}- "[^"]*"\n)+/m, '  drugClass:\n')
    assert.equal(
      parseBridgeDrugClass(emptyClassBridge).kind,
      'PARSE_ERROR',
      'drugClass: 値 0 件 → PARSE_ERROR（D-9 contract。両者の差は意図されたもの）',
    )
  })

  test('T-10: bridge token が lowercase snake_case でない + canonical 逐語一致 → GREEN', () => {
    writeFixture('t10', {
      bridge: bridgeWithTags(['Anti-Histamine', 'SECOND_GENERATION']),
      json: canonicalWithTags(['Anti-Histamine', 'SECOND_GENERATION']),
    })
    assert.deepEqual(run('t10'), [], '表記形式は contract 化していない（OD-D15c 追加指示）')
  })

  test('T-10b: corpus に存在しない孤立 token でも GREEN（vocabulary を判定しない）', () => {
    writeFixture('t10b', {
      bridge: bridgeWithTags(['totally_unique_token_xyz']),
      json: canonicalWithTags(['totally_unique_token_xyz']),
    })
    assert.deepEqual(run('t10b'), [], 'vocabulary SSOT は存在せず、語彙の妥当性は判定しない（OD-D15c-3）')
  })
})

describe('audit-drug-specific-tags-bridge-chain — T-11〜T-14: bridge parse failure', () => {
  test('T-11: 値がダブルクオートされていない → DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t11', {
      bridge: bridgeWithRawBlock('  drugSpecificTags:\n    - antihistamine\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t11'), ['DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR'])
  })

  test('T-12: inline 配列記法 → DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t12', {
      bridge: bridgeWithRawBlock('  drugSpecificTags: ["antihistamine"]\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t12'), ['DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR'])
  })

  test('T-13: drugSpecificTags 宣言が 2 回 → DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t13', {
      bridge: bridgeWithRawBlock('  drugSpecificTags:\n    - "alpha"\n  drugSpecificTags:\n    - "beta"\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t13'), ['DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR'])
  })

  test('T-14: indent 違反 / drug ブロック外の宣言 → DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR', () => {
    writeFixture('t14a', {
      bridge: bridgeWithRawBlock('    drugSpecificTags:\n      - "alpha"\n'),
      json: clone(baseCanonicalJson),
    })
    assert.deepEqual(codes('t14a'), ['DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR'])

    const moved = bridgeWithoutTags().replace(
      /^display:$/m,
      'display:\n  drugSpecificTags:\n    - "alpha"',
    )
    writeFixture('t14b', { bridge: moved, json: clone(baseCanonicalJson) })
    assert.deepEqual(codes('t14b'), ['DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR'])
  })
})

describe('audit-drug-specific-tags-bridge-chain — T-15〜T-18: 沈黙 / infra', () => {
  test('T-15: bridge が沈黙 + canonical PRESENT → GREEN（reverse invariant を課さない）', () => {
    writeFixture('t15', { bridge: bridgeWithoutTags(), json: clone(baseCanonicalJson) })
    assert.deepEqual(run('t15'), [], 'bridge 沈黙時に canonical の存在を FAIL にしてはならない（OD-D15c-7）')
  })

  test('T-16: bridge が沈黙 + canonical 欠落 → GREEN（requiredness は対象外）', () => {
    const json = clone(baseCanonicalJson)
    delete json.drug.drugSpecificTags
    writeFixture('t16', { bridge: bridgeWithoutTags(), json })
    assert.deepEqual(run('t16'), [])
  })

  test('T-17: bridge ファイルが存在しない → BRIDGE_NOT_FOUND（CHECK）', () => {
    fs.writeFileSync(path.join(modulesDir, 't17.json'), JSON.stringify(clone(baseCanonicalJson), null, 2), 'utf-8')
    assert.deepEqual(codes('t17'), ['BRIDGE_NOT_FOUND'])
    assert.equal(severityOf('BRIDGE_NOT_FOUND'), 'CHECK')
  })

  test('T-18: canonical JSON が存在しない → JSON_NOT_FOUND（FAIL・audit 共通 infra）', () => {
    fs.writeFileSync(path.join(bridgesDir, 't18.md'), baseBridgeText, 'utf-8')
    assert.deepEqual(codes('t18'), ['JSON_NOT_FOUND'])
    assert.equal(severityOf('JSON_NOT_FOUND'), 'FAIL')
  })

  test('severityOf: BRIDGE_NOT_FOUND のみ CHECK、semantic FAIL 3 code は FAIL', () => {
    assert.equal(severityOf('BRIDGE_NOT_FOUND'), 'CHECK')
    for (const code of [
      'DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL',
      'DRUG_SPECIFIC_TAGS_VALUE_MISMATCH',
      'DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR',
      'JSON_NOT_FOUND',
      'JSON_PARSE_ERROR',
    ]) {
      assert.equal(severityOf(code), 'FAIL', `${code} は FAIL`)
    }
  })
})

describe('audit-drug-specific-tags-bridge-chain — T-19 / T-20: 本番 corpus', () => {
  test('T-19: registered module 全件で FAIL 0（D-15c remediation 後の regression 固定）', () => {
    assert.deepEqual(runAudit(), [], 'current corpus の bridge ⇔ canonical drugSpecificTags parity は成立している')
  })

  test('T-20: registered 全 bridge が drugSpecificTags を contract 形式で宣言している', () => {
    const moduleIds = listModuleIds()
    assert.ok(moduleIds.length > 0, 'registry からモジュールを取得できる')
    for (const moduleId of moduleIds) {
      const text = fs.readFileSync(path.join(REAL_BRIDGES_DIR, `${moduleId}.md`), 'utf-8')
      assert.equal(
        parseBridgeDrugSpecificTags(text).kind,
        'PRESENT',
        `${moduleId}: bridge の drugSpecificTags が PRESENT`,
      )
    }
  })
})
