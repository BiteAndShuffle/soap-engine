/**
 * moduleRegistry.test.ts
 *
 * `data/modules/` のファイルシステム実体と `data/modules/index.ts` のレジストリ登録が
 * 一致していることを検査する。
 *
 * ── 設計意図（新しい Repository 規則は追加していない）─────────────────────
 *
 * 「モジュール JSON は `data/modules/index.ts` へ登録されなければならない」という規則は、
 * `prompts/vNext/PN8-Build-Runtime-Release.md`「module registry 登録確認」が既に定めている
 * （未登録 → RELEASE_HOLD。「tsc / build が成功しても registry 未登録ではアプリ上に
 * モジュールが表示されない」と明記）。**本テストはその既存規則を機械的に担保する層を
 * 追加したにすぎず、新しい規則を導入するものではない。** 規則の宣言元は引き続き PN8 である。
 *
 * ── なぜ機械層が必要か ───────────────────────────────────────────────
 *
 * Repository 内の品質ゲートはすべて `index.ts` を単一の入力源としている:
 *   - `lib/moduleValidator.ts` / `lib/crossModuleValidator.ts` → `ALL_MODULES` を走査
 *   - `scripts/audit-*.ts` → `scripts/auditShared.ts` の `listModuleIds()` が
 *     index.ts のソースを正規表現で読む（ファイルシステムは見ない）
 *   - `npm test` の既存テスト群 → `ALL_MODULES` 由来
 *   - `npx tsc` / `npm run build` → 参照されない JSON は型検査・ビルド対象に入らない
 *
 * したがって JSON を追加したが index.ts への登録だけ漏れた場合、**すべてのゲートで同時に
 * 不可視になり、エラーも警告も一切出ない**。本テストは Repository で唯一
 * ファイルシステム側からモジュールを列挙し、両者の乖離を検出する。
 *
 * 実行:
 *   npx tsx --test tests/moduleRegistry.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { ALL_MODULES } from '../data/modules/index'

const MODULES_DIR = path.resolve('./data/modules')

/** data/modules/ 配下の *.json をファイルシステムから列挙し、拡張子を除いた basename を返す */
function listJsonBasenames(): string[] {
  return fs
    .readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .sort()
}

function registeredModuleIds(): string[] {
  return ALL_MODULES.map(m => m.moduleId).sort()
}

const indexSrc = fs.readFileSync(path.join(MODULES_DIR, 'index.ts'), 'utf-8')

describe('モジュールレジストリ整合（F-6 / PN8 登録必須ルールの機械的担保）', () => {
  test('data/modules/*.json の件数と ALL_MODULES.length が一致する', () => {
    const files = listJsonBasenames()
    assert.equal(
      ALL_MODULES.length,
      files.length,
      `JSON ファイル数 ${files.length} と ALL_MODULES 登録数 ${ALL_MODULES.length} が不一致。` +
        `index.ts への登録漏れ、または孤立 JSON が存在する`,
    )
  })

  test('JSON ファイル名の集合と ALL_MODULES の moduleId 集合が一致する', () => {
    const files = listJsonBasenames()
    const registered = registeredModuleIds()

    const unregistered = files.filter(f => !registered.includes(f))
    const orphaned = registered.filter(id => !files.includes(id))

    assert.deepEqual(
      registered,
      files,
      `レジストリとファイルシステムが不一致。\n` +
        `  未登録（JSON はあるが index.ts に無い）: ${unregistered.length ? unregistered.join(', ') : 'なし'}\n` +
        `  実体なし（index.ts にあるが JSON が無い）: ${orphaned.length ? orphaned.join(', ') : 'なし'}`,
    )
  })

  test('各 JSON のファイル名と moduleId フィールドが一致する', () => {
    const mismatches: string[] = []
    for (const base of listJsonBasenames()) {
      const raw = fs.readFileSync(path.join(MODULES_DIR, `${base}.json`), 'utf-8')
      const moduleId = (JSON.parse(raw) as { moduleId?: unknown }).moduleId
      if (moduleId !== base) mismatches.push(`${base}.json → moduleId: ${String(moduleId)}`)
    }
    assert.deepEqual(
      mismatches,
      [],
      `ファイル名と moduleId が不一致:\n  ${mismatches.join('\n  ')}`,
    )
  })

  test('index.ts の import 数と ALL_MODULES 配列エントリ数が一致する', () => {
    const imports = [...indexSrc.matchAll(/^import\s+(\w+)\s+from\s+'\.\/[\w]+\.json'/gm)].map(m => m[1])
    const entries = [...indexSrc.matchAll(/^\s+(\w+) as unknown as ModuleData,/gm)].map(m => m[1])

    assert.equal(
      entries.length,
      imports.length,
      `import ${imports.length} 件に対し ALL_MODULES 配列エントリ ${entries.length} 件。` +
        `import したが配列へ追加していない、またはその逆が存在する`,
    )

    const notInArray = imports.filter(i => !entries.includes(i))
    assert.deepEqual(
      notInArray,
      [],
      `import されているが ALL_MODULES 配列に含まれていない: ${notInArray.join(', ')}`,
    )
  })

  test('検出ロジックの健全性: 登録を1件欠いた集合は不一致として検出される', () => {
    // 実データではなく意図的に壊した集合で、検査が実際に差分を捕まえることを確認する
    // （tests/moduleValidator.test.ts と同じ「壊したデータでテストする」方針）
    const files = listJsonBasenames()
    const brokenRegistry = registeredModuleIds().slice(1)

    assert.notEqual(
      brokenRegistry.length,
      files.length,
      '登録を1件欠いた集合は件数不一致として検出されなければならない',
    )
    assert.notDeepEqual(
      brokenRegistry,
      files,
      '登録を1件欠いた集合は集合不一致として検出されなければならない',
    )
  })
})
