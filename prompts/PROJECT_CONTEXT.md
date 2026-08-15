# SOAPエンジン PROJECT_CONTEXT

> **Version:** 2.5
> **Last Updated:** 2026-08-16
> **Current Phase:** **Phase 1 — Static / Local First**（Phase 定義は `docs/DEVELOPMENT_STANDARD.md` §12）
> **Current Focus:** local/static deployment の技術成立性・end-to-end 業務利用経路は実証済み（`docs/STATIC_DEPLOYMENT.md`）。Phase 2 への遷移は Owner 未承認のため保留中。

新規チャット・Claude再起動・ChatGPT設計共有の共通正本。同期コスト削減が目的。

---

## Prompt Source of Truth

**プロンプト正本は `prompts/` 以下のローカルファイル。会話ログは正本ではない。**

| 正本ファイル | 役割 |
|---|---|
| `prompts/PROJECT_CONTEXT.md` | 本ファイル。全セッション共通の前提 |
| `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` | 工程プロンプト正本（**新規作業の標準**）|
| `prompts/P0-A.md` 〜 `prompts/P5.md` | 旧体系の工程プロンプト正本。新規作業では使用しない（§3 参照）|
| `prompts/RULES.md` | 両体系が共通参照する横断ルール辞書 |

- 会話ログに書かれたルール・設計・値は、ファイルに保存されるまで正本ではない
- Claudeは会話ログの断片から構造・ルール・値を推測補完してはならない
- プロンプトを参照する際は必ず **ファイルを読んでから** 実行する

---

## 設計ドキュメント（Design Documentation）

設計意図・実装基準・保留事項を恒久化したドキュメント群。`prompts/` とは役割が異なる。

| ドキュメント | 役割 |
|---|---|
| `docs/DEVELOPMENT_STANDARD.md` | **プロジェクト全体構造・正本関係・Documentation Map・運営規則を示す索引文書**。Mission / Core Philosophy / Architecture / Development Workflow を一枚で把握する |
| `docs/DESIGN_PRINCIPLES.md` | モジュール設計原則（なぜそうするか）|
| `docs/JSON_STANDARD.md` | canonical JSON 構造標準（どう書くか）|
| `docs/BOOTSTRAP_STANDARD.md` | Bootstrap 設計標準（P0-A 工程の設計意図）|
| `docs/OPEN_DESIGN_QUESTIONS.md` | 設計保留事項（まだ決めていないこと）|
| `docs/TEAM_CHARTER.md` | Human / ChatGPT / Claude の役割分担・協業原則 |

`prompts/` は工程実行用プロンプト。設計意図の記録・参照は `docs/` を用いる。

---

## 読込経路について

**新規セッションで何をどの順に読むかは `prompts/vNext/STARTUP_PROMPT.md` が正本である。**
本ファイルは読込順序・必読文書一覧・工程への遷移手順を持たない。

本ファイルの責務は「**いま何をしているか**」を示すことである。

| 本ファイルが持つもの | 本ファイルが持たないもの |
|---|---|
| Current Phase（現在のフェーズ・進捗） | 読込経路（→ `prompts/vNext/STARTUP_PROMPT.md`） |
| まだ実施しないこと | 工程の実行手順（→ `prompts/vNext/` 各 PN ファイル） |
| 重要設計判断の要約と正本へのポインタ | 判断基準の正本（→ 各正本文書） |

---

## Current Phase

**Phase 1 — Static / Local First**

Phase の定義・完了条件・遷移 Trigger の正本は `docs/DEVELOPMENT_STANDARD.md` §12 Product Phase Roadmap。
本節は「いまどこにいるか」だけを持ち、Phase の定義を複製しない。

**現在の目標**

開発者本人が実務で使用できる静的版を成立させること。Phase 0（基盤）の成果物
（bridge→JSON→runtime の 3 層 SSOT・4 系統 audit・検証体系・文書アーキテクチャ）は整備済み。

**Phase 1 の実測結果（2026-08-15）**: local/static deployment の技術成立性・end-to-end 業務利用経路
（Mac での build → Windows company PC → `file://` 起動 → SOAP 生成 → Clipboard → 実際の電子薬歴への
貼り付け）が実機で成立した。build・配布・起動手順は `docs/STATIC_DEPLOYMENT.md`（living SSOT）へ
正本化済み。検証記録は `docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`。

一方、個別の動作確認（Rapid/ADDON・reload・console error・外部通信 0 の実機確認）は一部
NOT YET VERIFIED のまま残っている（`prompts/vNext/HANDOFF.md` §6）。**Phase 1 → Phase 2 の
遷移は Owner の明示確認前であり、本ファイルでは未確定のまま扱う。**

**現在の作業順序（Current Roadmap）**

```
① Cold-Start BCP の closure（Repository 単独で現在地・次工程・Deferred を復元できる状態）
     ↓ CLOSED（2026-08-16・Owner Decision）
② Static / Local First の成立確認（静的版が実際にビルド・動作すること）
     ↓ 技術成立性・end-to-end 業務利用経路は実証済み。Phase 遷移の Owner 確認待ち
③ Module Expansion を主工程へ（canonical module の追加を継続工程として再開）
     ↓
④ 実運用とデータ拡充
```

**① Cold-Start BCP closure について（2026-08-16）**

- **完了条件の正本は `docs/DEVELOPMENT_STANDARD.md` §12.2 Phase 0 の完了条件・遷移 Trigger**（「Repository のみを入力とする新規セッションが現在地・次工程・Deferred を復元できること」）である。本ファイルは条件を複製しない。
- 2026-08-16 の Cold-Start 検証（Repository のみを入力）により、Current Phase / Current Focus / Current Roadmap・next step / Deferred / restart trigger / 既知 Finding / Owner Decision 要事項を復元できることを確認した。同検証で判明した Structured role validator の coverage gap は技術修正を closure 条件とせず、`prompts/vNext/HANDOFF.md` §6 へ Finding として永続化した（DP-00）。
- 上記に基づき、Owner Decision により **Cold-Start BCP を CLOSED とした**。
- **CLOSED は Module Expansion の開始許可ではない。** MODULE EXPANSION = GO は別の Owner Decision であり未判定である（下表参照）。

**この順序について**: `docs/PERSONA_PROJECT_PRINCIPLE.md` §3 の三段階（第1段階 base 指導文の一周完成 →
第2段階 Static 版の店舗実運用検証）は **Persona Project 固有の内部工程**であり、プロダクト全体の
唯一の作業順序ではない（`docs/DEVELOPMENT_STANDARD.md` §12.3 が責務分離を定める）。
上記 ①〜④ が現在の全体順序である。

**現時点で着手しないこと**

| 対象 | 理由 |
|---|---|
| 新規 canonical module の作成 | ① は CLOSED（2026-08-16）。残るゲートは **MODULE EXPANSION = GO 判定（別 Owner Decision・未判定）**であり、これが下りるまで着手しない。着手対象の薬効領域も未決定 |
| U-6 / Q-UX1（検索 UX） | correctness blocker ではない。再開 Trigger は `prompts/vNext/HANDOFF.md` §6 / `docs/OPEN_DESIGN_QUESTIONS.md` Q-UX1 |
| `EXPORT_STATIC` の Lifecycle 昇格 | 実測（`docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`）は完了したが、昇格判断自体は意図的に別 Unit として保留中（Owner Decision）。判定材料は揃った状態で待機 |
| SaaS 向け実装（entitlement / 配信境界 / 認証の全面置換） | Phase 3〜4。設計の検討経緯は `docs/reviews/f1/`（historical evidence） |

**検証状態・件数は本ファイルが保持しない。** 登録済みモジュールは `data/modules/index.ts`、
検証結果は `npx tsc --noEmit` / `npm test` / `npm run audit` / `npm run build` /
`npm run test:multi-drug` の実行結果を正本とする。vNext 作業手順は `prompts/vNext/HANDOFF.md`。

まだ実施しない設計事項（schemaGeneration・P0-B/P1 統合・STANDARD_REFERENCE_PATHS 共通化等）は §9 を参照。

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
  prompts/               # 工程プロンプト群（vNext PN1〜PN8 / 旧体系 P0-A〜P5・本ファイル含む）
  docs/                  # 設計ドキュメント（設計原則・JSON標準・Bootstrap・保留事項）
```

---

## 2. 開発思想（全工程共通）

| 原則 | 内容 |
|---|---|
| Single Source of Truth | 正本は `docs/DEVELOPMENT_STANDARD.md` §2 を参照。本文はここでは重複保持しない |
| 非創作 | 正本は `docs/DEVELOPMENT_STANDARD.md` §2 を参照。本文はここでは重複保持しない |
| JSON都合禁止 | JSON構造を整えるために本文（S/O/A/P）を変えない |
| Baseline persona preservation | bridge本文の温度感・距離感・counseling weightを変えない |
| App側吸収禁止 | preservation violation を P3/P4/P5 で後補正しない。P2へ差し戻す |

---

## 3. 工程概要（旧体系 P0-A〜P5）

**新規作業の標準工程は vNext 体系（PN1〜PN8）である。** 現行工程の全体像は
`docs/DEVELOPMENT_STANDARD.md` §4、実行手順は `prompts/vNext/HANDOFF.md` を参照する。
本節は旧体系の工程構成の記録であり、過去の作業記録を読む際の参照用である
（体系の選択基準は §10）。

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

### addonsRef の責務独立性
- Addonは本文（S/O/A/P）の付随物ではなく独立した責務を持つ。本文編集を理由に`addonsRef`を変更してはならない（RULES.md §22）
- 近似責務シナリオ間の`addonsRef`構成一貫性はPN7 check Zで監査する。責務の構造化方法自体は未確定（`docs/OPEN_DESIGN_QUESTIONS.md` Q-A1）

---

## 5. UI / 機能用語

| 用語 | 意味 | 注意 |
|---|---|---|
| **Rapid** | 右パネル簡易操作（S先頭文・状態ボタン） | NLP生成ではない。単剤フラグ（副作用なし/CP良好）は2026-07-25（P2-F1）にdead code整理済み |
| **ADDON** | S/A/P への追加文操作 | P closing の前に挿入。closing は最後に1回のみ残す |
| **Express** | 中央パネル高速薬剤選択フロー | |
| **NLP生成** | 自然言語入力 → シナリオ推定（将来機能） | 現在UI未接続 |
| **Persona** | **1 つの語で 3 つの別概念を指す**（下記参照） | 混同禁止。正本は `docs/PERSONA_PROJECT_PRINCIPLE.md`（Core） |
| **Structured** | SStructured/AStructured/PStructured | 全既存モジュールに存在するがruntime未接続 |
| **bridge原稿** | canonical build の正本となる指導文草稿 | |
| **Model JSON** | 新規モジュールの構造テンプレート | P0-A の latest_model_json |
| **canonical JSON** | data/modules/ に格納される完成済みJSON | |

### Persona の 3 概念（最小限の区別）

| 概念 | 実体 |
|---|---|
| ① bridge 本文そのものの文体 | PN1 の本文凍結と PN7 item I で保護される |
| ② Runtime 文体変換 | `lib/applyPersona.ts` / `lib/personaGuard.ts`。稼働中だが**最終仕様ではない** |
| ③ module JSON の `persona` フィールド | canonical field。Canonical Requirement は JS-A（全 module 必須） |

**②と③は別物である。** 用語定義の詳細は `docs/feature-glossary.md` §Persona を参照する。

> **Persona に関する設計判断・時間軸・判断規則の正本は `docs/PERSONA_PROJECT_PRINCIPLE.md`（Core）である。**
> 実測値・詳細な反証は `docs/PERSONA_PROJECT_APPENDIX.md`（Appendix）。
> **本ファイルは Core の内容を複製しない。** persona に関する判断が必要になったら Core を読むこと。

---

## 6. 役割分担（Claude / ChatGPT）

| 担当 | 作業内容 |
|---|---|
| **Claude** | ローカルコード確認・実装・ファイル保存・typecheck/build・実機確認 |
| **ChatGPT** | 設計レビュー・プロンプト監査・方針整理・文章化・Claude向け指示作成 |

---

## 7. トークン効率方針

優先順位の正本は `docs/DEVELOPMENT_STANDARD.md` §2 を参照。
本文はここでは重複保持しない。

工程数を減らしても読込トークンが増えるなら改善とみなさない。Claude トークン消費が過大な案は不採用候補。

---

## 8. Decision記録

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
- **体系の選択**: 新規モジュール追加・新規作業は **vNext 体系（PN1〜PN8）を標準**とする。
  旧体系（P0-A〜P5）は過去の作業記録を参照する場合にのみ用い、新規作業では使用しない。
  両体系は排他であり、同一作業内で混在させない
- 新規セッションの読込順序は `prompts/vNext/STARTUP_PROMPT.md` を正本とする
- Claude は添付不足を発見した場合、**「どのファイルが不足しているか」を最初に報告する**
- 添付依頼時は「何のために必要か」「修正対象か参照対象か」を必ず明示する
- ファイル参照は可能な限り **リポジトリ相対パス** で明示する

**よく使うパス（共通）**

```
prompts/PROJECT_CONTEXT.md
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

**vNext 体系パス（新規作業の標準）**

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

**旧体系パス（過去の作業記録を参照する場合のみ・新規作業では使用しない）**

```
prompts/P0-A.md  prompts/P0-B.md  prompts/P0-C.md  prompts/P0-D.md
prompts/P1.md    prompts/P2A.md   prompts/P2B.md
prompts/P3.md    prompts/P4.md    prompts/P5.md
```
