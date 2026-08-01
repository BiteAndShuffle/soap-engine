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
| ③ | `docs/JSON_STANDARD.md` | JS-00 へ Canonical Requirement Class の名称と Lifecycle State との独立性を追加 | **完了**（P-3a） |
| ④ | `docs/DEVELOPMENT_STANDARD.md` §10 | F5 の明確化改訂 ／ §10.2・§10.3 の正規台帳化 ／ `Persona runtime connection` の登録 | **完了**（P-3a で §10.1 の列適用範囲を明確化 → commit `1963c72`。P-3b で §10.3 F5 本文の明確化・正規台帳化・登録・§10.5 新設 → commit `92b3a20`。詳細は §2.1） |
| ⑤ | `docs/DEVELOPMENT_STANDARD.md` §7 | Documentation Map へ Core / Appendix を追加（F-5 の DP 範囲修正を同梱） | 未着手 |
| ⑥ | `docs/feature-glossary.md` | **主変更**: 概念③の Canonical Requirement / Lifecycle State 2 軸化 ／ 旧 Q1 適用記述と「Phase 2 まで均一化しない」の撤回<br>**付随する事実訂正**: 概念②の現行 `PERSONA_PROFILES` を 4 種へ（`lib/applyPersona.ts` の現行実装事実への追随。**Persona Project の将来人格数・軸・最終仕様を確定する変更ではない**） | **完了**（P-2） |
| ⑦ | `docs/VALIDATOR_STANDARD.md` §5 | 昇格根拠を Canonical Requirement 由来へ差し替え | 未着手 |
| ⑧ | `prompts/vNext/PN7-Cross-Reference-Audit.md` item R | 判定根拠を F5 から JS-A へ付け替え | 未着手 |
| ⑨ | `lib/types.ts` persona JSDoc | 2 軸表記へ改訂（**型定義そのものは変更しない**） | 未着手 |
| ⑩ | `prompts/vNext/STARTUP_PROMPT.md` | **OD-R4 により実装方式が置換され、OD-R4 の下位設計工程へ責務移管された**（§6.1） | **責務移管（本記録上は完了扱い）** |
| ⑪ | `prompts/PROJECT_CONTEXT.md` §5 | 3 概念の最小限の区別と Core へのポインタ | 未着手 |
| ⑫ | MEMORY（Repository 外） | 矛盾記述の訂正とポインタ化 | 未着手 |

### 2.1 P-3b への引き継ぎ事項（節番号の所在・2026-08-01 実測）

〔実測〕**`F5` という ID は `docs/DEVELOPMENT_STANDARD.md` §10.3（Future Expansion 成立条件 F1〜F5）に存在し、§10.1 には存在しない。**

§10.1 にあるのは 5 状態テーブルの「Validator・必須ゲートの対象か」列・**Future Expansion 行**の「FAIL 条件にしてはならない」という同等の記述である（`docs/PERSONA_PROJECT_APPENDIX.md` §6.2 も PP-NP-2 の誤解起点として §10.1 のこの記述を挙げている）。

| 節 | 記述 | 状態 |
|---|---|---|
| §10.1 Future Expansion 行 ＋ 直後の注記 | 「FAIL 条件にしてはならない」の**適用範囲** | **P-3a で明確化済み**（commit `1963c72`） |
| §10.3 F5 本文 | 「Validator / 監査工程の FAIL 条件になっていない」 | **P-3b で明確化済み**（commit `92b3a20`） |

④「F5 の明確化改訂」は、この 2 節にまたがった。**両節とも完了済み。**

**P-3b 実施結果（commit `92b3a20` ／ `docs/DEVELOPMENT_STANDARD.md` 1 件・107 insertions / 2 deletions）**

| # | 実施内容 |
|---|---|
| 1 | **§10.2 / §10.3 を正規台帳として定義**（「本表に存在しない資産は当該状態ではない」／未確定・確認未完了は §10.5 で公告） |
| 2 | **`Persona runtime connection` を §10.3 の Future Expansion 資産として登録**（canonical field `module.persona` ではない旨を行内明記） |
| 3 | **§10.3 F5 の適用範囲を明確化**（canonical field の必須性を免除する条件ではない。F5 の意味は変更していない） |
| 4 | **§10.5 Lifecycle Classification Pending を新設**（第 6 の Lifecycle State ではない／Future Expansion・Legacy の下位分類ではない／governance 上の状態である） |
| 5 | **GG-1 / GG-3 を §10.5 へ Pending 登録**（Lifecycle State は確定していない） |
| 6 | §10.1 に「ファイル内の状態表示と正規台帳の関係」を追加（自己表示単独では確定しない／正規台帳への登録で確定する） |

P-3b では Experimental 資産の台帳不在および旧体系 16 ファイルの状態未表示について、**判断・登録・修正のいずれも行っていない。**

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
| 2 | `docs/feature-glossary.md` L94-96（「Phase 2 の設計確定まで均一化は行わない」）が撤回されている | **充足**（§2 の ⑥ 完了 / P-2） |
| 3 | 補完値の出典が `prompts/vNext/PN5-Non-Scenario.md` の fallback 既定値であることを確認した | **充足**（Appendix §5.3） |
| 4 | 対象 2 module の bridge に persona 構造の記載がないことを再確認した | **充足**（Appendix §4.4） |

### 対象

| module | 状態 |
|---|---|
| `dm_insulin_regular` | **完了**（P-4 / commit `54dda6e`） |
| `dm_insulin_intermediate` | **完了**（P-4 / commit `54dda6e`） |

### 実施結果（2026-08-01 / P-4）

**commit**: `54dda6e` `fix(modules): backfill persona for two modules predating PN5 rule (F-4b)`（canonical JSON 2 件のみ・28 insertions / 0 deletions）

| 観点 | 結果 |
|---|---|
| 補完値 | `prompts/vNext/PN5-Non-Scenario.md`「persona セクション（必須）」の fallback 既定値。両 module とも逐語一致 |
| 変更範囲 | **`persona` 追加のみ。** パース後のキー集合・値を HEAD と比較し、追加キー `persona` のみ・削除 0・値変更 0 を確認。既存行の再フォーマットなし |
| 配置 | `defaults` 直後（JS-A Pattern A）。top-level key 順序は既存 module と完全一致 |
| `PP-D-1` | `dm_insulin_mixed_rapid_long` は **未変更**（差分 0 件） |

**完了条件の判定**

| # | 条件 | 結果 |
|---|---|---|
| 1 | 対象 2 module に `persona` が存在する | **充足** |
| 2 | 全 module で `MISSING_PERSONA` が 0 件 | **充足**（2 → **0**） |
| 3 | Validator warning 総数が 20 → 18 | **充足**（20 → **18**。defect class 6 → **5**。ERROR は **0 を維持**） |
| 4 | `tsc` / `npm test` / `npm run audit` が baseline を維持 | **充足**（tsc PASS ／ test 2705 pass・0 fail ／ audit 2 系統とも 35 件 PASS ／ `npm run build` 成功） |
| 5 | 既存 module の PN5 fallback 形と一致（検算） | **充足**（fallback 形 32 → **34**、欠落 **0**、別形状 1 = PP-D-1 のみ） |

**未着手**: P-3a〜P-3d（§2 の ③ / ④ / ⑤ / ⑦ / ⑧ / ⑨ / ⑪）／ `MISSING_PERSONA` の severity 昇格（§4）／ **push**

### 補完値・根拠

値の出典と遡及適用としての性格は **Appendix §5.3** を参照。**他 module との一致は検算であり、値の出典ではない。**

### 実行順序（2026-08-01 確定）

**F-4b は §2 の文書改訂群の完了を待たず、⑥（`docs/feature-glossary.md` の整合）完了直後に先行実施する。**

| # | 根拠 |
|---|---|
| 1 | F-4b の直接依存は上記「開始条件」の 4 件のみであり、そのうち未充足は #2（⑥ に帰属）だけである |
| 2 | 文書アーキテクチャ整合で想定外が発生しても、canonical data defect の解消を止める必要がない |
| 3 | F-4b と文書整合を別責務・**別 commit** として維持できる |
| 4 | `MISSING_PERSONA` = 0 を早期に確定できる |

**F-4b の変更を §2 の文書改訂と同一 commit へ混ぜてはならない。**

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

**いずれについても、本作業で Disposition（Lifecycle State）を確定させない。**

**ただし GG-1 / GG-3 は、OD-P9-c（§10.2 / §10.3 を網羅的な正規台帳とする）の帰結として、§2 の ④ で Lifecycle Classification Pending へ「分類保留」として公告する**（§6.2）。**公告は保留事実の記録であり、Lifecycle 台帳への登録でも Disposition の確定でもない。**

| ID | 内容 | 扱い |
|---|---|---|
| **GG-1** | **NLP 経路の Lifecycle 登録漏れ。** `docs/feature-glossary.md` の NLP生成 節が Future Expansion を自称するが、`docs/DEVELOPMENT_STANDARD.md` §10.3 の登録表に存在しない〔実測〕 | **§2 の ④ で Lifecycle Classification Pending へ公告する**（§6.2）。**NLP 経路の Disposition 確定・§10.3 への登録は本作業では行わない** |
| **GG-2** | **`docs/reviews/` が `docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map に登録されていない**〔実測: 該当 0 件〕。本記録はこの未登録の層に配置されている | **本作業へ混ぜない。** §2 の ⑤（§7 改訂）を実施する際に、`docs/reviews/` を層として登録するか否かの判断が必要になる |
| **GG-3** | **`prompts/vNext/PN7-Cross-Reference-Audit.md` item S の `composition.sMergePolicy` が「Owner Decision Required であり Future Expansion / Legacy いずれとも確定していない」として FAIL 対象外に置かれている**〔実測〕。Lifecycle 台帳にも未登録 | **本作業では Lifecycle State を確定しない。** §2 の ④ で **Lifecycle Classification Pending へ記録するのみ**（§6.2） |
| **PP-D-1** | `dm_insulin_mixed_rapid_long` の persona が PN5 fallback とも bridge とも異なる形状を持つ〔実測〕 | F-4b とは別の未説明 drift。別途起票（Appendix §5.3） |

> **GG-1 / GG-3 の扱い（2026-08-01 確定）**: 両者は §2 の ④ で新設する **Lifecycle Classification Pending**（§6.2）へ記録する。**記録は「分類または成立条件確認が未完了である」という事実の公告にとどまり、本作業で両者の Lifecycle State を確定させてはならない。**
>
> GG-3 の ID は本記録（P-0）で既存 GG 系列に倣って採番した。Owner の指定 ID がある場合はそれに従う。

---

## 6. Owner 判断事項

| ID | 判断事項 | ブロック対象 |
|---|---|---|
| **OD-P9**（確定済） | Lifecycle 台帳の 4 要素を確定する（詳細は下表） | ④ |
| **OD-P10**（確定済） | F-5 を §2 の ⑤ へ同梱する。commit 責務は ④ / ⑤ で分ける | ⑤ |
| **OD-P11**（**OD-R4 により置換**） | 〔旧〕`STARTUP_PROMPT.md` の必読リストへ Core を無条件追加する → **要件は維持、実装方式のみ置換（§6.1）** | ⑩ |
| **OD-P12**（確定済） | F5 の明確化改訂を実施する（論理矛盾の修正ではなく誤読防止のための明確化として記録する） | ④ |
| **OD-P13**（確定済） | 既存テストは削除せず期待値を更新する | 手順 4-5 |

**新規の未解決事項は現時点で存在しない。**

### 6.0 OD-P9 — Lifecycle 台帳の 4 要素（確定済）

> **本項は新規判断ではない。** 本判断は Core 作成時点で Owner により確定していたが、Repository 上に確定記録が欠けていた。**本記録は記録漏れの補完である。**

| # | 確定内容 | 既存の記録箇所 |
|---|---|---|
| **P9-a** | **Lifecycle 台帳の登録単位は「機能 / 経路 / 実装資産」である** | `docs/PERSONA_PROJECT_PRINCIPLE.md` §0.5 / §4.2 |
| **P9-b** | **canonical field 単体は Lifecycle 台帳へ登録しない** | 同 §0.5 / §4.2 ／ `docs/PERSONA_PROJECT_APPENDIX.md` §5.2 |
| **P9-c** | **`docs/DEVELOPMENT_STANDARD.md` §10.2 / §10.3 は、当該 Lifecycle State に属する資産を網羅する正規台帳である** | **記録なし（本記録で補完）** |
| **P9-d** | **`Persona runtime connection` は Future Expansion 資産として §10.3 の登録対象である** | `docs/PERSONA_PROJECT_PRINCIPLE.md` §0.5 |

**P9-c の帰結**: §2 の ④ は分割せず、**F5 明確化 ／ 正規台帳化 ／ `Persona runtime connection` の登録を一体として実施する。**

### 6.1 OD-P11 の置換と ⑩ の責務移管（確定済）

**OD-P11 は撤回されていない。要件と実装方式を分離し、実装方式のみが上位判断により置換された。**

| 層 | 内容 | 帰属 |
|---|---|---|
| **維持される要件** | **Persona Core は、必要な作業から再現可能に到達できなければならない** | **Persona 責務（有効）** |
| **置換された実装方式** | `prompts/vNext/STARTUP_PROMPT.md` の無条件必読リストへ追加すること | **OD-R4 により置換** |
| **移管先** | OD-R4（Base + Overlay）の下位設計 — Base の範囲 ／ Overlay の分割単位 ／ トリガー記法 ／ Overlay 未該当時の既定動作 | **Repository 全体トラック** |

**⑩ の Disposition は「上位判断による置換と責務移管」である。**

- **⑩ を §2 の対象から削除しない**
- **⑩ を未決へ戻さない**
- **本記録をもって、§2 における ⑩ の責務は完了扱いとする**

〔参考〕Core §8.5 が定める Core への到達経路 4 本のうち、`docs/DEVELOPMENT_STANDARD.md` §7（⑤）・`prompts/PROJECT_CONTEXT.md` §5（⑪）・MEMORY（⑫）の 3 本は §2 の範囲で確保される。`STARTUP_PROMPT.md` の 1 本のみが OD-R4 下位設計へ移る。

### 6.2 Lifecycle Classification Pending の位置づけ（確定済）

§2 の ④ で、`docs/DEVELOPMENT_STANDARD.md` §10 に **Lifecycle Classification Pending（Lifecycle 分類保留台帳）** を新設する。

**構造**

| 対象 | 配置先 |
|---|---|
| Lifecycle State が**確定済み**の資産 | 対応する正規台帳（§10.2 Legacy ／ §10.3 Future Expansion） |
| Lifecycle State が**未確定**、または**正式登録に必要な成立条件の確認が未完了**の資産 | **Lifecycle Classification Pending** |

**性格（誤読防止のため明記する）**

Lifecycle Classification Pending は、

- **第 6 の Lifecycle State ではない**
- **Future Expansion の下位分類ではない**
- **Legacy の下位分類ではない**
- **分類または成立条件確認が未完了であることを管理する governance 上の状態である**

**登録対象（本作業の範囲）**

| ID | 対象 | 保留理由 |
|---|---|---|
| **GG-1** | NLP 経路 | `docs/feature-glossary.md` 上では Future Expansion と表記されているが、正規台帳登録に必要な確認・整理が未完了 |
| **GG-3** | `composition.sMergePolicy`（`PN7` item S） | Owner Decision Required であり、Future Expansion / Legacy のいずれとも未確定 |

**本作業では GG-1 / GG-3 の Lifecycle State を確定しない。** 記録は保留事実の公告にとどめる（`docs/DESIGN_PRINCIPLES.md` DP-15）。

**配置案**: **`docs/DEVELOPMENT_STANDARD.md` §10.5 として末尾へ追加する。**

| 検討した配置 | 判定 |
|---|---|
| **§10.5（末尾追加）** | **採用。** 〔実測〕外部からの §10 参照は `§10` / `§10.1` / `§10.2` / `§10.3` のみで **`§10.4` を指す参照は 0 件**。末尾追加は既存参照を一切壊さない |
| §10.3b（枝番） | **不採用。** Future Expansion の下位分類と誤読される。上記「性格」と正面から衝突する |
| §10.4 へ挿入し体系移行を §10.5 へ繰り下げ | **不採用。** 節番号の再採番にあたる（`prompts/RULES.md` §19 ／ `docs/DESIGN_PRINCIPLES.md` DP-06 ／ Core「節番号の欠番について」の欠番運用に反する） |

### 6.3 F-4b の実行順序（確定済）

**F-4b は §2 の文書改訂群の完了を待たず、⑥ 完了直後に先行実施する。** 詳細と根拠は §3「実行順序」を参照。**F-4b の変更を §2 の文書改訂と同一 commit へ混ぜてはならない。**

---

## 7. 作業状態（2026-08-01 時点 / P-4 実施時）

| 項目 | 状態 |
|---|---|
| Document Unit 1（Core / DP-16） | **完了**（commit `7fce221`） |
| 文書分割（Core / Appendix / 実行記録） | **完了**（commit `7fce221`） |
| **P-0（Owner Decision の記録）** | **完了**（commit `b8511e0`）。本記録の §3 実行順序 / §5 GG-3 / §6.0〜§6.3 が該当 |
| **P-1（MEMORY 整合 ＝ ⑫）** | **完了**（Repository 外のため commit なし） |
| **P-2（`docs/feature-glossary.md` 整合 ＝ ⑥）** | **完了**（commit `10cd103`） |
| **P-4（F-4b）** | **完了**（commit `54dda6e`）。検証結果は §3「実施結果」 |
| **P-3a（2 軸の確立 ＝ ③ ＋ §10.1 明確化）** | **完了**（commit `1963c72`）。`JSON_STANDARD` JS-00 に Canonical Requirement Class と 2 軸の直交性を定義／`DEVELOPMENT_STANDARD` §10.1 に「Validator・必須ゲートの対象か」列の適用範囲注記を追加 |
| **P-3b（Lifecycle 正規台帳化 ＝ ④）** | **完了**（commit `92b3a20` `docs(standard): define lifecycle ledgers as authoritative and add classification pending`）。実施内容は §2.1「P-3b 実施結果」 |
| §2 の ⑩ | **責務移管により完了扱い**（§6.1） |
| §2 の ⑤ / ⑦ / ⑧ / ⑨ / ⑪（＝ P-3c / P-3d） | **未着手** |
| F-4b | **完了**（§3「実施結果」）。`MISSING_PERSONA` 0 件 ／ warning 20 → 18 |
| `MISSING_PERSONA` 昇格 | **未着手**（開始条件 1「§2 の文書改訂完了」が未充足） |
| GG-1 / GG-3 | Lifecycle Classification Pending へ記録予定（§6.2）。**Lifecycle State は確定しない** |
| GG-2 / PP-D-1 | 未着手（本作業の対象外） |
| push | **未実施**（`7fce221` / `b8511e0` / `10cd103` / `54dda6e` はいずれも remote 未反映） |

**本記録の凍結時、§5 の未処理事項は本記録とともに凍結してはならない。** 別管理へ移す必要がある。移動先・管理方法は本記録では決めない。
