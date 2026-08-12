/**
 * brandResolutionPlumbing.test.ts — U-4a: BrandResolution の production state 保持
 *
 * 検証対象:
 *   T-U4a-1  handleSelectDrugSuggestion が item.resolution を activeResolution へ保持する
 *   T-U4a-2  handleComposeDrugSelect が item.resolution を ComposeNode.resolution へ保持する
 *   T-U4a-3  resolution 未設定の ComposeNode が型・値の双方で成立する（Express / legacy 後方互換）
 *   T-U4a-4  node の再構築（spread）が resolution の有無をそのまま維持する
 *   T-U4a-5  resolution の consumer が保持経路と U-5 gate 経路に限定されている
 *            （**U-5 で意図的に更新。詳細は当該 describe の JSDoc を参照**）
 *   T-U4a-6  Express 経路が resolution に触れていない
 *
 * 正本:
 *   - 型契約     : lib/brandResolution.ts
 *   - 未解決論点 : docs/OPEN_DESIGN_QUESTIONS.md Q-S2
 *
 * ── 検証方法の限界（明示）────────────────────────────────────
 *
 * 本 Repository には React コンポーネントを実行するテスト基盤が存在しない
 * （tests/ 配下に react / @testing-library / DOM 環境への依存は 0 件）。また U-4a では
 * 「テストのためだけに production の selection logic を純関数へ切り出す refactor」を
 * 禁止している。
 *
 * したがって T-U4a-1 / T-U4a-2 / T-U4a-5 / T-U4a-6 は **production ソースに対する静的検証**
 * であり、runtime 実行による検証ではない（`tests/moduleRegistry.test.ts` が
 * `data/modules/index.ts` のソースに対して行っているのと同じ方式）。
 * T-U4a-3 / T-U4a-4 は型と値で実際に検証している。
 *
 * 静的検証を採る代わりに、許可された出現箇所を**ホワイトリストで完全固定**している。
 * U-4b / U-5 で consumer を追加する際は本テストが必ず FAIL するため、
 * 「U-4a のまま意図せず consumer が増える」ことを防げる。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { ComposeNode, SoapFields } from '../lib/types'
import type { BrandResolution } from '../lib/brandResolution'

const DASHBOARD_PATH = new URL('../app/components/DashboardClient.tsx', import.meta.url)
const src = readFileSync(DASHBOARD_PATH, 'utf-8')

/**
 * コメント行を除去したコード行のみを返す。
 * DashboardClient.tsx は設計意図の記述が多く、コメント中の語（`denotation` 等）を
 * 実装の使用と誤検出しないために必要。
 */
function codeLines(text: string): string[] {
  return text
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (t === '') return false
      if (t.startsWith('//')) return false
      if (t.startsWith('*')) return false
      if (t.startsWith('/*')) return false
      if (t.startsWith('{/*')) return false   // JSX コメント（1行形式）
      return true
    })
}

/** 連続空白を 1 個へ正規化して比較しやすくする */
const norm = (s: string): string => s.trim().replace(/\s+/g, ' ')

const EMPTY_FIELDS: SoapFields = { S: '', O: '', A: '', P: '' }

// ─────────────────────────────────────────────────────────────

describe('T-U4a-1 primary: item.resolution → activeResolution の保持経路', () => {
  test('handleSelectDrugSuggestion 内に setActiveResolution(item.resolution) が存在する', () => {
    const start = src.indexOf('const handleSelectDrugSuggestion')
    assert.ok(start >= 0, 'handleSelectDrugSuggestion が見つからない')
    const end = src.indexOf('const handleComposeDrugSelect', start)
    assert.ok(end > start, 'handleComposeDrugSelect が見つからない')
    const region = src.slice(start, end)
    assert.ok(
      region.includes('setActiveResolution(item.resolution)'),
      'handleSelectDrugSuggestion が item.resolution を保持していない',
    )
  })

  test('activeResolution state と activeResolutionRef が宣言され ref 同期されている', () => {
    const lines = codeLines(src).map(norm)
    assert.ok(
      lines.some(l => l.includes('const [activeResolution, setActiveResolution] = useState<BrandResolution | undefined>(undefined)')),
      'activeResolution state が宣言されていない',
    )
    assert.ok(
      lines.some(l => l.includes('const activeResolutionRef = useRef<BrandResolution | undefined>(undefined)')),
      'activeResolutionRef が宣言されていない',
    )
    assert.ok(
      lines.some(l => l === 'activeResolutionRef.current = activeResolution'),
      'activeResolutionRef が既存の ref 同期ブロックで同期されていない',
    )
  })
})

describe('T-U4a-2 compose: item.resolution → ComposeNode.resolution の保持経路', () => {
  test('handleComposeDrugSelect の node リテラルに resolution: item.resolution が存在する', () => {
    const start = src.indexOf('const handleComposeDrugSelect')
    assert.ok(start >= 0, 'handleComposeDrugSelect が見つからない')
    const end = src.indexOf('const handleSelectNode', start)
    assert.ok(end > start, 'handleSelectNode が見つからない')
    const region = src.slice(start, end)
    assert.ok(
      region.includes('resolution: item.resolution'),
      'handleComposeDrugSelect が item.resolution を node へ保持していない',
    )
  })
})

describe('T-U4a-3 resolution 未設定の ComposeNode が成立する（Express / legacy 後方互換）', () => {
  /** Express（handleExpressAdd）が生成する node と同形。resolution を持たない。 */
  const legacyNode: ComposeNode = {
    id: 'node-legacy',
    moduleId: 'dm_imeglimin_oral',
    scenarioId: '',
    block: { id: 'b1', templateLabel: '', fields: EMPTY_FIELDS, closingText: undefined },
    drugLabel: 'ツイミーグ',
    matchedBrandName: 'ツイミーグ',
    resolvedDrugName: 'ツイミーグ',
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: 'dm',
  }

  test('resolution を省略した ComposeNode が構築でき、値は undefined になる', () => {
    assert.equal(legacyNode.resolution, undefined)
  })

  test('resolution の有無が他フィールドの成立に影響しない', () => {
    assert.equal(legacyNode.matchedBrandName, 'ツイミーグ')
    assert.equal(legacyNode.resolvedDrugName, 'ツイミーグ')
  })

  test('検索由来 node は resolution を保持できる', () => {
    const resolution: BrandResolution = { denotation: 'brand', brandKey: 'ツイミーグ', subject: 'ツイミーグ' }
    const searchNode: ComposeNode = { ...legacyNode, id: 'node-search', resolution }
    assert.equal(searchNode.resolution, resolution)
  })
})

describe('T-U4a-4 node 再構築（spread）が resolution をそのまま維持する', () => {
  const base: ComposeNode = {
    id: 'n1',
    moduleId: 'dm_imeglimin_oral',
    scenarioId: '',
    block: { id: 'b1', templateLabel: '', fields: EMPTY_FIELDS, closingText: undefined },
    drugLabel: 'ツイミーグ',
    selectedAddonIds: [],
    baseLabel: '',
    baseDomain: 'dm',
  }

  test('buildUpdatedNode / handleAddonToggle が使う ...node パターンで resolution が保持される', () => {
    const resolution: BrandResolution = { denotation: 'module', brandKey: null, subject: null }
    const withRes: ComposeNode = { ...base, resolution }
    // production 側の再構築はいずれも `{ ...node, scenarioId, block, ... }` 形式であり
    // resolution を上書きしない（本テストはその前提が言語仕様上成立することを固定する）
    const rebuilt: ComposeNode = { ...withRes, scenarioId: 'sc1', baseLabel: 'X' }
    assert.equal(rebuilt.resolution, resolution)
    assert.equal(rebuilt.scenarioId, 'sc1')
  })

  test('resolution を持たない node は再構築後も undefined のまま', () => {
    const rebuilt: ComposeNode = { ...base, scenarioId: 'sc1' }
    assert.equal(rebuilt.resolution, undefined)
  })

  test('production の再構築箇所が resolution を明示的に上書きしていない', () => {
    // buildUpdatedNode の戻り値と handleAddonToggle の node 更新はいずれも spread 起点であり、
    // resolution を代入するのは handleComposeDrugSelect の node リテラルのみである。
    const assignments = codeLines(src).map(norm).filter(l => /\bresolution:\s/.test(l))
    assert.deepEqual(
      assignments,
      ['resolution: item.resolution,'],
      `resolution を代入している箇所が想定外に存在する: ${assignments.join(' / ')}`,
    )
  })
})

describe('T-U4a-5 resolution の consumer が保持経路と U-5 gate 経路に限定されている', () => {
  /**
   * **U-5 での意図的更新（2026-08-12）**
   *
   * U-4a 時点では「resolution を読む production コードが 0 件」を固定していた。
   * U-5 は resolution を安全 gate の入力として使う Unit であるため、本リストは
   * **設計時に意図した拡張点**として更新する（U-4a の設計メモに明記済み）。
   *
   * 更新後の意味は「resolution の使用が **保持（U-4a）と gate（U-5）に限定**されており、
   * subject 算出（U-4b）へは波及していない」ことの固定である。
   *
   * 判定は **case-insensitive**（`/resolution/i`）で行う。`setActiveResolution(undefined)` の
   * ように小文字の `resolution` を含まない行を取りこぼさないためである。
   */
  const ALLOWED = [
    // ── 型 import ──
    "import type { BrandResolution } from '../../lib/brandResolution'",
    // ── U-4a: 保持 ──
    'const [activeResolution, setActiveResolution] = useState<BrandResolution | undefined>(undefined)',
    'const activeResolutionRef = useRef<BrandResolution | undefined>(undefined)',
    // ── U-5: activeContext の resolution 導出と gate 判定 ──
    'const activeContextResolution = useMemo<BrandResolution | undefined>(',
    '() => (activeNode !== null ? activeNode.resolution : activeResolution),',
    '[activeNode, activeResolution],',
    'const subjectUnresolved = isSubjectUnresolvedFor(activeContextResolution)',
    // ── U-4a: ref 同期 ──
    'activeResolutionRef.current = activeResolution',
    // ── U-5: handlingTags 導出（lib/brandTags.ts へ委譲） ──
    'return resolveBrandHandlingTags(activeContextResolution, brandCatalog, legacyBrandKey)',
    '}, [targetModule, activeNode, activeBrandName, activeModuleData, activeContextResolution])',
    // ── U-5: SOAP 生成 gate（scenario 提示の遮断） ──
    'if (subjectUnresolved) return []',
    '}, [allGroups, selectedGroup, addonBrandHandlingTags, subjectUnresolved])',
    // ── U-5: brand 固有データアクセス（表示用 resolvedBrand とは分離） ──
    'const tagBrandKey = resolveDataAccessBrandKey(activeResolution, activeBrandName ?? activeModuleData.drug?.brandNames?.[0])',
    'const drugResolution = activeModuleData.drugResolution',
    'if (tagBrandKey && drugResolution) {',
    'for (const tag of drugResolution.brandToTags[tagBrandKey] ?? []) {',
    // ── U-4a: 保持（primary / node） ──
    'setActiveResolution(item.resolution)',
    'resolution: item.resolution,',
    // ── U-5: lifecycle reset（Express primary 遷移で stale resolution を破棄） ──
    'setActiveResolution(undefined)',
    // ── U-5: gate の描画反映 ──
    'availableGroups={drugSelected && !subjectUnresolved ? availableGroups : new Set()}',
    '{drugSelected && subjectUnresolved ? (',
  ]

  test('resolution 関連のコード行が許可リストと完全一致する', () => {
    const hits = codeLines(src)
      .map(norm)
      .filter(l => /resolution/i.test(l) || /subjectUnresolved|tagBrandKey/.test(l))
    assert.deepEqual(
      hits,
      ALLOWED,
      'ホワイトリスト外で resolution が使用されている（U-4b の consumer 追加はここで検出される）',
    )
  })

  test('activeResolutionRef.current が読み出されていない（U-4b 未実施のガード）', () => {
    // U-5 の gate は render scope の state を読むため ref を必要としない。
    // ref の読み出しが現れるのは callback から subject を解決する U-4b の時点である。
    const reads = codeLines(src)
      .map(norm)
      .filter(l => l.includes('activeResolutionRef.current') && !l.startsWith('activeResolutionRef.current ='))
    assert.deepEqual(reads, [], `activeResolutionRef.current が読み出されている: ${reads.join(' / ')}`)
  })

  test('denotation / brandKey / resolveSubjectFromResolution がコードに出現しない', () => {
    // U-5 でも維持される。denotation 分岐は lib/brandTags.ts に閉じており、
    // DashboardClient は述語関数（isSubjectUnresolvedFor / resolveDataAccessBrandKey）
    // のみを呼ぶ。resolveSubjectFromResolution の 0 件は U-4b 未実施のガードである。
    const lines = codeLines(src).map(norm)
    for (const token of ['denotation', 'brandKey', 'resolveSubjectFromResolution']) {
      const hits = lines.filter(l => l.includes(token))
      assert.deepEqual(hits, [], `${token} が DashboardClient のコードに出現している: ${hits.join(' / ')}`)
    }
  })

  test('resolution.subject が gate 条件として読まれていない', () => {
    const hits = codeLines(src).map(norm).filter(l => /resolution\??\.subject/.test(l))
    assert.deepEqual(hits, [], `gate が subject を読んでいる: ${hits.join(' / ')}`)
  })

  test('legacy subject resolver が引き続き production consumer を持つ（U-4b 未実施の確認）', () => {
    // U-4a は consumer migration を行わない。resolveDrugName の呼び出しが残っていることを
    // 積極的に固定し、「U-4a のつもりで U-4b を混ぜてしまう」ことを検出する。
    const calls = codeLines(src).map(norm).filter(l => /resolveDrugName\(/.test(l))
    assert.equal(calls.length, 4, `resolveDrugName の呼び出し数が U-4a 前提（4件）と異なる: ${calls.length}`)
  })
})

describe('T-U4a-6 Express 経路が resolution に触れていない', () => {
  test('handleExpressAdd の本文に resolution が出現しない', () => {
    const start = src.indexOf('const handleExpressAdd')
    assert.ok(start >= 0, 'handleExpressAdd が見つからない')
    const end = src.indexOf('const handleSwitchToNlp', start)
    assert.ok(end > start, 'handleSwitchToNlp が見つからない')
    const region = codeLines(src.slice(start, end)).map(norm)
    const hits = region.filter(l => /\bresolution\b/.test(l) || /activeResolution/.test(l))
    assert.deepEqual(hits, [], `Express 経路が resolution に触れている: ${hits.join(' / ')}`)
  })

  test('expressCandidates の構築にも resolution が出現しない', () => {
    const start = src.indexOf('const expressCandidates')
    assert.ok(start >= 0, 'expressCandidates が見つからない')
    const end = src.indexOf('const badge = activeModuleData.categoryPath', start)
    assert.ok(end > start, 'expressCandidates の終端が特定できない')
    const region = codeLines(src.slice(start, end)).map(norm)
    const hits = region.filter(l => /\bresolution\b/.test(l) || /activeResolution/.test(l))
    assert.deepEqual(hits, [], `expressCandidates が resolution に触れている: ${hits.join(' / ')}`)
  })
})
