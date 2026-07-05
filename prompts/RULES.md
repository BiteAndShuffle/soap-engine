SOAPエンジン RULES.md — 横断ルール辞書 v1.1

# 概要・使い方

このファイルは P2B / P3 / P4 / P5 から横断参照される共通ルール辞書です。
各工程を開始する前にコンテキストに含めてください。

- **工程手順・build手順は含みません**（各工程ファイルを参照）
- **preservation対象の完全リストは P1.md が正本**（Section 4 参照）
- **bridge→JSON変換規則の正本は P0-B.md**（Section 5 の変換表はP0-Bと一部不整合あり→CHECK-T01）

最終更新: 2026-06-29

---

## 1. STANDARD_REFERENCE_PATHS

ローカルリポジトリ参照許可パス一覧。全工程で共通使用。

```
リポジトリroot: soap-engine/

module / 登録確認:
  data/modules/
  data/modules/index.ts

型・validator・runtime関連:
  lib/types.ts
  lib/moduleValidator.ts
  lib/scenarioValidator.ts
  lib/validationRunner.ts
  lib/search.ts
  lib/scenarioSelector.ts
  lib/buildSoap.ts
  lib/soapComposer.ts
  lib/createSoapFromInput.ts
  lib/addonFilter.ts
  lib/menuGroups.ts
  lib/personaGuard.ts
  lib/applyPersona.ts

package / build:
  package.json
  tsconfig.json
```

注意:
- 未指定の data/modules 内 JSON を「最新 Model JSON」「既存 canonical JSON」として自動選定してはならない
- 既存ファイルの値を対象 module へ無断流用してはならない
- ファイル不存在は推測せず NOT_FOUND として扱う

---

## 2. PROHIBITED_UNIVERSAL

全工程共通の禁止事項。各工程ファイルの PROHIBITED_* セクションはこの定義に加えて工程固有禁止を記載する。

**文書操作の禁止:**
- bridge 本文を修正しない
- S / O / A / P 本文を変更しない
- P_APPEND / P_CLOSING 本文を変更しない

**補完・生成の禁止:**
- alias を推定生成しない
- bridge にない alias を補完しない
- bridge にない search token を追加しない
- followup 文を生成しない（bridge 以外から）
- bridge に明記のない `display.subtitle` をブランド列挙や他モジュール模倣で生成しない
  （標準 fallback は `prompts/vNext/PN2-Drug-Header.md` の display.subtitle 確定ルールを参照）
- persona 本文を生成しない
- 医学的判断・医学的補足をしない
- creative build・creative 補完をしない
- deterministic 外補完をしない
- 既存 canonical JSON の値を対象 module へ無断流用しない

**工程逸脱の禁止:**
- 担当外工程の責務を先取りしない（例: P3 が JSON を修正するなど）
- ERROR / PENDING が残る状態で工程完了扱いにしない
- P0-D は Model JSON 自体が更新された場合のみ使用する（通常の JSON 生成では不要）
- P2A は任意工程。既存 Model JSON を器として利用できる場合は省略してよい

---

## 3. ERROR / PENDING / CHECK 共通定義

### ERROR（停止・差し戻し条件）
- bridge preservation 違反（本文変更・欠落・追加）
- 件数不一致（scenario / addon / brandCatalog / alias / followup）
- 本文不一致（S / O / A / P / P_CLOSING）
- alias 推定生成 / bridge 外 alias 追加
- followup 不一致 / addon 参照欠落
- mandatory diff 未解決
- baseline persona drift
- drug.nameAliases ≠ drug.search.nameAliases（順序・表記・件数のいずれかが不一致）
- addons.orderPresets が欠落、または object 型以外（null / array / string）
- sideEffectPresence に有効7値以外の値
- sComposition.template に禁止値（adjustment_based / adherence_based / continuation_based / outcome_based）
- sComposition に禁止キー（adjustmentCodes / adherenceCodes / outcomeCodes / severity）
- sComposition.intent に禁止値（side_effect_absent / adherence_good / adherence_poor）
- SStructured.role に禁止語彙（treatment_adjustment_reason / adherence_observation / side_effect_observation / symptom_observation）
- AStructured.role に禁止語彙（drug_mechanism / lifestyle_assessment）
- PStructured.role に禁止語彙（treatment_start_reason / followup_monitoring）
- Structured.role に未確認推測生成語彙（ユーザー事前確認なし）
- scenarios[].mergePolicy.S.groupKey が composition.groupKeyRegistry 外の値
- treatment_end 系シナリオの scenarioGroup が個別値以外（例: "treatment_end" を設定 → Section 12 参照）
- sickday シナリオの situationFilter が ["sickday"] 以外（Section 13 参照）
- O フィールドに {{drug_subject}} でない固定薬剤名（ブランド名 / genericName / drugClass 固定）
  ※ O フィールドは全シナリオで {{drug_subject}} 必須。主語省略は O では許容しない。
  ※ S / A / P の主語省略許容シナリオ（adherence 系 / lifestyle_guidance 系 / sickday 系 / injection_technique 等）では
     S に {{drug_subject}} が含まれなくても正常（bridge 設計上の主語省略意図のため）。
- injection module の対象シナリオに thirdPanelSPlacement 欠落（Section 14 参照）
- addon 必須フィールドが1件でも欠落（Section 15 参照）
- scenario の clinicalTags / counselingTags / workflowTags が欠落（[] でも必須 → Section 16 参照）
- commonSearchTokens / formulationSearchTokens が aliases / normalizedAliases / aliasToBrand へ展開された状態

### PENDING（人間判断・方針確認待ち）
- 格納先が一意に決まらない
- 型が不明
- 人間判断が必要
- 対応表不足
- Model JSON / JSON RULE / APP RULE 間の前提不一致
- 既存 canonical JSON との統合方針確認が必要
- Express / thirdPanel 参照方針が不明
- persona 構造の扱いが未確定
- PN1 の P_CLOSING 対応表にない文言が出現した場合の followupRef 確定
  （Claude が独自命名で確定してはならない。停止して人間承認を待つ → `prompts/vNext/PN1-Text-Extraction.md` 参照）

### CHECK（build 可能・後続工程で確認が必要）
- commonSearchTokens / formulationSearchTokens の検索 runtime 確認が必要
- multi-token AND 検索 / formulation token 検索の app 受け口確認が必要
- module registry 登録確認（data/modules/index.ts）
- app 型定義確認（lib/types.ts）
- validator / loader 受け口確認
- search runtime 確認・UI 表示確認・SOAP 生成確認
- Express Mode / thirdPanel 動作確認
- persona 受け口確認

**AUTORUN モード（vNext）における CHECK の扱い:** CHECK は ERROR ではなく build 可能な状態だが、
AUTORUN モードでは無視して PN8 へ自動継続してはならない。CHECK が 1 件でも残る場合は停止し、
人間が内容を確認・明示承認した場合のみ PN8 へ進める（詳細: `prompts/vNext/AUTORUN.md` MUST_STOP 条件）。

### 分類優先順位
1. bridge preservation 違反 → ERROR 優先
2. mandatory diff FAIL → ERROR 優先
3. 格納先・方針未確定（preservation 違反なし）→ PENDING
4. JSON 成立・preservation 違反なし・後続確認が必要 → CHECK
5. NOT_CHECKED が残る場合は BUILD_OK / STRUCTURE_OK / RUNTIME_OK にしない

---

## 4. MANDATORY_PRESERVATION_TARGETS（P1 参照定義）

P2 での完全保持対象は **P1.md 「MANDATORY_PRESERVATION_TARGETS」節を正本**とする。
各工程での全件再列挙は不要。本節は参照ポインタのみ。

| カテゴリ | 代表項目 |
|---|---|
| Count | scenario件数 / addon件数 / brandCatalog件数 / alias件数 / followup件数 |
| Identity | scenario id / scenario title / addon key / addon id / addon title / brand identity |
| Brand/Alias | brandCatalog / aliases / normalizedAliases / aliasToBrand / search aliases / drug.nameAliases |
| SearchToken | commonSearchTokens / formulationSearchTokens / matchPolicy 系 |
| Text | S / O / A / P / P_APPEND / P_CLOSING |
| Followup | defaults.followup / followupProfiles / followupRef |
| Reference | P_ADDON / addonsRef / addon 参照先 / followupRef 参照先 |
| Persona | bridge tone / 説明密度 / 距離感 / counseling weight |

→ **全件・詳細は P1.md の MANDATORY_PRESERVATION_TARGETS を必ず確認すること**

---

## 5. type → addon group 変換ルール

bridge の addon type を canonical JSON の group / targetSection に変換する対応表。
P2B ADDON_BUILD 時に参照する。

| bridge type | group（JSON値） | targetSection |
|---|---|---|
| lifestyle_guidance | "counseling" | "P" |
| **side_effect_guidance** | **"sideEffects"** | "P" |
| glycemic_guidance | "counseling" | "P" |
| sickday_guidance | "sickday" | "P" |
| adherence_guidance | "adherence" | "P" |

**未定義 type が出た場合**: 推測生成せず CHECK として停止し、人間に確認してからマッピングを決定する。

> ⚠️ **CHECK-T01（P0-B不整合）**: P0-B.md の変換表では `side_effect_guidance → group: "counseling"` と記載されているが、P2B.md / 実 canonical JSON の全実績 / 前セッション修正実績は `"sideEffects"` が正しい。RULES.md では P2B.md・実 JSON 実績を正本として `"sideEffects"` を採用する。P0-B.md の該当行は未修正（要更新: Step 6 対象）。

---

## 6. addon group 有効値

### アプリ正式定義: AddonPanel.tsx GROUP_ORDER（4グループ）

```typescript
const GROUP_ORDER: string[] = ['counseling', 'oral', 'sickday', 'sideEffects']
```

GROUP_ORDER に定義されたグループのみ正式ラベル（「服薬指導」/「内服アドオン」/「シックデイ」/「副作用」）で表示される。
GROUP_ORDER 外のグループは「未定義グループ」としてグループ名をそのままラベルとして末尾に表示（graceful fallback）。

### JSON_STANDARD.md 定義（5グループ）

`"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"`

> ⚠️ **CHECK-G01（AddonPanel不整合）**: JSON_STANDARD.md では `"adherence"` を有効値として定義しているが、AddonPanel.tsx の GROUP_ORDER には `"adherence"` が含まれていない。`"adherence"` を group に設定した addon は「未定義グループ」として末尾に表示される（機能はするが正式ラベルなし）。AddonPanel.tsx に `"adherence"` を追加するか、JSON_STANDARD.md を修正するか要判断。

### 実 JSON での使用状況

| group値 | GROUP_ORDER | JSON_STANDARD.md | 実 JSON 使用状況 |
|---|---|---|---|
| counseling | ✓ | ✓ | 全 module |
| oral | ✓ | ✓ | allergy 内服 module |
| sickday | ✓ | ✓ | 全 module |
| sideEffects | ✓ | ✓ | 全 module |
| adherence | — | ✓ | GLP-1 / insulin / allergy / derm 各 module |
| administration_guidance | — | — | allergy_eye_drops 系 |
| lifestyle_guidance | — | — | allergy / derm 系 |

> ⚠️ **CHECK-G02（legacy group）**: `administration_guidance` / `lifestyle_guidance` は複数の実 JSON で group 値として使用されているが、JSON_STANDARD.md にも AddonPanel GROUP_ORDER にも未登録。type→group 変換表では `lifestyle_guidance（bridge type）→ "counseling"（JSON group）` と定義されており、新規 module でこれらの値を group として直接使用しないこと。既存ファイルの migration 要否は別途判断。

### 新規 module での使用基準

新規 module の addon group には以下5値のみ使用する:
`"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"`

---

## 7. side_effect_guidance → group: "sideEffects" ルール

bridge type `side_effect_guidance` の addon は canonical JSON の group を `"sideEffects"` とする。

```json
{
  "group": "sideEffects",
  "targetSection": "P"
}
```

誤り: `group: "counseling"`（P0-B.md 現行記載値は不正確 → CHECK-T01 参照）

根拠:
- P2B.md 変換表（"sideEffects" と明記）
- dm_insulin_rapid_analog / dm_glp1ra_injection / dm_gip_glp1ra_tirzepatide_injection 全実値
- 前セッション修正実績（allergy_h1 / allergy_ltra の `addon_liver_warning_detail` を "counseling" → "sideEffects" に修正済み）

---

## 8. drug.nameAliases と drug.search.nameAliases 完全一致ルール

`drug.nameAliases` と `drug.search.nameAliases` は**順序・表記・エントリ数が完全一致**していなければならない。

**BUILD 手順**: drug.search.nameAliases を先に確定させてから drug.nameAliases を完全複写する。drug.nameAliases を先に生成してはならない。

検証:
```
drug.nameAliases[i] === drug.search.nameAliases[i]  for all i
len(drug.nameAliases) === len(drug.search.nameAliases)
```

不一致は ERROR。

実証（3代表 module 全て match 確認済み）:
- dm_insulin_rapid_analog: 17件 / 17件
- dm_glp1ra_injection: 15件 / 15件
- dm_gip_glp1ra_tirzepatide_injection: 4件 / 4件

---

## 9. brandCatalog aliases / normalizedAliases 整合ルール

各 brand エントリの `aliases` と `normalizedAliases` の関係:
- `aliases`: 表記揺れ別名（カタカナ・英数字可）
- `normalizedAliases`: aliases をひらがな正規化したもの（検索インデックス用）
- aliases の件数 === normalizedAliases の件数（1対1対応）

不一致は ERROR（alias identity 破壊）。

---

## 10. aliasToBrand 全 alias 網羅ルール

`drug.aliasToBrand` は全 brandCatalog エントリの `normalizedAliases` をキーとして過不足なく網羅しなければならない。

ルール:
- `set(aliasToBrand.keys()) === union(brand.normalizedAliases for brand in brandCatalog.values())`
- 各キーの値は対応する brandCatalog のキー（brand 表示名）
- 過不足（追加・欠落）は ERROR

実証:
- dm_insulin_rapid_analog: 17件 / 17件 完全一致
- dm_glp1ra_injection: 15件 / 15件 完全一致

---

## 11. addons.orderPresets は object 必須ルール

| 状態 | 判定 |
|---|---|
| addons.items が存在するのに orderPresets キーが欠落 | ERROR |
| orderPresets が null / array / string | ERROR |
| orderPresets が `{}` | PASS（bridge 未明示時の標準値） |
| orderPresets に bridge 明示の preset key が存在 | PASS |

bridge 未明示の preset key を推測生成してはならない。
未使用時は必ず `"orderPresets": {}` を明示する。

---

## 12. treatment_end 系 scenarioGroup 個別値ルール

treatment_end 系シナリオの `scenarioGroup` には以下の個別値を使用する。

| scenario id | scenarioGroup |
|---|---|
| end_improved | "end_improved" |
| end_insufficient_effect | "end_insufficient_effect" |
| end_ineffective | "end_ineffective" |

**混同禁止**: `"treatment_end"` は `mergePolicy.S.groupKey` の参照先（groupKeyRegistry 値）。`scenarioGroup` に `"treatment_end"` を設定することは ERROR。

---

## 13. sickday シナリオの situationFilter ルール

sickday シナリオの `situationFilter` は `["sickday"]` のみ。`"general"` を含めてはならない。

```json
正: "situationFilter": ["sickday"]
誤: "situationFilter": ["general", "sickday"]
誤: "situationFilter": ["sickday", "general"]
```

違反は ERROR。

---

## 14. injection module の thirdPanelSPlacement 標準ルール

`composition.nodeKey` に `_injection` を含む注射薬 module では、以下のシナリオが存在する場合に `thirdPanelSPlacement` を必ず追加する（bridge 未記載でも model_managed 項目として必須）。

**対象シナリオ id:**
- `se_injection_site_induration_none`
- `se_hypo_none`
- `cp_good`

**追加値（固定・変更禁止）:**
```json
"thirdPanelSPlacement": {
  "enabled": true,
  "trigger": "single_drug_only",
  "mode": "replace",
  "persistAsCompositionBase": true
}
```

欠落は ERROR。

根拠: dm_glp1ra_injection / dm_insulin_rapid_analog で3シナリオ全て確認済み。dm_gip_glp1ra_tirzepatide_injection は se_injection_site_induration_none / se_hypo_none は確認済み。

> ⚠️ **CHECK-TP01（既存 JSON 不整合）**: `dm_gip_glp1ra_tirzepatide_injection.json` の `cp_good` シナリオに `thirdPanelSPlacement` キーが存在しない。本ルールに従い次回 audit 時に追加が必要。

---

## 15. addon 必須フィールドルール

`addons.items[]` の各エントリには以下 **12 フィールドが全件必須**。

| フィールド | 型 | 未確定時のデフォルト |
|---|---|---|
| key | string | addon マップキーと同値 |
| id | string | key と同値 |
| title | string | — |
| group | string | Section 5 / 6 の変換表参照 |
| targetSection | string | 原則 "P" |
| text | string | bridge 本文そのまま |
| clinicalTags | array | `[]` |
| counselingTags | array | `[]` |
| workflowTags | array | `[]` |
| evidenceRefs | array | `[]` |
| intentTags | array | `[]` |
| tone | string\|null | `"standard"` または `null`（既存 module 準拠） |

TypeScript 型上は optional でも、世代差として欠落は**構造 ERROR**（tsc / build 通過でも ERROR とする）。

**targetSection 欠落の特記**: `buildNodeFields` の P 挿入分岐に到達しないため addon が UI に反映されない「無声の失敗」が起きる。

---

## 16. scenario 共通 omit 禁止フィールドルール

全シナリオに以下 3 フィールドが必須。値未確定でも `[]` を明示出力する（key ごと omit は禁止）。

| フィールド | 型 | 未確定時 |
|---|---|---|
| clinicalTags | array | `[]` |
| counselingTags | array | `[]` |
| workflowTags | array | `[]` |

TypeScript 型上は optional でも、世代差として欠落は ERROR。

**O フィールドの薬剤名ルール（全シナリオ必須）**:
- 正: `"{{drug_subject}}　処方"` / `"{{drug_subject}}　使用中"`
- 誤: ブランド名固定 / genericName 固定 / drugClass 固定

`O` フィールドの薬剤名部分は必ず `{{drug_subject}}` を使用する。固定文字列のままだと `resolveDrugSubject()` で置換されず UI 上で薬剤名が表示されない。

---

## 17. sComposition / sideEffectPresence / Structured.role 共通値ルール

### sideEffectPresence 有効値（7値のみ）

| 値 | 意味 |
|---|---|
| `not_applicable` | 副作用軸以外（初回 / 増量 / 減量 / adherence / 終了 / lifestyle / sickday 等） |
| `absent_or_not_observed` | 副作用なし確認シナリオ（se_\*_none 系） |
| `present_mild` | 副作用あり・軽度・継続 |
| `present_moderate` | 副作用あり・中等度・継続 |
| `present_dose_decrease` | 副作用あり → 減量 |
| `present_change` | 副作用あり → 変更 |
| `present_stop` | 副作用あり → 中止 |

禁止値（ERROR）: `present_continue` / `present_severe` / `present_active` 等の推測生成値

### sComposition 有効値・禁止値

**template 有効値（2値のみ）:**
- `"symptom_based"`: treatment_start 系（初回開始 / 再開 / 外部継続等）
- `"status_based"`: treatment_adjustment / side_effect / adherence / treatment_end 等

**template 禁止値（ERROR）:** `adjustment_based` / `adherence_based` / `continuation_based` / `outcome_based`

**禁止キー（ERROR）:** `adjustmentCodes` / `adherenceCodes` / `outcomeCodes` / `severity`

**正規キースキーマ:** `intent` / `template` / `symptomCodes` / `symptoms`

**intent 有効値（scenarioType 別）:**

| scenarioType 系 | intent 有効値 |
|---|---|
| treatment_start 系 | `new_addition` / `restart` / `external_continuation` |
| treatment_adjustment 系 | `dose_increase` / `dose_decrease` |
| side_effect（なし確認） | `side_effect_check` |
| side_effect（あり） | `side_effect_present` / `stop` / `dose_decrease` |
| adherence 系 | `adherence_check` / `continue` / `status_report` / `as_needed_use` |
| treatment_end 系 | `treatment_end` / `stop` |

**intent 禁止値（ERROR）:** `side_effect_absent` / `adherence_good` / `adherence_poor`

**treatment_start 系 intent 細分（必須）:**
- id が initial / new_addition 系 → `intent: new_addition`
- id が restart 系 → `intent: restart`
- id が external_start 系 → `intent: external_continuation`
- 全 treatment_start シナリオに一律 `new_addition` を設定してはならない

### Structured.role 確立済み語彙

**SStructured.role:**

| role 値 | 適用対象 |
|---|---|
| `treatment_start_reason` | treatment_start 系の S 行 |
| `dose_adjustment_reason` | treatment_adjustment 系の S 行 |
| `side_effect_status` | sideEffectPresence=absent_or_not_observed の全 S 行 |
| `side_effect_presence` | sideEffectPresence=present_\* の全 S 行 |
| `adherence_status` | adherence 系 / lifestyle_guidance 系 / usage 系の全 S 行（sickday / followup 型を含む） |
| `treatment_end_reason` | treatment_end 系の S 行 |

**sickday / followup 型の SStructured.role（明示ルール）:**

| シナリオ型 | S フィールドの性質 | 使用する role |
|---|---|---|
| `scenarioType: sickday` | 体調不良・食事摂取不能等の状況報告 | `adherence_status`（usage 系として扱う） |
| `scenarioType: followup`（injection_technique_check 等） | 注射手技・使用状況の確認 | `adherence_status`（usage 系として扱う） |

`sickday_status` / `followup_status` という語彙は存在しない（ERROR）。`adherence_status` を使用すること。

**SStructured.role 禁止語彙（ERROR）:** `drug_status` / `treatment_adjustment_reason` / `adherence_observation` / `side_effect_observation` / `symptom_observation` / `sickday_status` / `followup_status`

> `drug_status` は未定義語彙。treatment_start 系 → `treatment_start_reason`、dose_change 系 → `dose_adjustment_reason`、end 系 → `treatment_end_reason` を使うこと。

**AStructured.role:**

| role 値 | 適用対象 |
|---|---|
| `treatment_assessment` | 汎用（treatment_start / adjustment / adherence / lifestyle 等） |
| `side_effect_assessment` | side_effect 系の A 行 |
| `adherence_assessment` | adherence 系（treatment_assessment との混用不可） |
| `treatment_end_assessment` | treatment_end 系（treatment_assessment との混用不可） |

**AStructured.role 禁止語彙（ERROR）:** `drug_mechanism` / `lifestyle_assessment` / `sickday_assessment` / `risk_assessment` / `clinical_guidance`
（sickday 系 A 行は `treatment_assessment` を使用すること。risk_assessment / clinical_guidance は `treatment_assessment` で代替すること）

**PStructured.role 確立済み語彙（正規）:**

| role 値 | 適用対象 |
|---|---|
| `drug_effect_explanation` | 薬剤効果の説明 |
| `side_effect_attention` | 副作用注意喚起 |
| `side_effect_guidance` | 副作用時の対処指導 |
| `dose_adjustment_guidance` | 増量・減量の指導 |
| `treatment_end_guidance` | 中止・変更の指導 |
| `adherence_guidance` | アドヒアランス指導 |
| `followup_guidance` | 次回受診・経過観察の指示 |
| `lifestyle_guidance` | 生活指導 |
| `administration_guidance` | 投与方法・手技の指導 |
| `sickday_guidance` | シックデイルール指導 |
| `urgent_consult_guidance` | 緊急受診・医師相談の指示 |

**PStructured.role 禁止語彙（ERROR）:** `treatment_start_reason`（P フィールド内での使用）/ `followup_monitoring` / `administration_instruction`

> `administration_instruction` は未定義語彙 → `administration_guidance` を使うこと。

**`followup_monitoring` のスコープ明確化（混同禁止）:**
- `PStructured.role` に `followup_monitoring` を使用 → **ERROR**（`followup_guidance` を使用すること）
- `intentTags[]` に `followup_monitoring` を使用 → **許容**（PN3A で確立済みの intentTag 語彙）

**side_effect 系 S 行の区別（混同禁止）:**
- `sideEffectPresence = absent_or_not_observed` の S 行 → `side_effect_status`
- `sideEffectPresence = present_*` の S 行 → `side_effect_presence`

**新規 role 語彙が必要な場合（推測生成禁止）:**
1. 既存語彙での代替可能性を確認する
2. 代替不能の場合のみ新規語彙を使用してよい
3. 必ずユーザーに事前確認する

---

## 18. composition.priority 型ルール

`composition.priority` は **文字列** を使用すること。整数値は禁止（ERROR）。

**有効値（文字列）:**

| 値 | 意味 |
|---|---|
| `"chronic"` | 慢性期維持管理薬（インスリン、GLP-1、抗アレルギー薬等） |
| `"acute"` | 急性期治療薬 |
| `"prn"` | 頓服・症状時使用薬 |

**禁止値（ERROR）:** 整数 `5` 等の数値型 — 旧形式。bridge からの自動生成でも整数を設定してはならない。

> 参照: `docs/JSON_STANDARD.md §JS-A-composition` / `prompts/vNext/PN2-Drug-Header.md フォールバックテーブル`

---

## CHECK 事項（既存ファイルとの不整合・Step 1.5 時点）

| ID | ステータス | 内容 | 影響ファイル | 推奨対応 |
|---|---|---|---|---|
| CHECK-T01 | **RESOLVED** | P0-B.md の変換表に `side_effect_guidance → "counseling"` と記載されていたが `"sideEffects"` が正しい | prompts/P0-B.md | Step 1.5 で修正済み |
| CHECK-G01 | OPEN | `"adherence"` group が JSON_STANDARD.md に有効値として定義されているが AddonPanel.tsx GROUP_ORDER 未登録（下記詳細参照） | app/components/AddonPanel.tsx / docs/JSON_STANDARD.md | AddonPanel に `"adherence"` を追加するか GROUP_LABELS に日本語ラベルを定義するか要判断 |
| CHECK-G02 | OPEN | `"administration_guidance"` / `"lifestyle_guidance"` が実 JSON の group 値として使用されているが JSON_STANDARD.md / GROUP_ORDER 未登録（下記詳細参照） | allergy / derm 系 data/modules/*.json | 新規 module では使用しないこと。既存ファイルの migration 要否は別途判断 |
| CHECK-TP01 | OPEN | `dm_gip_glp1ra_tirzepatide_injection.json` の `cp_good` に `thirdPanelSPlacement` キーが存在しない（Section 14 ルール違反） | data/modules/dm_gip_glp1ra_tirzepatide_injection.json | 次回 audit 時に thirdPanelSPlacement 固定値を追加する |
| CHECK-O01 | **RESOLVED** | `dm_glp1ra_semaglutide_oral`（全28シナリオ）・`dm_glp1ra_injection`（全34シナリオ）の O フィールドが `{{drug_subject}}` ではなく薬効分類名固定（`GLP-1受容体作動薬(内服)`/`(注射)`）になっていた（Section 16 O フィールドルール違反）。旧体系生成時からの既存欠陥で、2026-07 の多剤合成テストで発見 | data/modules/dm_glp1ra_semaglutide_oral.json / data/modules/dm_glp1ra_injection.json | 2026-07 修正済み（状態語は保持したまま `{{drug_subject}}` へ置換）。新規 module では Section 16 を厳守すること |

---

### CHECK-G01 詳細（adherence group）

**事実確認（Step 1.5 調査済み）:**
- `"adherence"` を group として使用しているモジュール: **12件**（全 DM injection / oral GLP-1 / allergy 内服 / 全 derm）
- AddonPanel.tsx `GROUP_ORDER = ['counseling', 'oral', 'sickday', 'sideEffects']` — `"adherence"` は含まれない
- `GROUP_LABELS` にも `"adherence"` の日本語エントリなし
- **UI 表示挙動**: `"adherence"` グループは `unknownGroups` として GROUP_ORDER の4グループより後に配置され、ラベルは `GROUP_LABELS["adherence"] ?? "adherence"` = **英語のまま "adherence"** と表示される
- addon ボタン自体は正常に動作する（toggle / SOAP 挿入機能に問題なし）

**JSON_STANDARD.md の記述との矛盾:**
- JSON_STANDARD.md 行 147: `"counseling" / "sideEffects" / "sickday" / "adherence" / "oral" のいずれか（AddonPanel.tsx GROUP_ORDER 定義）` と記載
- しかし AddonPanel.tsx GROUP_ORDER には `"adherence"` が存在しない → 記述の括弧内が不正確

**要判断の選択肢（どちらも今回未実施）:**
- A: AddonPanel.tsx の GROUP_ORDER / GROUP_LABELS に `"adherence"` を追加し、日本語ラベル（例: 「アドヒアランス」）を定義する
- B: JSON_STANDARD.md の括弧内表現を `"adherence" は GROUP_ORDER 外・末尾表示` と修正し、現状を正式仕様として文書化する

---

### CHECK-G02 詳細（administration_guidance / lifestyle_guidance group）

**事実確認（Step 1.5 調査済み）:**

| group 値 | 使用モジュール数 | 代表モジュール |
|---|---|---|
| `administration_guidance` | 3件 | allergy_chemical_mediator_release_inhibitor_eye_drops / allergy_h1_antihistamine_eye_drops / allergy_h1_antihistamine_second_gen_oral |
| `lifestyle_guidance` | 8件 | allergy_chemical_mediator_release_inhibitor_eye_drops / allergy_h1_antihistamine_eye_drops / allergy_h1_antihistamine_second_gen_oral / allergy_leukotriene / 全 derm_heparinoid 4件 |

- どちらも AddonPanel GROUP_ORDER 外 / GROUP_LABELS 未定義
- **UI 表示挙動**: `"administration_guidance"` → ラベル **"administration_guidance"**（英語アンダースコア区切り）、`"lifestyle_guidance"` → ラベル **"lifestyle_guidance"** として表示される。いずれも GROUP_ORDER の4グループより後に表示される
- addon ボタンは正常動作

**type → group 変換表との関係:**
- Section 5 の変換表: `lifestyle_guidance（bridge type）→ group: "counseling"`（JSON group 値は "counseling"）
- これは **bridge の addon type** が `lifestyle_guidance` の場合の変換規則
- 既存 JSON で使われている `group: "lifestyle_guidance"` は **JSON の group 値として直接設定されたもの**（変換前）
- つまり、これらの既存モジュールは変換表が定義される前に生成された可能性がある、または意図的に別グループとして設計された

**新規 module への影響:**
- bridge type が `lifestyle_guidance` → Section 5 変換表に従い `group: "counseling"` とすること（`group: "lifestyle_guidance"` にしてはならない）
- bridge type が `administration_guidance` → 変換表に未定義。新規 module での使用は PENDING として人間確認を要する

---

## 19. Semantic Equivalence Rule（意味論的等価性ルール）

### 原則

複数のデータ型が仕様として許容される項目（例: `string` / `string[]`）は、
**値の意味・内容**を比較対象とする。

**データ型のみを理由に FAIL としてはならない。**

監査処理・検索処理・ランタイム処理はいずれも両形式をサポートし、
型の違いで動作が変わらないよう実装すること。

### 適用対象

| フィールド | 許容型 | 判定方法 |
|---|---|---|
| `index.searchableText` | `string` / `string[]` | string: `"キーワード" in text` / string[]: `any("キーワード" in item for item in text)` |

将来 string / string[] 等の複数表現を許容する項目が追加された場合、
本セクションの表を更新し、各監査項目に判定方法を明記すること。

### 監査での扱い

- 各監査項目（PN7 等）はデータ型に応じた判定方法を個別に定義する（→ PN7-Q 参照）
- 「string[] なので FAIL」「string なので FAIL」は禁止
- 型変換（配列→文字列結合等）によって意味が失われる実装も禁止

### 実装ガイドライン

```typescript
// searchableText の型安全な検索例
function containsToken(searchableText: string | string[], token: string): boolean {
  if (Array.isArray(searchableText)) {
    return searchableText.some(item => item.includes(token));
  }
  return searchableText.includes(token);
}
```

---

## 20. addonsRef Source of Truth 原則

`scenarios[].addonsRef` は bridge の `P_ADDON` 記載を正本とする。

- bridge に無い addon を `addonsRef` にJSON側だけで追加してはならない
- bridge にある `P_ADDON` を `addonsRef` からJSON側だけで省略してはならない
- `addonsRef` の追加・削除のみで解決できる場合は `addonsRef` のみを修正する
- S/O/A/P・`addons.items` の本文変更が必要な場合は、判断せずに停止して報告する

（監査手順・チェック項目の詳細は `prompts/vNext/PN7-Cross-Reference-Audit.md` を参照）

---

## 21. genericName / genericKey 分離原則

`brandCatalog[brand]` の一般名関連フィールドは、表示用と判定用で役割を分離する。

| フィールド | 役割 |
|---|---|
| `genericName` / `displayGenericName` | 表示専用。人間が読む文字列 |
| `genericKey` | 検索グルーピング判定専用。表示には使わない |

- 「同一成分としてまとめてよいか」の判定は `genericKey` の一致で行い、表示文字列の一致に依存してはならない
- `genericKey` 省略時は `genericKey ?? displayGenericName ?? genericName` の優先順でフォールバックする
- 配合剤は単剤と同じ `genericKey` を使わず、専用の単一文字列キーを割り当てる（複数成分配列化は未導入 → `docs/OPEN_DESIGN_QUESTIONS.md` 参照）

（生成規則・命名規則の詳細は `prompts/vNext/PN2-Drug-Header.md` を参照）

---

## 22. Addon Independent Responsibility Principle（addonsRef 独立責務原則）

Addonは本文（S/O/A/P）を補助するための付随物ではなく、独立した責務を持つ。

- 本文の整理・移動・言い換えは、addonsRefを追加・削除・変更する理由にはならない
- addonsRefを変更してよいのは、Addon自身が担う責務が変化した場合のみである
- 「本文に同じ内容を書いた／書かなくなった」は、Addonの責務変化の根拠にはならない
- 本文とAddonは内容が重複していてもよい。責務が異なる限り、重複は削除理由にならない

§20（addonsRef Source of Truth 原則）との違い:
- §20 は「addonsRefはbridgeを正本とし、bridgeとJSONを一致させる」という同期の原則
- §22 は「addonsRefは本文編集の副作用で変更してはならない」という独立性の原則
- 両者は独立して適用する。addonsRefを変更する場合、その根拠が
  Addon自身の責務変化であることを常に説明できなければならない

---

## 23. Alias Fields Synchronization Principle（alias系フィールド同期原則）

`brandCatalog[].aliases` / `normalizedAliases` / `aliasToBrand` / `drug.nameAliases` /
`drug.search.nameAliases` / `drug.search.exactAliases` は、bridgeとJSONが常に
同期されている必要がある。

- これらのフィールドをJSON側だけで追加・変更した場合、bridgeへの反映漏れ
  （同期違反）として扱う
- 同期違反を検出した場合、機械的にどちらかを勝たせるのではなく、内容を確認して
  判断する。多くの場合はJSON側が実運用で検証済みであるため、bridge側を
  JSONに合わせて追記する対応になるが、JSON側に誤りが混入していた場合は
  逆にJSON側を修正する
- `drug.nameAliases` と `drug.search.nameAliases` はJSON内で常に完全一致していること
  （§8）に加え、bridge記載ともそれぞれ一致していること

§20（Addon Independent Responsibility Principle の前段、addonsRef Source of Truth）
との関係:
- §20 は「addonsRefの編集起点はbridgeであるべき」という**編集ワークフロー**の原則
- §23 は「alias系フィールドについて、bridgeとJSONの**状態が今一致しているか**」
  という同期状態そのものを扱う原則。§20と同じ編集規律をalias系フィールドにも
  適用する

（機械検証は `scripts/audit-alias-bridge-chain.ts`、監査手順の詳細は
`prompts/vNext/PN7-Cross-Reference-Audit.md` check AA を参照）

（監査手順の詳細は `prompts/vNext/PN7-Cross-Reference-Audit.md` check Z を参照）

---

## 24. Bridge Status State Machine（bridge凍結状態遷移ルール）

bridge（`bridges/{moduleId}.md`）の凍結状態は、会話ログではなく **ファイル冒頭のヘッダーコメント内 STATUS 表記** で機械的に判定する。

### 定義済み STATUS 値（4値のみ）

| STATUS 値 | 意味 |
|---|---|
| `HEADER_ONLY` | ヘッダー案（drug / composition / editingRules 等）のみ存在。SCENARIOS_START〜SCENARIOS_END が未作成または空 |
| `DRAFT` | シナリオ・addon本文が追加済みだが、ユーザーによる確認・凍結宣言を経ていない |
| `FROZEN_FOR_PN1` | ユーザーが本文を確認し、正式に凍結宣言した状態。PN1 の入力として使用してよい |
| `JSON_COMPLETE` | PN6（Assembly）で canonical JSON（`data/modules/{moduleId}.json`）へ反映済みの状態 |

STATUS はヘッダーコメント内に以下の形式で明記する。

```
# ⚠️ STATUS: {STATUS値} ⚠️
```

`{STATUS値}` は上記4値のいずれかの厳密な文字列を使用する（`FROZEN FOR PN1` のような表記ゆれ・空白区切りは不可。アンダースコア区切りの正規値のみ有効）。

### 状態遷移

```
HEADER_ONLY → DRAFT → FROZEN_FOR_PN1 → JSON_COMPLETE
```

- 逆行（例: FROZEN_FOR_PN1 → DRAFT への差し戻し）は、本文修正が必要になった場合にユーザーが明示的に指示した場合のみ行う。Claude が自主的に降格させてはならない
- 遷移を伴う変更は STATUS 行（および直後の説明コメント）のみを対象とする。SCENARIOS_START〜SCENARIOS_END 本文、ヘッダー設計（drug / brandCatalog / aliases / handlingTags / scenarioRequiredTags / composition 等）は STATUS 更新時に変更しない

### PN1 開始条件

- **PN1 を開始できるのは STATUS が `FROZEN_FOR_PN1` の bridge のみ**
- STATUS が `DRAFT` または `HEADER_ONLY` の bridge では PN1 を開始しない（ユーザーが「凍結済み」と発言していても、ファイル側の STATUS が異なる場合はファイルを優先する）
- STATUS が `JSON_COMPLETE` の bridge に対して PN1 を再実行する場合は、canonical JSON の再生成を意味するため、着手前にユーザーへ意図を確認する

### 優先順位ルール（会話ログ vs ファイル）

- **会話ログよりファイル上の STATUS を優先する**。ユーザーが会話で「凍結済み」「PN1へ進めます」と述べても、bridge ファイルの STATUS がそれと矛盾する場合は、ファイル側が正本
- STATUS とユーザー指示が矛盾する場合、Claude は推測で解決せず **作業を停止し、矛盾の内容をユーザーへ報告する**（例: STATUS=DRAFT のまま「PN1を開始してください」と指示された場合、PN1を開始せずに矛盾を報告する）
- STATUS を変更してよいのはユーザーが明示的に状態遷移を指示した場合のみ（例: 本メッセージのような「正式に凍結します」という指示）

### JSON_COMPLETE への遷移

- `JSON_COMPLETE` は PN6（Assembly）で `data/modules/{moduleId}.json` への Write が完了した時点、または PN8（Build/Runtime/Release）で RELEASE_OK と判定された時点でユーザーの指示に基づき設定する
- PN7（Cross Reference Audit）で FAIL が出た場合は `JSON_COMPLETE` へ遷移しない（`FROZEN_FOR_PN1` のまま差し戻し対応を行う）

（bridge作成〜PN1開始手順の全体像は `prompts/vNext/HANDOFF.md` を参照）
