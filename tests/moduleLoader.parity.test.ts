/**
 * moduleLoader.parity.test.ts
 *
 * lib/moduleLoader.ts が ALL_MODULES への直接アクセスと**完全に等価**であることを検証する。
 * 設計根拠: docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md §5.2
 *
 * ── なぜ参照同一性（===）まで検証するか ─────────────────────────
 *
 * Stage 3 の目的は「接続点を作ること」であり挙動を変えないことである。
 * getAllModules() が配列やモジュールを複製して別オブジェクトを返すと、
 * DashboardClient の useMemo 依存配列（allModules）が毎回変化したと判定され、
 * 検索インデックスの再構築が走るなど React の再レンダリング挙動が変わりうる。
 * したがって deepEqual では不十分であり、=== による参照同一性を検証する。
 *
 * 実行:
 *   npx tsx --test tests/moduleLoader.parity.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ALL_MODULES } from '../data/modules/index'
import { moduleLoader, createBundledModuleLoader } from '../lib/moduleLoader'
import { buildSearchIndex } from '../lib/search'

describe('moduleLoader parity（Stage 3・挙動不変の担保）', () => {
  test('getAllModules() が ALL_MODULES と同一件数を返す', () => {
    assert.equal(
      moduleLoader.getAllModules().length,
      ALL_MODULES.length,
      `件数が不一致: loader ${moduleLoader.getAllModules().length} / ALL_MODULES ${ALL_MODULES.length}`,
    )
  })

  test('getAllModules() の各要素が ALL_MODULES と同一オブジェクト参照（===）', () => {
    const loaded = moduleLoader.getAllModules()
    for (let i = 0; i < ALL_MODULES.length; i++) {
      assert.ok(
        loaded[i] === ALL_MODULES[i],
        `index ${i}（${ALL_MODULES[i].moduleId}）が同一参照でない。複製されている可能性がある`,
      )
    }
  })

  test('listModuleIds() が ALL_MODULES の moduleId 配列と一致する（順序を含む）', () => {
    assert.deepEqual(
      [...moduleLoader.listModuleIds()],
      ALL_MODULES.map(m => m.moduleId),
    )
  })

  test('全 moduleId について getModule(id) が find と同一オブジェクトを返す', () => {
    for (const m of ALL_MODULES) {
      const viaLoader = moduleLoader.getModule(m.moduleId)
      const viaFind = ALL_MODULES.find(x => x.moduleId === m.moduleId)
      assert.ok(
        viaLoader === viaFind,
        `${m.moduleId}: getModule と find の結果が同一参照でない`,
      )
    }
  })

  test('未登録 moduleId で getModule() が undefined を返す', () => {
    assert.equal(moduleLoader.getModule('__not_registered__'), undefined)
    assert.equal(moduleLoader.getModule(''), undefined)
  })

  test('getSearchIndex() が ALL_MODULES.flatMap(buildSearchIndex) と一致する', () => {
    const expected = ALL_MODULES.flatMap(m => buildSearchIndex(m))
    const actual = moduleLoader.getSearchIndex()

    assert.equal(actual.length, expected.length, '検索インデックスの件数が不一致')
    assert.deepEqual(actual, expected, '検索インデックスの内容が不一致')
  })

  test('getSearchIndex() は複数回呼んでも同一の結果を返す（memoize が結果を変えない）', () => {
    const first = moduleLoader.getSearchIndex()
    const second = moduleLoader.getSearchIndex()
    assert.ok(first === second, 'memoize された同一インスタンスが返るべき')
    assert.deepEqual(
      first,
      ALL_MODULES.flatMap(m => buildSearchIndex(m)),
      '2 回目以降も内容が現行と一致すべき',
    )
  })

  test('createBundledModuleLoader は渡した配列をそのまま保持する（複製しない）', () => {
    const subset = ALL_MODULES.slice(0, 3)
    const loader = createBundledModuleLoader(subset)
    assert.ok(loader.getAllModules() === subset, '渡した配列と同一参照を返すべき')
    assert.equal(loader.listModuleIds().length, 3)
    assert.ok(loader.getModule(subset[0].moduleId) === subset[0])
  })
})
