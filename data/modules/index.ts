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
import rawInsulinRapidAnalog from './dm_insulin_rapid_analog.json'
import rawInsulinIntermediate from './dm_insulin_intermediate.json'
import rawInsulinLongActing from './dm_insulin_long_acting.json'
import rawInsulinMixedRegularIntermediate from './dm_insulin_mixed_regular_intermediate.json'
import rawInsulinGlp1Combination from './dm_insulin_glp1_combination.json'
import rawInsulinMixedRapidLong from './dm_insulin_mixed_rapid_long.json'
import rawInsulinMixedRapidIntermediate from './dm_insulin_mixed_rapid_intermediate.json'
import rawDpp4Oral from './dm_dpp4_oral.json'
import rawBiguanideMetforminOral from './dm_biguanide_metformin_oral.json'
import rawDpp4BiguanideCombinationOral from './dm_dpp4_biguanide_combination_oral.json'
import rawThiazolidinedionePioglitazoneOral from './dm_thiazolidinedione_pioglitazone_oral.json'
import rawDpp4ThiazolidinedioneCombinationOral from './dm_dpp4_thiazolidinedione_combination_oral.json'
import rawThiazolidinedioneBiguanideCombinationOral from './dm_thiazolidinedione_biguanide_combination_oral.json'
import rawSulfonylureaOral from './dm_sulfonylurea_oral.json'
import rawThiazolidinedioneSulfonylureaCombinationOral from './dm_thiazolidinedione_sulfonylurea_combination_oral.json'
import rawGlinideOral from './dm_glinide_oral.json'
import rawAlphaGlucosidaseInhibitorOral from './dm_alpha_glucosidase_inhibitor_oral.json'
import rawGlinideAlphaGlucosidaseInhibitorCombinationOral from './dm_glinide_alpha_glucosidase_inhibitor_combination_oral.json'
import rawImegliminOral from './dm_imeglimin_oral.json'
import rawEpalrestatOral from './dm_epalrestat_oral.json'
import rawSglt2Oral from './dm_sglt2_oral.json'

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
  rawInsulinRapidAnalog as unknown as ModuleData,
  rawInsulinIntermediate as unknown as ModuleData,
  rawInsulinLongActing as unknown as ModuleData,
  rawInsulinMixedRegularIntermediate as unknown as ModuleData,
  rawInsulinGlp1Combination as unknown as ModuleData,
  rawInsulinMixedRapidLong as unknown as ModuleData,
  rawInsulinMixedRapidIntermediate as unknown as ModuleData,
  rawDpp4Oral as unknown as ModuleData,
  rawBiguanideMetforminOral as unknown as ModuleData,
  rawDpp4BiguanideCombinationOral as unknown as ModuleData,
  rawThiazolidinedionePioglitazoneOral as unknown as ModuleData,
  rawDpp4ThiazolidinedioneCombinationOral as unknown as ModuleData,
  rawThiazolidinedioneBiguanideCombinationOral as unknown as ModuleData,
  rawSulfonylureaOral as unknown as ModuleData,
  rawThiazolidinedioneSulfonylureaCombinationOral as unknown as ModuleData,
  rawGlinideOral as unknown as ModuleData,
  rawAlphaGlucosidaseInhibitorOral as unknown as ModuleData,
  rawGlinideAlphaGlucosidaseInhibitorCombinationOral as unknown as ModuleData,
  rawImegliminOral as unknown as ModuleData,
  rawEpalrestatOral as unknown as ModuleData,
  rawSglt2Oral as unknown as ModuleData,
]
