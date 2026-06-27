# PN4A — xStructured Group A（構造化 治療系）

## 参照
→ prompts/P1.md Rule 4 MANDATORY_PRESERVATION_TARGETS（§4）
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL

## 位置づけ
Phase 1 で凍結した S / A / P テキストを文単位に分解し、SStructured / AStructured / PStructured を生成する。
テキストの意味・文字を変えない。Phase 1 テキストからの文字単位のコピーのみ行う。

---

## 入力
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（凍結テキスト）
- `/tmp/soap-build/{moduleId}/phase3b_meta.json`（scenarioType / intentTags 参照）
  ※ phase3b_meta.json が 2,000 行超の場合: 治療系12件は前半に位置するため offset=0, limit=2000 で取得できる

---

## 対象シナリオ

以下の scenarioType を持つシナリオのみ処理する:
- `treatment_start`
- `treatment_adjustment`
- `treatment_end`

---

## 責務

### xStructured 生成ルール

各テキストを `\n` で分割し、1行ごとに構造化オブジェクトを生成する。

```json
{
  "id": "s_1",
  "text": "（Phase 1 テキストを文字単位でコピー）",
  "role": "treatment_start_reason",
  "transform": "moderate",
  "safety": "low",
  "lockTerms": [],
  "notes": null
}
```

**text フィールドの絶対ルール:**
- Phase 1 の S / A / P テキストから文字単位でコピーする
- bridge を再参照して再生成しない
- 意訳・要約・改変・補完は行わない
- `\n` で行が結合されている場合は `\n` で分割して各行を1エントリとする
- 空行は除外する

### role の選択肢

← RULES.md §17 の確立済み語彙に準拠すること。禁止語彙の使用は ERROR。

**SStructured.role（確立済み語彙のみ使用）:**
- `treatment_start_reason`（treatment_start 系の S 行）
- `dose_adjustment_reason`（treatment_adjustment 系の S 行）
- `treatment_end_reason`（treatment_end 系の S 行）

**SStructured.role 禁止語彙（ERROR）:**
`symptom_observation` / `treatment_adjustment_reason` / `adherence_observation` / `side_effect_observation`

**AStructured.role（確立済み語彙のみ使用）:**
- `treatment_assessment`（汎用: treatment_start / adjustment / lifestyle 等の A 行）
- `dose_adjustment_assessment`（用量変更評価 — treatment_assessment との混用不可ではないが、明示したい場合に使用）
- `treatment_end_assessment`（treatment_end 系 — treatment_assessment との混用不可）

**AStructured.role 禁止語彙（ERROR）:**
`drug_mechanism` / `lifestyle_assessment` / `risk_assessment` / `clinical_guidance`
（risk_assessment・clinical_guidance は `treatment_assessment` で代替すること）

**PStructured.role（確立済み語彙のみ使用）:**
- `drug_effect_explanation`（薬効説明）
- `administration_guidance`（使用方法指導）
- `side_effect_attention`（副作用注意喚起）
- `dose_adjustment_guidance`（増量・減量説明）
- `treatment_end_guidance`（終了後の指導）
- `followup_guidance`（経過確認）← `followup_monitoring` は禁止

**PStructured.role 禁止語彙（ERROR）:**
`treatment_start_reason` / `followup_monitoring`

### transform の基準

- `"minimal"`: 患者安全上の理由で変換を最小限に制限すべき文（例: 受診指示・緊急対応）
- `"moderate"`: 一定の変換を許容できる文（評価文・背景説明）

P フィールドの注意喚起・指示文は `"minimal"` を優先する。

### safety の基準

- `"high"`: 患者安全に直接関わる（例: 受診指示・緊急対応）
- `"medium"`: 注意が必要（例: 副作用言及・血糖管理注意）
- `"low"`: 一般的な説明・継続指導

### lockTerms の設定

医療・薬学的に変換してはならない用語が含まれる文にのみ設定する。

例:
- `"ブドウ糖"` / `"糖分"` / `"摂取してください"`（低血糖対処）
- `"受診してください"` / `"ご相談ください"`（受診・相談指示）
- 固有の疾患名・薬剤名（ペルソナ変換対象外）

---

## 出力

`/tmp/soap-build/{moduleId}/phase4a_structured.json` に保存する。

```json
{
  "scenarios": {
    "initial": {
      "SStructured": [
        {
          "id": "s_1",
          "text": "{{drug_subject}}は、血糖値が高いため追加となった。",
          "role": "treatment_start_reason",
          "transform": "moderate",
          "safety": "low",
          "lockTerms": [],
          "notes": null
        }
      ],
      "AStructured": [
        {
          "id": "a_1",
          "text": "{{drug_subject}}は、血糖コントロール不十分のため追加となった。",
          "role": "treatment_assessment",
          "transform": "moderate",
          "safety": "low",
          "lockTerms": [],
          "notes": null
        }
      ],
      "PStructured": [
        {
          "id": "p_1",
          "text": "{{drug_subject}}は、食後の血糖値を改善する薬です。",
          "role": "drug_effect_explanation",
          "transform": "moderate",
          "safety": "low",
          "lockTerms": [],
          "notes": null
        }
      ]
    }
  }
}
```

---

## 禁止事項

- text フィールドを bridge から再生成しない（Phase 1 テキストのみ使用）
- text を意訳・要約・改変・補完しない
- Group B シナリオ（side_effect / adherence / lifestyle_guidance / sickday / followup）を処理しない
- Phase 1 凍結テキストを変更しない

---

## 次工程へのハンドオフ

PN4A 完了後、以下を報告する:
- 保存先
- 処理したシナリオ数と id リスト

次工程: PN4B（xStructured Group B）または PN5（Non-Scenario Structure）
