# JSON_STANDARD.md

SOAP Engine — canonical JSON 構造標準

このドキュメントは canonical JSON の「どう書くか」を定義します。
「なぜそうするのか」という設計根拠は DESIGN_PRINCIPLES.md を参照してください。
「まだ決めていないこと」は OPEN_DESIGN_QUESTIONS.md を参照してください。

最終更新: 2026-06-20

---

## JS-00: 差分発見時の判断フロー

canonical JSON を監査・修正する前に、以下の順序で差分の性質を判断してください。

> 差分を発見した
> ↓
> **JS-A（全 module 必須）** に記載あり → 欠落なら修正必須
> ↓ なければ
> **JS-B（条件付き必須）** に記載あり → 対象条件を確認して判断
> ↓ なければ
> **JS-C（薬剤固有差分許容）** に記載あり → 意図的差分として保持
> ↓ なければ
> **JS-D（意図的差分許容）** に記載あり → 保持
> ↓ なければ
> **JS-E（保留事項）** に記載あり → OPEN_DESIGN_QUESTIONS.md を参照
> ↓ どこにもなければ
> 新規監査項目として記録・判断が必要

---

## JS-A: 全 module 必須

### top-level キー

新規作成標準（Pattern A）:

```
moduleId → moduleVersion → categoryPath → composition → drug → drugResolution
→ regulatory → topical → template → display → defaults → persona → scenarios
→ addons → ui → risks → searchConfig → index → tagCatalog → expressModes
```

- runtime / validator は top-level key 順序に依存しない（名前アクセスのみ）
- 既存ファイルに Pattern B（`regulatory → topical` が先行する形式）が存在するが、機能差がないため並び替え不要
- 新規作成時のみ Pattern A を標準とする

| キー | 型 | 備考 |
|---|---|---|
| `moduleId` | string | スネークケース。categoryPath 末端を反映 |
| `moduleVersion` | string | JSON では保持する（bridge では定義しない: DP-04）|
| `categoryPath` | array[string] | 最大 4 階層 |
| `composition` | object | JS-A-composition 参照 |
| `drug` | object | JS-A-drug 参照 |
| `drugResolution` | object | — |
| `regulatory` | object | `psychotropicClass` / `controlledSubstance` / `notes` |
| `topical` | object | `steroidPotency` / `notes` |
| `template` | object | — |
| `display` | object | JS-A-display 参照 |
| `defaults` | object | `followup` / `followupProfiles` |
| `persona` | object | — |
| `scenarios` | object | — |
| `addons` | object | `orderPresets` を含む（JS-A-addons 参照）|
| `ui` | object | `panels` / `panelOrder` / `defaultPanelId` |
| `risks` | object | `primary` / `secondary` / `conditional` |
| `searchConfig` | object | `minPrefixLen` / `normalize` / `multiTerm` |
| `index` | object | — |
| `tagCatalog` | object | — |
| `expressModes` | array | 型は配列固定（JS-expressModes 参照）|

### JS-A-composition: composition 必須サブフィールド

| フィールド | 型 | 備考 |
|---|---|---|
| `nodeKey` | string | `{classKey}_{route}` または `{classKey}_{formulationType}` |
| `classKey` | string | 薬効クラス英略。剤形分離原則適用時は剤形を含めてもよい（DP-02）|
| `clinicalDomain` | string | — |
| `sMergeDomain` | string | — |
| `sMergePolicy` | object | `unit` / `conflictStrategy` / `withinDomainStrategy` |
| `groupKeyRegistry` | array | — |
| `nodeLabelShort` | string | — |
| `nodeLabelLong` | string | — |
| `priority` | string | `"chronic"` / `"acute"` / `"prn"` のいずれか。整数値（`5` 等）は使用禁止（ERROR）。参照: RULES.md §18 |

### JS-A-drug: drug 必須サブフィールド

| フィールド | 型 | 備考 |
|---|---|---|
| `nameAliases` | array | `drug.search.nameAliases` と完全一致で生成 |
| `aliasToBrand` | object | — |
| `brandCatalog` | object | 全 brand に `displayGenericName` 必須（下表参照）|

**drug.search 必須フィールド**

| フィールド | 型 | 備考 |
|---|---|---|
| `primaryDisplayName` | string | — |
| `exactAliases` | array | — |
| `prefixAliases` | array | — |
| `nameAliases` | array | `drug.nameAliases` と完全一致 |
| `keywords` | array | — |
| `priority` | number | — |
| `matchPolicy.preferExactAlias` | boolean | — |
| `matchPolicy.allowPrefixMatch` | boolean | — |
| `matchPolicy.suppressCrossModuleSuggestionsOnExactHit` | boolean | 全 module で `true` |

**brandCatalog エントリ必須フィールド**

| フィールド | 備考 |
|---|---|
| `displayName` | — |
| `genericName` | — |
| `displayGenericName` | **全 brand 必須**。参照優先順: `displayGenericName ?? genericName` |
| `genericKey` | 任意。検索グルーピング判定専用（表示には使わない）。省略時は `genericKey ?? displayGenericName ?? genericName` にフォールバック。→ RULES.md §21 / PN2-Drug-Header.md |
| `aliases` | — |
| `normalizedAliases` | — |

### JS-A-display: display 必須サブフィールド

| フィールド | 備考 |
|---|---|
| `title` | — |
| `subtitle` | — |
| `drugClassLabel` | — |
| `drugGeneric` | — |
| `nodeLabelShort` | — |
| `nodeLabelLong` | — |
| `nodeKey` | `composition.nodeKey` と必ず一致させる |

### JS-A-addons: addons 構造

| フィールド | 型 | 備考 |
|---|---|---|
| `orderPresets` | object | 未使用時は `{}` を保持。キー削除禁止（DP-08）|

`addons.orderPresets` の中身（preset キー）は bridge 原稿に明示がある場合のみ定義する。
bridge 未記載の preset を推測生成しない。

**addon item 必須フィールド（全件）**

`addons.items[]` の各エントリには以下 12 フィールドがすべて必須。

| フィールド | 型 | 内容 |
|---|---|---|
| `key` | string | addon マップキーと同値。ModuleValidator の参照先確認対象 |
| `id` | string | addon マップキーと同値（`key` と同値） |
| `title` | string | UI 表示名 |
| `group` | string | `"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"` のいずれか（AddonPanel.tsx GROUP_ORDER 定義）。bridge type → group 変換後の値 |
| `targetSection` | string | `"P"`（ほぼ全件）。欠落すると addon が P に挿入されない無声の失敗が起きる |
| `text` | string | 出力テキスト。薬剤名部分は `{{drug_subject}}` を使用可 |
| `clinicalTags` | array | 値未確定時は `[]`。omit 禁止 |
| `counselingTags` | array | 値未確定時は `[]`。omit 禁止 |
| `workflowTags` | array | 値未確定時は `[]`。omit 禁止 |
| `evidenceRefs` | array | 値未確定時は `[]`。omit 禁止 |
| `intentTags` | array | 値未確定時は `[]`。omit 禁止 |
| `tone` | string\|null | 既存 module 準拠（通常は `"standard"` または `null`）。omit 禁止 |

`targetSection` が欠落した addon は `buildNodeFields` の P 挿入分岐に到達しないため UI に反映されない。欠落は ERROR とする。

上記 6〜12 番目のフィールドは TypeScript 型定義上は optional だが、世代差として禁止される欠落である。tsc / build が通過しても欠落は構造 ERROR として扱う。

**O フィールドルール（全シナリオ）**

`scenarios[].O` フィールドの薬剤名部分は必ず `{{drug_subject}}` を使用する。

```
正: "{{drug_subject}}　処方"
正: "{{drug_subject}}　使用中"
誤: "マンジャロ　処方"（ブランド名固定）
誤: "GIP/GLP-1受容体作動薬（注射）　処方"（薬効分類名固定）
```

`genericName` / `drugClass` / `classKey` / bridge header の薬効分類名を O フィールドに固定出力することを禁止する。
状態語（処方 / 使用中 / 減量 等）はそのまま保持する。
O フィールドは `resolveDrugSubject()` の対象であり、固定文字列のままだと UI 上で薬剤名が置換されない。

**scenarios[] 共通フィールド（全件・omit 禁止）**

以下 3 フィールドは全シナリオに必須。値が未確定でも `[]` を明示出力する。

| フィールド | 型 | 未確定時のデフォルト値 |
|---|---|---|
| `clinicalTags` | array | `[]` |
| `counselingTags` | array | `[]` |
| `workflowTags` | array | `[]` |

TypeScript 型定義上は optional だが、世代差として欠落は構造 ERROR とする。

**treatment_end 系 scenarioGroup 個別値ルール**

treatment_end 系シナリオの `scenarioGroup` は個別値を使用する。一律 `"treatment_end"` は禁止。

| scenario id | scenarioGroup |
|---|---|
| `end_improved` | `"end_improved"` |
| `end_insufficient_effect` | `"end_insufficient_effect"` |
| `end_ineffective` | `"end_ineffective"` |

注意: `"treatment_end"` は `mergePolicy.S.groupKey` の参照先であり、`scenarioGroup` に使用する値ではない。両者を混同しない。

**sickday シナリオの situationFilter ルール**

`sickday` シナリオの `situationFilter` は `["sickday"]` のみ。`"general"` を含めない。

```
正: "situationFilter": ["sickday"]
誤: "situationFilter": ["general", "sickday"]
```

**index.normalizedTokens の注射部位副作用語彙ルール**

injection module の `index.searchableText` に `"硬結"` を含める場合、`index.normalizedTokens` に `"こうけつ"` を必ず追加する。

`"硬結"` はひらがな正規化で `"こうけつ"` に変換されないため、明示的に追加しないと部分一致検索が機能しない。

---

## JS-B: 条件付き必須

### 多剤合成対象 module のみ必須

参照: DP-03（多剤合成フィールド条件付き必須原則）

| フィールド | 現在の対象 |
|---|---|
| `composition.canonicalSource`（保留: Q-F4）| allergy_oral / GLP-1 2系 |
| `composition.defaultSMergeLevel` | 同上 |
| `composition.domainPolicy` | 同上 |
| `composition.nodeIdentityPolicy` | 同上 |

### 剤形分割検索が必要な module のみ必須

参照: DP-05（heparinoid 剤形検索分離原則）

| フィールド | 現在の対象 |
|---|---|
| `drug.search.commonSearchTokens` | derm_heparinoid 系 |
| `drug.search.formulationSearchTokens` | derm_heparinoid 系 |
| `drug.search.matchPolicy.allowMultiTokenAndMatch` | derm_heparinoid 系 |
| `drug.search.matchPolicy.allowFormulationTokenMatch` | derm_heparinoid 系 |

### 増量・減量シナリオが存在する module

| フィールド | 現在の対象 |
|---|---|
| `display.menuGroupLabels` | allergy_eye_drops / derm 3系 / GLP-1 2系 |
| `display.adjustmentExpression` | 同上 |

### 剤形横断ナビゲーションを持つ module

| フィールド | 現在の対象 |
|---|---|
| `expressModes[*].genericBrandName` | derm 3系 |
| `expressModes[*].scenarioCandidates` | derm 3系 |

### display.localInput

- 外用薬・点眼薬など、部位入力 UI が必要な module のみ定義する
- 未定義の場合は部位入力 UI を表示しない（バグではない）
- UI 側では `mod.display?.localInput` および `localInputConfig?.enabled` による fallback を確認済み

### 注射薬 module の thirdPanelSPlacement

`composition.nodeKey` が `_injection` を含む注射薬 module では、以下のシナリオが存在する場合に `thirdPanelSPlacement` を必ず追加する。

```json
"thirdPanelSPlacement": {
  "enabled": true,
  "trigger": "single_drug_only",
  "mode": "replace",
  "persistAsCompositionBase": true
}
```

| 対象シナリオ id | 条件 |
|---|---|
| `se_injection_site_induration_none` | 存在する場合 |
| `se_hypo_none` | 存在する場合 |
| `cp_good` | 存在する場合 |

上記以外の SE なし確認系（例: `se_nausea_diarrhea_none`, `se_pancreatitis_none`）にも同値を付与してよい。bridge に明示がなくても「注射薬モジュール構造パターン」として適用する（推測生成ではなく model_managed 項目として扱う）。

---

## JS-C: 薬剤固有差分許容

「差分」ではなく「設計上の固有特性」として保持するフィールド・値。

| 差分 | 対象 module | 根拠 |
|---|---|---|
| `expressModes[*].genericBrandName` / `scenarioCandidates` | derm 3系 | 剤形横断ナビゲーション UI 固有（JS-B 参照）|
| `matchPolicy.allowMultiTokenAndMatch` / `allowFormulationTokenMatch` | derm 3系 | heparinoid 剤形分割検索固有（DP-05）|
| `commonSearchTokens` / `formulationSearchTokens` | derm 3系 | 同上 |
| `brandCatalog` のブランド固有フィールド（`contactLensCaution`, `bakStatus` 等）| allergy_eye_drops | 点眼薬の品質管理情報 |
| `expressModes` のエントリ数（1〜39）| 全 module | 薬剤種により変動。上限制限なし |
| `composition.classKey` に剤形名を含む | derm 3系 | 保留中（Q-J1）の意図的設計の可能性（DP-02）|

---

## JS-D: 意図的差分許容

「差分」ではなく「設計上の意図的選択」として許容するもの。

| 差分 | 対象 | 根拠 |
|---|---|---|
| `addons.orderPresets` が `{}` | allergy 2系 / derm 3系 | bridge 未明示のため空。DP-08 最小構成原則 |
| `composition.defaultSMergeLevel` 等の欠落 | allergy_eye_drops / derm 3系 | 多剤合成対象外。DP-03 条件付き必須原則 |
| `expressModes[*].enabled: false` + `disabled: true` | derm 3系・GLP-1系 | 準備中プレースホルダー。将来の有効化時に更新 |
| `moduleVersion` 値が module ごとに異なる | 全 module | string 型で存在すればよい。runtime 未参照。validator は存在確認のみ。値の形式は不問 |

---

## JS-E: 保留事項

詳細は OPEN_DESIGN_QUESTIONS.md を参照。

| No | 項目 | 現時点の扱い |
|---|---|---|
| Q-J1 | derm 3系 `composition.classKey` の剤形込み設計 | JS-C で継続保留 |
| Q-F4 | `composition.canonicalSource` の必須化範囲 | JS-B で「多剤合成対象のみ必須」として継続保留 |

---

## JS-expressModes: expressModes 配列構造統一原則

旧 DP-06。JSON 実装ルールのため JSON_STANDARD.md へ移管（DESIGN_PRINCIPLES.md の欠番注記参照）。

**型と必須制約**

- 型: **配列（array）固定**。オブジェクト・null 禁止
- `sortOrder`: 全エントリに必須
- `enabled: false` + `disabled: true`: 準備中プレースホルダーとして許容

**全エントリ必須フィールド**

| フィールド | 型 | 備考 |
|---|---|---|
| `enabled` | boolean | — |
| `expressCategory` | string | — |
| `expressGroup` | string | — |
| `expressSubGroup` | string | — |
| `label` | string | — |
| `sortOrder` | number | — |

**enabled: true のエントリに必要なフィールド**

| フィールド | 型 | 備考 |
|---|---|---|
| `defaultScenarioId` | string | — |
| `defaultBrandName` | string | — |
| `genericDisplayName` | string | — |

**剤形横断ナビゲーション用（derm 3系のみ）**

| フィールド | 型 | 備考 |
|---|---|---|
| `genericBrandName` | string | 剤形選択 UI 用 |
| `scenarioCandidates` | array | 剤形選択時の初期シナリオ候補 |
