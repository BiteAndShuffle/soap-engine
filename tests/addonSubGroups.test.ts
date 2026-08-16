/**
 * addonSubGroups.test.ts
 *
 * AddonPanel のサブグループ決定ロジック（lib/addonSubGroups.ts）を固定する。
 *
 * ── 何を守るテストか ────────────────────────────────────────────
 *
 * `uiGroup`（optional）と `rightAccentAmber`（第三 variant）の導入にあたり、
 * 次の 2 つを同時に保証する必要がある:
 *
 *   1. **後方互換** — `uiGroup` を持たない module の表示が一切変わらないこと。
 *      canonical への `uiGroup` 付与は段階移行であり、全 module へ一斉付与しなくても
 *      動作しなければならない。
 *   2. **意味の反映** — `uiGroup` がある場合は id 由来の推測より優先され、
 *      同じ色でも意味が異なるグループ（例: 事前準備 と 習慣化）が別クラスタになること。
 *
 * 1 については「旧ロジック（uiVariant のみを境界とする）」を本ファイル内に再現し、
 * 登録済み全 module の実データに対して新旧の描画結果が一致することを検証する
 * （個別ケースの列挙ではなく実データ全数での同値性で担保する）。
 *
 * 実行:
 *   npx tsx --test tests/addonSubGroups.test.ts
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import type { AddonItem } from '../lib/types'
import { ALL_MODULES } from '../data/modules/index'
import { buildSubClusters, getSubGroupLabel, resolveSubGroup } from '../lib/addonSubGroups'

// ─────────────────────────────────────────────────────────────
// 旧ロジック（uiVariant のみを境界とし、ラベルは先頭 item の id から導出）
// 後方互換の照合基準としてのみ使用する。実装側からは参照しない。
// ─────────────────────────────────────────────────────────────
function buildSubClustersLegacy(entries: [string, AddonItem][]) {
  const clusters: { uiVariant: AddonItem['uiVariant']; label: string | null; entries: [string, AddonItem][] }[] = []
  for (const [key, item] of entries) {
    const last = clusters[clusters.length - 1]
    if (last && last.uiVariant === item.uiVariant) {
      last.entries.push([key, item])
    } else {
      clusters.push({ uiVariant: item.uiVariant, label: getSubGroupLabel(item.id ?? key), entries: [[key, item]] })
    }
  }
  return clusters
}

/** 描画結果として意味を持つ形へ射影する（枠色・見出し・ボタンの並び） */
function render(clusters: ReturnType<typeof buildSubClusters>) {
  return clusters.map(c => ({
    uiVariant: c.uiVariant ?? null,
    // uiVariant が無いクラスタは枠も見出しも描画されないため、見出しは比較対象外
    label: c.uiVariant ? c.label : null,
    keys: c.entries.map(([k]) => k),
  }))
}

function item(over: Partial<AddonItem> & { id: string }): AddonItem {
  return { group: 'adherence', targetSection: 'P', text: 't', ...over }
}

describe('addonSubGroups — 後方互換（uiGroup なし）', () => {
  test('登録済み全 module の全シナリオで、新旧ロジックの描画結果が一致する', () => {
    const mismatches: string[] = []
    let compared = 0

    for (const mod of ALL_MODULES) {
      const items = mod.addons?.items ?? {}
      for (const sc of mod.scenarios) {
        const refP = sc.addonsRef?.P ?? []
        const entries = refP
          .map(k => [k, items[k]] as [string, AddonItem])
          .filter(([, it]) => Boolean(it))
        if (entries.length === 0) continue

        // uiGroup を持つ module は意図的に表示が変わるため、この照合の対象外
        if (entries.some(([, it]) => it.uiGroup !== undefined)) continue

        compared++
        const before = JSON.stringify(render(buildSubClustersLegacy(entries) as never))
        const after = JSON.stringify(render(buildSubClusters(entries)))
        if (before !== after) mismatches.push(`${mod.moduleId}.${sc.id}\n  旧: ${before}\n  新: ${after}`)
      }
    }

    assert.ok(compared > 0, '照合対象が 0 件では後方互換を保証できない')
    assert.deepEqual(mismatches, [], `uiGroup を持たない箇所で表示が変化している:\n${mismatches.join('\n')}`)
  })

  test('uiGroup が無ければ getSubGroupLabel の値が使われる', () => {
    assert.equal(resolveSubGroup('k', item({ id: 'addon_adherence_reminder_alarm' })), '通知')
    assert.equal(resolveSubGroup('k', item({ id: 'addon_adherence_visual_note' })), '見える化')
    assert.equal(resolveSubGroup('k', item({ id: 'addon_adherence_prep_previous_night' })), '準備')
    assert.equal(resolveSubGroup('k', item({ id: 'addon_adherence_support_family_reminder' })), '支援')
    assert.equal(resolveSubGroup('k', item({ id: 'addon_glinide_before_meal_guidance' })), null)
  })
})

describe('addonSubGroups — uiGroup 優先', () => {
  test('uiGroup があれば id 由来の推測より優先される', () => {
    // id からは "準備" が導出されるが、uiGroup が "習慣化" ならそちらを使う
    const it = item({ id: 'addon_adherence_habit_routine_link', uiGroup: '習慣化' })
    assert.equal(getSubGroupLabel(it.id), '準備')
    assert.equal(resolveSubGroup('k', it), '習慣化')
  })

  test('同じ Blue でも「事前準備」と「習慣化」は別クラスタになる', () => {
    const entries: [string, AddonItem][] = [
      ['a', item({ id: 'addon_adherence_prep_previous_night', uiVariant: 'rightAccentBlue', uiGroup: '事前準備' })],
      ['b', item({ id: 'addon_adherence_habit_routine_link', uiVariant: 'rightAccentBlue', uiGroup: '習慣化' })],
    ]
    const clusters = buildSubClusters(entries)
    assert.equal(clusters.length, 2, '同色でも uiGroup が異なれば分割されなければならない')
    assert.deepEqual(clusters.map(c => c.label), ['事前準備', '習慣化'])
  })

  test('同じ uiVariant かつ同じ uiGroup なら 1 クラスタに統合される', () => {
    const entries: [string, AddonItem][] = [
      ['a', item({ id: 'addon_adherence_notification_alarm', uiVariant: 'rightAccentBlue', uiGroup: '通知' })],
      ['b', item({ id: 'addon_adherence_notification_app', uiVariant: 'rightAccentBlue', uiGroup: '通知' })],
    ]
    const clusters = buildSubClusters(entries)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0].label, '通知')
    assert.deepEqual(clusters[0].entries.map(([k]) => k), ['a', 'b'])
  })
})

describe('addonSubGroups — rightAccentAmber（薬剤固有介入）', () => {
  test('Amber は Blue / Lavender のいずれにも吸収されず独立クラスタになる', () => {
    const entries: [string, AddonItem][] = [
      ['spec', item({ id: 'addon_glinide_before_meal_guidance', uiVariant: 'rightAccentAmber', uiGroup: '薬剤固有介入' })],
      ['a', item({ id: 'addon_adherence_notification_alarm', uiVariant: 'rightAccentBlue', uiGroup: '通知' })],
      ['b', item({ id: 'addon_adherence_visual_note', uiVariant: 'rightAccentLavender', uiGroup: '視覚化' })],
    ]
    const clusters = buildSubClusters(entries)
    assert.equal(clusters.length, 3)
    assert.equal(clusters[0].uiVariant, 'rightAccentAmber')
    assert.equal(clusters[0].label, '薬剤固有介入')
    assert.deepEqual(clusters[0].entries.map(([k]) => k), ['spec'])
  })

  test('Amber が Lavender へ fallback しない（uiVariant が保持される）', () => {
    const clusters = buildSubClusters([
      ['spec', item({ id: 'addon_alpha_gi_before_meal_guidance', uiVariant: 'rightAccentAmber', uiGroup: '薬剤固有介入' })],
    ])
    assert.equal(clusters[0].uiVariant, 'rightAccentAmber')
    assert.notEqual(clusters[0].uiVariant, 'rightAccentLavender')
  })

  test('薬剤固有介入 + Amber が先頭で 1 つの独立クラスタとして成立する', () => {
    // 内服標準（共通7件）の先頭に薬剤固有 ADDON を置いた実運用の並び
    const entries: [string, AddonItem][] = [
      ['spec', item({ id: 'addon_glinide_alpha_gi_before_meal_guidance', uiVariant: 'rightAccentAmber', uiGroup: '薬剤固有介入' })],
      ['n1', item({ id: 'addon_adherence_notification_alarm', uiVariant: 'rightAccentBlue', uiGroup: '通知' })],
      ['n2', item({ id: 'addon_adherence_notification_app', uiVariant: 'rightAccentBlue', uiGroup: '通知' })],
      ['v1', item({ id: 'addon_adherence_visual_calendar_checklist', uiVariant: 'rightAccentLavender', uiGroup: '視覚化' })],
      ['v2', item({ id: 'addon_adherence_visual_note', uiVariant: 'rightAccentLavender', uiGroup: '視覚化' })],
      ['p1', item({ id: 'addon_adherence_prep_previous_night', uiVariant: 'rightAccentBlue', uiGroup: '事前準備' })],
      ['p2', item({ id: 'addon_adherence_prep_before_meal', uiVariant: 'rightAccentBlue', uiGroup: '事前準備' })],
      ['f1', item({ id: 'addon_adherence_family_support_reminder', uiVariant: 'rightAccentLavender', uiGroup: '家族の支援' })],
    ]
    const clusters = buildSubClusters(entries)
    assert.deepEqual(
      clusters.map(c => [c.label, c.entries.length]),
      [['薬剤固有介入', 1], ['通知', 2], ['視覚化', 2], ['事前準備', 2], ['家族の支援', 1]],
    )
  })
})
