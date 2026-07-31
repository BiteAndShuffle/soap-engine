# F-1 Stage 4 最終検証記録

**作成日**: 2026-08-01
**性格**: Stage 4（構造化 Search Manifest 導入）の**完了検証記録**。実測結果と確定済み Owner Decision のみを記載する。推測・新規の設計判断を含まない。
**検証時点の HEAD**: `1a8b6382e2defb7e7bea33dad6624c09ee1f5e85`（`chore(measure): separate manifest metrics in payload measurement`）
**branch**: `feat/nlp-input-panel-and-new-schema`

**Stage 4 は完了。F-1 全体は close しない**（§25 / §26）。

**関連文書**: `docs/reviews/f1/F1_STAGE4_HANDOFF_2026-07-31.md` は **Commit ⑤ 開始前の歴史的 handoff** として保持し、本書では書き換えない。

---

## 1. Stage 4 の目的と完了判定

### 目的

SOAP 本文に依存しない構造化 Search Manifest を導入し、将来の SaaS loader へ接続できる検索データ境界を作る（`F1_STAGE4_PLAN_2026-07-30.md` 冒頭）。

### Stage 4 の責務範囲（D-S4-1 により確定）

| 責務 | 状態 |
|---|---|
| manifest 生成（canonical JSON からの純関数生成） | 完了 |
| stale 検出 | 完了（T-3） |
| schema / ID 整合 | 完了（T-7） |
| coverage | 完了（T-4 / T-4b） |
| intentional loss の固定 | 完了（T-2） |
| 本文非混入保証 | 完了（T-6） |
| `getSearchIndex()` の manifest 由来化 | 完了（Commit ⑤） |
| payload 計測の分離報告 | 完了（Commit ⑥） |
| **production 検索経路への接続** | **意図的に未実施**（D-S4-1 (a)） |

### 完了判定

**Commit ①〜⑥ がすべて完了し、Stage 4 は計画上の全責務を満たしている。**

`F1_STAGE4_PLAN_2026-07-30.md` §11 の追加条件もすべて満たしている。

| 条件 | 実測 |
|---|---|
| Stage 4 以外に着手しない | Stage 5 未着手 |
| `DashboardClient` の大規模移行を行わない | `app/components/DashboardClient.tsx` は 1 行も変更なし |
| `data/modules/index.ts` の登録構造を変更しない | 無変更 |
| SOAP 本文・canonical JSON を変更しない | `data/modules/*.json` / `bridges/` とも無変更 |
| 実装は Owner 承認後 | Commit ⑤ / ⑥ とも Owner 承認後に着手 |
| push は行わない | 未 push |

---

## 2. Commit ①〜⑥

| # | hash | message | 変更内容 |
|---|---|---|---|
| ① | `690765b94b5b6c5adcc0b7fac33cff9b923ec4bd` | `feat(search): add search manifest schema and generator` | `lib/searchManifest.ts`(+376) ／ `scripts/generate-search-manifest.ts`(+63) ／ `package.json`(+3 −1)。計 441 insertions / 1 deletion |
| ② | `076d5d1eb2a5ca0851e5161952fcef717ac58347` | `chore(search): generate search manifest` | `data/search-manifest.json`(+22,757)。生成物の commit |
| ③ | `a982f68b03dcf17dd7e26e36ec723d8376c0214f` | `feat(search): exclude soap body from search corpus` | `lib/search.ts`(15 +/−, S/O/A/P 4 行削除) ／ `tests/searchBodyExclusion.test.ts`(+167・新規) ／ `tests/searchManifestParity.test.ts`(+206・新規)。計 381 insertions / 7 deletions |
| ④ | `424fa94e49dc2dc6ee93da344336ddead7f4cbf9` | `test(search): add structured search coverage tests` | `tests/searchCoverage.test.ts`(+371・新規) |
| ⑤ | `b12a43aef2005b308b3da5a321ad325e723fdfba` | `refactor(loader): build search index from manifest` | `lib/moduleLoader.ts`(+67) ／ `tests/searchBodyExclusion.test.ts`(+86) ／ `tests/searchManifestParity.test.ts`(+209)。計 353 insertions / 9 deletions |
| ⑥ | `1a8b6382e2defb7e7bea33dad6624c09ee1f5e85` | `chore(measure): separate manifest metrics in payload measurement` | `scripts/measure-payload.ts`(+231 −3) |

### Commit ⑤ の実装内容

`lib/moduleLoader.ts` の `getSearchIndex()` の入力を canonical JSON 全件から commit 済み `data/search-manifest.json` へ切り替えた。

- manifest は**静的 import**（Owner Decision D-1 / 2026-07-31）。理由: commit 済み manifest を実際の loader 入力として使用する／`ModuleLoader` の同期 interface を維持する／Static・Offline runtime との互換性を維持する（`fs.readFileSync` は browser・`output:'export'` で成立しない）／Git・fs・生成時刻・実行環境へ依存しない
- `createBundledModuleLoader` へ optional な `manifest` 引数を**加算**した。省略時は従来どおり `modules` から index を構築するため、部分集合 loader の挙動は不変
- `ModuleLoader` interface・他 3 メソッド（`listModuleIds` / `getModule` / `getAllModules`）・同期性・memoize はすべて無変更
- `tests/moduleLoader.parity.test.ts` は**無変更で PASS** したため変更していない

### Commit ⑥ の実装内容

`scripts/measure-payload.ts` に「■ Stage 4 — Search Manifest 分離計測」セクションを加算した（7 項目: current runtime search index / structured search manifest / reduction / per-module metrics / 300-module projection / threshold status / historical comparison）。

- `package.json` は無変更。既存の `npm run measure:payload` から実行できる
- 既存要素を削除・緩和していない（ALL_MODULES 測定 / largest module 測定 / 既存しきい値判定 / baseline 読み込みと比較ロジック / `buildManifestReference()` の設計時試算 / `PayloadMeasurement` の既存フィールド）
- manifest は読み取りのみ。再生成・書き込みを行わない

---

## 3. Owner Decision（D-S4-1 〜 D-S4-11）

| ID | 決定 |
|---|---|
| **D-S4-1** | **(a) production の DashboardClient および検索経路へ接続しない。** Stage 4 は manifest 生成・stale 検出・schema/ID 整合・coverage・intentional loss 固定・本文非混入保証・`getSearchIndex()` の manifest 由来化までを責務とする |
| **D-S4-2** | **`manufacturer` は manifest へ創作・推測追加しない。** canonical JSON に 0/35 で存在しないため、Owner 要件との GAP として記録する。canonical への導入は F-1 とは別課題 |
| **D-S4-3** | **`displayName` 欠落は canonical を修正しない。** manifest では brandCatalog のキーを検索対象として保持し、`displayName` は存在する場合のみ追加。**generator による補完・創作は禁止** |
| **D-S4-4** | **dosage variant は canonical に構造化値が存在する場合のみ収録**。剤形名・規格・本文からの推測生成を禁止 |
| **D-S4-5** | **`payload-baseline` は更新しない。** runtime search index と structured manifest を**分離報告**する。baseline reset は Owner の明示指示時のみ |
| **D-S4-6** | **`tests/searchBodyExclusion.test.ts` は独立テスト**（parity へ統合しない）。fixture / helper の共有は許可 |
| **D-S4-7** | 計画文書 §2 の件数表記・整合回復に関する判断（`145455e` で反映済み） |
| **D-S4-8** | `ManifestScenario` へ **`scenarioTags` / `sideEffectPresence` / `intentTags` / `sCompositionIntent`** を追加。**`SearchEntry` 再構築専用**とし検索 UI 以外の用途には使用しない。**`sComposition` は全体を保持せず `intent` のみ** |
| **D-S4-9** | **`generatedFrom` を廃止し `sourceHash` へ変更。** manifest 本体（`sourceHash` 自身を除く）の決定論的直列化に対する **SHA-256 / 小文字 hex / UTF-8**。Git HEAD・生成日時・絶対パス・環境依存値を含めない。**T-3 で除外例外を設けない** |
| **D-S4-10** | **module 配列は `ALL_MODULES` 登録順を保持**（`moduleId` で並べ替えない）。Manifest は検索実行時に利用する順序を保持する。`sourceHash` は module 配列の順序も対象に含める |
| **D-S4-11** | `ManifestBrandEntry` へ **`handlingTags` を追加**。canonical の値を**そのまま保持**（推測・補完・名称変換の禁止／2 値へ縮約せず配列全体／原順序を維持）。`sourceHash` の対象に含める。**`SearchEntry` 再構築専用** |

### Commit ⑤ / ⑥ 実施時の追加 Owner Decision（2026-07-31 確定）

| ID | 決定 |
|---|---|
| **D-1** | `lib/moduleLoader.ts` は `data/search-manifest.json` を**静的 import** する。一時的な server bundle への manifest 追加を承認。ただし client 配信・HTML/RSC への波及がある場合は commit せず停止 |
| **D-2** | T-5 閾値を **gzip total ≤ 500 KB** / **gzip per module ≤ 1,500 B** に確定。**両方を独立に検証**する。baseline ファイルを更新せず、commit 済み manifest の gzip 実測値に対して判定する。総量 60 KB 案は不採用（正常な module 追加だけで早期に上限へ到達し 300 module 拡張を阻害するため） |
| **D-3** | 設計時試算（raw 357,402 B / gzip 24,969 B）は**変更しない**。Commit ⑥ で実測値を分離報告し、既存設計文書の訂正 commit は挟まない |

---

## 4. Search Manifest の最終 schema

保存先: `data/search-manifest.json`（**`data/modules/` 配下には置かない**。`tests/moduleRegistry.test.ts`（F-6）が `data/modules/*.json` の件数と `ALL_MODULES.length` の一致を検証しているため）。

型定義: `lib/searchManifest.ts`。

### top-level

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

### ManifestModule

```ts
interface ManifestModule {
  moduleId: string
  categoryPath: string[]
  classKey?: string
  nodeKey?: string
  clinicalDomain?: string
  displayTitle?: string
  displaySubtitle?: string
  brandNames: string[]
  nameAliases: string[]
  drugClass: string[]
  drugSpecificTags: string[]
  reservedHandlingTags?: string[]   // dosage variant（D-S4-4）
  search: {
    primaryDisplayName?: string
    exactAliases: string[]
    nameAliases: string[]
    keywords: string[]
    formulationSearchTokens: string[]
    priority: number
    matchPolicy: Record<string, unknown>
  }
  brandCatalog: Record<string, ManifestBrandEntry>
}
```

### ManifestBrandEntry

```ts
interface ManifestBrandEntry {
  displayName?: string           // 存在する場合のみ（D-S4-3・補完禁止）
  displayGenericName?: string
  genericKey?: string
  aliases: string[]
  indicationLabel?: string
  handlingTags?: string[]        // 配列全体・原順序（D-S4-11）
}
```

### ManifestScenario（9 フィールド固定）

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

**`S` / `O` / `A` / `P`・`SStructured` / `AStructured` / `PStructured`・`addonsRef`・`mergePolicy` は含めない。**

`tests/searchBodyExclusion.test.ts` が scenario の 9 フィールド allowlist 準拠を機械検証しており、allowlist 外フィールドの混入は 0 件（実測）。

### 生成

```bash
npm run generate:search-manifest
```

`data/search-manifest.json` は `scripts/generate-search-manifest.ts` の出力であり**手編集してはならない**。手編集・再生成漏れは T-3 が検出する。

- module 配列は `ALL_MODULES` 登録順を保持
- scenario 配列は各 module 内の出現順を保持
- object のキー順は `lib/searchManifest.ts` の構築順で固定
- `undefined` のフィールドは出力しない
- Git HEAD・生成日時・絶対パスなど環境依存値を一切含まない

---

## 5. sourceHash の定義

| 項目 | 仕様 |
|---|---|
| アルゴリズム | SHA-256 |
| 表現 | 小文字 hex 文字列（64 文字） |
| エンコード | UTF-8 |
| ハッシュ対象 | **manifest 本体（`sourceHash` 自身を除く `SearchManifestBody` 全体）の決定論的直列化**。module 配列の順序も対象に含める |
| 含めないもの | Git HEAD ／ 生成日時 ／ 絶対パス ／ その他の環境依存値 |
| 自己参照 | `sourceHash` 自身はハッシュ対象に含めない |
| T-3 での扱い | **比較対象から除外する例外を設けない**（D-S4-9） |

ハッシュ対象が manifest そのものであるため、「**manifest が変化した時だけ `sourceHash` も変化する**」という性質が定義上保証される。

### 実測値（HEAD `1a8b638`）

| 項目 | 値 |
|---|---|
| `sourceHash` | `fae63c75d116a267d1ed39de14319078d191e8e668059314db8732d8713db1c1` |
| 生成物ファイルの SHA-256 | `b13eb1005297f35f95a9344b567c4d659e2e2062b7e7d123352fae13cced5d63` |
| 決定論性 | 同一入力から 2 回生成して同一値（T-3 で機械検証） |
| 形式検証 | `/^[0-9a-f]{64}$/` に一致（T-3 で機械検証） |

---

## 6. 規模の実測

| 項目 | 実測 |
|---|---|
| modules | **35** |
| scenarios | **1,060** |
| brands（brandCatalog エントリ合計） | **119** |
| manifest 行数 | **22,757** |

`manifest.moduleCount` / `manifest.scenarioCount` は上記と一致（T-7 で機械検証）。

---

## 7. SearchEntry 21/21 完全一致

canonical JSON 由来の `SearchEntry[]` と manifest 由来の `SearchEntry[]` が、**全 21 フィールド・1,060 entries すべてで一致**する（不一致 0 件）。

| 検証軸 | 結果 |
|---|---|
| entries 件数 | 1,060 = 1,060 |
| `templateId` の並び（順序） | 完全一致 |
| 全 21 フィールドの値 | 完全一致（`corpusTokens` は Set 比較、他は直列化比較） |
| commit 済み manifest 由来 ⇔ in-memory manifest 由来 | 一致（直列化で情報が落ちていない） |

`SearchEntry` のフィールド数が 21 から変化した場合はテストが FAIL する（回帰検知）。

`buildIndexFromManifest` は正規化・トークン分割ロジックを再実装せず、`lib/search.ts` の `buildSearchIndex` を再利用している（`normalizeText` / `SEPARATOR_PATTERN` / トークン分割順序を二重実装しない）。

---

## 8. Owner 指定 35 検索ケース

**35/35 PASS。** canonical 由来 index と manifest 由来 index で結果が完全一致する。

```
先発品名   : リベルサス / ヒルドイド / アレジオン / ツイミーグ / ジャヌビア / インタール （6）
読み仮名   : りべるさす / ひるどいど / いんたーる                                   （3）
一般名     : セマグルチド / ヘパリン類似物質 / クロモグリク酸 / メトホルミン / ピオグリタゾン（5）
剤形       : クリーム / ローション / 軟膏 / スプレー / 点眼 / 注射 / 内服            （7）
薬効領域   : 糖尿病 / アレルギー / 皮膚科 / 眼科                                    （4）
薬効分類   : GLP-1 / DPP-4 / SGLT2 / インスリン / 抗ヒスタミン                      （5）
AND 検索   : ヒルドイド クリーム / リベルサス 内服 / アレジオン 点眼                 （3）
表記揺れ   : ﾘﾍﾞﾙｻｽ / リベルサス（全角半角）                                        （2）
─────────────────────────────────────────
合計 35 件
```

brand / generic / alias 系のケースはすべて 1 件以上ヒットする（到達性を機械検証）。

---

## 9. intentional loss

SOAP 本文（S/O/A/P）にのみ存在する語句では検索到達できない。**これは欠陥ではなく Owner 判断（D-F1-1）による意図的な喪失**であり、`tests/searchBodyExclusion.test.ts` の T-2 が**仕様として固定**している。

- 本文限定フラグメント（構造化トークンのいずれにも含まれない語句）で検索した場合、候補が 0 件になることを検証する
- 「意図せず本文検索が復活した」ことを検知できる

### 失われていないもの（機械検証済み）

brand / generic / alias（読み仮名・表記揺れ）／ 剤形 ／ 薬効領域 ／ 薬効分類。

医学用語（低血糖・悪心・浮腫・脱水・シックデイ・充血・かゆみ・保湿・乾燥）も `display.subtitle` / `drugSpecificTags` / `categoryPath` / `scenario.title` 等の構造化フィールド経由で到達可能。

---

## 10. SOAP 本文・xStructured・addonsRef の非混入

`tests/searchBodyExclusion.test.ts` が独立テストとして保証している（D-S4-6）。

| 対象 | 検査数 | 混入 |
|---|---|---|
| `scenario.S / O / A / P` | **4,233 件** | **0 件** |
| `SStructured` / `AStructured` / `PStructured` の text | **4,773 件** | **0 件** |
| `addonsRef` | — | **キー混入なし** |

**検索インデックス側と Search Manifest 側の双方で検証している。**

manifest 側では加えて、禁止キー（`"S":` `"O":` `"A":` `"P":` `"SStructured":` `"AStructured":` `"PStructured":` `"addonsRef":` `"mergePolicy":` `"sComposition":`）が生テキストに存在しないことと、scenario が 9 フィールド allowlist のみで構成されることを検証している。

---

## 11. T-1 〜 T-7 の結果

| ID | 検証内容 | 担当ファイル | 結果 |
|---|---|---|---|
| **T-1** | structured search parity（canonical ⇔ manifest。21 フィールド一致・構造化クエリ全件・2 語 AND・Owner 指定 35 ケース） | `searchManifestParity.test.ts` | **PASS** |
| **T-2** | intentional loss（本文限定語句で到達不能であることを仕様として固定） | `searchBodyExclusion.test.ts` | **PASS** |
| **T-3** | manifest 等価 / stale 検出（バイト一致・`sourceHash` 一致と決定論性・manifest 由来 SearchEntry の一致。**除外例外なし**） | `searchManifestParity.test.ts` | **PASS** |
| **T-4 / T-4b** | 構造化検索対象のカバレッジ（全モジュール必須項目・canonical との値一致・optional field・brandCatalog 保持・scenario 分類メタデータ一致） | `searchCoverage.test.ts` | **PASS** |
| **T-5** | サイズ回帰（gzip 総量・1 モジュールあたり増分を独立検証） | `searchManifestParity.test.ts` | **PASS** |
| **T-6** | SOAP 本文の非混入保証（検索インデックス側 ＋ manifest 側） | `searchBodyExclusion.test.ts` | **PASS** |
| **T-7** | 件数・ID 整合（`moduleCount` / `scenarioCount` / moduleId 順序 / globalId 一意性 / scenario 集合の一致） | `searchManifestParity.test.ts` | **PASS** |

### F-1 関連テストファイルの件数（実測）

| ファイル | tests |
|---|---|
| `tests/searchManifestParity.test.ts` | 22 |
| `tests/searchCoverage.test.ts` | 32 |
| `tests/searchBodyExclusion.test.ts` | 10 |
| `tests/moduleLoader.parity.test.ts` | 8 |
| **合計** | **72（全 PASS / fail 0）** |

---

## 12. 全テスト

```
# tests 2705
# suites 142
# pass 2705
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

Stage 4 着手前は 2,687 件 / 138 suites。**+18 件 / +4 suites**（Commit ⑤ の T-3 / T-5 / T-7 / manifest 側 T-6）。

**既存テストの緩和・削除・skip は行っていない。** `tests/moduleLoader.parity.test.ts` は無変更のまま 8/8 PASS（`getSearchIndex()` が manifest 由来になった後も、`ALL_MODULES.flatMap(buildSearchIndex)` との strict deepEqual が通過する）。

---

## 13. typecheck / build / build:static / audit

| 検証 | 結果 |
|---|---|
| `npx tsc --noEmit` | **PASS**（exit 0） |
| `npm run build` | **PASS**（clean build。ModuleValidator / CrossModuleValidator OK） |
| `npm run build:static` | **PASS**（`EXPORT_STATIC=1` 経路。`out/` 生成完了・`page.tsx` 復元確認済み・git 差分なし） |
| `npm run audit` | **PASS**（2 系統） |
| `npm run measure:payload` | **PASS**（exit 0） |

`npm run audit` の内訳:

```
監査対象モジュール: 35件
✅ ADDON bridge→JSON→UI chain: 全モジュール PASS

監査対象モジュール: 35件
✅ Alias fields bridge⇔JSON synchronization: 全モジュール PASS
```

---

## 14. validator warning

**20 件・Stage 4 着手前から増減なし。**

```
 7  SCENARIO_REQUIRED_TAG_UNREACHABLE
 4  SEARCH_TOKEN_ALIAS_POLLUTION
 4  ADDON_SCOPE_VIOLATION
 2  MISSING_PERSONA
 2  ADDON_REQUIRED_TAG_UNREACHABLE
 1  STRUCTURED_ROLE_FORBIDDEN
```

内訳も着手前と完全一致。いずれも F-1 とは無関係の既存 warning。

---

## 15. Manifest 実測

| 項目 | 実測 |
|---|---|
| raw | **753,708 B**（736 KB） |
| gzip | **35,941 B**（35 KB） |
| gzip / module | **1,026.9 B/module**（35 modules） |
| 行数 | 22,757 |

---

## 16. runtime search index 実測

| 項目 | 実測 |
|---|---|
| raw | **2,938,555 B**（2,870 KB） |
| gzip | **75,311 B**（74 KB） |
| gzip / module | 2,151.7 B/module |

測定定義は Stage 1 と同一（`buildSearchIndex` を全モジュールへ適用した `SearchEntry[]` の直列化）。Commit ⑥ では同一バイト列に対する gzip 測定を加算しただけで、定義を変更していない。

Commit ③（本文除去）後の値であるため、baseline に記録された `searchIndexBytes: 3,443,202`（本文除去前）とは測定時点が異なる。**baseline は更新しない。**

---

## 17. reduction

| 指標 | 削減量 | 削減率 | 分母 |
|---|---|---|---|
| raw | 2,184,847 B | **74.4 %** | current runtime search index raw（2,938,555 B） |
| gzip | 39,370 B | **52.3 %** | current runtime search index gzip（75,311 B） |

---

## 18. 300-module projection

算出式は **current measured value ÷ current module count × 300** に固定。丸めは最終結果への `Math.round` のみ（途中で丸めない）。**実測値ではなく外挿値である。**

| 対象 | raw | gzip |
|---|---|---|
| runtime search index | 25,187,614 B（24,597 KB） | 645,523 B（630 KB） |
| structured manifest | 6,460,354 B（6,309 KB） | **308,066 B（301 KB）** |

300 モジュール到達時も manifest gzip は 308,066 B < 512,000 B、per-module は 1,026.9 B < 1,500 B であり、**T-5 の閾値は 300 module 拡張を阻害しない。**

---

## 19. T-5 threshold 結果

上限値は `tests/searchManifestParity.test.ts` と `scripts/measure-payload.ts` で同一の定数を用いる（乖離させない）。

| 条件 | 実測 | 上限 | 判定 |
|---|---|---|---|
| manifest gzip total | 35,941 B | 512,000 B（500 KB） | **PASS**（上限の 7.0 %） |
| manifest gzip per module | 1,026.9 B | 1,500 B | **PASS**（上限の 68.5 %） |

**2 条件を独立に検証している**（D-2）。baseline ファイルは参照せず、commit 済み manifest を gzip した実測値に対して判定する。

### 設計時試算との差（D-3・分離報告）

| | design estimate（2026-07-29） | current measured | 差 | 差率（分母 = 試算値） |
|---|---|---|---|---|
| raw | 357,402 B | 753,708 B | +396,306 B | **+110.9 %** |
| gzip | 24,969 B | 35,941 B | +10,972 B | **+43.9 %** |

差の要因（試算後に確定した Owner Decision）:

- **D-S4-8** — `SearchEntry.groupLabel` を決定論的に再構築するために必要な scenario 分類メタデータ（`scenarioTags` / `sideEffectPresence` / `intentTags` / `sCompositionIntent`）を `ManifestScenario` へ追加。1,060 シナリオ全件に付与されるため raw への寄与が大きい
- **D-S4-11** — `SearchEntry.brandCatalogIndicationLabelMap` を再構築するために必要な `brandCatalog[].handlingTags` を `ManifestBrandEntry` へ追加（2 値へ縮約せず配列全体・原順序を保持）

いずれも SOAP 本文ではない（T-6 が非混入を保証）。**設計時試算は歴史的記録として保持し、書き換えない**（既存設計文書の訂正 commit は作成していない）。

---

## 20. server bundle 増加

| 項目 | Commit ⑤ 前 | Commit ⑤ 後 | 差分 |
|---|---|---|---|
| `.next/server/app/page.js` | 3,744,475 B | **4,311,866 B** | **+567,391 B** |
| `.next/server` 合計 | 4,788 KB | 5,340 KB | +552 KB |
| `.next/static` 合計 | 920 KB | 920 KB | **±0** |

manifest raw は 753,708 B であり、増加分は**その 75.3 %**。差はバンドラが indent 2 の JSON を最小化するためであり、「概ね manifest raw サイズ相当の範囲」に収まっている（D-1 の確認条件を満たす）。

**この増加は現時点では純増である。** D-S4-1 (a) により production は `getSearchIndex()` を呼ばないため、manifest は server bundle 上で未使用のまま存在する。解消は Stage 5（形態別 build）の対象。

---

## 21. client chunk / HTML / RSC / static export への混入

**すべて 0 件。想定外の波及はない。**

| 検査対象 | `sourceHash` | `manifestVersion` | `sCompositionIntent` | sourceHash 実値 |
|---|---|---|---|---|
| `.next/static/**`（client chunk） | 0 | 0 | 0 | 0 |
| 初期 HTML / RSC payload | 0 | 0 | 0 | 0 |
| `out/**`（static export） | 0 | 0 | 0 | — |

### 初期 HTML の実測（`next start` + `curl`）

```
raw : 3,949,946 B
gzip:   332,399 B
```

raw は `F1_ARCHITECTURE_REVIEW_2026-07-30.md` が Stage 4 着手前に記録した 3,949,946 B と**バイト単位で同一**。**HTML サイズが 1 バイトも増えていないことが、manifest が RSC payload へ入っていない直接の証拠である。**

manifest は `.next/server/app/page.js`（server bundle）にのみ存在する。

### Stage 2 のキャッシュヘッダ（回帰確認）

| 経路 | Cache-Control |
|---|---|
| HTML | `no-store, no-cache, must-revalidate, proxy-revalidate` |
| `/_next/static/**` | `public, max-age=31536000, immutable` |

Stage 2 の設定に回帰なし。

---

## 22. Manifest 再生成差分

```bash
npm run generate:search-manifest
```
→ `状態: 変更なし（canonical JSON から再生成した内容と一致）` / サイズ 753,708 B

`git status --porcelain data/search-manifest.json` は**空**。

Commit ⑤ / ⑥ とも `data/search-manifest.json` を変更していない。T-3 が `npm test` 実行時に stale を機械検出する。

---

## 23. rollback 単位

| commit | rollback 効果 | 影響範囲 |
|---|---|---|
| ① | 不要（未使用コードが残るだけ） | — |
| ② | ファイル削除 | 生成物のみ |
| **③** | **③ のみ revert で SOAP 本文検索が復活** | `lib/search.ts` の 4 行と T-1 / T-2 |
| ④ | 不要 | カバレッジテストのみ |
| **⑤** | **⑤ のみ revert で全件構築へ戻る** | `getSearchIndex()` の実装と静的 import。`buildIndexFromManifest` の import も同時に消えるため未使用コードが残らない |
| ⑥ | 不要 | 計測スクリプトのみ。production 挙動に影響なし |

**③ と ⑤ が分離されているため、「本文除去」と「2 層化」のどちらが原因かを切り分けられる。** ⑤ の revert は ①〜④ へ波及しない（`data/search-manifest.json` / `lib/searchManifest.ts` / `lib/search.ts` は ⑤ に含まれない）。

---

## 24. 既知 GAP

| # | 内容 | 扱い |
|---|---|---|
| 1 | **`manufacturer` の source data 不在** | canonical JSON に 0/35。Owner 要件との GAP。canonical への導入は **F-1 とは別課題**（D-S4-2） |
| 2 | **`dm_insulin_mixed_rapid_long` の `displayName` 欠落** | 「ライゾデグ」1 件（118/119 brand）。Stage 4 では canonical を修正しない。**別課題**（D-S4-3） |
| 3 | **dosage variant が 1/35 のみ** | `concentration_variant` は `allergy_h1_antihistamine_eye_drops` のみ。推測生成しない（D-S4-4） |
| 4 | **production の `DashboardClient` はまだ `ALL_MODULES` 由来で検索 index を構築** | `DashboardClient.tsx` L166 が `allModules.flatMap(m => buildSearchIndex(m))` のまま。**D-S4-1 (a) により Stage 4 では接続しない**。**Stage 5 の対象** |
| 5 | **server bundle の +567,391 B が現時点では純増** | production は `getSearchIndex()` を呼ばない。**Stage 5（形態別 build）で解消想定** |
| 6 | **GAP-02 候補**（`formulationSearchTokens` の bridge⇔JSON 監査未整備） | `prompts/vNext/HANDOFF.md` への起票は未実施。F-1 外の別課題 |
| 7 | **Stage 4 完了後も残る Finding** | **F-3**（旧体系 約 8,600 行の状態表示欠落）／ **F-4b**（`dm_insulin_regular` / `dm_insulin_intermediate` の persona 補完）／ **F-5**（Documentation Map の DP 範囲記載）／ **AC-004**（VALIDATOR_STANDARD の番号体系・BLOCKED） |

---

## 25. Stage 4 は完了だが F-1 全体は Stage 5 待ち

**Stage 4 は完了。F-1 全体は close しない。**

理由（Owner 提示・2026-08-01）:

> production の DashboardClient は依然として `allModules.flatMap(buildSearchIndex)` で検索 index を構築しており、全モジュール JSON の初期クライアント配信も未解消である。

これは **D-S4-1 により Stage 4 では意図的に変更しなかった範囲**であり、後続 Stage 5 の対象とする。

### F-1 全体の進捗

| Stage | 内容 | 状態 |
|---|---|---|
| Stage 1 | 計測の常設化（R-1） | 完了・remote 反映済み |
| Stage 2 | キャッシュヘッダ範囲限定（R-2） | 完了・remote 反映済み |
| Stage 3 | loader interface 導入（R-3・挙動不変） | 完了・remote 反映済み |
| **Stage 4** | **構造化 Search Manifest 導入（R-4）** | **完了（未 push）** |
| Stage 5 | 配布形態別 build（R-5） | **未着手** |

### Stage 4 が変えていないこと（実測）

| 項目 | 状態 |
|---|---|
| 初期 HTML の raw サイズ | 3,949,946 B（Stage 4 着手前と同一） |
| `ALL_MODULES` gzip（初期転送量の主指標） | 321,693 B（baseline から増減 0） |
| production の検索挙動 | 変化なし（`DashboardClient` は無変更） |
| 全モジュール JSON の初期クライアント配信 | **未解消** |

---

## 26. Stage 5 で解決すべき production 配信境界

以下は Stage 4 のスコープ外として意図的に残した範囲であり、Stage 5 の対象である。**本書では設計判断を行わない**（記録のみ）。

| # | 境界 | 現状（実測） |
|---|---|---|
| 1 | **`DashboardClient` の検索 index 構築** | `app/components/DashboardClient.tsx` L166 が `allModules.flatMap(m => buildSearchIndex(m))` で自前構築。`moduleLoader` / manifest を参照していない |
| 2 | **`allModules` prop の RSC 境界通過** | `app/page.tsx` が `moduleLoader.getAllModules()` の結果を `DashboardClient` へ prop で渡すため、全モジュールが RSC ペイロードとして初期 HTML へ埋め込まれる（raw 3,949,946 B / gzip 332,399 B） |
| 3 | **server bundle 上の未使用 manifest** | `.next/server/app/page.js` に manifest 753,708 B 相当（実測 +567,391 B）が含まれるが production から呼ばれない |
| 4 | **配布形態別 build** | `next.config.js` の `EXPORT_STATIC` 分岐は存在するが、loader の形態別実装（Static = 全同梱 / SaaS = manifest + 遅延取得）は未実装 |
| 5 | **未契約モジュールの非配信** | 全モジュールが全クライアントへ配信される状態が継続（`F1_ARCHITECTURE_REVIEW_2026-07-30.md` §8） |

`F1_STAGE123_DESIGN_2026-07-30.md` §6.3 が記録する差し替え境界:

```
Static / Offline:  createBundledModuleLoader(ALL_MODULES, manifest)   ← Stage 4 で確立済み
SaaS:              createManifestModuleLoader(manifestUrl, fetch)     ← Stage 5 以降
```

Stage 4 により `createBundledModuleLoader` は manifest を受け取れる形になっており、Stage 5 の接続点は確立されている。

---

## 付録: 本検証で実施した実測

| 計測 | 方法 |
|---|---|
| commit 一覧・変更ファイル | `git show --stat` で 6 commit 全件 |
| manifest stale 判定 | `serializeSearchManifest(generateSearchManifest(ALL_MODULES))` と commit 済みファイルのバイト比較（**ファイルへ書き込まない方法**で確認） |
| manifest raw / gzip | `fs.readFileSync` + `zlib.gzipSync` |
| runtime search index raw / gzip | `JSON.stringify(ALL_MODULES.flatMap(buildSearchIndex))` + `zlib.gzipSync` |
| modules / scenarios / brands / T-6 検査数 | `ALL_MODULES` を走査して全件カウント |
| server bundle | `rm -rf .next && npm run build` 後に `stat` / `du` |
| client chunk 混入 | `.next/static` 配下を `sourceHash` / `manifestVersion` / `sCompositionIntent` / sourceHash 実値で grep |
| HTML / RSC 混入 | `next start`（port 3117）へ `curl` し、raw / gzip サイズ測定と同一キーの grep |
| static export | `npm run build:static` 実行後に `out/` を grep |
| キャッシュヘッダ | `curl -D -` で HTML と `/_next/static/chunks/*.js` を個別確認 |
| validator warning | `npm run build` の出力を errorCode 別に集計 |
| 算術検証 | reduction / per-module / projection / historical diff の全 14 項目を独立スクリプトで再計算し出力と突合 |

**本書作成時点で Repository への push は行っていない。**
