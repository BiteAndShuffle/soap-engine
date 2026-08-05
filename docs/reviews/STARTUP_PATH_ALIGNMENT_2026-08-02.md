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

## 5. R6-a — 変更契機の標準仕様と最初の適用

R4-a / R4-b 完了後、**変更契機（Change Trigger）の標準仕様を制定し、`STARTUP_PROMPT` をその最初の適用事例とした。**

### 5.1 3 段階構成と責務分離

**本 Unit は「標準仕様」「適用例」「実行記録」を 3 つの commit へ分離した。3 者を混在させない。**

| # | 責務 | commit | message | 対象 | 内容 | 状態 |
|---|---|---|---|---|---|---|
| **1** | **標準仕様の制定**<br>（Repository 全体に適用される規則） | **`76a5f40`** | `docs(standard): define change trigger specification` | `docs/DEVELOPMENT_STANDARD.md` | **§11「変更契機（Change Trigger）」を新設** | **完了**（1 file changed, 135 insertions(+)） |
| **2** | **最初の適用例**<br>（§11 を 1 文書へ適用） | **`8edb3fa`** | `docs(startup): apply change trigger to reading path authority` | `prompts/vNext/STARTUP_PROMPT.md` | **変更契機節の新設** | **完了**（1 file changed, 48 insertions(+)） |
| **3** | **実行記録**<br>（状態・実施結果・commit 追跡のみ） | **本実行記録を確定する commit** | `docs(review): record R6-a change trigger standard` | 本記録 | **正本文書・標準仕様・適用例を変更せず、状態・実施結果・commit 追跡のみを記録する** | **本 commit で完了** |

> **Commit 3 は自身の hash を本文へ記録しない。** git commit は自分自身の確定 hash を同じ commit の内容へ含められず、hash 反映専用の追加 commit を作れば、その commit 自身の hash が再び記録できず自己言及が連鎖する。**Commit 3 の同定は commit message（`docs(review): record R6-a change trigger standard`）による。**

| commit | 何をしたか | 何をしていないか |
|---|---|---|
| **1（標準仕様）** | 変更契機が満たすべき**条件と配置規則**を Repository 全体の運営規則として定めた | 個別文書への適用はしていない。適用対象の選定もしていない |
| **2（適用例）** | 標準仕様に従い、`STARTUP_PROMPT` の**自身の起点と更新対象**を記述した | 標準仕様の内容を複製していない（§11 を参照するのみ）。Base / Overlay 本文を変更していない |
| **3（実行記録）** | 状態・実施結果・commit を追跡する | **設計判断を新設しない。正本文書・実装・テストに触れない** |

### 5.2 実施結果 — Owner Decision の反映

| OD | 反映内容 | 所在 |
|---|---|---|
| **OD-R6-2** | **変更元にのみ記載**する／**対象文書の冒頭付近に「変更契機」節を置く**。本規則は配置に関する条件であり記法ではない（見出しレベル・表の有無・レイアウト・Markdown 記法は自由） | §11.2「配置規則」 |
| **OD-R6-3** | **節単位を原則**とする。同期が特定の規則 ID に閉じる場合のみ**規則 ID 単位を例外**として認める（`prompts/RULES.md` §26 が実例） | §11.3 |
| **OD-R6-4** | **必須 2 要素**（起点／更新対象）＋**任意 4 要素**（対象外／検証／停止条件／採用理由）。**「確認のみ」は不採用**。**「条件付きで更新」は独立分類にせず、更新対象の行内条件へ統合** | §11.4 |
| **OD-R6-7** | 標準仕様は **`docs/DEVELOPMENT_STANDARD.md` §11**。**固定書式・記入手順・特定文書用テンプレートを持たない**。**`CHANGE_TRIGGER_STANDARD.md` は作成していない** | §11 前文 |

| 節 | 反映内容 |
|---|---|
| **§11.6** | **変更契機節がないことだけを理由に「追随不要」と判断しない。** 言えるのは「宣言済みの変更契機が存在しない」という事実のみであり、適用対象外か未適用かは適用対象判定に従う。**判定基準そのものは §11 では定めない**（OD-R6-1 非先取り） |
| **§11.7** | **必須要素**を変更した場合 → 変更契機節を持つ**全文書**を確認。**任意要素**を変更した場合 → **その任意要素を採用している文書だけ**を確認。**未採用文書へ空欄・形式的記述を追加してはならない** |

### 5.3 実施結果 — `STARTUP_PROMPT` への適用（Commit 2）

| 項目 | 内容 |
|---|---|
| **配置** | 「本ファイルの責務」の直後・「Design Principles」の前・**テンプレート本文（貼り付け範囲）の外** |
| **必須 2 要素** | 起点（5 項目）／更新対象（3 項目） |
| **任意 4 要素** | 対象外／検証／停止条件／採用理由 |
| **`PROJECT_CONTEXT` / `DEVELOPMENT_STANDARD` §0** | **対象外ではなく、行内条件付きの更新対象**。本ファイルの**パス・名称・「読込経路の正本」という責務**を変更した場合のみ追随する。**Base / Overlay の構成やトリガー内容だけの変更では追随しない** |
| **OD-R2 確定時の再判断** | **停止条件へ統合**（独立要素として第 7 要素を作らない）。「境界が確定し、`RULES` の読込範囲を再判断する段階に到達した → 自己判断で変更せず、Owner 判断を得る」 |
| **Base / Overlay 本文** | **変更していない** |

### 5.4 検証結果〔実測・2026-08-02〕

| # | 検証 | 結果 |
|---|---|---|
| 1 | `DEVELOPMENT_STANDARD` **§0〜§10 は不変** | **PASS**（Commit 1 の削除行 0 件／単一ハンクが §10.5 末尾以降に限定） |
| 2 | `STARTUP_PROMPT` の**テンプレート本文以下は不変** | **PASS**（Commit 2 の削除行 0 件／ハンクがテンプレート本文見出しより前に限定。■ 要素 8 件・PN 開始行 8 件がすべて保全） |
| 3 | **「確認のみ」0 件** | **PASS**（`STARTUP_PROMPT` 0 件。`DEVELOPMENT_STANDARD` の 1 件は §11.4 の「用いない」という禁止記述） |
| 4 | **「条件付きで更新」という独立分類 0 件** | **PASS**（両ファイルとも 0 件。行内条件として記述） |
| 5 | §11 が**固定テンプレート・記入手順を持たない** | **PASS**（§11 内のコードブロック 0 件。表 5 つはすべて条件表） |
| 6 | Commit 1 / Commit 2 の**参照先と hash が実在** | **PASS**（`76a5f40` / `8edb3fa` を `git log` で確認。参照先 `§11` / `§7` / `RULES` §26 / `VALIDATOR_STANDARD` §2・§5 も実在） |
| 7 | **既存差分 4 件は不変** | **PASS** |

### 5.5 R6-a で行わなかったこと

| 事項 | 理由 |
|---|---|
| 適用対象の選定・他文書への展開（**OD-R6-1**） | **R6-b の判断**。§11.6 は「適用対象判定に従う」と参照するのみで基準を定めない |
| enforcement（checklist ／ audit スクリプト ／ CI）（**OD-R6-5**） | **R6-c**。§11 は書くべき条件のみを定め、守らせる仕組みに触れない |
| DP-11 ⇔ `RULES` §26 の重複解消（**OD-R6-6**） | **R6-b**。両文書とも差分 0 件 |
| `CHANGE_TRIGGER_STANDARD.md` の作成 | OD-R6-7 により現時点では作成しない。R6-b で共通テンプレートの必要性が実測された場合にのみ再検討 |

### 5.6 R6-b へ残る事項（未着手）

| # | 事項 |
|---|---|
| 1 | **OD-R6-1**: 適用対象の選定・展開 |
| 2 | **OD-R6-6**: DP-11 と `RULES` §26 の重複解消 |
| 3 | `RULES` §26 の標準仕様への追随判断（現状のままでも規則としては有効） |
| 4 | 〔実測〕`RULES` L5「必読ファイル 3 番目」の読込範囲追随（→ §6 引き継ぎ #1） |
| 5 | 他文書への変更契機展開 |

**R6-c（enforcement）にも着手していない。**

### 5.7 R6-b-3 実施時に検出した Deferred Item

- `docs/VALIDATOR_STANDARD.md` §3
  - 見出し・本文に「check 1〜34」「全37 check」という件数表現が存在する。
  - Appendix の errorCode 一覧は実装と双方向照合し、46件で一致している（R6-b-3 検証時に実測）。
  - check数とerrorCode数が同一概念かは未確認であるため、自己判断で数値を変更しない。
  - R6-b後続またはR6-cで、checkの定義・算出方法・変更元を実測して扱いを判断する。

---

## 5A. R6-b-4 — Domain Completion 証拠構造の反映と HANDOFF 情報構造整理

**本節は Owner Decision を保存しない。** Decision の正本は Norm 側（`docs/DEVELOPMENT_STANDARD.md`
§8）および Owner の判断そのものであり、本節が記録するのは**それを Repository へどう反映したか**
という実施結果・状態・検証結果・commit である。

### 5A.1 前提とした Owner Decision

| ID | 内容 |
|---|---|
| **Decision A** | Domain Complete の成立には、機械的・人的条件の充足に加えて **Owner による明示的な完了宣言を必須**とする |
| **Decision B** | 糖尿病領域の過去の Domain Complete 判定は**取り消さない**。当時の PN7・Runtime / 実機横断確認・Owner 承認の**実施記録が Repository 内に存在しない事実は明示する**。これは「未完了」「撤回」「PENDING」のいずれも意味せず、証拠記録要件の成立以前に行われた作業について記録の不在を事実として公告するもの |

Scope は構造整理に限定した（下記 5A.5 の Deferred Item を参照）。

### 5A.2 実施結果

| Sub Unit | 対象 | 実施内容 | 状態 |
|---|---|---|---|
| **R6-b-4-1** | `docs/DEVELOPMENT_STANDARD.md` §8 | Norm と個別判定結果の分離 ／ Domain Scope の決定方法（`categoryPath[0]`）明示 ／ PN7・PN8 をモジュール単位条件へ、Runtime / 実機横断確認を領域単位条件へ整理 ／ bridge STATUS を先行証拠から除外 ／ `HANDOFF` 一覧への citation 除去 | **完了** |
| **R6-b-4-2** | 同 §7 Documentation Map | `HANDOFF` の責務記述から「完了済みモジュール一覧」を除去（1 行） | **完了** |
| **R6-b-4-3** | `prompts/vNext/HANDOFF.md` §1・§4・§6 | 実装から機械取得できる Fact（一覧・件数・登録状態・検証状態・由来・group 使用件数）を除去し、正本ポインタへ置換 | **完了** |
| **R6-b-4-4** | 同ファイル冒頭 | 変更契機を適用（§11.2 の配置規則に従い冒頭付近へ配置） | **完了** |

### 5A.3 Decision A / B の反映結果

| Decision | 反映先 | 反映内容 |
|---|---|---|
| **A** | `DEVELOPMENT_STANDARD` §8 | 成立条件の系列へ「Owner による完了宣言」を追加した。あわせて、領域単位の条件は再実行によって過去の実施を復元できず記録と承認以外に証拠を持ちえないという理由を併記した |
| **B** | 同 §8 | 糖尿病領域の判定を**維持**したうえで、PN7・Runtime / 実機横断確認・Owner 承認の実施記録が Repository 内に存在しない事実を記載した。**「未完了」「撤回」「PENDING」のいずれも意味しない旨を同じ箇所に明記**し、証拠記録要件の成立以前の作業についての公告であることを示した |

### 5A.4 検証結果〔実測・2026-08-03〕

| # | 検証 | 結果 |
|---|---|---|
| 1 | §8 内の `HANDOFF` citation | **0 件** |
| 2 | §8 の成立条件から `bridge STATUS: JSON_COMPLETE` が除去 | **0 件** |
| 3 | §8 に「Owner による完了宣言」が存在 | **PASS** |
| 4 | §8 に Domain Scope の決定方法（`categoryPath[0]`）が存在 | **PASS** |
| 5 | Decision B の 3 つの否定が §8 に明記 | **PASS** |
| 6 | §7 の `HANDOFF` 行から「完了済みモジュール一覧」除去 | **PASS**（変更は 1 行のみ） |
| 7 | `DEVELOPMENT_STANDARD` の差分が §7 の 1 行と §8 の範囲に限定 | **PASS**（§0〜§6・§9〜§11 差分 0） |
| 8 | `HANDOFF` 内のモジュール一覧表 | **0 件** |
| 9 | `HANDOFF` 内の現在値としての件数 | **0 件**（唯一のヒットは変更契機「採用理由」内の drift 記録であり、現在値の複製ではない） |
| 10 | `HANDOFF` の §2・§3・§5 の差分 | **0 件** |
| 11 | 「確認のみ」／「条件付きで更新」という独立分類 | **0 件**（§11.4） |
| 12 | 参照先パスの実在 | **PASS**（`data/modules/index.ts` ／ `VALIDATOR_STANDARD` Appendix B ／ `RULES` §6・§17・§24 ／ `AUTORUN.md` ／ `feature-glossary.md` ／ DP-11 ／ `lib/types.ts`） |
| 13 | **Domain Scope の再現性** | **PASS**。§8 の決定方法で糖尿病領域が **26 件**として導出される（基準値と一致） |
| 14 | コード・テスト・module・bridge の差分 | **0 件** |
| 15 | `npx tsc --noEmit` | **exit 0** |
| 16 | `npm run audit` | **35 件・両監査とも全モジュール PASS** |
| 17 | 既存差分 4 件 | **不変** |

〔実測〕除去した Fact のうち `HANDOFF` §6 の group 使用件数は、記載値
（`lifestyle_guidance` 8 モジュール・26 件 ／ `administration_guidance` 3 モジュール・11 件）に対し
実測が **5 モジュール・20 件 ／ 1 モジュール・4 件**であり、**除去は構造整理であると同時に
drift 是正でもあった**。

### 5A.5 R6-b-4 で扱わなかった事項（Deferred Item）

| # | 事項 |
|---|---|
| 1 | **`RELEASE_OK_WITH_MONITOR` の最終的な位置付け** —— 旧体系（`docs/P5_STANDARD.md` P5S-04 ／ `prompts/P5.md`）は monitor 定義・rollback 方針の完了を成立要件とする成功判定と規定。vNext `PN8` はトークンのみ継承し要件を継承していない。実使用記録は Repository 内に 0 件。§8 では `RELEASE_OK` のみを扱った |
| 2 | **モジュール単位条件の正式な概念名** —— 「Module Release」は Repository 内の出現 0 件の語であり、新設すると PN7 / PN8 と責務が重複する。§8 では条件充足の記述にとどめた |
| 3 | **`NOT_CHECKED` の適用範囲注記** —— `prompts/RULES.md` §3 が名指しする `BUILD_OK` / `STRUCTURE_OK` / `RUNTIME_OK` は旧体系専用（vNext での出現 0 件）であり、当該規則は vNext を対象にしていない。矛盾ではなく適用対象違いだが、Base 文書が旧体系語義の `NOT_CHECKED` 規則を毎回供給する状態が残る |
| 4 | **`prompts/RULES.md` §6 CHECK-G02 詳細表の件数 drift** —— 同表は `administration_guidance` 3 件・`lifestyle_guidance` 8 件と記載するが、実測は **1 件・5 件**。`RULES.md` は R6-b-4 の対象外のため変更していない |
| 5 | **`prompts/vNext/HANDOFF.md` L8 の自己申告** —— 「この文書は…これ1本だけを読んで…開発を再開できるよう書かれています」という記述が、読込経路の正本（`prompts/vNext/STARTUP_PROMPT.md`）と整合しない。**Execution Plan の対象節に含まれないため変更していない** |
| 6 | **`docs/VALIDATOR_STANDARD.md` §3 の check 件数表現**（§5.7 の継続） |
| 7 | **bridge STATUS の将来設計** —— 独立 Unit（Owner 方向性で確定済み。本 Unit では触れていない） |

### 5A.6 commit

| # | commit | message | 対象 | 状態 |
|---|---|---|---|---|
| 1 | **`b0c1a58`** | `docs(standard): restructure domain completion into norm and evidence` | `docs/DEVELOPMENT_STANDARD.md`（§8 ＋ §7 の 1 行） | **完了**（+40 / −9） |
| 2 | **`b094ef5`** | `docs(handoff): replace tracked inventories with authority pointers` | `prompts/vNext/HANDOFF.md` | **完了**（+70 / −39） |
| 3 | 本記録を確定する commit | `docs(review): record R6-b-4 domain completion restructure` | 本記録 | **本 commit で完了** |

commit 1 → 2 の順序は固定である。逆順では、`HANDOFF` から一覧が消えた時点で §8 の citation が
参照切れになる。採用した順序では、commit 1 完了時点で §7 が「`HANDOFF` は完了済みモジュール
一覧を持たない」と述べる一方 `HANDOFF` にはまだ一覧が残るが、**参照切れも到達不能も発生しない**。

**正本文書の変更と実行記録は別 commit とする。**

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
| **R6-a**（変更契機の標準仕様と最初の適用） | **完了**（標準仕様 `76a5f40` ／ 適用例 `8edb3fa` ／ 実行記録は本 commit で完了）。実施内容は §5 |
| **R6-b**（適用対象の選定・他文書への展開） | **未着手**（§5.6） |
| **R6-c**（enforcement） | **未着手** |
| push | **未実施** |

### commit 分割

| Unit | # | commit | message | 対象 | 状態 |
|---|---|---|---|---|---|
| R4-a | 1 | **`0308fb9`** | `docs(context): consolidate startup path authority into STARTUP_PROMPT` | `prompts/PROJECT_CONTEXT.md` ／ `docs/DEVELOPMENT_STANDARD.md` | **完了**（+17 / −26） |
| R4-a | 2 | **`5607fdf`** | `docs(review): record R4-a startup path consolidation` | 本記録 | **完了**（+208） |
| R4-b | 1 | **`755a4ed`** | `docs(startup): restructure reading path into base and overlays` | `prompts/vNext/STARTUP_PROMPT.md` ／ `docs/DEVELOPMENT_STANDARD.md` §7 の 1 行 | **完了**（+134 / −41） |
| R4-b | 補正 | **`e7c57ec`** | `docs(context): remove residual startup order wording` | `prompts/PROJECT_CONTEXT.md`（設計ドキュメント表の 1 行） | **完了**（+1 / −1。Deferred Item の解消） |
| R4-b | 2 | **`182e53c`** | `docs(review): record R4-b overlay implementation` | 本記録 | **完了**（+77 / −17） |
| **R6-a** | **1** | **`76a5f40`** | `docs(standard): define change trigger specification` | `docs/DEVELOPMENT_STANDARD.md` §11 新設 | **完了**（+135） |
| **R6-a** | **2** | **`8edb3fa`** | `docs(startup): apply change trigger to reading path authority` | `prompts/vNext/STARTUP_PROMPT.md` 変更契機節 | **完了**（+48） |
| **R6-a** | **3** | **本実行記録を確定する commit** | `docs(review): record R6-a change trigger standard` | 本記録（正本文書・標準仕様・適用例を変更せず、状態・実施結果・commit 追跡のみを記録） | **本 commit で完了** |

**正本文書の変更と実行記録は別 commit とする。** R6-a はさらに**標準仕様（Commit 1）と適用例（Commit 2）を分離**する（§5.1）。
