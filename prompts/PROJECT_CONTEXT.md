# SOAPエンジン PROJECT_CONTEXT

> **Version:** 1.4
> **Last Updated:** 2026-06-19
> **Current Focus:** Phase 3 trailing copy低リスク整理完了。次フェーズ選定中。

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

## Claude Startup Procedure

新規チャット・セッション再起動時の手順：

1. `prompts/PROJECT_CONTEXT.md`（本ファイル）を確認する
2. **Current Phase** を確認し、今何をしているか・何をまだしないかを把握する
3. 作業に必要なプロンプトファイル（`prompts/P0-A.md` 等）を確認する
4. 不足しているファイル・添付があれば **最初に報告する**（推測で進まない）
5. 作業計画を提示し、**承認を得てから** 修正・保存を開始する

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
| 完了 | expressModes 必須5フィールド検出（`EXPRESS_MODE_MISSING_FIELD`） |
| 完了 | expressModes 参照切れ検出（`EXPRESS_MODE_REF_BROKEN`） |

**Phase 3: trailing copy低リスク整理 — 完了**

| 状態 | 内容 |
|---|---|
| 完了 | P3 SEARCH_TOKEN_VALIDATION_RULE 内の drug.nameAliases一致検証重複を削除 |
| 完了 | drug.nameAliases一致検証の check_name 記録先を BRAND_ALIAS_VALIDATION_RULE 側へ移動 |
| 完了 | P2B / P3 / P4 の expressModes field list を P0-A参照化（build / validation / runtime 固有ロジックは保持） |

**次フェーズ候補**（優先順位未確定）

- addons.orderPresets / drug.nameAliases / search token のさらなる参照化（trailing copy 中リスク分）
- STANDARD_REFERENCE_PATHS共通化（P0-C整備が前提）
- P0-B / P1統合
- genericBrandName参照先確定（P0-A未確定・CHECK）

**次フェーズでまだ実施しないこと** → セクション9参照

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
| expressModes 必須5フィールド欠落 | `EXPRESS_MODE_MISSING_FIELD` | ERROR | 完了 |
| expressModes 参照切れ | `EXPRESS_MODE_REF_BROKEN` | ERROR | 完了 |

実装しなかったもの（次フェーズ以降）: commonSearchTokens検証 / types.ts修正 / schemaGeneration / StructuredEntry / P0-E

### Phase 3: trailing copy低リスク整理

| 対象 | 変更ファイル | 状態 |
|---|---|---|
| P3 drug.nameAliases一致検証 重複削除 | prompts/P3.md | 完了 |
| drug.nameAliases check_name 記録先移動 | prompts/P3.md | 完了 |
| expressModes field list P0-A参照化 | prompts/P2B.md / P3.md / P4.md | 完了 |

変更しなかったもの（次フェーズ以降）: addons.orderPresets / drug.nameAliases / search token 参照化 / STANDARD_REFERENCE_PATHS共通化 / P0-B+P1統合 / commonSearchTokens / types.ts / schemaGeneration / StructuredEntry / P0-E

---

## 9. 次フェーズでまだ実施しないこと（暫定）

- P1削除・P0-B+P1統合（候補のみ）
- STANDARD_REFERENCE_PATHS共通化（P0-C整備が前提）
- P0-E新設
- schemaGeneration必須化・JSON追加
- lib/types.ts 修正（StructuredEntry型追加・commonSearchTokens追加等）
- commonSearchTokens検証（types.ts に DrugSearch 未定義のためブロック中）
- addons.orderPresets / drug.nameAliases / search token 参照化（中リスク・P0-A対応セクション確認が前提）
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

lib/types.ts           lib/moduleValidator.ts
lib/search.ts          lib/buildSoap.ts

data/modules/index.ts
data/modules/{moduleId}.json
```
