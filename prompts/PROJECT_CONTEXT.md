# SOAPエンジン PROJECT_CONTEXT

> **Version:** 2.0
> **Last Updated:** 2026-06-19
> **Current Focus:** P0-B / P1統合は現時点で見送り。基盤プロンプト整理完了。

新規チャット・Claude再起動・ChatGPT設計共有の共通正本。同期コスト削減が目的。

---

## Prompt Source of Truth

**プロンプト正本は `prompts/` 以下のローカルファイル。会話ログは正本ではない。**

| 正本ファイル | 役割 |
|---|---|
| `prompts/PROJECT_CONTEXT.md` | 本ファイル。全セッション共通の前提 |
| `prompts/P0-A.md` 〜 `prompts/P5.md` | 工程プロンプト正本 |

- 会話ログに書かれたルール・設計・値は、ファイルに保存されるまで正本ではない
- Claudeは会話ログの断片から構造・ルール・値を推測補完してはならない
- プロンプトを参照する際は必ず **ファイルを読んでから** 実行する

---

## 設計ドキュメント（Design Documentation）

設計意図・実装基準・保留事項を恒久化したドキュメント群。`prompts/` とは役割が異なる。

| ドキュメント | 役割 |
|---|---|
| `docs/DESIGN_PRINCIPLES.md` | モジュール設計原則（なぜそうするか）|
| `docs/JSON_STANDARD.md` | canonical JSON 構造標準（どう書くか）|
| `docs/BOOTSTRAP_STANDARD.md` | Bootstrap 設計標準（P0-A 工程の設計意図）|
| `docs/OPEN_DESIGN_QUESTIONS.md` | 設計保留事項（まだ決めていないこと）|

`prompts/` は工程実行用プロンプト。設計意図の記録・参照は `docs/` を用いる。

---

## Claude Startup Procedure

新規チャット・セッション再起動時の手順：

1. `prompts/PROJECT_CONTEXT.md`（本ファイル）を確認する
2. **Current Phase** を確認し、今何をしているか・何をまだしないかを把握する
3. 作業に必要なプロンプトファイル（`prompts/P0-A.md` 等）を確認する
4. 不足しているファイル・添付があれば **最初に報告する**（推測で進まない）
5. 作業計画を提示し、**承認を得てから** 修正・保存を開始する

### vNext 体系で作業する場合（旧 P0-A〜P5 とは排他）

`prompts/vNext/PN1〜PN8` を使う作業（主に大規模モジュールの JSON 化）を行う場合は、  
上記手順 3 の代わりに以下を実行する:

1. **`prompts/vNext/HANDOFF.md` を最初に読む**  
   - HANDOFF.md は運用引き継ぎ文書。会話ログは正本ではなく、このファイルが正本。  
   - 実行時の正本は `prompts/RULES.md` / `prompts/P1.md` / `prompts/vNext/PN1〜PN8`。
2. **`prompts/vNext/AUTORUN.md` を読む**  
   - PN1 / PN2 は手動承認。PN3A〜PN8 は AUTORUN モードで自動連続実行する。  
   - MUST_STOP 条件・1 行報告フォーマット・AUTORUN 開始コマンドを確認する。
3. HANDOFF.md の対象モジュールに対して PN1 から実行する  
   - PN1 / PN2 完了後はユーザーへ報告して停止する。  
   - PN2 承認後、ユーザーが AUTORUN 開始コマンドを送ったら PN3A〜PN8 を自動実行する。

---

## Current Phase

**Phase 1: SSOT回復 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | P0-A SSOT回復（addons.orderPresets / drug.nameAliases / search token / expressModes） |
| 完了 | P0-B 格納ルール対応更新 |
| 完了 | P2B 整合（SSOTドリフト修正・内部重複解消） |
| 完了 | P3 整合（SSOTドリフト修正・内部重複解消） |
| 完了 | P4 整合（SSOTドリフト修正・runtime recheck補完） |
| 完了 | P5 整合（P2_RETURN search token対称化） |
| 完了 | PROJECT_CONTEXT.md 整備 |

**Phase 2: moduleValidator連携 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | addons.orderPresets 欠落 / 型違反検出（`ORDERPRESETS_MISSING` / `ORDERPRESETS_TYPE_INVALID`） |
| 完了 | drug.nameAliases と drug.search.nameAliases 完全一致検出（`NAME_ALIASES_MISMATCH`） |
| 完了 | formulationSearchTokens alias汚染 WARNING（`SEARCH_TOKEN_ALIAS_POLLUTION`） |
| 完了 | commonSearchTokens alias汚染 WARNING（`SEARCH_TOKEN_ALIAS_POLLUTION` 拡張） |
| 完了 | expressModes 必須5フィールド検出（`EXPRESS_MODE_MISSING_FIELD`） |
| 完了 | expressModes 参照切れ検出（`EXPRESS_MODE_REF_BROKEN`） |

**Phase 2: types.ts整備 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | `DrugSearch.commonSearchTokens?: string[]` 追加 |
| 完了 | `StructuredEntry` interface 追加（id / text / role? / transform? / safety? / lockTerms? / notes?） |
| 完了 | `Scenario` に `SStructured? / OStructured? / AStructured? / PStructured?: StructuredEntry[]` 追加 |
| 保留 | `schemaGeneration` 未追加（P0-E保留に連動） |

**Phase 3: trailing copy低リスク整理 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | P3 SEARCH_TOKEN_VALIDATION_RULE 内の drug.nameAliases一致検証重複を削除 |
| 完了 | drug.nameAliases一致検証の check_name 記録先を BRAND_ALIAS_VALIDATION_RULE 側へ移動 |
| 完了 | P2B / P3 / P4 の expressModes field list を P0-A参照化（build / validation / runtime 固有ロジックは保持） |

**genericBrandName参照先確定 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | genericBrandName を drug.brandCatalog の key として確定（defaultBrandName と同じ参照制約） |
| 完了 | P0-A / P0-B / P3 / P4 の CHECK / P0-A未確定 表現を解消 |
| 完了 | moduleValidator で genericBrandName の brandCatalog 参照切れを EXPRESS_MODE_REF_BROKEN ERROR として検出 |

**Phase 3: trailing copy（中リスク分）— 完了**

| 状態 | 内容 |
|---|---|
| 完了 | addons.orderPresets 型・必須性を P0-A ADDON_REQUIRED_RULES 参照化（P2B / P3） |
| 完了 | drug.nameAliases 完全一致条件を P0-A drug.nameAliases完全一致ルール 参照化（P2B / P3） |
| 完了 | P2B BRAND_ALIAS_BUILD_RULE 内部重複削除（mandatory diff の === 重複行） |
| 完了 | P2B search token handoff内部重複解消（早期 [P3_HANDOFF] を P3_HANDOFF_RULE に一本化） |

**STANDARD_REFERENCE_PATHS 共通化レビュー — 完了・現時点では実施しない**

| 状態 | 内容 |
|---|---|
| 完了 | P2B / P3 / P4 の STANDARD_REFERENCE_PATHS 重複分布を確認 |
| 判断済み | 完全重複はファイルリスト部分のみ。工程固有注記が多く残り純削減効果は限定的 |
| 判断済み | P0-C に移すと APP RULE 定義の責務が広がる（将来再検討条件あり → セクション9参照） |

**P0-B / P1 統合レビュー — 完了・現時点では統合しない**

| 状態 | 内容 |
|---|---|
| 完了 | P0-B（535行）/ P1（286行）の役割・重複・固有箇所を全セクション対比確認 |
| 判断済み | 重複は ~80% だが役割は WHERE/HOW（格納ルール）と WHAT/WHEN（保全原則）で明確に分離 |
| 判断済み | P1 が P0-C 後段に位置し P0-C 入力依存を持つため、統合すると pipeline 設計変更が必要 |

**次フェーズ候補**（優先順位未確定）

- P0-E 保留継続

**次フェーズでまだ実施しないこと** → セクション9参照

**vNext フェーズ（大規模モジュール向け新体系 / 並行進行）**

| 状態 | 内容 |
|---|---|
| 完了 | vNext PN1〜PN8 プロンプト体系の設計・整備・運用レビュー（全 10 ファイル）|
| 完了 | `dm_insulin_rapid_analog.json` の vNext 体系での JSON 化 |
| 完了 | `dm_insulin_regular.json` の vNext 体系での JSON 化 |
| 完了 | `dm_insulin_intermediate.json` の vNext 体系での JSON 化 |

vNext 作業手順の詳細は `prompts/vNext/HANDOFF.md` を参照。

---

## 1. プロジェクト概要

**SOAPエンジン**は薬歴SOAP生成アプリ（Next.js 15 / TypeScript）。

- bridge原稿（医師・薬剤師が書いた指導文）を canonical JSON へ移植し、アプリで高速SOAP生成する
- 現在数モジュール稼働中。今後 **内服・外用・点眼・点鼻・吸入・注射・漢方** など 50〜300+ モジュールを量産する
- 目標は単発実装ではなく、**数百モジュール量産に耐える基盤**を作ること

**主要パス**

```
soap-engine/
  data/modules/          # canonical JSON（モジュールごと）
  data/modules/index.ts  # モジュール登録
  lib/types.ts           # TypeScript型定義
  lib/moduleValidator.ts # ビルド時バリデーション
  prompts/               # P0-A〜P5 プロンプト群（本ファイル含む）
  docs/                  # 設計ドキュメント（設計原則・JSON標準・Bootstrap・保留事項）
```

---

## 2. 開発思想（全工程共通）

| 原則 | 内容 |
|---|---|
| Single Source of Truth | bridge原稿が正本。canonical JSON側の既存値より bridge 一致を優先 |
| 非創作 | 補完しない・改善しない・自然化しない・医学的推測しない |
| JSON都合禁止 | JSON構造を整えるために本文（S/O/A/P）を変えない |
| Baseline persona preservation | bridge本文の温度感・距離感・counseling weightを変えない |
| App側吸収禁止 | preservation violation を P3/P4/P5 で後補正しない。P2へ差し戻す |

---

## 3. 工程概要（P0-A〜P5）

| 工程 | 役割 | 備考 |
|---|---|---|
| **P0-A** | Model JSON 基準構造定義（構造SSOT） | 全工程の構造的根拠 |
| **P0-B** | bridge → canonical 格納ルール定義 | どこに何をどう格納するか |
| **P0-C** | app受け口定義（TypeScript型・loader・runtime） | |
| **P0-D** | Model JSON差分整理（旧→新の影響を各工程へ伝播） | |
| **P1** | Preservation原則定義（P2が守るstop条件） | 将来 P0-B 統合候補 |
| **P2A** | Model JSON draft（任意工程） | 省略可。省略時は人間指定の器を使用 |
| **P2B** | Canonical Build（bridge → JSON） | deterministic build のみ許可 |
| **P3** | Structural Validation（JSON構造・参照整合・preservation recheck） | 修正なし |
| **P4** | Runtime / App Compatibility Validation（build・typecheck・UI・search） | 修正なし |
| **P5** | Release / Monitor（deploy前後の最終確認） | 修正なし |

```
P0-A → P0-B → P0-C → (P0-D) → P1 → (P2A) → P2B → P3 → P4 → P5
```

---

## 4. 重要設計判断

### moduleVersion / schemaGeneration
- `moduleVersion`：コンテンツ改訂版数（semver文字列）。Model JSON世代管理には**使わない**
- `schemaGeneration`：将来候補の整数フィールド。現時点では未実装
- 世代差分検出の**主役は `moduleValidator.ts`**。P0-E は補助工程候補（未新設）

### addons.orderPresets
- 全モジュールで `object` として必須生成（未使用時は `{}`）。キーを omit してはならない

### drug.nameAliases
- `drug.nameAliases === drug.search.nameAliases`（順序・表記・エントリ数の完全一致）を必須とする
- `drug.search.nameAliases` が確定した後に `drug.nameAliases` を複写生成する

### commonSearchTokens / formulationSearchTokens
- alias ではない。`aliases / normalizedAliases / aliasToBrand / search aliases` へ**展開禁止**
- bridge 明示分のみ格納。推測生成禁止

### expressModes
- `lib/types.ts` に 13フィールド定義済み（`ExpressModeEntry`）
- P0-A〜P5すべてで13フィールド整合済み（Phase 1 SSOT回復完了）

### addonsRef の正本
- `scenarios[].addonsRef` は bridge の `P_ADDON` 記載を正本とする（RULES.md §20）
- bridge⇔JSON⇔runtime（AddonPanel到達）の横断監査は `scripts/audit-addon-bridge-chain.ts` が担う

### genericName / genericKey の役割分離
- `brandCatalog[brand].genericName` / `displayGenericName` は表示専用、`genericKey` は検索グルーピング判定専用（RULES.md §21）
- `genericKey` は任意フィールド。省略時は `genericKey ?? displayGenericName ?? genericName` にフォールバックする
- 配合剤の複数成分対応（`genericKeys: string[]`）は未導入（`docs/OPEN_DESIGN_QUESTIONS.md` Q-G1）

---

## 5. UI / 機能用語

| 用語 | 意味 | 注意 |
|---|---|---|
| **Rapid** | 右パネル簡易操作（S先頭文・状態ボタン・フラグ） | NLP生成ではない |
| **ADDON** | S/A/P への追加文操作 | P closing の前に挿入。closing は最後に1回のみ残す |
| **Express** | 中央パネル高速薬剤選択フロー | |
| **NLP生成** | 自然言語入力 → シナリオ推定（将来機能） | 現在UI未接続 |
| **Persona** | 文体変換レイヤー（丁寧/やさしい/簡潔など） | 医療内容を変更しない |
| **Structured** | SStructured/AStructured/PStructured | 全既存モジュールに存在するがruntime未接続 |
| **bridge原稿** | canonical build の正本となる指導文草稿 | |
| **Model JSON** | 新規モジュールの構造テンプレート | P0-A の latest_model_json |
| **canonical JSON** | data/modules/ に格納される完成済みJSON | |

---

## 6. 役割分担（Claude / ChatGPT）

| 担当 | 作業内容 |
|---|---|
| **Claude** | ローカルコード確認・実装・ファイル保存・typecheck/build・実機確認 |
| **ChatGPT** | 設計レビュー・プロンプト監査・方針整理・文章化・Claude向け指示作成 |

---

## 7. トークン効率方針

優先順位：① 品質維持（preservation・medical correctness）→ ② Claude 読込トークン削減 → ③ 人間工数削減 → ④ 工程数削減

工程数を減らしても読込トークンが増えるなら改善とみなさない。Claude トークン消費が過大な案は不採用候補。

---

## 8. フェーズ完了記録

### Phase 1: SSOT回復

| 対象 | 修正ファイル | 状態 |
|---|---|---|
| `addons.orderPresets` | P0-A / P0-B / P2B / P3 / P4 | 完了 |
| `drug.nameAliases` 完全一致 | P0-A / P0-B / P2B / P3 / P4 | 完了 |
| search token alias汚染防止 | P0-A / P0-B / P2B / P3 / P4 / P5 | 完了 |
| `expressModes` 内部schema（13フィールド） | P0-A / P0-B / P2B / P3 / P4 | 完了 |

P2B/P3/P4/P5 に trailing copy として残存する同等ルールは次フェーズで「P0-A参照」へ整理予定。

### Phase 2: moduleValidator連携

| 対象 | エラーコード | 分類 | 状態 |
|---|---|---|---|
| addons.orderPresets 欠落 | `ORDERPRESETS_MISSING` | ERROR | 完了 |
| addons.orderPresets 型違反 | `ORDERPRESETS_TYPE_INVALID` | ERROR | 完了 |
| drug.nameAliases 完全一致 | `NAME_ALIASES_MISMATCH` | ERROR | 完了 |
| formulationSearchTokens alias汚染 | `SEARCH_TOKEN_ALIAS_POLLUTION` | WARNING | 完了 |
| commonSearchTokens alias汚染 | `SEARCH_TOKEN_ALIAS_POLLUTION` 拡張 | WARNING | 完了 |
| expressModes 必須5フィールド欠落 | `EXPRESS_MODE_MISSING_FIELD` | ERROR | 完了 |
| expressModes 参照切れ | `EXPRESS_MODE_REF_BROKEN` | ERROR | 完了 |

実装しなかったもの（次フェーズ以降）: schemaGeneration / StructuredEntry値バリデーション / Structured runtime接続 / P0-E

### Phase 2: types.ts整備

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| `DrugSearch.commonSearchTokens?: string[]` 追加 | `lib/types.ts` | 完了 |
| `StructuredEntry` interface 追加 | `lib/types.ts` | 完了 |
| `Scenario` Structured optional フィールド追加（S/O/A/P） | `lib/types.ts` | 完了 |
| `schemaGeneration?: number` 追加 | — | 保留（P0-E保留に連動） |

追加しなかったもの（次フェーズ以降）: schemaGeneration / StructuredEntry値バリデーション / Structured runtime接続

### Phase 3: trailing copy低リスク整理

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| P3 drug.nameAliases一致検証 重複削除 | prompts/P3.md | 完了 |
| drug.nameAliases check_name 記録先移動 | prompts/P3.md | 完了 |
| expressModes field list P0-A参照化 | prompts/P2B.md / P3.md / P4.md | 完了 |

変更しなかったもの（次フェーズ以降）: addons.orderPresets / drug.nameAliases / search token 参照化 / STANDARD_REFERENCE_PATHS共通化 / P0-B+P1統合 / commonSearchTokens / types.ts / schemaGeneration / StructuredEntry / P0-E

### genericBrandName参照先確定

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| P0-A THIRD_PANEL/EXPRESS_RULES CHECK解消 | `prompts/P0-A.md` | 完了 |
| P0-B 参照制約明記 | `prompts/P0-B.md` | 完了 |
| P3 EXPRESS_THIRD_PANEL_VALIDATION_RULE CHECK解消 | `prompts/P3.md` | 完了 |
| P4 EXPRESS_THIRD_PANEL_RUNTIME_RULE CHECK解消 | `prompts/P4.md` | 完了 |
| moduleValidator genericBrandName → EXPRESS_MODE_REF_BROKEN | `lib/moduleValidator.ts` | 完了 |

### Phase 3: trailing copy中リスク整理

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| addons.orderPresets 型・必須性 P0-A参照化 | `prompts/P2B.md` / `prompts/P3.md` | 完了 |
| drug.nameAliases 完全一致条件 P0-A参照化 | `prompts/P2B.md` / `prompts/P3.md` | 完了 |
| P2B BRAND_ALIAS_BUILD_RULE 内部重複削除 | `prompts/P2B.md` | 完了 |

変更しなかったもの: search token参照化（SEARCH_TOKEN_VALIDATION_RULEを削ると判断基準が消えるリスクあり・必要性再評価）

### Phase 3: trailing copy追補（P2B内部重複解消）

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| P2B search token handoff内部重複解消 | `prompts/P2B.md` | 完了 |

- 早期 `[P3_HANDOFF]` の search token 検証対象（4フィールド＋alias非展開＋index反映要否）を削除
- 正本を `■ P3_HANDOFF_RULE`（後段・完全版）に統一
- search token build rule / validation rule / ERROR条件 / CHECK条件 は変更なし

変更しなかったもの: P3 SEARCH_TOKEN_VALIDATION_RULE（独立セクションとして validation 判断基準を提供・追加参照化は工程固有性が高くリターンが小さいと判断済み）

### STANDARD_REFERENCE_PATHS 共通化レビュー

| 対象 | 内容 | 判断 |
|---|---|---|
| P2B / P3 / P4 ファイルリスト重複 | 17行が3工程で verbatim 一致 | 共通化可能だが現時点で見送り |
| 工程固有注記 | 確認目的・制限注記・注意ブロックが各工程に残る | 共通化してもセクション全体は残存 |
| P0-C 責務 | APP RULE 定義に「ファイル参照許可カタログ」が混入 | P0-C の役割一貫性を優先 |
| 純削減効果 | 51行重複 → 29行削減（32%）にとどまる | 整備コストに見合わない |

変更しなかったもの: P2B / P3 / P4 の STANDARD_REFERENCE_PATHS はすべて現状維持

### P0-B / P1 統合レビュー

| 観点 | 内容 | 判断 |
|---|---|---|
| P0-B の役割 | bridge→canonical の格納ルール定義（WHERE / HOW） | 分離維持 |
| P1 の役割 | preservation 原則・non-creative build 原則・stop condition 定義（WHAT / WHEN） | 分離維持 |
| 重複量 | SOURCE_OF_TRUTH / preservation targets / 禁止事項が ~80% 重複 | 統合動機あり |
| P1 の入力依存 | P1 は P0-A + P0-B + **P0-C** を入力に取る（P0-C 後段に位置） | 統合すると pipeline 設計変更が必要 |
| 統合リスク | P0-B が格納ルール＋保全原則を兼ねることで役割混在・肥大化（推定 500行超） | 統合コストが削減メリットを上回る |

変更しなかったもの: P0-B.md / P1.md ともに現状維持

---

## 9. 次フェーズでまだ実施しないこと（暫定）

- P0-B / P1統合（将来再検討: preservation targetが実際にずれた場合 / P0-Cの位置づけが変わった場合 / モジュール量産時に読込コストが実害化した場合）
- STANDARD_REFERENCE_PATHS共通化（将来再検討: lib/* ファイルが大幅に増えた場合 / P2B・P3・P4の参照パスが実際にずれた場合 / P0-Cを project-wide reference catalog として再定義する場合）
- P0-E新設（保留条件: schemaGeneration実装・モジュール数増加・P0-A改版計画具体化のいずれか）
- schemaGeneration必須化・JSON追加（P0-E保留に連動）
- StructuredEntry 値バリデーション（role / transform / safety の値チェック）
- Structured runtime接続（現状は moduleValidator check #16 text同期チェックのみ）
- search token 追加参照化（工程固有性が高く参照化リターンが小さいと判断済み・追加検討不要）
- 新プロンプト本文の全文再生成

---

## 10. 運用方針

- プロンプト正本は `prompts/` 以下のファイル（→ **Prompt Source of Truth** 参照）
- 新規チャット時は本ファイルを最初に読む → 必要な P0-A〜P5 のみ追加で読む → bridge原稿を添付
- Claude は添付不足を発見した場合、**「どのファイルが不足しているか」を最初に報告する**
- 添付依頼時は「何のために必要か」「修正対象か参照対象か」を必ず明示する
- ファイル参照は可能な限り **リポジトリ相対パス** で明示する

**よく使うパス**

```
prompts/PROJECT_CONTEXT.md
prompts/P0-A.md  prompts/P0-B.md  prompts/P0-C.md  prompts/P0-D.md
prompts/P1.md    prompts/P2A.md   prompts/P2B.md
prompts/P3.md    prompts/P4.md    prompts/P5.md
prompts/RULES.md

lib/types.ts           lib/moduleValidator.ts
lib/search.ts          lib/buildSoap.ts

data/modules/index.ts
data/modules/{moduleId}.json

docs/DESIGN_PRINCIPLES.md    docs/JSON_STANDARD.md
docs/BOOTSTRAP_STANDARD.md  docs/OPEN_DESIGN_QUESTIONS.md
docs/VALIDATOR_STANDARD.md  docs/IMPLEMENTATION_CHECKLIST.md

scripts/audit-addon-bridge-chain.ts   # bridge⇔JSON⇔runtime addonsRef横断監査
```

**vNext 体系パス（大規模モジュール JSON 化専用）**

```
prompts/vNext/HANDOFF.md                      # vNext 作業の引き継ぎ文書（新規チャット起点）
prompts/vNext/PN1-Text-Extraction.md          #
prompts/vNext/PN2-Drug-Header.md              #
prompts/vNext/PN3A-Scenario-Classification.md #
prompts/vNext/PN3B-Scenario-Metadata-Apply.md #
prompts/vNext/PN4A-Structured-GroupA.md       #
prompts/vNext/PN4B-Structured-GroupB.md       #
prompts/vNext/PN5-Non-Scenario.md             #
prompts/vNext/PN6-Assembly.md                 #
prompts/vNext/PN7-Cross-Reference-Audit.md    #
prompts/vNext/PN8-Build-Runtime-Release.md    # （PN1〜PN8 の実行プロンプト正本）
/tmp/soap-build/{moduleId}/                   # vNext 中間成果物（セッション固定パス）
```
