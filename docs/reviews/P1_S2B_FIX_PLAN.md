# Stage 2-B Remediation — Finding 修正実行計画

**工程名称**: Stage 2-B Remediation
**作成日**: 2026-07-29
**所属**: Phase 1 Architecture Consolidation / Stage 2
**先行ユニット**: Stage 2-B（判定 PASS WITH FINDINGS、記録 commit `9b92399`）
**本書の性格**: Stage 2-B が確定させた Finding の修正実行計画。計画のみを定め、修正の実施は含まない。

> **本工程は Stage 2-C ではない。** `docs/reviews/P1_S2B_ARCHITECTURE.md` §13 は Stage 2-C / OD-1 の責務を定義しないと規定している。本工程は Stage 2-B で確定した Finding を処理するものであり、**Stage 2-B Remediation** として扱う。本書は Stage 2-C の名称・責務・開始条件を一切定義しない。

---

## §0 Purpose

Stage 2-B（判定 PASS WITH FINDINGS、commit `9b92399`）が確定させた Disposition と、その後の Owner 判断（D-1 = C案 / D-2 = A案 / D-3 = B案、および Q-1〜Q-6 の確定判断）を、**実行可能で安全な修正ユニットへ分解し、修正順序・対象ファイル・検証方法・commit boundary を確定する**。

対象は Stage 2-B の非 MATCH Finding 14 件のうち、`ACCEPT` と判定された **AC-011 を除く 13 件**である。

---

## §1 Inputs / Baselines

| 名称 | 値 | 区分 |
|---|---|---|
| Architecture 正本 | `docs/reviews/P1_S2B_ARCHITECTURE.md`（v1.2 / FROZEN） | 【FACT】commit `d41e76e` |
| Disposition 記録 | `docs/reviews/P1_S2B_DISPOSITION.md`（判定 PASS WITH FINDINGS） | 【FACT】commit `9b92399` |
| Plan Baseline | `9b9239986548c83ce6675e6368107f2e62d542a9` | 【FACT】本計画作成時の `git rev-parse HEAD` |
| 着手時ワークツリー | 許可済み既存差分 4 件（`.claude/settings.local.json` M ／ `.claude/launch.json` ?? ／ `bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak` ?? ／ `docs/reviews/PHASE2_STAGE1_VERIFICATION_2026-07-25.md` ??） | 【FACT】`git status --short` 実測 |
| 参照規則 | `prompts/RULES.md` ／ `docs/DEVELOPMENT_STANDARD.md` ／ `docs/VALIDATOR_STANDARD.md` ／ `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` ／ `docs/IMPLEMENTATION_CHECKLIST.md` | 【FACT】全文確認済み |

**Execution Baseline**: 各ユニット実行時に着手時点の `git rev-parse HEAD` を実測して確定する。Plan Baseline に固定しない（先行ユニットの commit により HEAD が進むため）。

---

## §2 Owner Decisions

### 2.1 Disposition に関する判断（D-1 / D-2 / D-3）

| ID | 決定 | 内容 |
|---|---|---|
| **D-1** | **C案（粒度統一）** | `prompts/RULES.md` §1 の `lib/` をファイル単位列挙からディレクトリ単位へ変更。`app/` もディレクトリ単位で追加し、参照許可パスの粒度を統一する |
| **D-2** | **A案（入口層まで含める）** | `docs/DEVELOPMENT_STANDARD.md` §3 の記述範囲に入口層とビルド・配信設定を含める。`middleware.ts`（HTTP リクエストからアプリへの入口層）／`app/page.tsx`／`next.config.js`（ビルド・配信設定）を構成要素として扱う。**§3 を実装詳細の列挙にせず、全体の接続関係が分かる粒度で記載する** |
| **D-3** | **B案（Future Expansion）** | `build:static` / `EXPORT_STATIC` 経路を Future Expansion とする。再判断条件は次の 4 つのいずれかの発生時: ① 静的ビルドを配布方式として正式採用する ② 個人利用向け静的ビルドの公開・配布工程を実装する ③ SaaS 以外の配布形態を正式な運用対象にする ④ Next.js またはデプロイ構成の変更により EXPORT_STATIC 経路の再評価が必要になる |

### 2.2 実行方針に関する判断（Q-1 〜 Q-6・すべて確定済み）

| ID | 確定内容 |
|---|---|
| **Q-1** | **PN5 が persona の生成・確定責務を持つ。** PN2 は bridge 由来の persona が存在する場合のみ採用できるが、存在しなくてもよい。PN6 は Phase 5 成果物の persona を top-level へ配置する。**PN6 Step 1 の「Phase 2 から採用する一覧」から `persona` を除外する** |
| **Q-2** | **S2B-R-U4 の `.js` コメントと `.md` 文書は同一 commit に含める。** 実装ロジックの変更ではなく、同一のライフサイクル判断を 2 か所へ反映する変更であり、片方だけでは Future Expansion の状態定義が不完全になるため |
| **Q-3** | **文書のみのユニット（S2B-R-U1 / U2 / U3 / U5）には typecheck / test / build / audit を適用しない。** `git diff` / grep / 文書間整合確認 / 人間レビューで足りる。**ただし、文書中にコマンド名やファイル名を新たに記載する場合は、Repository 上に実在することを個別に確認する** |
| **Q-4** | **工程名称は Stage 2-B Remediation。Stage 2-C とはしない。** 計画文書は `docs/reviews/P1_S2B_FIX_PLAN.md`。実行ユニット ID は `S2B-R-U1` 〜 `S2B-R-U7`。計画文書は実装開始前に単独 commit する |
| **Q-5** | **S2B-R-U6**: Repository 内に Future Expansion または Legacy を示す明示的根拠がなければ **Experimental** とする。**S2B-R-U7**: 事前に状態を決めず、Repository 事実（ファイルコメント / git 履歴 / 関連 CSS / 認証関連文書 / 過去の参照履歴）を調査して判定する。根拠不足または Legacy 候補の場合は STOP して Owner へ報告する |
| **Q-6** | **`prompts/P2A.md` の独自リストは同期しない。** S2B-R-U2 は `prompts/RULES.md` のみを変更する。P2A のリストは P2A 工程固有の限定的参照範囲として維持する |

---

## §3 Finding-to-Unit Mapping

### 3.1 Finding ごとの修正方針

| Finding | 現在の問題 | Disposition | Owner 判断の影響 | 修正対象ファイル | 対象の節・シンボル | 期待する修正後状態 | 検証方法 | 依存 |
|---|---|---|---|---|---|---|---|---|
| **AC-003** | `persona` の出所が PN6 内部で不整合。PN6 Step 1（61行）は「Phase 2 からそのまま採用する」一覧に `persona` を含める一方、同 PN6「Phase 5 の以下をそのまま追加する」（133行）は `persona ← phase5 の persona を top-level へ配置` と記載し、「PN5 成果物の事前確認」（11〜14行）は `persona` 欠落時 MUST_STOP → PN5 差し戻しと定める | FIX / P-MED | **Q-1: PN5 を正とする。PN6 Step 1 の Phase 2 採用一覧から `persona` を除外する** | `prompts/vNext/PN6-Assembly.md` のみ | PN6 Step 1 の採用フィールド一覧（61行） | PN6 の 3 箇所（Step 1 / Phase 5 追加ブロック / 事前確認）がいずれも「persona は Phase 5 由来」で一貫する | grep による `persona` 出現箇所の全数確認、PN2 / PN5 との責務整合確認 | なし |
| **AC-004** | `docs/VALIDATOR_STANDARD.md` §3-A/§3-B の番号付き本文チェック表（40 行 → 一意 errorCode 38 種）に、実装・Appendix に存在する 3 errorCode の行がない | FIX / P-MED | なし | `docs/VALIDATOR_STANDARD.md` | §3-A（ERROR 表）／ §3-B（WARNING 表） | `BRAND_DISPLAY_NAME_MISMATCH`（ERROR / Structural）を §3-A へ、`RESERVED_TAG_UNUSED`・`RESERVED_TAG_REACHABLE`（WARN / Design Rule）を §3-B へ追加 | grep で 3 コードが §3-A/§3-B 本文表に出現。Appendix・`lib/moduleValidator.ts` との一致確認 | なし |
| **AC-005 / AC-006 / AC-007** | `lib/applyPlaceholder.ts` / `lib/isSReplacementEligible.ts` / `lib/jsonScenarioBuilder.ts` が `prompts/RULES.md` §1 の lib 個別列挙（15 件）に未収載 | FIX（D-1 により確定） | **D-1 = C案**。個別列挙の追加ではなく `lib/` のディレクトリ単位化により解消。**Q-6: `prompts/P2A.md` は非変更** | `prompts/RULES.md` のみ | §1 STANDARD_REFERENCE_PATHS「型・validator・runtime関連:」ブロック | `lib/` 1 行へ置換され、3 件の未収載が構造的に解消。`app/` が追加される | grep で個別 lib ファイル名が §1 から消えていることを確認 | なし |
| **AC-013 / AC-014** | `middleware.ts` / `next.config.js` が L4 Input 文書群に 0 件 | FIX（D-2 により確定） | **D-2 = A案**。§3 の記述範囲に入口層・ビルド／配信設定を含める。**AC-014 の記載内容は D-3（Future Expansion）の結論を反映する** | `docs/DEVELOPMENT_STANDARD.md` | §3 Architecture（ビルド時ブロック／実行時ブロック） | 実行時系統の起点に入口層（`middleware.ts` → `app/page.tsx`）が現れ、ビルド・配信設定として `next.config.js` が位置づけられる。実装詳細の列挙にしない | grep で 3 ファイル名が §3 に出現。粒度は人間レビュー | **AC-015 と同一節。S2B-R-U4 の結論に依存** |
| **AC-015** | §3 が `buildSoap.ts` / `soapComposer.ts` を一体の SOAP 生成ステップとして記述するが、実装では `DashboardClient` が `buildSoap.ts` + `applyPersona.ts` を直接 import し、`soapComposer.ts` は `createSoapFromInput.ts` からのみ import される | FIX / P-MED | なし（D-2 と同一節） | `docs/DEVELOPMENT_STANDARD.md` | §3 実行時ブロック「SOAP生成（buildSoap.ts / soapComposer.ts …）」行 | 手動入力経路と NLP 経路の別が §3 の粒度で表現される | grep で該当行の変更を確認 | **AC-013 / AC-014 と同一節** |
| **AC-016** | `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` が実在し `prompts/RULES.md` 879行から参照されるが、§7 Documentation Map から到達不能 | FIX / P-LOW | なし | `docs/DEVELOPMENT_STANDARD.md` | §7 Documentation Map の表 | Map に行が追加され到達可能になる | grep で §7 に `PRODUCT_VARIANT_SEPARATION_PRINCIPLE` が出現することを確認 | 同一ファイル（§7）だが §3 とは別節 |
| **AC-008 / AC-009** | `scripts/verify_addon_panel.ts` / `scripts/verify_buildS.ts` が `package.json` 未登録・被参照 0 件でライフサイクル状態の表示を持たない | FIX / P-LOW | **Q-5: 明示的根拠がなければ Experimental** | `scripts/verify_addon_panel.ts` ／ `scripts/verify_buildS.ts` | 各ファイル冒頭の JSDoc ブロック | §10.1 に基づく状態表示が付与される | grep で状態表示の存在確認。`npx tsc --noEmit` | なし |
| **AC-010** | `scripts/build-static.js` の目的・出力・実行タイミングが L4 文書群に 0 件。位置づけ未確定 | FIX（D-3 により確定） | **D-3 = B案（Future Expansion）**。§10.3 F1〜F5 の充足が必要（F3 = 再判断条件は Owner が確定済み）。**Q-2: `.js` と `.md` を同一 commit** | `scripts/build-static.js` ／ `docs/DEVELOPMENT_STANDARD.md` | `build-static.js` 冒頭 JSDoc ／ DEVELOPMENT_STANDARD の該当節 | F1〜F5 を充足する Future Expansion 表示が付与される | grep で状態表示・再判断条件の存在確認。F1〜F5 の逐条確認 | **AC-014（§3 の next.config.js 記述）が本結論に依存** |
| **AC-012** | `app/components/LockGate.tsx` が import 元 0 件でライフサイクル状態の表示を持たない | FIX / P-LOW | **Q-5: 事前に状態を決めず、Repository 事実で判定。根拠不足または Legacy 候補なら STOP** | `app/components/LockGate.tsx` のみ | ファイル冒頭（`'use client'` 直下） | §10.1 に基づく状態表示が付与される | grep で状態表示の存在確認。`npx tsc --noEmit` / `npm run build` | なし |
| **AC-011** | — | **ACCEPT** | — | **修正対象外** | — | 現状維持 | — | **本計画では一切扱わない** |

### 3.2 Finding → Unit 対応

| Unit | 対象 Finding | 件数 | 変更種別 |
|---|---|---|---|
| **S2B-R-U1** | AC-003 | 1 | 文書（prompts/vNext） |
| **S2B-R-U2** | AC-005 / AC-006 / AC-007 | 3 | 文書（prompts/RULES.md） |
| **S2B-R-U3** | AC-004 | 1 | 文書（docs/VALIDATOR_STANDARD.md） |
| **S2B-R-U4** | AC-010 | 1 | 文書＋コメント |
| **S2B-R-U5** | AC-013 / AC-014 / AC-015 / AC-016 | 4 | 文書（docs/DEVELOPMENT_STANDARD.md） |
| **S2B-R-U6** | AC-008 / AC-009 | 2 | コメント（.ts） |
| **S2B-R-U7** | AC-012 | 1 | コメント（.tsx） |
| **合計** | | **13** | |

**AC-011（ACCEPT）はいずれのユニットにも属さない。**

**分割根拠**（Repository 上の依存関係の実測に基づく）:

- AC-013 / AC-014 / AC-015 / AC-016 は**すべて `docs/DEVELOPMENT_STANDARD.md` 単一ファイル**が対象。うち AC-013 / AC-014 / AC-015 は**同一の §3**。同一節への複数修正を分割すると競合するため 1 ユニットへ統合（AC-016 は §7 だが同一ファイルのため同梱）
- AC-005 / AC-006 / AC-007 は `prompts/RULES.md` §1 の単一ブロック置換で同時に解消されるため 1 ユニット
- AC-008 / AC-009 は同一ディレクトリ・同一パターン（未登録スクリプトの状態表示）。**AC-012 は `app/` 配下**で `npm run build` の検証対象に入るため別ユニット
- AC-010 は D-3 の結論を `next.config.js` の §3 記述（AC-014）へ渡すため、**S2B-R-U5 より前**に実行する必要がある

---

## §4 Execution Units

### S2B-R-U1: PN6 の persona 責務整合

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U1 |
| **対象 Finding** | AC-003 |
| **目的** | `persona` の生成責務と採用元 Phase を vNext 工程文書群で一意にする |
| **確定方針（Q-1）** | **PN5 が persona の生成・確定責務を持つ。**<br>・PN2: bridge 由来の persona が存在する場合のみ採用できるが、存在しなくてもよい<br>・PN5: 最終的な persona を生成・確定する責務を持つ<br>・PN6: Phase 5 成果物の persona を top-level へ配置する<br>・**PN6 Step 1 の「Phase 2 から採用する一覧」から `persona` を除外する** |
| **変更対象ファイル** | `prompts/vNext/PN6-Assembly.md` のみ |
| **非変更対象** | `prompts/vNext/PN2-Drug-Header.md`（Q-1 の確定方針と両立するため変更しない）／ `prompts/vNext/PN5-Non-Scenario.md`（同）／ 他 PN ファイル ／ `data/modules/*.json` ／ `bridges/*.md` ／ `lib/` ／ `app/` ／ 許可済み既存差分 4 件 |
| **具体的な変更方針** | PN6 Step 1「基盤フィールドの確定（Phase 2 から）」のフィールド一覧（61行）から `persona` を除外する。除外後、PN6 内の残り 2 箇所（「Phase 5 の以下をそのまま追加する」の `persona ← phase5 の persona を top-level へ配置`、および「PN5 成果物の事前確認」の persona 欠落時 MUST_STOP）と整合することを確認する |
| **変更順序** | ① PN6 全文の `persona` 出現箇所を grep で全数把握 → ② Step 1 一覧から `persona` を除外 → ③ PN6 内 3 箇所の整合を確認 → ④ PN2 / PN5 との責務整合を grep で確認（両ファイルは変更しない） |
| **検証コマンド** | `grep -n "persona" prompts/vNext/PN6-Assembly.md` ／ `grep -n "persona" prompts/vNext/PN2-Drug-Header.md prompts/vNext/PN5-Non-Scenario.md`（非変更の確認）／ `git diff` |
| **STOP 条件** | §7 の共通条件を適用する。**Q-1 により生成責務は確定済みであるため、責務の所在を理由とする STOP は発生しない** |
| **commit boundary** | `prompts/vNext/PN6-Assembly.md` 1 ファイルのみ。1 commit |
| **推奨 commit message** | `docs(vnext): unify persona generation responsibility in PN6` |
| **次ユニットへの依存** | なし |
| **状態** | **完了** |
| **実施済みの変更** | PN6 Step 1「基盤フィールドの確定（Phase 2 から）」の採用フィールド一覧から `persona` を除外 |
| **commit** | `911615f` |
| **AC-003 の状態** | 解消 |

---

### S2B-R-U2: STANDARD_REFERENCE_PATHS の粒度統一

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U2 |
| **対象 Finding** | AC-005 / AC-006 / AC-007 |
| **目的** | D-1（C案）に従い §1 の参照許可パス粒度を統一する |
| **変更対象ファイル** | `prompts/RULES.md` のみ |
| **非変更対象（Q-6）** | **`prompts/P2A.md`（独自の限定リスト: `data/modules/` / `data/modules/index.ts` / `lib/types.ts` の 3 行。P2A 工程固有の参照範囲として維持する）**／ `prompts/P2B.md` `P3.md` `P4.md`（いずれも §1 へ委譲済みで複製なし）／ `prompts/PROJECT_CONTEXT.md` §9 の「STANDARD_REFERENCE_PATHS共通化」保留記録（別論点） |
| **具体的な変更方針** | §1「型・validator・runtime関連:」ブロックの lib 個別 15 行を `lib/` 1 行へ置換。あわせて `app/` をディレクトリ単位で追加する。**他カテゴリ（`data/modules/` `bridges/` `docs/` `prompts/` `scripts/`）は既にディレクトリ単位のため変更しない**。§1 の注意書き 3 項も変更しない |
| **変更順序** | ① 現行 §1 ブロックを実測（lib 15 行・`app/` 不在）→ ② 置換 → ③ §1 を参照する 8 ファイル（vNext 4 / 旧体系 4）で参照が壊れていないことを grep 確認 |
| **検証コマンド** | `grep -n "lib/" prompts/RULES.md`（§1 範囲）／ `grep -rn "STANDARD_REFERENCE_PATHS" prompts/ docs/` ／ `git diff` |
| **STOP 条件** | §7 の共通条件に加え、**`prompts/P2A.md` が自身のリストを「STANDARD_REFERENCE_PATHS の完全複製」と明記している事実が見つかった場合のみ STOP**（Plan Baseline 時点の実測では、P2A は「構造確認用として以下の標準パスを確認してよい」と記載するのみで完全複製の明記はない） |
| **commit boundary** | `prompts/RULES.md` 1 ファイルのみ。1 commit |
| **推奨 commit message** | `docs(rules): unify reference path granularity to directory level` |
| **次ユニットへの依存** | なし |

---

### S2B-R-U3: VALIDATOR_STANDARD 本文チェック表の errorCode 補完

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U3 |
| **対象 Finding** | AC-004 |
| **目的** | 本文チェック表（38 種）と Appendix・実装（43 種）の網羅差 3 件を解消する |
| **変更対象ファイル** | `docs/VALIDATOR_STANDARD.md` のみ |
| **非変更対象** | `lib/moduleValidator.ts` ／ `lib/types.ts`（実装は正しく、文書側の欠落であるため）／ 同文書 Appendix（既に 43 件記載済み）／ §3 見出しの check 数表記（Stage 2-A 成果物・再監査しない） |
| **具体的な変更方針** | ① §3-A（ERROR）へ `BRAND_DISPLAY_NAME_MISMATCH`（Structural）を追加。②③ §3-B（WARNING）へ `RESERVED_TAG_UNUSED` / `RESERVED_TAG_REACHABLE`（Design Rule）を追加。**check 番号は `lib/moduleValidator.ts` の実装から特定する**（`prompts/RULES.md` 685行が `BRAND_DISPLAY_NAME_MISMATCH` を check 13b、882行が reservedHandlingTags 検証を check 15・32・33・34 と記載しているため、これらとの整合を確認する）。ERROR / WARN の区分は同文書 Appendix（281〜283行）の記載に従う |
| **変更順序** | ① `lib/moduleValidator.ts` で 3 コードの check 番号・`isWarning` を確認 → ② §3-A / §3-B へ行を追加 → ③ Appendix との分類一致を確認 |
| **検証コマンド** | `grep -cE "^\| [0-9]+[a-z]? \| " docs/VALIDATOR_STANDARD.md`（行数増を確認）／ `grep -n "BRAND_DISPLAY_NAME_MISMATCH\|RESERVED_TAG" docs/VALIDATOR_STANDARD.md lib/moduleValidator.ts` ／ `git diff` |
| **STOP 条件** | §7 の共通条件に加え、**実装側の check 番号が `prompts/RULES.md` の記載（13b / 15・32・33・34）と一致せず、どちらが正かを確定できない場合** |
| **commit boundary** | `docs/VALIDATOR_STANDARD.md` 1 ファイルのみ。1 commit |
| **推奨 commit message** | `docs(validator): add missing errorCode rows to check tables` |
| **次ユニットへの依存** | なし |
| **状態** | **BLOCKED（未完了）** |
| **BLOCK 理由** | Repository 事実の追加判明により BLOCK。詳細は `docs/reviews/P1_S2B_REMEDIATION_VALIDATOR_NUMBERING_DISCOVERY.md` を参照。 |
| **実施済みの変更** | なし（`docs/VALIDATOR_STANDARD.md` は未変更） |
| **commit** | なし |
| **AC-004 の状態** | 未完了 |
| **後続ユニットへの依存評価** | S2B-R-U1・S2B-R-U4・S2B-R-U5・S2B-R-U6・S2B-R-U7 は `docs/VALIDATOR_STANDARD.md` を対象としないため技術的依存はない。ただし実行可否は未決定（Discovery 文書「Owner Decision Required」参照） |

---

### S2B-R-U4: build:static の Future Expansion 状態表示

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U4 |
| **対象 Finding** | AC-010 |
| **目的** | D-3（B案）に従い `EXPORT_STATIC` 経路を Future Expansion として成立させる（§10.3 F1〜F5 の充足） |
| **変更対象ファイル** | `scripts/build-static.js`（冒頭 JSDoc へ状態表示）／ `docs/DEVELOPMENT_STANDARD.md`（F1「将来の目的・用途がリポジトリ内に記録されている」の記録先） |
| **非変更対象** | `package.json`（script は残す）／ `next.config.js`（EXPORT_STATIC 分岐は残す）／ `app/page.tsx` ／ `out/`（git 追跡外） |
| **具体的な変更方針** | §10.3 の F1〜F5 を逐条充足させる。<br>**F1** = 将来の目的・用途（静的 export による配布）を記録<br>**F2** = 現在の標準運用対象外であることを明記<br>**F3** = Owner が確定した再判断条件 4 項目（§2.1 D-3）を明記<br>**F4** = 現行 Runtime の必須条件でないこと（`npm run build` は `next build` のみ、PN8 も `npm run build` のみを実行）を確認・記録<br>**F5** = Validator / 監査工程の FAIL 条件でないことを確認・記録<br>あわせて `build-static.js` の実装特性（ビルド中に `app/page.tsx` を書き換え、`finally` で復元する）を状態表示の文脈で記録するかを判断する |
| **変更順序** | ① F4 / F5 を実測確認（`package.json` / `prompts/vNext/PN8-Build-Runtime-Release.md` / `docs/IMPLEMENTATION_CHECKLIST.md`）→ ② `scripts/build-static.js` 冒頭へ状態表示を追加 → ③ `docs/DEVELOPMENT_STANDARD.md` へ F1・F3 の記録を追加 → ④ F1〜F5 の逐条充足を確認 |
| **検証コマンド** | `grep -n "Future Expansion\|再判断" scripts/build-static.js docs/DEVELOPMENT_STANDARD.md` ／ `git diff`<br>**`.js` のコメント追加のみのため型検査・ビルドは不要**（`scripts/build-static.js` は `tsconfig.json` の型検査対象外であり、`npm run build`（`next build`）の実行経路にも含まれない） |
| **STOP 条件** | §7 の共通条件に加え、**F4 または F5 が実測で成立しない場合**（＝現行 Runtime または監査工程が EXPORT_STATIC 経路に依存していた場合。この場合 Future Expansion は成立せず Owner 判断の再確認が必要） |
| **commit boundary（Q-2 により確定）** | **`scripts/build-static.js` + `docs/DEVELOPMENT_STANDARD.md` を同一 commit に含める。** 実装ロジックの変更ではなく、同一のライフサイクル判断を 2 か所へ反映する変更であり、片方だけでは Future Expansion の状態定義が不完全になるため、同一 commit が原子的である。1 commit |
| **推奨 commit message** | `docs(lifecycle): mark EXPORT_STATIC path as future expansion` |
| **次ユニットへの依存** | **S2B-R-U5 が本ユニットの結論（`next.config.js` の EXPORT_STATIC 分岐の位置づけ）を §3 記述へ反映するため、S2B-R-U5 より前に完了していること** |
| **状態** | **完了** |
| **実施済みの変更** | `scripts/build-static.js` 冒頭 JSDoc へ F1〜F5 の状態表示を追加。同一 commit で `docs/DEVELOPMENT_STANDARD.md` §10.3「現在の Future Expansion 資産」表へ当該資産を登録 |
| **commit** | `cba95ac` |
| **AC-010 の状態** | 解消 |

---

### S2B-R-U5: DEVELOPMENT_STANDARD のアーキテクチャ記述修正

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U5 |
| **対象 Finding** | AC-013 / AC-014 / AC-015 / AC-016 |
| **目的** | D-2（A案）に従い §3 の記述範囲へ入口層・ビルド／配信設定を含め、あわせて §3 の SOAP 生成記述の実装不一致と §7 Documentation Map の到達不能を解消する |
| **変更対象ファイル** | `docs/DEVELOPMENT_STANDARD.md` のみ |
| **非変更対象** | `middleware.ts` ／ `next.config.js` ／ `app/page.tsx` ／ `lib/` 配下（いずれも実装は変更せず記述側のみ修正）／ S2B-R-U4 が変更した §10 該当箇所（順序で分離） |
| **具体的な変更方針** | **(a) §3 実行時ブロック**: 現行 6 段（`canonical JSON → Search → Scenario → SOAP生成 → Runtime確認 → Domain Complete`）の前段へ入口層を追加し、`middleware.ts`（HTTP リクエストからアプリへの入口層）→ `app/page.tsx` の接続関係を示す<br>**(b) §3 ビルド時ブロック**: `next.config.js` をビルド・配信設定として位置づける。記載範囲は **S2B-R-U4 の結論を反映**し、EXPORT_STATIC 分岐が Future Expansion であることが読み取れる形にする<br>**(c) AC-015**: 「SOAP生成（buildSoap.ts / soapComposer.ts …）」行を、手動入力経路（`buildSoap.ts` + `applyPersona.ts`）と NLP 経路（`createSoapFromInput.ts` → `soapComposer.ts`）の別が分かる粒度へ修正<br>**(d) §7**: Documentation Map へ `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` の行を追加<br>**Owner 指示により、§3 を実装詳細の列挙にしない** |
| **変更順序** | ① §3 実行時ブロック（入口層追加 + AC-015 の SOAP 生成行修正）→ ② §3 ビルド時ブロック（`next.config.js`）→ ③ §7 Documentation Map（AC-016）→ ④ §0 の「地図」規定と照らして粒度が実装詳細列挙になっていないことを確認 |
| **検証コマンド** | `grep -n "middleware\|next.config\|soapComposer\|PRODUCT_VARIANT" docs/DEVELOPMENT_STANDARD.md` ／ `git diff` ／ 粒度の妥当性は**人間レビュー**（機械検証不可）<br>**Q-3 の適用**: 記載する `middleware.ts` / `app/page.tsx` / `next.config.js` / `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` が Repository 上に実在することを個別に確認する |
| **STOP 条件** | §7 の共通条件に加え、**§3 への記載が実装詳細の列挙にならざるを得ないと判明した場合**（Owner 指示との両立不能）／ **S2B-R-U4 が未完了で `next.config.js` の位置づけが確定していない場合** |
| **commit boundary** | `docs/DEVELOPMENT_STANDARD.md` 1 ファイルのみ。1 commit |
| **推奨 commit message** | `docs(standard): extend architecture scope to entry and delivery layers` |
| **次ユニットへの依存** | **S2B-R-U4 の完了が前提** |
| **状態** | **完了** |
| **実施済みの変更** | §3 実行時ブロックへ入口層（`middleware.ts` → `app/page.tsx`）を追加、§3 ビルド時ブロックへ `next.config.js`（U4 の結論を反映）を追加、SOAP生成行を手動入力経路／NLP経路の別が分かる粒度へ修正、§7 Documentation Map へ `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` の行を追加 |
| **commit** | `cd38d68` |
| **AC-013 / AC-014 / AC-015 / AC-016 の状態** | 解消 |

---

### S2B-R-U6: 未登録スクリプトのライフサイクル状態表示

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U6 |
| **対象 Finding** | AC-008 / AC-009 |
| **目的** | §10.1「状態は必ずファイル内またはスキーマ定義に明示する」および DP-13 に従い、未接続スクリプト 2 件へ状態表示を付与する |
| **変更対象ファイル** | `scripts/verify_addon_panel.ts` ／ `scripts/verify_buildS.ts` |
| **非変更対象** | 両ファイルの実装コード（コメントのみ追加）／ `package.json`（登録しない）／ `scripts/` 配下の他ファイル（`auditShared.ts` / `audit-*.ts` / `test-multi-drug-synthesis.ts` / `build-static.js` は本ユニット対象外） |
| **確定方針（Q-5）** | **Repository 内に Future Expansion または Legacy を示す明示的根拠がなければ Experimental とする。** 実行時にファイル本文と git 履歴を確認し、次のとおり判定する:<br>・試験・調査目的の単独ツール → **Experimental**<br>・将来接続する明示的計画あり → **Future Expansion**<br>・過去の正式経路で現在不使用 → **Legacy**（ただし §10.2 L7 の Owner 承認が必要なため STOP）<br>・保持不要と明示できる → **Archived**（ただし削除を伴う場合は別ユニット） |
| **具体的な変更方針** | 各ファイル冒頭の既存 JSDoc ブロックへ、上記判定に基づく §10.1 の状態表示を追加する。判定根拠（ファイル本文・git 履歴の実測結果）を状態表示に併記する |
| **変更順序** | ① 両ファイルの現況（被参照 0 件・`package.json` 未登録）と git 履歴を再実測 → ② Q-5 の基準で状態を判定 → ③ Legacy 候補なら STOP、それ以外なら状態表示を追加 |
| **検証コマンド** | `grep -n "Experimental\|Future Expansion\|Legacy\|Archived" scripts/verify_addon_panel.ts scripts/verify_buildS.ts` ／ **`npx tsc --noEmit`**（`.ts` ファイルの変更のため）／ `git diff` |
| **STOP 条件** | §7 の共通条件に加え、**Legacy 判定となり §10.2 L7（Owner 承認）が必要になった場合**／ **Archived 判定となり削除を伴う場合**（別ユニット化が必要） |
| **commit boundary** | `scripts/` 配下 2 ファイルのみ。1 commit |
| **推奨 commit message** | `chore(scripts): declare lifecycle state for unregistered verify scripts` |
| **次ユニットへの依存** | なし |
| **状態** | **完了** |
| **実施済みの変更** | `scripts/verify_addon_panel.ts` ／ `scripts/verify_buildS.ts` 冒頭 JSDoc へ Experimental 状態表示（Q-5 準拠の判定根拠を含む）を追加 |
| **commit** | `6f13efa` |
| **AC-008 / AC-009 の状態** | 解消 |

---

### S2B-R-U7: LockGate のライフサイクル状態表示

| 項目 | 内容 |
|---|---|
| **Unit ID** | S2B-R-U7 |
| **対象 Finding** | AC-012 |
| **目的** | §10.1 および DP-13 に従い、import 元 0 件の `LockGate.tsx` へ状態表示を付与する |
| **変更対象ファイル** | `app/components/LockGate.tsx` のみ |
| **非変更対象** | `app/layout.tsx` ／ `app/page.tsx`（**接続はしない**。状態表示のみ）／ `app/styles/lockgate.module.css` ／ 他 `app/components/*.tsx` ／ `middleware.ts` |
| **確定方針（Q-5）** | **事前に状態を決めない。Repository 事実を調査して実行時に判定する。** 調査対象: ファイルコメント / git 履歴 / 関連 CSS（`app/styles/lockgate.module.css`）/ 認証関連文書 / 過去の参照履歴。<br>判定基準:<br>・将来接続する明示的な意図あり → **Future Expansion**<br>・試作・検証用として作成 → **Experimental**<br>・`middleware.ts` 等に置換された旧方式 → **Legacy**（Owner 確認のため STOP）<br>・**根拠なし → STOP して Owner へ報告** |
| **具体的な変更方針** | 上記判定が Future Expansion または Experimental となった場合のみ、ファイル冒頭（`'use client'` 直下）へ §10.1 の状態表示を追加する。判定根拠を併記する。**LockGate を実際に接続する変更は行わない**（接続可否は認証方針に関わる新規設計判断であり、本工程のスコープ外） |
| **変更順序** | ① import 元 0 件を再実測 → ② ファイルコメント・git 履歴・関連 CSS・認証関連文書・過去の参照履歴を調査 → ③ 判定 → ④ Legacy 候補または根拠不足なら STOP、それ以外なら状態表示を追加 |
| **検証コマンド** | `grep -rn "LockGate" app/ --include="*.tsx" --include="*.ts"` ／ `git log --oneline -- app/components/LockGate.tsx` ／ **`npx tsc --noEmit`** ／ **`npm run build`**（`app/` 配下の変更のため）／ `git diff` |
| **STOP 条件** | §7 の共通条件に加え、**Legacy 候補と判定された場合**（Owner 確認が必要）／ **状態を判定する根拠が Repository 内に見つからない場合**（Owner へ報告）／ **状態表示のために LockGate の接続可否を決める必要が生じた場合** |
| **commit boundary** | `app/components/LockGate.tsx` 1 ファイルのみ。1 commit |
| **推奨 commit message** | `chore(app): declare lifecycle state for unconnected LockGate` |
| **次ユニットへの依存** | なし |
| **状態** | **完了（当初計画との差異あり）** |
| **実施済みの変更** | `app/components/LockGate.tsx` 冒頭へ Legacy 状態表示（判定根拠・Owner 承認済みの記載を含む）を追加。同一 commit で `docs/DEVELOPMENT_STANDARD.md` §10.2「現在の Legacy 資産」表へ当該資産を L1（必須参照ゼロ）・L2（`middleware.ts` への設計意図移管）・L7（Owner 承認済み）とともに登録 |
| **commit** | `e564804` |
| **AC-012 の状態** | 解消（§10.1 に基づく状態表示が付与されている） |
| **当初計画との差異（実測）** | 当初計画の1ファイル境界（`app/components/LockGate.tsx` のみ）を超え、`docs/DEVELOPMENT_STANDARD.md` §10.2 Lifecycle 正規台帳への登録も同一 commit で実施された。commit message も推奨文言（`chore(app): declare lifecycle state for unconnected LockGate`）と一致しない（実際: `chore(app): mark LockGate as legacy (superseded by middleware)`） |

---

## §5 Execution Order

**確定実行順序: S2B-R-U2 → S2B-R-U3 → S2B-R-U1 → S2B-R-U4 → S2B-R-U5 → S2B-R-U6 → S2B-R-U7**

| 順 | Unit | 順序決定の根拠 |
|---|---|---|
| 1 | **S2B-R-U2** | 共通規則（`prompts/RULES.md` §1）は個別文書より先に確定する。§1 は vNext 4 ファイル・旧体系 4 ファイルから参照される横断規則。**完了（commit `8f860fd`）** |
| 2 | **S2B-R-U3** | `docs/VALIDATOR_STANDARD.md` の自己不整合（正本文書内の矛盾）を先に解消する。他ユニットと独立。**BLOCKED（詳細は S2B-R-U3 の項目表を参照）** |
| 3 | **S2B-R-U1** | 正本文書間の不整合（PN6 内部）を解消する。工程契約に関わるため早期に確定させる。**完了（commit `911615f`）** |
| 4 | **S2B-R-U4** | **S2B-R-U5 の前提**。D-3 の結論（`next.config.js` の EXPORT_STATIC 分岐が Future Expansion）を確定させてから §3 へ反映する。**完了（commit `cba95ac`）** |
| 5 | **S2B-R-U5** | AC-013 / AC-014 / AC-015 / AC-016 を単一ファイル・単一 commit で処理。**S2B-R-U4 の結論を §3 の `next.config.js` 記述へ反映する**。**完了（commit `cd38d68`）** |
| 6 | **S2B-R-U6** | コード（`.ts` コメント）変更。文書ユニット完了後にまとめる。**完了（commit `6f13efa`）** |
| 7 | **S2B-R-U7** | `app/` 配下のため `npm run build` を要する唯一のユニット。最後に単独実行して検証範囲を明確にする。**完了（当初計画との差異あり。commit `e564804`）** |

**順序制約（必須）**:

- **S2B-R-U4 → S2B-R-U5**（D-3 の結論を D-2 の `next.config.js` 記述へ反映するため）
- **AC-015 と D-2 は S2B-R-U5 内で同時に扱う**（同一節への複数修正の統合）

**順序制約（任意）**: S2B-R-U1 / U2 / U3 / U6 / U7 は相互に独立しており、上記以外の順序でも実行可能。

**コードと文書の分離**: S2B-R-U1 / U2 / U3 / U5 は文書のみ。S2B-R-U6 / U7 はコード（コメント）のみ。**S2B-R-U4 のみが両者にまたがるが、Q-2 により同一 commit とする**（実装ロジックの変更ではなく、同一ライフサイクル判断の 2 か所反映であるため）。

---

## §6 Verification Matrix

**Q-3 により、文書のみのユニットには typecheck / test / build / audit を割り当てない。**

| Unit | 変更種別 | `git diff` | grep 残存確認 | 文書間整合 | 人間レビュー | `npx tsc --noEmit` | `npm test` | `npm run build` | `npm run audit` |
|---|---|---|---|---|---|---|---|---|---|
| **S2B-R-U1** | 文書（.md） | ● | ● | ●（PN2/PN5/PN6 の persona 責務） | ● | — | — | — | — |
| **S2B-R-U2** | 文書（.md） | ● | ●（§1 から lib 個別名が消えたこと） | ●（§1 参照 8 ファイル） | ● | — | — | — | — |
| **S2B-R-U3** | 文書（.md） | ● | ●（3 コードの出現） | ●（本文表 ⇔ Appendix ⇔ 実装） | ● | — | — | — | — |
| **S2B-R-U4** | 文書（.md）+ コメント（.js） | ● | ●（状態表示・再判断条件） | ●（F1〜F5 逐条） | ● | — | — | — | — |
| **S2B-R-U5** | 文書（.md） | ● | ●（3 ファイル名 + PRODUCT_VARIANT） | ●（§0 の地図規定との粒度整合） | ● | — | — | — | — |
| **S2B-R-U6** | コメント（.ts） | ● | ●（状態表示） | — | ● | **●** | — | — | — |
| **S2B-R-U7** | コメント（.tsx） | ● | ●（状態表示） | — | ● | **●** | — | **●** | — |

**検証の割当根拠（Q-3 に基づく）**:

- **文書のみのユニット（S2B-R-U1 / U2 / U3 / U5）**: Markdown のみの変更であり、typecheck / test / build / audit は今回変更した内容を直接検証できない。むしろ無関係な既存問題によってユニットの成否が曖昧になる可能性がある。したがって `git diff` / grep / 文書間整合確認 / 人間レビューで足りるものとする
- **文書中に新規記載するコマンド名・ファイル名の実在確認（Q-3 但し書き）**: S2B-R-U4 / U5 のように文書へファイル名・コマンド名を新たに記載する場合は、当該対象が Repository 上に実在することを個別に確認する
- **`npx tsc --noEmit`**: `.ts` / `.tsx` を変更する S2B-R-U6 / U7 のみ。コメント追加でも構文破壊の可能性があるため実施
- **`npm run build`**: `app/` 配下を変更する S2B-R-U7 のみ。`app/page.tsx` が起動時に `assertModuleValid` / `assertCrossModuleValid` を実行するため、`app/` 変更時はビルド確認が妥当
- **`npm test`**: **全ユニットで不要**。いずれのユニットも `lib/` / `data/modules/` / `bridges/` のロジック・データを変更しない
- **`npm run audit`**: **全ユニットで不要**。bridge ⇔ JSON ⇔ AddonPanel / alias 同期を対象とする監査であり、本計画はいずれも対象外
- **`scripts/build-static.js`（S2B-R-U4）の型検査不要**: `.js` ファイルであり `tsconfig.json` の型検査対象外、かつ `npm run build`（`next build`）の実行経路に含まれない

**`docs/IMPLEMENTATION_CHECKLIST.md` 標準チェックリストとの関係**: 同チェックリストは「実装後に毎回行う標準検証」を定めるが、Q-3 の Owner 判断により、**文書のみのユニットは同チェックリスト全項目の適用対象としない**。

---

## §7 STOP Conditions

全ユニット共通。該当時は即時停止し、Unit ID・該当 Finding・該当ステップ・原因を報告する。自動修正・自動継続はしない。

| ID | 条件 |
|---|---|
| **F-STOP-A** | **Owner 判断（D-1 / D-2 / D-3 / Q-1〜Q-6）と Repository 実装が両立しない**ことが判明した |
| **F-STOP-B** | **Finding の前提となる対象箇所が変更・消失している**（Stage 2-B の Current State = UNCHANGED が成立しなくなっている） |
| **F-STOP-C** | **Stage 2-B Record（`docs/reviews/P1_S2B_DISPOSITION.md`）の Basis と異なる事実**が見つかった |
| **F-STOP-D** | **修正が別 Finding または Scope 外設計の決定を必要とする**（例: S2B-R-U7 で LockGate の接続可否判断が必要） |
| **F-STOP-E** | **既存の未 commit 差分との衝突がある**（着手時の許可済み 4 件以外の差分が存在、または当該 4 件への変更が必要になった） |
| **F-STOP-F** | **修正対象外ファイルへの変更が必要になった**（各ユニットの「非変更対象」に挙げたファイルを含む） |
| **F-STOP-G** | **ACCEPT 済みの AC-011 に変更が及ぶ**（`tests/` 配下および `docs/IMPLEMENTATION_CHECKLIST.md` のテスト記載への変更が必要になった） |
| **F-STOP-H** | **Stage 2-B Remediation の範囲を超える新規設計が必要になった** |
| **F-STOP-I** | 実行中に **Execution Baseline から HEAD が移動した**、または許可済み差分以外のワークツリー差分が発生した |
| **F-STOP-J** | **§10.2 L7（Owner 承認）が必要な Legacy 化**が妥当と判定された（S2B-R-U6 / U7） |
| **F-STOP-K** | **S2B-R-U7 で、状態を判定する根拠が Repository 内に見つからない**（Q-5 により Owner へ報告） |

**「発見だけでは停止しない」原則の適用**: Scope 外事象（Stage 2-A 成果物・既存台帳項目・CTO 監査 ID）を発見した場合は、件数と最小限の所在のみを記録して継続する。停止するのは、その事象を処理しなければ当該ユニットの修正を完了できない場合のみ。

---

## §8 Commit Boundaries

| Unit | commit 対象 | ファイル数 | 種別 | 推奨 commit message |
|---|---|---|---|---|
| S2B-R-U1 | `prompts/vNext/PN6-Assembly.md` | 1 | 文書 | `docs(vnext): unify persona generation responsibility in PN6` |
| S2B-R-U2 | `prompts/RULES.md` | 1 | 文書 | `docs(rules): unify reference path granularity to directory level` |
| S2B-R-U3 | `docs/VALIDATOR_STANDARD.md` | 1 | 文書 | `docs(validator): add missing errorCode rows to check tables` |
| S2B-R-U4 | `scripts/build-static.js` + `docs/DEVELOPMENT_STANDARD.md` | 2 | **文書＋コメント（Q-2 により同一 commit）** | `docs(lifecycle): mark EXPORT_STATIC path as future expansion` |
| S2B-R-U5 | `docs/DEVELOPMENT_STANDARD.md` | 1 | 文書 | `docs(standard): extend architecture scope to entry and delivery layers` |
| S2B-R-U6 | `scripts/verify_addon_panel.ts` + `scripts/verify_buildS.ts` | 2 | コメント | `chore(scripts): declare lifecycle state for unregistered verify scripts` |
| S2B-R-U7 | `app/components/LockGate.tsx` | 1 | コメント | `chore(app): declare lifecycle state for unconnected LockGate` |

**本計画文書自体の commit**（Q-4 により確定）:

| 対象 | `docs/reviews/P1_S2B_FIX_PLAN.md` 1 ファイルのみ |
|---|---|
| 実施時期 | **実装開始前に単独 commit する**（S2B-R-U1〜U7 の実行前） |
| commit message | `docs(review): define Stage 2-B remediation plan` |
| push | 実施しない |

**共通規則**:

- **1 ユニット = 1 commit**。ユニットをまたぐ変更を同一 commit に含めない
- **着手時の許可済み既存差分 4 件を stage しない**
- **push は行わない**（Owner の別途指示による）
- **S2B-R-U4 と S2B-R-U5 は同一ファイル（`docs/DEVELOPMENT_STANDARD.md`）を対象とするため、順序を守り、S2B-R-U4 の commit 完了後に S2B-R-U5 を開始する**

---

## §9 Completion Conditions

### 9.1 各ユニットの完了条件

```
□ 当該ユニットの対象 Finding の期待する修正後状態が達成されている
□ §6 Verification Matrix で当該ユニットに割り当てられた検証がすべて完了している
□ 「非変更対象」に挙げたファイルに変更がない
□ 着手時の許可済み既存差分 4 件に変更がない
□ 当該ユニットの commit boundary どおり 1 commit が完了している
□ push を実施していない
```

### 9.2 計画全体の完了条件

```
□ S2B-R-U1〜S2B-R-U7 の 7 ユニットすべてが完了している
□ 対象 Finding 13 件（AC-003〜AC-010 / AC-012〜AC-016。AC-011 を除く）がすべて処理されている
□ AC-011（ACCEPT）に一切の変更が及んでいない
□ D-1 / D-2 / D-3 および Q-1〜Q-6 の Owner 判断がすべて反映されている
□ コード・データ・bridge の実装ロジックに変更がない（コメントおよび文書のみ）
□ Stage 2-B Remediation の範囲を超える新規設計へ進んでいない。
  Stage 2-C の名称・責務・開始条件を定義していない
□ push を実施していない
```

**完了に含めないこと**: Finding の再監査、Stage 2-B Record の更新、後続工程の起票。

---

## §10 Open Questions

**未解決の Open Question は存在しない。** Q-1〜Q-6 はすべて Owner 判断により解消済みである。

| ID | 内容 | 解消結果 | 反映先 |
|---|---|---|---|
| **Q-1** | persona の正しい生成責務 | **解消**。PN5 を正とする。PN6 Step 1 の Phase 2 採用一覧から `persona` を除外する | §2.2 Q-1 ／ §4 S2B-R-U1 |
| **Q-2** | S2B-R-U4 のコメントと文書を同一 commit に含めるか | **解消**。同一 commit とする | §2.2 Q-2 ／ §4 S2B-R-U4 ／ §8 |
| **Q-3** | 文書のみのユニットに標準ビルドを適用するか | **解消**。適用しない。ただし文書へ新規記載するコマンド名・ファイル名は実在確認する | §2.2 Q-3 ／ §6 |
| **Q-4** | 計画と実行工程の帰属 | **解消**。Stage 2-B Remediation とする。Stage 2-C とはしない。Unit ID は `S2B-R-U1`〜`S2B-R-U7` | 本書全体 ／ §8 |
| **Q-5** | S2B-R-U6 / U7 の状態 | **解消**。U6 は明示的根拠がなければ Experimental。U7 は Repository 事実で実行時判定し、根拠不足または Legacy 候補なら STOP | §2.2 Q-5 ／ §4 S2B-R-U6・S2B-R-U7 ／ §7 F-STOP-J・F-STOP-K |
| **Q-6** | `prompts/P2A.md` の独自リストを同期するか | **解消**。同期しない。S2B-R-U2 は `prompts/RULES.md` のみを変更する | §2.2 Q-6 ／ §4 S2B-R-U2 |

**実行中に新たな判断事項が生じた場合**は、§7 の STOP 条件に従って停止し、Owner へ報告する。本計画では新しい Owner 判断を追加しない。

---

## 付録: サマリ

| 項目 | 内容 |
|---|---|
| **工程名称** | Stage 2-B Remediation |
| **ユニット数** | **7**（S2B-R-U1 〜 S2B-R-U7） |
| **対象 Finding** | **13 件**（AC-003 / AC-004 / AC-005 / AC-006 / AC-007 / AC-008 / AC-009 / AC-010 / AC-012 / AC-013 / AC-014 / AC-015 / AC-016） |
| **対象外** | **AC-011（ACCEPT）** |
| **実行順序** | S2B-R-U2 → S2B-R-U3 → S2B-R-U1 → S2B-R-U4 → S2B-R-U5 → S2B-R-U6 → S2B-R-U7 |
| **必須順序制約** | S2B-R-U4 → S2B-R-U5 |
| **未解決 Open Question** | なし |
| **進捗** | 完了 6（S2B-R-U1・S2B-R-U2・S2B-R-U4・S2B-R-U5・S2B-R-U6・S2B-R-U7）／BLOCKED 1（S2B-R-U3）／未着手 0 |
