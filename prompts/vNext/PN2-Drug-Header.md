# PN2 — Drug Header（薬剤ヘッダー変換フェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS
→ prompts/RULES.md §8 drug.nameAliases完全一致ルール
→ prompts/P0-B.md（必要に応じて参照）

## 位置づけ
bridge ヘッダーセクション（SCENARIOS_START より前）を JSON 構造に変換する。
シナリオ本文・シナリオメタデータには一切触れない。

---

## 入力

- bridge.md のヘッダーセクション（moduleId から SCENARIOS_START の前まで）
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（followupProfiles / defaultFollowupRef の読み取り）

---

## 責務

### drug セクション生成

bridge.md の `drug:` / `search:` / `nameAliases:` / `brandCatalog:` / `aliasToBrand:` から生成する。

**必須整合確認（生成と同時に確認すること）:**

1. `drug.nameAliases` と `drug.search.nameAliases` は完全一致させること
   - 順序・表記・エントリ数のすべてが一致すること
   - → RULES.md §8

2. 各ブランドについて `brandCatalog.{brand}.aliases` と `brandCatalog.{brand}.normalizedAliases` を完全一致させること

3. `aliasToBrand` が brandCatalog の全 aliases を網羅していること
   - 各ブランドの aliases の全値が aliasToBrand のキーとして存在すること

4. 生成した alias 系フィールド（aliases / normalizedAliases / aliasToBrand / nameAliases /
   search.nameAliases / search.exactAliases）は、bridge.md 側にも同じ内容で反映すること
   （JSON側だけの追加・変更は禁止 → RULES.md §23。機械検証は
   `scripts/audit-alias-bridge-chain.ts`）

### brandCatalog 表示名フィールドの責務（displayName / genericName / displayGenericName）

← docs/JSON_STANDARD.md JS-A-drug「brandCatalog エントリのスキーマ」（正本）

| フィールド | 責務 |
|---|---|
| `displayName` | 商品名 |
| `genericName` | 正式名称。塩類名・水和物等を含み得る。**通常UIでは参照しない** |
| `displayGenericName` | 表示用一般名。**必須**。通常UIにおける一般名表示のSSOT。検索候補・パンくず・SOAP本文・`{{drug_subject}}` が参照する |

**生成時の注意（MUST_STOP 相当）:**

- `displayGenericName` は全 brand に必須。省略・空文字は不可（ModuleValidator が ERROR として検出する）
- `genericName` への暗黙フォールバックは禁止。`displayGenericName` は常に独立した値として明示すること
- 実行時（UI/検索候補生成時）の文字列加工（塩類名の機械的除去等）で `displayGenericName` を代替してはならない。値は bridge で人間が確定したものをそのまま canonical JSON へ転記する
- `genericName` に塩類名・水和物等の技術的修飾語が含まれるにもかかわらず `displayGenericName` がそれと完全一致する場合は旧コピーパターンであり、PN2 が機械的に補正するのではなく bridge へ差し戻して人間が確定すること

### genericKey 生成規則（任意フィールド）

← RULES.md §21（役割分離の原則）

`brandCatalog.{brand}.genericKey` は検索グルーピング判定専用のキーであり、無理に全ブランドへ設定する必要はない（省略時は `displayGenericName ?? genericName` へフォールバックする）。設定する場合は以下に従う。

- 命名規則: `{成分}_{系統/剤形差分}` のスネークケース（例: `insulin_lispro`, `tranilast_ophthalmic_pf`）
- 同一成分でも表示上区別したい製剤（PF製剤・ウルトラファースト製剤等）には別の `genericKey` を割り当てること
- 同一 `genericKey` を持つブランド同士は検索候補で同一成分グループとして展開されるため、臨床的に別グループとして扱うべき場合は必ずキーを分けること
- 配合剤には単剤の `genericKey` を流用せず、専用の単一文字列キーを割り当てること（例: `insulin_degludec_aspart_combo`）。単剤・配合剤間のクロス検索は現時点で非対応

### brandCatalog alias 生成時の心得（一般名検索到達性）

← `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）

一般名（成分名）検索で当該 brand に到達できるよう、`brandCatalog.{brand}.aliases` に一般名の読みを含めることが望ましい。

- 新規 alias を推測生成しない（RULES.md §2 PROHIBITED_UNIVERSAL）
- 既に確立済みの読みが同系統モジュールに存在する場合はそれを流用する（例: `ぐらるぎん` / `でぐるでく` は `dm_insulin_long_acting`、`あすぱると` は `dm_insulin_mixed_rapid_intermediate` で確立済み）
- 配合剤は構成成分ごとに読みを個別登録し、どちらの成分名からでも到達できるようにする
- alias 追加の要否自体は人間判断（`docs/VALIDATOR_STANDARD.md` §5「exactAliases の網羅性は設計判断」）であり、機械的な網羅性チェックは行わない

### drug.search 検索トークンの生成規則（commonSearchTokens / formulationSearchTokens）

← `docs/DESIGN_PRINCIPLES.md` DP-05（heparinoid 剤形検索分離原則）/ `prompts/RULES.md` §2・§3

`drug.search.commonSearchTokens` / `drug.search.formulationSearchTokens` は、bridge の同名フィールドの記載をそのまま転記して生成する。

| フィールド | 生成元 | 内容 |
|---|---|---|
| `drug.search.commonSearchTokens` | bridge の `drug.search.commonSearchTokens:` 記載 | 成分名トークン（剤形横断で共通の読み） |
| `drug.search.formulationSearchTokens` | bridge の `drug.search.formulationSearchTokens:` 記載 | 剤形識別トークン（軟膏・ローション等の読み） |

**生成ルール:**

- bridge に明示された値のみを、記載順のまま転記する
- **bridge に記載がないフィールドは omit する**（空配列 `[]` を生成しない。PENDING にもしない）。剤形が 1 種類しかない薬剤では `formulationSearchTokens` は不要であり、欠落は正常な状態である（DP-05）
- bridge 未明示のトークンを推測生成しない（`prompts/RULES.md` §2 PROHIBITED_UNIVERSAL）
- **alias 系フィールドへ展開しない。** 具体的には `brandCatalog.{brand}.aliases` / `normalizedAliases` / `aliasToBrand` / `drug.nameAliases` / `drug.search.nameAliases` / `drug.search.exactAliases` / `drug.search.prefixAliases` のいずれにも、これらのトークンを複写・追加してはならない（`prompts/RULES.md` §3 ERROR 条件。`lib/moduleValidator.ts` の `SEARCH_TOKEN_ALIAS_POLLUTION` が WARNING として検出する）
- 検索トークンは alias ではない。分割検索（例:「へぱ なんこう」）は bridge 側で大量の alias を列挙するのではなく、本トークンと検索エンジン側の AND prefix match で吸収する設計である（DP-05）

**MUST_STOP 相当:**

- bridge に記載のないトークンを追加する必要があると判断した場合は、生成せず停止して報告する

### composition セクション生成

bridge の composition フィールドおよび同系統モジュールを参考に生成する。

**groupKeyRegistry は暫定空配列 `[]` としてよい。**
Phase 3A が完成次第、Phase 6 が確定値（groupKeyRegistry: Phase 3A 出力の全 groupKey ユニークリスト）に更新する。

**bridge に `composition:` セクションが存在しない場合のフォールバック（必須）:**

| フィールド | 導出元 | ルール |
|---|---|---|
| `composition.nodeKey` | `display.nodeKey`（bridge） | display.nodeKey をそのままコピー |
| `composition.nodeLabelShort` | `display.nodeLabelShort`（bridge） | display から投影 |
| `composition.nodeLabelLong` | `display.nodeLabelLong`（bridge） | display から投影 |
| `composition.domain` | `categoryPath[0]` から判断 | `"糖尿病"` → `"diabetes"` / `"アレルギー"` → `"allergy"` 等 |
| `composition.priority` | インスリン注射 → `"chronic"` | 慢性疾患薬は `"chronic"` として確定 |
| `composition.clinicalDomain` | `composition.domain` と同値 | `"diabetes"` 等 |
| `composition.sMergeDomain` | `composition.domain` と同値 | `"diabetes"` 等 |
| `composition.classKey` | 下記「classKey 導出ルール」参照 | 標準形式一致時のみ機械導出。それ以外は **PENDING** |

**nodeKey / classKey は bridge.composition から取得する。**
存在しない場合は上記フォールバック表に従う。

**classKey 導出ルール（2026-07-24 正式化）:**

bridge に `composition.classKey` の記載がない場合、`composition.nodeKey`（= `display.nodeKey` フォールバック値）が
既知の標準形式 `<classKey>_<route>` に一致するときに限り、`<route>` 部分を機械的に取り除いて `classKey` を導出してよい。
`route` は `drug.route` の値（`oral` / `injection` / `topical` / `ophthalmic` / `inhalation` 等）と一致していることを確認すること。

- 一致例: `nodeKey: "h1_antihistamine_ophthalmic"` かつ `drug.route: "ophthalmic"` → `classKey: "h1_antihistamine"`（末尾が route と一致する標準形式）
- 不一致例（機械導出せず PENDING とする）:
  - 配合剤（例: `nodeKey` が2成分名を連結した形式で、単純な `<classKey>_<route>` に分解できない）
  - `dual_mechanism` 等、nodeKey が単一 classKey + route の1:1構造になっていない module
  - nodeKey 末尾が `drug.route` の値と一致しない、またはそもそも route を示す語尾になっていない場合
- 上記いずれかに該当し標準形式と断定できない場合は、推測で classKey を確定せず `"PENDING"` として人間確認へ回す。同系統 JSON の classKey 命名を参考情報として提示してよいが、それをそのまま流用して確定してはならない。

**composition.sMergePolicy（必須・PN2が常に生成する固定値）:**

bridge の記載有無に関わらず、以下の固定値を composition に含める（bridge からは抽出しない、
全モジュール共通の model_managed 値。PENDING にしない）:

```json
"sMergePolicy": {
  "unit": "clinical_domain",
  "conflictStrategy": "separate_by_domain",
  "withinDomainStrategy": "groupKey_based_semantic_merge"
}
```

### display / template / persona / regulatory / topical

bridge の対応フィールドから移植する。

`template.urgentFlag` / `urgentCriteria` はモジュールの臨床特性に基づいて設定する。
参照: 同系統モジュール（dm_insulin_rapid_analog.json 等）。

**bridge に `persona:` セクションが存在しない場合:**
`persona` フィールドを OUTPUT_JSON から omit する（省略）。PENDING にしない。
model_managed 項目であり、後工程で別途追加可能。

**bridge に `regulatory:` / `topical:` セクションが存在しない場合:**
以下の確定値を設定する（注射薬全般に適用可能な model_managed 値）:
```json
"regulatory": {
  "psychotropicClass": "not_applicable",
  "controlledSubstance": "not_applicable",
  "notes": null
},
"topical": {
  "steroidPotency": "not_applicable",
  "notes": null
}
```

### display.subtitle の確定ルール（推測生成禁止）

**bridge に `display.subtitle` が明記されている場合:** その値をそのまま使用する。

**bridge に明記がない場合:** ブランド名の列挙（例:「トラゼンタ・マリゼブ・ザファテック 他」）や
同系統モジュールの表示パターンを模倣して生成してはならない（copied/reference pattern による
creative build と判定される）。以下の標準 fallback を確定値として使用する。

```
display.subtitle = "{drug.genericName}（{routeLabel}）"
```

`routeLabel` は `drug.route` から以下のとおり導出する:

| drug.route | routeLabel |
|---|---|
| oral | 内服 |
| injection | 注射 |
| topical | 外用 |
| ophthalmic | 点眼 |
| inhalation | 吸入 |

例（`dm_dpp4_oral`: `drug.genericName="DPP-4阻害薬"`, `route="oral"`）:
```
display.subtitle = "DPP-4阻害薬（内服）"
```

この fallback は `display.title` / `display.drugClassLabel` と同一値になる場合があるが、
それ自体は問題ない（`dm_insulin_rapid_analog.json` の title / drugClassLabel / nodeLabelLong が
同値である実績と同型）。

### defaults セクション

`defaults.followup` と `defaults.followupProfiles` は bridge から直接生成しない。
Phase 1 が確定した `phase1_text_spine.json` の値を使用する:

```
defaults.followupProfiles ← phase1_text_spine.followupProfiles（スキーマ: Record<string, {S?: string|null, P?: string|null}>）
defaults.followup         ← followupProfiles[phase1_text_spine.defaultFollowupRef] の内容（{S: null, P: "..."} 形式）
```

例: defaultFollowupRef = "default_followup" のとき:
```json
"defaults": {
  "followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
  "followupProfiles": {
    "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
    "end_followup":     { "S": null, "P": "次回、治療経過および体調変化の有無を確認。" },
    "se_followup":      { "S": null, "P": "次回、治療経過および副作用の有無を確認。" }
  }
}
```

これ以外の defaults フィールド（brandName 初期値等）は bridge から生成する。

### drugResolution セクション

**MUST_STOP（実機クラッシュ要因）:**

- `drugResolution.brandToTags` は必須。`null` / `undefined` / キー欠落 → 実装禁止
- `brandToTags` のキーは `drug.brandCatalog` の全キーと完全一致させること
- 各値は `string[]`（空配列 `[]` は許容、`null` / 文字列は禁止）
- 欠落・不一致の場合は生成を停止し MUST_STOP を報告すること

---

## 出力

`/tmp/soap-build/{moduleId}/phase2_drug_header.json` に保存する。

含めるセクション:
```
moduleId
moduleVersion
categoryPath
composition（groupKeyRegistry は暫定 []）
drug（genericName / brandNames / drugClass / route / dosageForms /
     drugSpecificTags / search / nameAliases / brandCatalog / aliasToBrand）
drugResolution
regulatory
topical
template
display
defaults
persona
```

含めないセクション（後工程が生成）:
```
scenarios（Phase 3B / 4 が生成）
addons（Phase 1 + 3B が生成）
ui / risks / searchConfig / tagCatalog / expressModes（Phase 5 が生成）
```

---

## 禁止事項

- シナリオ本文（S / O / A / P）を触らない
- Phase 1 の凍結テキストを参照しない
- scenario metadata を生成しない

---

## 次工程へのハンドオフ

PN2 完了後、以下を報告する:
- 保存先
- drug.nameAliases エントリ数
- brandCatalog ブランド数
- aliasToBrand キー数
- 整合確認結果（nameAliases一致 / aliases一致 / aliasToBrand網羅）

次工程: PN3A（Scenario Classification）
