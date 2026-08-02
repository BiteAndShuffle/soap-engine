# 到達経路整備（OD-R4）— 実行記録

作成: 2026-08-02 ／ 基準 commit: `7698ba3`

---

## 0. 本記録の性格

本記録は**時点付きの実行記録**である。

| 項目 | 内容 |
|---|---|
| **正本ではない** | 読込経路の正本は `prompts/vNext/STARTUP_PROMPT.md`（OD-R4-5 で確定）。設計判断の正本は各正本文書 |
| **責務** | OD-R4 の確定事項と、R4-a / R4-b / R6-a に至る**手順・状態・commit 追跡**を記録する |
| **失効** | 記録した作業が完了した時点で、本記録は履歴となる。**本記録の失効は正本文書の有効性に影響しない** |
| **禁止** | 本記録に設計判断を新設しない。判断が必要な場合は Owner 判断を仰ぐ |

> **本記録の配置は `docs/reviews/` 直下である。** `docs/reviews/` の Documentation Map への登録・index 作成・層としての正式定義は **OD-R3 の対象であり、本作業では行わない。**

---

## 1. OD-R4 の確定事項

| ID | 確定内容 | 確定日 |
|---|---|---|
| **OD-R4-2** | Overlay は **① 工程段階 Overlay（PN1〜PN8 / AUTORUN）② 対象概念 Overlay** の 2 層構成とする。**作業種別・対象ファイルは Overlay の主分類にしない** | 2026-08-02 |
| **OD-R4-5** | 「何を読むか」を決める正本は **`prompts/vNext/STARTUP_PROMPT.md`** へ一本化する。`PROJECT_CONTEXT` は**現在地**、`DEVELOPMENT_STANDARD` §7 は**文書地図**とし、いずれも起動順序の正本にしない | 2026-08-02 |
| **OD-R4-1** | Base の最終構成と読込順序を次で確定する<br>1. `docs/DEVELOPMENT_STANDARD.md` — 全文<br>2. `prompts/PROJECT_CONTEXT.md` — 全文<br>3. `prompts/RULES.md` — **§1〜§3 のみ通読**（§4 以降は随時参照辞書） | 2026-08-02 |
| **OD-R4-1b** | `RULES.md` は暫定的に Base へ残すが、**通読範囲は §1〜§3 のみ**とする。**§4 以降の文書帰属や `JSON_STANDARD` との境界は OD-R2 が確定するまで変更しない。** これは読む範囲の指定であり、`RULES.md` の分割・移動・正本境界の変更ではない | 2026-08-02 |
| **OD-R4-6** | R4-a / R4-b を分離する。**ただし正本へ「Overlay 移行予定」「暫定残置」という一時的状態を記録する方式は採用しない。** R4-a では `STARTUP_PROMPT` の Base リストを変更せず、現行 STARTUP_PROMPT を有効なまま残すことで中間状態でも到達経路を失わない | 2026-08-02 |

### 1.1 OD-P11 との関係

`OD-P11`（Persona Core を `STARTUP_PROMPT` の必読リストへ**無条件追加**する）は、**OD-R4 により実装方式のみが置換済み**である。

| 層 | 内容 | 帰属 |
|---|---|---|
| 維持される要件 | Persona Core は、必要な作業から再現可能に到達できなければならない | Persona 責務（有効） |
| 置換された実装方式 | 無条件必読リストへの追加 | **OD-R4 により置換** |
| 移管先 | **本記録が追跡する R4-b の Persona Overlay** | Repository 全体トラック |

出典: `docs/reviews/persona/PERSONA_DOC_ALIGNMENT_2026-08-01.md` §6.1

---

## 2. 到達可能性と読込保証の区別

本作業は次の 2 概念を区別する。**混同しないこと。**

| 概念 | 定義 |
|---|---|
| **参照到達可能性** | ある文書を読んだ担当者が、リンクを辿れば目的の文書へ到達できる状態。**辿るかどうかは担当者の判断に依存する** |
| **読込保証経路** | 起動設計が「この条件ならこの文書を読む」と規定している状態。**担当者の判断に依存しない** |

〔実測・2026-08-02 / `7698ba3` 時点〕Persona Core は Base 文書 `PROJECT_CONTEXT` §5 および `DEVELOPMENT_STANDARD` §7 Map から**参照到達可能**であるが、**読込保証は存在しない**（`STARTUP_PROMPT` 内の `PERSONA_PROJECT` 出現は 0 件）。

**R4-b の Persona Overlay が供給するのは、新しいリンクではなく読込保証である。**

---

## 3. Unit R4-a — 起動経路の正本一本化

### 目的

読込経路の正本を `STARTUP_PROMPT` へ一本化し、他文書にある重複した起動手順を除去する。

### 変更対象と実施内容

| ファイル | 変更範囲 | 実施内容 |
|---|---|---|
| `prompts/PROJECT_CONTEXT.md` | ①「Claude Startup Procedure」節 ② §10 の起動手順記述 1 項目 | 節名を「**読込経路について**」へ変更し、詳細な読込順序を削除。`STARTUP_PROMPT` が読込経路の正本であること、本ファイルが現在地文書であることを明記。§10 の「本ファイルを最初に読む」を「読込順序は `STARTUP_PROMPT` を正本とする」へ最小置換 |
| `docs/DEVELOPMENT_STANDARD.md` | **§0 のみ** | 独自の読込階層図を削除。地図であるという既存の責務宣言を維持し、読込順序を本文書では定めない旨と `STARTUP_PROMPT` へのポインタを追加 |
| `prompts/vNext/STARTUP_PROMPT.md` | **変更しない** | 現行の Base 4 文書・PN1〜PN8 表・AUTORUN 条件をすべて維持（OD-R4-6） |

### 変更しないもの

`PROJECT_CONTEXT` の Current Phase 本文・開発思想・用語定義・体系選択方針・不足ファイルの報告規律・承認後に修正を開始する規律 ／ `DEVELOPMENT_STANDARD` §7 Documentation Map・§10 Lifecycle・その他の節。

### 中間状態が成立する根拠

| # | 根拠 |
|---|---|
| 1 | R4-a は「経路の正本がどこか」を宣言するのみで、**経路の内容を変えない** |
| 2 | 削除するのは重複記述であり、**唯一の記述ではない**（削除情報はすべて `STARTUP_PROMPT` または `PROJECT_CONTEXT` §10 に現存） |
| 3 | 両文書から `STARTUP_PROMPT` へのポインタが残り、**読める文書が 1 件も減らない** |
| 4 | 〔実測〕両箇所への外部参照は正本文書から 0 件。参照切れは発生しない |

### 状態

**R4-a 完了**（commit `0308fb9` `docs(context): consolidate startup path authority into STARTUP_PROMPT`）

| 項目 | 状態 |
|---|---|
| 2 文書の修正 | **完了** |
| 検証 | **完了**（下記・8 項目すべて PASS） |
| Commit 1 | **完了**（`0308fb9` ／ 2 files changed, 17 insertions(+), 26 deletions(-)） |

### 検証結果〔実測・2026-08-02〕

| # | 検証 | 結果 |
|---|---|---|
| 1 | 読込順序・必読文書一覧・工程遷移手順を**定義**する文書が `STARTUP_PROMPT` だけ | **PASS**（他 2 件のヒットは定義ではなく参照） |
| 2 | `PROJECT_CONTEXT` / `DEVELOPMENT_STANDARD` にポインタと自身の責務説明だけが残る | **PASS** |
| 3 | `PROJECT_CONTEXT` に「本ファイルを最初に読む」が残っていない | **PASS**（0 件） |
| 4 | `DEVELOPMENT_STANDARD` に独自の読込階層図が残っていない | **PASS** |
| 5 | `STARTUP_PROMPT` の diff | **0 件** |
| 6 | `DEVELOPMENT_STANDARD` の変更が §0 のみ | **PASS**（単一ハンク・§1 は範囲外） |
| 7 | `PROJECT_CONTEXT` の変更が起動手順節と §10 の該当 1 項目に限定 | **PASS**（ハンク 2 件） |
| 8 | 既存差分 4 件に変化なし | **PASS** |

差分規模: **2 files changed, 17 insertions(+), 26 deletions(-)**

---

## 4. Unit R4-b — Base + Overlay の完成形

`STARTUP_PROMPT` を **一度に** Base + Overlay の完成形へ変更する。

| # | 実施内容 |
|---|---|
| 1 | Base を 3 文書へ変更（`DEVELOPMENT_STANDARD` 全文 ／ `PROJECT_CONTEXT` 全文 ／ `RULES` §1〜§3）＋ 読込順序の明記 |
| 2 | `HANDOFF` を**工程段階 Overlay「vNext module 生成」**へ移す（PN1 より前に読む） |
| 3 | `VALIDATOR_STANDARD` を**対象概念 Overlay「Validator」**へ移す |
| 4 | **Persona Overlay** を追加する |
| 5 | **Lifecycle Overlay** を追加する |
| 6 | 複数 Overlay 該当時は**すべて読む** |
| 7 | 作業途中で Overlay 該当が判明した場合は、**その時点で追加読込し、それ以前の判断を再確認する** |
| 8 | Overlay 未該当時の既定動作を定める（Documentation Map を検索 → 停止条件 S1〜S3 を判定 → 続行時は Overlay 未該当で続行した旨を成果物へ明記） |

### Persona Overlay の読込条件

| 文書 | 読む条件 |
|---|---|
| `docs/PERSONA_PROJECT_PRINCIPLE.md`（Core） | 次のいずれかに該当するとき読む: ① Persona Project に関する判断を行う ② runtime persona に関する判断を行う ③ `module.persona` に関する判断を行う ④ 人格別固定文章、または人格別文体変換に関する判断を行う |
| `docs/PERSONA_PROJECT_APPENDIX.md`（Appendix） | **Persona Overlay が該当して Core を読む場合に限り**、さらに次の**いずれか**に該当するとき追加で読む: ① Core の判断根拠を確認する ② Repository 実測値・詳細反証・再測定手順を確認する ③ Core の結論を再評価する |

**Appendix は独立した対象概念 Overlay ではない。** 一般的な Repository 実測や再測定だけでは発火せず、**Persona Overlay の該当が必須条件**である。

**Persona Overlay の適用外**: bridge 本文・指導文の通常の文章表現や日本語校正は、Persona Project との関係を判断する作業でない限り対象外とする。**「文体」という語が現れたことだけを理由に発火させない。**

### 状態

**R4-b 完了**（commit `755a4ed` `docs(startup): restructure reading path into base and overlays`）

| 項目 | 状態 |
|---|---|
| `STARTUP_PROMPT` の再構成 | **完了**（113 行 → 172 行 ／ +133 / −40） |
| `DEVELOPMENT_STANDARD` §7 Map の `STARTUP_PROMPT` 行 | **完了**（1 行のみ。「vNext新規チャット起動プロンプトの正本」→「読込経路の正本」） |
| 検証 | **完了**（下記） |
| Commit 1 | **完了**（`755a4ed` ／ 2 files changed, 134 insertions(+), 41 deletions(-)） |

### 実施内容

| # | 内容 |
|---|---|
| 1 | **Base を 3 文書へ変更**（`DEVELOPMENT_STANDARD` 全文 ／ `PROJECT_CONTEXT` 全文 ／ `RULES` §1〜§3）＋ 読込順序と順序の根拠を明記 |
| 2 | **`HANDOFF` を工程段階 Overlay「vNext module 生成」へ**（PN1 より前に読む） |
| 3 | **`VALIDATOR_STANDARD` を対象概念 Overlay「Validator」へ**（4 条件。PN7 / PN8 実行を含める） |
| 4 | **Persona Overlay を追加**（Core ＋ Persona Appendix） |
| 5 | **Lifecycle Overlay を追加**（§10 全体を再読） |
| 6〜8 | **Overlay 運用規則を新設**（判定順序 ／ 複数該当時 ／ 途中判明時の追加読込と再確認 ／ 未該当時の既定動作 S1〜S3） |
| 9 | 文書スコープを vNext module 生成専用から**全作業の読込経路正本へ一般化**。責務表を新設し「各正本文書の本文を複製しない」を明記 |
| 10 | module 生成固有記述（対象bridge / 起動完了報告 / 重要事項）を**工程段階 Overlay「vNext module 生成」の起動情報**節へ集約（Base・対象概念 Overlay と別系統であることを明記） |

### 検証結果〔実測・2026-08-02〕

| # | 検証 | 結果 |
|---|---|---|
| 1 | Base が 3 文書＋順序で記述 | **PASS** |
| 2 | `RULES` の読む範囲が §1〜§3 と明記 | **PASS**（§4 以降は随時参照と併記） |
| 3 | `HANDOFF` が工程段階 Overlay に PN1 より前として記載 | **PASS** |
| 4 | `VALIDATOR_STANDARD` が対象概念 Overlay に 4 条件付きで記載 | **PASS**（PN7 / PN8 を含む） |
| 5 | Persona Overlay と Persona Appendix が分離記述 | **PASS**（Appendix は Core 読込が前提） |
| 6 | Lifecycle Overlay が存在 | **PASS** |
| 7 | Overlay 運用 4 規則が記載 | **PASS** |
| 8 | PN1〜PN8 表・AUTORUN の内容が失われていない | **PASS**（PN 開始 8 行 ／ 10 ファイルすべて記載 ／ AUTORUN 2 件 ／ 実行モード 2 文） |
| 9 | module 生成固有記述が失われていない | **PASS**（対象bridge / 確認項目 7 種 / `PN○開始準備完了` / 重要事項 7 項目） |
| 10 | 参照先がすべて実在 | **PASS**（`scripts/audit-*.ts` 2 件を含めリンク切れ 0） |
| 11 | 変更が 2 ファイルに限定 | **PASS** |
| 12 | **Persona Core への読込保証が成立** | **PASS**（`STARTUP_PROMPT` 内の `PERSONA_PROJECT` 出現が **0 件 → 2 件**） |
| 13 | 既存差分 4 件に変化なし | **PASS** |

> **OD-P11 の「維持される要件」（Persona Core が必要な作業から再現可能に到達できること）が、読込保証として成立した。**

---

## 5. R6-a — STARTUP_PROMPT への変更契機適用（未着手）

R4-a / R4-b 完了後、**`STARTUP_PROMPT` を OD-R6（変更契機の標準化）の最初の適用事例とする。**

| 項目 | 内容 |
|---|---|
| 対象 | `prompts/vNext/STARTUP_PROMPT.md` |
| 起点となる変更 | Overlay の追加・削除 ／ Base 構成の変更 ／ トリガー条件の変更 |
| **R4 由来の必須項目** | **OD-R2 が確定した時点で `RULES` の読込範囲（§1〜§3）を再判断する**（OD-R4-1b の帰結） |

### 状態

**未着手。** OD-R6 の下位設計（適用対象・記法・配置先）は未確定であり、本記録では確定させない。

---

## 6. 引き継ぎ事項

| # | 事項 | 状態 |
|---|---|---|
| 1 | 〔実測〕`prompts/RULES.md` L5「`STARTUP_PROMPT.md` の**必読ファイル 3 番目**に指定されています」— 新 Base でも 3 番目だが、**読む範囲が §1〜§3 に限定される点が未反映** | **R4-b の対象外と判定。** 記述は真のまま（不完全だが誤りではない）。`RULES` は OD-R6-1 の適用対象「要」であり **R6-b で扱う** |
| 2 | 〔実測〕`docs/PERSONA_PROJECT_APPENDIX.md` L342「起動時必読 **4 文書**は次である」＋ 4 文書の列挙 | **変更不要と判定。** Appendix の凡例が〔実測〕を「本文書作成時（HEAD `21c9b6d`）に測定した事実」と定義しており、**時点付き実測として正しい**。§7.6 に再測定手順が存在する |
| 3 | 〔実測〕`docs/DEVELOPMENT_STANDARD.md` §7 Map の `STARTUP_PROMPT` 行「vNext新規チャット起動プロンプトの正本（コピペ用）」 | **R4-b で解消**（commit `755a4ed`。当該 1 行のみを「読込経路の正本」へ更新） |
| 4 | `prompts/PROJECT_CONTEXT.md` L34（下記 Deferred Items） | **解消済み**（commit `e7c57ec`。下記） |

### Deferred Items

- `prompts/PROJECT_CONTEXT.md` L34
  - 「最初に読む入口文書」という表現が残っていることを確認。
  - R4-a の変更範囲外のため未変更。
  - R4-b において STARTUP_PROMPT への読込経路一本化完了後に再評価する。

**状態（2026-08-02）: 解消済み**（commit `e7c57ec` `docs(context): remove residual startup order wording`）

R4-b（commit `755a4ed`）で読込経路の一本化が完了し、再評価の前提条件が充足したため補正を実施した。`prompts/PROJECT_CONTEXT.md` の「設計ドキュメント」表内、`docs/DEVELOPMENT_STANDARD.md` の説明セル **1 行のみ**を変更した。

| | 内容 |
|---|---|
| 変更前 | 「プロジェクト全体構造の索引（**最初に読む入口文書**）。Mission / Core Philosophy / Architecture / Development Workflow / 正本関係 / Documentation Map を一枚で把握する」 |
| 変更後 | 「プロジェクト全体構造・正本関係・Documentation Map・運営規則を示す索引文書。Mission / Core Philosophy / Architecture / Development Workflow を一枚で把握する」 |

読込順序の表現を除去し、`DEVELOPMENT_STANDARD.md` 自身の責務のみを記述した。**新しい読込順序や Base の説明を `PROJECT_CONTEXT` 側へ追加していない。** 〔実測〕補正後、`prompts/PROJECT_CONTEXT.md` に「最初に読む」の出現は **0 件**。

**上記 3 バレットは履歴として維持する。**

---

## 7. 本作業の対象外

| 事項 | 扱い |
|---|---|
| `docs/reviews/` の Documentation Map 登録・index 作成・層としての正式定義 | **OD-R3 の対象。本作業では行わない** |
| `RULES` §4 以降の文書帰属・`JSON_STANDARD` との境界 | **OD-R2 の対象。本作業では変更しない**（OD-R4-1b） |
| 旧体系の Legacy 化 | **OD-R5 の対象** |
| 3 層分割の適用基準 | **OD-R7 の対象** |
| canonical 値集合の正本レイヤー | **OD-R8 の対象** |
| OD-R6 の下位設計（適用対象・記法・配置先） | **未確定。R4-a / R4-b 完了後に着手** |

---

## 8. 作業状態（2026-08-02 時点 / R4-a 実施時）

| 項目 | 状態 |
|---|---|
| OD-R4-1 / -1b / -2 / -5 / -6 | **確定**（§1） |
| OD-R4-3（トリガー記法）/ OD-R4-4（未該当時の既定動作） | **設計案あり・Owner 未確定**（R4-b で確定させる） |
| **R4-a**（起動経路の正本一本化） | **完了**（commit `0308fb9` / 記録 `5607fdf`） |
| **R4-b**（Base + Overlay 完成形） | **完了**（主 commit `755a4ed` ／ 補正 commit `e7c57ec`（Deferred Item の解消）） |
| **R6-a**（STARTUP_PROMPT への変更契機適用） | **未着手** |
| push | **未実施** |

### commit 分割

| Unit | # | commit | message | 対象 | 状態 |
|---|---|---|---|---|---|
| R4-a | 1 | **`0308fb9`** | `docs(context): consolidate startup path authority into STARTUP_PROMPT` | `prompts/PROJECT_CONTEXT.md` ／ `docs/DEVELOPMENT_STANDARD.md` | **完了**（+17 / −26） |
| R4-a | 2 | **`5607fdf`** | `docs(review): record R4-a startup path consolidation` | 本記録 | **完了**（+208） |
| R4-b | 1 | **`755a4ed`** | `docs(startup): restructure reading path into base and overlays` | `prompts/vNext/STARTUP_PROMPT.md` ／ `docs/DEVELOPMENT_STANDARD.md` §7 の 1 行 | **完了**（+134 / −41） |
| R4-b | 補正 | **`e7c57ec`** | `docs(context): remove residual startup order wording` | `prompts/PROJECT_CONTEXT.md`（設計ドキュメント表の 1 行） | **完了**（+1 / −1。Deferred Item の解消） |
| R4-b | 2 | — | `docs(review): record R4-b overlay implementation` | 本記録 | 実施中 |

**正本文書の変更と実行記録は別 commit とする。**
