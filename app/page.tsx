// Server Component — 'use client' なし
// データ取得・整形を行い、Client Component にシリアライズして渡す

import type { ModuleData } from '../lib/types'
import rawModuleData from '../data/modules/dm_glp1ra_semaglutide_oral_sickday.json'
import DashboardClient from './components/DashboardClient'

// JSON の型は TypeScript が自動推論するが、
// lib/types.ts の ModuleData と構造が一致していることを
// as を 1 段階だけ使って保証する（unknown を経由しない）
const moduleData = rawModuleData as ModuleData

export default function Page() {
  return <DashboardClient moduleData={moduleData} />
}
