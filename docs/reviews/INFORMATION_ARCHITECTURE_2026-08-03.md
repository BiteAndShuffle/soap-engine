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
| **Decision 2**（Identity の集約と判断優先順位の移設） | **確定済み・未実装** |
| **Decision 3**（Fact / Decision / History の分類と権威関係） | **確定済み・未実装** |
