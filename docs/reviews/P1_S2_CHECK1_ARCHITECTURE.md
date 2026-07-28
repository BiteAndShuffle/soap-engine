# S2-CHECK-1 — Architecture 整合調査記録

> **文書の性格**: Phase 1 Architecture Consolidation / Stage 2 の S2-CHECK-1 として実施した
> Architecture 整合調査の記録（読み取り専用の事実固定）。本記録は新しいルール・仕様を定義せず、
> 乖離の修正方針・改善提案・優先順位付けを含まない。
>
> **表記規約**: FACT（実装・資料で確認した事実）/ INFERENCE（事実からの推論）/
> UNKNOWN（情報不足で判断不能）を明示する。行番号は基準コミット時点の値であり、
> 位置特定には併記した検索語を用いること。
>
> **Scope 外事象の扱い**: 本調査中に発見した事象のうち、Stage 2-A 成果物（①）・
> 既存台帳項目（②）・CTO 監査由来の残課題（③）に該当するものは、内容を記述せず
> 7 節に該当件数のみを記録した。

---

## 1. 調査メタデータ

| 項目 | 値 |
|---|---|
| 実施日 | 2026-07-28 |
| 基準コミット | 445057b9b52fd40274dea09ed42e81167d6b0a5f |
| ブランチ | feat/nlp-input-panel-and-new-schema |
| 実施前ワークツリー状態 | 許可済み既存差分 4 件のみ（`.claude/settings.local.json` M / `.claude/launch.json` ?? / `bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak` ?? / `docs/reviews/PHASE2_STAGE1_VERIFICATION_2026-07-25.md` ??） |
| 本調査でのファイル変更 | なし（本記録ファイルの新規作成のみ） |
| 実行した検証コマンド | なし（`npx tsc` / `npm test` / `npm run build` / `npm run audit` / `npm run dev` は実行していない） |
| 担当 | Tier2（Sonnet）。判定（8節）は Tier1（Opus）が別途記入する |
| 準拠設計 | S2-CHECK-1（Architecture）設計 v1.2（確定・凍結済み） |
| 使用した実行指示 | S2-CHECK-1 調査指示書 v1.1（Tier2 向け）／ S2-CHECK-1 / D-1 修正指示 R1 |
| 提出前 HEAD | 445057b9b52fd40274dea09ed42e81167d6b0a5f（着手時から不変） |
| 提出前ワークツリー状態 | 許可済み既存差分 4 件 + 本記録ファイル（D-1）の新規作成のみ |
| 本記録ファイルの行数 | 426 行（2,000 行以内。Tier1 判定記入後の最終値） |
| commit / push | いずれも実施していない |

---

## 2. 調査方法

静的ファイル調査のみ（`ls` / `grep` / `Read`）。実行・ビルド・テストは行っていない。

### 実行順序

```
A0 → A1 → A2 → A2-L3 → A5 → A3 → A4 → A6
```

確定手順は A5 を A4 の後に置くが、A5 の入力は Repository への直接 grep（bridges/ 参照・旧体系参照・
docs 間参照）のみであり、A3（双方向マッピング）・A4（責務所在検査）の出力に依存しない。逆方向の依存
（A3/A4 が A5 の出力を参照すること）も存在しない。Tier1 レビューにて「調査結果の有効性に影響しない
軽微な手順逸脱」として受容済み（S2-CHECK-1 / D-1 修正指示 R1 §A-1）。

### 実施した主な操作

```bash
git rev-parse HEAD
git status --short
```

```bash
ls lib/ app/ app/components/ scripts/ tests/ data/modules/ bridges/ prompts/vNext/
grep -n "\"scripts\"" -A 12 package.json
```

- `docs/DEVELOPMENT_STANDARD.md` / `prompts/vNext/HANDOFF.md` / `prompts/PROJECT_CONTEXT.md` /
  `docs/VALIDATOR_STANDARD.md` / `docs/feature-glossary.md` / `prompts/RULES.md` §1 /
  `docs/DESIGN_PRINCIPLES.md` / `docs/OPEN_DESIGN_QUESTIONS.md` / `prompts/vNext/AUTORUN.md` /
  `docs/IMPLEMENTATION_CHECKLIST.md` / `prompts/vNext/STARTUP_PROMPT.md` を全文 Read
- `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` の冒頭（参照・位置づけ・入力・責務セクション）を Read

```bash
for f in lib/*.ts; do head -5 "$f"; done
```

```bash
grep -rln "applyPlaceholder\|isSReplacementEligible\|jsonScenarioBuilder" docs/*.md prompts/*.md prompts/vNext/*.md
grep -rln "LockGate\|middleware\.ts\|next\.config" docs/*.md prompts/*.md prompts/vNext/*.md
grep -rln "verify_addon_panel\|verify_buildS\|build-static" docs/*.md prompts/*.md prompts/vNext/*.md
grep -rln "drugSubject\.test\.ts\|genericIntegration\.test\.ts\|menuDisplay\.test\.ts\|mergeBlocks\.test\.ts\|multiDrugCompose\.test\.ts\|personaState\.test\.ts\|soapMerge\.test\.ts\|stateTransitions\.test\.ts\|moduleValidator\.test\.ts\|search\.test\.ts" docs/*.md prompts/*.md prompts/vNext/*.md
```
（L2/L3 実体ファイル名ごとに、L4 Input セット内での参照有無を確認。広域 grep で 0 件だった場合は
  `docs/DEVELOPMENT_STANDARD.md` / `docs/VALIDATOR_STANDARD.md` / `docs/DESIGN_PRINCIPLES.md` /
  `docs/JSON_STANDARD.md` / `docs/IMPLEMENTATION_CHECKLIST.md` / `docs/feature-glossary.md` /
  `prompts/PROJECT_CONTEXT.md` / `prompts/RULES.md` / `prompts/vNext/HANDOFF.md` /
  `prompts/vNext/STARTUP_PROMPT.md` / `prompts/vNext/AUTORUN.md` / `prompts/vNext/PN1〜PN8` へ
  対象を限定した再確認も実施した）

```bash
grep -rln "applyPlaceholder\|isSReplacementEligible\|jsonScenarioBuilder" app/ lib/ scripts/ tests/ --include="*.ts" --include="*.tsx"
grep -rln "LockGate" app/ --include="*.tsx" --include="*.ts"
```
（import グラフの追跡。存在するが未接続のファイルを検出）

```bash
grep -oE "code: '[A-Z_]+'" lib/moduleValidator.ts | sort -u | wc -l
sed -n '/ModuleValidationErrorCode/,/^$/p' lib/types.ts
grep -oE "^\| [0-9]+[a-z]? \|" docs/VALIDATOR_STANDARD.md | sort -u | wc -l
grep -cE "^### [A-Z]{1,2}\. " prompts/vNext/PN7-Cross-Reference-Audit.md
```
（L2 の errorCode 定義とドキュメント側の記載数を突合）

```bash
grep -rn "bridges/" app/ lib/ --include="*.ts" --include="*.tsx"
grep -rn "P0-A\.md\|P0-B\.md\|...\|P5_STANDARD" prompts/vNext/*.md
```
（A5 依存方向の実測）

```bash
for f in docs/DEVELOPMENT_STANDARD.md docs/VALIDATOR_STANDARD.md docs/DESIGN_PRINCIPLES.md \
         docs/JSON_STANDARD.md docs/IMPLEMENTATION_CHECKLIST.md docs/feature-glossary.md \
         prompts/PROJECT_CONTEXT.md prompts/RULES.md prompts/vNext/HANDOFF.md \
         prompts/vNext/STARTUP_PROMPT.md prompts/vNext/AUTORUN.md; do
  grep -oE "docs/[A-Z_]+\.md|prompts/[A-Za-z0-9_/-]+\.md" "$f" | sort -u
done
```
（A5(c) 循環参照の確認。対象は L4 Input セット 11 文書）

```bash
awk '/^## 7\. Documentation Map/,/^## 8\./' docs/DEVELOPMENT_STANDARD.md | grep -oE "\`[a-zA-Z0-9_/.-]+\.md\`" | sort -u
ls docs/*.md prompts/*.md prompts/vNext/*.md
grep -n "PRODUCT_VARIANT_SEPARATION_PRINCIPLE" prompts/RULES.md
```
（R1-6: L4 逆方向確認。母集団は `docs/*.md`（`docs/reviews/*` を除く）/ `prompts/*.md` /
  `prompts/vNext/*.md`。`docs/reviews/*` は参照専用のため母集団から除外した）

```bash
grep -h -m1 "STATUS:" bridges/*.md | sort | uniq -c
grep -c "as unknown as ModuleData" data/modules/index.ts
```
（既存台帳項目該当性の確認のみに使用。新規 finding は起票していない）

---

## 3. Architecture 対応マトリクス

### 3.0 調査対象カバレッジと乖離台帳の関係（誤読防止）

- 本節（3.1〜3.4）のカバレッジ表は、A2 / A2-L3 で列挙した全調査対象要素の**確認状況**を示す
- 各要素には `MATCH` または `AC-xxx`（4節参照）を付す
- 4節の乖離台帳（O-2）は、**AC-ID 単位の Architecture Finding のみ**を記録する
- 4節の分類別・Impact 別件数、および D-2 報告の各件数は、**O-2 の AC-ID 行のみ**を集計する
- 本節で `MATCH` とされた全要素は、新規 AC-ID として重複起票しない
- 本節の全要素数と 4節の Finding 件数は**異なってよい**（一致させる必要はない）

### 調査対象カバレッジ

```
lib/*.ts         18 件（IMPL_ONLY: AC-005 / AC-006 / AC-007、残り 15 件 = MATCH）
app/components/  10 件（IMPL_ONLY: AC-012、残り 9 件 = MATCH）
scripts/*         7 件（IMPL_ONLY: AC-008 / AC-009 / AC-010、残り 4 件 = MATCH）
tests/*          10 件（IMPL_ONLY: AC-011 が 8 件を包含、残り 2 件 = MATCH）
prompts/vNext/   13 件（CONFLICT: AC-003、残り 12 件 = MATCH）
data/modules/*.json + index.ts   35 件 + 1 件（3.1節参照。全件 MATCH）
bridges/*.md      35 件（3.1節参照。全件 MATCH）
文書（L4）        docs/*.md（docs/reviews/* 除く）15 件 + prompts/*.md 12 件 +
                  prompts/vNext/*.md 13 件。IMPL_ONLY: AC-016（1件）、残り 39 件 = MATCH
                  （Documentation Map 記載 19 ファイルの存在確認は 3.4節参照）
ルート設定        middleware.ts（IMPL_ONLY: AC-013）/ next.config.js（IMPL_ONLY: AC-014）/
                  package.json・tsconfig.json（RULES §1 記載・MATCH）
```

### 3.1 L1 — ビルド時パイプライン

**文書側の宣言**（`prompts/vNext/HANDOFF.md` §2〜3、`docs/DEVELOPMENT_STANDARD.md` §3〜4）:

```
bridges/*.md（STATUS 状態機械）
  → PN1（本文抽出）→ PN2（ヘッダー変換）→ PN3A（分類判断）→ PN3B（メタデータ適用）
  → PN4A/PN4B（xStructured 生成）‖ PN5（非シナリオ構造）
  → PN6（統合・Write）→ PN7（監査・26項目 A〜AB）→ PN8（tsc/build/registry確認）
  → data/modules/{moduleId}.json → data/modules/index.ts 登録
```

**実体側**: `bridges/` 35 件、`data/modules/*.json` 35 件、`data/modules/index.ts` に `ALL_MODULES` として全 35 件を import・登録（`as unknown as ModuleData` パターンを使用）。`prompts/vNext/PN1-Text-Extraction.md`〜`PN8-Build-Runtime-Release.md` の 8 ファイルすべてが実在し、各ファイル冒頭に「参照 / 位置づけ / 入力 / 責務」セクションが存在する。

**対応関係**: 宣言されたフェーズ連鎖（PN1→PN2→PN3A→PN3B→PN4A/4B‖PN5→PN6→PN7→PN8）と実体ファイル構成は一致する（MATCH）。ただし、PN2/PN5/PN6 間の `persona` フィールドの生成責任所在に文書間の不一致がある（4節 AC-003）。P0-B（旧体系）への依存は `prompts/vNext/PN2-Drug-Header.md` および `prompts/RULES.md` の現行正本宣言からは検出されなかった（4節 AC-001、MATCH）。

### 3.2 L2 — 検証層

**文書側の宣言**（`docs/VALIDATOR_STANDARD.md` §1〜6）:

```
ModuleValidator（lib/moduleValidator.ts）— 単一モジュール・全 37 check
CrossModuleValidator（lib/crossModuleValidator.ts）— モジュール横断 2 errorCode
scripts/audit-addon-bridge-chain.ts — bridge⇔addonsRef⇔AddonPanel 横断監査
scripts/audit-alias-bridge-chain.ts — alias 系フィールド bridge⇔JSON 同期監査
npm run audit = 上記 2 スクリプトの実行
npm test = tests/*.test.ts 全件実行
```

**実体側**: `lib/moduleValidator.ts`（61,837 bytes）に 43 個の一意な `code:` 文字列リテラルが存在し、`lib/types.ts` の `ModuleValidationErrorCode` union 型も同数の 43 値を定義する（一致・MATCH）。`lib/crossModuleValidator.ts` は 2 errorCode（`MODULE_ID_DUPLICATE` / `SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE`）を持つ（文書と一致・MATCH）。`scripts/` には 7 ファイルが存在し、うち `audit-addon-bridge-chain.ts` / `audit-alias-bridge-chain.ts` / `auditShared.ts` は文書に記載がある。`build-static.js` / `verify_addon_panel.ts` / `verify_buildS.ts` の 3 ファイルは L4 Input セット内に記載がない（4節 AC-008〜010）。`tests/` には 10 ファイルが存在するが、ファイル名単位での文書参照は 2 件のみ（4節 AC-011）。

**対応関係**: 監査スクリプト 2 種・Validator 2 種の主要責務は文書と一致するが、VALIDATOR_STANDARD.md 自身の §3-A/§3-B 本文チェック表と、同ファイル Appendix errorCode 一覧表・実装コードの間で errorCode の網羅数に差がある（4節 AC-004）。

### 3.3 L3 — 実行時層（静的構造のみ）

> 本節は L3 の存在・import/export・props 受け渡し・関数呼び出しという静的構造事実のみを記載する。
> UI 設計評価・Runtime 品質評価・状態管理の良否判断・バグ／性能／セキュリティ評価は行っていない。

**文書側の宣言**（`docs/DEVELOPMENT_STANDARD.md` §3、`docs/feature-glossary.md`）:

```
middleware.ts（Basic 認証）
  → app/page.tsx（Server Component: 全モジュール検証・DashboardClient へ props 渡し）
    → DashboardClient.tsx
       ├ Topbar（検索・persona トグル）
       ├ Sidebar + SecondaryPanel（グループ→シナリオ）
       ├ AddonPanel（ADDON 選択）
       ├ ThirdPanel（Rapid・薬剤追加・Express）
       ├ NlpInputPanel（Future Expansion・UI 未接続）
       └ SoapEditor（表示・編集・コピー）
```

**実体側の静的 import グラフ（実測）**:

```
app/page.tsx
  imports: data/modules/index(ALL_MODULES), app/components/DashboardClient,
           lib/scenarioValidator(reportInvalidScenarios), lib/moduleValidator(assertModuleValid),
           lib/crossModuleValidator(assertCrossModuleValid)

app/layout.tsx
  imports: ./globals.css のみ（LockGate は import されていない）

app/components/DashboardClient.tsx
  imports (lib/): types, buildSoap(buildNodeFields, mergeBlocks), drugSubject, search,
                  addonFilter(getVisibleAddonKeys), createSoapFromInput, applyPersona,
                  applyPlaceholder, personaGuard, validationRunner(type only)
  imports (components/): Topbar, Sidebar, SecondaryPanel(TemplateListPanel), AddonPanel,
                          ThirdPanel, NlpInputPanel, SoapEditor, ComposeNodeBar

app/components/Topbar.tsx        → lib/search
app/components/Sidebar.tsx       → lib/menuGroups
app/components/SecondaryPanel.tsx → lib/types, lib/menuGroups, lib/buildSoap
app/components/AddonPanel.tsx    → lib/types
app/components/ThirdPanel.tsx    → lib/menuGroups, lib/search, lib/types,
                                    ./SoapEditor, lib/isSReplacementEligible
app/components/NlpInputPanel.tsx → lib/validationRunner
app/components/SoapEditor.tsx    → lib/types, lib/buildSoap
app/components/ComposeNodeBar.tsx → lib/types

lib/createSoapFromInput.ts → lib/scenarioSelector, lib/soapComposer, （jsonScenarioBuilder 経由）
lib/soapComposer.ts        → lib/jsonScenarioBuilder
```

**対応関係**: DashboardClient を中心とする主要コンポーネント構成・NLP 経路の UI 未接続・Express/Rapid/ADDON の呼び出し関係は文書の記述と一致する（MATCH）。一方、`app/components/LockGate.tsx` は実体として存在するが `app/layout.tsx` / `app/page.tsx` を含む `app/` 配下のどのファイルからも import されていない（4節 AC-012）。`middleware.ts` は文書層で構造的に言及されていない（4節 AC-013）。`docs/DEVELOPMENT_STANDARD.md` が「buildSoap.ts / soapComposer.ts」を一体的な SOAP 生成ステップとして記述している点と、実際の import グラフ（DashboardClient は soapComposer.ts を経由せず buildSoap.ts を直接使用し、soapComposer.ts は createSoapFromInput.ts 経由でのみ使用される）との間に差異がある（4節 AC-015）。

### 3.4 L4 — 文書層

**文書→実体（3.4-a）**: `docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map に列挙された全 19 ファイル（`prompts/PROJECT_CONTEXT.md` / `prompts/RULES.md` / `docs/DESIGN_PRINCIPLES.md` / `docs/JSON_STANDARD.md` / `docs/OPEN_DESIGN_QUESTIONS.md` / `docs/VALIDATOR_STANDARD.md` / `docs/IMPLEMENTATION_CHECKLIST.md` / `docs/TEAM_CHARTER.md` / `docs/BOOTSTRAP_STANDARD.md` / `docs/P1_STANDARD.md`〜`P5_STANDARD.md` / `docs/feature-glossary.md` / `prompts/vNext/HANDOFF.md` / `STARTUP_PROMPT.md` / PN1〜PN8）の存在を個別に確認した。**全件実在**（MATCH。DOC_ONLY 0 件）。

**実体→文書（3.4-b、R1-6 で追加実施）**: `docs/*.md`（`docs/reviews/*` を除く）15 件・`prompts/*.md` 12 件・`prompts/vNext/*.md` 13 件、計 40 件を母集団とし、Documentation Map（範囲表記 `docs/P1_STANDARD.md`〜`P5_STANDARD.md` / `prompts/P0-A.md`〜`P5.md` / PN1〜PN8 を含む）から到達可能かを確認した。`docs/reviews/*` は Architecture v1.2 §3 Inputs で「参照専用・判定材料にしない」と定義されているため母集団から除外した。**39 件は到達可能（MATCH）。`docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` の 1 件のみ、Documentation Map に名称・範囲のいずれでも記載がなく到達不能**（4節 AC-016）。同ファイルは実在し `prompts/RULES.md` 879行から参照されている。

文書間の参照方向を確認したところ、循環参照（A→B→A の形）は検出されなかった。多くの文書が `prompts/RULES.md` / `docs/DESIGN_PRINCIPLES.md` / `docs/IMPLEMENTATION_CHECKLIST.md` へ収束的に参照する構造であり、一方向的である（6節参照）。

---

## 4. 乖離台帳

| ID | Layer | Classification | Evidence Type | Finding | Impact | Document Reference | Implementation Reference |
|---|---|---|---|---|---|---|---|
| AC-001 | L1 | MATCH | FACT | `prompts/vNext/PN2-Drug-Header.md` および `prompts/RULES.md` の現行正本宣言箇所に旧体系 `P0-B.md` への依存は存在しない。`prompts/RULES.md` 内に残る 3 件の `P0-B` 言及（218行・278行・605行）はいずれも `CHECK-T01`（解決済み）の履歴記録として明示的に記述されている。 | Documentation | `prompts/vNext/PN2-Drug-Header.md`（全文）/ `prompts/RULES.md` 冒頭「bridge→canonical JSON変換規則は...本ファイル §5 に工程別に分担して定義される」 | 検索語: `P0-B`（`prompts/vNext/PN2-Drug-Header.md` 0件、`prompts/RULES.md` 3件すべて CHECK-T01 文脈） |
| AC-002 | L1 | MATCH | FACT | `prompts/vNext/PN2-Drug-Header.md` に「drug.search 検索トークンの生成規則（commonSearchTokens / formulationSearchTokens）」節が存在し、bridge 記載のそのまま転記・欠落時 omit ルールを明記している。 | Documentation | `prompts/vNext/PN2-Drug-Header.md` 見出し「### drug.search 検索トークンの生成規則」 | 検索語: `commonSearchTokens \| formulationSearchTokens`（同ファイル 81〜95行） |
| AC-003 | L1 | CONFLICT | FACT | `prompts/vNext/PN5-Non-Scenario.md` は「persona セクション（必須）」を自身の責務として宣言する。一方 `prompts/vNext/PN6-Assembly.md` の Step 1（基盤フィールドの確定）は `persona` を含む一連のフィールドを **Phase 2** からそのまま採用すると明記する。PN6 は別途「PN5 成果物の事前確認」として `persona` が `phase5_non_scenario.json` に存在しない場合 MUST_STOP すると定める。同一フィールド `persona` について、生成責任の所在（PN2 か PN5 か）と、実際に組み立て時に採用される Phase（Step 1 が明記する Phase 2）が、PN6 内でも整合していない。 | Architecture | `prompts/vNext/PN5-Non-Scenario.md` 見出し「### persona セクション（必須）」 / `prompts/vNext/PN6-Assembly.md` 「PN5 成果物の事前確認」節 | `prompts/vNext/PN6-Assembly.md` 61行「Step 1: 基盤フィールドの確定（Phase 2 から）...persona」 |
| AC-004 | L2 | CONFLICT | FACT | `docs/VALIDATOR_STANDARD.md` §3-A（ERROR）+ §3-B（WARNING）の番号付き本文チェック表は合計 40 行（`grep -oE "^\| [0-9]+[a-z]? \|"` で 40 件）を持つ。うち row 31 は errorCode 列が「—」（check 29 への統合注記行）、`ADDON_REF_BROKEN` は check 5 / 7c に重複するため、本文チェック表が対応づける一意な errorCode は 38 種。一方 `lib/moduleValidator.ts` の `code:` リテラルおよび `lib/types.ts` の `ModuleValidationErrorCode` union は共に 43 種の一意な errorCode を定義し、同ファイル Appendix の errorCode 一覧表（§3 本文チェック表とは別セクション）は 43 件すべてを記載済みである。差分 5 種のうち `SCENARIO_EXCLUSIVE_GROUP_INVALID` / `SCENARIO_COMBINABLE_INVALID` は本文 check 12「`SCENARIO_PRIORITY_INVALID` 他」に包含されるが、`BRAND_DISPLAY_NAME_MISMATCH` / `RESERVED_TAG_UNUSED` / `RESERVED_TAG_REACHABLE` の 3 件は §3-A/§3-B の番号付き本文チェック表に対応する行が存在しない（Appendix・実装コードには存在する）。なお §3 見出しの「全 37 check」という check 数表記は「check 数」と「errorCode 数」が 1:1 対応する前提のものではなく（本文 check 12 は 1 check で 3 errorCode を発行する）、本 finding はこの見出し表記の当否を対象としない。 | Documentation | `docs/VALIDATOR_STANDARD.md` §3-A・§3-B 本文表／Appendix errorCode 一覧表 | `lib/moduleValidator.ts` 検索語: `code: '` （43件一意）／ `lib/types.ts` 検索語: `ModuleValidationErrorCode`（union 43値） |
| AC-005 | L2 | IMPL_ONLY | FACT | `lib/applyPlaceholder.ts` は `app/components/DashboardClient.tsx` から import され実行時に使用されているが、L4 Input 文書群のいずれにもファイル名での言及がない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `app/components/DashboardClient.tsx` 検索語: `applyPlaceholder` |
| AC-006 | L2 | IMPL_ONLY | FACT | `lib/isSReplacementEligible.ts` は `app/components/ThirdPanel.tsx` および `tests/genericIntegration.test.ts` / `tests/multiDrugCompose.test.ts` から import されているが、L4 Input 文書群のいずれにもファイル名での言及がない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `app/components/ThirdPanel.tsx`・`tests/genericIntegration.test.ts`・`tests/multiDrugCompose.test.ts` 検索語: `isSReplacementEligible` |
| AC-007 | L2 | IMPL_ONLY | FACT | `lib/jsonScenarioBuilder.ts` は `lib/createSoapFromInput.ts` および `lib/soapComposer.ts` から import されているが、L4 Input 文書群のいずれにもファイル名での言及がない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `lib/createSoapFromInput.ts`・`lib/soapComposer.ts` 検索語: `jsonScenarioBuilder` |
| AC-008 | L2 | IMPL_ONLY | FACT | `scripts/verify_addon_panel.ts` は `package.json` の `scripts` オブジェクトに登録されておらず、他の `scripts/` / `app/` / `lib/` / `tests/` ファイルからも import・呼び出しされていない。L4 Input 文書群にもファイル名での言及がない。 | Implementation | 該当なし（L4 Input セット内 0 件） | `package.json` 検索語: `verify_addon_panel`（0件）／ 全体検索: `verify_addon_panel`（自ファイルの先頭コメントのみ） |
| AC-009 | L2 | IMPL_ONLY | FACT | `scripts/verify_buildS.ts` は AC-008 と同一パターン（`package.json` 未登録・他ファイルから未参照・L4 Input 文書群に言及なし）。 | Implementation | 該当なし（L4 Input セット内 0 件） | 全体検索: `verify_buildS`（自ファイルの先頭コメントのみ） |
| AC-010 | L2 | IMPL_ONLY | FACT | `scripts/build-static.js` は `package.json` の `"build:static": "EXPORT_STATIC=1 node scripts/build-static.js"` として登録され構造的に接続されているが、その目的・出力・実行タイミングを説明する記述が L4 Input 文書群のいずれにもない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `package.json` 検索語: `build-static` |
| AC-011 | L2 | IMPL_ONLY | FACT | `tests/` 配下 10 ファイル中 8 ファイル（`drugSubject.test.ts` / `genericIntegration.test.ts` / `menuDisplay.test.ts` / `mergeBlocks.test.ts` / `multiDrugCompose.test.ts` / `personaState.test.ts` / `soapMerge.test.ts` / `stateTransitions.test.ts`）は、L4 Input 文書群のいずれにもファイル名で言及されていない。ファイル名で言及されるのは `tests/moduleValidator.test.ts`（`prompts/RULES.md`）と `tests/search.test.ts`（`docs/DESIGN_PRINCIPLES.md` / `prompts/RULES.md`）の 2 件のみ。集約レベルの責務（`npm test` を毎回実施すること）は `docs/IMPLEMENTATION_CHECKLIST.md` に記載がある。 | Documentation | `docs/IMPLEMENTATION_CHECKLIST.md` 16行「npm test（0 fail であること...）」 | 各ファイル名でのファイル名検索（8件が L4 Input セット内 0 件） |
| AC-012 | L3 | IMPL_ONLY | FACT | `app/components/LockGate.tsx` は実体として存在するが、`grep -rln "LockGate" app/ --include="*.tsx" --include="*.ts"`（自ファイル除く）は 0 件であり、`app/layout.tsx`（globals.css のみ import）・`app/page.tsx`（DashboardClient・lib/scenarioValidator・lib/moduleValidator・lib/crossModuleValidator のみ import）を含む `app/` 配下のどのファイルからも import されていない。L4 Input 文書群にもファイル名での言及がない。 | Implementation | 該当なし（L4 Input セット内 0 件） | `app/layout.tsx`（全文, import 4行）／`app/page.tsx`（全文, import 5行）／横断検索 `LockGate`（自ファイルのみ） |
| AC-013 | L3 | IMPL_ONLY | FACT | `middleware.ts`（リポジトリルート、Basic 認証パスホワイトリスト処理）は実体として存在するが、L4 Input 文書群のいずれにもファイル名での言及がない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `middleware.ts` 全文（`isNextInternal` / `middleware` export） |
| AC-014 | L3 | IMPL_ONLY | FACT | `next.config.js` は実体として存在し `app/page.tsx` のコメント内で `EXPORT_STATIC` 分岐に言及されるが、L4 Input 文書群のいずれにもファイル名での言及がない。 | Documentation | 該当なし（L4 Input セット内 0 件） | `app/page.tsx` 4〜7行目コメント内 `next.config.js` 言及 |
| AC-015 | L3 | CONFLICT | FACT | `docs/DEVELOPMENT_STANDARD.md` §3 は「SOAP生成（buildSoap.ts / soapComposer.ts — S/O/A/P組み立て・{{drug_subject}}解決・persona適用・followup付与）」と、両ファイルを一体のステップとして記述する。実際の import グラフでは、主要な手動入力 UI フロー（`app/components/DashboardClient.tsx`）は `lib/buildSoap.ts`（`buildNodeFields` / `mergeBlocks`）と `lib/applyPersona.ts`（`applyPersonaToFieldsWithGuard`）を直接 import しており、`lib/soapComposer.ts` を import していない。`lib/soapComposer.ts` は `lib/createSoapFromInput.ts` からのみ import される。 | Documentation | `docs/DEVELOPMENT_STANDARD.md` §3 実行時アーキテクチャ図「SOAP生成（buildSoap.ts / soapComposer.ts...）」 | `app/components/DashboardClient.tsx` 検索語: `from '../../lib/buildSoap'` / `from '../../lib/applyPersona'`（あり）、`from '../../lib/soapComposer'`（なし）／ `lib/createSoapFromInput.ts` 検索語: `soapComposer` |
| AC-016 | L4 | IMPL_ONLY | FACT | `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md` は実在し、`prompts/RULES.md` から参照されているが、`docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map に名称・範囲表記のいずれでも記載がなく、Map から到達不能である。 | Documentation | `docs/DEVELOPMENT_STANDARD.md` §7 Documentation Map（`PRODUCT_VARIANT_SEPARATION_PRINCIPLE` 該当なし） | `docs/PRODUCT_VARIANT_SEPARATION_PRINCIPLE.md`（実在）／ `prompts/RULES.md` 検索語: `PRODUCT_VARIANT_SEPARATION_PRINCIPLE`（879行で参照） |

### 分類別件数

| Classification | 件数 |
|---|---|
| MATCH | 2 |
| DOC_ONLY | 0 |
| IMPL_ONLY | 11 |
| CONFLICT | 3 |
| **合計** | **16** |

### Impact 別件数

| Impact | 件数 |
|---|---|
| Architecture | 1 |
| Documentation | 12 |
| Implementation | 3 |
| Unknown | 0 |
| **合計** | **16** |

### Evidence Type 別件数

| Evidence Type | 件数 |
|---|---|
| FACT | 16 |
| INFERENCE | 0 |
| UNKNOWN | 0 |

---

## 5. 責務所在表（二重定義・無主地）

### 5.1 二重定義（同一責務について複数文書・複数フェーズが宣言）

| 対象責務 | 宣言箇所 A | 宣言箇所 B | 状態 |
|---|---|---|---|
| `persona`（top-level JSON フィールド）の生成責任 | `prompts/vNext/PN5-Non-Scenario.md`「persona セクション（必須）」 | `prompts/vNext/PN6-Assembly.md` Step 1「Phase 2 から...persona」 | 二重定義（AC-003） |
| ModuleValidator errorCode の本文チェック表への反映 | `docs/VALIDATOR_STANDARD.md` §3-A・§3-B 本文チェック表（38 種を番号付きで記載） | 同ファイル Appendix errorCode 一覧表／実装コード（共に 43 種） | 本文チェック表と Appendix／実装の間の網羅差（AC-004） |

上記 2 件以外に、L4 Input 文書群の間で同一フィールド・同一責務について相互に矛盾する正本宣言は検出されなかった。

### 5.2 無主地（実体は存在するがいずれの L4 Input 文書にも責務記載がない）

4節の `IMPL_ONLY` 11 件（AC-005〜AC-014、AC-016）が該当する。レイヤ別内訳:

```
L2（検証層・スクリプト・テスト）: 7件（AC-005〜AC-011）
L3（実行時層）              : 3件（AC-012〜AC-014）
L4（文書層）                : 1件（AC-016）
```

無主地には、実行経路へ接続されている要素と、Repository 内で参照元または登録先を確認できない要素の双方が含まれる。本ユニットでは責務の帰属判断および取り扱い方針の決定は行わない。なお「文書が宣言したが実体がない」（DOC_ONLY）は本調査では 0 件だった。

---

## 6. 依存方向の実測結果

### (a) runtime コード（`app/` / `lib/`）が `bridges/` を参照していないか

```bash
grep -rn "bridges/" app/ lib/ --include="*.ts" --include="*.tsx"
```

**結果**: 0 件。runtime コードから bridge 原稿への参照は検出されなかった（FACT）。DP-07（bridge SOT 原則）が想定する「bridge → JSON への一方向フロー」と構造的に整合する。

### (b) `prompts/vNext/*` が旧体系ファイルを必須参照していないか

```bash
grep -rn "P0-A\.md|P0-B\.md|P0-C\.md|P0-D\.md|P1\.md|P2A\.md|P2B\.md|P3\.md|P4\.md|P5\.md|BOOTSTRAP_STANDARD|P1_STANDARD|P2B_STANDARD|P3_STANDARD|P4_STANDARD|P5_STANDARD" prompts/vNext/*.md
```

**結果**: 0 件。`prompts/vNext/` 配下のファイルから旧体系ファイルへの参照は検出されなかった（FACT）。

### (c) `docs/*` 間の参照が循環していないか

L4 Input セット 11 文書（`docs/DEVELOPMENT_STANDARD.md` / `docs/VALIDATOR_STANDARD.md` / `docs/DESIGN_PRINCIPLES.md` / `docs/JSON_STANDARD.md` / `docs/IMPLEMENTATION_CHECKLIST.md` / `docs/feature-glossary.md` / `prompts/PROJECT_CONTEXT.md` / `prompts/RULES.md` / `prompts/vNext/HANDOFF.md` / `prompts/vNext/STARTUP_PROMPT.md` / `prompts/vNext/AUTORUN.md`）の相互参照を確認した。

**結果**: A→B→A の形の直接循環は検出されなかった（FACT）。参照構造は `prompts/RULES.md` / `docs/DESIGN_PRINCIPLES.md` / `docs/IMPLEMENTATION_CHECKLIST.md` / `docs/OPEN_DESIGN_QUESTIONS.md` へ収束する形であり、`docs/DEVELOPMENT_STANDARD.md` と `prompts/PROJECT_CONTEXT.md` は互いに参照し合う（DEVELOPMENT_STANDARD → PROJECT_CONTEXT、PROJECT_CONTEXT → DEVELOPMENT_STANDARD）が、これは §0 の位置づけ図で明示された双方向の「索引 ⇔ 詳細」関係であり、循環参照ではなく相互参照として構造上宣言されている（FACT）。

---

## 7. Scope 外として記録のみ行った事象

| # | 該当カテゴリ | 件数 | 内容（要約のみ・詳細記述なし） |
|---|---|---|---|
| ① | Stage 2-A Closed | 0 | 本調査中、Stage 2-A の判断そのものを再監査する必要が生じた事象はなかった |
| ② | 既存台帳あり | 0 | 本調査で発見した事象のうち、OPEN_DESIGN_QUESTIONS の Q-* ／ RULES の CHECK-* ／ HANDOFF の GAP-01 ／ RULES §4 監査未整備 3 系統のいずれかに一致するものはなかった |
| ③ | CTO 監査 ID 既存 | 2 | — |

---

## 8. 判定（Tier1 記入欄）

**判定: PASS WITH FINDINGS**

| 項目 | 内容 |
|---|---|
| 判定日 | 2026-07-28 |
| 判定者 | Tier1（Opus） |
| 判定対象 | 本記録（R1 修正反映版） |
| 準拠 | S2-CHECK-1（Architecture）設計 v1.2 §9 判定基準 |

### 判定根拠

- Finding 16 件のうち MATCH 2 件・非 MATCH 14 件（DOC_ONLY 0 / IMPL_ONLY 11 / CONFLICT 3）。
  乖離が 1 件以上存在するため PASS（乖離 0 件かつ UNKNOWN 0 件）には該当しない
- 全 16 件が Evidence Type = FACT で分類済み（INFERENCE 0 / UNKNOWN 0）
- Layer / Classification / Evidence Type / Impact はいずれも設計 v1.2 が定める固定値のみを使用
- ID は AC-001〜AC-016 の連番。欠番・重複なし
- 分類別・Impact 別・Evidence Type 別の各件数表、および §5.2 無主地内訳・§3 カバレッジ表は、
  Tier1 が台帳から再集計した値と一致
- STOP-A〜G のいずれにも該当していない
- A0〜A6 を完遂。検証コマンド（tsc / test / build / audit / dev）未実行、実機確認なし、
  変更ファイルは本記録 1 件のみ、commit / push 未実施

以上により、設計 v1.2 §9 の **PASS WITH FINDINGS**（乖離 1 件以上・全件 Evidence 付きで分類済み・
STOP 非該当）に該当すると判定する。

### Tier1 が記録のうえ受容した軽微な残存事項

1. **手順順序**: A5 を A3 / A4 より先に実施した（2 節に記録）。A5 の入力は Repository への直接
   grep のみで A3 / A4 の出力に依存せず、逆方向の依存も存在しないため、調査結果の有効性に
   影響しないと判断し受容した
2. **2 節の省略表記**: 「A5 依存方向の実測」のコマンド例に省略記号が 1 件残存する。同一コマンドの
   完全形が 6 節 (b) に展開済みで記載されており、再現可能性は確保されているため受容した

### Findings の取り扱い

本ユニットは読み取り専用の調査であり、記録された 14 件の非 MATCH Finding に対する修正・
方針決定・優先順位付けは行わない。取り扱いは S2-CHECK-1（Architecture）設計 v1.2 §8.2 に従い、
Stage 2-B 以降の別ユニットの入力とする。

### commit 承認

本記録 1 ファイル（`docs/reviews/P1_S2_CHECK1_ARCHITECTURE.md`）のみを対象とした commit を承認する。

---

## 9. 本調査で確認していない範囲

- L3 は静的構造確認（存在・import/export・props・関数呼び出し・文書との対応）のみであり、Runtime 品質・UI 設計の良否・状態管理の良否・ブラウザ実機挙動は確認していない
- `npx tsc --noEmit` / `npm test` / `npm run build` / `npm run audit` / `npm run dev` は実行していない（静的調査のため）
- ブラウザでの実機確認は行っていない
- `data/modules/*.json` および `bridges/*.md` の中身（医学的内容・S/O/A/P本文）は対象外とした（件数・登録状況の確認のみ）
- 旧体系（`prompts/P0-A.md`〜`P5.md`、`docs/BOOTSTRAP_STANDARD.md`、`docs/P1_STANDARD.md`〜`P5_STANDARD.md`）の Legacy 化可否の判断は行っていない（A5(b) で vNext→旧体系の依存方向のみ実測した）
- `docs/reviews/*` は既存記録の再判定禁止の対象として扱い、内容の当否判断には使用していない（ID の存在確認相当の用途のみ）
- L2 の `lib/moduleValidator.ts` / `lib/crossModuleValidator.ts` 以外のファイル（`lib/scenarioValidator.ts` / `lib/validationRunner.ts` 等）については、AC-004 に相当する errorCode 網羅性の精査は実施していない
- app/components 配下の個別コンポーネント（Sidebar.tsx / SecondaryPanel.tsx / SoapEditor.tsx / ComposeNodeBar.tsx）について、L4 Input 文書群での言及有無は確認したが、AC-012（LockGate）と同水準の import グラフ全数追跡（他コンポーネントからの被参照有無）までは実施していない
- Impact 列は「影響先の分類」のみを表し、優先度・重大度・修正要否の判断は含まない（本調査の対象外）
