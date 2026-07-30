# F-1 詳細設計 — 検索 manifest 分離（SOAP 本文非依存化）

**実施日**: 2026-07-29
**Execution Baseline**: HEAD `074cf68` / Repository 変更なし
**Owner Decision (D-F1-1)**: SOAP 本文の自由語検索は将来の必須仕様としない。構造化メタデータからの意図的な検索を優先する。
**適用範囲**: 将来の manifest 分離時の設計。**Stage 1〜3 では現行検索挙動を変更しない。**

---

## 0. 実測サマリ（本設計の根拠）

| 測定 | 値 |
|---|---|
| 現行 `SearchEntry[]` | 1,060 entries / **3,363 KB** |
| うち `corpusTokens` | 1,033 KB（31%） |
| うち**モジュール単位フィールドの重複** | **1,629 KB（48%）** ← 30.3 回重複 |
| うちシナリオ単位フィールド | 226 KB（7%） |
| **2 層 manifest（確定測定）** | **349 KB raw / 24 KB gzip** |
| 全モジュール JSON | 3,500 KB raw / 326 KB gzip |
| manifest / 全 JSON | **10.0%（raw）／ 7.5%（gzip）** |
| 300 モジュール換算 | manifest 2,992 KB raw / **209 KB gzip**（全 JSON は 29.3 MB / 2.73 MB） |

**重要な発見**: 現行 index の最大の冗長性は SOAP 本文（31%）ではなく、**モジュール単位フィールドがシナリオ数だけ重複していること（48%）** である。本文除去だけでは 14.7% しか削減できない（3,363 → 2,870 KB）。**2 層構造への変更が本質的な改善である。**

---

## 1. SOAP 本文を除いた検索 manifest のフィールド構成

### 1.1 現行 `corpusTokens` の構成（`lib/search.ts` L231-245 実測）

```
corpusTokens = unique([
  ...perScenarioTokens,   // scenario.title, scenario.scenarioGroup, S, O, A, P
  ...globalCorpusTokens   // drug.* + display.title/subtitle + categoryPath  ← 本文を含まない
])
```

**分離線は極めて明確である。** `globalCorpusTokens`（L157-177）には SOAP 本文が一切含まれない。除去対象は `perScenarioTokens` の 4 要素（`S` / `O` / `A` / `P`）のみである。

### 1.2 提案する 2 層 manifest

```ts
interface SearchManifest {
  manifestVersion: string        // 生成器バージョン（互換性判定用）
  generatedFrom: string          // 生成元 commit SHA（トレーサビリティ）
  modules: ManifestModule[]      // 35 件（モジュール単位・重複排除）
  scenarios: ManifestScenario[]  // 1,060 件（シナリオ単位）
}
```

#### モジュール単位ブロック（`ManifestModule`）

| フィールド | 出所 | Owner 指定の検索対象との対応 |
|---|---|---|
| `moduleId` | `moduleId` | 識別子 |
| `categoryPath` | `categoryPath` | **薬効領域**・**剤形**（末端要素） |
| `classKey` | `composition.classKey` | **薬効分類**（構造化キー） |
| `nodeKey` | `composition.nodeKey` | **剤形**（`{classKey}_{route}` 形式） |
| `clinicalDomain` | `composition.clinicalDomain` | **薬効領域**（構造化キー） |
| `displayTitle` / `displaySubtitle` | `display.title` / `display.subtitle` | 先発名列挙・**薬効領域** |
| `brandNames` | `drug.brandNames` | **先発品名** |
| `nameAliases` | `drug.nameAliases` | **表記揺れ・管理された alias** |
| `drugClass` | `drug.drugClass` | **薬効分類** |
| `drugSpecificTags` | `drug.drugSpecificTags` | **薬効分類**補助 |
| `search.primaryDisplayName` | `drug.search.primaryDisplayName` | **一般名** |
| `search.exactAliases` | `drug.search.exactAliases` | **読み仮名**（完全一致） |
| `search.nameAliases` | `drug.search.nameAliases` | **表記揺れ** |
| `search.keywords` | `drug.search.keywords` | 補助語 |
| `search.formulationSearchTokens` | `drug.search.formulationSearchTokens` | **剤形**（専用トークン） |
| `search.priority` | `drug.search.priority` | スコア順序 |
| `search.matchPolicy` | `drug.search.matchPolicy` | suppress / preferOwnName / crossModuleIndicationLabel |
| `brandCatalog[brand]` | `drug.brandCatalog` の 5 フィールドのみ | 下記 |

`brandCatalog` から取るのは **`displayName` / `displayGenericName` / `genericKey` / `aliases` / `indicationLabel` の 5 つのみ**（`buildSearchIndex` L183-198 が参照する範囲）。`handlingTags` は検索に使われないため**含めない**。

| brandCatalog サブフィールド | 対応 |
|---|---|
| `displayName` | **先発品名**（正規表記） |
| `displayGenericName` | **後発品名 / 一般名**（表示 SSOT） |
| `genericKey` | 同一成分グルーピング（**関連製品の剤形違い**） |
| `aliases` | **読み仮名・表記揺れ** |
| `indicationLabel` | 適応横断ラベル（DP-11） |

#### シナリオ単位ブロック（`ManifestScenario`）

| フィールド | 出所 | 用途 |
|---|---|---|
| `moduleId` | 親モジュール | 結合キー |
| `globalId` | `scenario.globalId` | `SearchEntry.templateId` |
| `id` | `scenario.id` | Express 候補の解決 |
| `title` | `scenario.title` | `label` / `shortLabel`・検索対象 |
| `scenarioGroup` | `scenario.scenarioGroup` | `groupLabel` 導出・検索対象 |

**`S` / `O` / `A` / `P` および `SStructured` / `AStructured` / `PStructured` は含めない。**

### 1.3 manifest に含めないもの（明示）

`composition`（上記 3 キー以外）／ `drugResolution` ／ `regulatory` ／ `topical` ／ `template` ／ `defaults` ／ `persona` ／ `addons` ／ `ui` ／ `risks` ／ `searchConfig` ／ `tagCatalog` ／ `expressModes` ／ `moduleVersion` ／ `scenario` の S/O/A/P・xStructured・addonsRef・mergePolicy。

> **注**: `searchConfig`（`minPrefixLen` / `normalize` / `multiTerm`）は `buildSearchIndex` が参照していない（実測）。現在 runtime 検索で使われていないため manifest 対象外とするが、将来 `searchConfig` を検索へ反映する設計に変わる場合は manifest へ追加する（**Owner 判断事項として §7 に記載**）。

### 1.4 `SearchEntry[]` は runtime で導出する

manifest を送り、`SearchEntry[]` は**クライアント側で 2 層を join して構築**する。これにより:

- 転送量はモジュール単位フィールドの重複を含まない（48% の削減）
- `buildSearchIndex` の既存ロジック（正規化・SEPARATOR_PATTERN 分割・スコア関数）を**そのまま再利用できる**

---

## 2. 先発名・後発名・一般名・剤形・領域検索を維持できる根拠（実測）

### 2.1 構造化フィールドの存在率（35 モジュール全件実測）

| Owner 指定の検索対象 | 担保フィールド | 存在率 |
|---|---|---|
| **先発品名** | `drug.brandNames` | **35/35** |
| **後発品名** | `brandCatalog[].displayGenericName` | **35/35** |
| **一般名** | `drug.search.primaryDisplayName` | **35/35** |
| **読み仮名** | `drug.search.exactAliases` | **35/35** |
| **表記揺れ・管理された alias** | `drug.nameAliases` ／ `brandCatalog[].aliases` | **35/35**（両方） |
| **薬効領域** | `categoryPath` ／ `composition.clinicalDomain` | **35/35**（両方） |
| **薬効分類** | `composition.classKey` | **35/35** |
| 薬効分類（補助） | `drug.drugClass` ／ `drug.drugSpecificTags` | 34/35 |
| **剤形** | `composition.nodeKey` | **35/35** |
| 剤形（専用トークン） | `drug.search.formulationSearchTokens` | 4/35 |
| 同一成分の剤形違い | `brandCatalog[].genericKey` | 18/35 |

**Owner 指定の 8 項目すべてが 35/35 の構造化フィールドで担保されている。**

### 2.2 剤形検索の担保（4/35 という数値の解釈）

`formulationSearchTokens` は 4/35 だが、これは**欠落ではなく設計どおり**である。PN2 §95 が「剤形が 1 種類しかない薬剤では `formulationSearchTokens` は不要であり、欠落は正常な状態である（DP-05）」と定めている。

実測により、剤形は**4 系統の手段**で識別可能である。

**ケース A: derm heparinoid 4 剤形（DP-05 の対象・`formulationSearchTokens` 保有）**

| module | nodeKey | categoryPath 末端 | brandNames | formulationSearchTokens |
|---|---|---|---|---|
| `..._ointment` | `heparinoid_moisturizer_ointment` | 軟膏 | ヒルドイドソフト軟膏 | なん / なんこう / ゆせい / そふと |
| `..._cream` | `heparinoid_moisturizer_cream` | クリーム | ヒルドイドクリーム | くり / くりーむ |
| `..._lotion` | `heparinoid_moisturizer_lotion` | ローション | ヒルドイドローション | ろー / ろーしょん |
| `..._spray` | `heparinoid_moisturizer_spray` | フォーム・スプレー | ヒルドイドフォーム | ふぉーむ / すぷれー |

**ケース B: 剤形違いだが `formulationSearchTokens` を持たない系統**

| module | nodeKey | categoryPath | primaryDisplayName |
|---|---|---|---|
| `dm_glp1ra_semaglutide_oral` | `glp1ra_oral` | 糖尿病 / GLP-1受容体作動薬 / 内服 | GLP-1受容体作動薬（内服） |
| `dm_glp1ra_injection` | `glp1ra_injection` | 糖尿病 / GLP-1受容体作動薬 / **注射** | GLP-1受容体作動薬（**注射**） |
| `allergy_h1_antihistamine_eye_drops` | `h1_antihistamine_ophthalmic` | … / 外用 / **点眼** | …抗アレルギー**点眼薬** |
| `allergy_h1_antihistamine_second_gen_oral` | `h1_antihistamine_oral` | … / 第二世代 / **内服** | 第二世代抗ヒスタミン薬 |

**剤形語（内服 / 注射 / 点眼 / 外用 / 軟膏 / クリーム等）は `categoryPath` と `primaryDisplayName` に含まれ、いずれも manifest に含まれる。** かつ `nodeKey` が `{classKey}_{route}` 形式で剤形を構造化保持している。

### 2.3 検索結果の同一性検証（実測）

現行 index と「S/O/A/P 除去 index」で `getDrugSuggestions` の出力を比較した。

**クエリ 29 件（Owner 指定の全対象を代表）**:
先発名（リベルサス / ヒルドイド / アレジオン / ツイミーグ / ジャヌビア）／読み仮名（りべるさす / ひるどいど）／一般名（セマグルチド / ヘパリン類似物質 / クロモグリク酸 / メトホルミン）／剤形（クリーム / ローション / 軟膏 / スプレー / 点眼 / 注射 / 内服）／薬効領域（糖尿病 / アレルギー / 皮膚科）／薬効分類（GLP-1 / DPP-4 / SGLT2 / インスリン）／新規モジュール（インタール）／AND 検索（ヒルドイド クリーム / リベルサス 内服）

```
結果: 一致 29 / 不一致 0
```

**全クエリで出力（moduleId・matchedBrandName・表示ラベル・順序）が完全一致した。**

### 2.4 失われる範囲の厳密な特定（実測）

本文にのみ存在し構造化フィールドから到達できないトークンは **530 件**。その全件が**文全体を 1 トークンとしたもの**である。

```
"{{drugsubject}}は、血糖値が高いため追加となった。"
"{{drugsubject}}処方"
"{{drugsubject}}は、効果の実感が乏しいため増量となった。"
```

これらは `corpusTokens.some(t => t.includes(q))` による**部分一致でのみヒット**する。すなわち「文中に現れるが構造化メタデータには存在しない語句」を入力した場合に限る。

**医学用語の単語検索は失われない**（実測）:

| 語 | 本文に存在 | 構造化フィールドにも存在 | 本文除去の影響 |
|---|---|---|---|
| 低血糖 / 悪心 / 浮腫 / 脱水 / シックデイ / 充血 / かゆみ / 保湿 / 乾燥 | ○ | **○（全 9 件）** | **なし** |

これらは `display.subtitle` / `drugSpecificTags` / `categoryPath` / `scenario.title` / `scenarioGroup` に存在するため、本文を除いても検索可能である。

**結論**: 失われるのは「SOAP 文の一節を部分文字列として入力した場合の偶発的一致」のみであり、Owner が示した「SOAP 本文から偶然語句を拾う方式」の排除方針と正確に一致する。

---

## 3. 現行 `corpusTokens` のうち構造化 manifest へ残す語句の選定方法

### 3.1 選定は「フィールド単位の allowlist」で行う（語句単位で選別しない）

`corpusTokens` は 2 つのソースの合併であり、**ソース単位で残す／落とすを決定できる**。語句を個別に判定する必要はない。

| ソース | 構成要素（`lib/search.ts` 実測） | 判定 |
|---|---|---|
| `globalCorpusTokens`（L157-177） | `drugSpecificTags` / `drugClass` / `brandNames` / `rawAliases`（= `drug.nameAliases` + `search.nameAliases` + `brandNames`）/ `keywords` / `display.title` / `display.subtitle` / `categoryPath` | **全件残す** |
| `perScenarioTokens`（L236-243） | `scenario.title` / `scenario.scenarioGroup` | **残す** |
| `perScenarioTokens` | `scenario.S` / `O` / `A` / `P` | **落とす** |

### 3.2 追加する構造化キー

Owner 方針「構造化メタデータから意図的に検索可能にする」に従い、現在 `globalCorpusTokens` に**含まれていない**次の 3 キーを manifest へ追加し、検索対象化する。

| キー | 現状 | 追加理由 |
|---|---|---|
| `composition.classKey` | corpusTokens に**未収載** | 薬効分類を構造化キーで検索可能にする（現在は `drugClass` の自由文に依存） |
| `composition.nodeKey` | 同上 | 剤形を構造化キーで検索可能にする |
| `composition.clinicalDomain` | 同上 | 薬効領域を構造化キーで検索可能にする |

**これは機能追加であり、本文除去による喪失の代償ではない。** 現行では `classKey` 等で検索できないため、追加により領域検索は現在より強化される。

### 3.3 正規化処理は現行を踏襲する

`SEPARATOR_PATTERN` による分割 → `normalizeText()` → `filter(Boolean)` の順序を変更しない。この順序は「トークン境界をまたいだゴースト一致の防止」のために意図的に設計されており（L167-172 のコメント）、`tests/search.test.ts` L50 / L157 が守っている。

### 3.4 実装上の変更点（最小差分）

```
lib/search.ts L236-243
  const perScenarioTokens: string[] = [
    scenario.title,
    scenario.scenarioGroup,
-   scenario.S ?? '',
-   scenario.O ?? '',
-   scenario.A ?? '',
-   scenario.P ?? '',
  ].map(normalizeText).filter(Boolean)
```

**本文除去そのものは 4 行の削除である。** manifest 化（2 層構造）は別の変更であり、両者は独立に実施できる。

---

## 4. 本文検索を削除する際に影響するコードとテスト

### 4.1 削除対象となる経路（実測で全数特定）

| # | 箇所 | 内容 | 影響 |
|---|---|---|---|
| **C-1** | `lib/search.ts` L239-242 | `perScenarioTokens` の `S`/`O`/`A`/`P` の 4 行 | **削除対象の本体** |
| **C-2** | `lib/search.ts` L379 | `if (entry.corpusTokens.some(t => t.includes(q))) return 1`（`scoreEntry` 最終行） | **コードは残す**。本文が入らなくなるため、`title`/`scenarioGroup`/global 由来トークンに対する部分一致として機能し続ける |
| **C-3** | `lib/search.ts` L1196-1207 `filterTemplates` | `corpusTokens` を使う後方互換エクスポート | **`app/` `tests/` から参照 0 件**（実測）。挙動が変わるが利用点がない |

**到達経路**: `getDrugSuggestions`（L679）→ `scoreEntryAND`（L712）→ `scoreEntry`（L458 経由）→ C-2。UI から到達可能な実機能である。

**C-2 を削除しない理由**: `corpusTokens` には本文除去後も `scenario.title` / `scenarioGroup` / `display.subtitle` / `categoryPath` 等が残る。スコア 1 の部分一致は**これらに対して有用**であり、削除すると領域検索の部分一致が失われる。**削除すべきは入力データ（本文）であり、スコア関数ではない。**

### 4.2 現在のテスト依存（実測・全数）

`corpusTokens` を直接参照するテストは **3 箇所のみ**で、いずれも**否定的アサーション**である。

| テスト | 内容 | 本文除去の影響 |
|---|---|---|
| `tests/search.test.ts` L50-59 | `corpusTokens` に「ぐらく」（アレグラ+クラリチンの境界またぎ）が**存在しないこと** | **より通りやすくなる**（トークン数が減る） |
| `tests/search.test.ts` L157-168 | `corpusTokens` が配列であり「あれぐらくらりちん」を**含まないこと** | 同上。`Array.isArray` も維持される |
| `tests/search.test.ts` L16-18 | コメント（仕様説明） | 記述更新のみ |

**SOAP 本文一致を肯定的に検証するテストは存在しない**（実測）。`filterTemplates` のテストも 0 件。

### 4.3 間接的に影響しうるテスト

| ファイル | 行数 | `buildSearchIndex` / `getDrugSuggestions` 使用 | リスク評価 |
|---|---|---|---|
| `tests/search.test.ts` | 545 | ○ | 上記 3 箇所以外は alias / brand / 剤形 / 順序の検証であり、構造化フィールド由来 |
| `tests/genericIntegration.test.ts` | 940 | ○ | 一般名検索到達性（DP-09 / DP-11）。`brandCatalog` / `exactAliases` 由来 |
| `tests/multiDrugCompose.test.ts` | 617 | ○ | 合成対象の解決。検索スコアに依存しない |

いずれも**構造化フィールドに依存**しており、§2.3 の 29 クエリ一致検証と整合する。ただし**実際の回帰確認は §5 の移行テストで機械的に担保する**（推測で済ませない）。

### 4.4 文書側の更新対象

| 文書 | 該当箇所 |
|---|---|
| `docs/VALIDATOR_STANDARD.md` | 検索責務の記載がある場合（§1「Runtime での描画・検索品質」は Validator 対象外と既に明記） |
| `docs/DESIGN_PRINCIPLES.md` | DP-09（一般名検索到達性）／ DP-11（適応横断検索到達性）— **本文検索に依存していないことの確認が必要** |
| `prompts/vNext/PN2-Drug-Header.md` | §81-97 の search token 生成規則。manifest 追加キー（classKey / nodeKey）に言及するか |
| `docs/DEVELOPMENT_STANDARD.md` §3 | アーキテクチャ記述（manifest 層の追加時） |

---

## 5. 検索結果の回帰を防ぐ移行テスト

### 5.1 T-1: parity テスト（最重要・本文除去と同時に導入）

**現行 index と本文除去 index が同一の検索結果を返すことを機械的に検証する。**

```
対象クエリ集合（決定論的に生成する）:
  ① 全モジュールの drug.brandNames 全件
  ② 全モジュールの brandCatalog キー全件
  ③ 全モジュールの search.exactAliases 全件
  ④ 全モジュールの search.primaryDisplayName 全件
  ⑤ 全モジュールの brandCatalog[].displayGenericName 全件
  ⑥ 全モジュールの categoryPath 各要素 全件
  ⑦ 全モジュールの drugClass / drugSpecificTags 全件
  ⑧ 全モジュールの formulationSearchTokens 全件
  ⑨ ①〜⑧ の 2 語 AND 組み合わせ（同一モジュール内）
  → データから自動生成するため、モジュール追加時に自動で拡充される

検証: getDrugSuggestions(q, 現行index) === getDrugSuggestions(q, 本文除去index)
      （moduleId / matchedBrandName / uiLabel / 順序 の完全一致）
```

**期待結果**: 全件一致。§2.3 で 29 クエリについて既に一致を確認済み。

**このテストはクエリをハードコードしない。** データから生成するため、35 → 300 モジュールへ増えても網羅性が自動的に維持される。

### 5.2 T-2: 喪失範囲の明示テスト（意図的な喪失の固定）

本文にのみ存在するトークン（実測 530 件）で検索した場合、**結果が 0 件になることを期待値として固定する**。

```
検証: 本文由来の文全体トークンを部分文字列としてクエリにした場合、
      本文除去 index では該当モジュールが返らないこと
```

これにより「意図せず本文検索が復活した」ことを検知できる。**喪失を欠陥ではなく仕様として固定する。**

### 5.3 T-3: manifest ↔ 全件 index の等価テスト（manifest 導入時）

2 層 manifest から構築した `SearchEntry[]` が、canonical JSON から直接構築した（本文除去版）`SearchEntry[]` と**フィールド単位で一致すること**を検証する。

```
検証: buildSearchIndex(module)（本文除去版）
      === buildIndexFromManifest(manifest, moduleId)
      corpusTokens は Set 比較（順序非依存）、他は deepEqual
```

### 5.4 T-4: Owner 指定検索対象のカバレッジテスト（回帰防止の要）

**Owner が指定した 8 項目が、全モジュールについて到達可能であることを検証する。**

```
各モジュール m について:
  □ brandNames の各要素で m に到達できる
  □ brandCatalog[].displayGenericName の各要素で m に到達できる
  □ search.primaryDisplayName で m に到達できる
  □ search.exactAliases の各要素で m に到達できる
  □ nameAliases / brandCatalog[].aliases の各要素で m に到達できる
  □ categoryPath の各要素で m を含む結果が返る
  □ classKey / nodeKey / clinicalDomain で m を含む結果が返る（manifest 追加後）
  □ formulationSearchTokens を持つ場合、各要素で m に到達できる
```

**これはモジュール追加時の品質ゲートとして機能する。** 新規モジュールが alias 不足で検索不能になる事故を機械的に検出できる（`docs/VALIDATOR_STANDARD.md` §7 の将来候補 `GENERIC_NAME_UNREACHABLE` と目的が重なる）。

### 5.5 T-5: manifest サイズの回帰テスト

```
検証: manifest の gzip サイズが閾値（例: 現状 24 KB に対し 1 モジュールあたり増分上限）を超えないこと
```

F-1 の目的（配信量の抑制）が将来の変更で失われることを防ぐ。**§9 の R-1（計測の常設化）と同じ動機**である。

### 5.6 既存テストの扱い

`npm test` 2,633 件は**すべて PASS を維持する**ことが完了条件。特に:
- `tests/search.test.ts`（545 行）
- `tests/genericIntegration.test.ts`（940 行）
- `tests/moduleRegistry.test.ts`（F-6・registry 整合。**manifest 導入時は要改修** — §9 参照）

---

## 6. module 追加時に検索語が決定論的に生成される仕組み

### 6.1 現行の決定論性（実測）

検索語の生成は**既に決定論的に統治されている**。

| 層 | 規則 | 出所 |
|---|---|---|
| **正本** | bridge が SOT。「bridge にない search token を追加しない」 | `prompts/RULES.md` L65 ／ DP-07 |
| **転記** | `commonSearchTokens` / `formulationSearchTokens` は「bridge の同名フィールドの記載をそのまま転記して生成する」 | `prompts/vNext/PN2-Drug-Header.md` §85 |
| **一致制約** | `drug.nameAliases` と `drug.search.nameAliases` は完全一致 | PN2 §28 ／ `moduleValidator` `NAME_ALIASES_MISMATCH`（ERROR） |
| **双方向反映** | 生成した alias 系フィールドは bridge 側にも同内容で反映する | PN2 §37-38 |
| **omit 規則** | bridge に記載がないフィールドは omit（空配列を作らない）。剤形 1 種類の薬剤で `formulationSearchTokens` 欠落は正常（DP-05） | PN2 §95 |
| **混入禁止** | search token を alias 系フィールドへ複写しない | RULES §3 ／ `moduleValidator` `SEARCH_TOKEN_ALIAS_POLLUTION`（WARN） |
| **機械監査** | alias 系 7 項目（A〜G）の bridge ⇔ JSON 一致 | `scripts/audit-alias-bridge-chain.ts` |
| **人間判断** | alias の網羅性（登録すべき読み仮名の漏れ）は設計判断 | `docs/VALIDATOR_STANDARD.md` §5 / §7 |

### 6.2 manifest の決定論性

**manifest は canonical JSON からの純関数生成とする。**

```
canonical JSON（正本）
  ↓ 純関数（副作用なし・同一入力 → 同一出力）
search manifest
```

満たすべき性質:

| 性質 | 実現方法 |
|---|---|
| **決定論性** | フィールドの allowlist（§1.2）のみを抽出。順序は `moduleId` 昇順・`scenario` は JSON 内の出現順で固定 |
| **冪等性** | 同一 commit から生成した manifest はバイト単位で一致する |
| **トレーサビリティ** | `manifestVersion`（生成器バージョン）と `generatedFrom`（commit SHA）を manifest に埋め込む |
| **検証可能性** | build 時に生成し、生成物と canonical JSON の整合を T-3 で検証 |
| **モジュール追加時の自動性** | 新規モジュールが `data/modules/index.ts` に登録されれば manifest に自動反映（**F-6 の整合テストが登録漏れを検出する**） |

### 6.3 既存の監査ギャップ（本設計で解消しないが明示する）

`prompts/RULES.md` L168 が記録している:

> **SearchToken**: `drug.search.commonSearchTokens` / `formulationSearchTokens` / `matchPolicy` 系 — **監査未整備**。`SEARCH_TOKEN_ALIAS_POLLUTION` は alias 系への混入検出であり、**bridge ⇔ JSON の一致は対象外**

つまり `formulationSearchTokens` の bridge ⇔ JSON 一致は**現在機械検査されていない**（alias 系 7 項目のみ `audit-alias-bridge-chain.ts` が担保）。

**剤形検索は `formulationSearchTokens` に依存するため、この監査ギャップは剤形検索の決定論性に関わる。** ただし §2.2 のとおり剤形は `nodeKey` / `categoryPath` / `primaryDisplayName` でも担保されており、単一障害点ではない。

**本設計ではこのギャップを解消しない**（F-1 のスコープ外・既存の記録済み事項）。ただし T-4（カバレッジテスト）が `formulationSearchTokens` の各要素で到達可能かを検証するため、**JSON 側の値が壊れれば検出される**（bridge との一致は依然として未検査）。

---

## 7. Owner 判断が必要な追加事項

| ID | 論点 | 選択肢 |
|---|---|---|
| **D-F1-1a** | `composition.classKey` / `nodeKey` / `clinicalDomain` を検索対象に**追加**するか（§3.2。現在は検索対象外） | (a) 追加する（Owner 方針「構造化メタデータから意図的に検索可能に」と整合・**推奨候補**） ／ (b) 現状の `drugClass` / `categoryPath` のみで足りる |
| **D-F1-1b** | `searchConfig`（`minPrefixLen` / `normalize` / `multiTerm`）を manifest へ含めるか（現在 `buildSearchIndex` は未参照） | (a) 含めない（実装が使っていない・**推奨候補**） ／ (b) 将来の検索仕様変更に備えて含める |
| **D-F1-1c** | `scoreEntry` L379 の corpusTokens 部分一致（スコア 1）を**残すか** | (a) 残す（本文除去後は title / categoryPath 等への部分一致として有用・**推奨候補**） ／ (b) 削除して完全一致系のみにする |
| **D-F1-1d** | T-2（喪失範囲の明示テスト）を導入するか | (a) 導入する（意図的喪失を仕様として固定・**推奨候補**） ／ (b) 不要 |
| **D-F1-1e** | `formulationSearchTokens` の bridge ⇔ JSON 監査ギャップ（§6.3）の扱い | (a) F-1 外として別課題に切り出す（**推奨候補**） ／ (b) F-1 に含める |

---

## 8. 本設計が Stage 1〜3 に与える影響

**なし。** ご指示どおり、Stage 1〜3 では現行検索挙動を一切変更しない。

| Stage | 内容 | 本設計との関係 |
|---|---|---|
| Stage 1 | 配信量の計測常設化 | 影響なし |
| Stage 2 | キャッシュヘッダの範囲限定 | 影響なし |
| Stage 3 | loader interface 導入（全同梱 loader のみ・挙動不変） | **`getSearchManifest()` を interface に含めるが、Stage 3 の実装は「全モジュールから現行どおり index を構築して返す」とする** |
| Stage 4 | manifest 生成 | **本設計を適用する段階** |

Stage 3 で interface に manifest 取得の口を用意しておけば、Stage 4 は実装差し替えのみで済み、rollback も loader の差し替えで完結する。

---

## 9. Repository 影響範囲（Stage 4 時点・本設計では変更しない）

### 変更が想定されるファイル

| ファイル | 内容 |
|---|---|
| `lib/search.ts` | L239-242 の 4 行削除 ／ manifest 入力からの index 構築関数追加 |
| `lib/moduleLoader.ts`（Stage 3 で新規） | `getSearchManifest()` の実装差し替え |
| `tests/search.test.ts` | L16-18 のコメント更新（3 箇所の否定アサーションは変更不要） |
| `tests/moduleRegistry.test.ts` | **F-6 の整合テスト。manifest 導入で registry 型が変わる場合は改修** |
| `prompts/vNext/PN2-Drug-Header.md` | classKey / nodeKey を検索対象化する場合の生成規則追記（D-F1-1a が (a) の場合） |
| `docs/DEVELOPMENT_STANDARD.md` §3 | manifest 層をアーキテクチャ記述へ追加 |

### 新規が想定されるファイル

| ファイル | 内容 |
|---|---|
| `lib/searchManifest.ts` | `SearchManifest` / `ManifestModule` / `ManifestScenario` の型定義 |
| `scripts/generate-search-manifest.ts` | canonical JSON → manifest の純関数生成 |
| `tests/searchManifestParity.test.ts` | T-1（parity）／ T-3（等価）／ T-5（サイズ回帰） |
| `tests/searchCoverage.test.ts` | T-4（Owner 指定 8 項目のカバレッジ） |
| `tests/searchBodyExclusion.test.ts` | T-2（喪失範囲の明示） |

### 影響を受けない領域

`bridges/` ／ `data/modules/*.json`（canonical JSON 自体）／ `lib/moduleValidator.ts` ／ `lib/crossModuleValidator.ts` ／ `lib/buildSoap.ts` ／ `lib/applyPersona.ts` ／ `lib/menuGroups.ts` ／ 医学的内容。

---

## 付録: 本設計で実施した計測

| 計測 | 方法 | 結果 |
|---|---|---|
| `corpusTokens` の構成 | `lib/search.ts` L157-177 / L231-245 を読解 | 2 ソースの合併・分離線を特定 |
| index の冗長性内訳 | フィールドをモジュール単位 / シナリオ単位 / corpus に分類して byte 集計 | モジュール単位 48% が 30.3 回重複 |
| 2 層 manifest サイズ | allowlist に基づく manifest を構築し raw / gzip 測定 | 349 KB / **24 KB gzip** |
| 構造化フィールド存在率 | 全 35 モジュールに対し 15 フィールドの存在を判定 | Owner 指定 8 項目すべて 35/35 |
| 剤形識別手段 | heparinoid 4 剤形・GLP-1 経口/注射・allergy 点眼/内服 を個別確認 | nodeKey / categoryPath / primaryDisplayName / formulationSearchTokens の 4 系統 |
| 検索結果 parity | 現行 index と本文除去 index で 29 クエリの出力を比較 | **一致 29 / 不一致 0** |
| 喪失範囲 | 本文にのみ存在し構造化から到達不能なトークンを全数抽出 | 530 件・全件が文全体 |
| 医学用語の到達性 | 9 語について本文 / 構造化の両方を判定 | 全 9 件が構造化側でも到達可能 |
| テスト依存 | `tests/` 全体で `corpusTokens` / `filterTemplates` を grep | 直接参照 3 箇所（全て否定アサーション）／ `filterTemplates` 参照 0 件 |
| 生成規則 | `prompts/RULES.md` / `PN2-Drug-Header.md` / `audit-alias-bridge-chain.ts` を追跡 | 決定論性は既に統治済み・SearchToken 監査にギャップあり |

**Repository への変更・commit・push は行っていない。**
