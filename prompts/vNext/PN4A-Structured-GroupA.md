# PN4A — xStructured Group A（構造化 治療系）

## 参照
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS
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
`drug_status` / `symptom_observation` / `treatment_adjustment_reason` / `adherence_observation` / `side_effect_observation`

> `drug_status` は未定義語彙。treatment_start 系 → `treatment_start_reason`、dose_change 系 → `dose_adjustment_reason`、end 系 → `treatment_end_reason` を使うこと。

**AStructured.role（確立済み語彙のみ使用）:**
- `treatment_assessment`（汎用: treatment_start / adjustment / lifestyle 等の A 行。**用量変更の A 行もこれを使用する**）
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
`treatment_start_reason` / `followup_monitoring` / `administration_instruction`

> `administration_instruction` は未定義語彙 → `administration_guidance` を使うこと。
> `followup_monitoring` は intentTags では使用可だが PStructured.role では禁止 → `followup_guidance` を使うこと。

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

### transform / safety / lockTerms の判定単位（2026-09-25 追記・generic clarification）

- transform / safety は**各文（各行）の内容だけ**から上記基準で判定する
- **lockTerms が存在することだけを理由に** transform を `minimal` へ、safety を `medium` / `high` へ引き上げない
  （lockTerms は変換してはならない語の保護であり、文の安全度の判定とは別軸である）
- **行位置だけを理由に**（例: A 欄の最終行、P 欄の最終行）引き上げない
- 上記基準に根拠のない一律の escalation rule（「P の注意文はすべて medium」等）を作らない
- 本節は判定の仕方の明確化であり、既存 canonical module の xStructured を retrofit する根拠にならない

### module 別 Owner Decision 実績（xStructured）

Group B（PN4B）の scenario の決定も含め、module 別の xStructured 決定値は本節を正本とする（PN4B は本節を参照する）。

- `dry_eye_trpv1_antagonist_eye_drops`（OD-C3 / OD-C6・2026-09-25）
  - 当該 module に限り、`allergy_h1_antihistamine_eye_drops`（以下 H1）に同一 scenario id・同一行 id で本文（Phase 1 凍結テキストの行 text。`{{drug_subject}}` 変換後）が逐語一致する行があり、
    current PN4 contract と矛盾しない場合は H1 の値に合わせ、exact precedent が無い行は current PN4 contract で判定する。
    **「precedent があれば precedent、なければ contract」は当該 module の決定であり、一般原則ではない**
    （他 module は H1 を xStructured の precedent として扱わない）
  - H1 の precedent 値は下表へ値として転記済みであり、再生成時に H1 canonical を読み直して値を取り直さない（下表が正本）
  - role は下表の全行とも変更しない

**OD-C3（exact precedent に合わせる行）:**

| scenario id | 欄・行 id | text | 確定値 |
|---|---|---|---|
| `frequency_decrease_low_perceived_effect` | PStructured `p_2` | 症状や使用感に変化がある場合はご相談ください。 | role `side_effect_guidance` / transform `minimal` / safety **`low`** / lockTerms `["ご相談ください"]` |
| `strength_decrease_low_perceived_effect` | PStructured `p_2` | 症状や使用感に変化がある場合はご相談ください。 | role `side_effect_guidance` / transform `minimal` / safety **`low`** / lockTerms `["ご相談ください"]` |
| `end_insufficient_effect` | AStructured `a_2` | 終了後は、目の症状の変化について確認を要する。 | role `treatment_end_assessment` / transform `moderate` / safety **`low`** / lockTerms `[]` |
| `end_ineffective` | AStructured `a_2` | 終了後は、目の症状の変化について確認を要する。 | role `treatment_end_assessment` / transform `moderate` / safety **`low`** / lockTerms `[]` |
| `se_ocular_irritation_moderate_consider_dr`（Group B） | PStructured `p_1` | {{drug_subject}}による刺激感が続く場合や強くなる場合は、使用回数の調整や薬剤の変更が必要になることがあります。 | role `side_effect_guidance` / transform **`moderate`** / safety **`low`** / lockTerms **`[]`** |
| `se_ocular_irritation_moderate_consider_dr`（Group B） | PStructured `p_2` | 症状が続く場合は、処方医へご相談ください。 | role `side_effect_guidance` / transform `minimal` / safety `medium` / lockTerms **`["ご相談ください", "処方医へご相談ください"]`**（順序どおり） |

**OD-C6（exact precedent なし・current PN4A contract を優先し現在値を維持する行）:**

`initial` / `restart` / `external_start` の P 欄は H1 と本文が異なるため precedent を適用しない。3 scenario とも同一値とする。

| scenario id | 欄・行 id | text | 確定値 |
|---|---|---|---|
| `initial` / `restart` / `external_start` | PStructured `p_3` | 使用により目のかすみや温度の感じ方に変化が出ることがあります。 | role `side_effect_attention` / transform `minimal` / safety `medium` / lockTerms `[]` |
| `initial` / `restart` / `external_start` | PStructured `p_4` | 気になる症状がある場合はご相談ください。 | role `side_effect_attention` / transform `minimal` / safety `medium` / lockTerms `["ご相談ください"]` |

- 既存 module（H1 / chemical mediator 点眼を含む）の xStructured は本記録により変更しない（preserve・retrofit なし）

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
- **phase3b_meta.json を直接更新しない**（必ず `phase4a_structured.json` を新規生成すること）
- **`content` フィールドを xStructured に使用しない**（`text` フィールドのみ使用）
- **RULES.md §17 に未定義の role を使用した場合は即 MUST_STOP**

---

## 次工程へのハンドオフ

PN4A 完了後、以下を報告する:
- 保存先
- 処理したシナリオ数と id リスト

次工程: PN4B（xStructured Group B）または PN5（Non-Scenario Structure）
