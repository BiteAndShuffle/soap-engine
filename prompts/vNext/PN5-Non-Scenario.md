# PN5 — Non-Scenario Structure（非シナリオ構造生成フェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS
→ prompts/RULES.md §11 addons.orderPresets object必須ルール

## 位置づけ
シナリオ・addon 以外の JSON 構造を生成する。
シナリオ本文・シナリオメタデータを変更しない。

---

## 入力
- `/tmp/soap-build/{moduleId}/phase2_drug_header.json`（drugClass / route / categoryPath 参照）
- `/tmp/soap-build/{moduleId}/phase3a_decisions.json`（groupKeyRegistry / intentTags 参照）
- `/tmp/soap-build/{moduleId}/phase3b_meta.json`（scenarioType 一覧 / situationFilter 参照）
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（addon id リスト参照）

---

## 責務

### ui セクション

```json
"ui": {
  "panels": [
    {
      "id": "panel_1",
      "title": "基本",
      "sections": ["display", "categoryPath", "drug", "template", "risks", "searchConfig", "index"]
    },
    {
      "id": "panel_2",
      "title": "指導（アドオン）",
      "sections": ["addons"]
    },
    {
      "id": "panel_3",
      "title": "SOAP（シナリオ）",
      "sections": ["scenarios"]
    }
  ],
  "panelOrder": ["panel_1", "panel_2", "panel_3"],
  "defaultPanelId": "panel_1"
}
```

### risks セクション

モジュールの臨床特性（低血糖リスク・腎機能・高齢者等）に基づき、primary / secondary / conditional を設定する。

`conditional` は必ず新形式を使用する。旧形式 `{ "condition": "...", "risk": "..." }` は使用しない。

**インスリン注射系モジュール（drugClass に INSULIN_* を含む）の標準テンプレート:**

dm_insulin_rapid_analog.json の risks 実績値（確認済み）に基づく。速効型・超速効型を問わず適用可能。

```json
"risks": {
  "primary": [
    "hypoglycemia_risk",
    "injection_site_reaction"
  ],
  "secondary": [
    "dehydration_risk",
    "glycemic_deterioration"
  ],
  "conditional": [
    {
      "risk": "ketoacidosis_risk_sglt2",
      "rule": {
        "whenAny": ["concomitant_sglt2"],
        "whenAll": []
      }
    }
  ]
}
```

このテンプレートを起点とし、bridge の臨床記述に照らして追加・修正が必要な場合のみ変更する。
変更がない場合はこのまま使用する。

**インスリン注射系以外のモジュール:**
モジュールの臨床特性から適切な primary / secondary / conditional を設定する。

### searchConfig セクション

```json
"searchConfig": {
  "minPrefixLen": 2,
  "normalize": {
    "toHiragana": true,
    "lowerLatin": true,
    "stripSymbols": true,
    "zenkakuToHankaku": true,
    "trimSpaces": true
  },
  "multiTerm": {
    "enabled": true,
    "operator": "AND",
    "match": "prefix"
  }
}
```

### index セクション

drug.genericName / brandNames / nameAliases / categoryPath から `searchableText` を構築する。
`normalizedTokens` はひらがな正規化済みのトークンリスト。

```json
"index": {
  "searchableText": [
    "インスリン レギュラー",
    "ノボリンR",
    "ヒューマリンR",
    "速効型インスリン"
  ],
  "normalizedTokens": [
    "いんすりんれきゅらー",
    "のぼりんあーる",
    "ひゅーまりんあーる",
    "そっこうがたいんすりん"
  ],
  "facets": {
    "route": "injection",
    "dosageForms": ["injection"],
    "situation": ["general", "sickday"],
    "drugClass": ["insulin", "insulin_regular"]
  }
}
```

`facets.situation` は phase3b_meta のシナリオ situationFilter の全ユニーク値を集約する。

**normalizedTokens の注射部位副作用語彙ルール:**
injection module で `searchableText` に `"硬結"` を含めた場合、`normalizedTokens` に `"こうけつ"` を必ず追加すること。

### tagCatalog セクション

Phase 3A で確定した intentTags をリストアップする。

```json
"tagCatalog": {
  "intentTags": [
    "drug_effect_explanation",
    "side_effect_attention",
    "hypoglycemia_attention",
    "administration_instruction",
    "followup_monitoring"
  ],
  "clinicalTags": [],
  "counselingTags": [],
  "workflowTags": []
}
```

### expressModes セクション

drug.brandCatalog の各ブランドに対してエントリを生成する。

```json
"expressModes": [
  {
    "enabled": false,
    "expressCategory": "内科",
    "expressGroup": "糖尿病",
    "expressSubGroup": "インスリン製剤（速効型）",
    "label": "{brandName}",
    "defaultScenarioId": "initial",
    "defaultBrandName": "{brandName}",
    "sortOrder": 99
  }
]
```

全エントリ `enabled: false` で統一する。

### addons.orderPresets

必ず空オブジェクトとして生成する。← RULES.md §11

```json
"orderPresets": {}
```

配列 `[]` ではなくオブジェクト `{}` であることを確認する。

---

## composition.groupKeyRegistry の確定

Phase 3A 出力の `groupKeyRegistry`（全シナリオ groupKey のユニーク集約）を、
Phase 6 が phase2_drug_header.json の暫定 `[]` に上書きする際の確定値として引き継ぐ。

本 Phase 5 では直接 phase2 を書き換えない（Phase 6 が統合時に確定させる）。

---

## 出力

`/tmp/soap-build/{moduleId}/phase5_non_scenario.json` に保存する。

含めるセクション:
```
ui
risks
searchConfig
index
tagCatalog
expressModes
addons.orderPresets
```

---

## 禁止事項

- scenarios / addons の本文・メタデータを変更しない
- addons.orderPresets を `{}` 以外にしない
- xStructured を生成しない

---

## 次工程へのハンドオフ

PN5 完了後、以下を報告する:
- 保存先
- expressModes のエントリ数（ブランド数）
- risks.primary / secondary 件数
- risks.conditional 件数
- addons.orderPresets が `{}` であることの確認

次工程: PN6（Assembly）
