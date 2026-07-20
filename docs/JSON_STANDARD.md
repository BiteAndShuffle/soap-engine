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
→ addons → ui → risks → searchConfig → tagCatalog → expressModes
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

**brandCatalog エントリのスキーマ**

```ts
interface BrandEntry {
  displayName: string          // 商品名
  genericName: string          // 正式名称（塩類名・水和物等を含み得る）
  displayGenericName: string   // 表示用一般名（必須・SSOT）
  genericKey?: string          // 検索グルーピング判定専用キー（表示には使わない）
  aliases: string[]
  normalizedAliases: string[]
  handlingTags?: string[]
  formulationType?: string
  storageType?: string
}
```

**3フィールドの責務**

| フィールド | 責務 | 参照元 |
|---|---|---|
| `displayName` | 商品名 | ブランド確定検索候補・パンくずの商品名部分 |
| `genericName` | 正式名称。塩類名・水和物等の技術的修飾語を含み得る | 内部識別・将来の専門/監査文脈専用。**通常UI（検索候補・パンくず・SOAP本文）からは参照しない** |
| `displayGenericName` | 表示用一般名。**必須**。通常UIにおける一般名表示のSSOT | 一般名見出し検索候補・パンくずの一般名部分・SOAP本文の `{{drug_subject}}` |

**制約**

- `genericName` と `displayGenericName` は同一値でもよい（`genericName` がもともと塩類名等を含まない場合）
- ただし `genericName` に塩類名・水和物等の技術的修飾語が含まれる場合、`displayGenericName` への単純コピーは禁止する。値は bridge で人間が確定する（機械的な塩類名除去による自動生成は行わない）
- `displayGenericName` の欠落・空文字・上記の旧コピー運用は ModuleValidator の ERROR（`DISPLAY_GENERIC_NAME_MISSING` / `DISPLAY_GENERIC_NAME_EMPTY` / `DISPLAY_GENERIC_NAME_SALT_COPY`）
- UI側（検索候補生成・パンくず・`{{drug_subject}}` 解決）は `genericName` へのフォールバックを行わない。`resolveDrugName()`（`lib/drugSubject.ts`）が薬剤名解決の唯一の正本

| フィールド | 備考 |
|---|---|
| `genericKey` | 任意。検索グルーピング判定専用（表示には使わない）。省略時は `genericKey ?? displayGenericName ?? genericName` にフォールバック。→ RULES.md §21 / PN2-Drug-Header.md |

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
| `group` | string | `"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"` のいずれか（AddonPanel.tsx GROUP_LABELS 定義。表示順は DP-10 / §25 の通り addonsRef.P の配列順に従う）。bridge type → group 変換後の値 |
| `targetSection` | string | `"P"`（ほぼ全件）。欠落すると addon が P に挿入されない無声の失敗が起きる |
| `text` | string | 出力テキスト。選択薬剤自身を指す薬剤名部分は必ず `{{drug_subject}}` を使用する（詳細は本節末尾「addon.text 薬剤名ルール」を参照） |
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

**addon.text 薬剤名ルール（全 addon）**

`addons.items[].text`（`sectionTexts.*` を含む）のうち、**選択薬剤自身を指す**薬剤名部分は、O フィールドと同様に必ず `{{drug_subject}}` を使用する。

```
正: "{{drug_subject}}の継続中に、強い腹痛や背中に響く痛みが出ることがあります。"
誤: "DPP-4阻害薬・ビグアナイド配合剤の継続中に、強い腹痛や背中に響く痛みが出ることがあります。"（薬効群・配合剤クラス名固定）
```

`resolveDrugSubject()` は S/O/A/P 結合後の文字列全体に対して置換を行うため、addon側にトークンが存在すれば正しく置換される。トークンを使わず固定文字列で書くと、ブランドを選択しても薬効群・配合剤クラス名のまま表示され続ける（無声の失敗）。

この規則は**選択薬剤自身を主語・対象として書かれている箇所にのみ**適用する。以下のように選択薬剤以外を指す文脈には適用しない。

```
適用外: "他の糖尿病薬と併用している場合は、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。"（併用中の他剤を指す）
適用外: "PF製剤は、防腐剤を含まない目薬です。"（製剤カテゴリの説明。requiredTags で対象ブランドのみ表示される）
```

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
