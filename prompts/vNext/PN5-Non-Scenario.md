# PN5 — Non-Scenario Structure（非シナリオ構造生成フェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS
→ prompts/RULES.md §11 addons.orderPresets object必須ルール

## 位置づけ
**PN5 の責務: 標準非シナリオ構造をすべて生成する。**
シナリオ・addon 以外の JSON 構造を生成する。
シナリオ本文・シナリオメタデータを変更しない。

PN6 は PN5 の成果物を統合するだけであり、標準構造を独自補完しない。
PN5 で生成漏れがあった場合、PN6 は MUST_STOP して PN5 へ差し戻す。
**persona の欠落は PN5 の責務違反として扱う。**
composition.sMergePolicy は PN2 で生成済みの値を使用し、PN5 は関与しない。

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
      "sections": ["display", "categoryPath", "drug", "template", "risks", "searchConfig"]
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

`risks` の生成規則は 2 分岐のみである。**インスリン注射系は下記の標準テンプレート、それ以外は固定 empty。**
この 2 つ以外の生成規則は存在しない。

**インスリン注射系モジュール（drugClass に INSULIN_* を含む）の標準テンプレート:**

```json
"risks": {
  "primary": [
    "hypoglycemia_risk",
    "injection_site_reaction"
  ],
  "secondary": []
}
```

本テンプレートは 2026-09-20 の Owner Review により確定した現行 contract である（Owner Decision OD-T1）。
同 Review で、旧テンプレートが `secondary` / `conditional` に保持していた 3 token は除去された。
その後、`conditional` キー自体も canonical contract から撤去された（Owner Decision OD-L1〜OD-L4）。
除去された内容は `addons`（sickday / counseling 系）側に既に表現があり、canonical から情報は失われていない。
経緯の詳細は `prompts/vNext/HANDOFF.md` §6 を参照する。

このテンプレートを起点とし、bridge の臨床記述に照らして追加・修正が必要な場合のみ変更する。
変更がない場合はこのまま使用する。

**インスリン注射系以外のモジュール:**

**現行 contract では、non-insulin module の `risks` は常に固定 empty である。** 以下をそのまま生成する。

```json
"risks": {
  "primary": [],
  "secondary": []
}
```

- **structured Bridge risk contract は現時点で存在しない。** bridge 35 件のいずれも、構造化された
  risk 宣言ブロック・risk identifier・primary / secondary 分類を保持していない
- **non-insulin 向けの model_managed risk contract も存在しない。** インスリン注射系の標準テンプレート
  （上記）は insulin 分岐に限定された唯一の model_managed 規定であり、non-insulin へは適用しない
- したがって、この固定値を上書きできる有効な override 経路は**現時点で 1 つも存在しない**
- 次のいずれからも risk identifier・primary / secondary 分類を**推測・導出・転記してはならない**
  （bridge 自由文を「構造化根拠」と解釈することを含め、一切認めない）:
  - bridge の自由記述（コメント行・S / O / A / P 本文・リスクに言及する散文のすべて）
  - scenario ID（`se_*` 等）／ `scenarioTags` ／ `intentTags` ／ `tagCatalog`
  - 他モジュール（同一領域・同一剤形・同一 classKey のものを含む）
  - Reference Implementation / Golden module と呼ばれるモジュール
  - 既存 canonical JSON（`prompts/RULES.md` §2「既存 canonical JSON の値を対象 module へ無断流用しない」）
- **改訂条件**: structured Bridge risk contract または Owner-approved の non-insulin model_managed
  contract が正式導入された場合のみ、本規則を改訂する。それまでは例外を作らない

検証: `tests/risksContract.test.ts`（T-R-1）

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
tagCatalog
expressModes
persona        ← JSON_STANDARD 標準フィールド。必ず生成する（下記参照）
addons.orderPresets
```

### persona セクション（必須）

bridge に記述がない場合は以下のデフォルト値で生成する:

```json
"persona": {
  "defaultStyle": "standard",
  "availableStyles": ["standard"],
  "styleProfiles": {
    "standard": {
      "sentenceTone": null,
      "warningTone": null,
      "proposalTone": null,
      "closingTone": null
    }
  }
}
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
- risks に適用した分岐（`insulin` / `non-insulin` のいずれか）
- risks.primary / secondary 件数
  ※ 分岐が `non-insulin` の場合、2 件数はともに `0` でなければならない。
    `0 / 0` 以外を報告する状態は本 Phase の責務違反であり、PN6 へ渡さず修正する
- addons.orderPresets が `{}` であることの確認
- persona が生成済みであることの確認

次工程: PN6（Assembly）
