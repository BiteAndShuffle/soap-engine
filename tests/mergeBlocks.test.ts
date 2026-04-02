/**
 * mergeBlocks 網羅的組み合わせテスト
 *
 * Node.js built-in test runner + tsx で実行:
 *   npx tsx --test tests/mergeBlocks.test.ts
 *
 * 対象: リベルサス（内服）× オゼンピック（注射）の全シナリオ組み合わせ
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import oralData from '../data/modules/dm_glp1ra_semaglutide_oral.json' assert { type: 'json' }
import injData  from '../data/modules/dm_glp1ra_injection.json'  assert { type: 'json' }
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import type { ModuleData, Scenario, MergedBlock, SoapFields } from '../lib/types'

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

const oral = oralData as unknown as ModuleData
const inj  = injData  as unknown as ModuleData

/** シナリオ + モジュールから buildNodeFields を呼んで MergedBlock を作る */
function makeBlock(mod: ModuleData, scenario: Scenario, addonIds: string[] = []): {
  fields: SoapFields
  closingText: string | undefined
  label: string
  domain: string | undefined
} {
  const { fields, closingText } = buildNodeFields(scenario, mod, addonIds)
  const domain = mod.composition?.domain
    ?? mod.categoryPath?.[1]
    ?? mod.categoryPath?.[0]
    ?? mod.moduleId
  return { fields, closingText, label: scenario.title, domain }
}

/**
 * 2件以上のシナリオを mergeBlocks で合成する。
 * scenarios[0] が primary（currentFields）、残りが composeNodes（blocks）になる。
 */
function mergeScenarios(
  pairs: Array<{ mod: ModuleData; scenario: Scenario }>,
): SoapFields {
  assert.ok(pairs.length >= 2, 'mergeScenarios requires at least 2 scenarios')
  const [primary, ...rest] = pairs
  const primaryBlock = makeBlock(primary.mod, primary.scenario)

  const blocks: MergedBlock[] = rest.map((p, i) => {
    const b = makeBlock(p.mod, p.scenario)
    return {
      id: `node_${i}`,
      templateLabel: b.label,
      fields: b.fields,
      closingText: b.closingText,
      domain: b.domain,
    }
  })

  return mergeBlocks(
    blocks,
    primaryBlock.fields,
    primaryBlock.label,
    primaryBlock.closingText,
    primaryBlock.domain,
  )
}

// ─────────────────────────────────────────────────────────────
// アサーション関数
// ─────────────────────────────────────────────────────────────

/** "A・A" "A・A・A" のような同一主語連続を検出 */
function hasDuplicateSubject(text: string): string | null {
  const lines = text.split('\n')
  for (const line of lines) {
    // 「・」で区切られた主語部分を検査
    const m = line.match(/^(.+?)([はが].+)$/)
    if (!m) continue
    const subjects = m[1].split('・')
    const seen = new Set<string>()
    for (const s of subjects) {
      if (seen.has(s)) return `重複主語: "${s}" in "${line}"`
      seen.add(s)
    }
  }
  return null
}

/** 同一行が3回以上連続して現れるかチェック */
function hasExcessiveRepetition(text: string): string | null {
  const lines = text.split('\n')
  for (let i = 0; i + 2 < lines.length; i++) {
    if (lines[i] === lines[i+1] && lines[i] === lines[i+2] && lines[i].trim()) {
      return `3連続重複行: "${lines[i]}"`
    }
  }
  return null
}

/** closing が消えていないかチェック（body が存在すれば closing も期待）*/
function closingMissing(fields: SoapFields, scenario: Scenario, mod: ModuleData): string | null {
  // followupRef / followup.P === 'default' があれば closing が存在するはず
  const hasFollowup = scenario.followupRef != null ||
    (scenario.followup as Record<string, unknown> | undefined)?.P === 'default'
  if (!hasFollowup) return null
  if (!fields.P.includes('次回')) {
    return `closing 消失疑い: P="${fields.P.slice(0, 60)}"`
  }
  return null
}

/** P欄に body が空でないのに空になっていないか */
function pBodyEmpty(fields: SoapFields, scenario: Scenario): string | null {
  if (scenario.P && !fields.P.trim()) {
    return `P欄が空になった (scenario.P was: "${scenario.P.slice(0, 60)}")`
  }
  return null
}

/** S欄に "単剤フラグ行" が多剤合成後に混入していないか */
const FLAG_LINES = ['副作用は認めない。', 'コンプライアンス良好。']
function hasFlagContamination(fields: SoapFields): string | null {
  for (const fl of FLAG_LINES) {
    if (fields.S.includes(fl)) return `多剤合成後にフラグ行混入: "${fl}"`
  }
  return null
}

/** closing の連続重複（同一行が2回以上連続）*/
function hasConsecutiveDuplicateClosing(fields: SoapFields): string | null {
  const lines = fields.P.split('\n')
  for (let i = 0; i + 1 < lines.length; i++) {
    const l = lines[i].trim()
    if (l.startsWith('次回') && l === lines[i+1].trim()) {
      return `closing 連続重複: "${l}"`
    }
  }
  return null
}

/** 全アサーションをまとめて実行、問題があれば詳細を返す */
function assertMerged(
  fields: SoapFields,
  pairs: Array<{ mod: ModuleData; scenario: Scenario }>,
  label: string,
): void {
  const errors: string[] = []

  const dup = hasDuplicateSubject(fields.S)
  if (dup) errors.push(`[S重複主語] ${dup}`)

  const rep = hasExcessiveRepetition(fields.S + '\n' + fields.P)
  if (rep) errors.push(`[過剰重複] ${rep}`)

  const flagErr = hasFlagContamination(fields)
  if (flagErr) errors.push(`[フラグ混入] ${flagErr}`)

  const closingDup = hasConsecutiveDuplicateClosing(fields)
  if (closingDup) errors.push(`[closing重複] ${closingDup}`)

  // 各シナリオ個別チェック
  for (const { mod, scenario } of pairs) {
    const bodyErr = pBodyEmpty(fields, scenario)
    if (bodyErr) errors.push(`[P空] scenario=${scenario.id}: ${bodyErr}`)
    const closeErr = closingMissing(fields, scenario, mod)
    if (closeErr) errors.push(`[closing消失] scenario=${scenario.id}: ${closeErr}`)
  }

  assert.equal(errors.length, 0,
    `\n${label}\n` + errors.map(e => `  ❌ ${e}`).join('\n') + '\n' +
    `  S: ${JSON.stringify(fields.S)}\n  P: ${JSON.stringify(fields.P)}`
  )
}

// ─────────────────────────────────────────────────────────────
// テストスイート
// ─────────────────────────────────────────────────────────────

describe('2剤組み合わせ: 内服 → 注射（全×全）', () => {
  for (const oralSc of oral.scenarios) {
    for (const injSc of inj.scenarios) {
      const label = `oral:${oralSc.id} + inj:${injSc.id}`
      test(label, () => {
        const fields = mergeScenarios([
          { mod: oral, scenario: oralSc },
          { mod: inj,  scenario: injSc  },
        ])
        assertMerged(fields, [
          { mod: oral, scenario: oralSc },
          { mod: inj,  scenario: injSc  },
        ], label)
      })
    }
  }
})

describe('2剤組み合わせ: 注射 → 内服（全×全）', () => {
  for (const injSc of inj.scenarios) {
    for (const oralSc of oral.scenarios) {
      const label = `inj:${injSc.id} + oral:${oralSc.id}`
      test(label, () => {
        const fields = mergeScenarios([
          { mod: inj,  scenario: injSc  },
          { mod: oral, scenario: oralSc },
        ])
        assertMerged(fields, [
          { mod: inj,  scenario: injSc  },
          { mod: oral, scenario: oralSc },
        ], label)
      })
    }
  }
})

describe('3剤組み合わせ: 内服 → 注射 → 内服', () => {
  // S パターン別に代表シナリオを選んで3剤テスト
  const oralRepresentative = oral.scenarios.filter(s =>
    ['initial', 'dose_increase_low_perceived_effect', 'se_hypo_none', 'cp_good', 'end_improved',
     'se_mild_continue', 'se_stop_due_to_gi_symptoms'].includes(s.id)
  )
  const injRepresentative = inj.scenarios.filter(s =>
    ['initial', 'dose_increase_low_perceived_effect', 'se_hypo_none', 'cp_good', 'end_improved',
     'se_injection_site_induration_none'].includes(s.id)
  )

  for (const sc1 of oralRepresentative) {
    for (const sc2 of injRepresentative) {
      for (const sc3 of oralRepresentative) {
        const label = `oral:${sc1.id} + inj:${sc2.id} + oral:${sc3.id}`
        test(label, () => {
          const fields = mergeScenarios([
            { mod: oral, scenario: sc1 },
            { mod: inj,  scenario: sc2 },
            { mod: oral, scenario: sc3 },
          ])
          assertMerged(fields, [
            { mod: oral, scenario: sc1 },
            { mod: inj,  scenario: sc2 },
            { mod: oral, scenario: sc3 },
          ], label)
        })
      }
    }
  }
})

describe('3剤組み合わせ: 注射 → 内服 → 注射', () => {
  const oralRep = oral.scenarios.filter(s =>
    ['initial', 'se_hypo_none', 'end_improved', 'cp_good'].includes(s.id)
  )
  const injRep = inj.scenarios.filter(s =>
    ['initial', 'se_hypo_none', 'end_improved', 'se_injection_site_induration_none'].includes(s.id)
  )

  for (const sc1 of injRep) {
    for (const sc2 of oralRep) {
      for (const sc3 of injRep) {
        const label = `inj:${sc1.id} + oral:${sc2.id} + inj:${sc3.id}`
        test(label, () => {
          const fields = mergeScenarios([
            { mod: inj,  scenario: sc1 },
            { mod: oral, scenario: sc2 },
            { mod: inj,  scenario: sc3 },
          ])
          assertMerged(fields, [
            { mod: inj,  scenario: sc1 },
            { mod: oral, scenario: sc2 },
            { mod: inj,  scenario: sc3 },
          ], label)
        })
      }
    }
  }
})

describe('4剤組み合わせ: 代表的な臨床パターン', () => {
  // 典型的な4剤シナリオ（A開始→B開始→A増量→B副作用 など）
  const clinicalPatterns: Array<{
    label: string
    pairs: Array<{ mod: ModuleData; scenarioId: string }>
  }> = [
    {
      label: '内服initial + 注射initial + 内服増量 + 注射副作用',
      pairs: [
        { mod: oral, scenarioId: 'initial' },
        { mod: inj,  scenarioId: 'initial' },
        { mod: oral, scenarioId: 'dose_increase_low_perceived_effect' },
        { mod: inj,  scenarioId: 'se_hypo_none' },
      ],
    },
    {
      label: '内服副作用なし + 注射副作用なし + 内服終了 + 注射増量',
      pairs: [
        { mod: oral, scenarioId: 'se_hypo_none' },
        { mod: inj,  scenarioId: 'se_hypo_none' },
        { mod: oral, scenarioId: 'end_improved' },
        { mod: inj,  scenarioId: 'dose_increase_low_perceived_effect' },
      ],
    },
    {
      label: '内服CP良好 + 注射CP良好 + 内服終了 + 注射終了',
      pairs: [
        { mod: oral, scenarioId: 'cp_good' },
        { mod: inj,  scenarioId: 'cp_good' },
        { mod: oral, scenarioId: 'end_improved' },
        { mod: inj,  scenarioId: 'end_improved' },
      ],
    },
    {
      label: '内服GI副作用軽度 + 注射注射部位 + 内服GI中止 + 注射注射部位',
      pairs: [
        { mod: oral, scenarioId: 'se_mild_continue' },
        { mod: inj,  scenarioId: 'se_injection_site_induration_none' },
        { mod: oral, scenarioId: 'se_stop_due_to_gi_symptoms' },
        { mod: inj,  scenarioId: 'se_injection_site_induration_none' },
      ],
    },
  ]

  for (const pattern of clinicalPatterns) {
    test(pattern.label, () => {
      const pairs = pattern.pairs.map(p => {
        const scenario = p.mod.scenarios.find(s => s.id === p.scenarioId)
        assert.ok(scenario, `scenario not found: ${p.scenarioId}`)
        return { mod: p.mod, scenario }
      })
      const fields = mergeScenarios(pairs)
      assertMerged(fields, pairs, pattern.label)
    })
  }
})

describe('単剤 buildNodeFields 基本検証', () => {
  test('全内服シナリオで S/P が空にならない', () => {
    const errors: string[] = []
    for (const sc of oral.scenarios) {
      const { fields } = buildNodeFields(sc, oral, [])
      // S/P が scenario に存在する場合は空でないはず
      if (sc.S && !fields.S.trim()) errors.push(`oral S空: ${sc.id}`)
      if (sc.P && !fields.P.trim()) errors.push(`oral P空: ${sc.id}`)
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })

  test('全注射シナリオで S/P が空にならない', () => {
    const errors: string[] = []
    for (const sc of inj.scenarios) {
      const { fields } = buildNodeFields(sc, inj, [])
      if (sc.S && !fields.S.trim()) errors.push(`inj S空: ${sc.id}`)
      if (sc.P && !fields.P.trim()) errors.push(`inj P空: ${sc.id}`)
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })

  test('followupRef を持つシナリオで P closing が付与される', () => {
    const errors: string[] = []
    for (const mod of [oral, inj]) {
      for (const sc of mod.scenarios) {
        if (!sc.followupRef) continue
        const { closingText } = buildNodeFields(sc, mod, [])
        if (!closingText) errors.push(`closing未付与: ${mod.moduleId}/${sc.id} followupRef=${sc.followupRef}`)
      }
    }
    assert.equal(errors.length, 0, errors.join('\n'))
  })
})
