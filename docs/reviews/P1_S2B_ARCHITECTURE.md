# Stage 2-B Architecture

**版**: v1.2 ／ **Status**: **FROZEN**
**作成日**: 2026-07-29
**所属**: Phase 1 Architecture Consolidation / Stage 2
**先行ユニット**: S2-CHECK-1（判定 PASS WITH FINDINGS、記録 commit `62eb75e`）
**本書の性格**: Stage 2-B の責務境界を固定する設計文書。実装指示書ではない。
**永続化先**: `docs/reviews/P1_S2B_ARCHITECTURE.md`（本ファイル）

### 本ファイルの状態区分（混同禁止）

| 対象 | 状態 |
|---|---|
| **Architecture 内容** | **凍結済み**（v1.2 / FROZEN。以降は Owner 指示なしに変更しない） |
| **Owner 承認** | **取得済み** |
| **Repository 永続化** | 本 commit により実施 |
| **Architecture Freeze Commit** | 本 commit がそれに該当する |

`Status: FROZEN` は **Architecture 内容の凍結**を意味する。

---

## 0. 本書における記述区分

本書の各記述は次の 2 区分のいずれかである。両者を混在させない。

| 区分 | 意味 | 表記 |
|---|---|---|
| **【FACT】** | Repository 内の確定済みファイルから確認できる事実。典拠を併記する | 出典パスを明記 |
| **【定義】** | Repository 内に正本が存在せず、Phase 1 Architecture Consolidation の運営計画として本書が新規に定義する事項 | 対応する不明点 ID（U-1〜U-10）を併記 |

**前提**【FACT】: Repository Survey により、Repository 内に Stage 2-B の Purpose / Scope / Inputs / Outputs / STOP / Commit Boundary を定義する正本が存在しないことが確認されている（U-1）。「Stage 2-B」の文字列は `docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` 408 行の 1 箇所のみに出現する。したがって本書 §1〜§13 の骨格は【定義】であり、その入力と制約条件のみが【FACT】に基づく。

**参照表記の規則**【定義】:
- 本ユニットの成果物は **`S2B-D1`** / **`S2B-D2`** と表記する
- 先行ユニットの確定記録は「**S2-CHECK-1記録**」または「**`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md`**」と表記し、単に「D-1」とは書かない

---

## 1. Purpose

【定義・U-1 / U-8】

**S2-CHECK-1 が記録した非 MATCH Finding 14 件について、「取り扱い方針（Disposition）」「優先順位（Priority）」「判断根拠（Basis）」を確定させ、以降の実施ユニットが着手可能な状態にすること。**

本 Purpose は、次の【FACT】から導出した責務の受け皿である。

> 【FACT】`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §8「Findings の取り扱い」（405〜408 行）:
> 「本ユニットは読み取り専用の調査であり、記録された 14 件の非 MATCH Finding に対する**修正・方針決定・優先順位付けは行わない**。取り扱いは S2-CHECK-1（Architecture）設計 v1.2 §8.2 に従い、Stage 2-B 以降の別ユニットの入力とする。」

引き渡された 3 つの未実施事項のうち、**Stage 2-B は「方針決定」と「優先順位付け」の 2 つを担当する**。「修正」そのものは担当しない【定義・U-4 / U-8】。

**Purpose に含めないこと**:
- Finding の修正実施（コード・文書・データ・bridge のいずれも）
- 修正手順・実装方法の設計
- Stage 2-C / OD-1 の責務定義（U-6）
- S2-CHECK-1記録が確定させた Finding の事実内容そのものの再判定

---

## 2. Scope

### 2.1 In Scope

| ID | 対象 | 内容 |
|---|---|---|
| **S1** | 非 MATCH Finding **14 件全件**（AC-003〜AC-016） | 1 件も除外せず、全件に少なくとも Disposition を付与する |
| **S2** | 各 Finding の現況再確認 | Source Baseline から Execution Baseline までの間に対象箇所が変化していないかの機械的確認、およびその証跡の記録 |
| **S3** | 既存台帳との重複確認 | 既存台帳に同一 Finding が既出かの**明示的一致の存在確認と参照先の記録のみ** |
| **S4** | Disposition の付与 | §7 の固定 5 値から 1 つを選択 |
| **S5** | Priority の付与 | Disposition = `FIX` の Finding に限り、§7 の固定 3 値から 1 つを選択 |
| **S6** | Basis の記録 | 各 Disposition を支える確定規則・確定文書と、その規則のどの部分が判断を支えるかを短く記録 |

#### S1（全件対象）の位置づけ

事実と定義を分離して記載する。

> **【FACT】** `docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §8 は、非 MATCH Finding **14 件を一括して**「Stage 2-B 以降の別ユニットの入力」とした。部分集合の指定は行っていない。
>
> **【FACT】** 同記録 §9 末尾は「Impact 列は『影響先の分類』のみを表し、優先度・重大度・修正要否の判断は含まない」と明記している。

> **【定義・U-4 / U-5】** Repository には、**Stage 2-B と「以降」のユニットとの配分基準が存在しない**。そのため、Finding を無処理のまま取りこぼすことを防ぐ **Phase 1 Architecture Consolidation 上の運営定義**として、Stage 2-B では非 MATCH 14 件全件に少なくとも Disposition を付与する。
>
> **全件対象は Repository から必然的に導かれる FACT ではない。** 本書が運営判断として定めるものであり、Owner の指示により変更しうる。

### 2.2 Out of Scope

【定義・U-6 / U-8】

| # | 対象外 | 理由 |
|---|---|---|
| **O1** | **Finding の修正実施**（コード・文書・データ・bridge・既存文書の変更） | §1 のとおり Stage 2-B は方針決定ユニットである。修正は Disposition 確定後の別ユニットが担う |
| **O2** | **Stage 2-C / OD-1 の責務定義** | Repository 全域に定義が存在せず（U-6）、本書の対象外 |
| **O3** | **修正手順・実装方法の設計** | Disposition の粒度を超える |
| **O4** | **S2-CHECK-1記録の Finding 内容の再判定** | 同記録は commit `62eb75e` として確定済み【FACT】。誤りを発見した場合は STOP-B（§8） |
| **O5** | **Stage 2-A 成果物の再監査（カテゴリ ①）** | S2-CHECK-1 と同じ区分を継承。同記録 §0・§7 で運用実績あり【FACT】 |
| **O6** | **既存台帳項目の内容再判定（カテゴリ ②）** | `docs/OPEN_DESIGN_QUESTIONS.md` の Q-* / `prompts/RULES.md` の CHECK-* / `prompts/vNext/HANDOFF.md` の GAP-01 / `prompts/RULES.md` §4 の内容当否は判定しない。**明示的一致の存在確認と参照先の記録（S3）、および移管先の指定（S4 の `MOVE_TO_LEDGER`）は In Scope**。移管の実行は O1 により対象外 |
| **O7** | **CTO 監査由来の残課題（カテゴリ ③）** | S2-CHECK-1 と同じ区分を継承 |
| **O8** | **S2-CHECK-1記録 §9 が未確認と明記した領域の追加調査** | 【FACT】同記録 §9 に 9 項目が列挙されている。Stage 2-B は新規調査を行わない |
| **O9** | **Runtime 品質・UI 設計・状態管理の良否・実機挙動の評価** | S2-CHECK-1 の L3 限定を継承 |

---

## 3. Inputs

### 3.1 基準（3 種類を分離して扱う）

| 名称 | 値 | 意味 | 区分 |
|---|---|---|---|
| **Source Baseline** | `445057b` | S2-CHECK-1 が Repository 実体を調査した時点 | 【FACT】`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §1「基準コミット」 |
| **Input Record Commit** | `62eb75e` | S2-CHECK-1記録が確定した commit | 【FACT】`git log` |
| **Execution Baseline** | Tier2 が B0 で記録する `git rev-parse HEAD` の値 | Stage 2-B 実行中の HEAD 移動を監視する基準／**Disposition 付与の対象時点** | 【定義・U-1】 |

**Execution Baseline は `62eb75e` に固定しない。** Architecture 正本の commit（§10.1）が先行するため、Tier2 着手時の HEAD は `62eb75e` より進んでいる【定義】。

### 3.2 一次入力（改変禁止・転記のみ）

【FACT】

```
docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md（commit 62eb75e で確定）
  §4 乖離台帳のうち Classification ≠ MATCH の 14 行
  §8 判定（PASS WITH FINDINGS）
  §9 本ユニットで確認していない範囲（9 項目）
```

対象 14 件の ID / Layer / Classification / Impact は以下で確定している【FACT】。Stage 2-B はこの 4 列を**転記のみ行い、値を変更しない**。

| ID | Layer | Classification | Impact |
|---|---|---|---|
| AC-003 | L1 | CONFLICT | Architecture |
| AC-004 | L2 | CONFLICT | Documentation |
| AC-005 | L2 | IMPL_ONLY | Documentation |
| AC-006 | L2 | IMPL_ONLY | Documentation |
| AC-007 | L2 | IMPL_ONLY | Documentation |
| AC-008 | L2 | IMPL_ONLY | Implementation |
| AC-009 | L2 | IMPL_ONLY | Implementation |
| AC-010 | L2 | IMPL_ONLY | Documentation |
| AC-011 | L2 | IMPL_ONLY | Documentation |
| AC-012 | L3 | IMPL_ONLY | Implementation |
| AC-013 | L3 | IMPL_ONLY | Documentation |
| AC-014 | L3 | IMPL_ONLY | Documentation |
| AC-015 | L3 | CONFLICT | Documentation |
| AC-016 | L4 | IMPL_ONLY | Documentation |

### 3.3 判断根拠として参照する確定規則

【FACT】

| 参照先 | 内容 |
|---|---|
| `docs/DEVELOPMENT_STANDARD.md` §10.1 | 設計資産ライフサイクル 5 状態 |
| `docs/DEVELOPMENT_STANDARD.md` §10.2 | Legacy 完了条件 L1〜L7（L7 = Owner 承認） |
| `docs/DEVELOPMENT_STANDARD.md` §10.3 | Future Expansion 成立条件 F1〜F5 / 品質条件 Q1 |
| `docs/DEVELOPMENT_STANDARD.md` §10.4 | 体系移行完了条件 M1〜M8 |
| `docs/DEVELOPMENT_STANDARD.md` §7 | Documentation Map（AC-016 の対象） |
| `prompts/RULES.md` §3 | ERROR / PENDING / CHECK 共通定義 |
| `prompts/RULES.md` §4 | MANDATORY_PRESERVATION_TARGETS（監査未整備 3 系統） |
| `docs/DESIGN_PRINCIPLES.md` DP-00 / DP-13 / DP-15 | 記録原則・段階的実装原則・明示的不確定性の原則 |
| `docs/OPEN_DESIGN_QUESTIONS.md` | 保留台帳（`MOVE_TO_LEDGER` の候補先） |
| `docs/IMPLEMENTATION_CHECKLIST.md` | 標準検証チェックリスト |

### 3.4 参照専用（判定材料にしない）

【定義・S2-CHECK-1 の Inputs 区分を継承】

```
docs/reviews/*（P1_S2_CHECK1_ARCHITECTURE.md の §4 / §8 / §9 を除く）
  → 既存記録の再判定は禁止。ID・存在の確認のみ
```

---

## 4. Outputs

【定義・U-1】

| ID | Output | 担当 | 生成ステップ |
|---|---|---|---|
| **O-1** | Finding Disposition 台帳（14 件全件、§7 の固定 11 列・固定値） | 列 1〜8 = Tier2 ／ 列 9〜11 = **Tier1** | B1〜B3 / B5〜B6 |
| **O-2** | 集計（Disposition 別 / Priority 別 / Current State 別 / Existing Ledger Match 別） | **Tier1 に固定** | B7 |
| **O-3** | **Owner 判断待ち事項および確認不能事項の一覧** | **Tier1** | B7 |
| **O-4** | 判定（PASS / PASS WITH FINDINGS / STOP） | **Tier1 のみ** | B8 |

**O-2 の担当は Tier1 に固定する。** Tier1 が B5・B6 を完了した後に自ら集計し、集計のために Tier2 を再度呼び戻さない。

---

## 5. Deliverables

【定義・U-1】

| ID | 成果物 | 内容 |
|---|---|---|
| **S2B-D1** | `docs/reviews/P1_S2B_DISPOSITION.md`（新規 1 ファイル） | 下記の節構成に従う実施記録 |
| **S2B-D2** | 完了報告（Tier2 提出時 1 回・Tier1 確定時 1 回） | 件数・内訳・STOP 該当有無・記録ファイルパスのみ |

**ファイル名の根拠**【FACT】: 既存の `docs/reviews/P1_W2_P0B_COVERAGE.md` / `docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` の命名規則（`P1_` + ユニット識別子 + 内容）に揃える。

### S2B-D1 の節構成（固定）

```
0. 文書の性格・表記規約・基準
1. メタデータ
     Source Baseline / Input Record Commit / Execution Baseline /
     着手時ワークツリー状態 / 提出前確認値 / 担当 / 準拠 Architecture 版
2. 方法（実行順序・実行コマンド・固定検索対象と検索語）
3. 入力の転記（S2-CHECK-1記録 §4 由来の 14 件。改変していないことの宣言を含む）
4. Finding Disposition 台帳（11 列）                          ← O-1
5. 集計                                                       ← O-2（Tier1）
     Disposition 別 / Priority 別 / Current State 別 /
     Existing Ledger Match 別
6. Owner 判断待ち・確認不能事項                                ← O-3（Tier1）
     6.1 OWNER_DECISION_REQUIRED
     6.2 Current State = UNVERIFIABLE
     6.3 Existing Ledger Match = UNVERIFIABLE
7. Scope 外として記録のみ行った事象（① / ② / ③ / その他）
8. 判定（Tier1 記入欄 — Tier2 は空欄のまま提出）                ← O-4
9. 本ユニットで実施していない範囲
```

**§6 の 3 サブセクションを分離する理由**: `UNVERIFIABLE` が必ず Owner 判断を必要とするとは限らないため、`OWNER_DECISION_REQUIRED` と同一概念として扱わない。

**節の記入担当**:

| 節 | Tier2 | Tier1 |
|---|---|---|
| 0 / 1 / 2 / 3 | ● | — |
| 4 列 1〜8 | ● | — |
| 4 列 9〜11 | — | ● |
| 5 / 6 | — | ● |
| 7 | ● | — |
| 8 | **空欄のまま提出** | ● |
| 9 | ● | 判定時に追記可 |

---

## 6. Investigation Steps

【定義・U-1 / U-8】

Tier2 が B0〜B4 を、Tier1 が B5〜B8 を実施する。順序厳守。

| # | ステップ | 担当 | 内容 | 完了条件 |
|---|---|---|---|---|
| **B0** | 基準固定 | Tier2 | 次の 4 点を記録する: ① Source Baseline（`445057b`）② Input Record Commit（`62eb75e`）③ **Execution Baseline**（`git rev-parse HEAD` の実測値）④ `git status --short` の全出力（着手時の既存差分の確定） | 3 基準と着手時ワークツリー状態が記録された |
| **B1** | 入力の転記 | Tier2 | `docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §4 から非 MATCH 14 件の ID / Layer / Classification / Impact を転記。**値を変更しない** | 14 件が転記され、件数が一致 |
| **B2** | 現況再確認 | Tier2 | 各 Finding が指す実体・文書箇所が **Source Baseline から Execution Baseline までの間に**変化したかを機械的に確認し、`Current State`（3 値）と `Current State Evidence`（§7.5）を付与。**`CHANGED` と判定した場合は、変化の内容（変更後の現行箇所・該当 commit 等、機械的に確認できる範囲）を Evidence に記録する。元 Finding が現在も成立するか否かの判断は行わない**（Tier1 が §7.7 で行う） | 14 件全件に 2 列が付与された |
| **B3** | 既存台帳との重複確認 | Tier2 | 各 Finding が §3.3 の既存台帳に既出かを **§7.6 の付与基準に従い、明示的一致の存在確認のみ**で判定し、`Existing Ledger Match`（3 値）と `Existing Ledger Reference` を付与。**同一責務・同一論点かの意味判断は行わない**（O6）。使用した固定検索対象と検索語を S2B-D1 §2 へ記録する | 14 件全件に 2 列が付与され、検索対象・検索語が記録された |
| **B4** | 記録作成・提出 | Tier2 | §5 のテンプレートへ B0〜B3 の結果を記入。**台帳の列 9〜11（Disposition / Priority / Basis）、および §5・§6・§8 は空欄のまま提出** | S2B-D1 が作成され、S2B-D2 形式で Tier1 へ提出された |
| **B5** | Disposition 付与 | **Tier1** | **`Current State = CHANGED` の Finding は §7.7 を先に適用**したうえで、§7.8 の決定順序に従い 14 件全件に §7.3 の固定 5 値から 1 つを付与し、§7.9 の必須記載事項を満たす Basis を記入 | 14 件全件に Disposition と Basis が付与された |
| **B6** | Priority 付与 | **Tier1** | `Disposition = FIX` の Finding にのみ §7.4 の固定 3 値から 1 つを付与。それ以外は `—` | FIX 全件に Priority が付与された |
| **B7** | 集計・一覧作成 | **Tier1** | §5（Disposition 別 / Priority 別 / Current State 別 / Existing Ledger Match 別の集計）と §6（6.1〜6.3 の一覧）を作成 | §5・§6 が完成した |
| **B8** | 判定・確定 | **Tier1** | §12 の基準により判定し §8 へ記入。確定後に Stage 2-B Record Commit（§10.2）を実施 | 判定が記入され、commit された |

### 全ステップ共通の禁止事項

【定義】

```
× Finding の修正（コード・文書・データ・bridge・既存文書のいずれも）— O1
× S2-CHECK-1記録の内容変更 — O1 / O4
× npm test / npm run build / npm run audit / npm run dev の実行
× ブラウザ実機確認
× 新規調査（S2-CHECK-1記録 §9 の未確認範囲への踏み込みを含む）— O8
× Stage 2-C / OD-1 の責務への言及 — O2
× Tier2 による Disposition / Priority / Basis / §5 / §6 / §8 の記入
× Tier2 による意味判断（同一責務・同一論点かの判定を含む）
× Tier2 による git commit / git push
```

---

## 7. Finding Disposition 台帳の固定仕様

【定義・U-1 / U-4 / U-5】

### 7.1 固定列（列順もこのとおり・11 列）

```
| ID | Layer | Classification | Impact | Current State | Current State Evidence |
  Existing Ledger Match | Existing Ledger Reference | Disposition | Priority | Basis |
```

| # | 列 | 付与者 |
|---|---|---|
| 1 | ID | Tier2（転記） |
| 2 | Layer | Tier2（転記） |
| 3 | Classification | Tier2（転記） |
| 4 | Impact | Tier2（転記） |
| 5 | Current State | Tier2 |
| 6 | Current State Evidence | Tier2 |
| 7 | Existing Ledger Match | Tier2 |
| 8 | Existing Ledger Reference | Tier2 |
| 9 | **Disposition** | **Tier1** |
| 10 | **Priority** | **Tier1** |
| 11 | **Basis** | **Tier1** |

### 7.2 固定値（新設・改変禁止）

| 列 | 取りうる値 | 付与基準 |
|---|---|---|
| **ID / Layer / Classification / Impact** | S2-CHECK-1記録の値をそのまま転記 | 変更・再分類禁止 |
| **Current State** | `UNCHANGED` / `CHANGED` / `UNVERIFIABLE` | §7.5 |
| **Current State Evidence** | 確認事実の記録 | §7.5 |
| **Existing Ledger Match** | `MATCHED` / `NOT_MATCHED` / `UNVERIFIABLE` | **§7.6（Tier2 の判断境界を固定）** |
| **Existing Ledger Reference** | 台帳の所在（`MATCHED`）／ `—`（`NOT_MATCHED`）／ 確認不能理由（`UNVERIFIABLE`） | §7.6 |
| **Disposition** | `FIX` / `DEFER` / `ACCEPT` / `MOVE_TO_LEDGER` / `OWNER_DECISION_REQUIRED` | §7.3 / §7.7 / §7.8 |
| **Priority** | `P-HIGH` / `P-MED` / `P-LOW` / `—` | §7.4 |
| **Basis** | §7.9 の必須記載事項を満たす記述 | §7.9 |

### 7.3 Disposition の定義

| 値 | 意味 |
|---|---|
| `FIX` | 修正対象として確定する。**実施ユニット・実施順序・実装方法は本 Architecture では定義しない（§13 参照）** |
| `DEFER` | 修正対象だが着手時期を後送りする。**再判断条件または着手可能条件を Basis に必須記載する** |
| `ACCEPT` | 現状を正として受容し、修正しないことを確定する。**`Current State = CHANGED` の Finding については、「Execution Baseline 時点では、元 Finding の原因となった状態が既に存在せず、追加修正を必要としない」という意味を含む（§7.7 (5)）** |
| `MOVE_TO_LEDGER` | 既存の保留台帳の管理下へ移すことを確定する。**移管先の指定のみを行い、台帳への書き込みは行わない（O1）** |
| `OWNER_DECISION_REQUIRED` | Repository 内の確定規則と確認済み事実だけでは Disposition を決められず、Owner の判断を要する |

`OWNER_DECISION_REQUIRED` は DP-15（明示的不確定性の原則）に基づく分類であり、**推測で他の 4 値のいずれかを選ぶことを禁ずるための受け皿**である【FACT: `docs/DESIGN_PRINCIPLES.md` DP-15】。

### 7.4 Priority の定義

`Disposition = FIX` の Finding にのみ付与する。それ以外は `—` とする。

| 値 | 意味 |
|---|---|
| `P-HIGH` | 他の Finding の処理、または後続 Stage の前提となるもの |
| `P-MED` | 前提関係を持たないが、Phase 1 Architecture Consolidation の範囲内で処理すべきもの |
| `P-LOW` | 単独で完結し、処理時期が他に影響しないもの |

Priority は**着手順序の指標であり、重大度・リスク評価ではない**【定義・U-5】。

### 7.5 Current State Evidence の記入ルール（Tier2）

次の 3 点を簡潔に記録する。

```
□ 確認したファイルパス
□ 対象シンボル / 節 / 行 / 検索対象
□ UNCHANGED / CHANGED / UNVERIFIABLE と判定した根拠
```

`CHANGED` の場合は、**変化の内容（変更後の現行箇所・該当 commit 等、機械的に確認できる範囲）**を併記する。

**禁止**: 評価・推測・改善提案・元 Finding の成否判断。確認した事実のみを記録する。行番号だけを根拠にせず、検索語を併記する（DP-00）。

### 7.6 Existing Ledger Match の記入ルール（Tier2 の判断境界）

Tier2 は事実収集と機械的確認のみを担当する。**本列に意味判断（同一責務・同一論点かの判定）を含めない。**

**固定検索対象**（§3.3 の台帳群）:

```
docs/OPEN_DESIGN_QUESTIONS.md（Q-*）
prompts/RULES.md（CHECK-* / §4 監査未整備 3 系統）
prompts/vNext/HANDOFF.md（GAP-01）
```

使用した検索対象と検索語は S2B-D1 §2 へ記録する。

#### `MATCHED`

次の**いずれかを Repository 上で直接確認できる場合のみ**付与する。

```
□ 同一の Finding ID（AC-xxx）が台帳側に記載されている
□ 対象ファイル / 対象シンボル / 対象規則または論点が明示的に一致している
□ S2-CHECK-1記録または既存台帳が、当該 Finding との対応関係を直接明記している
```

`Existing Ledger Reference` には**台帳パスと項目 ID または節**を記載する。

#### `NOT_MATCHED`

固定した検索対象と検索語による存在確認を行った結果、上記の明示的一致が確認できなかった場合に付与する。

> **`NOT_MATCHED` は「論点が異なる」「移管対象ではない」という Tier1 判断を意味しない。** 単に明示的一致を発見できなかったという確認結果である。

`Existing Ledger Reference` は `—` とする。

#### `UNVERIFIABLE`

次のいずれかに該当する場合に付与する。

```
□ 類似する記述はあるが、同一責務・同一論点かを Tier2 の事実確認だけでは確定できない
□ 参照先が曖昧である
□ 一致判定に設計判断または内容評価が必要になる
□ 固定された検索範囲だけでは確認できない
```

**Tier2 は意味的な類似を推測して `MATCHED` としてはならない。** `Existing Ledger Reference` へ確認不能理由を記録する。

#### Tier1 の役割との境界

- `Existing Ledger Match = MATCHED` であっても、**`MOVE_TO_LEDGER` を自動適用しない**（§7.8 順位 2 の制約）。同一責務・同一論点として既存台帳へ移管できるかは、Tier1 が Disposition 決定時に判断する
- `Existing Ledger Match = UNVERIFIABLE` の場合も、**他の確定規則だけで Disposition を決定できる場合は必ずしも `OWNER_DECISION_REQUIRED` としない**。判断不能の場合のみ `OWNER_DECISION_REQUIRED` を付与する

### 7.7 Current State = CHANGED の場合の Disposition 基準（Tier1）

| # | 原則 |
|---|---|
| **1** | **Disposition は、原則として Execution Baseline 時点の現況に対して付与する** |
| **2** | ただし、S2-CHECK-1記録から転記した **ID / Layer / Classification / Impact は変更・再分類しない** |
| **3** | `Current State = CHANGED` の場合、Tier1 は **`Current State Evidence` に記録された機械的確認結果だけを使用する**。新規調査・Runtime 確認・S2-CHECK-1記録 §9 の未確認範囲への踏み込みは**禁止**（O8 / O9） |
| **4** | 変更後も**元 Finding が成立している**ことを既存証跡だけで確認できる場合 → 通常の **§7.8 決定順序**を適用する |
| **5** | 変更によって**元 Finding が解消済み**であることを既存証跡だけで**明確に確認できる**場合 → **`ACCEPT`** とする |
| **6** | `CHANGED` であることは確認できるが、**元 Finding が現在も成立するか解消済みかを既存証跡だけでは確定できない**場合 → **`OWNER_DECISION_REQUIRED`** とし、不足している情報を Basis へ記載する |
| **7** | 上記の判断に**新規調査が必要**な場合 → **調査を開始せず STOP-E**（§8） |

原則 5 に該当する `ACCEPT` は、「Execution Baseline 時点では、元 Finding の原因となった状態が既に存在せず、追加修正を必要としない」という意味を持つ（§7.3）。Basis の必須記載事項は §7.9 に定める。

### 7.8 Disposition 決定順序

Tier1 の判断を再現可能にするため、**上から順に判定し、最初に該当した値を採用する**。

#### 事前分岐

```
Current State = CHANGED か？
  → はい: §7.7 を先に適用する
       §7.7 (5) 該当 → ACCEPT（以下の順序は適用しない）
       §7.7 (6) 該当 → OWNER_DECISION_REQUIRED（以下の順序は適用しない）
       §7.7 (7) 該当 → STOP-E
       §7.7 (4) 該当 → 以下の順序を適用する
  → いいえ（UNCHANGED / UNVERIFIABLE）: 以下の順序を適用する
```

#### 決定順序

| 順 | 判定 | 該当時の値 |
|---|---|---|
| **1** | Repository 内の確定規則と確認済み事実だけでは Disposition を確定できないか | `OWNER_DECISION_REQUIRED` |
| **2** | 既存台帳に同一責務・同一論点が存在し、新規の独立 Finding として管理する必要がないか | `MOVE_TO_LEDGER` |
| **3** | 現状を正として受容する明示的な確定根拠があるか | `ACCEPT` |
| **4** | 修正対象ではあるが、着手に必要な前提条件または再判断条件が未成立か | `DEFER` |
| **5** | 上記に該当せず、Phase 1 Architecture Consolidation の範囲内で修正対象として確定できるか | `FIX` |

**順位 2 の制約**: `Existing Ledger Match = MATCHED` **であることだけを理由に、自動的に `MOVE_TO_LEDGER` としてはならない**。台帳側が同一責務・同一論点を管理していることを、Tier1 が Basis で示せる場合に限る。

**順位 1 の制約**: `Existing Ledger Match = UNVERIFIABLE` であっても、他の確定規則だけで Disposition を決定できる場合は `OWNER_DECISION_REQUIRED` としない（§7.6）。

### 7.9 Basis の必須記載事項

Basis は**単なる文書パスの列挙ではなく、その文書のどの規則が Disposition を支えるかを短く記録する**ものとする。実装方法・修正方法は書かない（O3）。

| Disposition | Basis に必ず含めるもの |
|---|---|
| `FIX` | 修正対象として確定できる根拠（どの確定規則に照らして修正対象と言えるか） |
| `DEFER` | **再判断条件または着手可能条件**。「後で対応する」「今後検討する」のみの記述は**禁止** |
| `ACCEPT`（通常） | 現状を正として受容できる確定規則または確定文書 |
| **`ACCEPT`（§7.7 (5) による解消済み判定）** | ① **変更された commit または現行箇所** ② **元 Finding が現在は成立しないと確認できる事実** の 2 点。**実装方法・変更経緯の評価は書かない** |
| `MOVE_TO_LEDGER` | **移管先台帳のパスと項目 ID または節** |
| `OWNER_DECISION_REQUIRED` | **Owner が判断するために不足している情報**（§7.7 (6) による場合は、元 Finding の成立／解消を確定できない理由を含む） |

### 7.10 共通の記入ルール

- 14 件全件に Disposition を付与する。件数の多寡を理由に省略しない
- Basis の根拠は Repository 内の確定文書に限る。会話履歴・記憶を根拠にしない（DP-00）
- 「〜すべき」「〜が望ましい」等の評価語を Basis に用いない
- `Current State = CHANGED` の Finding は、変化した事実のみを記録し、**S2-CHECK-1記録を書き換えない**（O1 / O4）。Disposition は §7.7 に従って Execution Baseline 時点の現況に対して付与するが、**転記した ID / Layer / Classification / Impact は変更しない**

---

## 8. STOP Conditions

【定義・U-1。S2-CHECK-1 の STOP-A〜G の構造を継承し、「発見だけでは停止しない」原則を全面適用する】

該当した時点で即時停止し、原因と該当ステップを報告する。自動修正・自動継続はしない。

| ID | 条件 |
|---|---|
| **STOP-A** | 作業を進めるために Finding の修正（コード・文書・データ・bridge・既存文書の変更）が必要と判断した |
| **STOP-B** | S2-CHECK-1記録の Finding 記述が、**Source Baseline 時点でも事実誤認だった**と確認された。記録を書き換えず、内容を報告して停止する。再オープンの可否は Owner 判断 |
| **STOP-C** | `OWNER_DECISION_REQUIRED` / `Current State = UNVERIFIABLE` / `Existing Ledger Match = UNVERIFIABLE` のいずれかにより、**他の Finding を固定値のいずれにも分類できなくなった**場合 |
| **STOP-D** | Scope 外事象を処理しなければ、**残りの Finding の Current State / Existing Ledger Match / Disposition のいずれかを確定できない**場合 |
| **STOP-E** | 検証コマンド実行・実機確認・**新規調査**が必要と判断した（**§7.7 (7) を含む**） |
| **STOP-F** | S2B-D1 が 2,000 行を超える見込みとなった |
| **STOP-G** | Tier2 着手後に **Execution Baseline から HEAD が移動した**、または**許可済み差分以外の**ワークツリー差分が発生した |

### STOP-C の適用範囲（誤読防止）

`OWNER_DECISION_REQUIRED` / `Current State = UNVERIFIABLE` / `Existing Ledger Match = UNVERIFIABLE` の**発生そのものは停止条件ではない**。当該 Finding に値を記録し（必要情報・確認不能理由を併記）、**次の Finding へ進む**。停止するのは、その未決定・確認不能によって**他の Finding**を固定値のいずれにも分類できなくなった場合のみである。

### STOP-D の適用範囲（誤読防止）

Out of Scope 事象（カテゴリ ① / ② / ③ / その他）の**発見そのものは停止条件ではない**。発見した場合は S2B-D1 §7 へ**件数と最小限の所在のみ**を記録し、内容の調査・再判定・修正を行わずに継続する。停止するのは、その Scope 外事象を処理しなければ残りの Finding の Current State / Existing Ledger Match / Disposition のいずれかを確定できない場合のみである。

### STOP-B・STOP-E と `Current State = CHANGED` の境界

| 事象 | 扱い |
|---|---|
| Source Baseline 以降に対象箇所が変化した | `Current State = CHANGED` として記録し**継続**（B2） |
| `CHANGED` の Finding について、元 Finding が成立していることを既存証跡で確認できる | §7.8 決定順序を適用し**継続** |
| `CHANGED` の Finding について、元 Finding が解消済みと既存証跡で明確に確認できる | `ACCEPT`（§7.7 (5)）として**継続** |
| `CHANGED` の Finding について、成立／解消を既存証跡だけでは確定できない（新規調査は不要） | `OWNER_DECISION_REQUIRED`（§7.7 (6)）として**継続**。STOP しない |
| `CHANGED` の Finding について、成立／解消の判断に**新規調査が必要** | **STOP-E**（調査を開始しない。§7.7 (7)） |
| S2-CHECK-1記録の Finding 記述が Source Baseline 時点でも事実誤認だったと確認された | **STOP-B** |
| 「事実誤認だった」と判断するために S2-CHECK-1記録 §9 の未調査領域へ踏み込む必要がある | **新規調査を行わず STOP-E** |

### STOP-G の許可済み差分

以下は STOP-G の対象外とする。

```
1. Tier2 着手時（B0）に存在する既存差分
   → B0 の git status --short により、その時点で確定する
2. Stage 2-B 実行中に作成する docs/reviews/P1_S2B_DISPOSITION.md
```

**S2B-D1 の新規作成それ自体は STOP-G に該当しない。**

**Architecture 正本の commit（§10.1）により HEAD が `62eb75e` から進んでいること自体は STOP 条件としない。** 監視対象は Execution Baseline からの移動である。

> **参考 FACT**: commit `62eb75e` 直後の `git status --short` は次の 4 件だった。
> `.claude/settings.local.json`（M）／`.claude/launch.json`（??）／`bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak`（??）／`docs/reviews/PHASE2_STAGE1_VERIFICATION_2026-07-25.md`（??）
> **これは過去時点の参考情報であり、Stage 2-B 実行時にも同一であると事前に断定しない。** 許可済み差分は B0 の実測により確定する。

### 件数による停止条件

設けない。Disposition の内訳がどのような分布になっても全 14 件を記録して B8 へ進む（分量が問題になる場合のみ STOP-F）。

---

## 9. Completion Criteria

【定義・U-1】

### 9.1 前提条件（Stage 2-B 実行開始前に充足していること）

```
□ Stage 2-B Architecture が凍結され、Owner 承認を経て
  docs/reviews/P1_S2B_ARCHITECTURE.md として
  Architecture Freeze Commit（§10.1）が完了している
```

本項は Stage 2-B **実行の前提条件**であり、実施記録の完了条件とは区別する。

### 9.2 Stage 2-B 実行の完了条件

以下を**すべて**満たした時点で完了とする。

```
□ 非 MATCH Finding 14 件全件に Disposition と Basis が付与されている
□ Disposition = FIX の全件に Priority が付与されている
□ Basis が §7.9 の Disposition 別必須記載事項を満たしている
□ Current State = CHANGED の Finding が §7.7 に従って処理されている
□ Owner 判断待ち事項および確認不能事項が S2B-D1 §6（6.1〜6.3）へ一覧化されている
□ S2B-D1 §5 の集計（Disposition 別 / Priority 別 / Current State 別 /
  Existing Ledger Match 別）が記入されている
□ S2B-D1 §8 に Tier1 判定が記入されている
□ S2B-D1 のみを対象とした Stage 2-B Record Commit（§10.2）が完了している
□ コード・データ・bridge・既存文書に変更がない
□ push を実施していない
```

**完了に含めないこと**: Finding の修正完了、Owner 判断の取得完了、後続ユニットの起票。

---

## 10. Commit Boundary

【定義・U-1 / U-2 / U-3】

Stage 2-B に関わる commit は **2 区分**に分離する。**Architecture 文書と実施記録を同一 commit に含めてはならない。**

### 10.1 Architecture Freeze Commit（Stage 2-B 実行開始前）

| 項目 | 内容 |
|---|---|
| **対象** | `docs/reviews/P1_S2B_ARCHITECTURE.md`（新規追加）**1 ファイルのみ** |
| **前提条件** | ① v1.2 レビュー完了 ② 必要な修正完了 ③ **Owner 承認** ④ 凍結版であること（`Status: FROZEN`） |
| **commit 数** | 1 commit |
| **コミットメッセージ** | `docs(architecture): define Stage 2-B finding disposition` |
| **実施時期** | **Stage 2-B 実行開始前に完了していること**（§9.1） |
| **push** | 実施しない |

#### Architecture を Repository へ正本として永続化する理由

> 【FACT】Repository Survey により、次の 3 文書が Repository 内に存在しないことが確認されている。
> - P1設計書 v2.3（`docs/reviews/P1_W2_P0B_COVERAGE.md` が 4 箇所で参照 — U-2）
> - S2-CHECK-1（Architecture）設計 v1.2（`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` が準拠先として参照 — U-3）
> - S2-CHECK-1 調査指示書 v1.1（同上 — U-3）

【定義・U-2 / U-3】同じ運用を繰り返すと、**将来の Repository Survey でも準拠先の設計正本を確認できない状態が再発する**。したがって Stage 2-B Architecture は、Tier1 レビューおよび Owner 承認後に Repository へ正本として永続化する。**保存するのは凍結版（本 v1.2）のみとする。**

### 10.2 Stage 2-B Record Commit（B8）

| 項目 | 内容 |
|---|---|
| **対象** | `docs/reviews/P1_S2B_DISPOSITION.md`（新規追加）**1 ファイルのみ** |
| **前提条件** | ① Tier2 B0〜B4 完了 ② Tier1 が Disposition / Priority / Basis を付与（B5〜B6）③ Tier1 が集計・一覧を作成（B7）④ Tier1 判定確定（B8） |
| **commit 数** | 1 commit |
| **コミットメッセージ** | `docs(review): record Stage 2-B finding disposition` |
| **push** | 実施しない |

### 10.3 両 commit に共通する禁止事項

```
× Finding の修正を含めること
× 既存文書の変更を含めること
× コード・データ・bridge の変更を含めること
× 2 つの対象ファイルを同一 commit に含めること
× B0 で確定した許可済み既存差分を stage すること
```

### 10.4 Tier2 は commit しない

固定手順（逸脱禁止）:

```
【事前】Architecture v1.2（FROZEN）→ Owner 承認
        → Architecture Freeze Commit（§10.1）
              ↓
Tier2 実施（B0〜B4）— Execution Baseline を B0 で記録
              ↓
S2B-D1 提出（台帳列 9〜11、§5・§6・§8 は空欄）
              ↓
Tier1 Disposition 付与（B5）→ Priority 付与（B6）
              ↓
Tier1 集計・一覧作成（B7）
              ↓
Tier1レビュー結果に基づく
S2B-D1記録修正（Tier2）
              ↓
Tier1 判定・確定（B8）→ Stage 2-B Record Commit（§10.2）
```

### 10.5 検証工程

両 commit とも docs 追加のみのため tsc / test / build / audit は不要。commit 直前に `git status --short` で意図しない差分がないことのみ確認する。

---

## 11. Tier1 / Tier2 Responsibilities

【定義・U-1】

| 項目 | Tier2（Sonnet） | Tier1（Opus） |
|---|---|---|
| 実施ステップ | B0〜B4 | B5〜B8 |
| 台帳 列 1〜4（ID / Layer / Classification / Impact 転記） | ● | — |
| 台帳 列 5（Current State） | ● | — |
| 台帳 列 6（Current State Evidence） | ● | — |
| 台帳 列 7（Existing Ledger Match） | ●（**§7.6 の明示的一致の確認のみ**） | — |
| 台帳 列 8（Existing Ledger Reference） | ● | — |
| 台帳 列 9（Disposition） | **禁止** | ● |
| 台帳 列 10（Priority） | **禁止** | ● |
| 台帳 列 11（Basis） | **禁止** | ● |
| S2B-D1 §5（集計） | **禁止** | ● |
| S2B-D1 §6（Owner 判断待ち・確認不能事項） | **禁止** | ● |
| S2B-D1 §7（Scope 外記録） | ● | — |
| S2B-D1 §8（判定） | **空欄のまま提出** | ● |
| **同一責務・同一論点かの意味判断** | **禁止**（§7.6） | ●（§7.8 順位 2） |
| **`CHANGED` 時の元 Finding 成否判断** | **禁止**（§7.5 / B2） | ●（§7.7） |
| Finding の修正 | **禁止** | **禁止**（O1） |
| git commit / push | **禁止** | Architecture Freeze Commit / Stage 2-B Record Commit のみ（push はしない） |
| 判断の性質 | 事実の収集・転記・機械的確認のみ | 方針決定・優先順位付け・集計・判定 |

**Tier2 が判断に迷った場合**: 推測で列 5 / 列 7 を埋めず、`UNVERIFIABLE` を付与し、確認不能理由を列 6 / 列 8 に記録して Tier1 へ上げる（DP-15）。**意味的類似を推測して `MATCHED` としない。**

---

## 12. 判定基準（PASS / PASS WITH FINDINGS / STOP）

【定義・U-1】

| 判定 | 条件 |
|---|---|
| **PASS** | ① 14 件全件に Disposition と Basis がある ② FIX 全件に Priority がある ③ `OWNER_DECISION_REQUIRED` = 0 件 ④ `Current State = UNVERIFIABLE` = 0 件 ⑤ `Existing Ledger Match = UNVERIFIABLE` = 0 件 ⑥ STOP 非該当 |
| **PASS WITH FINDINGS** | ① 14 件全件に Disposition と Basis がある ② FIX 全件に Priority がある ③ `OWNER_DECISION_REQUIRED` / `Current State = UNVERIFIABLE` / `Existing Ledger Match = UNVERIFIABLE` の**いずれかが 1 件以上**存在する ④ それらが S2B-D1 §6（6.1〜6.3）へ一覧化されている ⑤ STOP 非該当 |
| **STOP** | §8 のいずれかに該当し、全件の Disposition 確定まで進めなかった |

`PASS WITH FINDINGS` は**正常な完了形**である。Owner 判断を要する項目・確認不能項目が残ること自体は、DP-15 に従った「不確定の公告」であり失敗を意味しない。

**判定上の注意**:
- `Existing Ledger Match = UNVERIFIABLE` は、それ自体が PASS WITH FINDINGS のトリガーとなる（§6.3 へ一覧化）。ただし**当該 Finding の Disposition が `OWNER_DECISION_REQUIRED` である必要はない**（§7.6 / §7.8 順位 1 の制約）
- **Disposition の内訳（`FIX` が何件か等）は PASS / PASS WITH FINDINGS の判定を左右しない**
- **判定は Tier1 のみが行う**

---

## 13. 本 Architecture が定義しないもの

【定義・U-6 / U-8 / U-10】

以下は本書の対象外であり、Stage 2-B の実行中も定義・言及しない。

```
- Stage 2-C の責務・スコープ・入出力
- OD-1 の責務・スコープ・入出力
- FIX 判定された Finding の実施ユニット名・実施順序・実装方法
- DEFER 判定された Finding の受け入れ先ユニット
- Phase 1 Architecture Consolidation 全体の残 Stage 構成
- CTO デューデリジェンス Phase 2（P2-*）との前後関係（U-10）
```

これらはいずれも Repository 内に定義が存在せず（U-6 / U-10）、本 Architecture のスコープ外である。

---

## 付録: Repository Survey の不明点に対する本 Architecture の扱い

| ID | 内容 | 扱い |
|---|---|---|
| **U-1** | Stage 2-B の各定義が Repository 上に存在しない | **本書が【定義】として確定し、§10.1 の Architecture Freeze Commit により Repository へ正本として永続化することで解消する** |
| **U-2** | P1設計書 v2.3 が Repository 内に存在しない | **欠落自体は未解消**。本書の適用範囲外であり、Stage 2-B では扱わない |
| **U-3** | S2-CHECK-1 Architecture v1.2 / 調査指示書 v1.1 が Repository 内に存在しない | **既存の欠落自体は未解消**。ただし **Stage 2-B では同一の欠落を再発させない**（§10.1 により本 Architecture は永続化される） |
| **U-4** | Stage 2-B が扱う Finding の範囲 | **§2.1 S1 が全 14 件と運営定義として確定**（FACT ではない旨を明記） |
| **U-5** | Finding の優先度・重大度 | **§7.4 が Priority の定義を確定**（重大度は定義しない） |
| **U-6** | Stage 2-C / OD-1 の定義 | **未解消**。§13 により本書の対象外 |
| **U-7** | Stage 2-A のクローズ記録文書が存在しない | **未解消**。§2.2 O5 によりカテゴリ ① として対象外 |
| **U-8** | Stage 2-B の性格（調査か修正か） | **§1 が「方針決定ユニット」と確定** |
| **U-9** | Phase 1 Architecture Consolidation と PROJECT_CONTEXT の Phase 番号体系の関係 | **未解消**。本書では扱わない |
| **U-10** | CTO Phase 2 の未消化ユニットとの関係 | **未解消**。§13 により本書の対象外 |

---

## 版管理

| 版 | 状態 | 内容 |
|---|---|---|
| v1.0 | 差し戻し済み | 初版草案 |
| v1.1 | 差し戻し済み | R1-1〜R1-20 を反映 |
| **v1.2** | **FROZEN（Owner 承認済み）** | R2-1〜R2-2 および §10.4 表現修正を反映 |

Repository へ保存するのは本凍結版（v1.2）のみとする。
