# SOAP Engine — vNext プロンプト体系 新規チャット引き継ぎ文書

作成日: 2026-06-26  
最終更新: 2026-08-13（Phase 1 監査由来 Finding の移設・再開 Trigger の明示を反映）  
対象ブランチ: `feat/nlp-input-panel-and-new-schema`  
リポジトリ: `/Users/AdNauseumTendrils/Desktop/soap-engine`

この文書は `prompts/vNext/STARTUP_PROMPT.md` が定める工程段階 Overlay の 1 つです。vNext module 生成（`bridges/{moduleId}.md` を起点に canonical JSON を生成・改修する作業）に着手するとき、PN1 より前に読みます。読込経路の正本は `prompts/vNext/STARTUP_PROMPT.md` です。

Human / ChatGPT / Claude の役割分担・協業原則は `docs/TEAM_CHARTER.md` を参照してください。

---

## 変更契機

（本節の要素・原則は `docs/DEVELOPMENT_STANDARD.md` §11 が定める）

**起点**: 次のいずれかを行ったとき、本ファイルは古くなる。

- `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` のいずれかで、
  フェーズの責務・入出力・停止条件を変更した
- `prompts/vNext/AUTORUN.md` の実行モードまたは MUST_STOP 条件を変更した
- `prompts/RULES.md` §24（bridge STATUS 遷移・PN1 開始条件）を変更した
- 本ファイルが技術的負債として記録している事項が解消した、または新たに記録する判断をした
- 本ファイルが正本として参照しているパス（`data/modules/index.ts` ／ 検証コマンド ／
  `docs/VALIDATOR_STANDARD.md` Appendix B）を変更・移動した

**更新対象**

- 「3. vNext プロンプト体系」の該当フェーズ記述（フェーズの責務・入出力・停止条件を変更した場合）
- 「5. 次モジュール作業開始手順」の該当手順（AUTORUN または bridge STATUS を変更した場合）
- 「6. 技術的負債」の該当項目（**解消した場合は削除する。記録を放置しない**）
- 参照先パス

**対象外**

- **モジュールの一覧・件数・登録状態・検証状態** — 本ファイルは保持しない。正本は
  `data/modules/index.ts` および検証コマンドの実行結果であり、実装側の変更に追随しない
  （**一覧・件数を本ファイルへ再び持ち込まないこと**）
- `docs/VALIDATOR_STANDARD.md` Appendix B の内容 — 同 Appendix が正本であり、
  本ファイルは台帳を二重管理しない

**検証**

- 本ファイル内にモジュールの一覧・件数が存在しないこと
- 参照先パスがすべて実在すること

**採用理由**

〔実測〕本節の制定前、本ファイルは「§1 に全 19 件」「§4 に 3 件＋他 11 件」という
相互に矛盾する 2 つのモジュール一覧を保持し、いずれも実態（35 件）と乖離していた。
「6. 技術的負債」の group 使用件数も同様に乖離していた。原因は、実装から機械取得できる値を
散文が複製したことである。

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

**登録済みモジュールの一覧・件数・登録順は `data/modules/index.ts` を正本とします。**
本ファイルは一覧・件数を保持しません（`ALL_MODULES` を参照してください）。

検証状態（tsc / build / ModuleValidator / CrossModuleValidator）は静的な記録ではなく、
`npx tsc --noEmit` / `npm run build` / `npm run audit` の実行結果を正本とします。

次モジュールの着手手順は「5. 次モジュール作業開始手順」を参照してください。

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
| PN5 | ui / risks / searchConfig 等の非シナリオ構造を生成する |
| PN6 | PN1〜PN5 を統合して最終 JSON を生成する（Write のみ） |
| PN7 | 完成 JSON を全 26 項目で監査する（修正しない） |
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

**composition.classKey の取り扱い（2026-07-24 更新。PN2-Drug-Header.md の classKey 導出ルールと同期）**:  
bridge 未記載の場合、`composition.nodeKey`（= `display.nodeKey` フォールバック値）が既知の標準形式
`<classKey>_<route>` に一致し、かつ route 部分が `drug.route` の値と一致するときに限り、
`<route>` 部分を機械的に取り除いて classKey を導出してよい。  
配合剤・`dual_mechanism` 等 nodeKey が単一 classKey + route の1:1構造になっていない module、
または route 部分が `drug.route` と一致しない場合は、推測で確定せず PENDING とし、ユーザーへ確認を仰ぐ。  
既存モジュールの実績値（`data/modules/index.ts` から特定できる JSON）は参考情報として提示してよいが、
そのまま流用して確定してはならない。  
詳細な導出ルール・一致例・不一致例は `prompts/vNext/PN2-Drug-Header.md`「classKey 導出ルール」を正本とする。

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
| lifestyle_guidance | `"counseling"` |
| sickday_guidance | `"sickday"` |
| adherence_guidance | `"adherence"` |
| side_effect_guidance | `"sideEffects"` |
| administration_guidance | `"counseling"` |

**変換表の正本は `prompts/RULES.md` §5 である。** 新規 module の group には
`"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"` の 5 値のみを使用し、
`"lifestyle_guidance"` / `"administration_guidance"` という文字列を group 値として
直接設定してはならない（RULES.md §6）。bridge の `type=` は意味上の分類として
そのまま保持し、canonical JSON の group のみを変換する。

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
| usage（as_needed_refill 系等） | `adherence_status`（RULES.md §17 で 2026-07-24 に正式値化） |

**禁止語彙（使うとエラー）**: `sickday_status` / `followup_status` / `sickday_assessment` / `symptom_observation` / `adherence_observation` / `side_effect_observation` / `treatment_adjustment_reason`

PN4A と PN4B は並列実行可能です。PN3B 完了後に同時開始できます。

---

### PN5 — Non-Scenario Structure

**プロンプトファイル**: `prompts/vNext/PN5-Non-Scenario.md`  
**入力**: 複数の中間ファイル（PN2 / PN3A / PN3B / PN1）  
**出力**: `/tmp/soap-build/{moduleId}/phase5_non_scenario.json`

ui / risks / searchConfig / tagCatalog / expressModes を生成します。

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

修正は行いません。26 項目を全確認します（A〜AB。**Q / X は欠番、項目 O は末尾に配置**）。

**大規模 JSON の Read 手順**:
1. `wc -l data/modules/{moduleId}.json` で行数確認
2. 2,000 行超なら `offset=0, limit=2000` → `offset=2000, limit=2000` ... と分割 Read
3. 末尾（addons / expressModes / searchConfig）の確認を省略しない

26 項目すべて PASS → `audit_report.json` に `verdict: "PASS"` を書いて PN8 へ。  
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

## モジュールの一覧・由来・検証状態について

**本ファイルはモジュールの一覧・件数を保持しません。**

| 知りたいこと | 正本 |
|---|---|
| 登録済みモジュールの一覧・件数・登録順 | `data/modules/index.ts`（`ALL_MODULES`） |
| 現在の検証状態 | `npx tsc --noEmit` / `npm run build` / `npm run audit` の実行結果 |
| どのモジュールがどの体系・どの時期に生成されたか | **git history**（当該 JSON の追加 commit） |

由来（vNext / 旧体系）を単一のラベルとして保持しません。判断に必要となるのは
「その module が特定の規則の確定より前に作られたか」であり、これは git の日付から
判定します。個別の規則についての境界は、その規則を定めた文書側に記載します
（例: `prompts/RULES.md` §6 / §17、`docs/feature-glossary.md`）。

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
1. bridge ヘッダーを作成（STATUS: HEADER_ONLY）
     ↓
2. SCENARIOS_START〜SCENARIOS_END を作成（STATUS: DRAFT）
     ↓
3. ユーザー確認・凍結宣言（STATUS: DRAFT → FROZEN_FOR_PN1 へ更新）
     ↓
4. PN1 開始
     ↓
5. PN1 → [承認] → PN2 → [承認 + AUTORUN開始コマンド] → PN3A〜PN8 自動連続実行（完了後 STATUS: JSON_COMPLETE）
```

bridge の STATUS 値の定義・遷移ルール・PN1 開始条件は `prompts/RULES.md` §24（Bridge Status State Machine）を正本とする。

**bridge が既に完成している場合**: bridge ヘッダーの STATUS が `FROZEN_FOR_PN1` であることを確認してから手順 4 へ進んでください。STATUS が `DRAFT` / `HEADER_ONLY` の場合は PN1 を開始せず、ユーザーへ凍結宣言を確認してください。会話ログで「凍結済み」と伝えられていても、ファイル上の STATUS がそれと異なる場合はファイル側を優先し、矛盾があれば作業を停止してユーザーへ報告します（RULES.md §24）。

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
- [ ] bridge ヘッダーの STATUS が `FROZEN_FOR_PN1` であることを確認した（RULES.md §24。`DRAFT` / `HEADER_ONLY` の場合は開始しない）
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

**PN1 で対応表にない P_CLOSING に遭遇した場合**（2026-07-05 DPP4 対応で確定）:  
followupRef を独自命名で確定せず、`"PENDING"` として PN1 を停止し、ユーザー承認を待ってください。  
詳細は `prompts/vNext/PN1-Text-Extraction.md`「対応表にないP_CLOSINGテキストが出現した場合」を参照。

**PN2 で `display.subtitle` が bridge 未記載の場合**（同上）:  
ブランド列挙や他モジュール模倣で生成せず、`prompts/vNext/PN2-Drug-Header.md` の標準 fallback
（`"{drug.genericName}（{routeLabel}）"`）を使用してください。

**AUTORUN 中に PN7 で CHECK / PENDING が残った場合**（同上）:  
FAIL と同様に PN8 進行のブロッカーとして扱い、人間承認を得るまで PN8 を自動実行しないでください。  
詳細は `prompts/vNext/AUTORUN.md` MUST_STOP 条件 P / Q を参照。

---

# 6. 技術的負債（修正見送り中）

以下は機能上の問題はないが、将来対応が望ましい項目です。次モジュール作業のブロッカーではありません。

## AddonPanel.tsx の GROUP_LABELS 未登録グループ

Addon の表示順は DP-10 / RULES.md §25 の通り bridge / JSON の記載順（`addonsRef.P`）をそのまま使用する（固定配列 GROUP_ORDER は廃止済み）。
一方、`app/components/AddonPanel.tsx` の `GROUP_LABELS` には日本語ラベルが未登録のグループが存在します。未登録グループは `GROUP_LABELS[group] ?? group` により、表示順自体は JSON 記載順どおりだが、ラベルのみ英語文字列のまま表示されます（機能上は動作する）。

| group 値 | 対応方針 |
|---|---|
| `lifestyle_guidance` | GROUP_LABELS 追加を将来検討（ラベル案: "生活指導"） |
| `administration_guidance` | 同上（ラベル案: "使用方法"） |
| `adherence` | 同上（ラベル案: "アドヒアランス"） |

使用モジュール数・件数は保持しません（`data/modules/*.json` の `addons.items[].group` を
走査して取得します）。

**方針**: 新規 module の group にこれらの値を使用してはならない。`prompts/RULES.md` §5 の変換表に従い
`"counseling"` 等の正式 group 値へ変換すること（同 §6 で明示的に禁止されている）。本表が示しているのは
本ルール確定前に生成された既存 module の実態であり、既存 module の migration 要否は別途判断とする。
AddonPanel の表示ラベル改善（`adherence` を含む）も別タスク。

## ModuleValidator 既存 WARNING

既知の WARNING（意図的に残存させているもの）の台帳は
**`docs/VALIDATOR_STANDARD.md` Appendix B: KNOWN_INTENTIONAL_WARNINGS が正本**である。

`npm run build` で WARNING が出力された場合は、まず Appendix B に登録済みかを確認すること。
登録済みであれば対応不要。未登録の WARNING が出た場合は、今回の変更が原因である可能性を
確認した上で報告する。

本ファイルでは台帳を二重管理しない。

## git ワーキングツリーの残存差分

**現在の未コミット差分は `git status --porcelain=v1` の実行結果を正本とします。**
本ファイルは、現在の差分一覧・件数を保持しません。

以下は、該当ファイルが未コミット差分として存在する場合の既知の取扱いです。

| ファイル | 理由 |
|---|---|
| `.claude/settings.local.json` | Claude Code 自動更新。コミット対象外 |
| `bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak` | .bak ファイル。不要なら手動削除可 |

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

## 多剤合成テスト（`npm run test:multi-drug`）— 正式回帰テストとして運用

**なぜ正式化したか**  
検索・alias・drug 構造（Q-S1 対応）を変更した際、複数薬剤を同時選択して SOAP を合成する経路（`buildNodeFields` + `mergeBlocks`）に悪影響がないかを、UI 実機確認だけでは見落としやすいと判明したため、`scripts/test-multi-drug-synthesis.ts` として Node/tsx のみで再実行できる形に整備しました。当初は一時スクリプトでしたが、DP-00（強くてニューゲーム原則）に基づき「検証手段も会話履歴に依存させずリポジトリへ永続化する」方針のもと、`npm run test:multi-drug` として正式にコミットしています。会話ログに検証手順が残っているだけでは、生成AIの担当交代（新規チャットへの切替、利用するAIサービスの変更を含む）が起きた瞬間に再現不能になるためです。

**何を検出するか**  
{{drug_subject}} 未解決 / O フィールドが薬効分類名固定のまま残っていないか（CHECK-O01 の回帰確認）/ uiVariant 等の内部文字列の SOAP 混入 / addonsRef 参照切れ / `getVisibleAddonKeys()`（AddonPanel が実際に呼ぶ関数）でのキー解決可否 / P closing の不自然な重複 / 同一成分・類似成分を含む薬剤同士の合成破綻。

**いつ実行するか**
- 検索・alias・drug 構造（`drug.search` / `brandCatalog` / `aliasToBrand` 等）を変更した場合（`docs/IMPLEMENTATION_CHECKLIST.md` に明記済み）
- **糖尿病領域を完了とみなす前、および DPP4 など次の薬効領域に着手する前**（現状 20 ケース全 PASS が前提条件）
- 新しい薬効領域のモジュールを追加した後（下記参照）

**今後の運用**  
新しい薬効領域（DPP4 等）のモジュールを追加したら、既存の 20 ケース（`scripts/test-multi-drug-synthesis.ts` の `TEST_CASES` 配列）に、その領域を含む組み合わせケースを追加していくこと。既存モジュールとの多剤併用（例: DPP4 + 既存インスリン/GLP-1）を必ず1ケース以上含める。ケースを削除する場合は「なぜ不要になったか」を PR やコミットメッセージに残すこと（DP-00 準拠）。

## DashboardClient の resolveDrugName() SSOTバイパス

`lib/drugSubject.ts` の `resolveDrugName()` は、薬剤名解決の唯一の正本として設計されている。関数の docstring に「通常UI・SOAP生成における薬剤名解決のSSOT。呼び出し元固有のフォールバックロジックを個別に書かず、常にこの関数を経由すること」と明記されており、`docs/JSON_STANDARD.md`（231行、`resolveDrugName()` 節）も「UI側は `genericName` へのフォールバックを行わない。`resolveDrugName()` が薬剤名解決の唯一の正本」と同旨を記載している。

`app/components/DashboardClient.tsx` の一部箇所は、この SSOT を経由せず独自の fallback ロジックで brand 名を直接確定させている（検索語: `resolvedBrand`。`activeBrandName ?? activeModuleData.drug?.brandNames?.[0]` という形で `resolveDrugName()` を介さずに直接 fallback している箇所が存在する）。

**扱い**: 既存の確定済みルール（`resolveDrugName()` をSSOTとして常に経由する）への未追随であり、新しい設計判断が必要な Question ではなく、**技術的負債**として扱う。

**現時点で確定していること**
- `resolveDrugName()` がSSOTである
- `DashboardClient.tsx` の一部fallbackがこのSSOTを迂回している

**今回決めていないこと**: 具体的な修正方法・変更箇所・移行順序・修正時の blast radius。これらは Repository 実測に基づき実装時に別 Unit として設計する。

**進捗（Q-S2 U-3・2026-08-09）**: 安全な resolver 契約（`resolveSubjectFromResolution()`、`lib/drugSubject.ts`）は実装済み。ただし `DashboardClient.tsx` 等の consumer は引き続き legacy 経路（`resolveDrugName()`）を使用中であり、本 SSOT バイパスは**未解決のまま**である。

**進捗（Q-S2 U-4a・2026-08-12）**: `BrandResolution` を production state（`activeResolution` / `ComposeNode.resolution`）へ保持する plumbing のみを実施した。**consumer 移行は行っていないため、本 SSOT バイパスは引き続き未解決である。** U-4a は runtime behavior を一切変更しない Unit であり、consumer 移行は **U-4b**、`denotation: 'module'` に対する安全 gate は **U-5** が担当する（工程順は U-4a → U-5 → U-4b）。

**バイパス箇所の補足（U-4a 実測で追記）**: 本節が例示していた `resolvedBrand` 系（brandKey 用途）に加え、`handleAddonToggle` の Rapid ADDON 経路が `activeDrugDisplayNameRef.current ?? activeBrandName ?? ''` という形で `resolveDrugName()` を**完全に迂回**して brandKey を SOAP 主語に流用している（検索語: `rapidDrugName`）。本箇所も U-4b の移行対象である。

**進捗（Q-S2 U-5・2026-08-12）**: `denotation: 'module'`（指示対象が未確定）の状態から SOAP 生成・brand 固有解決へ進ませない安全 gate を導入した。あわせて `denotation: 'generic'` における brand 固有 `handlingTags` の取得を「`brandKeys` 全件の交差集合」へ改め、代表 brand fallback を production から除去した（`lib/brandTags.ts`）。**subject の算出方法は変更していないため、本 SSOT バイパスは引き続き未解決である**（U-4b の責務）。ただし `denotation: 'module'` は SOAP 生成へ到達不能になったため、U-4b が扱う subject 乖離は brand / generic の 6 パターンのみに縮小した。

**解消（Q-S2 U-4b・2026-08-12）**: 検索由来候補の SOAP 主語は `BrandResolution` → `resolveSubjectFromResolution()` へ移行し、`drugDisplayLabel !== matchedBrandName` による主語推論は production から除去された。**本節が記録していた SSOT バイパス（検索由来経路）は解消済みである。** 意味論的変更は generic 6 module のみ（代表 brand 名 → 一般名）。

ただし **`resolveDrugName()` は削除も deprecated 化もしていない**（Owner Decision S-1-A）。`BrandResolution` を持たない Express・legacy 非検索経路・test harness の resolver として引き続き使用する。production 呼出しは 3 件残り、すべて `?? resolveDrugName(...)` の形＝ resolution 由来 subject が無いときにのみ到達する分岐である。**「Repository 全体で削除済み」ではない。**

**F-RAPID-1 の現状（U-4b 後）**: `rapidDrugName` の式形（`activeDrugDisplayNameRef.current ?? activeBrandName ?? ''`）は U-4b でも変更していない。ただし write-site 移行により `activeDrugDisplayName` が `resolution.subject` を保持するようになったため、**通常 SOAP / Rapid / S先頭文 / ADDON 再生成は同一の subject source を読む**。実測で挙動差は 0 件。式形の統一は cleanup Finding として保持する。

**別 Finding（Q-S2 とは無関係・cleanup 候補・2026-08-13 記録）**: `app/components/AddonPanel.tsx` はボタンラベルに `item.title ?? item.text` を描画する。`addons.items[].text` に `{{drug_subject}}` を含む addon（例: `dm_insulin_regular` の `addon_initial_sickday_guidance`）では、**ADDON パネルのラベル上に raw placeholder がそのまま見える**。ADDON を ON にして **SOAP 本文へ挿入される際は正しく薬剤名へ置換される**ことを Runtime Preview で確認済みであり、**clinical content の correctness ではなく UI ラベル表示のみの問題**である。`AddonPanel.tsx` は Q-S2 の全 commit（U-1〜U-4b）で未変更であり、**U-4b 起因ではない**。本 Unit では修正しない。

**別 Finding（今回変更しない）**: `handleExpressAdd` の `brandName ?? mod.drug?.brandNames?.[0]`（brandKey）および `displayName ?? resolvedBrandKey ?? ''`（主語を brandKey から導出）も legacy fallback である。ただし Express は `DrugSuggestionItem` を経由せず、有効な express entry 全件が canonical JSON 側で `defaultBrandName` を明示宣言しているため、検索由来の brand 未確定とは性質が異なる。Q-S2 の U-4a / U-5 / U-4b 系列からは分離し、cleanup 候補として保持する。

**Q-S2 CLOSED（U-8・2026-08-13）**: BrandResolution 系列（U-1〜U-7 + Runtime Preview 検証 + U-8 Deferred 再評価）は完了し、**`REMAINING_QS2 = 0`** で Q-S2 は CLOSED となった。本節が記録していた **F-3（`resolveDrugName()` SSOT バイパス）は解消済み**である。Deferred の最終分類・closure 条件・再発防止機構は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2「U-8」節（正本）および `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §13.9 を参照。

**Q-S2 の blocker ではない残作業**（いずれも別工程として扱う）:

- **U-6**（class-level query の generic group 展開）— correctness 完了の必須条件ではない。`denotation: 'module'` へ到達する 20 module で「候補は選べるが SOAP を作れない」行き止まりを解消する**検索 UX 改善**。
  **再開 Trigger**: `docs/OPEN_DESIGN_QUESTIONS.md` Q-UX1 の方針（選択肢 A/B/C）が Owner により決定された時点。U-6 は候補**集合**を変える唯一の Unit であり `limit=8` の配分と干渉するため、Q-UX1 の方針決定前に着手しない（依存は一方向。Q-UX1 は U-6 なしで単独実施できる）
- **Q-UX1**（ranking / `limit=8` / candidate visibility）— 独立した Question。D-4 の prefix `い` 表示枠脱落・F-S3-1 を含む。**再開 Trigger** は同 Q-UX1「推奨判断タイミング」（実機で表示枠脱落が実害として確認された時点）
- **cleanup Finding** — 下記 F-RAPID-1 / AddonPanel。いずれも BrandResolution の correctness / safety に影響しない（F-EXP-1 は U-EXP1 で解消済み。下記参照）

**F-EXP-1 は解消済み（U-EXP1・2026-08-13）**: ACTIVE な Express エントリ（`enabled === true && disabled !== true`）に対し `defaultBrandName` / `defaultScenarioId` / `sortOrder` を必須とする契約を、`docs/JSON_STANDARD.md` JS-expressModes（正本）・`lib/moduleValidator.ts`（詳細診断）・`scripts/audit-brand-resolution-safety.ts`（exit code による enforcement）の 3 層で機械化した。canonical JSON・bridge・runtime はいずれも変更していない。`handleExpressAdd` の `brandName ?? mod.drug?.brandNames?.[0]` は runtime に残置しており（削除すると `{{drug_subject}}` が未解決のまま SOAP 本文へ露出するため）、到達不能な safety net として扱う。

**F-EXP-2: legacy 単数 `expressMode` 構造（未対応・別 Unit）**: `lib/types.ts` の `ModuleData.expressMode?`（単数）は `expressModes[]`（配列）とは別系統の Express 入口である。

| 観測（U-EXP1 実測） | 内容 |
|---|---|
| canonical JSON での使用 | **0 件** |
| runtime 分岐 | **残存**（`app/components/DashboardClient.tsx` の `expressCandidates`。`expressModes` が無い module でのみ発火） |
| validator 検査 | **0 件**（check 17 は `expressModes` が配列のときのみ実行される） |
| JSDoc | `defaultBrandName` 省略時の `drug.brandNames[0]` フォールバックを**後方互換仕様として明示的に認めている** |

すなわち U-EXP1 が閉じた anti-pattern の再入経路が単数形側に残っている。使用 0 件のため現時点の実害はないが、新規 module が単数形を採用すると validator を素通りする。**廃止（型・runtime 分岐の削除）／ validator 追加 ／ 現状維持 のいずれを採るかは別 Unit の判断とする**（Owner Decision OD-D・2026-08-13。U-EXP1 へは統合しない）。

**`expressModes[].genericDisplayName` の必須性は未確定（Finding・U-EXP1 で判断保留）**: `docs/JSON_STANDARD.md` JS-expressModes は本フィールドを `enabled: true` のエントリに設定するものとして記載する一方、`lib/types.ts` / `ThirdPanel.tsx` の JSDoc は「省略時は `label` をそのまま使用する」と optional を明示しており、両者が食い違う。実測では `enabled: true` の 59 件すべてが宣言済み（`enabled: false` の 86 件は 0 件）で、runtime の参照箇所はすべて `?? label` の fallback を持ち、SOAP 主語へは到達しない（表示ラベル専用）。**述語も fallback の安全性も上記 3 フィールドと異なるため、U-EXP1 の invariant には含めていない。** 必須化するか optional と確定するかは Owner Decision を要する。

関連する brand 解決の安全性論点全体は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 を参照。

## Phase 1 監査（2026-07-25）由来の未解消 Finding

`docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md` §6 の所見のうち、**未解消のまま量産フェーズへ
持ち越すもの**を本節へ移した（初出の根拠・再現手順は同記録が正本。同記録は historical evidence 層に
あり読込経路から到達しないため、現在の状態と再開 Trigger は本節が持つ）。

**M-1: bridge STATUS 状態機械が実データで維持されていない**

`prompts/RULES.md` §24 は `HEADER_ONLY → DRAFT → FROZEN_FOR_PN1 → JSON_COMPLETE` を定めるが、
canonical JSON 化・registry 登録が済んだ bridge の大半が `JSON_COMPLETE` へ遷移していない。
STATUS 記載自体がない bridge（§24 制定前に作られたもの）もある。**canonical / runtime / correctness の
いずれにも影響しない**が、`prompts/RULES.md` §24 の「PN1 開始条件」判定に使う値であるため、
量産中は module 追加のたびに乖離が 1 件ずつ増える。現在の分布は
`grep -H "STATUS: " bridges/*.md` の実行結果を正本とする（本節は件数を保持しない）。

> **再開 Trigger**: 次のいずれか。① 次の薬効領域が Domain Complete（`docs/DEVELOPMENT_STANDARD.md` §8）
> に到達する時点 ② STATUS 値を根拠に PN1 の開始可否を判断する場面が実際に発生した時点
> ③ Owner が bridge STATUS の一括是正を指示した時点（**STATUS 行の変更には Owner の明示指示が必要**。
> RULES §24「Claude が自主的に降格させてはならない」「変更してよいのは Owner が明示的に状態遷移を
> 指示した場合のみ」）。監査を機械化する場合は `scripts/audit-bridge-status.ts` 相当を
> `npm run audit` へ追加する案が同監査記録 §11.1 T-4 に記録されている

**M-4: `as unknown as ModuleData` による型境界の迂回**

`data/modules/index.ts` は各 JSON を `as unknown as ModuleData` でキャストしており、**module 1 件につき
1 箇所ずつ増える**。`tsc` は JSON の構造を検査しない。当初監査は「量産再開前」の対応を推奨していた。

ただし当時と異なり、構造整合は現在**機械的に担保されている**: `lib/moduleValidator.ts`（37 check）/
`lib/crossModuleValidator.ts` / `npm run audit` 4 系統 / `tests/moduleRegistry.test.ts`（登録漏れ検出）/
`tests/moduleValidator.test.ts`（全 module ERROR 0 の invariant）。**型が担保するはずだった範囲は
これらが代替しているため、キャスト自体は現時点で欠陥として顕在化していない。**

> **再開 Trigger**: 次のいずれか。① **validator / audit / test のいずれでも検出できない構造欠陥が
> 1 件でも実測された時点**（＝機械担保に穴があると判明した時点） ② canonical JSON のスキーマを
> 外部（他ツール・API・SaaS）へ公開する必要が生じた時点（Phase 3〜4） ③ Owner が
> スキーマ進化戦略（JSON Schema / zod 導入）に着手すると判断した時点。
> **「キャストが 35 件ある」こと自体は再開理由にならない**（件数は module 数の従属変数であり、
> 欠陥の指標ではない）

**その他の Phase 1 所見の所在**: H-1 / H-2（persona バグとテスト）は解消済み（`37a9262` /
`tests/personaState.test.ts`）。H-4（正本の陳腐化）は変更契機・Lifecycle・読込経路の制度化により解消。
H-3（CI / ブランチ戦略・本文書での通称 S4-C）は **`docs/OPEN_DESIGN_QUESTIONS.md` Q-E の E-3
（main の位置づけ）が回答されるまで着手条件が揃わない**。M-2（認証境界）は Phase 3〜4、
M-3（全 module 配信）は F-1 で帯域評価が更新され Phase 5 相当へ後退、M-5（DashboardClient の状態集中）は
保守者が増える時点（Phase 3）。E-1〜E-7 の現在状態は `docs/OPEN_DESIGN_QUESTIONS.md` Q-E が正本。

## STRUCTURED_ROLE_FORBIDDEN validator の coverage gap（blocklist 方式の限界）

**FACT**:
- `lib/moduleValidator.ts` の `STRUCTURED_ROLE_FORBIDDEN` check（`FORBIDDEN_S_STRUCTURED_ROLES` 等）は禁止語彙の**ブロックリスト方式**である。`prompts/RULES.md` §17 の確立語彙に存在しない role でも、このブロックリストに明示されていなければ validator は検出しない場合がある。
- 実測例:
  - `symptom_observation`（`dm_insulin_rapid_analog`）— ブロックリスト登録済みのため検出され、**deterministic migration 済み**（2026-08-16、`adherence_status` へ）
  - `acute_condition_status`（`dm_gip_glp1ra_tirzepatide_injection` / `dm_glp1ra_injection` / `dm_glp1ra_semaglutide_oral`）— ブロックリスト**未登録**のため build では検出されず、横断調査で判明。**deterministic migration 済み**（2026-08-16、`adherence_status` へ）
  - `as_needed_status`（`allergy_h1_antihistamine_second_gen_oral`）— `prompts/RULES.md` §17 が「本ルール確定前の legacy 実装であり ERROR 該当」と明記しているにもかかわらず、ブロックリスト未登録のため build 上は無検出のまま**現時点では未解消**
- 2026-08-16 の全35 module 横断スキャンで、RULES.md §17 の確立語彙・禁止語彙のいずれにも属さない `SStructured.role` が複数種・80箇所超（5 module 以上）存在することを確認した。**これらを一括して defect と分類してはいない。** `symptom_absence_check` / `symptom_presence_check` 等は `2becf03`（2026-04-19）で著者が `acute_condition_status` から意図的に移行させた先であり、legacy defect ではなく現行の未文書化語彙である可能性がある。個別の classification が必要であり、今回は実施していない。

**impact**:
- `SStructured` は現在 runtime 未接続（`prompts/PROJECT_CONTEXT.md` §5）であり、現行 SOAP 生成 correctness への直接影響は確認されていない。
- ただし「validator / audit / test のいずれでも検出できない構造差異が存在する」という機械担保上の gap であり、将来 `SStructured` / Persona Structured metadata の runtime 接続を行う場合には correctness risk になりうる。

**current status**:

| 対象 | 状態 |
|---|---|
| `symptom_observation` | 解消済み |
| `acute_condition_status`（3 module） | 解消済み |
| `as_needed_status` | 未解消 |
| その他80箇所超の未分類 `SStructured.role` | 未監査・未分類 |
| validator の allow-list 化 ／ blocklist 拡張 ／ 語彙体系整理の方針 | **未決定** |

> **再開 Trigger**: 次のいずれか。① 未分類 `SStructured.role`（80箇所超）を対象とする横断監査 Unit に着手する時点 ② `SStructured` / Persona Structured metadata を runtime 接続する時点 ③ Owner が Structured role validator の allow-list 化・blocklist 再設計・語彙体系整理を指示した時点。
>
> **M-4 との関係**: `acute_condition_status` は validator / audit / test のいずれでも検出されなかった事例であり、M-4 の再開 Trigger「① validator / audit / test のいずれでも検出できない構造欠陥が1件でも実測された時点」（本文書 L747 参照）の**文言と表面上一致する**。ただし `STRUCTURED_ROLE_FORBIDDEN` は `docs/VALIDATOR_STANDARD.md` 上 **Design Rule** 分類であり、M-4 が問題とする `as unknown as ModuleData` による構造保証（Structural / Reference カテゴリ）とは対象範囲が異なる可能性がある。**本事例を M-4 Trigger①の充足として扱うべきかは、M-4 本文だけからは確定できず、Owner 判断を要する。** 本 Finding は M-4 とは異なる機構（個別 validator check のブロックリスト設計）に起因するため、**M-4 へ統合せず独立した Finding として記録する。M-4 自体は Deferred のままであり、この cross-reference によって M-4 の即時 investigation / resolution が要求されるものではない。**

## 任意 cleanup（correctness blocker ではない）

次は **BrandResolution / canonical / runtime の correctness・safety のいずれにも影響しない**。
精密な再開 Trigger を定義せず、**任意の cleanup** として扱う。関連箇所へ触れる作業が発生した際に
ついでに処理してよく、単独で工程化する必要はない。

| Finding | 内容 |
|---|---|
| F-RAPID-1 | `rapidDrugName` の式形が未統一（挙動差 0 件を実測済み） |
| AddonPanel raw placeholder | ADDON ボタンのラベルに `{{drug_subject}}` が見える（SOAP 本文では正しく置換される。UI ラベルのみ） |
| F-EXP-2 | legacy 単数 `expressMode`（使用 0 件・runtime 分岐残存・validator 検査 0）。**ただし将来 module が採用すると anti-pattern が再入するため、廃止判断のみ別 Unit として保持する** |
| `genericDisplayName` の必須性 | `JSON_STANDARD` と `lib/types.ts` の記述が不一致。Owner Decision を要する |
| L-1 AddonPanel GROUP_LABELS | 未登録グループのラベルが英語のまま表示される（本節冒頭の項を参照） |

## Static / Local First — file:// deployment 個別動作確認の残項目（2026-08-15）

`docs/STATIC_DEPLOYMENT.md`（living SSOT）・`docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`
（検証記録）が示すとおり、Windows company PC・production `out/`・real `file://` 環境で
local/static deployment の技術成立性・end-to-end 業務利用経路（電子薬歴貼り付けまで）は実証済みである。

一方、次の項目は Owner 実測が存在しないため **NOT YET VERIFIED** のまま保持する。**推測で PASS へ変更しない。**

| ID | 内容 | 現状 |
|---|---|---|
| FAC-10 | Rapid / ADDON 操作が file:// 環境で動作するか | NOT YET VERIFIED |
| FAC-13 | reload 後も正常に再表示されるか | NOT YET VERIFIED |
| FAC-14 | console fatal error が 0 件か | NOT YET VERIFIED |
| FAC-15 | Windows 実機の file:// 上で外部ネットワーク通信が 0 件か（コード上は外部通信処理自体が存在しないことを別途確認済み） | NOT YET VERIFIED |

**再開 Trigger**: 次回 Owner が同一の Windows company PC（または同等の制約環境）で SOAP Engine の
`file://` artifact に触れる機会があった時点。correctness / safety blocker ではないため、
単独でこの確認のためだけに Unit を立てる必要はない。確認できた項目は
`docs/STATIC_DEPLOYMENT.md` §6 の該当行と本節を同一作業内で更新し、本節から除去する。

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
