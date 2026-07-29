# Stage 2-B Remediation — VALIDATOR_STANDARD 番号体系 補足調査記録

## 0. 文書の性格

本記録は Stage 2-B Remediation の実行中（S2B-R-U3）に判明した Repository 事実を記録する**補足調査記録**である。

- **Finding 台帳ではない。** `docs/reviews/P1_S2B_DISPOSITION.md` の Finding 台帳（AC-003〜AC-016）に新しい行を追加するものではなく、Finding ID（`AC-xxx`）を採番しない
- **`docs/reviews/P1_S2B_ARCHITECTURE.md`（v1.2 / FROZEN、commit `d41e76e`）を変更しない**
- **`docs/reviews/P1_S2B_DISPOSITION.md`（commit `9b92399`）を変更しない**。S2-CHECK-1 時点の記録として保持する
- 本記録は事実の記録のみを目的とし、番号体系をどう修正するかの決定は行わない（§8 参照）

---

## 1. 調査メタデータ

| 項目 | 値 |
|---|---|
| 基準コミット | `8f860fda34be891950f2599946cee69624d28b0e`（S2B-R-U2 完了時点） |
| 実施日 | 2026-07-29 |
| 担当 | Tier2（Sonnet） |
| 準拠計画 | `docs/reviews/P1_S2B_FIX_PLAN.md`（Stage 2-B Remediation） |
| 対象 Finding | AC-004（`docs/reviews/P1_S2B_DISPOSITION.md` 記載） |
| 本調査での Repository 変更 | なし（`docs/VALIDATOR_STANDARD.md` / `lib/moduleValidator.ts` とも Read・grep のみ） |

---

## 2. 発見の経緯

Stage 2-B Remediation の実行順序に従い、`S2B-R-U2`（`prompts/RULES.md` §1 の粒度統一）完了後、`S2B-R-U3`（`docs/VALIDATOR_STANDARD.md` 本文チェック表への errorCode 3 件追加）に着手した。

`docs/reviews/P1_S2B_FIX_PLAN.md` が定める S2B-R-U3 の「変更順序 ①」（`lib/moduleValidator.ts` で 3 コードの check 番号・`isWarning` を確認する）を実施した結果、`docs/VALIDATOR_STANDARD.md` の既存記載と `lib/moduleValidator.ts` の実装コメントの間に、AC-004 の Basis には記録されていない不整合が判明した。この時点で「変更順序 ②」（表への行追加）へ進まず STOP した。

---

## 3. VNUM-1〜VNUM-4（観測事実）

| ラベル | 対象 errorCode | doc 側の記載（`docs/VALIDATOR_STANDARD.md`） | source 側の実際（`lib/moduleValidator.ts`） | 実装行 | isWarning | Appendix との整合 |
|---|---|---|---|---|---|---|
| **VNUM-1** | `DISPLAY_GENERIC_NAME_MISSING` | §3-A「33」 | `// 3-dgn)` ブロック内。`33)` という番号コメントはソース中のどこにも存在しない | 426〜450行 | `false`（ERROR） | Appendix は ERROR / Structural と記載（doc の分類自体に誤りはない） |
| **VNUM-2** | `DISPLAY_GENERIC_NAME_EMPTY` | §3-A「34」 | 同上（`3-dgn` ブロック内） | 426〜453行 | `false`（ERROR） | 同上 |
| **VNUM-3** | `DISPLAY_GENERIC_NAME_SALT_COPY` | §3-A「35」 | 同上（`3-dgn` ブロック内） | 426行以降 | `false`（ERROR） | 同上 |
| **VNUM-4** | `STRUCTURED_ROLE_FORBIDDEN`（PStructured 分） | §3-B「31 ＝ —（check 29 の `STRUCTURED_ROLE_FORBIDDEN` へ統合処理と明記）」 | `// 31)`（1129行）という独立した番号コメントが現存し、`STRUCTURED_ROLE_FORBIDDEN` を出力する | 1129行 | `true`（WARN） | Appendix は 29 として 1 行のみ記載（31 という行はない） |

**VNUM-1〜3 の共通点**: `docs/VALIDATOR_STANDARD.md` が「33」「34」「35」という連番を割り当てている 3 つの errorCode は、いずれも `lib/moduleValidator.ts` 上では単一のコメントブロック `// 3-dgn)`（426行、「brandCatalog[brand].displayGenericName の必須化・旧コピーパターン検出」）の中で生成される。ソースコード自身は「33」「34」「35」という番号を一度も使用していない。

---

## 4. 番号体系の棚卸し結果

`docs/VALIDATOR_STANDARD.md` §3-A・§3-B の全 40 行（一意 errorCode 38 種）と、`lib/moduleValidator.ts` の全番号コメント（`3-dgn` を含め展開すると 43 errorCode）を突き合わせた結果は以下のとおり。

### 4.1 分類サマリ

| 分類 | 件数 | 内容 |
|---|---|---|
| 一致 | 30 項目 | 番号・errorCode とも doc と source で一致 |
| 粒度差（矛盾ではない） | 2 項目 | check 7（doc: 7a/7b/7c、source: `// 7)` 1 個）／check 17（doc: 17a/17b、source: `// 17)` 1 個） |
| 番号違い | 3 項目 | VNUM-1（33）／VNUM-2（34）／VNUM-4（31） |
| 欠番（真の欠落・本文表に行なし） | 3 項目 | `BRAND_DISPLAY_NAME_MISMATCH`（source: 13b）／`RESERVED_TAG_UNUSED`（source: 33）／`RESERVED_TAG_REACHABLE`（source: 34） |
| 欠番（実質包含・独立行なし） | 2 項目 | `SCENARIO_EXCLUSIVE_GROUP_INVALID`／`SCENARIO_COMBINABLE_INVALID`（check 12「他」に暗黙包含） |
| 重複（追記時に新規発生） | 2 項目 | 番号「33」「34」が `RESERVED_TAG_UNUSED`／`RESERVED_TAG_REACHABLE` 追記時に二重使用となる |

### 4.2 重複の詳細（AC-004 実行を妨げている核心）

| 番号 | 現在の doc 側割当 | source 側の真の所有者 | 結果 |
|---|---|---|---|
| **33** | §3-A: `DISPLAY_GENERIC_NAME_MISSING`（source 上の根拠は `3-dgn`。「33」という番号コメントは存在しない） | `RESERVED_TAG_UNUSED`（`// 33)`、1204行） | `RESERVED_TAG_UNUSED` を「33」として §3-B に追加すると、doc 内に「33」が 2 回出現する |
| **34** | §3-A: `DISPLAY_GENERIC_NAME_EMPTY`（同上） | `RESERVED_TAG_REACHABLE`（`// 34)`、1216行） | `RESERVED_TAG_REACHABLE` を「34」として §3-B に追加すると、doc 内に「34」が 2 回出現する |

**現時点の `docs/VALIDATOR_STANDARD.md` 単体には重複は存在しない**（33・34 とも doc 内では 1 回ずつしか使われていない）。重複が発生するのは、`docs/reviews/P1_S2B_FIX_PLAN.md` の S2B-R-U3 が指示するとおり、source の番号（33・34）をそのまま転記した**場合にのみ**である。

---

## 5. AC-004 への影響

`docs/reviews/P1_S2B_DISPOSITION.md` の AC-004 は、3 errorCode（`BRAND_DISPLAY_NAME_MISMATCH` / `RESERVED_TAG_UNUSED` / `RESERVED_TAG_REACHABLE`）の欠落を**一体の Finding**として記録し、Basis も 3 件をまとめて「修正対象として確定する」としている。

| errorCode | 独立追加の可否 | 根拠 |
|---|---|---|
| `BRAND_DISPLAY_NAME_MISMATCH`（source: 13b） | **番号衝突なく追加可能** | 「13b」は doc 内で未使用。VNUM-1〜4 のいずれとも独立している |
| `RESERVED_TAG_UNUSED`（source: 33） | **追加不能（現状のまま実行すると重複を生む）** | §4.2 のとおり「33」が既存行と衝突する |
| `RESERVED_TAG_REACHABLE`（source: 34） | **追加不能（同上）** | 「34」が既存行と衝突する |

Owner の判断により、**現時点では AC-004 を narrowing しない。`BRAND_DISPLAY_NAME_MISMATCH` の先行実行も行わない。AC-004 は未完了のまま維持する。**

---

## 6. Architecture / Disposition との関係

`docs/reviews/P1_S2B_ARCHITECTURE.md` §2.1 S1 は Scope を次のとおり固定している。

> 非 MATCH Finding **14 件全件**（AC-003〜AC-016）

VNUM-1〜VNUM-4 は、S2-CHECK-1（Source Baseline `445057b`）が調査した対象にも、Stage 2-B Disposition が記録した AC-003〜AC-016 のいずれにも含まれていない。**本記録が明らかにした事実は、現行 Stage 2-B Architecture v1.2 の Scope 外である。**

`docs/reviews/P1_S2B_ARCHITECTURE.md` §2.2 O4（S2-CHECK-1記録の Finding 内容の再判定禁止）には該当しない。AC-004 の Basis（S2-CHECK-1 調査時点での「3 errorCode が本文表に欠落している」という事実）自体は誤りではなく、STOP-B（事実誤認）の対象でもない。今回判明したのは、その修正を実行する際に**別の、より広範な問題（既存 2 行の番号表記の根拠不在）**が前提として存在する、という事実である。

Architecture・Disposition とも、本記録の作成によって変更されない。

---

## 7. 本記録で行わないこと

- Finding ID の採番（`AC-017` 等）
- 番号体系をどちらへ寄せるかの決定
- `docs/VALIDATOR_STANDARD.md` / `lib/moduleValidator.ts` / `lib/types.ts` の修正
- `docs/reviews/P1_S2B_ARCHITECTURE.md` / `docs/reviews/P1_S2B_DISPOSITION.md` の変更
- `S2B-R-U1`〜`S2B-R-U7` の実行・再開
- AC-011 への言及・変更

---

## 8. Owner Decision Required

以下は本記録が確定させず、Owner の判断を要する事項である。

- `docs/VALIDATOR_STANDARD.md` の check 番号体系を、`lib/moduleValidator.ts` の実装（`3-dgn` 等）へ合わせて修正するか。それとも文書固有の番号体系として維持し、実装コメントとの不一致を許容する規則を明文化するか。

- `RESERVED_TAG_UNUSED` / `RESERVED_TAG_REACHABLE` を本文チェック表へ追加する際の番号をどう扱うか（source どおり 33/34 とするか、別の番号を用いるか、番号なしで記載するか）。

- `STRUCTURED_ROLE_FORBIDDEN`（PStructured 分）について、doc の「check 31 は 29 へ統合済み」という記載と、source に `// 31)` が現存するという事実の不一致を、どの工程で解消するか。

- S2B-R-U3 が解消するまで、後続ユニット（S2B-R-U1・U4・U5・U6・U7）を停止するか、技術的依存がないことを根拠に並行して進めるか。

- 今回判明した事実（VNUM-1〜VNUM-4）を、Stage 2-B Architecture の版更新（Scope 拡張）で扱うか、Stage 2-B Remediation とは別の後続工程へ送るか。この判断が確定するまで、新規 Finding ID の採番は行わない。
