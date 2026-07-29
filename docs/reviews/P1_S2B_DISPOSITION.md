# Stage 2-B — Finding Disposition 記録（S2B-D1）

> **文書の性格**: Phase 1 Architecture Consolidation / Stage 2-B の実施記録（S2B-D1）。
> S2-CHECK-1 記録が確定した非 MATCH Finding 14 件について、Disposition（取り扱い方針）・
> Priority（優先順位）・Basis（判断根拠）を確定させるための台帳。
> 本ファイルは `docs/reviews/P1_S2B_ARCHITECTURE.md`（v1.2 / FROZEN）に準拠する。
>
> **表記規約**: FACT（実装・資料で確認した事実）/ INFERENCE（事実からの推論）/
> UNKNOWN（情報不足で判断不能）を明示する。行番号は Execution Baseline 時点の値であり、
> 位置特定には併記した検索語を用いること。
>
> **本ユニットで行っていないこと**: Finding の修正・既存文書の変更・コード / データ / bridge
> の変更・Disposition / Priority / Basis の付与・集計・判定（§4 列 9〜11、§5、§6、§8 は
> Tier1 が別途記入する）。

---

## 1. メタデータ

| 項目 | 値 |
|---|---|
| Source Baseline | `445057b`（S2-CHECK-1 が Repository 実体を調査した時点） |
| Input Record Commit | `62eb75e`（S2-CHECK-1記録が確定した commit） |
| Execution Baseline | `d41e76e79de3c39d5776b58f0e6ce037c61c3acf`（Tier2 着手時 `git rev-parse HEAD` 実測値） |
| 着手時ワークツリー状態 | 許可済み既存差分 4 件のみ（下記） |
| 実施日 | 2026-07-29 |
| ブランチ | feat/nlp-input-panel-and-new-schema |
| 担当 | Tier2（Sonnet）が B0〜B4（§0〜§3・§4 列 1〜8・§7・§9）／ Tier1（Opus）が B5〜B8（§4 列 9〜11・§5・§6・§8） |
| Tier1 実施日 | 2026-07-29 |
| 提出前 HEAD | `d41e76e79de3c39d5776b58f0e6ce037c61c3acf`（Execution Baseline から不変） |
| 提出前ワークツリー状態 | 着手時の許可済み既存差分 4 件 + 本記録ファイルの新規作成のみ |
| 本記録ファイルの行数 | 336 行（2,000 行以内。Tier1 判定記入後の最終値） |
| 準拠 Architecture 版 | `docs/reviews/P1_S2B_ARCHITECTURE.md` v1.2 / Status: FROZEN（Architecture Freeze Commit `d41e76e`） |
| 本ユニットでのファイル変更 | なし（本記録ファイルの新規作成のみ） |
| 実行した検証コマンド | なし（`npx tsc` / `npm test` / `npm run build` / `npm run audit` / `npm run dev` は実行していない） |

**着手時ワークツリー状態（`git status --short` 全出力）**:

```
 M .claude/settings.local.json
?? .claude/launch.json
?? bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak
?? docs/reviews/PHASE2_STAGE1_VERIFICATION_2026-07-25.md
```

この 4 件が STOP-G（Architecture §8）の許可済み差分として確定する。

---

## 2. 方法

### 実行順序

```
B0 基準固定 → B1 入力の転記 → B2 現況再確認 → B3 既存台帳との重複確認 → B4 記録作成・提出
```

### B0 — 基準固定

```bash
git rev-parse HEAD
git status --short
```

Source Baseline（`445057b`）・Input Record Commit（`62eb75e`）は Architecture §3.1 の確定値をそのまま採用した。

### B1 — 入力の転記

```bash
grep "^| AC-" docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md
```

`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §4 の全 16 行から Classification ≠ MATCH の 14 行（AC-003〜AC-016）を抽出した。

### B2 — 現況再確認

```bash
git diff --stat 445057b..d41e76e
```

Source Baseline から Execution Baseline までの全変更ファイルを一括で機械確認した。結果は次の 2 ファイルのみであった。

```
 docs/reviews/P1_S2B_ARCHITECTURE.md       | 730 ++++++++++++++++++++++++++++++
 docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md | 426 +++++++++++++++++
 2 files changed, 1156 insertions(+)
```

いずれも `docs/reviews/` 配下の新規作成ファイルであり、14 件の Finding が指す対象パス（`lib/` / `app/` / `scripts/` / `tests/` / `prompts/vNext/` / `docs/DEVELOPMENT_STANDARD.md` / `docs/VALIDATOR_STANDARD.md` / `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` / `prompts/RULES.md` / `package.json` / `middleware.ts` / `next.config.js` / `app/layout.tsx` / `app/page.tsx` / `docs/IMPLEMENTATION_CHECKLIST.md`）のいずれとも一致しない。この単一の `git diff --stat` により、14 件全件が `UNCHANGED` であることを一括で確認した。

### B3 — 既存台帳との重複確認

**固定検索対象**（Architecture §7.6）:

```
docs/OPEN_DESIGN_QUESTIONS.md（Q-*）
prompts/RULES.md（CHECK-* / §4 監査未整備 3 系統）
prompts/vNext/HANDOFF.md（GAP-01）
```

**使用した検索コマンドと検索語**:

```bash
grep -oE "^## Q-[A-Za-z0-9]+" docs/OPEN_DESIGN_QUESTIONS.md
grep -oE "CHECK-[A-Za-z0-9]+" prompts/RULES.md | sort -u
grep -n "GAP-01" prompts/vNext/HANDOFF.md
```

台帳登録済み ID 一覧（実測）:

```
Q-*  : Q-A1, Q-J1, Q-F4, Q-G1, Q-S1
CHECK-* : CHECK-G01, CHECK-G02, CHECK-O01, CHECK-T01, CHECK-TP01
GAP-01 : 1 件（HANDOFF.md 589行）
```

各 Finding の対象語（対象ファイル名・シンボル名・論点キーワード）について、上記 3 ファイル内での明示的一致を個別に検索した。

```bash
for term in "moduleValidator" "errorCode" "37 check" "applyPlaceholder" "isSReplacementEligible" \
            "jsonScenarioBuilder" "verify_addon_panel" "verify_buildS" "build-static" "LockGate" \
            "middleware" "next.config" "soapComposer" "buildSoap" "PRODUCT_VARIANT" "persona"; do
  grep -n "$term" docs/OPEN_DESIGN_QUESTIONS.md prompts/RULES.md prompts/vNext/HANDOFF.md
done
```

```bash
for f in "drugSubject.test" "genericIntegration.test" "menuDisplay.test" "mergeBlocks.test" \
         "multiDrugCompose.test" "personaState.test" "soapMerge.test" "stateTransitions.test"; do
  grep -n "$f" docs/OPEN_DESIGN_QUESTIONS.md prompts/RULES.md prompts/vNext/HANDOFF.md
done
```

検索語 `persona` は `prompts/vNext/HANDOFF.md` 225行（PN2 の責務一覧の一部）に出現したが、AC-003（PN5 の persona セクション必須宣言と PN6 Step1 の Phase2 採用記述との不整合）という Finding 自体への言及ではなく、§7.6 の MATCHED 3 条件（同一 Finding ID の記載／対象ファイル・シンボル・規則・論点の明示的一致／当該 Finding との対応関係の直接明記）のいずれも満たさないため NOT_MATCHED とした。他の検索語はいずれも 0 件、または対象 Finding の論点と無関係な文脈での言及のみであった（詳細は §4 各行の Current State Evidence / Existing Ledger Reference 参照）。14 件全件が NOT_MATCHED である。

---

## 3. 入力の転記

以下は `docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md`（commit `62eb75e`）§4 からの転記であり、値は変更していない。

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

**件数確認**: 14 件（`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md` §4 の Classification ≠ MATCH 行数と一致）。

---

## 4. Finding Disposition 台帳

列 1〜8 は Tier2 が記入した。**列 9〜11（Disposition / Priority / Basis）は Tier1 が記入するため空欄のまま提出する。**

| ID | Layer | Classification | Impact | Current State | Current State Evidence | Existing Ledger Match | Existing Ledger Reference | Disposition | Priority | Basis |
|---|---|---|---|---|---|---|---|---|---|---|
| AC-003 | L1 | CONFLICT | Architecture | UNCHANGED | 確認対象: `prompts/vNext/PN5-Non-Scenario.md`／`prompts/vNext/PN6-Assembly.md`。`git diff --stat 445057b..d41e76e` で両ファイルとも変更対象外（変更は `docs/reviews/` 配下 2 ファイルのみ）。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`persona` を固定検索対象 3 ファイルで検索した結果、`prompts/vNext/HANDOFF.md` 225行に PN2 の責務一覧の一部として出現するが、AC-003 が指摘する「PN5 の persona セクション必須宣言と PN6 Step1 の Phase2 採用記述との不整合」という論点そのものへの言及ではない。同一 Finding ID の記載・当該 Finding との対応関係の直接明記のいずれもなく、明示的一致なし） | FIX | P-MED | `docs/DEVELOPMENT_STANDARD.md` §2「責務分離（単一責務）— 各工程・各フィールドは 1 つのことだけを担当する」（53行）および §6 Single Source of Truth。同一フィールド `persona` の生成責務を `prompts/vNext/PN5-Non-Scenario.md`（自責務と宣言）と `prompts/vNext/PN6-Assembly.md` Step 1（Phase 2 から採用）が異なる工程へ割り当てている状態は、この原則に適合しない。両ファイルはいずれも `docs/DEVELOPMENT_STANDARD.md` §7 が「各工程の実行プロンプト正本」と定める文書であり、正本間の不一致にあたるため修正対象として確定する。 |
| AC-004 | L2 | CONFLICT | Documentation | UNCHANGED | 確認対象: `docs/VALIDATOR_STANDARD.md`／`lib/moduleValidator.ts`／`lib/types.ts`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（固定検索対象 3 ファイルで `moduleValidator` / `errorCode` / `37 check` を検索したが、VALIDATOR_STANDARD.md 本文チェック表と Appendix・実装の網羅差という論点への言及は 0 件） | FIX | P-MED | `docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map（174行）が `docs/VALIDATOR_STANDARD.md` を「Validatorが何を保証し、何を保証しないか。errorCode一覧」の正本と定める。その正本の §3-A/§3-B 番号付き本文チェック表が、同一文書 Appendix および実装（`lib/moduleValidator.ts` / `lib/types.ts`）に存在する 3 errorCode の行を欠く状態は、正本文書内の自己不整合にあたるため修正対象として確定する。 |
| AC-005 | L2 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `lib/applyPlaceholder.ts`／`app/components/DashboardClient.tsx`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`applyPlaceholder` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: `prompts/RULES.md` §1 STANDARD_REFERENCE_PATHS（「ローカルリポジトリ参照許可パス一覧。全工程で共通使用。」）を、Runtime 経路上の全 lib ファイルを網羅する一覧として維持するのか、各工程が参照を要するファイルのみを列挙する運用とするのかを定めた確定規則が Repository 内に存在しない。前者であれば未収載は修正対象、後者であれば現状が正となるため、FIX / ACCEPT のいずれとも確定できない。AC-006 / AC-007 と同一の方針判断に属する。 |
| AC-006 | L2 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `lib/isSReplacementEligible.ts`／`app/components/ThirdPanel.tsx`／`tests/genericIntegration.test.ts`／`tests/multiDrugCompose.test.ts`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`isSReplacementEligible` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: AC-005 と同一。`prompts/RULES.md` §1 STANDARD_REFERENCE_PATHS の網羅範囲（Runtime 経路上の全 lib ファイルか、工程が参照を要するファイルのみか）を定めた確定規則が Repository 内に存在せず、FIX / ACCEPT のいずれとも確定できない。 |
| AC-007 | L2 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `lib/jsonScenarioBuilder.ts`／`lib/createSoapFromInput.ts`／`lib/soapComposer.ts`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`jsonScenarioBuilder` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: AC-005 と同一。`prompts/RULES.md` §1 STANDARD_REFERENCE_PATHS の網羅範囲を定めた確定規則が Repository 内に存在せず、FIX / ACCEPT のいずれとも確定できない。 |
| AC-008 | L2 | IMPL_ONLY | Implementation | UNCHANGED | 確認対象: `scripts/verify_addon_panel.ts`／`package.json`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`verify_addon_panel` を固定検索対象 3 ファイルで検索し 0 件） | FIX | P-LOW | `docs/DEVELOPMENT_STANDARD.md` §10.1（259行）「状態は必ずファイル内またはスキーマ定義に明示する。状態が未表示の資産は、次のセッションから Current Standard と区別できない」および `docs/DESIGN_PRINCIPLES.md` DP-13（456行）「意図的に未接続である資産は、その旨を判別可能な形で記録しなければならない」。`scripts/verify_addon_panel.ts` は `package.json` 未登録かつ被参照 0 件でありながらライフサイクル状態の表示を持たず、両規定に適合しないため修正対象として確定する。 |
| AC-009 | L2 | IMPL_ONLY | Implementation | UNCHANGED | 確認対象: `scripts/verify_buildS.ts`／`package.json`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`verify_buildS` を固定検索対象 3 ファイルで検索し 0 件） | FIX | P-LOW | AC-008 と同一の根拠。`docs/DEVELOPMENT_STANDARD.md` §10.1（状態の明示義務）および `docs/DESIGN_PRINCIPLES.md` DP-13（未接続資産の記録義務）。`scripts/verify_buildS.ts` は `package.json` 未登録かつ被参照 0 件でありながらライフサイクル状態の表示を持たないため修正対象として確定する。 |
| AC-010 | L2 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `scripts/build-static.js`／`package.json`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`build-static` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: `package.json` の `build:static`（`EXPORT_STATIC=1 node scripts/build-static.js`）を現行の Current Standard として維持するのか、`docs/DEVELOPMENT_STANDARD.md` §10.1 の他状態（Future Expansion / Legacy / Archived）として扱うのかが Repository 内で確定していない。位置づけが未確定のままでは、目的・出力・実行タイミングを記載すべき正本文書を特定できず、FIX / ACCEPT のいずれとも確定できない。 |
| AC-011 | L2 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `tests/`（`drugSubject.test.ts`／`genericIntegration.test.ts`／`menuDisplay.test.ts`／`mergeBlocks.test.ts`／`multiDrugCompose.test.ts`／`personaState.test.ts`／`soapMerge.test.ts`／`stateTransitions.test.ts`）／`docs/IMPLEMENTATION_CHECKLIST.md`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（対象 8 テストファイル名を個別に固定検索対象 3 ファイルで検索し、いずれも 0 件） | ACCEPT | — | `docs/DESIGN_PRINCIPLES.md` DP-00 ルール 5（29行）は「検証手段（テスト・回帰確認の方法）も会話履歴に依存させず、リポジトリへ永続化する」ことを求めるが、`npm test` は `package.json` に実行可能な形で登録され、その実施義務は `docs/IMPLEMENTATION_CHECKLIST.md` 標準チェックリスト 16行に記載済みであり、同ルールは充足されている。個別テストファイル名を正本文書へ記載することを求める確定規則は Repository 内に存在しないため、現状を正として受容する。 |
| AC-012 | L3 | IMPL_ONLY | Implementation | UNCHANGED | 確認対象: `app/components/LockGate.tsx`／`app/layout.tsx`／`app/page.tsx`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`LockGate` を固定検索対象 3 ファイルで検索し 0 件） | FIX | P-LOW | AC-008 / AC-009 と同一の根拠。`docs/DEVELOPMENT_STANDARD.md` §10.1（状態の明示義務）および `docs/DESIGN_PRINCIPLES.md` DP-13（未接続資産の記録義務）。`app/components/LockGate.tsx` は import 元 0 件（Runtime 未接続）でありながらライフサイクル状態の表示を持たないため修正対象として確定する。 |
| AC-013 | L3 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `middleware.ts`。`git diff --stat 445057b..d41e76e` で変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`middleware` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: `docs/DEVELOPMENT_STANDARD.md` §3 の実行時アーキテクチャ記述に認証境界（`middleware.ts`）を含めるかを定めた確定規則が存在しない。同 §3 の記述範囲を canonical JSON 以降の SOAP 生成系統に限るのか、リクエスト入口層まで含めるのかが未確定のため、FIX / ACCEPT のいずれとも確定できない。AC-014 と同一の記述範囲の方針判断に属する。 |
| AC-014 | L3 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `next.config.js`／`app/page.tsx`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`next.config` を固定検索対象 3 ファイルで検索し 0 件） | OWNER_DECISION_REQUIRED | — | 不足情報: AC-013 と同一の方針判断。`next.config.js`（`Cache-Control` 設定・`EXPORT_STATIC` 分岐）を `docs/DEVELOPMENT_STANDARD.md` §3 のビルド時／実行時記述へ含めるかを定めた確定規則が Repository 内に存在せず、FIX / ACCEPT のいずれとも確定できない。 |
| AC-015 | L3 | CONFLICT | Documentation | UNCHANGED | 確認対象: `docs/DEVELOPMENT_STANDARD.md`／`app/components/DashboardClient.tsx`／`lib/createSoapFromInput.ts`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`soapComposer` / `buildSoap` は `prompts/RULES.md` §1 STANDARD_REFERENCE_PATHS 内のファイルパス列挙としてのみ出現し、AC-015 が指摘する「アーキテクチャ図が両ファイルを一体的に記述している点と実際の import グラフの差異」という論点への言及ではない。明示的一致なし） | FIX | P-MED | `docs/DEVELOPMENT_STANDARD.md` §0（24行）は本文書を「どの文書に何が書いてあるか」「全体がどうつながっているか」を示すための地図と規定し、同 §6（156行）は Runtime（実装コード・実機挙動）を「実際にユーザーが体験する挙動」の正本と定める。§3 が `buildSoap.ts` と `soapComposer.ts` を一体の SOAP 生成ステップとして記述する一方、実装の import グラフでは両者が別経路である事実は、地図の記述と正本である実装との不一致にあたるため修正対象として確定する。 |
| AC-016 | L4 | IMPL_ONLY | Documentation | UNCHANGED | 確認対象: `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md`／`docs/DEVELOPMENT_STANDARD.md`／`prompts/RULES.md`。`git diff --stat 445057b..d41e76e` でいずれも変更対象外。判定根拠: 上記 diff 結果。 | NOT_MATCHED | `—`（`PRODUCT_VARIANT` は `prompts/RULES.md` 879行に出現するが、`template.handlingTags` の実例注記としての参照であり、AC-016 が指摘する「Documentation Map からの到達可能性」という論点への言及ではない。明示的一致なし） | FIX | P-LOW | `docs/DEVELOPMENT_STANDARD.md` §10.2 L6（271行）は「Documentation Map から Legacy 領域として到達可能」であることを設計資産の完了条件の一つとして扱い、同 §0（24行）は本文書を「どの文書に何が書いてあるか」を示す地図と規定する。`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` は設計資産として実在し `prompts/RULES.md` 879行から参照されるにもかかわらず §7 Documentation Map から到達できない状態は、これらの規定に適合しないため修正対象として確定する。 |

---

## 5. 集計

### Disposition 別

| Disposition | 件数 | 該当 ID |
|---|---|---|
| FIX | 7 | AC-003 / AC-004 / AC-008 / AC-009 / AC-012 / AC-015 / AC-016 |
| DEFER | 0 | — |
| ACCEPT | 1 | AC-011 |
| MOVE_TO_LEDGER | 0 | — |
| OWNER_DECISION_REQUIRED | 6 | AC-005 / AC-006 / AC-007 / AC-010 / AC-013 / AC-014 |
| **合計** | **14** | |

### Priority 別（`Disposition = FIX` のみ付与）

| Priority | 件数 | 該当 ID |
|---|---|---|
| P-HIGH | 0 | — |
| P-MED | 3 | AC-003 / AC-004 / AC-015 |
| P-LOW | 4 | AC-008 / AC-009 / AC-012 / AC-016 |
| `—`（FIX 以外） | 7 | AC-005 / AC-006 / AC-007 / AC-010 / AC-011 / AC-013 / AC-014 |
| **合計** | **14** | |

Priority の適用基準（Architecture §7.4 の 3 値を本ユニットで適用した内訳）:

- `P-HIGH`（他の Finding の処理または後続 Stage の前提となるもの）に該当する Finding は存在しなかった。FIX 7 件はいずれも相互に前提関係を持たず、独立に処理できる
- `P-MED` は、現行 Current Standard 文書内に**不整合**が存在し、放置すると次セッションが誤読しうるもの（AC-003 = 正本間の責務割当不一致、AC-004 = 正本文書内の自己不整合、AC-015 = 地図の記述と実装の不一致）
- `P-LOW` は、**欠落・未表示**であり既存記述との矛盾を含まないもの（AC-008 / AC-009 / AC-012 = ライフサイクル状態の未表示、AC-016 = Documentation Map への未収載）

### Current State 別（Tier2 事実認定・変更なし）

| Current State | 件数 |
|---|---|
| UNCHANGED | 14 |
| CHANGED | 0 |
| UNVERIFIABLE | 0 |
| **合計** | **14** |

`CHANGED` が 0 件であるため、Architecture §7.8 事前分岐（§7.7 の適用）は全件で非該当となり、14 件全件に §7.8 決定順序 1〜5 を直接適用した。

### Existing Ledger Match 別（Tier2 事実認定・変更なし）

| Existing Ledger Match | 件数 |
|---|---|
| MATCHED | 0 |
| NOT_MATCHED | 14 |
| UNVERIFIABLE | 0 |
| **合計** | **14** |

`MATCHED` が 0 件であるため、Architecture §7.8 順位 2（`MOVE_TO_LEDGER`）に該当する Finding は存在しなかった。Tier1 においても、既存台帳（`docs/OPEN_DESIGN_QUESTIONS.md` Q-* / `prompts/RULES.md` CHECK-* および §4 / `prompts/vNext/HANDOFF.md` GAP-01）が 14 件のいずれかと同一責務・同一論点を管理していることを Basis で示せる事例は確認できなかった。

---

## 6. Owner 判断待ち・確認不能事項

### 6.1 OWNER_DECISION_REQUIRED

**6 件**（AC-005 / AC-006 / AC-007 / AC-010 / AC-013 / AC-014）。

内容は 2 つの方針判断に集約される。いずれも「該当箇所が Repository 上でどうなっているか」は確定済みであり、不足しているのは**どの範囲までを正本文書へ記載する運用とするか**という方針である。

| # | 方針判断 | 該当 Finding | Owner が判断するために不足している情報 |
|---|---|---|---|
| **D-1** | `prompts/RULES.md` §1 STANDARD_REFERENCE_PATHS の網羅範囲 | AC-005（`lib/applyPlaceholder.ts`）／ AC-006（`lib/isSReplacementEligible.ts`）／ AC-007（`lib/jsonScenarioBuilder.ts`） | 同節（「ローカルリポジトリ参照許可パス一覧。全工程で共通使用。」）を、Runtime 経路上の全 lib ファイルを網羅する一覧として維持するのか、各工程が参照を要するファイルのみを列挙する運用とするのか。前者なら 3 件は FIX、後者なら 3 件は ACCEPT となる |
| **D-2** | `docs/DEVELOPMENT_STANDARD.md` §3 アーキテクチャ記述の範囲 | AC-013（`middleware.ts`）／ AC-014（`next.config.js`） | §3 の記述範囲を canonical JSON 以降の SOAP 生成系統に限るのか、リクエスト入口層・ビルド／配信設定まで含めるのか。前者なら 2 件は ACCEPT、後者なら 2 件は FIX となる |
| **D-3** | `package.json` `build:static`（`EXPORT_STATIC` 経路）の位置づけ | AC-010（`scripts/build-static.js`） | 当該経路を現行 Current Standard として維持するのか、`docs/DEVELOPMENT_STANDARD.md` §10.1 の他状態（Future Expansion / Legacy / Archived）として扱うのか。位置づけが確定しなければ、目的・出力・実行タイミングを記載すべき正本文書を特定できない |

本ユニットではこれら 3 点について推測で Disposition を確定させず、`docs/DESIGN_PRINCIPLES.md` DP-15（明示的不確定性の原則）に従い `OWNER_DECISION_REQUIRED` として公告する。

### 6.2 Current State = UNVERIFIABLE

**0 件**。Tier2 の B2 において、`git diff --stat 445057b..d41e76e` による一括確認で 14 件全件が `UNCHANGED` と機械的に確定しており、確認不能となった Finding は存在しない。

### 6.3 Existing Ledger Match = UNVERIFIABLE

**0 件**。Tier2 の B3 において、14 件全件が固定検索対象 3 ファイルに対する明示的一致の存在確認により `NOT_MATCHED` と確定しており、確認不能となった Finding は存在しない。

---

## 7. Scope 外として記録のみ行った事象

| # | 該当カテゴリ | 件数 | 内容（要約のみ・詳細記述なし） |
|---|---|---|---|
| ① | Stage 2-A 成果物の再監査 | 0 | 本ユニット中、Stage 2-A の判断そのものを再監査する必要が生じた事象はなかった |
| ② | 既存台帳項目の内容再判定 | 0 | B3 では既存台帳の明示的一致の存在確認のみを行い、内容の当否再判定は行っていない（Architecture O6） |
| ③ | CTO 監査由来の残課題 | 0 | 本ユニット中、CTO 監査 ID に該当する事象への言及は生じなかった |
| その他 | Scope 外事象 | 0 | 該当なし |

---

## 8. 判定（Tier1 記入欄）

**判定: PASS WITH FINDINGS**

| 項目 | 内容 |
|---|---|
| 判定日 | 2026-07-29 |
| 判定者 | Tier1（Opus） |
| 判定対象 | 本記録（Tier2 B0〜B4 完了・AC-003 の Existing Ledger Match 再確認修正を含む） |
| 準拠 | `docs/reviews/P1_S2B_ARCHITECTURE.md` v1.2 §12 判定基準 |

### 判定根拠

Architecture §12 の PASS WITH FINDINGS 条件①〜⑤との照合:

- ① 14 件全件に Disposition と Basis がある — **充足**（FIX 7 / ACCEPT 1 / OWNER_DECISION_REQUIRED 6、Basis は全件記入済み）
- ② FIX 全件に Priority がある — **充足**（FIX 7 件すべてに P-MED 3 / P-LOW 4 を付与。FIX 以外の 7 件は `—`）
- ③ `OWNER_DECISION_REQUIRED` / `Current State = UNVERIFIABLE` / `Existing Ledger Match = UNVERIFIABLE` のいずれかが 1 件以上 — **該当**（`OWNER_DECISION_REQUIRED` 6 件）
- ④ それらが §6 へ一覧化されている — **充足**（§6.1 に 6 件を D-1〜D-3 の 3 方針判断へ整理。§6.2・§6.3 はいずれも 0 件と明記）
- ⑤ STOP 非該当 — **充足**（STOP-A〜G のいずれにも該当していない）

PASS の条件③〜⑤（`OWNER_DECISION_REQUIRED` = 0 件）を満たさないため PASS には該当せず、STOP 条件にも該当しないため、**PASS WITH FINDINGS** と判定する。

Architecture §12 のとおり、`PASS WITH FINDINGS` は正常な完了形である。Owner 判断を要する 6 件が残ることは、DP-15（明示的不確定性の原則）に従った「不確定の公告」であり、推測で Disposition を確定させなかった結果である。

### 判定にあたって適用した規則

- §7.8 事前分岐: `Current State = CHANGED` が 0 件のため §7.7 は全件で非該当。14 件全件へ決定順序 1〜5 を直接適用した
- §7.8 順位 2 の制約: `Existing Ledger Match = MATCHED` が 0 件であり、かつ既存台帳が同一責務・同一論点を管理していることを Basis で示せる事例が確認できなかったため、`MOVE_TO_LEDGER` は 0 件とした
- §7.8 順位 1: Repository 内の確定規則と確認済み事実だけでは FIX / ACCEPT を確定できない 6 件に `OWNER_DECISION_REQUIRED` を付与した
- §7.9: Disposition 別の Basis 必須記載事項（FIX = 修正対象として確定できる根拠／ACCEPT = 受容できる確定規則・確定文書／OWNER_DECISION_REQUIRED = 不足している情報）をすべて満たしている。`DEFER` は 0 件のため再判断条件の記載義務は発生しない

### Tier2 事実認定の扱い

Tier2 が確定させた `Current State`（14 件 UNCHANGED）および `Existing Ledger Match`（14 件 NOT_MATCHED）は、Tier1 において一切変更していない。これらを入力として設計判断のみを行った。

なお AC-003 の `Existing Ledger Match` は、Tier2 提出後の再確認により `MATCHED` から `NOT_MATCHED` へ修正されている（Architecture §7.6 の MATCHED 3 条件のいずれも満たさないため）。Tier1 はこの修正後の値を入力として使用した。

### Findings の取り扱い

本ユニットは方針決定ユニットであり、Finding の修正は実施していない（Architecture O1）。`FIX` と判定した 7 件の実施ユニット・実施順序・実装方法は本 Architecture の対象外である（同 §13）。

### commit 承認

本記録 1 ファイル（`docs/reviews/P1_S2B_DISPOSITION.md`）のみを対象とした Stage 2-B Record Commit（Architecture §10.2）を承認する。

---

## 9. 本ユニットで実施していない範囲

- Disposition / Priority / Basis の付与（§4 列 9〜11。Tier1 の担当。Architecture §7.7〜§7.9）
- 集計（§5。Tier1 の担当。Architecture §4 O-2）
- Owner 判断待ち・確認不能事項の一覧化（§6。Tier1 の担当。Architecture §4 O-3）
- 判定（§8。Tier1 の担当。Architecture §4 O-4 / §12）
- 既存台帳項目（Q-* / CHECK-* / GAP-01 / RULES §4 監査未整備 3 系統）の内容当否判定（Architecture O6）
- Finding の修正（コード・文書・データ・bridge のいずれも。Architecture O1）
- S2-CHECK-1記録 §9 が未確認と明記した領域への追加調査（Architecture O8）
- Runtime 品質・UI 設計・状態管理の良否・ブラウザ実機挙動の評価（Architecture O9）
- `npx tsc --noEmit` / `npm test` / `npm run build` / `npm run audit` / `npm run dev` の実行
- Stage 2-C / OD-1 の責務への言及（Architecture O2）
- git commit / git push
