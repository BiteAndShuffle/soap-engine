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

describe('T-U4a-1 primary: item.resolution → primaryNode.resolution の保持経路', () => {
  // Unit 4C-2: activeResolution state / activeResolutionRef は primaryNode state へ
  // 移管された。identifiers を primaryNode / setPrimaryNode / primaryNodeRef へ移すが、
  // 「item.resolution が保持される」という契約自体は変えない。
  test('handleSelectDrugSuggestion 内で setPrimaryNode が item.resolution を primaryNode.resolution へ保持する', () => {
    const start = src.indexOf('const handleSelectDrugSuggestion')
    assert.ok(start >= 0, 'handleSelectDrugSuggestion が見つからない')
    const end = src.indexOf('const handleComposeDrugSelect', start)
    assert.ok(end > start, 'handleComposeDrugSelect が見つからない')
    const region = src.slice(start, end)
    assert.ok(
      region.includes('setPrimaryNode('),
      'handleSelectDrugSuggestion が setPrimaryNode を呼んでいない',
    )
    assert.ok(
      /resolution:\s*item\.resolution/.test(region),
      'handleSelectDrugSuggestion が item.resolution を primaryNode.resolution へ保持していない',
    )
  })

  test('primaryNode state と primaryNodeRef が宣言され ref 同期されている', () => {
    const lines = codeLines(src).map(norm)
    assert.ok(
      lines.some(l => l.includes('const [primaryNode, setPrimaryNode] = useState<ComposeNode>(() => makeInitialPrimaryNode(moduleData))')),
      'primaryNode state が宣言されていない',
    )
    assert.ok(
      lines.some(l => l.includes('const primaryNodeRef = useRef<ComposeNode>(makeInitialPrimaryNode(moduleData))')),
      'primaryNodeRef が宣言されていない',
    )
    assert.ok(
      lines.some(l => l === 'primaryNodeRef.current = primaryNode'),
      'primaryNodeRef が既存の ref 同期ブロックで同期されていない',
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
    rapid: null,
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
    rapid: null,
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
    // resolution を代入するのは「意図した preservation site / lifecycle site」だけである。
    //
    // Unit 4C-2: primaryNode（旧 activeResolution）の write authority が
    // setActiveResolution(...) から setPrimaryNode(...) の object field へ移った。
    // これに伴い「resolution: の代入箇所」自体も 2 箇所から 4 箇所（重複込み）へ増える
    // ——旧実装では関数呼び出し（setActiveResolution(...)）だった箇所が、
    // 新実装ではすべて object field リテラル（resolution: ...）になったため。
    // 契約（許可される代入元）は変わっていない:
    //   1. makeInitialPrimaryNode の初期値（旧: useState の初期値。resolution: undefined）
    //   2. handleSelectDrugSuggestion の setPrimaryNode（旧: setActiveResolution(item.resolution)）
    //   3. handleComposeDrugSelect の node リテラル（item.resolution を node へ保持。不変）
    //   4. handleExpressAdd の setPrimaryNode（旧: setActiveResolution(undefined)。lifecycle reset）
    //
    // いずれも **既存の resolution をそのまま保持 / 初期化 / 明示リセット**するものであり、
    // 新しい source の導入・再生成・fallback の追加ではない。
    // ここに 5 つ目が現れたら、それは新しい resolution consumer / source の疑いがある。
    const assignments = codeLines(src).map(norm).filter(l => /\bresolution:\s/.test(l))
    assert.deepEqual(
      assignments,
      [
        'resolution: undefined,',          // Unit 4C-2: makeInitialPrimaryNode の初期値
        'resolution: item.resolution,',     // Unit 4C-2: handleSelectDrugSuggestion の setPrimaryNode
        'resolution: item.resolution,',     // U-4a: compose node への保持（不変）
        'resolution: undefined,',           // Unit 4C-2: handleExpressAdd の setPrimaryNode（lifecycle reset）
      ],
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
   * 判定は **case-insensitive**（`/resolution/i`）で行う。`resolution: undefined` の
   * ように小文字の `resolution` を含まない行を取りこぼさないためである
   * （旧 `setActiveResolution(undefined)` も同じ理由で case-insensitive にしていた）。
   *
   * **Unit 4C-2 での意図的更新**: activeResolution の write authority が
   * `useState`/`useRef`（専用 state + ref）から `primaryNode` state の 1 field へ
   * 移った。これに伴い:
   *   - state/ref 宣言（旧 #3,#4）・ref 同期行（旧 #10）は消滅
   *     （primaryNodeRef 経由の同期は T-U4a-1 が別途固定する）
   *   - projection の明示 field（旧 `resolution: activeResolution,` #5）と
   *     dependency 行（旧 #6）は `...primaryNode` spread に吸収されて消滅
   *   - 代わりに `const activeResolution = primaryNode.resolution`（derived alias）
   *     と、primaryNode 初期値の `resolution: undefined,` が新規出現
   *   - primary の write（旧 `setActiveResolution(item.resolution)` /
   *     `setActiveResolution(undefined)`）は `setPrimaryNode(...)` の
   *     object field（`resolution: item.resolution,` / `resolution: undefined,`）へ
   *     形を変える（保持 / lifecycle reset という契約自体は不変）
   * 「resolution の使用が保持と gate に限定されている」という契約は変えていない。
   */
  const ALLOWED = [
    // ── 型 import ──
    "import type { BrandResolution } from '../../lib/brandResolution'",
    // ── U-4b: subject resolver の import ──
    "import { resolveDrugSubject, resolveDrugName, resolveSubjectFromResolution } from '../../lib/drugSubject'",
    // ── Unit 4C-2: primaryNode 初期値（旧: useState の初期値） ──
    'resolution: undefined,',
    // ── Unit 4C-2: derived const alias（旧: activeResolution state 宣言） ──
    'const activeResolution = primaryNode.resolution',
    // ── U-5: activeContext の resolution 導出と gate 判定 ──
    //   Unit 4B: primary 分岐を projection 経由へ統一（読み替えのみ。導出規則は不変）
    //   Unit 4C-5 での意図的更新: activeContextResolution はすでに primaryNode と同値の
    //   slice（resolution）しか読んでおらず、primaryNodeProjection 経由は read
    //   responsibility の最小化対象だった（値 parity は T-4C5-P1 が固定）。
    //   primaryNodeProjection → primaryNode への置換（pure alias swap。導出規則は不変）。
    'const activeContextResolution = useMemo<BrandResolution | undefined>(',
    '() => (activeNode ?? primaryNode).resolution,',
    'const subjectUnresolved = isSubjectUnresolvedFor(activeContextResolution)',
    // ── U-5: handlingTags 導出（lib/brandTags.ts へ委譲） ──
    'return resolveBrandHandlingTags(activeContextResolution, brandCatalog, legacyBrandKey)',
    //   Unit 4B: legacyBrandKey も projection 経由になったため dependency が追従
    //   Unit 4C-5: dependency も primaryNode 直参照へ（値 parity は T-4C5-P1 が固定）
    '}, [targetModule, activeNode, primaryNode, activeContextResolution])',
    // ── U-5: SOAP 生成 gate（scenario 提示の遮断） ──
    'if (subjectUnresolved) return []',
    '}, [allGroups, selectedGroup, addonBrandHandlingTags, subjectUnresolved])',
    // ── U-5: brand 固有データアクセス（表示用 resolvedBrand とは分離） ──
    'const tagBrandKey = resolveDataAccessBrandKey(activeResolution, activeBrandName ?? activeModuleData.drug?.brandNames?.[0])',
    'const drugResolution = activeModuleData.drugResolution',
    'if (tagBrandKey && drugResolution) {',
    'for (const tag of drugResolution.brandToTags[tagBrandKey] ?? []) {',
    // ── U-4b: subject を BrandResolution から解決（primary / compose の write site） ──
    'const subject = resolveSubjectFromResolution(item.resolution)',
    // ── Unit 4C-2: 保持（primary 検索経路。旧 setActiveResolution(item.resolution)） ──
    'resolution: item.resolution,',
    "const nodeDrugName = resolveSubjectFromResolution(item.resolution) ?? ''",
    // ── U-4a: 保持（node） ──
    'resolution: item.resolution,',
    // ── Unit 4C-2: lifecycle reset（Express primary 遷移で stale resolution を破棄。
    //    旧 setActiveResolution(undefined)） ──
    'resolution: undefined,',
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

  test('denotation / brandKey がコードに出現しない（分岐は lib へ閉じている）', () => {
    // U-5 / U-4b を通じて維持される。denotation 分岐は lib/brandTags.ts と
    // lib/drugSubject.ts に閉じており、DashboardClient は述語関数・resolver
    // （isSubjectUnresolvedFor / resolveDataAccessBrandKey / resolveSubjectFromResolution）
    // のみを呼ぶ。
    //
    // **U-4b での意図的更新**: resolveSubjectFromResolution は U-4b で production の
    // subject resolver になったため、本リストから外した（0 件ガードは U-4b 未実施の
    // 検出用だった）。denotation / brandKey は引き続き 0 件である。
    const lines = codeLines(src).map(norm)
    for (const token of ['denotation', 'brandKey']) {
      const hits = lines.filter(l => l.includes(token))
      assert.deepEqual(hits, [], `${token} が DashboardClient のコードに出現している: ${hits.join(' / ')}`)
    }
  })

  test('resolution.subject が gate 条件として読まれていない', () => {
    const hits = codeLines(src).map(norm).filter(l => /resolution\??\.subject/.test(l))
    assert.deepEqual(hits, [], `gate が subject を読んでいる: ${hits.join(' / ')}`)
  })

  test('legacy resolver は Express / legacy 非検索経路の分岐に限定されている（U-4b・Owner Decision S-1）', () => {
    // **U-4b での意図的更新**: U-4a/U-5 では「4 件のまま」を U-4b 未実施のガードとして
    // 固定していた。U-4b で検索由来 compose の 1 件が resolution 由来へ移行し 3 件になった。
    //
    // **{{drug_subject}} resolution contract fix での意図的更新**: primary ADDON 分岐が
    // 独自 fallback（?? activeBrandName ?? ''）を使っていた latent contract violation を、
    // scenario本文/Rapid側と同じ `?? resolveDrugName(...)` へ揃えたことで 4 件になった。
    // これは検索由来 write site への回帰ではなく、legacy resolver の適用範囲内での
    // 既存契約遵守（lib/drugSubject.ts）である。
    //
    // Owner Decision S-1-A により production 0 件化は U-4b の目標ではない。
    // 代わりに「残る呼び出しがすべて `?? resolveDrugName(...)` の形、すなわち
    // resolution 由来 subject が存在しないとき（Express / legacy 非検索経路）にのみ
    // 到達する分岐であること」を固定する。
    const calls = codeLines(src).map(norm).filter(l => /resolveDrugName\(/.test(l))
    assert.equal(calls.length, 4, `resolveDrugName の呼び出し数が想定（4件）と異なる: ${calls.length}`)
    const primarySource = calls.filter(l => !l.includes('?? resolveDrugName('))
    assert.deepEqual(
      primarySource,
      [],
      `resolveDrugName が fallback 分岐ではなく主 source として使われている: ${primarySource.join(' / ')}`,
    )
  })
})

describe('T-U4a-6 Express 経路が resolution に触れていない（lifecycle reset を除く）', () => {
  // Unit 4C-2 での意図的更新:
  //   旧実装は Express primary 分岐の resolution リセットを専用関数呼び出し
  //   `setActiveResolution(undefined)` で行っていた。この呼び出しは camelCase の
  //   "Active" が大文字始まりのため、小文字限定の /\bresolution\b/ にも
  //   /activeResolution/（小文字 a 始まり）にもマッチせず、本テストの検出網を
  //   すり抜けていた（=「Express は resolution に触れていない」という assertion は
  //   実際には lifecycle reset を見落としていた）。
  //   Unit 4C-2 でこのリセットが setPrimaryNode の object field
  //   `resolution: undefined,`（小文字 "resolution:"）へ形を変えたことで、
  //   本来あった lifecycle reset が正しく可視化されるようになった。
  //   T-U5-10（tests/brandResolutionGate.test.ts）がこの reset の存在自体を
  //   別途固定しているため、本テストは「reset 以外の resolution 使用が無い」
  //   （denotation 構築や resolution 読み出しが無い）という契約へ更新する。
  test('handleExpressAdd の本文で resolution に触れるのは lifecycle reset（resolution: undefined）のみ', () => {
    const start = src.indexOf('const handleExpressAdd')
    assert.ok(start >= 0, 'handleExpressAdd が見つからない')
    const end = src.indexOf('const handleSwitchToNlp', start)
    assert.ok(end > start, 'handleSwitchToNlp が見つからない')
    const region = codeLines(src.slice(start, end)).map(norm)
    const hits = region.filter(l => /\bresolution\b/.test(l) || /activeResolution/.test(l))
    assert.deepEqual(
      hits,
      ['resolution: undefined,'],
      `Express 経路が resolution に想定外の形で触れている: ${hits.join(' / ')}`,
    )
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
