# F-1 Stage 4 引き継ぎ（実務正本）

**作成日**: 2026-07-31
**性格**: 会話要約ではなく、**次チャットで Repository 作業を正確に再開するための実務上の引き継ぎ正本**。
**次の開始地点**: **Stage 4 Commit ⑤**（`lib/moduleLoader.ts` の `getSearchIndex()` を manifest 由来へ切り替える）

---

## 1. 現在の Repository 状態

| 項目 | 値 |
|---|---|
| branch | `feat/nlp-input-panel-and-new-schema` |
| local HEAD | `424fa94e49dc2dc6ee93da344336ddead7f4cbf9`（`test(search): add structured search coverage tests`） |
| remote HEAD | `0685962524a2eb9d211ae5f2ffcdbd5c62dba0ab`（`docs(review): correct validator warning count in architecture review`） |
| ahead / behind | **10 / 0** |
| staged | **なし**（`git diff --cached` は空） |
| working tree | 許可済み既存差分 4 件のみ |

### 許可済み既存差分 4 件（本セッション開始前から存在・stage しない）

```
 M .claude/settings.local.json
?? .claude/launch.json
?? bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak
?? docs/reviews/PHASE2_STAGE1_VERIFICATION_2026-07-25.md
```

出典: `docs/reviews/P1_S2B_FIX_PLAN.md` §1 ／ `docs/reviews/P1_S2B_DISPOSITION.md` §1。

---

## 2. 未 push commit 一覧（**古い順**・10 件）

```
e61158d  docs(review): define F-1 stage 4 search manifest plan
145455e  docs(review): reconcile stage 4 plan file inventory
b59e202  docs(review): add classification metadata to manifest scenario schema
2a67a14  docs(review): replace generatedFrom with deterministic sourceHash
2130952  docs(review): preserve module registration order in manifest
d64dde6  docs(review): retain handlingTags for indication label reconstruction
690765b  feat(search): add search manifest schema and generator
076d5d1  chore(search): generate search manifest
a982f68  feat(search): exclude soap body from search corpus
424fa94  test(search): add structured search coverage tests
```

**push は Owner の明示指示があるまで行わない。**

---

## 3. F-1 全体の進捗

| Stage | 状態 |
|---|---|
| **Stage 1**（計測の常設化） | **完了**・remote 反映済み（`e0fd3ea`） |
| **Stage 2**（キャッシュヘッダ範囲限定） | **完了**・remote 反映済み（`079eba7` ／ 検証記録 `0aac026`） |
| **Stage 3**（loader interface 導入） | **完了**・remote 反映済み（`4273c1d` + `b15d3f3`） |
| **Stage 4 Commit ①〜④** | **完了**（未 push） |
| **Stage 4 Commit ⑤〜⑥** | **未着手** |
| production 検索経路への接続 | **未実施**（D-S4-1 (a) により Stage 4 では接続しない） |

---

## 4. Stage 4 の commit

### 実装 commit（4 件）

| hash | message | 内容 |
|---|---|---|
| `690765b` | `feat(search): add search manifest schema and generator` | `lib/searchManifest.ts`（新）／ `scripts/generate-search-manifest.ts`（新）／ `package.json`（script 1 行） |
| `076d5d1` | `chore(search): generate search manifest` | `data/search-manifest.json`（新・生成物 22,757 行） |
| `a982f68` | `feat(search): exclude soap body from search corpus` | `lib/search.ts`（S/O/A/P 4 行削除）／ `tests/searchManifestParity.test.ts`（新）／ `tests/searchBodyExclusion.test.ts`（新） |
| `424fa94` | `test(search): add structured search coverage tests` | `tests/searchCoverage.test.ts`（新） |

### 計画・Owner Decision を保存した docs commit（6 件）

| hash | message | 反映内容 |
|---|---|---|
| `e61158d` | `docs(review): define F-1 stage 4 search manifest plan` | 計画文書の新規作成（`F1_STAGE4_PLAN_2026-07-30.md`） |
| `145455e` | `docs(review): reconcile stage 4 plan file inventory` | §2 の件数・一覧の整合回復（新規 6 / 変更 5） |
| `b59e202` | `docs(review): add classification metadata to manifest scenario schema` | **D-S4-8** |
| `2a67a14` | `docs(review): replace generatedFrom with deterministic sourceHash` | **D-S4-9** |
| `2130952` | `docs(review): preserve module registration order in manifest` | **D-S4-10** |
| `d64dde6` | `docs(review): retain handlingTags for indication label reconstruction` | **D-S4-11** |

---

## 5. Owner Decision（D-S4-1 〜 D-S4-11）

| ID | 決定 | 理由 |
|---|---|---|
| **D-S4-1** | **(a) production の DashboardClient および検索経路へ接続しない。** Stage 4 は manifest 生成・stale 検出・schema/ID 整合・coverage・intentional loss 固定・本文非混入保証・`getSearchIndex()` の manifest 由来化までを責務とする | Client Component から `moduleLoader` を直接 import すると `ALL_MODULES` がクライアントバンドルへ引き込まれる可能性がある／現在の `allModules` prop と重複する危険／manifest を prop 追加しても `allModules` が残る段階では配信量削減にならない／production 接続は module payload 境界と一緒に後続 Stage で設計すべき |
| **D-S4-2** | **`manufacturer` は manifest へ創作・推測追加しない。** Owner 要件との GAP として記録。canonical への導入は F-1 とは別課題 | canonical JSON に **0/35** で存在しない（`manufacturer` / `maker` / `製造販売` のいずれの文字列も不在） |
| **D-S4-3** | **`displayName` 欠落は canonical を修正しない。** manifest では **brandCatalog のキーを検索対象として保持**し、`displayName` は**存在する場合のみ**追加。**generator による補完・創作は禁止** | `dm_insulin_mixed_rapid_long` の「ライゾデグ」に `displayName` が無い（118/119）。現行 `buildSearchIndex` も optional 扱いのため検索挙動は変わらない |
| **D-S4-4** | **dosage variant は canonical に構造化値が存在する場合のみ収録**。剤形名・規格・本文からの**推測生成を禁止** | `concentration_variant` は **1/35**（`allergy_h1_antihistamine_eye_drops` の `template.reservedHandlingTags` のみ） |
| **D-S4-5** | **`payload-baseline` は更新しない。** runtime search index と structured manifest を**分離報告**する（raw/gzip・reduction rate・300 module projection） | 測定対象が異なるため。baseline reset は Owner の明示指示時のみ |
| **D-S4-6** | **`tests/searchBodyExclusion.test.ts` は独立テスト**（parity へ統合しない）。fixture / helper の共有は許可 | SOAP 本文の非混入は F-1 の重要なアーキテクチャ境界であり、**独立した失敗理由として識別できる状態**を維持する |
| **D-S4-8** | `ManifestScenario` へ **`scenarioTags` / `sideEffectPresence` / `intentTags` / `sCompositionIntent`** を追加。**`SearchEntry` 再構築専用**とし検索 UI 以外の用途には使用しない。**`sComposition` は全体を保持せず `intent` のみ** | `getMenuGroupFromScenario`（`lib/menuGroups.ts`）が `groupLabel` 導出に参照する。欠くと `classifyDoseDirection` が id prefix へフォールバックし T-3 が FAIL する。**SOAP 本文ではない分類メタデータ** |
| **D-S4-9** | **`generatedFrom` を廃止し `sourceHash` へ変更。** manifest 全体（`sourceHash` 自身を除く）の決定論的直列化に対する **SHA-256 / 小文字 hex / UTF-8**。**Git HEAD・生成日時・絶対パス・環境依存値を含めない。T-3 で除外例外を設けない** | commit SHA は canonical が不変でも commit のたびに変化するため、T-3 の「バイト一致」が構造的に成立しない |
| **D-S4-10** | **module 配列は `ALL_MODULES` 登録順を保持**（`moduleId` で並べ替えない）。**Manifest は検索実行時に利用する順序を保持する**。`sourceHash` は module 配列の順序も対象に含める | 検索結果の順序も manifest の意味の一部。`ALL_MODULES` 登録順と `moduleId` 昇順は**一致しない**ため、ソートすると T-3 の deepEqual が破れる |
| **D-S4-11** | `ManifestBrandEntry` へ **`handlingTags` を追加**。canonical の値を**そのまま保持**（推測・補完・名称変換の禁止／2 値へ**縮約せず配列全体**／**原順序を維持**）。`sourceHash` の対象に含める。**`SearchEntry` 再構築専用** | `lib/search.ts` L219-229 が `brandCatalogIndicationLabelMap` の導出に参照。欠くと 1039/1060 しか再現できない。**SOAP 本文ではない** |

> **D-S4-7** は計画文書 §2 の件数表記・整合回復に関する判断（`145455e` で反映済み）。

---

## 6. Search Manifest の現在形

### 保存先

```
data/search-manifest.json
```

**`data/modules/` 配下には置かない。** `tests/moduleRegistry.test.ts`（F-6）が `data/modules/*.json` の件数と `ALL_MODULES.length` の一致を検証しているため、同ディレクトリへ置くと F-6 の整合テストが破綻する。

### top-level schema

```ts
interface SearchManifest {
  manifestVersion: string   // 現在 '1'
  sourceHash: string        // SHA-256 / 小文字 hex（D-S4-9）
  moduleCount: number       // 整合検証用
  scenarioCount: number     // 整合検証用
  modules: ManifestModule[]     // ALL_MODULES 登録順（D-S4-10）
  scenarios: ManifestScenario[] // 各 module 内の出現順
}
```

### module schema

```ts
interface ManifestModule {
  moduleId: string
  categoryPath: string[]
  brandNames: string[]
  nameAliases: string[]
  drugClass: string[]
  drugSpecificTags: string[]
  search: {
    exactAliases: string[]
    nameAliases: string[]
    keywords: string[]
    formulationSearchTokens: string[]
    priority: number
    matchPolicy: Record<string, unknown>
    primaryDisplayName?: string
  }
  brandCatalog: Record<string, ManifestBrandEntry>
  // 以下は値が存在する場合のみ出力（undefined を書き出さない）
  classKey?: string
  nodeKey?: string
  clinicalDomain?: string
  displayTitle?: string
  displaySubtitle?: string
  reservedHandlingTags?: string[]   // dosage variant（D-S4-4）
}
```

### scenario schema（9 フィールド固定）

```ts
interface ManifestScenario {
  moduleId: string
  globalId: string
  id: string
  title: string
  scenarioGroup: string
  // 分類メタデータ（D-S4-8）— SearchEntry 再構築専用
  scenarioTags: string[]
  sideEffectPresence: string
  intentTags: string[]
  sCompositionIntent?: string       // sComposition 全体は保持しない
}
```

**S / O / A / P・`SStructured` / `AStructured` / `PStructured`・`addonsRef`・`mergePolicy` は含めない。**

### brand entry schema

```ts
interface ManifestBrandEntry {
  aliases: string[]
  displayName?: string           // 存在する場合のみ（D-S4-3・補完禁止）
  displayGenericName?: string
  genericKey?: string
  indicationLabel?: string
  handlingTags?: string[]        // 配列全体・原順序（D-S4-11）
}
```

### 手編集禁止

`data/search-manifest.json` は `scripts/generate-search-manifest.ts` の出力であり**手編集してはならない**。手編集は T-3（stale 検出）が検出する。

### deterministic generator

```bash
npm run generate:search-manifest
```

- module 配列は `ALL_MODULES` 登録順を保持
- scenario 配列は各 module 内の出現順を保持
- object のキー順は `lib/searchManifest.ts` の構築順で固定
- `undefined` のフィールドは出力しない
- Git HEAD・生成日時・絶対パスなど環境依存値を一切含まない
- **同一 canonical JSON から常にバイト単位で同一の出力**（実測で 2 回生成のファイルハッシュ一致を確認済み）

### stale 検出方法

**Commit ⑤ で T-3 として実装予定。** commit 済み `data/search-manifest.json` が canonical JSON から再生成したものと**バイト一致**することを検証する。`sourceHash` を比較対象から除外する例外は設けない（D-S4-9）。

暫定的な手動確認手順:

```bash
npm run generate:search-manifest && git status --porcelain data/search-manifest.json
```

出力が空であれば stale ではない。

---

## 7. 現在の実測値

| 項目 | 値 |
|---|---|
| modules | **35** |
| scenarios | **1,060** |
| brands | **119** |
| manifest raw | **753,708 B**（736 KB） |
| 行数 | **22,757** |
| **sourceHash** | `fae63c75d116a267d1ed39de14319078d191e8e668059314db8732d8713db1c1` |
| **生成物ファイル SHA-256** | `b13eb1005297f35f95a9344b567c4d659e2e2062b7e7d123352fae13cced5d63` |
| SearchEntry parity | **21/21 フィールド完全一致**（canonical 由来 ⇔ manifest 由来・1,060 entries） |
| Owner 指定 35 検索ケース | **35/35 PASS** |
| 全テスト | **2,687 件全 PASS** / 138 suites |
| validator warning | **20 件で増減なし**（内訳は下記） |

### validator warning 20 件の内訳（F-1 とは無関係・既存）

```
 2  ADDON_REQUIRED_TAG_UNREACHABLE
 4  ADDON_SCOPE_VIOLATION
 2  MISSING_PERSONA
 7  SCENARIO_REQUIRED_TAG_UNREACHABLE
 4  SEARCH_TOKEN_ALIAS_POLLUTION
 1  STRUCTURED_ROLE_FORBIDDEN
```

---

## 8. intentional loss

SOAP 本文（S/O/A/P）にのみ存在する語句では検索到達できなくなった。**これは欠陥ではなく Owner 判断（D-F1-1）による意図的な喪失**であり、`tests/searchBodyExclusion.test.ts` が仕様として固定している。

### 具体例（コード上の実測・本文除去前 → 後）

| クエリ | 除去前 | 除去後 |
|---|---|---|
| `subject}}は、血` | 8 件 | **0 件** |
| `subject}}は、効` | 8 件 | **0 件** |
| `subject}}は、検` | 8 件 | **0 件** |
| `subject}}は、他` | 8 件 | **0 件** |

### 具体例（production preview で確認）

| クエリ | 結果 |
|---|---|
| `血糖値を改善する薬`（P 欄の一節） | **0 件** |
| `継続して使用することが大切`（P 欄の一節） | **0 件** |
| `リベルサス`（対照・構造化語） | **2 件ヒット** |

**失われていないもの**: brand / generic / alias（読み仮名・表記揺れ）／ dosage form ／ therapeutic area ／ 薬効分類。医学用語（低血糖・悪心・浮腫・脱水・シックデイ・充血・かゆみ・保湿・乾燥）も構造化フィールド経由で到達可能。

---

## 9. 本文非混入保証

`tests/searchBodyExclusion.test.ts` が独立テストとして保証している（D-S4-6）。

| 対象 | 検査数 | 混入 |
|---|---|---|
| `scenario.S / O / A / P` | 4,233 件 | **0 件** |
| `SStructured` / `AStructured` / `PStructured` の text | 4,773 件 | **0 件** |
| `addonsRef` | — | **キー混入なし** |

検索インデックス（`corpusTokens`）および Search Manifest の双方で保証する。**Commit ⑤ では manifest 側の T-6 検証を追加する。**

---

## 10. optional field 実測

| 項目 | 実測 | 検証方針 |
|---|---|---|
| `formulationSearchTokens` | **4/35** | canonical に存在する場合のみ値・順序一致。不在時に値があれば FAIL |
| `reservedHandlingTags`（dosage variant） | **1/35** | 同上 |
| `handlingTags` | **83/119 brand** | 値・順序一致。縮約しない |
| `displayName` | **118/119 brand** | 欠落 brand もキーが保持され、補完されていないことを検証 |
| `displayGenericName` | **119/119 brand** | canonical に存在する場合のみ一致 |
| `genericKey` | **54/119 brand** | 同上。不在時に値があれば FAIL |
| `indicationLabel` | **0/119 brand** | 実測 0 のため必須条件にしない |
| `manufacturer` | **0**（source data 不在） | manifest に混入していないことを検証 |
| scenario 分類メタデータ（4 項目） | **1,060/1,060** | canonical と値一致 |

---

## 11. Commit ⑤ の作業

**commit message**: `refactor(loader): build search index from manifest`

### 主目的

`lib/moduleLoader.ts` の `getSearchIndex()` を **`data/search-manifest.json` 由来へ切り替える**。

現在の実装（Stage 3）:

```ts
getSearchIndex(): SearchEntry[] {
  if (searchIndexCache === null) {
    searchIndexCache = modules.flatMap(m => buildSearchIndex(m))
  }
  return searchIndexCache
}
```

切り替え後は `buildIndexFromManifest(manifest)` を用いる（`lib/searchManifest.ts` に実装済み）。

### 変更対象ファイル

| ファイル | 変更内容 |
|---|---|
| `lib/moduleLoader.ts` | `getSearchIndex()` の実装差し替え。**interface（`ModuleLoader`）は変更しない** |
| `tests/searchManifestParity.test.ts` | **T-3**（manifest 等価・stale 検出）／ **T-5**（サイズ回帰）／ **T-7**（件数・ID 整合）を追加 |
| `tests/searchBodyExclusion.test.ts` | **T-6**（manifest 側の本文非混入）を追加 |
| `tests/moduleLoader.parity.test.ts` | 期待値の更新（**必要な場合のみ**。緩和・skip は禁止） |

### 条件

- **`DashboardClient` は変更しない**
- **`app/page.tsx` は変更しない**
- **production 検索経路へ接続しない**（D-S4-1 (a)）
- **canonical JSON は変更しない**
- manifest 由来 `SearchEntry` と canonical 由来 `SearchEntry` の **deepEqual を維持**（21/21 フィールド）
- **stale 検出**（T-3）を実装する
- **ID 整合**（T-7）を実装する
- **moduleLoader parity** を維持する（`getSearchIndex()` == 期待値）
- **rollback 単位を維持**：⑤のみ revert すれば全件構築へ戻る

---

## 12. Commit ⑥ の作業

**commit message**: `chore(measure): separate manifest metrics in payload measurement`

`scripts/measure-payload.ts` を変更し、以下を**分離計測**する（D-S4-5）。

```
── current runtime search index ──
  raw                            :  x,xxx,xxx B
  gzip                           :    xxx,xxx B

── structured search manifest ──
  raw                            :    753,708 B
  gzip                           :    xxx,xxx B

── comparison ──
  reduction rate（index 比）      :        xx.x %
  300 module projection (raw)    :  x,xxx,xxx B
  300 module projection (gzip)   :    xxx KB
```

現在の `buildManifestReference()`（試算値）を、**実 manifest（`data/search-manifest.json`）の読み込み**へ置き換える。

**`payload-baseline-2026-07-30.json` は更新しない。**

---

## 13. Commit ⑤ 開始前の確認手順

```bash
git branch --show-current                                    # feat/nlp-input-panel-and-new-schema
git rev-parse HEAD                                           # 424fa94...（本書 §1 と一致すること）
git fetch origin && git rev-parse origin/feat/nlp-input-panel-and-new-schema   # 0685962...
git rev-list --left-right --count HEAD...origin/feat/nlp-input-panel-and-new-schema  # 10  0
git status --short                                           # 許可済み 4 件のみ
git diff --cached --name-only                                # 空であること
git log --oneline --reverse origin/feat/nlp-input-panel-and-new-schema..HEAD   # 本書 §2 と一致
```

さらに**禁止範囲の差分がないこと**を確認する。

```bash
git status --porcelain app/components/DashboardClient.tsx app/page.tsx data/modules data/modules/index.ts
```

いずれの出力も空であること（`bridges/*.bak` は許可済み既存差分）。

**本書の §1・§2・§7 の値と実測が一致しない場合は、実装に着手せず Owner へ報告する。**

---

## 14. 停止条件

以下が発生したら**実装せず Owner へ報告**する。

1. **manifest と canonical の parity 不一致**（21 フィールドのいずれかが不一致）
2. **schema 不足**（`SearchEntry` 再構築に必要なフィールドが manifest に無い）
3. **`sourceHash` の非決定性**（同一入力から異なる値が出る）
4. **manifest 再生成差分**（`npm run generate:search-manifest` 後に git 差分が出る）
5. **想定外の検索欠落**（構造化検索語で到達できなくなる）
6. **payload 増加**（manifest サイズが想定を超えて増える）
7. **production コードへの想定外の波及**
8. **計画外ファイル変更**

自己判断で設計範囲を広げない。

---

## 15. 未解決 GAP

| # | 内容 | 扱い |
|---|---|---|
| 1 | **`manufacturer` の source data 不在** | canonical JSON に 0/35。Owner 要件との GAP。canonical への導入は **F-1 とは別課題** |
| 2 | **`dm_insulin_mixed_rapid_long` の `displayName` 欠落** | 「ライゾデグ」1 件（118/119）。Stage 4 では canonical を修正しない。**別課題** |
| 3 | **dosage variant が 1/35 のみ** | `concentration_variant` は `allergy_h1_antihistamine_eye_drops` のみ。推測生成しない |
| 4 | **production の `DashboardClient` はまだ `ALL_MODULES` 由来で検索 index を構築** | `DashboardClient.tsx` L166 が `allModules.flatMap(m => buildSearchIndex(m))` のまま。**D-S4-1 (a) により Stage 4 では接続しない**。配信量削減は後続 Stage |
| 5 | **Stage 4 完了後も残る Finding** | **F-3**（旧体系 約 8,600 行の状態表示欠落）／ **F-4b**（`dm_insulin_regular` / `dm_insulin_intermediate` の persona 補完）／ **F-5**（Documentation Map の DP 範囲記載）／ **AC-004**（VALIDATOR_STANDARD の番号体系・BLOCKED） |
| 6 | **GAP-02 候補**（`formulationSearchTokens` の bridge⇔JSON 監査未整備） | `prompts/vNext/HANDOFF.md` への起票は未実施。F-1 外の別課題 |

---

## 16. 変更禁止範囲

### Commit ⑤

| 対象 | 可否 |
|---|---|
| `lib/moduleLoader.ts` | **変更可**（`getSearchIndex()` の実装のみ。interface は変更しない） |
| `tests/searchManifestParity.test.ts` | **変更可**（T-3 / T-5 / T-7 追加） |
| `tests/searchBodyExclusion.test.ts` | **変更可**（T-6 追加） |
| `tests/moduleLoader.parity.test.ts` | **必要な場合のみ変更可**（緩和・skip は禁止） |
| **`app/components/DashboardClient.tsx`** | **変更禁止** |
| **`app/page.tsx`** | **変更禁止** |
| **`data/modules/*.json`（canonical JSON）** | **変更禁止** |
| **`bridges/`** | **変更禁止** |
| **`data/modules/index.ts`** | **変更禁止** |
| **`data/search-manifest.json`** | **変更禁止**（再生成しても差分が出ないこと） |
| **`lib/search.ts`** | **変更禁止**（Commit ③ で確定済み） |
| **`scripts/measure-payload.ts`** | **変更禁止**（Commit ⑥ の責務） |
| **`tests/searchCoverage.test.ts`** | **変更禁止**（Commit ④ で確定済み） |
| **`package.json`** | **変更禁止** |

### Commit ⑥

| 対象 | 可否 |
|---|---|
| `scripts/measure-payload.ts` | **変更可** |
| **`docs/reviews/f1/payload-baseline-2026-07-30.json`** | **変更禁止**（baseline は更新しない・D-S4-5） |
| **`lib/moduleLoader.ts`** | **変更禁止**（Commit ⑤ で確定済み） |
| **`lib/search.ts` / `lib/searchManifest.ts`** | **変更禁止** |
| **`data/search-manifest.json`** | **変更禁止** |
| **`app/` 配下すべて** | **変更禁止** |
| **canonical JSON / `bridges/` / `data/modules/index.ts`** | **変更禁止** |
| **`tests/` 配下すべて** | **変更禁止** |

### 両 commit 共通

- **push は行わない**（Owner の明示指示があるまで）
- 許可済み既存差分 4 件を **stage しない**
- **Stage 4 以外へ範囲を広げない**
- commit message 末尾に `Co-Authored-By` を付す

---

## 付録: 関連文書

| 文書 | 役割 |
|---|---|
| `docs/reviews/f1/F1_STAGE4_PLAN_2026-07-30.md` | **Stage 4 の実行正本**。schema・テスト・commit 分割・Owner Decision |
| `docs/reviews/f1/F1_SEARCH_MANIFEST_DESIGN_2026-07-30.md` | 検索 manifest の詳細設計（2 層構造・移行テスト T-1〜T-5） |
| `docs/reviews/f1/F1_ARCHITECTURE_REVIEW_2026-07-30.md` | F-1 の問題定義・候補 A〜F 比較 |
| `docs/reviews/f1/F1_STAGE123_DESIGN_2026-07-30.md` | Stage 1〜3 の実行設計・GAP-02 候補 |
| `docs/reviews/f1/F1_STAGE2_VERIFICATION_2026-07-30.md` | Stage 2 のヘッダ検証記録 |
| `docs/reviews/f1/payload-baseline-2026-07-30.json` | 配信量の基準線（Owner 判断時のみ更新） |

**次の開始地点: Stage 4 Commit ⑤。**
