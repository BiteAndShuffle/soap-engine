# 情報アーキテクチャ（Decision 2 / Decision 3）— 実行記録

作成: 2026-08-03 ／ 基準 commit: `66fb865`

---

## 0. 本記録の性格

| 項目 | 内容 |
|---|---|
| **正本文書ではない** | 設計判断の正本は各正本文書である。本記録は確定済み Owner Decision と、その採用理由・実装境界を保存する |
| **責務** | 確定済み Owner Decision（Decision 2 / Decision 3）と、その**採用理由**・**実装境界**を記録する |
| **禁止** | **本記録で新しい設計判断を作らない。** 判断が必要な場合は Owner 判断を仰ぐ |
| **失効** | **正本への反映が完了した後、本記録は履歴となる。** 本記録の失効は正本文書の有効性に影響しない |
| **Fact の扱い** | **実装から機械取得できる Fact を台帳化しない。** 件数・行番号・現在値は保持せず、必要な場合は実装と再実行可能なコマンドを正本とする |

---

## 1. Decision 2 — Identity の集約と判断優先順位の移設

### 1.1 確定内容

- Mission / Vision / Core Philosophy の正本を `docs/DEVELOPMENT_STANDARD.md` §1・§2 へ集約する
- `prompts/PROJECT_CONTEXT.md` 側の重複記述は正本ポインタへ置換する
- `prompts/PROJECT_CONTEXT.md` の主要パス等、実務ナビゲーションは保持する
- `prompts/PROJECT_CONTEXT.md` §7 の判断優先順位を `docs/DEVELOPMENT_STANDARD.md` §2 へ移設する
- 判断優先順位を、原則衝突時の解決規則として扱う
- 統治・基盤整備が Mission / Vision の射程に含まれることを明確にする

### 1.2 採用理由

- `docs/DEVELOPMENT_STANDARD.md` §2 Core Philosophy に、判断の序列および原則衝突時の解決規則が存在しない
- 判断優先順位が、Current 文書である `prompts/PROJECT_CONTEXT.md` に置かれている
- Identity に必要な要素のうち、**判断の優先順位**と**局所最適を避ける判断軸**が、§1・§2 だけからは再現できない
- Identity 情報と Current 情報を分離する必要がある

### 1.3 実装境界

- `prompts/PROJECT_CONTEXT.md` は Decision 3 の実装でも変更対象になるため、**両者を同時並行で編集しない**
- `prompts/PROJECT_CONTEXT.md` §7 の判断優先順位は**逐語移設**する
- 「品質維持」の意味を**自己判断で拡大しない**
- **「品質維持」の実測射程は preservation と medical correctness のみである**
- 文書間整合・読込経路の安全性・一般的な実装品質は、**現行の「品質維持」の意味に含まれていない**
- 射程拡大が必要になった場合は**停止する**
- **`docs/DEVELOPMENT_STANDARD.md` §2 の既存原則と `prompts/PROJECT_CONTEXT.md` §2 の原則の逐条対応は未確認である**
- **包含関係を確認せずに `prompts/PROJECT_CONTEXT.md` §2 を削除・ポインタ化しない**

---

## 2. Decision 3 — Fact / Decision / History の分類と権威関係

### 2.1 確定内容

- 実装から機械的に取得できる Fact を、散文へ複製して保持しない
- **Fact** の権威は、実装と再実行可能なコマンドである
- **Decision** の権威は、Owner 判断と各正本文書である
- **History** の権威は、git history と時点付き実行記録である
- MEMORY は補助情報であり、Repository の正本ではない
- MEMORY と Repository 正本が矛盾する場合は、正本を優先する
- MEMORY 内の矛盾記述を放置しない
- `prompts/PROJECT_CONTEXT.md` は Current Decision を中心に保持する
- Unit 完了時の書き手側更新と、新規セッション起動時の読み手側検証を採用する

### 2.2 採用理由

- `prompts/vNext/HANDOFF.md` や `prompts/PROJECT_CONTEXT.md` 等で、機械取得可能な Fact を散文へ複製したことによる drift が発生した
- 正本ポインタ方式を採った箇所では、同種の drift が発生していない（`prompts/vNext/HANDOFF.md` §6 の ModuleValidator WARNING は `docs/VALIDATOR_STANDARD.md` Appendix B を正本として参照し、台帳を二重管理していない）
- MEMORY の権威関係は `docs/PERSONA_PROJECT_APPENDIX.md` に既に存在しており、本 Decision はこれを Repository 全般へ一般化する
- R6-b-4 では、原則を明文化する前に `prompts/vNext/HANDOFF.md` へ先行適用されている。**原則を永続化する必要がある**

### 2.3 実装境界

- **情報分類原則を先に正本文書へ反映してから**、`prompts/PROJECT_CONTEXT.md` の Fact 除去・Current 化を行う
- `prompts/PROJECT_CONTEXT.md` は Decision 2 の実装でも変更対象になるため、**両者を同時並行で編集しない**
- 配置先は `docs/DESIGN_PRINCIPLES.md` の新規 DP とする
- `docs/DEVELOPMENT_STANDARD.md` へ新しい運営規則として追加しない
- 既存の DP-00 / DP-07 / DP-13 / DP-15 / DP-16 および `docs/DEVELOPMENT_STANDARD.md` §11 との責務重複を避ける
- Decision と Fact の境界は、「**実装を見れば機械的に取得できるか**」で判定する
- 二面モデルの起点・更新対象・検証項目・不整合時の挙動を、実装時に明確にする
- **`prompts/PROJECT_CONTEXT.md` Current Phase の完了済フェーズ表と §8 フェーズ完了記録の重複範囲は未測定である**
- **§8 フェーズ完了記録の現行参照価値も未測定である**
- **上記を確認せずに、Current Phase または §8 を削除・移動しない**

---

## 3. 状態

| Decision | 状態 |
|---|---|
| **Decision 2**（Identity の集約と判断優先順位の移設） | **実装済み**（詳細は §4 参照） |
| **Decision 3**（Fact / Decision / History の分類と権威関係） | **実装済み**（詳細は §4 参照） |

---

## 4. Decision 2・Decision 3 実装記録

### 4.0 本節の性格

本節は Owner Decision を保存しない。Decision の正本は §1・§2、および Owner の判断そのものであり、本節が記録するのはそれを Repository へどう実装したかという**実施結果・状態・検証結果・commit 追跡**である。

本節が用いる Unit 名（Unit A／Unit B／Unit C／D-1〜D-4D）は Owner が付与した作業単位のラベルであり、Repository から機械的に導出される分類ではない。commit hash・commit message・実装内容は Repository 実測に基づく。

失効: 記録した作業が完了した時点で、本節は履歴となる。本節の失効は §1・§2 の有効性に影響しない。

### 4.1 実装結果

| Unit（Owner指定） | commit | commit message | 実装内容 |
|---|---|---|---|
| **Unit C** | `207132a` | `docs(principles): define fact-decision-history classification (DP-17)` | `docs/DESIGN_PRINCIPLES.md` へ DP-17 を新設。`docs/DEVELOPMENT_STANDARD.md` は参照行 1 箇所を更新 |
| **Unit A** | `632d72d` | `docs(standard): consolidate identity into mission and core philosophy` | `docs/DEVELOPMENT_STANDARD.md` §1・§2 へ Identity 関連記述を集約 |
| **Unit A** | `b0b9acc` | `docs(context): point confirmed identity principles to development standard` | `prompts/PROJECT_CONTEXT.md` 側の Identity 関連重複記述を正本ポインタへ置換 |
| **Unit B** | `64454ab` | `docs(standard): relocate judgement priority into core philosophy` | 判断優先順位を `docs/DEVELOPMENT_STANDARD.md` §2 へ移設 |
| **Unit B** | `9c7acd7` | `docs(context): point token-efficiency priority to core philosophy` | `prompts/PROJECT_CONTEXT.md` §7 の判断優先順位記述を正本ポインタへ置換 |
| **D-1** | `744b2ad` | `docs(context): replace vNext phase facts with current navigation` | Current Phase 内の vNext 完了実績 Fact 表を現状ナビゲーションへ置換 |
| **D-2** | `44ca902` | `docs(context): replace phase 1-3 facts with validator and backlog pointers` | Current Phase 内の Phase 1-3 Fact 表を validator／backlog ポインタへ置換 |
| **D-3** | `36ba74d` | `docs(context): consolidate deferred integration reviews into backlog pointer` | Current Phase 内の STANDARD_REFERENCE_PATHS／P0-B・P1 レビュー重複を backlog ポインタへ統合 |
| **D-4A** | （commit なし） | — | 実測・分類のみ。Repository 変更を伴わない |
| **D-4B** | `2aa26ae` | `docs(context): remove obsolete and redundant notes from phase completion record` | §8 内の陳腐化・冗長な付記を除去 |
| **D-4C** | （commit なし） | — | 削除可能性の証明のみ。Repository 変更を伴わない |
| **D-4D** | `b57076d` | `docs(context): remove phase completion fact records` | §8 内の 7 つの Fact セクション本体を削除 |

Decision 帰属（内容照合）: Unit C・D-1・D-2・D-3・D-4B・D-4D は Decision 3。Unit A・Unit B は Decision 2。

### 4.2 検証結果

| # | 検証 | 結果 |
|---|---|---|
| 1 | Unit A・Unit B（Decision 2）と Unit C・D-1〜D-4D（Decision 3）の `prompts/PROJECT_CONTEXT.md` 同時並行編集 | **0件**（時系列で分離） |
| 2 | Unit C の実施順序（§2.3 該当項目） | **PASS**（本系列内で最初の commit） |
| 3 | Unit C の配置先（§2.3 該当項目） | **PASS**（`docs/DESIGN_PRINCIPLES.md` の新規 DP として新設） |
| 4 | Unit C による `docs/DEVELOPMENT_STANDARD.md` への追加範囲（§2.3 該当項目） | **PASS**（参照行 1 箇所の更新のみ） |
| 5 | push 状態〔実測・本節作成時点〕 | 未実施（ahead 11 / behind 0） |

### 4.3 未実装・対象外・発見事項

| # | 内容 |
|---|---|
| 1 | §1.3 の該当項目に対する遵守確認記録が Repository 内に見当たらない。`632d72d` は `prompts/PROJECT_CONTEXT.md` §2 の 5 行中 2 行をポインタ化している |
| 2 | Current Phase の参照ポインタ（STANDARD_REFERENCE_PATHS／P0-B・P1 関連）が §9 のみを指しており、判断理由の所在（§8）まで到達しない |
| 3 | §2.3 の該当項目（重複範囲）は、本 Unit 群の実施過程で実測した結果、解消済みであることを確認した（Current Phase 側は D-1〜D-3、§8 側は D-4B・D-4D が対応） |
| 4 | `prompts/PROJECT_CONTEXT.md` §8 の見出しは `704b92d`（`docs(context): rename phase completion record to decision record`）により更新済み。Unit 1（別トピック）に属し、Decision 2・Decision 3 本体の実装 commit ではない |

### 4.4 状態

| 項目 | 状態 |
|---|---|
| **Decision 2**（Unit A・Unit B） | **実装済み** |
| **Decision 3**（Unit C・D-1〜D-4D） | **実装済み** |
| Unit 1（§8 見出しの「Decision記録」への同期・`704b92d`） | **完了**（別トピック。本節の対象外） |
| push | 〔実測・2026-08-06〕Decision 2・Decision 3 の全 commit が `origin/feat/nlp-input-panel-and-new-schema` へ到達済み（ahead 0 / behind 0） |
