/**
 * data/modules/index.ts — モジュール登録レジストリ
 *
 * 新しいモジュール JSON を追加する際は、このファイルに import と
 * ALL_MODULES エントリを追加するだけで app/page.tsx は修正不要になります。
 *
 * 注意:
 *   - ALL_MODULES[0] が現在 DashboardClient に渡される「アクティブモジュール」です
 *   - モジュールの順序を変える場合は ALL_MODULES[0] の変更に注意してください
 *   - 各モジュールは assertModuleValid / reportInvalidScenarios で自動検証されます
 */

import type { ModuleData } from '../../lib/types'

import rawSemaglutideOral from './dm_glp1ra_semaglutide_oral.json'
import rawGlp1raInjection from './dm_glp1ra_injection.json'
import rawGipGlp1raTirzepatideInjection from './dm_gip_glp1ra_tirzepatide_injection.json'
import rawAllergyH1AntihistamineEyeDrops from './allergy_h1_antihistamine_eye_drops.json'
import rawAllergyH1AntihistamineSecondGenOral from './allergy_h1_antihistamine_second_gen_oral.json'
import rawDermHeparinoidMoisturizerOintment from './derm_heparinoid_moisturizer_ointment.json'
import rawDermHeparinoidMoisturizerCream from './derm_heparinoid_moisturizer_cream.json'
import rawDermHeparinoidMoisturizerLotion from './derm_heparinoid_moisturizer_lotion.json'
import rawDermHeparinoidMoisturizerSpray from './derm_heparinoid_moisturizer_spray.json'
import rawAllergyLeukotrieneReceptorAntagonistOral from './allergy_leukotriene_receptor_antagonist_oral.json'
import rawAllergyChemicalMediatorReleaseInhibitorEyeDrops from './allergy_chemical_mediator_release_inhibitor_eye_drops.json'
import rawInsulinRegular from './dm_insulin_regular.json'
import rawInsulinIntermediate from './dm_insulin_intermediate.json'

export const ALL_MODULES: ModuleData[] = [
  rawSemaglutideOral as unknown as ModuleData,
  rawGlp1raInjection as unknown as ModuleData,
  rawGipGlp1raTirzepatideInjection as unknown as ModuleData,
  rawAllergyH1AntihistamineEyeDrops as unknown as ModuleData,
  rawAllergyH1AntihistamineSecondGenOral as unknown as ModuleData,
  rawDermHeparinoidMoisturizerOintment as unknown as ModuleData,
  rawDermHeparinoidMoisturizerCream as unknown as ModuleData,
  rawDermHeparinoidMoisturizerLotion as unknown as ModuleData,
  rawDermHeparinoidMoisturizerSpray as unknown as ModuleData,
  rawAllergyLeukotrieneReceptorAntagonistOral as unknown as ModuleData,
  rawAllergyChemicalMediatorReleaseInhibitorEyeDrops as unknown as ModuleData,
  rawInsulinRegular as unknown as ModuleData,
  rawInsulinIntermediate as unknown as ModuleData,
]
