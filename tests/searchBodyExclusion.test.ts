/**
 * searchBodyExclusion.test.ts
 *
 * SOAP 本文が検索コーパスおよび Search Manifest へ混入しないことを保証する。
 * 設計根拠: docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md §7.1b（D-S4-6）
 *
 * ── 独立テストとする理由（D-S4-6）────────────────────────────────
 *
 * SOAP 本文の非混入は F-1 の重要なアーキテクチャ境界である。
 * 「本文が混入した」という失敗理由が parity の失敗と混ざらず、
 * **単独で識別できる状態**を維持するため、tests/searchManifestParity.test.ts へ
 * 統合せず独立ファイルとして保持する。fixture / helper の共有は許可されている。
 *
 * ── 本ファイルが担うテスト ──────────────────────────────────────
 *
 *   T-2  intentional loss
 *        SOAP 本文にのみ存在する語句では検索到達できないことを**仕様として固定**する。
 *        これは欠陥ではなく Owner 判断（D-F1-1）による意図的な喪失である。
 *
 *   T-6  SOAP 本文の非混入保証
 *        検索インデックスおよび manifest に S / O / A / P・xStructured の本文が
 *        一切含まれないことを検証する。
 *        Commit ⑤ で **commit 済み data/search-manifest.json 側の検証**を追加した。
 *        manifest は moduleLoader.getSearchIndex() の入力そのものであるため、
 *        ここでの非混入がそのまま検索インデックスの非混入の前提条件になる。
 *
 * 実行:
 *   npx tsx --test tests/searchBodyExclusion.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { ALL_MODULES } from '../data/modules/index'
import { buildSearchIndex, getDrugSuggestions, normalizeText } from '../lib/search'

const searchIndex = ALL_MODULES.flatMap(m => buildSearchIndex(m))
const serializedIndex = JSON.stringify(searchIndex)

/**
 * commit 済みの Search Manifest（**再生成せずファイルの内容をそのまま読む**）。
 * moduleLoader.getSearchIndex() の実入力であるため、この生テキストに対して
 * 本文が 1 文字も含まれないことを検証する。
 */
const serializedManifest = fs.readFileSync(path.resolve('./data/search-manifest.json'), 'utf8')

/** 全シナリオの S / O / A / P を正規化して列挙する */
function collectBodyTokens(minLength = 8): string[] {
  const out: string[] = []
  for (const m of ALL_MODULES) {
    for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
      for (const v of [s.S, s.O, s.A, s.P]) {
        const t = normalizeText(v ?? '')
        if (t && t.length >= minLength) out.push(t)
      }
    }
  }
  return out
}

/** 全シナリオの xStructured text を正規化して列挙する */
function collectStructuredTexts(minLength = 8): string[] {
  const out: string[] = []
  for (const m of ALL_MODULES) {
    for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
      for (const key of ['SStructured', 'AStructured', 'PStructured']) {
        for (const entry of (s[key] ?? []) as Array<Record<string, any>>) {
          const t = normalizeText(entry?.text ?? '')
          if (t && t.length >= minLength) out.push(t)
        }
      }
    }
  }
  return out
}

describe('T-6 SOAP 本文の非混入保証（検索インデックス）', () => {
  test('S / O / A / P 本文が corpusTokens へ一切混入しない', () => {
    const bodies = collectBodyTokens()
    assert.ok(bodies.length > 1000, `検査対象の本文が想定より少ない: ${bodies.length}`)

    const leaked = bodies.filter(t => serializedIndex.includes(t))
    assert.deepEqual(
      leaked.slice(0, 5),
      [],
      `SOAP 本文が検索インデックスへ混入している（${leaked.length}/${bodies.length} 件）`,
    )
  })

  test('SStructured / AStructured / PStructured の text が混入しない', () => {
    const texts = collectStructuredTexts()
    assert.ok(texts.length > 1000, `検査対象の xStructured text が想定より少ない: ${texts.length}`)

    const leaked = texts.filter(t => serializedIndex.includes(t))
    assert.deepEqual(
      leaked.slice(0, 5),
      [],
      `xStructured の本文が検索インデックスへ混入している（${leaked.length}/${texts.length} 件）`,
    )
  })

  test('addonsRef が SearchEntry へ持ち込まれていない', () => {
    assert.ok(
      !serializedIndex.includes('addonsRef'),
      'SearchEntry に addonsRef が含まれている',
    )
  })

  test('corpusTokens は scenario.title / scenarioGroup と global コーパスのみで構成される', () => {
    // 本文除去後、per-scenario 由来のトークンは title と scenarioGroup の 2 種のみ。
    // 各エントリの corpusTokens に title が含まれることを確認する（回帰検知）。
    const scenarioTitleById = new Map<string, string>()
    for (const m of ALL_MODULES) {
      for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
        scenarioTitleById.set(s.globalId, normalizeText(s.title ?? ''))
      }
    }

    const missing: string[] = []
    for (const e of searchIndex) {
      const title = scenarioTitleById.get(e.templateId)
      if (title && !e.corpusTokens.includes(title)) missing.push(e.templateId)
    }
    assert.deepEqual(missing.slice(0, 5), [], 'title が corpusTokens から欠落している')
  })
})

describe('T-6 SOAP 本文の非混入保証（Search Manifest）', () => {
  test('S / O / A / P 本文が manifest へ一切混入しない', () => {
    // 正規化前の生テキストで検査する（manifest は生成時に正規化しないため、
    // 混入するとすれば canonical の原文そのものの形で現れる）。
    const raws: string[] = []
    for (const m of ALL_MODULES) {
      for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
        for (const v of [s.S, s.O, s.A, s.P]) {
          if (typeof v === 'string' && v.trim().length >= 8) raws.push(v.trim())
        }
      }
    }
    assert.ok(raws.length > 1000, `検査対象の本文が想定より少ない: ${raws.length}`)

    const leaked = raws.filter(t => serializedManifest.includes(t))
    assert.deepEqual(
      leaked.slice(0, 5),
      [],
      `SOAP 本文が manifest へ混入している（${leaked.length}/${raws.length} 件）`,
    )
  })

  test('SStructured / AStructured / PStructured の text が manifest へ混入しない', () => {
    const texts: string[] = []
    for (const m of ALL_MODULES) {
      for (const s of m.scenarios as unknown as Array<Record<string, any>>) {
        for (const key of ['SStructured', 'AStructured', 'PStructured']) {
          for (const entry of (s[key] ?? []) as Array<Record<string, any>>) {
            const t = entry?.text
            if (typeof t === 'string' && t.trim().length >= 8) texts.push(t.trim())
          }
        }
      }
    }
    assert.ok(texts.length > 1000, `検査対象の xStructured text が想定より少ない: ${texts.length}`)

    const leaked = texts.filter(t => serializedManifest.includes(t))
    assert.deepEqual(
      leaked.slice(0, 5),
      [],
      `xStructured の本文が manifest へ混入している（${leaked.length}/${texts.length} 件）`,
    )
  })

  test('本文系・参照系のキーが manifest に存在しない', () => {
    // schema 逸脱（allowlist 外のフィールドが混入する回帰）を検出する。
    // キー形（`"S":`）で検査する。文字列値に同じ語が現れても誤検知しない。
    const forbiddenKeys = [
      '"S":', '"O":', '"A":', '"P":',
      '"SStructured":', '"AStructured":', '"PStructured":',
      '"addonsRef":', '"mergePolicy":', '"sComposition":',
    ]
    const found = forbiddenKeys.filter(k => serializedManifest.includes(k))
    assert.deepEqual(found, [], `manifest に持ち込み禁止のキーが含まれている: ${found.join(', ')}`)
  })

  test('manifest の scenario は 9 フィールドの allowlist のみで構成される', () => {
    const manifest = JSON.parse(serializedManifest) as {
      scenarios: Array<Record<string, unknown>>
    }
    const allowed = new Set([
      'moduleId', 'globalId', 'id', 'title', 'scenarioGroup',
      'scenarioTags', 'sideEffectPresence', 'intentTags', 'sCompositionIntent',
    ])
    const extra = new Set<string>()
    for (const s of manifest.scenarios) {
      for (const k of Object.keys(s)) if (!allowed.has(k)) extra.add(k)
    }
    assert.deepEqual([...extra], [], `allowlist 外のフィールドが含まれている: ${[...extra].join(', ')}`)
  })
})

describe('T-2 intentional loss（SOAP 本文検索の意図的な喪失を仕様として固定）', () => {
  test('本文にのみ存在する語句では検索到達できない', () => {
    // 本文の中間部分を切り出したフラグメントは、構造化メタデータには現れない。
    // これらで候補が返らないことが「本文検索を持たない」ことの証明になる。
    const scMap = new Map<string, Record<string, any>>()
    for (const m of ALL_MODULES) {
      for (const s of m.scenarios as unknown as Array<Record<string, any>>) scMap.set(s.globalId, s)
    }

    const bodyOnlyFragments: string[] = []
    for (const e of searchIndex) {
      const sc = scMap.get(e.templateId)
      if (!sc) continue
      for (const v of [sc.S, sc.O, sc.A, sc.P]) {
        const t = normalizeText(v ?? '')
        if (t.length < 20) continue
        const frag = t.slice(6, 18)
        // 構造化トークンのいずれにも含まれないフラグメントのみ採用する
        if (!e.corpusTokens.some(tok => tok.includes(frag))) {
          bodyOnlyFragments.push(frag)
          break
        }
      }
      if (bodyOnlyFragments.length >= 20) break
    }

    assert.ok(bodyOnlyFragments.length > 0, '本文限定フラグメントを抽出できなかった')

    const stillReachable = bodyOnlyFragments.filter(f => getDrugSuggestions(f, searchIndex, 8).length > 0)
    assert.deepEqual(
      stillReachable,
      [],
      `本文限定の語句で到達できてしまう（本文検索が復活している可能性）: ${stillReachable.join(', ')}`,
    )
  })

  test('構造化メタデータ由来の検索は失われていない（喪失範囲の限定を確認）', () => {
    // intentional loss が「本文由来のみ」に限定され、
    // brand / generic / alias / 剤形 / 薬効領域 が巻き添えになっていないことを確認する。
    const probes = [
      'リベルサス', 'ヒルドイド', 'インタール',
      'セマグルチド', 'ヘパリン類似物質', 'クロモグリク酸',
      'りべるさす', 'ひるどいど',
      'クリーム', '点眼', '注射', '内服',
      '糖尿病', 'アレルギー', '皮膚科',
    ]
    const unreachable = probes.filter(q => getDrugSuggestions(q, searchIndex, 8).length === 0)
    assert.deepEqual(unreachable, [], `構造化検索語が到達不能になっている: ${unreachable.join(', ')}`)
  })
})
