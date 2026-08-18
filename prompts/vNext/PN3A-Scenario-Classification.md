# PN3A — Scenario Classification（シナリオ分類フェーズ）

## 参照
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL
→ prompts/RULES.md §12 treatment_end シナリオグループ
→ prompts/RULES.md §13 sickday situationFilter
→ prompts/RULES.md §14 injection module thirdPanelSPlacement
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS

## 位置づけ
すべての薬学的・臨床的判断をこの Phase で完結させる。
出力は決定表（JSON）のみ。JSON 本体への適用は行わない。

---

## 入力
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（各シナリオの id / S 参照）
- bridge.md のシナリオヘッダー行（type= / id= / title= の読み取り）

---

## 責務

各シナリオ・addon について以下の分類判断をすべて行い、決定表として出力する。

---

### シナリオ分類基準

#### scenarioType

| bridge type= | scenarioType |
|---|---|
| treatment_start | treatment_start |
| treatment_adjustment | treatment_adjustment |
| treatment_end | treatment_end |
| side_effect | side_effect |
| adherence | adherence |
| lifestyle_guidance | lifestyle_guidance |
| sickday | sickday |
| followup | followup |
| usage | usage（2026-07-24 正式値化。頓用使用等の「使用状況報告」系シナリオ。xStructured生成責務は PN4B。SStructured.role は既存確立語彙 `adherence_status` を使用し、新規role `as_needed_status` 等は使用しない → RULES.md §17 / PN4B-Structured-GroupB.md 参照） |

#### scenarioGroup

bridge type= と具体的な id / title から判断する。

| 内容 | scenarioGroup |
|---|---|
| 開始・再開・他所開始・自己中断後再開 | start_or_change |
| 用量変更（増量・減量） | dose_change |
| 副作用なし・注射部位 | injection_site |
| 副作用なし・低血糖 | hypoglycemia |
| 副作用継続・注射部位（軽症/中等度/変更/中止） | injection_site |
| 副作用継続・低血糖（軽症/中等度/減量/中止） | hypoglycemia |
| CP良好 | adherence_good |
| CP不良 | adherence_poor |
| 終了（改善） | end_improved ← RULES.md §12 |
| 終了（効果不十分） | end_insufficient_effect ← RULES.md §12 |
| 終了（無効・中止） | end_ineffective ← RULES.md §12 |
| 生活指導 | lifestyle_guidance |
| シックデイ | sickday |
| 注射手技（type=followup を含む） | injection_technique |

**followup 型の注射手技シナリオについて:**
`type=followup` かつ id / title が注射手技（injection_technique）に相当する場合、
`scenarioType: "followup"` / `scenarioGroup: "injection_technique"` とする。
例: `id=injection_technique_check`, `title=注射手技の確認` → scenarioGroup: "injection_technique"

#### situationFilter（必須判断）

| 条件 | situationFilter |
|---|---|
| `scenarioType: sickday` のシナリオ | `["sickday"]` ← RULES.md §13 |
| 副作用なしシナリオ（`se_*_none` パターン）| `["general", "sickday"]` |
| それ以外のすべて | `["general"]` |

#### sideEffectPresence

| 条件 | sideEffectPresence |
|---|---|
| 副作用シナリオ以外（treatment_* / adherence 等）| not_applicable |
| 副作用なし・未観察 | absent_or_not_observed |
| 副作用あり・軽症継続 | present_mild |
| 副作用あり・中等度継続 | present_moderate |
| 副作用あり・薬剤変更 | present_change |
| 副作用あり・減量 | present_dose_decrease |
| 副作用あり・中止 | present_stop |

#### sCompositionIntent

← RULES.md §17 の intent 有効値に準拠すること

| scenarioType | シナリオ内容 | intent |
|---|---|---|
| treatment_start | 初回追加 | new_addition |
| treatment_start | 再開 | restart |
| treatment_start | 他所開始・外部継続 | external_continuation |
| treatment_adjustment | 増量 | dose_increase |
| treatment_adjustment | 減量 | dose_decrease |
| treatment_end | 終了（改善・不十分・無効）| treatment_end |
| treatment_end | 中止 | stop |
| side_effect | 副作用なし確認 | side_effect_check |
| side_effect | 副作用あり継続 | side_effect_present |
| side_effect | 副作用→減量 | dose_decrease |
| side_effect | 副作用→中止 | stop |
| adherence | 継続確認・経過確認 | adherence_check |
| adherence | CP良好・継続 | continue |
| adherence | 状態報告 | status_report |
| lifestyle_guidance / sickday / followup | — | status_report |

**intent 禁止値（ERROR）:** `"side_effect_absent"` / `"adherence_good"` / `"adherence_poor"` / `"continuation"`

#### sCompositionTemplate

← RULES.md §17 の template 有効値（2値のみ）に従い、scenarioType ごとに決定する

| scenarioType | template |
|---|---|
| treatment_start | `"symptom_based"` |
| treatment_adjustment / treatment_end / side_effect / adherence / lifestyle_guidance / sickday / followup | `"status_based"` |

**template 禁止値（ERROR）:** `adjustment_based` / `adherence_based` / `continuation_based` / `outcome_based`

#### symptomCodes / symptoms

臨床的に観察された症状・検査値異常を識別する。

例:
- 高血糖: `["hyperglycemia"]` / `["血糖値が高い"]`
- 低血糖: `["hypoglycemia"]` / `["低血糖症状"]`
- 注射部位硬結: `["injection_site_induration"]` / `["注射部位の硬結"]`

副作用なし・CP良好・生活指導等、症状が観察されないシナリオでは `[]` とする。

#### mergePolicy.S.groupKey

| 内容 | groupKey |
|---|---|
| 高血糖・開始系 | hyperglycemia_management |
| 用量調整系 | glycemic_control_adjustment |
| 副作用・注射部位・低血糖モニタリング | side_effect_monitoring |
| アドヒアランス | adherence |
| 治療終了 | treatment_end |
| 生活指導 | lifestyle_guidance |
| シックデイ | sickday |
| 注射手技 | injection_technique |

**groupKey 設計原則（2026-07-24 追記。`allergy_h1_antihistamine_eye_drops` の groupKey 誤転用事例により明文化）:**

上表は DM/injection 系モジュールの実績値であり、他の薬効クラス・剤形へ機械的に転用するための固定語彙ではない。
`mergePolicy.S.groupKey` は分類ラベルではなく、**多剤合成時にS欄を意味的に統合してよい単位**を表す（`lib/types.ts` `ScenarioMergePolicyS.groupKey` の定義および `docs/DESIGN_PRINCIPLES.md` DP-02 参照）。

- 同一薬効クラスであっても、投与経路や症状領域が異なり S 文の意味統合が不適切な場合は groupKey を分離すること
  （例: 同じヒスタミンH1受容体拮抗薬でも、内服は鼻症状・皮膚症状・全身アレルギー症状を、点眼は眼のかゆみ・充血等の眼アレルギー症状を扱うため、`allergy_symptom_management`（内服）と `ocular_allergy_symptom_management`（点眼）を分離する）
- 既存モジュールの groupKey を「同じ薬効クラスだから」という理由だけで転用しないこと。転用前に、対象シナリオの臨床的な意味内容が既存 groupKey 使用モジュールと実際に同一グループとして統合してよいかを確認すること
- 判断に迷う場合は、対象2モジュールを同一患者が併用したときに、それぞれの S 文が1つの文へ結合されて医学的に不自然でないかを基準に判断する

#### intentTags

以下から該当するものをすべて選択する（複数可）:
- drug_effect_explanation
- side_effect_attention
- hypoglycemia_attention
- injection_site_attention
- dose_increase_explanation
- dose_decrease_explanation
- treatment_end_explanation
- lifestyle_guidance
- adherence_support
- sickday_guidance
- urgent_consult_advice
- followup_monitoring
- administration_instruction
- concomitant_drug_attention

#### thirdPanelSPlacement 対象判定

injection module においてのみ適用する。← RULES.md §14

**true とする3シナリオ:**
- `se_injection_site_induration_none`（副作用なし・注射部位）
- `se_hypo_none`（副作用なし・低血糖）
- `cp_good`（CP良好）

それ以外はすべて `false`。injection 以外のモジュールも `false`。

---

### addon 分類基準

#### addon group（bridge type= → group 変換）

| addon type= | group |
|---|---|
| lifestyle_guidance | counseling |
| side_effect_guidance | sideEffects |
| sickday_guidance | sickday |
| adherence_guidance | adherence |
| administration_guidance | counseling（2026-07-24 正式値化。bridge type は意味上の分類として `administration_guidance` のまま保持し、canonical JSON の group のみ `counseling` へ変換する。新規 group `administration_guidance` は追加しない → RULES.md §5 / CHECK-G02 参照） |

**注意:** `addon_se_hypoglycemia_guidance` は type= にかかわらず `sideEffects` グループとする（counseling ではない）。

#### addon uiVariant

bridge ヘッダーの `uiVariant=` フィールドから取得する。存在しない場合は `null`。

#### addon uiGroup

bridge ADDON ヘッダーの `uiGroup=` フィールドから取得する。**`uiVariant` と同じ扱い**（bridge ヘッダーを直接参照して取得する）。
存在しない場合は `addonDecisions[id]` へ `uiGroup` キー自体を含めない（`null` を明示的に設定しない）。
値の正規化・改名・推測補完は禁止。bridge 記載値をそのまま採用する。

#### addon requiredTags（Header map / inline 両対応）

bridge には2つの記法が存在しうる。**いずれも同じ canonical 格納先（`addons.items[].requiredTags`）を持つ、
表現形式が異なるだけの等価な metadata である。表現形式の統一は行わない（module ごとに好きな方式を使ってよい）。**

- **Header map 由来**: bridge Header の `addonRequiredTags:` ブロック（`{addon_id}: [tags...]` の id → tags map 形式）
- **inline 由来**: 個別 ADDON ヘッダー行の `｜requiredTags=[tags...]｜` トークン。`uiVariant` / `uiGroup` と同じ扱いで、
  bridge ヘッダーを直接参照して取得する（PN1 は経由しない）

**統合・競合規則（addon id ごとに判定）:**

1. map のみに記載がある → map の値を `addonDecisions[id].requiredTags` として採用する
2. inline のみに記載がある → inline の値を採用する
3. 両方に記載があり、値が完全一致（要素・順序とも） → その値を採用する。
   **ただし現 Repository には map/inline 併存の precedent が存在しないため、自動的に仕様化せず、
   PN3A 完了報告で「map と inline の両方に記載があった addon id」として個別に CHECK 報告する**
4. 両方に記載があり、値が不一致 → **MUST_STOP**。どちらか一方を優先しない・merge しない・union しない・
   タグを補完しない。該当 addon id と map 値・inline 値の両方を明示して報告し、
   Owner 確認を得るまで PN3A を完了させない
5. いずれにも記載がない → `addonDecisions[id]` へ `requiredTags` キーを含めない（空配列 `[]` を推測生成しない）

値の追加・削除・言い換えは禁止。取得した配列をそのまま転記する。

---

### scenario requiredTags（Header map / inline 両対応）

bridge には2つの記法が存在しうる。**いずれも同じ canonical 格納先（`scenarios[].scenarioRequiredTags`）を持つ、
表現形式が異なるだけの等価な metadata である。表現形式の統一は行わない。**

- **Header map 由来**: bridge Header の `scenarioRequiredTags:` ブロック（`{scenario_id}: [tags...]` の id → tags map 形式）
- **inline 由来**: 個別 SCENARIO ヘッダー行の `｜scenarioRequiredTags=[tags...]｜` トークン。bridge ヘッダーを
  直接参照して取得する（PN1 は経由しない）

**統合・競合規則（scenario id ごとに判定。addon requiredTags と同一原則）:**

1. map のみに記載がある → map の値を `scenarioDecisions[id].scenarioRequiredTags` として採用する
2. inline のみに記載がある → inline の値を採用する
3. 両方に記載があり、値が完全一致（要素・順序とも） → その値を採用する。
   PN3A 完了報告で該当 scenario id を CHECK として個別報告する
4. 両方に記載があり、値が不一致 → **MUST_STOP**。map 値・inline 値の両方と該当 scenario id を明示して報告する
5. いずれにも記載がない → `scenarioDecisions[id]` へ `scenarioRequiredTags` キーを含めない

値の追加・削除・言い換えは禁止。

---

### scenario scenarioColor（inline のみ・lossless preservation 専用）

bridge SCENARIO ヘッダー行の `｜scenarioColor=...｜` トークンから取得する。`uiVariant` / `uiGroup` と同じ扱いで、
bridge ヘッダーを直接参照して取得する（PN1 は経由しない）。

**Header map 形式は存在しない。** `addonRequiredTags:` / `scenarioRequiredTags:` とは異なり、現 Repository に
`scenarioColor:` の map ブロックは存在しない（実測済み）。したがって map/inline の統合・競合規則は不要であり、
inline 由来の単純な transcription のみを行う。将来 map 形式が出現した場合は、requiredTags と同型の統合・競合
規則を別途検討すること（今回は仕様化しない）。

**規則:**

- bridge SCENARIO ヘッダーに `scenarioColor=` が存在する → その値をそのまま `scenarioDecisions[id].scenarioColor` として保持する
- 存在しない → `scenarioDecisions[id]` へ `scenarioColor` キーを含めない（`null` も生成しない）

**絶対禁止（推測生成）:**

- `scenarioType` / `scenarioGroup` / `sideEffectPresence` / `id` の内容から色を推測・付与しない
- 既存の色導出ロジック（`lib/buildSoap.ts` の `scenarioToColor()`）が返すはずの fallback 結果を
  先取りして `scenarioColor` へ書き込まない（`scenarioColor` は「bridge に明示された値をそのまま運ぶ」
  ためのフィールドであり、「最終的に表示される色を計算する」フィールードではない）
- bridge に記載がない scenario へ補完しない

**許容値について:** `scenarioColor` の値は `lib/types.ts` の `ChipColor` 型と対応する（Unit B で追加済み）。
ただし本 Phase はこの値域を独自に列挙・検証しない。`uiVariant`（`rightAccentBlue` 等）と同じ precedent —
bridge に書かれた文字列をそのまま転記するのみで、正規化・変換・未知値の ERROR 化を行わない。
prompt 側に色の許容値リストを新設・複製しない（二重正本化を避ける）。

値の追加・削除・言い換えは禁止。

---

## 出力

`/tmp/soap-build/{moduleId}/phase3a_decisions.json` に保存する。

```json
{
  "scenarioDecisions": {
    "initial": {
      "scenarioType": "treatment_start",
      "scenarioGroup": "start_or_change",
      "situationFilter": ["general"],
      "sideEffectPresence": "not_applicable",
      "sCompositionIntent": "new_addition",
      "sCompositionTemplate": "symptom_based",
      "symptomCodes": ["hyperglycemia"],
      "symptoms": ["血糖値が高い"],
      "groupKey": "hyperglycemia_management",
      "intentTags": ["drug_effect_explanation", "side_effect_attention", "administration_instruction"],
      "thirdPanelSPlacement": false
    },
    "se_hypo_none": {
      "scenarioType": "side_effect",
      "scenarioGroup": "hypoglycemia",
      "situationFilter": ["general", "sickday"],
      "sideEffectPresence": "absent_or_not_observed",
      "sCompositionIntent": "side_effect_check",
      "sCompositionTemplate": "status_based",
      "symptomCodes": [],
      "symptoms": [],
      "groupKey": "side_effect_monitoring",
      "intentTags": ["hypoglycemia_attention", "followup_monitoring"],
      "thirdPanelSPlacement": true
    },
    "strength_increase_low_perceived_effect": {
      "scenarioType": "treatment_adjustment",
      "scenarioGroup": "dose_change",
      "situationFilter": ["general"],
      "sideEffectPresence": "not_applicable",
      "sCompositionIntent": "dose_increase",
      "sCompositionTemplate": "status_based",
      "symptomCodes": [],
      "symptoms": [],
      "groupKey": "glycemic_control_adjustment",
      "intentTags": ["dose_increase_explanation"],
      "thirdPanelSPlacement": false,
      "scenarioRequiredTags": ["concentration_variant"]
    },
    "switch_to_high_strength_reduced_frequency": {
      "scenarioType": "treatment_adjustment",
      "scenarioGroup": "dose_change",
      "situationFilter": ["general"],
      "sideEffectPresence": "not_applicable",
      "sCompositionIntent": "dose_increase",
      "sCompositionTemplate": "status_based",
      "symptomCodes": [],
      "symptoms": [],
      "groupKey": "glycemic_control_adjustment",
      "intentTags": ["dose_increase_explanation"],
      "thirdPanelSPlacement": false,
      "scenarioRequiredTags": ["reduced_frequency_option"],
      "scenarioColor": "orange"
    }
  },
  "addonDecisions": {
    "addon_glycemic_guidance": {
      "group": "counseling",
      "uiVariant": null
    },
    "addon_se_hypoglycemia_guidance": {
      "group": "sideEffects",
      "uiVariant": null
    },
    "addon_alarm": {
      "group": "adherence",
      "uiVariant": "rightAccentBlue"
    },
    "addon_glinide_before_meal_guidance": {
      "group": "adherence",
      "uiVariant": "rightAccentAmber",
      "uiGroup": "薬剤固有介入"
    },
    "addon_eye_drop_single_dose_mini": {
      "group": "counseling",
      "uiVariant": null,
      "requiredTags": ["single_use_container"]
    }
  },
  "groupKeyRegistry": [
    "hyperglycemia_management",
    "glycemic_control_adjustment",
    "side_effect_monitoring",
    "adherence",
    "treatment_end",
    "lifestyle_guidance",
    "sickday",
    "injection_technique"
  ]
}
```

`groupKeyRegistry` は全シナリオの groupKey 値をユニークに集約したリスト。

---

## 禁止事項

- 本文（S / O / A / P）を変更しない
- JSON 本体に何も書き込まない
- xStructured を生成しない
- 出力は決定表のみとする

---

## 次工程へのハンドオフ

PN3A 完了後、以下を報告する:
- 保存先
- 分類したシナリオ数
- thirdPanelSPlacement: true に設定したシナリオ（injection module の場合）
- situationFilter: ["sickday"] のみとしたシナリオ
- groupKeyRegistry のエントリ数
- uiGroup を保持した addon 数（bridge ADDON ヘッダーに `uiGroup=` が定義されていた件数）
- requiredTags を保持した addon 数（Header map 由来 / inline 由来を内訳で報告）
- scenarioRequiredTags を保持した scenario 数（Header map 由来 / inline 由来を内訳で報告）
- **CHECK**: map と inline の両方に requiredTags/scenarioRequiredTags 記載があった id（値が完全一致していた場合のみ。0件なら「該当なし」と明記）
- **MUST_STOP**: map と inline の値が不一致だった id（発生した場合、値の相違点を明示し PN3A を完了させない）
- scenarioColor を保持した scenario 数（bridge SCENARIO ヘッダーに `scenarioColor=` が定義されていた件数。内訳を値ごとに報告）

次工程: PN3B（Scenario Metadata Apply）
