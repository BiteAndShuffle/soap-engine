# PN4B — xStructured Group B（構造化 副作用・生活指導系）

## 参照
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS
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
- `usage`（2026-07-24 追加。頓用使用等の「使用状況報告」系シナリオ。SStructured.role は既存確立語彙 `adherence_status` を使用する。新規role `as_needed_status` 等は使用しない → 下記「usage 型シナリオの SStructured.role」参照）

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

**sickday / followup / usage 型シナリオの SStructured.role（明示ルール）:**

| シナリオ型 | S フィールドの性質 | 使用する role |
|---|---|---|
| sickday | 体調不良・食事摂取不能等の状況報告 | `adherence_status`（usage 系として扱う） |
| followup（injection_technique_check 等） | 注射手技・使用状況の確認 | `adherence_status`（usage 系として扱う） |
| lifestyle_guidance | 検査値異常・生活状況の報告 | `adherence_status`（lifestyle 系として扱う） |
| usage（as_needed_refill_needed 等） | 頓用使用状況・残薬状況の報告 | `adherence_status`（usage 系として扱う。`as_needed_status` 等の新規roleは使用しない） |

`adherence_status` は RULES.md §17 で「adherence 系 / lifestyle_guidance 系 / usage 系」を包括する語彙として確定済み。
sickday / followup / usage 型 S フィールドはすべて usage 系として同語彙を使用する。新規語彙は追加しない。
過去に一部の既存module（`allergy_h1_antihistamine_second_gen_oral` 等）が `as_needed_status` という未定義roleを使用していた事例があったが、
これは RULES.md §17 未定義語彙であり、2026-08-16 に `adherence_status` へ migration 済みである（commit `b613722`）。
未定義roleは新規moduleの正本として模倣しないこと。

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
`followup_monitoring` / `hold_instruction` / `administration_instruction`

> `administration_instruction` は未定義語彙 → `administration_guidance` を使うこと。
> `followup_monitoring` は intentTags では使用可だが PStructured.role では禁止。

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
- **phase3b_meta.json を直接更新しない**（必ず `phase4b_structured.json` を新規生成すること）
- **`content` フィールドを xStructured に使用しない**（`text` フィールドのみ使用）
- **RULES.md §17 に未定義の role を使用した場合は即 MUST_STOP**

---

## 次工程へのハンドオフ

PN4B 完了後、以下を報告する:
- 保存先
- 処理したシナリオ数と id リスト

次工程: PN5（Non-Scenario Structure）
