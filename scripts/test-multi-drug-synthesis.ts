/**
 * 多剤合成テスト — scripts/test-multi-drug-synthesis.ts
 *
 * npm run test:multi-drug
 * (または npx tsx scripts/test-multi-drug-synthesis.ts)
 *
 * テスト対象: buildNodeFields + mergeBlocks（実際の SOAP 合成コアパイプライン）
 * 検索・alias・drug 構造（drug.search / brandCatalog 等）を変更した際の回帰確認に使う。
 * UI には依存せず、Node/tsx のみで完結する。
 *
 * 検出項目 (ERROR = 真の異常、WARN = 設計上の想定挙動を記録):
 *   ERROR 1. {{drug_subject}} 未解決
 *   ERROR 2. uiVariant 文字列の SOAP 混入
 *   ERROR 3. P closing（次回）行の重複
 *   ERROR 4. 2フィールド以上が空
 *   ERROR 5. O フィールド行数 ≠ 薬剤数
 *   ERROR 6. O フィールドに各薬剤の解決済み薬剤名が含まれない
 *            （薬効分類名固定のまま残っていないかの回帰チェック。CHECK-O01 参照）
 *   ERROR 7. JSON addon キー名の SOAP 混入
 *   ERROR 8. addonsRef が addons.items に存在しない（参照切れ）
 *   ERROR 9. getVisibleAddonKeys() が返すキーが addons.items に存在しない
 *            （AddonPanel 到達確認と同一ロジック）
 *   WARN  10. S/A に重複行（異 clinicalDomain 間では設計上発生）
 *   WARN  11. {{applicationSite}} 未解決（外用/点眼は UI 側で解決）
 */

import * as path from 'path'
import * as fs from 'fs'
import type { ModuleData, SoapFields, MergedBlock, Scenario } from '../lib/types'
import { buildNodeFields, mergeBlocks } from '../lib/buildSoap'
import { resolveDrugName } from '../lib/drugSubject'
import { getVisibleAddonKeys } from '../lib/addonFilter'

// ─────────────────────────────────────────────────────────────
// モジュール読み込み
// ─────────────────────────────────────────────────────────────

const MODULES_DIR = path.join(__dirname, '../data/modules')

function loadModule(moduleId: string): ModuleData {
  const p = path.join(MODULES_DIR, `${moduleId}.json`)
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as ModuleData
}

function findScenario(mod: ModuleData, id: string): Scenario {
  const s = (mod.scenarios as Scenario[]).find(s => s.id === id)
  if (!s) throw new Error(`Scenario not found: ${id} in ${mod.moduleId}`)
  return s
}

// ─────────────────────────────────────────────────────────────
// テスト実行ヘルパー
// ─────────────────────────────────────────────────────────────

interface DrugSpec {
  moduleId: string
  scenarioId: string
  brand?: string
  addonIds?: string[]
}

interface TestCase {
  label: string
  drugs: [DrugSpec, ...DrugSpec[]]
}

interface CheckResult {
  ok: boolean
  issues: string[]
  samples: Record<string, string>
}

const UIVARIANT_PATTERNS = [
  'rightAccentBlue', 'rightAccentLavender', 'leftAccent', 'rightAccent', 'muted',
  'addonBtnMuted', 'addonSubGroup',
]

function checkSoap(fields: SoapFields, drugCount: number, expectedDrugNames: string[]): CheckResult {
  const errors: string[] = []
  const warns: string[] = []
  const allText = Object.entries(fields).map(([k, v]) => `${k}:${v}`).join('\n')

  // ─── ERRORS ──────────────────────────────────────────────────

  if (allText.includes('{{drug_subject}}')) {
    errors.push('{{drug_subject}} placeholder not resolved')
  }

  for (const pat of UIVARIANT_PATTERNS) {
    if (allText.includes(pat)) {
      errors.push(`uiVariant string leaked into SOAP: "${pat}"`)
    }
  }

  const emptyFields = (['S', 'O', 'A', 'P'] as const).filter(k => !fields[k].trim())
  if (emptyFields.length >= 2) {
    errors.push(`Multiple empty fields: ${emptyFields.join(', ')}`)
  }

  const pLines = fields.P.split('\n').map(l => l.trim()).filter(Boolean)
  const closingLines = pLines.filter(l => l.startsWith('次回'))
  if (closingLines.length > 1) {
    errors.push(`P has ${closingLines.length} closing lines: ${closingLines.map(l => l.slice(0, 30)).join(' | ')}`)
  }

  // O 行数 = 薬剤数
  const oLines = fields.O.split('\n').filter(l => l.trim())
  if (oLines.length !== drugCount) {
    errors.push(`O field line count: expected ${drugCount}, got ${oLines.length}`)
  }

  // O フィールドに各薬剤の解決済み薬剤名（brand または generic）が含まれること
  // （薬効分類名固定のまま残っていないかの回帰チェック。CHECK-O01 参照）
  for (const name of expectedDrugNames) {
    if (!fields.O.includes(name)) {
      errors.push(`drug name "${name}" not found in O field (drug_subject substitution regression check)`)
    }
  }

  if (/addon_adherence_[a-z_]+/.test(allText)) {
    errors.push('JSON addon key name leaked into SOAP text')
  }

  // ─── WARNS（設計上想定内） ────────────────────────────────────

  // S/A 重複行: 異 clinicalDomain 間は別 buildS → 同文が現れるのは想定内
  const checkDup = (text: string, field: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    const seen = new Set<string>()
    const dups: string[] = []
    for (const l of lines) {
      if (seen.has(l)) { if (!dups.includes(l)) dups.push(l) }
      else seen.add(l)
    }
    if (dups.length > 0) {
      warns.push(`${field} dup lines (cross-domain ok): "${dups[0].slice(0, 50)}"`)
    }
  }
  checkDup(fields.S, 'S')
  checkDup(fields.A, 'A')

  // {{applicationSite}}: 外用・点眼は UI 側で解決するため想定内
  if (allText.includes('{{applicationSite}}')) {
    warns.push('{{applicationSite}} unresolved — UI-level slot (expected for topicals/eye drops)')
  }

  return {
    ok: errors.length === 0,
    issues: [...errors, ...warns.map(w => `[WARN] ${w}`)],
    samples: {
      S: fields.S.slice(0, 150) + (fields.S.length > 150 ? '…' : ''),
      O: fields.O,
      A: fields.A.slice(0, 120) + (fields.A.length > 120 ? '…' : ''),
      P: fields.P.slice(0, 250) + (fields.P.length > 250 ? '…' : ''),
    },
  }
}

/**
 * addonsRef 参照整合 + AddonPanel 到達確認。
 * - scenario.addonsRef の各キーが addons.items に存在すること（参照切れ検出）
 * - getVisibleAddonKeys()（実際に AddonPanel が使う関数）が返すキーも同様に存在すること
 */
function checkAddonRefs(mod: ModuleData, scenario: Scenario): string[] {
  const errors: string[] = []
  const items = mod.addons?.items ?? {}

  const ref = scenario.addonsRef
  if (ref) {
    const soapSections = ['S', 'O', 'A', 'P'] as const
    for (const section of soapSections) {
      const keys = ref[section]
      if (!keys) continue
      for (const key of keys) {
        if (!items[key]) {
          errors.push(`addonsRef.${section} references missing addon "${key}" in ${mod.moduleId}/${scenario.id}`)
        }
      }
    }
  }

  const visibleKeys = getVisibleAddonKeys(mod.addons, scenario)
  for (const key of visibleKeys) {
    if (!items[key]) {
      errors.push(`getVisibleAddonKeys() returned unresolvable key "${key}" in ${mod.moduleId}/${scenario.id} (AddonPanel would break)`)
    }
  }

  return errors
}

function runTestCase(tc: TestCase): { label: string; ok: boolean; issues: string[]; samples: Record<string, string> } {
  const mods = tc.drugs.map(d => loadModule(d.moduleId))
  const scenarios = tc.drugs.map((d, i) => findScenario(mods[i], d.scenarioId))
  const drugNames = tc.drugs.map((d, i) => resolveDrugName(mods[i].drug, d.brand))

  const nodeResults = tc.drugs.map((d, i) =>
    buildNodeFields(scenarios[i], mods[i], d.addonIds ?? [], drugNames[i])
  )

  let merged: SoapFields

  if (tc.drugs.length === 1) {
    merged = nodeResults[0].fields
  } else {
    const [first, ...rest] = nodeResults
    const blocks: MergedBlock[] = rest.map((r, idx) => ({
      id: `block_${idx + 1}`,
      templateLabel: scenarios[idx + 1].id,
      fields: r.fields,
      closingText: r.closingText,
      groupKey: r.groupKey,
      clinicalDomain: r.clinicalDomain,
      closingBehavior: r.closingBehavior,
    }))
    merged = mergeBlocks(
      blocks,
      first.fields,
      scenarios[0].id,
      first.closingText,
      undefined,
      first.groupKey,
      first.clinicalDomain,
    )
  }

  const result = checkSoap(merged, tc.drugs.length, drugNames)

  const addonErrors = tc.drugs.flatMap((_, i) => checkAddonRefs(mods[i], scenarios[i]))
  if (addonErrors.length > 0) {
    result.ok = false
    result.issues = [...addonErrors, ...result.issues]
  }

  return { label: tc.label, ...result }
}

// ─────────────────────────────────────────────────────────────
// テストケース定義
// ─────────────────────────────────────────────────────────────

const TEST_CASES: TestCase[] = [
  // A. GLP-1内服 + GLP-1注射（同系統 2剤）
  {
    label: 'A: GLP-1内服 + GLP-1注射 (initial)',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral', scenarioId: 'initial' },
      { moduleId: 'dm_glp1ra_injection',         scenarioId: 'initial' },
    ],
  },
  // A2. GLP-1内服 + GLP-1注射 CP良好
  {
    label: 'A2: GLP-1内服 + GLP-1注射 (cp_good)',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral', scenarioId: 'cp_good' },
      { moduleId: 'dm_glp1ra_injection',         scenarioId: 'cp_good' },
    ],
  },
  // B. GLP-1内服 + H1内服（異領域 2剤）
  {
    label: 'B: GLP-1内服(initial) + H1内服(initial_nasal)',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral',              scenarioId: 'initial' },
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral', scenarioId: 'initial_nasal' },
    ],
  },
  // C. H1内服 + LTRA内服（同領域 2剤）
  {
    label: 'C: H1内服(initial_nasal) + LTRA(initial_nasal)',
    drugs: [
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral',    scenarioId: 'initial_nasal' },
      { moduleId: 'allergy_leukotriene_receptor_antagonist_oral', scenarioId: 'initial_nasal' },
    ],
  },
  // D. H1点眼 + CMRI点眼（同領域 点眼 2剤）
  {
    label: 'D: H1点眼(initial) + CMRI点眼(initial)',
    drugs: [
      { moduleId: 'allergy_h1_antihistamine_eye_drops',                   scenarioId: 'initial' },
      { moduleId: 'allergy_chemical_mediator_release_inhibitor_eye_drops', scenarioId: 'initial' },
    ],
  },
  // E. 点眼 + 内服 + 外用（3剤 異剤形）
  {
    label: 'E: H1点眼 + LTRA内服 + ヘパリノイド外用 (initial 3剤)',
    drugs: [
      { moduleId: 'allergy_h1_antihistamine_eye_drops',                   scenarioId: 'initial' },
      { moduleId: 'allergy_leukotriene_receptor_antagonist_oral',          scenarioId: 'initial_nasal' },
      { moduleId: 'derm_heparinoid_moisturizer_cream',                     scenarioId: 'initial_dryness' },
    ],
  },
  // F. CP良好 同領域 2剤
  {
    label: 'F: H1内服 CP良好 + LTRA CP良好',
    drugs: [
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral',    scenarioId: 'cp_good' },
      { moduleId: 'allergy_leukotriene_receptor_antagonist_oral', scenarioId: 'cp_good' },
    ],
  },
  // G. CP不良 異領域 2剤
  {
    label: 'G: GLP-1内服 CP不良 + H1内服 CP不良',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral',              scenarioId: 'cp_poor_missed_doses' },
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral', scenarioId: 'cp_poor_missed_doses' },
    ],
  },
  // H. 副作用なし 異領域 2剤
  {
    label: 'H: GLP-1内服 SE-none + LTRA SE-none',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral',                  scenarioId: 'se_hypo_none' },
      { moduleId: 'allergy_leukotriene_receptor_antagonist_oral', scenarioId: 'se_drowsiness_none' },
    ],
  },
  // I. 初回 + 継続 + 再開 3剤混在
  {
    label: 'I: GLP-1内服(initial) + H1内服(cp_good) + LTRA(restart_nasal) 3剤混在',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral',                  scenarioId: 'initial' },
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral',    scenarioId: 'cp_good' },
      { moduleId: 'allergy_leukotriene_receptor_antagonist_oral', scenarioId: 'restart_nasal' },
    ],
  },
  // J. adherence addon 複数含む合成
  {
    label: 'J: H1内服 CP不良(adherence addons) + LTRA CP不良(adherence addons)',
    drugs: [
      {
        moduleId: 'allergy_h1_antihistamine_second_gen_oral',
        scenarioId: 'cp_poor_missed_doses',
        addonIds: [
          'adherence:addon_adherence_reminder_alarm',
          'adherence:addon_adherence_visual_calendar_checklist',
          'adherence:addon_adherence_support_family_reminder',
        ],
      },
      {
        moduleId: 'allergy_leukotriene_receptor_antagonist_oral',
        scenarioId: 'cp_poor_missed_doses',
        addonIds: [
          'adherence:addon_adherence_reminder_app',
          'adherence:addon_adherence_prep_previous_night',
        ],
      },
    ],
  },
  // K. 同系統 外用 3剤（ヘパリノイド 3バリアント）
  {
    label: 'K: ヘパリノイド クリーム + ローション + 軟膏 (initial 3剤)',
    drugs: [
      { moduleId: 'derm_heparinoid_moisturizer_cream',    scenarioId: 'initial_dryness' },
      { moduleId: 'derm_heparinoid_moisturizer_lotion',   scenarioId: 'initial_eczema' },
      { moduleId: 'derm_heparinoid_moisturizer_ointment', scenarioId: 'initial_skin_barrier_patch' },
    ],
  },
  // L. 異領域 4剤合成
  {
    label: 'L: GLP-1内服 + H1内服 + CMRI点眼 + ヘパリノイド 4剤',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral',                               scenarioId: 'cp_good' },
      { moduleId: 'allergy_h1_antihistamine_second_gen_oral',                  scenarioId: 'cp_good' },
      { moduleId: 'allergy_chemical_mediator_release_inhibitor_eye_drops',     scenarioId: 'initial' },
      { moduleId: 'derm_heparinoid_moisturizer_spray',                         scenarioId: 'initial_dryness' },
    ],
  },
  // M. 同成分（インスリンヒト）を含む2モジュール — regular + mixed_regular_intermediate
  {
    label: 'M: ノボリンR + ノボリン30R（インスリンヒト、regular + mixed_regular_intermediate）',
    drugs: [
      { moduleId: 'dm_insulin_regular',                     scenarioId: 'initial', brand: 'ノボリンR' },
      { moduleId: 'dm_insulin_mixed_regular_intermediate',  scenarioId: 'initial', brand: 'ノボリン30R' },
    ],
  },
  // N. 単剤 + 配合剤（インスリングラルギンを共有）
  {
    label: 'N: ランタス + ソリクア（インスリングラルギン共有、単剤 + 配合剤）',
    drugs: [
      { moduleId: 'dm_insulin_long_acting',        scenarioId: 'initial', brand: 'ランタス' },
      { moduleId: 'dm_insulin_glp1_combination',    scenarioId: 'initial', brand: 'ソリクア' },
    ],
  },
  // O. 単剤 + 配合剤 + 混合型配合剤（インスリンデグルデクを3方向で共有）3剤
  {
    label: 'O: トレシーバ + ゾルトファイ + ライゾデグ（インスリンデグルデク共有 3剤）',
    drugs: [
      { moduleId: 'dm_insulin_long_acting',        scenarioId: 'initial', brand: 'トレシーバ' },
      { moduleId: 'dm_insulin_glp1_combination',    scenarioId: 'initial', brand: 'ゾルトファイ' },
      { moduleId: 'dm_insulin_mixed_rapid_long',    scenarioId: 'initial', brand: 'ライゾデグ' },
    ],
  },
  // P. GLP-1内服 + GLP-1注射（セマグルチド共有、O field修正の回帰確認）
  {
    label: 'P: リベルサス + オゼンピック（セマグルチド共有、O field回帰確認）',
    drugs: [
      { moduleId: 'dm_glp1ra_semaglutide_oral', scenarioId: 'initial', brand: 'リベルサス' },
      { moduleId: 'dm_glp1ra_injection',         scenarioId: 'initial', brand: 'オゼンピック' },
    ],
  },
  // Q. 同一module内の異なるブランド2つを同時選択（同成分・類似成分の重複/欠落確認）
  {
    label: 'Q: ノボラピッド30ミックス + ヒューマログ25ミックス（同module異brand）',
    drugs: [
      { moduleId: 'dm_insulin_mixed_rapid_intermediate', scenarioId: 'initial', brand: 'ノボラピッド30ミックス' },
      { moduleId: 'dm_insulin_mixed_rapid_intermediate', scenarioId: 'initial', brand: 'ヒューマログ25ミックス' },
    ],
  },
  // R. GLP-1注射（リキシセナチド） + 配合剤（リキシセナチド共有）
  {
    label: 'R: リキスミア + ソリクア（リキシセナチド共有）',
    drugs: [
      { moduleId: 'dm_glp1ra_injection',         scenarioId: 'initial', brand: 'リキスミア' },
      { moduleId: 'dm_insulin_glp1_combination', scenarioId: 'initial', brand: 'ソリクア' },
    ],
  },
  // S. GLP-1注射（リラグルチド） + 配合剤（リラグルチド共有）
  {
    label: 'S: ビクトーザ + ゾルトファイ（リラグルチド共有）',
    drugs: [
      { moduleId: 'dm_glp1ra_injection',         scenarioId: 'initial', brand: 'ビクトーザ' },
      { moduleId: 'dm_insulin_glp1_combination', scenarioId: 'initial', brand: 'ゾルトファイ' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// 実行
// ─────────────────────────────────────────────────────────────

console.log('═'.repeat(70))
console.log('  多剤合成テスト')
console.log('═'.repeat(70))

let passed = 0
let failed = 0
const humanSamples: Array<{ label: string; ok: boolean; issues: string[]; samples: Record<string, string> }> = []

for (const tc of TEST_CASES) {
  let result: ReturnType<typeof runTestCase>
  try {
    result = runTestCase(tc)
  } catch (err) {
    console.log(`\n[EXCEPTION] ${tc.label}`)
    console.log(`  ${(err as Error).message}`)
    failed++
    continue
  }

  const status = result.ok ? '✅ PASS' : '❌ FAIL'
  console.log(`\n${status} ${result.label}`)

  const errors = result.issues.filter(i => !i.startsWith('[WARN]'))
  const warns = result.issues.filter(i => i.startsWith('[WARN]'))

  for (const e of errors) console.log(`  ✗  ${e}`)
  for (const w of warns) console.log(`  ℹ  ${w}`)

  if (result.ok) passed++; else failed++
  humanSamples.push(result)
}

// ─────────────────────────────────────────────────────────────
// SOAP サンプル（全ケース）
// ─────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70))
console.log('  SOAP 出力サンプル（全ケース）')
console.log('═'.repeat(70))

for (const { label, ok, samples } of humanSamples) {
  const mark = ok ? '✅' : '❌'
  console.log(`\n${mark} ${label}`)
  console.log(`  [S] ${samples.S.replace(/\n/g, '\n      ')}`)
  console.log(`  [O] ${samples.O.replace(/\n/g, '\n      ')}`)
  console.log(`  [A] ${samples.A.replace(/\n/g, '\n      ')}`)
  console.log(`  [P] ${samples.P.replace(/\n/g, '\n      ')}`)
}

// ─────────────────────────────────────────────────────────────
// サマリ
// ─────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70))
console.log(`  結果: ${passed} PASS / ${failed} FAIL / ${TEST_CASES.length} total`)
console.log('═'.repeat(70))

if (failed > 0) process.exit(1)
