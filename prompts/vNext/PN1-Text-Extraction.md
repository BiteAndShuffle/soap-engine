# PN1 — Text Extraction（本文抽出フェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS
→ prompts/P1.md Rule 1 SOURCE_OF_TRUTH_PRINCIPLE
→ prompts/P1.md Rule 4 MANDATORY_PRESERVATION_TARGETS（§4）

## 位置づけ
Phase 1 はすべての工程の起点。
bridge 本文を JSON に保存する唯一の工程。
本文を正確に保存することだけが目的。

---

## 入力

bridge.md の SCENARIOS_START ～ SCENARIOS_END セクション

---

## 責務

### 1. シナリオ本文の抽出

各 SCENARIO ヘッダー行を識別する。
```
【SCENARIO｜type={type}｜id={id}｜title={title}】
```

各シナリオから以下を抽出する。
- S セクション全体（複数行は `\n` で結合）
- O セクション全体
- A セクション全体（複数行は `\n` で結合）
- P セクション全体（`P_ADDON` / `P_CLOSING` の前まで。複数行は `\n` で結合）

### 2. Addon 本文の抽出

**SCENARIOS_START〜SCENARIOS_END 内の ADDON ヘッダーは SCENARIO ヘッダーと混在・分散して出現する。**
出現位置に関係なく、セクション内の全 ADDON ヘッダーを漏れなく収集すること。
（例: addon が initial 直後・se_hypo_none 直後・cp_poor 直後・sickday 直後に分散している場合も全件対象）

各 ADDON ヘッダー行を識別する。
```
【ADDON｜type={type}｜id={id}｜title={title}（｜uiVariant={v}）】
```

各 addon から以下を抽出する。
- `P_APPEND` → `text` フィールド（addon の主テキスト）
- `S_APPEND` → `sectionTexts.S`
- `A_APPEND` → `sectionTexts.A`
- `P_APPEND` → `sectionTexts.P`

**注意:** `sectionTexts.P` と `text` は同じ P_APPEND から取得し、両方に同じ値を保存する。

`sectionTexts` のうち、対応する APPEND セクションが存在しないキー（S / A）は省略する。

### 3. addonsRef の解析

各シナリオの P_ADDON セクションを解析する。
```
P_ADDON
- addon_xxx
- addon_yyy
```
→ `addonsRef: { "P": ["addon_xxx", "addon_yyy"] }`

P_ADDON が存在しないシナリオには `addonsRef` フィールドを含めない。

### 4. followupRef の決定

P_CLOSING テキストから followupRef を決定する。

| P_CLOSING テキスト | followupRef |
|---|---|
| 次回、引き続き使用できているか、副作用の有無を確認。 | `"default_followup"` |
| 次回、治療経過および体調変化の有無を確認。 | `"end_followup"` |
| 次回、治療経過および副作用の有無を確認。 | `"se_followup"` |
| 次回、血糖推移および体調変化の有無を確認。 | `"renal_followup"` |

決定した followupRef と P_CLOSING 元テキストの両方を保存する。

**対応表にないP_CLOSINGテキストが出現した場合:**
本文（bridge既存の凍結テキスト）は変更せず、新規 followupRef を仮の名称で記録した上で、
正式採用してよいかを PN2 着手前にユーザーへ確認する（PENDING 扱い）。
Claude が独断で対応表に追加・確定してはならない。ユーザー確認後、正式採用が決まった時点で
本表に追記し、以後の同一テキスト出現時の再発防止とする（`dm_dpp4_oral` の
`dose_decrease_renal_function` で確認済み・2026-07-05）。

### 5. followupProfiles の構築

全シナリオの (followupRef → _closingText) ペアを集約し、ユニークな followupProfiles を構築する。

```json
"followupProfiles": {
  "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
  "end_followup":     { "S": null, "P": "次回、治療経過および体調変化の有無を確認。" },
  "se_followup":      { "S": null, "P": "次回、治療経過および副作用の有無を確認。" }
}
```

スキーマ: `Record<string, { S?: string | null; P?: string | null }>` — lib/types.ts:765 定義・実 canonical JSON 準拠。`closingText` キーは使用しない。

`defaults.followup` は、最も多くのシナリオが参照する followupRef を採用する（通常は `"default_followup"`）。

このデータを `phase1_text_spine.json` に含め、PN2 が `defaults` セクションを構築する際に使用する。

### 6. {{drug_subject}} 置換

bridge の editingRules に従い、本文中の薬剤名・薬効分類名を `{{drug_subject}}` に置換する。

**置換する場合（治療薬・対象薬として使われている）:**
- S / S_APPEND: 薬剤名が主語として状態変化・理由を表している場合
- O: 薬剤名を表す部分（状態語「処方・増量・減量・使用中・処方終了・処方変更・処方中止」は保持）
- A / P / A_APPEND / P_APPEND: 使用薬・対象薬・治療薬として明示されている場合

**置換しない場合（一般説明文）:**
- 薬効説明・作用機序・症状説明・使用方法説明・疾患説明として使われている場合
- 薬剤主語ではない説明文

**主語省略を許容するシナリオ:**
- CP良好・CP不良・生活指導等のシナリオでは S フィールドの主語省略を許容する
- 省略を許容するシナリオでは S フィールドに `{{drug_subject}}` を補わない

---

## 出力

`/tmp/soap-build/{moduleId}/phase1_text_spine.json` に保存する。

> **パスについて**: `/tmp/soap-build/{moduleId}/` はセッションをまたいで有効な固定一時ディレクトリ。
> PN1〜PN8 の全成果物をここに保存することで、セッション再起動・新規チャットへの移行後も継続実行できる。
> ディレクトリが存在しない場合は `mkdir -p /tmp/soap-build/{moduleId}` で作成してから Write する。

```json
{
  "moduleId": "{bridge から取得}",
  "_phase": "1",
  "_frozenAt": "phase1_complete",
  "defaultFollowupRef": "default_followup",
  "followupProfiles": {
    "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
    "end_followup":     { "S": null, "P": "次回、治療経過および体調変化の有無を確認。" },
    "se_followup":      { "S": null, "P": "次回、治療経過および副作用の有無を確認。" }
  },
  "scenarios": [
    {
      "id": "initial",
      "S": "{{drug_subject}}は、血糖値が高いため追加となった。",
      "O": "{{drug_subject}}　処方",
      "A": "{{drug_subject}}は、血糖コントロール不十分のため追加となった。\n…",
      "P": "{{drug_subject}}は、食後の血糖値を改善する薬です。\n…",
      "addonsRef": { "P": ["addon_glycemic_guidance", "addon_se_hypoglycemia_guidance"] },
      "followupRef": "default_followup",
      "_closingText": "次回、引き続き使用できているか、副作用の有無を確認。"
    }
  ],
  "addons": {
    "items": {
      "addon_glycemic_guidance": {
        "text": "高血糖が持続すると、網膜症・腎症…",
        "sectionTexts": {
          "P": "高血糖が持続すると、網膜症・腎症…"
        }
      },
      "addon_hyperkalemia_guidance": {
        "text": "カリウムが高い状態が続くと…",
        "sectionTexts": {
          "S": "カリウムの値が高いと言われた。",
          "A": "カリウムコントロールが不十分であり…",
          "P": "カリウムが高い状態が続くと…"
        }
      }
    }
  }
}
```

---

## 本文凍結宣言

Phase 1 完了時に以下を宣言する。

```
■ TEXT FREEZE DECLARATION
以下のフィールドは Phase 1 完了をもって凍結する。
後工程での変更は禁止。不一致を発見した場合は PN1 に差し戻す。

凍結対象（完全版）:
  scenarios[].S
  scenarios[].O
  scenarios[].A
  scenarios[].P
  addons.items[].text
  addons.items[].sectionTexts.S
  addons.items[].sectionTexts.A
  addons.items[].sectionTexts.P
```

---

## 禁止事項

- シナリオの metadata を生成しない（scenarioType / scenarioGroup / mergePolicy 等）
- xStructured（SStructured / AStructured / PStructured）を生成しない
- drug ヘッダー情報を生成しない
- 本文を要約・改善・意訳・修正しない
- bridge に存在しない addon / followup を追加しない
- P_CLOSING テキストを scenarios[].P に含めない

---

## 次工程へのハンドオフ

PN1 完了後、以下を報告する:
- 保存先
- 抽出シナリオ数
- 抽出 addon 数
- 本文凍結宣言の完了

次工程: PN2（Drug Header）および PN3A（Scenario Classification）。

**実行順序の注意:**
- PN2 は phase1_text_spine.json（followupProfiles / defaultFollowupRef）を読むため、PN1 の完了後に実行すること
- PN3A は phase1_text_spine.json の scenario IDs のみを参照するため、PN1 完了後に実行すること
- PN2 と PN3A は互いに独立しているため、両者は並列実行してよい
