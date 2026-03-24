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

export const ALL_MODULES: ModuleData[] = [
  rawSemaglutideOral as unknown as ModuleData,
  rawGlp1raInjection as unknown as ModuleData,
]
