/**
 * rapidNodeStateSafety.test.ts — Unit 0 / RAPID-V2-06 回帰テスト
 *
 * 守る契約:
 *   「Node を開く・再訪する・editing 対象を切り替えるだけでは
 *     Node の内容を変更してはならない。editingNodeId は UI-only state である」
 *
 * 防ぐ回帰（Critical-1）:
 *   1剤目シナリオ再構築 useEffect の dependency に editingNodeId が含まれていると、
 *   editingNodeId が non-null → null へ戻るだけで effect が再発火し、
 *   primary を素のシナリオから作り直して Rapid 適用文と ADDON を破棄する。
 *
 *   最小再現（修正前）:
 *     単剤で Rapid + ADDON 適用 → 2剤目を追加 → node bar の1剤目をクリック
 *     → Rapid 文と ADDON が無警告で消失
 *
 * テスト手法について:
 *   この回帰は React の useEffect dependency に起因するため、純粋関数として
 *   切り出せない。本リポジトリには React renderer（@testing-library/react 等）が
 *   導入されていないため、既存の DashboardClient ソース契約テスト
 *   （tests/brandResolutionSubjectMigration.test.ts）と同じ方式で、
 *   production ソースに対する構造アサーションとして固定する。
 *   production ロジックを test 側へ複製する mirror 実装は行わない（RAPID-V2-20）。
 *
 * 実行:
 *   npx tsx --test tests/rapidNodeStateSafety.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(
  new URL('../app/components/DashboardClient.tsx', import.meta.url),
  'utf-8',
)

/**
 * 1剤目シナリオ再構築 useEffect の本体を、開始コメントから dependency 配列までを
 * 含む形で切り出す。アンカーが見つからない場合は明示的に失敗させる
 * （コメント文言のリファクタで無言に検証が無効化されるのを防ぐ）。
 */
function extractPrimaryRebuildEffect(): string {
  const START = '// 1剤目シナリオ切替時に primaryBaseFields を初期化'
  const startIdx = src.indexOf(START)
  assert.notEqual(
    startIdx, -1,
    '1剤目シナリオ再構築 useEffect の開始アンカーが見つからない。' +
    'アンカーコメントを変更した場合は本テストも更新すること',
  )
  // effect の終端 = 開始位置以降で最初に現れる useEffect の dependency 配列行
  const depsMatch = src.slice(startIdx).match(/\n\s*\}, \[[^\]]*\]\)/)
  assert.ok(
    depsMatch,
    '1剤目シナリオ再構築 useEffect の dependency 配列が見つからない',
  )
  return src.slice(startIdx, startIdx + depsMatch!.index! + depsMatch![0].length)
}

/**
 * コメントを除いた実装本体だけを取り出す。
 * 「識別子が実装コードに存在しない」ことを検証する assertion が、
 * 説明コメント中の言及（旧識別子への言及等）を誤検出しないようにする。
 * tests/deriveNodeFieldsUnit2B.test.ts と同じ実装。
 */
function codeOnly(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')   // ブロックコメント
    .replace(/^[ \t]*\/\/.*$/gm, '')    // 行コメント
}

/** 切り出した effect から dependency 配列の中身（生文字列）を取り出す */
function extractDeps(effectBlock: string): string {
  const m = effectBlock.match(/\}, \[([^\]]*)\]\)\s*$/)
  assert.ok(m, 'dependency 配列を解析できない')
  return m![1]
}

describe('Unit 0 / RAPID-V2-06: editingNodeId は 1剤目再構築のトリガにならない', () => {
  test('1剤目再構築 useEffect の dependency は primaryNode.scenarioId のみである', () => {
    // Unit 4C-3: deps が selectedScenarioId（旧 useState）から primaryNode.scenarioId
    // （primaryNode state の member access）へ移った。「単一の scenario ID 値でのみ
    // 発火し、editingNodeId や primaryNode 全体では発火しない」という契約は不変。
    const deps = extractDeps(extractPrimaryRebuildEffect())
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    assert.deepEqual(
      deps, ['primaryNode.scenarioId'],
      '1剤目再構築 useEffect の dependency は [primaryNode.scenarioId] でなければならない。' +
      `実際: [${deps.join(', ')}]`,
    )
  })

  test('dependency に editingNodeId が含まれない（Critical-1 の直接ガード）', () => {
    const deps = extractDeps(extractPrimaryRebuildEffect())

    assert.ok(
      !/\beditingNodeId\b/.test(deps),
      'dependency に editingNodeId を含めてはならない。' +
      '含めると editingNodeId が non-null → null に戻るだけで effect が再発火し、' +
      'primary の Rapid 適用文と ADDON が無警告で破棄される（Critical-1）',
    )
  })

  test('シナリオ切替時にノード編集中なら primary を触らない early return は維持されている', () => {
    const effect = extractPrimaryRebuildEffect()

    assert.ok(
      /if \(editingNodeId !== null\) return/.test(effect),
      'early return ガードが失われている。dependency から外したうえでガードも消すと、' +
      'ノード編集中にシナリオが切り替わった場合に primary を再構築してしまう',
    )
  })

  test('effect 本体は依然として scenario 変更時に primary を再構築する', () => {
    const effect = extractPrimaryRebuildEffect()

    // scenario 変更時の再構築責務（Unit 0 では変更しない）が残っていること。
    // Unit 4C-4: 「deriveRawFields(primaryScenario, activeModuleData, [], carriedRapid,
    // primaryDrugName) を直接呼ぶ」という Unit 2B 時点の実装詳細は、
    // primary の write site が rebuildPrimary（lib/primaryNode.ts）へ一本化されたことで
    // 消滅した。rebuildPrimary の rawFields は deriveRawFields と常に同値
    // （tests/primaryNodeWritableUnit4C.test.ts の T-4C4-F1-1 が値レベルで固定する）
    // であるため「scenario 変更時に primary を再構築する」という契約自体は不変。
    // ここでは rebuildPrimary が正しい引数（scenario: primaryScenario / addonIds: [] /
    // drugName: primaryDrugName）で呼ばれていることを検証する。
    assert.ok(
      /setPrimaryNode\(prev => rebuildPrimary\(\{/.test(effect),
      'scenario 変更時の primary 再構築（rebuildPrimary 呼び出し）が失われている',
    )
    assert.ok(
      /scenario: primaryScenario,/.test(effect),
      'rebuildPrimary へ primaryScenario が渡されていない',
    )
    assert.ok(
      /addonIds: \[\],/.test(effect),
      'rebuildPrimary へ addonIds: [] が渡されていない（addon なしで再構築する契約）',
    )
    assert.ok(
      /drugName: primaryDrugName,/.test(effect),
      'rebuildPrimary へ primaryDrugName が渡されていない',
    )
    // Unit 4C-4: rawPrimaryFieldsRef は廃止され、rawFields の write authority は
    // rebuildPrimary が返す block.rawFields（primaryNode.block.rawFields）へ移管された。
    // 「effect が primary の rawFields を更新する」という契約自体は不変であり、
    // その保存先が primaryNode.block へ変わったことを確認する。
    assert.ok(
      !/rawPrimaryFieldsRef/.test(codeOnly(effect)),
      'rawPrimaryFieldsRef は Unit 4C-4 で廃止されたはずだが、まだ実装コードに参照が残っている',
    )
    // Unit 4C-3: setPrimaryAddonIds(new Set()) は setSelectedAddonIds(new Set()) へ
    // 移った（primaryAddonIds の write authority が primaryNode へ移管されたため）。
    // selectedAddonIds: [] は rebuildPrimary への addonIds: [] 経由で primaryNode.block
    // 側へ反映される（上の assertion で検証済み）。ADDON reset の契約自体は不変。
    assert.ok(
      /setSelectedAddonIds\(new Set\(\)\)/.test(effect),
      'scenario 変更時の ADDON reset（UI buffer 側）が失われている',
    )
  })
})

describe('Unit 0: Node 操作 handler の primary ADDON 復元意図が保たれている', () => {
  /**
   * 以下の handler は「1剤目へ戻る／ノードを外す」操作であり、いずれも
   * setSelectedAddonIds(primaryAddonIdsRef.current) で1剤目の ADDON 選択を復元する。
   * Critical-1 では、この復元直後に useEffect が再発火して ADDON を空へ戻していた。
   * handler 側の意図が失われていないことを固定する。
   */
  const RESTORE_CALL = 'setSelectedAddonIds(primaryAddonIdsRef.current)'

  test('primary ADDON を復元する handler が 4 箇所以上存在する', () => {
    const count = src.split(RESTORE_CALL).length - 1
    assert.ok(
      count >= 4,
      `${RESTORE_CALL} は Node 操作 handler 群（handleSelectPrimaryNode / ` +
      `handleSelectNode 解除 / handleRemoveComposeNode / handleResetCompose / ` +
      `handleExpressAdd ノードトグルオフ）に存在するはず。実際: ${count} 箇所`,
    )
  })

  test('handleSelectPrimaryNode は primary の内容を再構築しない', () => {
    const startIdx = src.indexOf('const handleSelectPrimaryNode = useCallback')
    assert.notEqual(startIdx, -1, 'handleSelectPrimaryNode が見つからない')
    const endIdx = src.indexOf('const handleSelectScenario = useCallback', startIdx)
    assert.notEqual(endIdx, -1, 'handleSelectPrimaryNode の終端が見つからない')
    const block = src.slice(startIdx, endIdx)

    assert.ok(
      !/buildNodeFields\(/.test(block),
      'handleSelectPrimaryNode が buildNodeFields を呼んではならない（内容再構築の禁止）',
    )
    // Unit 4C-4: rawPrimaryFieldsRef は廃止された。旧 assertion
    // （!/rawPrimaryFieldsRef\.current =/）は識別子消滅により vacuous 化するため、
    // 「primary の内容（block）を再構築しない」という契約そのものを、現在の write
    // authority である setPrimaryNode の非呼び出しで直接検証する（rebuildPrimary /
    // setPrimaryNode いずれも handleSelectPrimaryNode からは呼ばれない）。
    assert.ok(
      !/setPrimaryNode\(/.test(block),
      'handleSelectPrimaryNode が primaryNode（block を含む）を書き換えてはならない',
    )
    assert.ok(
      !/rebuildPrimary\(/.test(block),
      'handleSelectPrimaryNode が rebuildPrimary を呼んではならない（内容再構築の禁止）',
    )
    assert.ok(
      !/setPrimaryAddonIds\(new Set\(\)\)/.test(block),
      'handleSelectPrimaryNode が primary の ADDON 選択を空にしてはならない',
    )
  })
})
