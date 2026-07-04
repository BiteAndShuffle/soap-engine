# SOAP Engine — vNext プロンプト体系 新規チャット引き継ぎ文書

作成日: 2026-06-26  
最終更新: 2026-06-27（次モジュール開始用に更新）  
対象ブランチ: `feat/nlp-input-panel-and-new-schema`  
リポジトリ: `/Users/AdNauseumTendrils/Desktop/soap-engine`

この文書は、新しい Claude チャットセッションがこれ1本だけを読んで、迷わず開発を再開できるよう書かれています。

---

# 1. プロジェクト概要

## SOAPエンジンとは何か

日本の調剤薬局・薬剤師向けの **SOAP形式指導記録自動生成ツール** です。  
患者ごとの投薬状況（初回・継続・副作用・アドヒアランス等）をシナリオとして持ち、  
薬剤師が指導記録を素早く作成できるようにします。

技術スタック: **Next.js 15 App Router（TypeScript）**

## 目的

薬剤師がアプリ上でシナリオとADDONを選択するだけで、SOAP指導記録の草稿が生成されること。  
複数の薬剤が処方されている場合でも、SOAP記録を破綻なく合成すること（semantic merge）。

## 現在の開発フェーズ

`data/modules/` に薬剤ごとの JSON モジュールを追加する段階です。

**現時点で登録済みモジュール（全 19件 — tsc / build / ModuleValidator / CrossModuleValidator PASS）:**

| moduleId | bridge | JSON | index.ts |
|---|---|---|---|
| dm_glp1ra_semaglutide_oral | ✅ | ✅ | ✅ |
| dm_glp1ra_injection | ✅ | ✅ | ✅ |
| dm_gip_glp1ra_tirzepatide_injection | ✅ | ✅ | ✅ |
| allergy_h1_antihistamine_eye_drops | ✅ | ✅ | ✅ |
| allergy_h1_antihistamine_second_gen_oral | ✅ | ✅ | ✅ |
| derm_heparinoid_moisturizer_ointment | ✅ | ✅ | ✅ |
| derm_heparinoid_moisturizer_cream | ✅ | ✅ | ✅ |
| derm_heparinoid_moisturizer_lotion | ✅ | ✅ | ✅ |
| derm_heparinoid_moisturizer_spray | ✅ | ✅ | ✅ |
| allergy_leukotriene_receptor_antagonist_oral | ✅ | ✅ | ✅ |
| allergy_chemical_mediator_release_inhibitor_eye_drops | ✅ | ✅ | ✅ |
| dm_insulin_regular | ✅ | ✅ | ✅ |
| dm_insulin_rapid_analog | ✅ | ✅ | ✅ |
| dm_insulin_intermediate | ✅ | ✅ | ✅ |
| dm_insulin_mixed_regular_intermediate | ✅ | ✅ | ✅ |
| dm_insulin_long_acting | ✅ | ✅ | ✅ |
| dm_insulin_mixed_rapid_intermediate | ✅ | ✅ | ✅ |
| dm_insulin_mixed_rapid_long | ✅ | ✅ | ✅ |
| dm_insulin_glp1_combination | ✅ | ✅ | ✅ |

**bridge はあるが JSON / index.ts 未着手のモジュール:** なし（全 19件完了）

**次の作業:** 新規モジュールの bridge 作成 → PN1〜PN8 実行

## なぜ vNext プロンプト体系へ移行したのか

旧体系（P0-B / P1 / P2B / P3 / P4 / P5）は 1 つのプロンプトに複数の責務が混在していました。  
31 シナリオ・16 ADDON を持つ大規模モジュールでは以下の問題が生じることが判明しました:

- 出力が途中で途切れる（Output Limit 超過）
- セッションをまたぐと中間ファイルが消えて再開不能になる
- どの Phase が何を生成すべきか責務が曖昧で、修正が連鎖的に波及する
- bridge 本文と JSON 本文の乖離が後工程まで検知されない

vNext では責務を 8 フェーズに分割し、各フェーズの成果物を `/tmp/soap-build/{moduleId}/` に保存することで、
途中停止・再開・監査を安全に実行できるよう再設計しました。

---

# 2. 現在の設計思想

## Single Source of Truth (SSOT)

**bridge.md が内容の正本** です。JSON はその実装物にすぎません。  
JSON の本文（S / O / A / P / addon text）が bridge と違う場合、正しいのは bridge です。  
JSON を見て「こう書いた方が良い」と感じても、bridge を確認しなければ修正してはなりません。

## Bridge Preservation（bridge を書き換えない）

bridge.md は医療文書の草稿です。Claude が自主的に書き換えることは禁止です。  
`constitution.editingRules` に明記されています。

## 本文凍結（Text Freeze）

PN1（Phase 1）が bridge から本文を抽出した瞬間に、すべてのテキストは **凍結** されます。  
PN2 以降のフェーズは、S / O / A / P / addon text を一切変更してはなりません。  
変更が検知された場合は PN1 に差し戻します。

## 単一責務

各フェーズは 1 つのことだけを行います。

| フェーズ | 責務 |
|---|---|
| PN1 | bridge 本文をそのまま抽出して保存する |
| PN2 | drug / display / composition 等のヘッダー構造を生成する |
| PN3A | 各シナリオの分類（scenarioType / scenarioGroup 等）を **判断する**（JSON は書かない） |
| PN3B | PN3A の決定をシナリオメタデータとして適用する |
| PN4A | 治療系シナリオの xStructured を生成する |
| PN4B | 副作用系・adherence 系・sickday / followup の xStructured を生成する |
| PN5 | ui / risks / searchConfig / index 等の非シナリオ構造を生成する |
| PN6 | PN1〜PN5 を統合して最終 JSON を生成する（Write のみ） |
| PN7 | 完成 JSON を全 15 項目で監査する（修正しない） |
| PN8 | registry 登録確認 / tsc / build を実行して release 判定する |

## 考える工程と写す工程の分離

PN3A は **考えるだけ** です。JSON を書きません。  
「どのシナリオをどう分類するか」を `phase3a_decisions.json` に記録し、  
「写す」作業は PN3B が行います。  
これにより、PN3A のやり直しが PN3B に波及せず、独立して再実行できます。

## Output Limit 対策

31 シナリオ・16 ADDON を持つモジュールでは phase3b_meta.json が 1,500〜2,000 行規模になります。  
対策:

- Write ツールで 1 回出力する（分割出力しない）
- 完了後 `wc -l` で行数を確認する
- 途切れた場合は `rm` して再実行する（部分出力を使い続けない）
- PN6 では Read 順序を「軽量ファイルから先に」にしてコンテキストを節約する
- PN7 では `wc -l` で行数確認後、2,000 行超なら分割 Read する

## Write ツール中心

完成 JSON は **チャットテキストとして出力しない**。Write ツールでファイルに保存する。  
チャット出力は報告行（完了メッセージ・行数・シナリオ数）のみ。

## /tmp/soap-build 運用

スクラッチパスを `/tmp/soap-build/{moduleId}/` に固定することで、セッションをまたいで継続実行できます。  
セッション UUID に依存するパスは使用しません。

各フェーズの成果物は以下のパスに保存されます（`{moduleId}` を実際の値に置換）:

```
/tmp/soap-build/{moduleId}/phase1_text_spine.json
/tmp/soap-build/{moduleId}/phase2_drug_header.json
/tmp/soap-build/{moduleId}/phase3a_decisions.json
/tmp/soap-build/{moduleId}/phase3b_meta.json
/tmp/soap-build/{moduleId}/phase4a_structured.json
/tmp/soap-build/{moduleId}/phase4b_structured.json
/tmp/soap-build/{moduleId}/phase5_non_scenario.json
/tmp/soap-build/{moduleId}/audit_report.json

↓ 最終出力（プロジェクト内）
data/modules/{moduleId}.json
```

---

# 3. vNext プロンプト体系

## フロー図

```
PN1
 ↓
PN2 ‖ PN3A（並列可 — ただし PN3B は PN1 + PN3A 両方が完了してから）
 ↓     ↓
      PN3B
       ↓
PN4A ‖ PN4B ‖ PN5（3者は並列可 — すべて PN3B 完了後に開始）
   ↓    ↓    ↓
    PN6（PN4A + PN4B + PN5 すべて完了後）
     ↓
    PN7（監査のみ）
     ↓
    PN8（tsc / build / release）
```

**PN5 は PN4A / PN4B に依存しません。** PN5 の入力は phase1/phase2/phase3a/phase3b のみです。  
PN3B が完了した時点で PN4A / PN4B / PN5 の 3 者は同時実行可能です。

**実運用では AUTORUN モード（PN3A〜PN8 自動連続実行）を使用します（`prompts/vNext/AUTORUN.md` 参照）。**

## 各フェーズ詳細

### PN1 — Text Extraction

**プロンプトファイル**: `prompts/vNext/PN1-Text-Extraction.md`  
**入力**: bridge.md の SCENARIOS_START〜SCENARIOS_END  
**出力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json`

重要な処理:
- `【SCENARIO｜...】` ヘッダーから S / O / A / P を抽出
- `【ADDON｜...】` ヘッダーから P_APPEND / S_APPEND / A_APPEND を抽出  
  **ADDON ヘッダーはシナリオと混在・分散して出現する。漏れなく全件収集すること**
- `P_CLOSING` の内容を followupProfiles の雛形として記録する（P フィールドに格納）
- 薬剤名 / 薬効分類名を `{{drug_subject}}` に置換する（詳細なルールは bridge の editingRules 参照）
- S の主語省略を許容するシナリオ（cp_good 等）では `{{drug_subject}}` を補わない

出力形式（概要）:
```json
{
  "moduleId": "{moduleId}",
  "drugSubject": "{薬剤名}",
  "scenarios": { "initial": { "S": "...", "O": "...", "A": "...", "P": "..." }, ... },
  "addons": { "addon_xxx": { "text": "...", "sectionTexts": {} }, ... },
  "followupProfiles": {
    "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" }
  },
  "defaultFollowupRef": "default_followup"
}
```

**followupProfiles の重要事項**:  
型は `Record<string, { S?: string | null; P?: string | null }>` です（lib/types.ts:765）。  
`{ closingText: "..." }` ではありません。P_CLOSING テキストは `P` フィールドに入れます。

---

### PN2 — Drug Header

**プロンプトファイル**: `prompts/vNext/PN2-Drug-Header.md`  
**入力**: bridge.md 全体 + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase2_drug_header.json`

責務: composition / drug / drugResolution / regulatory / topical / template / display / defaults / persona を生成する。

bridge に `composition:` / `persona:` / `regulatory:` / `topical:` セクションが存在しない場合は、  
PN2 に実装されたフォールバックルールを使用する（PN2-Drug-Header.md 参照）。

**composition.classKey の取り扱い**:  
bridge 未記載の場合は PENDING とし、ユーザーへ確認を仰ぐ。  
既存モジュールの実績値（`data/modules/index.ts` から特定できる JSON）を参照して候補を提示する。  
勝手に確定しない。

`defaults.followupProfiles` は phase1_text_spine.json の followupProfiles を引き継ぎます。  
`defaults.followup` は followupProfiles のデフォルトエントリの内容オブジェクトをデリファレンスして設定します  
（文字列キーを代入するのではありません）。

---

### PN3A — Scenario Classification（判断専用）

**プロンプトファイル**: `prompts/vNext/PN3A-Scenario-Classification.md`  
**入力**: bridge.md + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase3a_decisions.json`

このフェーズは **判断するだけ** です。シナリオ本文・addon 本文を一切変更しません。

各シナリオに以下を決定します:
- `scenarioType`: bridge の `type=` フィールドと対応（treatment_start / treatment_adjustment / side_effect / adherence / treatment_end / lifestyle_guidance / sickday / followup）
- `scenarioGroup`: 内容に基づいた分類  
  **treatment_end 系の混同禁止**: `end_improved` / `end_insufficient_effect` / `end_ineffective` は各々その値を設定する。`"treatment_end"` は groupKey 専用であり scenarioGroup には使用しない（RULES.md §12）。
- `situationFilter`: `["general"]` または `["sickday"]`
- `sideEffectPresence`: side_effect 系シナリオのみ（absent_or_not_observed / present_mild 等）
- `sCompositionIntent` / `sCompositionTemplate` / `symptomCodes` / `symptoms`
- `groupKey`（semantic merge 用）
- `thirdPanelSPlacement`（injection module の特定シナリオ）

各 ADDON の `group` / `uiVariant` も PN3A で確定させます:

| type= | group |
|---|---|
| lifestyle_guidance | `"lifestyle_guidance"` または `"counseling"`（内容で判断） |
| sickday_guidance | `"sickday"` |
| adherence_guidance | `"adherence"` |
| side_effect_guidance | `"sideEffects"` |
| administration_guidance | `"administration_guidance"` |

---

### PN3B — Scenario Metadata Apply

**プロンプトファイル**: `prompts/vNext/PN3B-Scenario-Metadata-Apply.md`  
**入力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json` + `/tmp/soap-build/{moduleId}/phase3a_decisions.json` + bridge.md（title のみ）  
**出力**: `/tmp/soap-build/{moduleId}/phase3b_meta.json`

PN3A の決定表を phase1_text_spine に適用して、シナリオと addon のメタデータ構造を完成させます。  
S / O / A / P / addon text は **一切変更しません**。

出力規模: シナリオ数・ADDON 数が多い場合は 1,500〜2,000 行になります。  
Write ツールで 1 回出力し、完了後 `wc -l` で確認してください。

---

### PN4A / PN4B — xStructured 生成

**PN4A プロンプト**: `prompts/vNext/PN4A-Structured-GroupA.md`（治療系）  
**PN4B プロンプト**: `prompts/vNext/PN4B-Structured-GroupB.md`（副作用系・adherence 系・sickday / followup）  
**入力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json` + `/tmp/soap-build/{moduleId}/phase3b_meta.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase4a_structured.json` / `phase4b_structured.json`

テキストを文単位に分解し、`SStructured / AStructured / PStructured` を生成します。  
text フィールドは phase1_text_spine からの **文字単位コピー** のみ。意訳・改変禁止。

**role 選択の重要ルール**（RULES.md §17 準拠）:

| シナリオ型 | SStructured.role |
|---|---|
| treatment_start | `treatment_start_reason` |
| treatment_adjustment | `dose_adjustment_reason` |
| treatment_end | `treatment_end_reason` |
| side_effect（副作用なし） | `side_effect_status` |
| side_effect（副作用あり） | `side_effect_presence` |
| adherence / lifestyle_guidance | `adherence_status` |
| sickday | `adherence_status`（usage 系として扱う） |
| followup（injection_technique_check） | `adherence_status`（usage 系として扱う） |

**禁止語彙（使うとエラー）**: `sickday_status` / `followup_status` / `sickday_assessment` / `symptom_observation` / `adherence_observation` / `side_effect_observation` / `treatment_adjustment_reason`

PN4A と PN4B は並列実行可能です。PN3B 完了後に同時開始できます。

---

### PN5 — Non-Scenario Structure

**プロンプトファイル**: `prompts/vNext/PN5-Non-Scenario.md`  
**入力**: 複数の中間ファイル（PN2 / PN3A / PN3B / PN1）  
**出力**: `/tmp/soap-build/{moduleId}/phase5_non_scenario.json`

ui / risks / searchConfig / index / tagCatalog / expressModes を生成します。

**インスリン注射系の risks 標準テンプレート**（dm_insulin_rapid_analog.json 実績値）:

```json
"risks": {
  "primary": ["hypoglycemia_risk", "injection_site_reaction"],
  "secondary": ["dehydration_risk", "glycemic_deterioration"],
  "conditional": [
    {
      "risk": "ketoacidosis_risk_sglt2",
      "rule": { "whenAny": ["concomitant_sglt2"], "whenAll": [] }
    }
  ]
}
```

injection module で `index.searchableText` に `"硬結"` を含む場合は、  
`index.normalizedTokens` に `"こうけつ"` を必ず追加すること（RULES.md §17 / PN5 注記）。

---

### PN6 — Assembly

**プロンプトファイル**: `prompts/vNext/PN6-Assembly.md`  
**入力**: 7 つの中間ファイル（PN1〜PN5 すべて）  
**出力**: `data/modules/{moduleId}.json`（最終 JSON をプロジェクトに直接 Write）

新規コンテンツを生成しません。統合と保存のみ。  
最終 JSON はチャットテキストとして出力しません。Write ツールで保存します。

**Read 順序（コンテキスト効率化）**:
1. phase3a_decisions.json（軽量）
2. phase2_drug_header.json（中量）
3. phase5_non_scenario.json（軽量）
4. phase4a_structured.json（中量）
5. phase4b_structured.json（中量）
6. phase3b_meta.json（最大〜最後に）
7. phase1_text_spine.json（必要な場合のみ）

xStructured 突き合わせ確認: PN4A の id 一覧 + PN4B の id 一覧の和集合が全シナリオ id と一致することを確認してから生成を開始します。

---

### PN7 — Cross Reference Audit

**プロンプトファイル**: `prompts/vNext/PN7-Cross-Reference-Audit.md`  
**入力**: `data/modules/{moduleId}.json` + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/audit_report.json`

修正は行いません。15 項目を全確認します（A〜O）。

**大規模 JSON の Read 手順**:
1. `wc -l data/modules/{moduleId}.json` で行数確認
2. 2,000 行超なら `offset=0, limit=2000` → `offset=2000, limit=2000` ... と分割 Read
3. 末尾（addons / expressModes / searchConfig / index）の確認を省略しない

15 項目すべて PASS → `audit_report.json` に `verdict: "PASS"` を書いて PN8 へ。  
FAIL がある → 該当 Phase に差し戻し。PN8 は開始しない。

---

### PN8 — Build / Runtime / Release

**プロンプトファイル**: `prompts/vNext/PN8-Build-Runtime-Release.md`  
**入力**: `/tmp/soap-build/{moduleId}/audit_report.json`

以下の順序で実行します:

1. `grep "{moduleId}" data/modules/index.ts` — registry 登録確認（未登録は RELEASE_HOLD）
2. `npx tsc --noEmit` — 型チェック
3. `npm run build` — ビルド確認（ModuleValidator / CrossModuleValidator を含む）

**重要**: tsc が通っても registry 未登録ではアプリ上にモジュールが現れません。  
登録確認を必ず tsc より先に行います。

---

# 4. 完了済み事項

## vNext プロンプト体系の設計・整備

以下のすべてが完了しています:

| ファイル | 完了内容 |
|---|---|
| PN1-Text-Extraction.md | ADDON 分散収集警告（M-5）+ /tmp/soap-build パス固定（H-1） |
| PN2-Drug-Header.md | bridge 欠落セクション fallback テーブル（M-1/M-2）+ パス固定（H-1） |
| PN3A-Scenario-Classification.md | followup 型 injection_technique → "injection_technique" 明記（M-4）+ パス固定（H-1） |
| PN3B-Scenario-Metadata-Apply.md | 大規模出力警告・wc-l 確認・削除再実行ルール（H-4）+ パス固定（H-1） |
| PN4A-Structured-GroupA.md | パス固定（H-1）+ 大規模 Read 注記 |
| PN4B-Structured-GroupB.md | sickday/followup SStructured.role 明示ルール + sickday_assessment 禁止（M-3）+ パス固定（H-1） |
| PN5-Non-Scenario.md | インスリン注射系 risks 標準テンプレート（M-6）+ こうけつ normalizedToken ルール + パス固定（H-1） |
| PN6-Assembly.md | Read 順序・xStructured 突き合わせ確認・不完全出力削除ルール（H-3）+ パス固定（H-1） |
| PN7-Cross-Reference-Audit.md | 分割 Read 手順・末尾省略禁止（H-2）+ パス固定（H-1） |
| PN8-Build-Runtime-Release.md | registry grep チェック・RELEASE_HOLD 条件追加（L-5）+ パス固定（H-1） |
| RULES.md §17 | sickday/followup の adherence_status ルール + 禁止語彙（M-3）+ followup_monitoring スコープ明確化 |
| docs/JSON_STANDARD.md | addon 必須 12フィールド / treatment_end 個別値 / sickday situationFilter / thirdPanelSPlacement / composition.priority / normalizedTokens 追記 |

## vNext 体系での完了モジュール一覧

| moduleId | PN1〜PN8 | tsc/build | ModuleValidator |
|---|---|---|---|
| dm_insulin_rapid_analog | ✅ | ✅ | ✅ |
| dm_insulin_regular | ✅ | ✅ | ✅ |
| dm_insulin_intermediate | ✅ | ✅ | ✅ |

（上記以外の 11 モジュールは旧体系で生成・既存 — 同様に検証済み）

## 旧 followupProfiles バグの修正

PN1 / PN2 で `{ closingText: "..." }` という誤ったスキーマを生成していた問題を修正済みです。  
正しい型は `{ S?: string | null; P?: string | null }` です。この問題は再発しないよう両ファイルに明記されています。

## 事前設計審査（7項目）

旧体系 P0-B / P1 / P2B / P3 / P4 / P5 との比較、bridge→JSON 完全性確認、アプリ互換性確認、  
フェーズ責務マトリクス整合確認、最終 GO 判定を完了しています。

---

# 5. 次モジュール作業開始手順

## bridge 作成から開始する（JSON 未着手の新規モジュール）

新規モジュールの場合、PN1 に入る前に **bridge を作成する** 必要があります。

### bridge の構成

```
bridges/{moduleId}.md
```

構成は既存 bridge（例: `bridges/dm_insulin_intermediate.md`）を参照してください。

bridge の必須セクション:
1. **ヘッダーセクション**（moduleId / categoryPath / drug / display / composition / editingRules 等）
2. **SCENARIOS_START〜SCENARIOS_END**（シナリオ本文・ADDON 本文の全件）

### 作業順序

```
1. bridge ヘッダーを作成
     ↓
2. SCENARIOS_START〜SCENARIOS_END を作成（シナリオ・ADDON 本文の確定）
     ↓
3. ユーザー確認・凍結宣言
     ↓
4. PN1 開始
     ↓
5. PN1 → [承認] → PN2 → [承認 + AUTORUN開始コマンド] → PN3A〜PN8 自動連続実行
```

**bridge が既に完成している場合**: 手順 4 から開始してください。

## PN1〜PN8 開始手順

```bash
# 1. /tmp/soap-build に既存ファイルがあるか確認する
ls /tmp/soap-build/{moduleId}/ 2>/dev/null && echo "既存ファイルあり" || echo "ディレクトリなし（クリーン）"

# 既存ファイルがある場合: 前回の中断セッションのファイルの可能性
# 内容をユーザーへ報告し、継続か再実行かを確認してから進む
# 再実行する場合: rm -rf /tmp/soap-build/{moduleId} && mkdir -p /tmp/soap-build/{moduleId}
# 継続する場合: 残存フェーズから再開する

# 2. ディレクトリ作成（新規の場合）
mkdir -p /tmp/soap-build/{moduleId}

# 3. bridge を確認
wc -l /Users/AdNauseumTendrils/Desktop/soap-engine/bridges/{moduleId}.md

# 4. PN1 プロンプトを読んでから PN1 を実行する
```

**PN1 実行前の確認チェックリスト:**
- [ ] bridge の SCENARIOS_START〜SCENARIOS_END 範囲を確認した
- [ ] シナリオ数・ADDON 数を把握した
- [ ] P_CLOSING パターン数と件数内訳を把握した
- [ ] followupProfiles の型（S/P 形式）を理解した
- [ ] {{drug_subject}} 置換ルール（cp_good 等では補わない）を確認した
- [ ] ADDON が分散配置されている箇所を把握した

## 推奨実行順序

```
PN1 → [承認] → PN2 → [承認 + AUTORUN開始コマンド] → PN3A〜PN8 自動連続実行 → RELEASE_OK
```

半自動実行モード（AUTORUN）の詳細は `prompts/vNext/AUTORUN.md` を参照してください。  
通常モード（1 フェーズずつ）で実行する場合は、各フェーズ完了後にユーザーへ報告して停止します。

各フェーズ完了後の成果物確認コマンド:
```bash
wc -l /tmp/soap-build/{moduleId}/phase{N}*.json
```

## PENDING が発生した場合

PN2 で `composition.classKey` などが PENDING になった場合:  
その時点でユーザーへ確認を求め、回答を得てから PN2 を完成させてください。  
確認前に仮の値を埋めないでください。

---

# 6. 技術的負債（修正見送り中）

以下は機能上の問題はないが、将来対応が望ましい項目です。次モジュール作業のブロッカーではありません。

## AddonPanel.tsx の GROUP_ORDER 未登録グループ

`app/components/AddonPanel.tsx` の `GROUP_ORDER: ['counseling', 'oral', 'sickday', 'sideEffects']` に  
未登録のグループが存在します。未登録グループは `GROUP_LABELS[group] ?? group` により  
英語文字列ラベルのまま末尾に表示されます（機能上は動作する）。

| group 値 | 使用件数 | 対応方針 |
|---|---|---|
| `lifestyle_guidance` | 8 モジュール・26 件 | GROUP_ORDER / GROUP_LABELS 追加を将来検討（ラベル案: "生活指導"） |
| `administration_guidance` | 3 モジュール・11 件 | 同上（ラベル案: "使用方法"） |
| `adherence` | 多数 | 同上（ラベル案: "アドヒアランス"） |

**方針**: JSON 新規作成時はこれらの値を使い続けてよい。表示ラベル改善は別タスク。

## ModuleValidator 既存 WARNING

以下の WARNING は既知。ブロッカーではなく修正見送り中。

| 警告種別 | 対象モジュール | 内容 |
|---|---|---|
| `SEARCH_TOKEN_ALIAS_POLLUTION` | derm_heparinoid×4 / allergy_h1_eye_drops | commonSearchTokens が prefixAliases に混入。search ロジック側 dedupe 対応待ち |
| `ADDON_REQUIRED_TAG_UNREACHABLE` | allergy_h1_antihistamine_eye_drops | `cold_storage` タグが未接続。製品固有対応待ち |

## git ワーキングツリーの残存差分

以下は意図的に未コミット:

| ファイル | 理由 |
|---|---|
| `.claude/settings.local.json` | Claude Code 自動更新。コミット対象外 |
| `bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak` | .bak ファイル。不要なら手動削除可 |
| `scripts/test-multi-drug-synthesis.ts` | 用途未確認スクリプト。不要なら削除可 |

## GAP-01: vNext に CROSS_MODULE_DERIVATION_CHECK が存在しない

**内容**: 旧 P2B には「他モジュールの値を無断流用していないか」の確認 step があったが、  
vNext には対応する明示的なチェック項目がない。  
**現状**: 運用ルール「RULES.md §1 — 未指定の data/modules 内 JSON を自動選定してはならない」で代替している。  
**対応**: vNext への正式追加は未定。

## 一般名検索到達性（Q-S1）と O field 修正（2026-07 完了）

糖尿病領域モジュール群で、一般名（成分名）検索が同一成分の兄弟ブランドへ正しく展開されない問題（Tier1〜3）と、  
`dm_glp1ra_semaglutide_oral` / `dm_glp1ra_injection` の O field が薬効分類名固定になっていた問題（RULES.md §16 違反）を修正済みです。

- 採用した設計原則: `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）
- Tier 分類・残課題の詳細経緯: `docs/OPEN_DESIGN_QUESTIONS.md` Q-S1
- O field 修正の記録: `prompts/RULES.md` CHECK-O01

新規モジュール（DPP4 等）を作成する際は、上記 DP-09 と PN2-Drug-Header.md の brandCatalog alias 心得を確認してください。

---

# 7. 絶対に守るルール

以下のルールに違反した場合、JSON が正しく見えても医療文書として信頼できないものになります。

## bridge を書き換えない

bridge.md は読み取り専用です。  
文言の改善提案・構造の変更・空行の追加などを含め、一切変更してはなりません。

## 本文を変更しない

PN1 が保存した S / O / A / P / addon text は **凍結** されています。  
PN2 以降のフェーズで内容を変更すること（言葉の置き換え・文末の修正・行の追加）は禁止です。  
PN7 の項目 I（本文凍結照合）でこれを検証します。

## 推測生成しない

bridge に記述がないフィールドを推測で埋めないでください。  
わからない値は `PENDING` と書き、ユーザーに確認してから埋めます。

## 勝手に改善しない

「こうした方が良い SOAP になる」「このフィールドを追加すると便利」という判断を Claude が行ってはなりません。  
ユーザーが依頼した内容のみを実施します。bridge に書かれていない情報を JSON に追加しないでください。

## Write ツールで保存する

完成 JSON と中間ファイルはすべて Write ツールで保存します。  
JSON 全文をチャットテキストとして出力しないでください（出力 Limit 超過 + レビューが困難になるため）。

## 途中で JSON 全文をチャット出力しない

PN6 の最終 JSON は特に大規模になります（2,000行超）。  
「確認のため表示する」という行為も行いません。PN7 が JSON ファイルを直接 Read して検証します。

## 禁止 role 語彙を使わない

以下は RULES.md §17 で明示的に禁止されています。使用した場合は PN4 からやり直しです:

- SStructured: `sickday_status` / `followup_status` / `symptom_observation` / `adherence_observation` / `side_effect_observation` / `treatment_adjustment_reason`
- AStructured: `drug_mechanism` / `lifestyle_assessment` / `sickday_assessment` / `risk_assessment` / `clinical_guidance`
- PStructured: `treatment_start_reason` / `followup_monitoring`

## フェーズ実行モードの選択

**PN1 / PN2 は常に手動承認必須**です。

- PN1 を実行したら → 完了報告を行い、ユーザーの承認を待つ
- PN2 が PENDING になったら → 作業を止め、ユーザーへ確認事項を提示し、返答を待つ
- PN2 承認後、ユーザーが AUTORUN 開始コマンドを送った場合 → `prompts/vNext/AUTORUN.md` に従い PN3A〜PN8 を自動連続実行する
- PN2 承認後、ユーザーが個別に「PN3A を実行して」と指示した場合 → 通常モード（1 フェーズずつ）で実行する

AUTORUN モードでの詳細ルール・MUST_STOP 条件は `prompts/vNext/AUTORUN.md` を参照してください。

---

# 付録: bridge ヘッダー構成の参考例

新規 bridge を作成する際のヘッダー構成参考です。  
既存 bridge（例: `bridges/dm_insulin_intermediate.md`）の実際のヘッダーも参照してください。

```markdown
# {薬剤名} bridge

moduleId: {moduleId}
categoryPath: ["{大分類}", "{中分類}", "{小分類}"]
drug:
  genericName: {一般名}
  brandNames: [{ブランド名}, ...]
  drugClass: [{薬効クラス定数}, ...]
  route: injection / oral / topical
display:
  nodeKey: {classKey}_{route}
  nodeLabelShort: {短縮表示名}
  nodeLabelLong: {長表示名}
composition:
  classKey: {薬効クラス英略}
  priority: "chronic" / "acute"
editingRules:
  drugSubject: {{{drug_subject}}} 置換対象のリスト
  preserveOriginal: true
  allowSubjectOmission:
    - cp_good（など主語省略を許容するシナリオ）

SCENARIOS_START
【SCENARIO｜id=initial｜type=treatment_start｜...】
...
SCENARIOS_END
```

---

以上がすべての引き継ぎ内容です。  
新しいチャットはまず bridge ヘッダー作成（または PN1）から作業を開始してください。
