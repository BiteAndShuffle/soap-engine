# PN3B — Scenario Metadata Apply（メタデータ適用フェーズ）

## 参照
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS
→ prompts/RULES.md §14 injection module thirdPanelSPlacement
→ prompts/RULES.md §15 addon 必須フィールド
→ prompts/RULES.md §16 scenario omit 禁止フィールド
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS

## 位置づけ
Phase 3A の決定表を Phase 1 の text_spine に適用し、シナリオ・addon のメタデータ構造を完成させる。
本フェーズの先頭で Phase 1 本文照合チェックを必ず実施すること。

---

## 入力
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`
- `/tmp/soap-build/{moduleId}/phase3a_decisions.json`
- bridge.md（シナリオ title / addon title の読み取りのみ）

---

## 先頭必須: Phase 1 本文照合チェック

Phase 3B の本体作業を開始する前に、以下を確認する。

1. `phase1_text_spine.json` の各シナリオの S / O / A / P が bridge 本文と一致しているか
2. addon の `text` / `sectionTexts.*` が bridge 本文と一致しているか
3. `{{drug_subject}}` 置換が適切に適用されているか（過剰置換・未置換がないか）

**不一致が発見された場合:**
- Phase 3B では修正しない
- PN1 に差し戻す
- 差し戻し理由と不一致箇所を明記する

**照合 PASS の場合:**
- Phase 3B 本体を続行する

---

## 責務

### 1. scenarios[] にメタデータを付与する

Phase 1 の各シナリオに以下のフィールドを追加する。

```json
{
  "id": "{phase1から継承}",
  "globalId": "{moduleId}.{id}",
  "title": "{bridge シナリオヘッダーの title= から取得}",
  "scenarioType": "{phase3a_decisions.scenarioDecisions[id].scenarioType}",
  "scenarioGroup": "{phase3a_decisions.scenarioDecisions[id].scenarioGroup}",
  "scenarioTags": ["（下記ルールで生成）"],
  "situationFilter": "{phase3a_decisions.scenarioDecisions[id].situationFilter}",
  "sideEffectPresence": "{phase3a_decisions.scenarioDecisions[id].sideEffectPresence}",
  "sComposition": {
    "intent": "{phase3a_decisions.scenarioDecisions[id].sCompositionIntent}",
    "template": "{phase3a_decisions.scenarioDecisions[id].sCompositionTemplate}",
    "symptomCodes": "{phase3a_decisions.scenarioDecisions[id].symptomCodes}",
    "symptoms": "{phase3a_decisions.scenarioDecisions[id].symptoms}"
  },
  "S": "{phase1凍結テキスト — 変更しない}",
  "O": "{phase1凍結テキスト — 変更しない}",
  "A": "{phase1凍結テキスト — 変更しない}",
  "P": "{phase1凍結テキスト — 変更しない}",
  "mergePolicy": {
    "S": {
      "domain": "{composition.clinicalDomain}",
      "behavior": "replace",
      "groupKey": "{phase3a_decisions.scenarioDecisions[id].groupKey}",
      "mergeLevel": "clinical_domain",
      "sectionRole": "subjective"
    },
    "O": {
      "behavior": "append",
      "mergeLevel": "section_line",
      "sectionRole": "objective"
    },
    "A": {
      "behavior": "append",
      "mergeLevel": "section_block",
      "sectionRole": "assessment"
    },
    "P": {
      "behavior": "append",
      "mergeLevel": "section_block",
      "closingBehavior": "dedupe_or_last",
      "sectionRole": "plan"
    }
  },
  "followupRef": "{phase1_text_spine[id].followupRef — phase1 の値をそのまま採用}",
  "addonsRef": "{phase1_text_spine[id].addonsRef — phase1 の値をそのまま採用（存在するシナリオのみ）}",
  "intentTags": "{phase3a_decisions.scenarioDecisions[id].intentTags}",
  "scenarioRequiredTags": "{phase3a_decisions.scenarioDecisions[id].scenarioRequiredTags — 存在する場合のみ設定。phase3a に無ければこのキー自体を省略する}",
  "scenarioColor": "{phase3a_decisions.scenarioDecisions[id].scenarioColor — 存在する場合のみ設定。phase3a に無ければこのキー自体を省略する}",
  "SStructured": [],
  "AStructured": [],
  "PStructured": [],
  "clinicalTags": [],
  "counselingTags": [],
  "workflowTags": []
}
```

**followupRef / addonsRef は Phase 1 の値を採用する。Phase 3B では配列順を含めて変更しない（addonsRef.P の順序は表示順として扱われる。RULES.md §25）。**

**scenarioRequiredTags は optional metadata である。** `phase3a_decisions.scenarioDecisions[id]` に `scenarioRequiredTags` キーが存在する場合のみ、その配列値をそのまま出力へ含める。
存在しない場合は当該シナリオの出力から `scenarioRequiredTags` キー自体を省略する（空配列 `[]` を推測生成しない。「map に記載がない = タグ条件なし = 常時表示」という bridge 側の意味を保つため）。

**scenarioColor も optional metadata である。** `phase3a_decisions.scenarioDecisions[id]` に `scenarioColor` キーが存在する場合のみ、その値をそのまま出力へ含める。
存在しない場合は当該シナリオの出力から `scenarioColor` キー自体を省略する（`null` を生成しない。「bridge に記載なし = 既存の `scenarioToColor()` 導出ロジックへ 100% fallback」という runtime 側の意味を保つため）。
色の推測・計算・正規化は行わない。Phase 3A が保持した値をそのまま転記するだけの preservation に徹する。

#### thirdPanelSPlacement の付与

Phase 3A 決定表で `thirdPanelSPlacement: true` とされたシナリオに以下を追加する:

```json
"thirdPanelSPlacement": {
  "enabled": true,
  "trigger": "single_drug_only",
  "mode": "replace",
  "persistAsCompositionBase": true
}
```

`false` のシナリオにはこのフィールドを含めない。

#### scenarioTags の自動生成ルール

scenarioType / scenarioGroup / id パターンを組み合わせて生成する。

**MUST（決定的規則。例示ではない）**

`phase3a_decisions.scenarioDecisions[id].scenarioGroup` が `"adherence_good"` である
scenario の `scenarioTags` には、literal `"good"` を必ず含める。

- 導出元は `scenarioGroup` のみとする。
- bridge 本文・scenario id・title・`cp_good` という id 命名・その他 heuristic から
  `"good"` を推論してはならない。
- `scenarioGroup` が `"adherence_good"` でない scenario へ `"good"` を付与してはならない。

**根拠**: `lib/isSReplacementEligible.ts` の generic fallback ③ は
`scenarioType === "adherence"` かつ `scenarioTags` に `"good"` を含むことを Rapid
（S置換UI）eligibility の条件とする。本タグの欠落は ERROR も WARNING も出さず、
当該 scenario の Rapid が無検出のまま失われる。`thirdPanelSPlacement` が付与されない
非 injection module（RULES.md §14 の対象外）では、この経路が Rapid capability の
唯一の根拠となる。

**本規則は新しい clinical rule を追加しない。** 「CP良好 → `adherence_good`」という
classification は PN3A-Scenario-Classification.md「scenarioGroup」対応表が既に決定的に
定めている。本規則は、その決定を PN3B の出力へ決定的に写像する手順を明文化したに
すぎない。

例:
- id=initial, type=treatment_start → `["treatment_start", "start_or_change", "initial"]`
- id=dose_increase_xxx, group=dose_change → `["treatment_adjustment", "dose_change", "increase"]`
- id=se_hypo_none → `["side_effect", "hypoglycemia", "absent"]`
- id=cp_good → `["adherence", "adherence_good", "good"]`
- id=end_improved → `["treatment_end", "improved"]`
- id=sickday_hold → `["sickday", "hold"]`

### 2. addons.items にメタデータを付与する

Phase 1 の addon `text` / `sectionTexts` に対して以下のフィールドを追加する。

```json
{
  "key": "{addon_id}",
  "id": "{addon_id}",
  "title": "{bridge ADDON ヘッダーの title= から取得}",
  "group": "{phase3a_decisions.addonDecisions[id].group}",
  "targetSection": "P",
  "text": "{phase1凍結テキスト — 変更しない}",
  "sectionTexts": "{phase1凍結テキスト（存在するキーのみ）— 変更しない}",
  "uiVariant": "{phase3a_decisions.addonDecisions[id].uiVariant}",
  "uiGroup": "{phase3a_decisions.addonDecisions[id].uiGroup — 存在する場合のみ設定}",
  "requiredTags": "{phase3a_decisions.addonDecisions[id].requiredTags — 存在する場合のみ設定}",
  "clinicalTags": [],
  "counselingTags": [],
  "workflowTags": [],
  "evidenceRefs": [],
  "intentTags": [],
  "tone": "standard"
}
```

**addon の text / sectionTexts は Phase 1 の値をそのまま採用する。Phase 3B では一切変更しない。**

**uiGroup / requiredTags は optional metadata である。** `uiVariant` と同様、`phase3a_decisions.addonDecisions[id]` に
当該キーが存在する場合のみ出力へ含める。存在しない場合はそのキー自体を省略する（`null` や空配列 `[]` を推測生成しない）。

---

## 出力

`/tmp/soap-build/{moduleId}/phase3b_meta.json` に保存する。

含める内容:
```
scenarios[]（全シナリオ、メタデータ完全付与、xStructured は空配列のまま）
addons.items（全 addon、メタデータ完全付与）
```

含めない内容:
```
xStructured の具体値（Phase 4 が生成）
ui / risks / searchConfig 等（Phase 5 が生成）
```

### 大規模モジュールでの出力注意（シナリオ 20 件超）

phase3b_meta.json は 20 件超のシナリオを含む場合、1,500〜2,000 行規模になる。
以下のルールで出力する:

1. **Write ツールで 1 回出力する（推奨）**: JSON 全体を `content` に渡して 1 回の Write で保存する。
2. **出力が途中で途切れた / 不完全になった場合**:
   - 既存ファイルを削除して最初から再実行すること（部分出力ファイルを継続使用しない）
   - `rm /tmp/soap-build/{moduleId}/phase3b_meta.json` で削除してから PN3B を再実行する
3. **出力完了確認**: Write 完了後、`wc -l /tmp/soap-build/{moduleId}/phase3b_meta.json` でおおよその行数を確認すること。
   期待値よりも大幅に少ない場合（例: 31 シナリオで 500 行未満）は再実行する。

---

## 禁止事項

- S / O / A / P を変更しない
- addon text / sectionTexts を変更しない
- xStructured を生成しない（空配列のまま維持）
- Phase 3A 決定表に含まれない独自分類を追加しない

---

## 次工程へのハンドオフ

PN3B 完了後、以下を報告する:
- 保存先
- Phase 1 本文照合チェック結果（PASS / FAIL）
- メタデータを付与したシナリオ数
- thirdPanelSPlacement を付与したシナリオ（id リスト）
- scenarioRequiredTags を付与したシナリオ数
- scenarioColor を付与したシナリオ数
- uiGroup / requiredTags を付与した addon 数
- scenarioGroup が `"adherence_good"` のシナリオ数、そのうち scenarioTags に `"good"` を
  付与した数（両者は一致すること）

次工程: PN4A（xStructured Group A）および PN4B（xStructured Group B）。両者は独立しており並列実行可。
