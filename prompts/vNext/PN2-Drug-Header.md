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
| `composition.classKey` | bridge 未記載かつ同系統 JSON 参照困難な場合 | **PENDING**（人間確認後に追記） |

**nodeKey / classKey は bridge.composition から取得する。**
存在しない場合は上記フォールバック表に従う。

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

`brandToTags` のキーは `drug.brandCatalog` のキーと一致させること。

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
ui / risks / searchConfig / index / tagCatalog / expressModes（Phase 5 が生成）
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
