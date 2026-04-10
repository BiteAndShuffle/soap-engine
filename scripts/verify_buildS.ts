/**
 * verify_buildS.ts（修正版）
 *
 * buildS の reason統合ルール: mergeBlocks に currentGroupKey/currentClinicalDomain を渡す形で検証。
 */

import * as fs from 'fs'
import * as path from 'path'
import { mergeBlocks, buildNodeFields } from '../lib/buildSoap'
import type { ModuleData, SoapFields, MergedBlock } from '../lib/types'

const OK   = (s: string) => `\x1b[32m✅ ${s}\x1b[0m`
const FAIL = (s: string) => `\x1b[31m❌ ${s}\x1b[0m`
const HEAD = (s: string) => `\n\x1b[1m\x1b[34m── ${s} ──\x1b[0m`
const INFO = (s: string) => `   ${s}`

let pass = 0, fail = 0
function check(label: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(OK(label)) }
  else { fail++; console.log(FAIL(label + (detail ? `: ${detail}` : ''))) }
}

const ROOT = path.resolve(__dirname, '..')
function loadMod(f: string): ModuleData {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/modules', f), 'utf-8')) as ModuleData
}
const oralMod = loadMod('dm_glp1ra_semaglutide_oral.json')
const injMod  = loadMod('dm_glp1ra_injection.json')

function makeBlock(
  s: string, groupKey: string, clinicalDomain: string,
  opts: Partial<MergedBlock> = {},
): MergedBlock {
  return {
    id: `blk-${Math.random()}`,
    templateLabel: '',
    fields: { S: s, O: '', A: '', P: '' },
    groupKey, clinicalDomain, ...opts,
  }
}

const EMPTY: SoapFields = { S: '', O: '', A: '', P: '' }

// ── mergeBlocks ラッパー: currentGroupKey / currentClinicalDomain を明示的に渡す ─
function merge(
  currentS: string,
  currentGroupKey: string,
  currentClinicalDomain: string,
  blocks: MergedBlock[],
): string {
  return mergeBlocks(
    blocks,
    { S: currentS, O: '', A: '', P: '' },
    '',
    undefined,
    undefined,
    currentGroupKey,
    currentClinicalDomain,
  ).S
}

// ══════════════════════════════════════════════════════════════
// A. 同一 clinicalDomain × 同一 groupKey → 最初の1件のみ
// ══════════════════════════════════════════════════════════════
console.log(HEAD('A. 同一 clinicalDomain × 同一 groupKey → 最初の1件'))
{
  const b2 = makeBlock('HbA1cが高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes')
  const s = merge('血糖値が高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes', [b2])

  console.log(INFO(`S: "${s}"`))
  const lines = s.split('\n').filter(Boolean)
  check('A: reason が1行のみ', lines.length === 1, `${lines.length}行: ${JSON.stringify(lines)}`)
  check('A: 最初の1件（b1）が採用', s.includes('血糖値が高いため'), s)
  check('A: 2件目（b2）は捨てられる', !s.includes('HbA1cが高いため'), s)
}

// ══════════════════════════════════════════════════════════════
// A2. 同一テキスト × 同一 groupKey → 1件（旧来の重複排除も維持）
// ══════════════════════════════════════════════════════════════
console.log(HEAD('A2. 同一テキスト × 同一 groupKey → 1件'))
{
  const b2 = makeBlock('血糖値が高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes')
  const s = merge('血糖値が高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes', [b2])

  console.log(INFO(`S: "${s}"`))
  const lines = s.split('\n').filter(Boolean)
  check('A2: reason が1行のみ（同テキスト同 groupKey）', lines.length === 1, JSON.stringify(lines))
}

// ══════════════════════════════════════════════════════════════
// B. 同一 clinicalDomain × 異なる groupKey → 各1件・別行
// ══════════════════════════════════════════════════════════════
console.log(HEAD('B. 同一 clinicalDomain × 異なる groupKey → 各1件別行'))
{
  // 「効果不十分のため増量となった。」は decision に分類される（増量となった）
  // groupKey が違う reason の例として「別の追加理由」を使う
  const b2 = makeBlock('合併症予防のため、薬が追加となった。', 'lifestyle_guidance', 'diabetes')
  const s = merge('血糖値が高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes', [b2])

  console.log(INFO(`S: "${s}"`))
  const lines = s.split('\n').filter(Boolean)
  check('B: 両 reason がそれぞれ出力される（2行）', lines.length === 2, JSON.stringify(lines))
  check('B: 1行目に hyperglycemia reason', s.includes('血糖値が高いため'), s)
  check('B: 2行目に lifestyle reason', s.includes('合併症予防のため'), s)
}

// ══════════════════════════════════════════════════════════════
// C. 異なる clinicalDomain → mergeBlocks がドメイン分離
// ══════════════════════════════════════════════════════════════
console.log(HEAD('C. 異なる clinicalDomain → 分離（相互混入なし）'))
{
  const b2 = makeBlock('咳が続くため、薬が追加となった。', 'cough_management', 'respiratory')
  const s = merge('血糖値が高いため、薬が追加となった。', 'hyperglycemia_management', 'diabetes', [b2])

  console.log(INFO(`S: "${s}"`))
  check('C: 両 reason が独立して出力', s.includes('血糖値が高いため') && s.includes('咳が続くため'), s)
  // ドメイン分離されているので各ドメインの reason はそれぞれ1件
  const diabetesLines = s.split('\n').filter(l => l.includes('血糖値'))
  const respLines     = s.split('\n').filter(l => l.includes('咳が'))
  check('C: diabetes reason は1件', diabetesLines.length === 1, JSON.stringify(diabetesLines))
  check('C: respiratory reason は1件', respLines.length === 1, JSON.stringify(respLines))
}

// ══════════════════════════════════════════════════════════════
// D. groupKey='' → 個別出力（統合しない）
// ══════════════════════════════════════════════════════════════
console.log(HEAD('D. groupKey="" → 個別出力'))
{
  const b2 = makeBlock('別の理由で薬が追加となった。', '', 'diabetes')
  const s = merge('血糖値が高いため、薬が追加となった。', '', 'diabetes', [b2])

  console.log(INFO(`S: "${s}"`))
  check('D: 両エントリが出力される', s.includes('血糖値が高いため') && s.includes('別の理由'), s)
}

// ══════════════════════════════════════════════════════════════
// E. observation / decision / other は変更なし
// ══════════════════════════════════════════════════════════════
console.log(HEAD('E. observation / decision / other は変更なし'))
{
  const b_obs = makeBlock('使用して、症状は落ち着いている。悪心は認めない。', 'side_effect_monitoring', 'diabetes')
  const s1 = mergeBlocks([b_obs], EMPTY, '', undefined, undefined, '', 'diabetes').S
  console.log(INFO(`obs S: "${s1}"`))
  check('E obs: observation が出力される', s1.includes('使用して、症状は落ち着いている。'), s1)

  const b_dec = makeBlock('リベルサスは、効果不十分のため増量となった。', 'glycemic_control_adjustment', 'diabetes')
  const s2 = mergeBlocks([b_dec], EMPTY, '', undefined, undefined, '', 'diabetes').S
  console.log(INFO(`dec S: "${s2}"`))
  check('E dec: decision が出力される', s2.includes('増量となった'), s2)

  const b_oth = makeBlock('使用忘れがみられる。', 'adherence', 'diabetes')
  const s3 = mergeBlocks([b_oth], EMPTY, '', undefined, undefined, '', 'diabetes').S
  console.log(INFO(`oth S: "${s3}"`))
  check('E oth: other が出力される', s3.includes('使用忘れがみられる'), s3)
}

// ══════════════════════════════════════════════════════════════
// F. 実際の 2剤合成: oral(initial) + injection(initial)
//    同一 groupKey(hyperglycemia_management) × 同一 clinicalDomain(diabetes) → 1件
// ══════════════════════════════════════════════════════════════
console.log(HEAD('F. 実際の 2剤合成 S: リベルサス initial + オゼンピック initial'))
{
  const sc1 = oralMod.scenarios.find(s => s.id === 'initial')!
  const sc2 = injMod.scenarios.find(s => s.id === 'initial')!

  const primaryFields = buildNodeFields(sc1, oralMod, [], 'リベルサス').fields
  const { fields: f2, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc2, injMod, [], 'オゼンピック')
  const block2: MergedBlock = {
    id: 'blk-2', templateLabel: sc2.title, fields: f2,
    closingText, groupKey, clinicalDomain, closingBehavior, domain: 'diabetes',
  }

  // computeDisplayFields 相当: currentGroupKey / currentClinicalDomain を渡す
  const currentGroupKey = sc1.mergePolicy?.S?.groupKey           // 'hyperglycemia_management'
  const currentClinicalDomain = oralMod.composition?.clinicalDomain  // 'diabetes'
  const result = mergeBlocks([block2], primaryFields, sc1.title, undefined, undefined, currentGroupKey, currentClinicalDomain)

  console.log(INFO(`S: "${result.S}"`))
  console.log(INFO(`currentGroupKey: ${currentGroupKey}, block2.groupKey: ${groupKey}`))

  const sLines = result.S.split('\n').filter(Boolean)
  check('F: S が1行のみ（同一 groupKey → 最初の1件）',
    sLines.length === 1, `${sLines.length}行: ${JSON.stringify(sLines)}`)
  check('F: S に "追加となった" が含まれる', result.S.includes('追加となった'), result.S)
  check('F: A に "リベルサス" あり', result.A.includes('リベルサス'), result.A.slice(0,80))
  check('F: A に "オゼンピック" あり', result.A.includes('オゼンピック'), result.A.slice(0,80))
}

// ══════════════════════════════════════════════════════════════
// G. 実際の 2剤: oral(initial) + injection(dose_increase_no_lab_improvement)
//    異なる groupKey → decision/reason 別行
// ══════════════════════════════════════════════════════════════
console.log(HEAD('G. 実際の 2剤: oral initial + injection dose_increase'))
{
  const sc1 = oralMod.scenarios.find(s => s.id === 'initial')!
  const sc2 = injMod.scenarios.find(s => s.id === 'dose_increase_no_lab_improvement')!

  const primaryFields = buildNodeFields(sc1, oralMod, [], 'リベルサス').fields
  const { fields: f2, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc2, injMod, [], 'オゼンピック')
  const block2: MergedBlock = {
    id: 'blk-2', templateLabel: sc2.title, fields: f2,
    closingText, groupKey, clinicalDomain, closingBehavior, domain: 'diabetes',
  }

  const currentGroupKey = sc1.mergePolicy?.S?.groupKey
  const currentClinicalDomain = oralMod.composition?.clinicalDomain
  const result = mergeBlocks([block2], primaryFields, sc1.title, undefined, undefined, currentGroupKey, currentClinicalDomain)

  console.log(INFO(`S: "${result.S}"`))
  // 「増量となった」→ decision なので S に別行で出る
  check('G: S に oral reason "追加となった" あり', result.S.includes('追加となった'), result.S)
  check('G: A に両薬剤名あり', result.A.includes('リベルサス') && result.A.includes('オゼンピック'), result.A.slice(0,80))
}

// ══════════════════════════════════════════════════════════════
// H. 3剤: oral(initial) + injection(initial) + injection(se_nausea_none)
//    initial×2 は同一 groupKey → 1件、se_nausea は observation
// ══════════════════════════════════════════════════════════════
console.log(HEAD('H. 3剤: initial×2 + se_nausea_none → reason 1件 + observation'))
{
  const sc1 = oralMod.scenarios.find(s => s.id === 'initial')!
  const sc2 = injMod.scenarios.find(s => s.id === 'initial')!
  const sc3 = injMod.scenarios.find(s => s.id === 'se_nausea_diarrhea_none')!

  const primaryFields = buildNodeFields(sc1, oralMod, [], 'リベルサス').fields

  const mk = (sc: typeof sc1, mod: ModuleData, name: string): MergedBlock => {
    const { fields, closingText, groupKey, clinicalDomain, closingBehavior } = buildNodeFields(sc, mod, [], name)
    return { id: `blk-${sc.id}`, templateLabel: sc.title, fields, closingText, groupKey, clinicalDomain, closingBehavior, domain: 'diabetes' }
  }
  const b2 = mk(sc2, injMod, 'オゼンピック')
  const b3 = mk(sc3, injMod, 'ビクトーザ')

  const currentGroupKey = sc1.mergePolicy?.S?.groupKey
  const currentClinicalDomain = oralMod.composition?.clinicalDomain
  const result = mergeBlocks([b2, b3], primaryFields, sc1.title, undefined, undefined, currentGroupKey, currentClinicalDomain)

  console.log(INFO(`S: "${result.S}"`))
  const sLines = result.S.split('\n').filter(Boolean)
  check('H: reason は1件のみ（initial×2 が同一 groupKey で統合）',
    sLines.filter(l => l.includes('追加となった')).length === 1, JSON.stringify(sLines))
  check('H: S に observation が含まれる',
    result.S.includes('使用して、症状は落ち着いている。') || result.S.includes('使用して症状は落ち着いている'),
    result.S)
  check('H: A に3薬剤名すべてあり',
    result.A.includes('リベルサス') && result.A.includes('オゼンピック') && result.A.includes('ビクトーザ'),
    result.A.slice(0,200))
}

// サマリ
console.log(`\n\x1b[1m結果: ${pass} PASS / ${fail} FAIL\x1b[0m`)
if (fail === 0) console.log('\x1b[32m\x1b[1mbuildS reason統合ルール修正: OK\x1b[0m')
else { console.log('\x1b[31m\x1b[1m要修正\x1b[0m'); process.exit(1) }
