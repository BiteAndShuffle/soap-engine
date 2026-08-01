# Persona Project — 文書整合・F-4b・severity 昇格 実行記録

作成: 2026-08-01 ／ 基準 commit: `21c9b6d`

---

## 0. 本記録の性格

本記録は**時点付きの実行記録**である。

| 項目 | 内容 |
|---|---|
| **正本ではない** | 設計思想・判断規則の正本は `docs/PERSONA_PROJECT_PRINCIPLE.md`（Core）。実測・詳細反証の参照資料は `docs/PERSONA_PROJECT_APPENDIX.md`（Appendix） |
| **責務** | 今回の文書整合・F-4b・severity 昇格へ至る**手順・順序・開始条件・完了条件・作業状態**を記録する |
| **前提** | Core と Appendix を前提として成立する。**Core / Appendix は本記録なしで成立する** |
| **失効** | 記録した作業が完了した時点で、本記録は履歴となる。**本記録の失効は Core / Appendix の有効性に影響しない** |
| **禁止** | 本記録に設計判断を新設しない。判断が必要な場合は Core へ昇格させるか Owner 判断を仰ぐ |

---

## 1. 作成時点における文書整合の状態

> 出自: 旧 `PERSONA_PROJECT_PRINCIPLE.md` §0.6

Core は、関連文書の改訂に先行して作成された。**作成時点では、次の記述が Core と矛盾した状態で存在する**〔実測 / HEAD `21c9b6d`〕。

| 箇所 | 現在の記述 | 予定 |
|---|---|---|
| `docs/DEVELOPMENT_STANDARD.md` §10.3 F5 | 「Validator / 監査工程の FAIL 条件になっていない」 | **明確化改訂**（§4 の ④） |
| `docs/feature-glossary.md` L94-96 | 「Phase 2 の設計確定まで均一化は行わない」 | **撤回**（§4 の ⑥） |
| `prompts/vNext/PN7-Cross-Reference-Audit.md` item R | 「persona は Future Expansion であり §10 の F5 に該当する」「欠落 → FAIL としない」 | **判定根拠の付け替え**（§4 の ⑧） |
| `lib/types.ts:810` | 「Phase 2 で Runtime 接続予定の予約枠（Future Expansion）」 | **2 軸表記へ改訂**（§4 の ⑨） |

**改訂前の現状と、改訂後の予定を混同しないこと。** 上記が未改訂である間は、Core と当該記述が併存する。

---

## 2. 文書改訂の対象と順序

> 出自: 旧 `PERSONA_PROJECT_PRINCIPLE.md` §8.6

**Core の単独作成では機能しない。** 次の 12 対象を一体として整合させる。

| 順 | 対象 | 主な変更 | 状態 |
|---|---|---|---|
| ① | `docs/PERSONA_PROJECT_PRINCIPLE.md` | 新規作成（Core） | **完了** |
| ①' | `docs/PERSONA_PROJECT_APPENDIX.md` | 新規作成（Appendix） | **完了** |
| ①'' | `docs/reviews/persona/PERSONA_DOC_ALIGNMENT_2026-08-01.md` | 新規作成（本記録） | **完了** |
| ② | `docs/DESIGN_PRINCIPLES.md` | DP-16 新設 | **完了** |
| ③ | `docs/JSON_STANDARD.md` | JS-00 へ Canonical Requirement Class の名称と Lifecycle State との独立性を追加 | 未着手 |
| ④ | `docs/DEVELOPMENT_STANDARD.md` §10 | F5 の明確化改訂 ／ §10.2・§10.3 の正規台帳化 ／ `Persona runtime connection` の登録 | 未着手 |
| ⑤ | `docs/DEVELOPMENT_STANDARD.md` §7 | Documentation Map へ Core / Appendix を追加（F-5 の DP 範囲修正を同梱） | 未着手 |
| ⑥ | `docs/feature-glossary.md` | 概念③の 2 軸表記化 ／ L94-96 の撤回 | 未着手 |
| ⑦ | `docs/VALIDATOR_STANDARD.md` §5 | 昇格根拠を Canonical Requirement 由来へ差し替え | 未着手 |
| ⑧ | `prompts/vNext/PN7-Cross-Reference-Audit.md` item R | 判定根拠を F5 から JS-A へ付け替え | 未着手 |
| ⑨ | `lib/types.ts` persona JSDoc | 2 軸表記へ改訂（**型定義そのものは変更しない**） | 未着手 |
| ⑩ | `prompts/vNext/STARTUP_PROMPT.md` | 必読リストへ Core を無条件追加 | 未着手 |
| ⑪ | `prompts/PROJECT_CONTEXT.md` §5 | 3 概念の最小限の区別と Core へのポインタ | 未着手 |
| ⑫ | MEMORY（Repository 外） | 矛盾記述の訂正とポインタ化 | 未着手 |

### 改訂完了条件

| # | 条件 |
|---|---|
| 1 | 新規セッションが必読 4 文書のみを読んだ場合に、PP-NP-1〜PP-NP-5 のいずれにも到達しない |
| 2 | `MISSING_PERSONA` の昇格根拠が文書側に確定している |
| 3 | canonical field に Lifecycle State を付与している箇所が 0 件 |

---

## 3. F-4b — 2 module の persona 補完

> 出自: 旧 `PERSONA_PROJECT_PRINCIPLE.md` §7.5

### 開始条件

| # | 条件 | 状態 |
|---|---|---|
| 1 | Core が正本として配置されている | **充足**（§2 の ①） |
| 2 | `docs/feature-glossary.md` L94-96（「Phase 2 の設計確定まで均一化は行わない」）が撤回されている | **未充足**（§2 の ⑥） |
| 3 | 補完値の出典が `prompts/vNext/PN5-Non-Scenario.md` の fallback 既定値であることを確認した | **充足**（Appendix §5.3） |
| 4 | 対象 2 module の bridge に persona 構造の記載がないことを再確認した | **充足**（Appendix §4.4） |

### 対象

| module | 状態 |
|---|---|
| `dm_insulin_regular` | 未着手 |
| `dm_insulin_intermediate` | 未着手 |

### 補完値・根拠

値の出典と遡及適用としての性格は **Appendix §5.3** を参照。**他 module との一致は検算であり、値の出典ではない。**

### 完了条件

| # | 条件 |
|---|---|
| 1 | 対象 2 module の canonical JSON に `persona` が存在する |
| 2 | 全 module で `MISSING_PERSONA` の検出が 0 件 |
| 3 | Validator warning 総数が 20 → 18 になる |
| 4 | `npx tsc --noEmit` / `npm test` / `npm run audit` が baseline を維持 |
| 5 | 既存 32 module の PN5 fallback 形と形状が一致する（検算） |

---

## 4. `MISSING_PERSONA` の WARN → ERROR 昇格

> 出自: 旧 `PERSONA_PROJECT_PRINCIPLE.md` §5.4（手順部分）／ §7.5

**ERROR という分類の意味・build 停止との関係は `docs/PERSONA_PROJECT_APPENDIX.md` §5.4 を参照。** 本節は手順のみを扱う。

### 開始条件

| # | 条件 | 状態 |
|---|---|---|
| 1 | §2 の文書改訂（正本文書と関連文書の整合）が完了している | **未充足** |
| 2 | F-4b が完了している | **未充足** |
| 3 | 全 module で `MISSING_PERSONA` の検出が 0 件である | **未充足** |
| 4 | `tests/moduleValidator.test.ts` の既存テストを期待値更新する方針が確定している（削除・skip しない） | **充足**（OD-P13） |

### 手順

| # | 手順 | 完了判定 |
|---|---|---|
| **1** | **正本文書と関連文書の整合** | §2 の改訂が完了していること |
| **2** | **2 module の補完**（F-4b） | §3 の完了条件を満たすこと |
| **3** | **`MISSING_PERSONA` = 0 の確認** | 全 module に `validateModule` を実行し検出 0 件 |
| **4** | **severity 昇格** | `lib/moduleValidator.ts` の `isWarning: true` → `false`。同箇所のコメント（「既存 2 モジュールが未充足のため現時点は WARN」）を更新。`docs/VALIDATOR_STANDARD.md` Appendix を WARN → ERROR |
| **5** | **壊した fixture で ERROR を確認** | 下記 |

### 手順 5 で検証する内容

- `errorCode` = `MISSING_PERSONA`
- `isWarning` = `false`
- 対象フィールドが `persona`
- **欠落していない fixture では検出されないこと**

### 既存テストの扱い（OD-P13 確定）

〔実測〕`tests/moduleValidator.test.ts:239` に「`MISSING_PERSONA` は警告（`isWarning: true`）として返る」というテストが存在し、コメントで昇格予定を明記している。

| 方針 | 内容 |
|---|---|
| **削除しない** | 現在の severity を固定する**正当な回帰テスト**であり、ERROR 昇格後も同じ責務を維持できる |
| **skip / 期待値緩和を禁止** | 予定されていた状態遷移をそのまま反映する方が追跡しやすい |
| **期待値を更新** | `isWarning: false` を期待する形へ |
| **コメントを更新** | 旧「F-4b 完了後に ERROR へ昇格予定」→ 新「F-4b 完了後、canonical 完成条件の欠落として ERROR へ昇格済み」 |

> **手順を飛ばさないこと。** 特に手順 1 を飛ばして手順 4 を実行すると、`prompts/vNext/PN7-Cross-Reference-Audit.md` item R および `docs/feature-glossary.md` と実装が矛盾する。

---

## 5. 別途対応が必要な governance gap

> 出自: 旧 `PERSONA_PROJECT_PRINCIPLE.md` §8.7 ＋ 文書設計レビューで新規検出

**いずれも本作業には混ぜない。所在のみ記録する。**

| ID | 内容 | 扱い |
|---|---|---|
| **GG-1** | **NLP 経路の Lifecycle 登録漏れ。** `docs/feature-glossary.md` の NLP生成 節が Future Expansion を自称するが、`docs/DEVELOPMENT_STANDARD.md` §10.3 の登録表に存在しない〔実測〕 | **本作業へ混ぜない。** ただし §10.2 / §10.3 を網羅的な正規台帳として定義する場合（§2 の ④）、GG-1 は別途処理対象になる。NLP 経路の Disposition・台帳登録は本作業では行わない |
| **GG-2** | **`docs/reviews/` が `docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map に登録されていない**〔実測: 該当 0 件〕。本記録はこの未登録の層に配置されている | **本作業へ混ぜない。** §2 の ⑤（§7 改訂）を実施する際に、`docs/reviews/` を層として登録するか否かの判断が必要になる |
| **PP-D-1** | `dm_insulin_mixed_rapid_long` の persona が PN5 fallback とも bridge とも異なる形状を持つ〔実測〕 | F-4b とは別の未説明 drift。別途起票（Appendix §5.3） |

---

## 6. 未解決の Owner 判断事項

| ID | 判断事項 | ブロック対象 |
|---|---|---|
| **OD-P10**（確定済） | F-5 を §2 の ⑤ へ同梱する。commit 責務は ④ / ⑤ で分ける | ⑤ |
| **OD-P11**（確定済） | `STARTUP_PROMPT.md` の必読リストへ Core を無条件追加する | ⑩ |
| **OD-P12**（確定済） | F5 の明確化改訂を実施する（論理矛盾の修正ではなく誤読防止のための明確化として記録する） | ④ |
| **OD-P13**（確定済） | 既存テストは削除せず期待値を更新する | 手順 4-5 |

**新規の未解決事項は現時点で存在しない。**

---

## 7. 作業状態（2026-08-01 時点）

| 項目 | 状態 |
|---|---|
| Document Unit 1（Core / DP-16） | **完了**（未 commit） |
| 文書分割（Core / Appendix / 実行記録） | **完了**（未 commit） |
| §2 の ③〜⑫ | 未着手 |
| F-4b | 未着手 |
| `MISSING_PERSONA` 昇格 | 未着手 |
| GG-1 / GG-2 / PP-D-1 | 未着手（本作業の対象外） |
| commit / push | **未実施** |

**本記録の凍結時、§5 の未処理事項は本記録とともに凍結してはならない。** 別管理へ移す必要がある。移動先・管理方法は本記録では決めない。
