# PN4B — xStructured Group B（構造化 副作用・生活指導系）

## 参照
→ prompts/P1.md Rule 4 MANDATORY_PRESERVATION_TARGETS（§4）
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL

## 位置づけ
Phase 1 で凍結した S / A / P テキストを文単位に分解し、xStructured を生成する。
PN4A と同一のルールを適用する。

---

## 入力
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（凍結テキスト）
- `/tmp/soap-build/{moduleId}/phase3b_meta.json`（scenarioType / intentTags 参照）
  ※ phase3b_meta.json が 2,000 行超の場合: 副作用系・adherence 系は中〜後半に位置するため offset を調整して分割 Read すること

---

## 対象シナリオ

以下の scenarioType を持つシナリオのみ処理する:
- `side_effect`
- `adherence`
- `lifestyle_guidance`
- `sickday`
- `followup`

---

## 責務・制約

PN4A と同一ルールを適用する。以下を参照:
→ PN4A-Structured-GroupA.md の「xStructured 生成ルール」
→ PN4A-Structured-GroupA.md の「text フィールドの絶対ルール」
→ PN4A-Structured-GroupA.md の「transform / safety / lockTerms の基準」

### このグループに特有の role 選択肢

**SStructured.role（追加）:**
- `side_effect_status`（副作用の状態）
- `adherence_status`（アドヒアランスの状態）

**sickday / followup 型シナリオの SStructured.role（明示ルール）:**

| シナリオ型 | S フィールドの性質 | 使用する role |
|---|---|---|
| sickday | 体調不良・食事摂取不能等の状況報告 | `adherence_status`（usage 系として扱う） |
| followup（injection_technique_check 等） | 注射手技・使用状況の確認 | `adherence_status`（usage 系として扱う） |
| lifestyle_guidance | 検査値異常・生活状況の報告 | `adherence_status`（lifestyle 系として扱う） |

`adherence_status` は RULES.md §17 で「adherence 系 / lifestyle_guidance 系 / usage 系」を包括する語彙として確定済み。
sickday / followup 型 S フィールドも usage 系として同語彙を使用する。新規語彙は追加しない。

**AStructured.role（Group B 追加語彙 — RULES.md §17 準拠）:**
- `side_effect_assessment`（side_effect 系の A 行）
- `adherence_assessment`（adherence 系 — treatment_assessment との混用不可）
- `treatment_assessment`（sickday 系の A 行を含む汎用評価 — `sickday_assessment` は使用しない）

**AStructured.role 禁止語彙（ERROR）:**
`lifestyle_assessment` / `drug_mechanism` / `sickday_assessment`
（lifestyle_guidance 系・sickday 系の A 行は `treatment_assessment` を使用すること）

**PStructured.role（Group B 追加語彙 — RULES.md §17 準拠）:**
- `side_effect_guidance`（副作用対処指導）
- `adherence_guidance`（アドヒアランス支援）
- `lifestyle_guidance`（生活指導）
- `sickday_guidance`（シックデイ指導）
- `urgent_consult_guidance`（緊急受診・受診指示）

**PStructured.role 禁止語彙（ERROR）:**
`followup_monitoring` / `hold_instruction`（`sickday_guidance` で代替）

### lockTerms に関する追加注意

以下の表現が含まれる場合は必ず lockTerms に追加する:
- `"ブドウ糖"` / `"糖分を摂取"` / `"糖分摂取"`
- `"シックデイ"` / `"sick day"`
- `"救急受診"` / `"すぐに受診"`

---

## 出力

`/tmp/soap-build/{moduleId}/phase4b_structured.json` に保存する。

形式は PN4A と同一。

```json
{
  "scenarios": {
    "se_hypo_mild": {
      "SStructured": [...],
      "AStructured": [...],
      "PStructured": [...]
    },
    "cp_good": {
      "SStructured": [...],
      "AStructured": [...],
      "PStructured": [...]
    }
  }
}
```

---

## 禁止事項

- text フィールドを bridge から再生成しない（Phase 1 テキストのみ使用）
- text を意訳・要約・改変・補完しない
- Group A シナリオ（treatment_start / treatment_adjustment / treatment_end）を処理しない
- Phase 1 凍結テキストを変更しない

---

## 次工程へのハンドオフ

PN4B 完了後、以下を報告する:
- 保存先
- 処理したシナリオ数と id リスト

次工程: PN5（Non-Scenario Structure）
