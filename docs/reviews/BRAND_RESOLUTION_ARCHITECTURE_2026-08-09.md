# Brand Resolution — Architecture Review 記録（2026-08-09）

> **文書の性格**: 本記録は時点付きの historical architecture record であり **正本ではない**。
> Q-S2 の設計判断がなぜその形に確定したかという**根拠**を保存する。
>
> 正本は以下である。本記録と正本が食い違う場合は、常に正本を優先する。
>
> | 対象 | 正本 |
> |---|---|
> | 型契約（resolution state の定義） | `lib/brandResolution.ts` |
> | 未解決論点・Owner Decision・実装工程 | `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 / Q-UX1 |
> | alias 複製境界・own-name 優先 | `docs/DESIGN_PRINCIPLES.md` DP-18 |
> | 一般名検索到達性 | `docs/DESIGN_PRINCIPLES.md` DP-09 |
> | 不確定性を推測で埋めない原則 | `docs/DESIGN_PRINCIPLES.md` DP-15 |
> | 技術的負債（F-3） | `prompts/vNext/HANDOFF.md` §6 |
>
> **本記録は新しい設計判断を行わない。** 既に Owner Decision として確定した内容の根拠を再構成し、
> 永続化することのみを目的とする。
>
> **姉妹記録**: 調査過程・時点付き実測・commit 根拠は
> `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md`（調査記録）を参照する。
> 本記録は「なぜその設計に決めたか」、姉妹記録は「何を観測したか」を担当する。
>
> **表記規約**
> - **FACT**: Repository（ファイル内容・git history）から直接確認した事実
> - **RUNTIME-VERIFIED**: 実際にコマンドを実行して実測した結果
> - **ARCHITECTURE DECISION**: 本 Review で確定し Owner が承認した設計判断
> - **DEFERRED**: 意図的に後続 Unit へ送った事項
>
> **行番号の扱い**: 記載した行番号は本記録作成時点の値であり将来ずれる。
> 位置特定には併記した symbol 名・検索語を用いること。

---

## 1. メタデータ

| 項目 | 値 |
|---|---|
| 実施日 | 2026-08-09 |
| 対象 commit | `a263c69` — "feat(search): define brand resolution state contract"（U-1 完了時点） |
| ブランチ | `feat/nlp-input-panel-and-new-schema` |
| 本記録での Repository 変更 | なし（文書の追加・追記のみ。コード / canonical JSON は変更していない） |
| 位置づけ | Q-S2 実装工程における docs-only Unit（U-2 着手前に実施） |

---

## 2. Root cause の同定

### 2.1 症状ではなく構造

当初、問題は「`app/components/DashboardClient.tsx` に `resolveDrugName()` を経由しない独自 fallback がある」（F-3）と認識されていた。**本 Review は、これを症状であって root cause ではないと判定した。**

**root cause**（ARCHITECTURE DECISION）:

> **検索結果型が「module は確定したが brand は確定していない」という状態を表現できなかった。
> 表現できないため、すべての消費者が独自 fallback を発明せざるを得ず、
> 発明された fallback はいずれも `drug.brandNames[0]` へ収束した。
> これは JSON の配列宣言順という、意味論を一切持たないアーティファクトである。**

### 2.2 下流が文字列比較で意味論を逆算していた（FACT）

`app/components/DashboardClient.tsx`（検索語: `displayNameForSubject`）は、候補の意味論を次の比較で再構築していた。

```
item.drugDisplayLabel !== item.matchedBrandName  →  一般名検索とみなす
```

これは**候補の意味論的な種別を、その表示文字列から逆算する推論**である。resolved / generic のケースでは偶然正しく機能するが、unresolved のケースでは静かに誤る。消費側に他の判定手段が存在しなかったことが、この推論を強制していた。

### 2.3 決定的な証拠 — 最高スコアの一致が最弱の箱に入っていた（RUNTIME-VERIFIED）

`lib/search.ts` の `lowConfidence` bucket は、commit `a31ba2e` において「brand / generic 名が解決できず、弱い corpus 一致だけが残った候補」を隔離する目的で導入された（FACT）。

しかし `allergy_leukotriene_receptor_antagonist_oral` の `drug.search.exactAliases` には `ロイコトリエン受容体拮抗薬` が登録されており、この語での検索は `scoreEntry()` が返しうる**最高スコア 7（exactAliases 完全一致）**に達する。実測:

| クエリ | 一致経路 | score | 結果 |
|---|---|---|---|
| `ロイコトリエン受容体拮抗薬` → 正規化 `ろいことりえん受容体拮抗薬` | `exactAliasTokens` 完全一致 | **7** | 1 件 / `matchedBrandName = undefined` / `drugDisplayLabel = オノン` |
| `ろいことりえん` | `aliasTokens` 完全一致 | 5 | 同上 |
| `ろいことりえんじゅようたいきっこうやく` | `aliasTokens` 完全一致 | 5 | 同上 |

**system 内で最も強い一致が、最も弱い一致のために作られた箱へ入っている。** これは実装ミスではなく、型が「一致の強さ」と「brand が確定したか」を区別できないことの必然である。

> 補足（FACT）: `normalizeText()` はカタカナ→ひらがな変換のみを行い漢字は変換しない。
> したがって `exactAliases` の `ロイコトリエン受容体拮抗薬` は `ろいことりえん受容体拮抗薬` へ正規化され、
> 全ひらがな形（`ろいことりえんじゅようたいきっこうやく`）とは別トークンとして扱われる。
> 両形とも `drug.search` に登録されているため、いずれの入力でも module へ到達する。

---

## 3. Clinical blast radius（RUNTIME-VERIFIED）

`brandNames[0]` fallback の影響は SOAP 主語にとどまらない。`app/components/DashboardClient.tsx` の
`resolvedBrand`（検索語: `resolvedBrand`。`activeBrandName ?? activeModuleData.drug?.brandNames?.[0]`）は、
次の 2 経路を駆動している。

| 参照箇所（本記録作成時点の行番号） | 用途 |
|---|---|
| 517 行付近 | `brandCatalog[resolvedBrand]?.handlingTags` → **ADDON フィルタリング**（`lib/addonFilter.ts`） |
| 722 行付近 | `drugResolution.brandToTags[resolvedBrand]` → **タグ解決** |

**したがって brand 未確定時の恣意的な確定は、記録される薬剤名の誤りにとどまらず、
患者へ提示される指導内容（ADDON）の選択そのものを配列宣言順で決めている。**

**Q-S2 は表示上の問題ではなく、clinical content selection の correctness 問題である**（ARCHITECTURE DECISION）。
この認識が、Q-UX1（ranking / presentation）と責務を分離する根拠となっている（§9）。

---

## 4. 採用した two-axis model

### 4.1 3 つのフラットな状態ではなく、直交する 2 軸

調査段階では `lowConfidence` に 3 種が混在すると観測された（A: 弱い corpus 一致 / B: module 一致だが brand 未解決 / C: class-level query）。**本 Review はこれを「3 種類の別物」ではなく、2 軸の組み合わせが生成した結果と判定した**（ARCHITECTURE DECISION）。

| 軸 | 値 | 意味 |
|---|---|---|
| **denotation** | `brand` / `generic` / `module` | この候補が**何を指しているか** |
| **matchStrength** | `strong` / `weak` | その一致が**どれだけ確からしいか** |

### 4.2 同一軸に置かない理由

観測項目 A（弱い corpus 一致）は denotation ではなく matchStrength の値である。弱い一致であっても、その候補が指しているのは高々 module であり、denotation は `module` である。よって A は C の denotation へ吸収され、**状態数を増やさずに意味論が安定する**。

逆に、`strong` であっても brand が確定しないことがある（§2.3 の score 7 が実例）。**「一致の強さ」と「指示対象の確定度」は独立に変化するため、同一軸へ畳むと意味論が壊れる。**

### 4.3 denotation は推測ではなく構造的導出である（RUNTIME-VERIFIED）

denotation は module の静的構造から決定的に導出できる。全 35 module の実測:

| module 構造 | 件数 | brand 確定可能性 |
|---|---|---|
| brand が 1 件 | **9** | **module 同定 ⇒ brand 同定（論理的導出。推測ではない）** |
| brand 複数・generic group 1 件 | **6** | generic 主語として確定可能 |
| brand 複数・generic group 複数 | **20** | **真に未確定**（disambiguation が必要） |

この導出には `SearchEntry` の既存フィールド `brandNames` / `brandCatalogGenericKeyMap` のみを用いる。canonical JSON 直読による測定値と `SearchEntry` 経由の導出値は完全一致した（9 / 6 / 20）。

**この性質が、後述する audit の static / module-local 化（§10）を可能にしている。**

---

## 5. Discriminated union の採用理由

`matchedBrandName?: string` の `undefined` へ意味論を与える案（optional field 方式）は**不採用**とした（ARCHITECTURE DECISION）。理由は 3 点である。

### 5.1 nullable は 3 値を表現できない

`undefined` は「generic group までは確定した」と「module しか確定していない」を区別できない。この区別は UI 契約（§7）と audit（§10）の双方で必要である。

### 5.2 nullable は消費側で強制力を持たない

```
matchedBrandName ?? brandNames[0]
```

は型検査を通過する。**これが現在のバグそのものである。** discriminated union は「未確定ケースを処理しない限りコンパイルできない」状態を作れる。300 module 規模へ拡大する前提では、型による強制のみがスケールする。

### 5.3 docstring 方式は既に 1 度失敗している（FACT・再発防止の根拠）

`lib/drugSubject.ts` の `resolveDrugName()` は docstring で「呼び出し元固有のフォールバックロジックを個別に書かず、常にこの関数を経由すること」と宣言し、`docs/JSON_STANDARD.md`（231 行、`resolveDrugName()` 節）も同旨を記載していた。**それにもかかわらず `DashboardClient.tsx` の実装はこれを迂回した（F-3）。**

**同じ方式（意味論を文書で宣言し実装の遵守に委ねる）を `matchedBrandName` へ適用すれば、同じ失敗を繰り返す。** F-3 は単なる修正対象ではなく、optional field 方式を却下する実証的根拠として扱う。

---

## 6. `uiLabel` / `subject` / `brandKey` の責務分離

### 6.1 3 つの関心の分離（ARCHITECTURE DECISION）

従来は 2 フィールド（`matchedBrandName` / `drugDisplayLabel`）が 3 つの役割を兼務していた。これを分離する。

| 値 | 所有 | 責務 | 禁止事項 |
|---|---|---|---|
| `uiLabel` | `DrugSuggestionItem` | **表示専用** | **SOAP 主語へ流してはならない** |
| `subject` | `BrandResolution` | SOAP `{{drug_subject}}` の確定値 | `null` の場合に代替値を生成してはならない |
| `brandKey` | `BrandResolution`（`brand` member のみ） | `brandCatalog` へのデータアクセスキー | `subject` として流用してはならない |

### 6.2 generic state が authoritative な単一 brandKey を持たない理由

`denotation: 'generic'` へ単一の代表 brandKey を持たせることは**却下**した（Owner Decision）。理由は、それが `brandNames[0]` fallback と**同型の「意味論を持たない代表 brand 選択」を型契約へ再導入する**ことになるためである。

この懸念は抽象論ではなく、現行データに実例が存在する（RUNTIME-VERIFIED）。
`derm_heparinoid_moisturizer_ointment` は 2 brand / 1 generic group でありながら、
group 内で `handlingTags` が異なる。

| brand | 差分タグ |
|---|---|
| ヒルドイドソフト軟膏（`brandNames[0]`） | `ointment`, `ointment_application` |
| ヘパリン類似物質油性クリーム | `oily_cream`, `cream_application` |

代表 brand から `handlingTags` を継承する設計では、油性クリームを処方された患者へ軟膏用の ADDON が提示されうる。**generic group 内から特定の 1 件を選んで brand 固有値を取得する方法は U-1 では定めない**（DEFERRED → §10.3 / U-8）。

### 6.3 `genericKey` / `brandKeys` の意味

| フィールド | 意味 |
|---|---|
| `genericKey` | **解決済みグルーピングキー**。canonical JSON の `brandCatalog[].genericKey` そのものではなく、`genericKey ?? displayGenericName ?? genericName`（`prompts/RULES.md` §21）の解決結果であり、`SearchEntry.brandCatalogGenericKeyMap` と同一の意味論を持つ |
| `brandKeys` | group を構成する brand の一覧。**構成の記録であり、ここから 1 件を選んで brand 固有値を取得してはならない** |

**名称を `genericKey` のまま維持する判断の根拠**（RUNTIME-VERIFIED）:

| 検証項目 | 結果 |
|---|---|
| grouping key を解決できない brand | **0 件**（全 119 brand で解決可能） |
| 同一 group 内で `displayGenericName` が不一致な group | **0 件** |
| `genericKey` を明示している brand / fallback している brand | 54 件 / 65 件 |

**第 2 項が 0 件であることが決定的である。** これにより `generic` member の `subject` は group から一意に決まり、**brand の配列順に依存しない**。もし不一致があれば `subject` 自体が「group 先頭 brand 由来の恣意的な代表値」となり、排除しようとした anti-pattern が subject 側に残っていた。

なお 65 件が `displayGenericName` へ fallback している事実から、フィールド名 `genericKey` は canonical field 名と紛らわしい。`genericGroupKey` への改名は**今回行わない**（必要になれば別 Unit で扱う）。保持内容は `lib/brandResolution.ts` の JSDoc を正本とする。

---

## 7. class-level query contract

### 7.1 「選択可能」と「SOAP 生成可能」を同一視しない（ARCHITECTURE DECISION）

本 Review における最も重要な契約上の判断である。

- 薬剤師が薬効クラス名で検索する行為は正当であり、その module へ到達できるべきである（DP-09 の到達性）
- しかし処方箋が成分を特定していない状態で SOAP へ薬剤名を書くことは**医療記録として誤り**である
- したがって **「検索候補として選択可能」かつ「SOAP 主語は未確定」** という状態を正式に持つ

### 7.2 generic group 展開を採用し、新 UI 概念を作らない

leukotriene module の実測構造は 5 brand / **2 generic group**（プランルカスト系 2・モンテルカスト系 3）である。`ろいことりえん` への正しい応答は「オノン 1 件」ではなく、2 つの generic 候補への展開である。

**この 2 件はいずれも既存の generic 候補状態（`isGenericLabel`。`app/components/Topbar.tsx` に表示分岐が実装済み）でそのまま表現できる。** 新しい UI 概念を発明する必要はない。

さらに generic group が 1 件の module では自動的に 1 候補へ収束するため、**追加選択は真に曖昧な場合にのみ発生する**（実測 6 module が該当）。

**専用の「未確定候補 UI」は現時点では新設しない**（Owner Decision）。generic group で表現できない実例が出た場合に再検討する。

---

## 8. D-1〜D-3 の再分類

### 8.1 module 帰属の実測（FACT）

調査段階の記録には module 帰属の誤りが含まれていた（`docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` §9 の訂正追記を参照）。実測による正しい帰属:

| ケース | brand | module | 構造 |
|---|---|---|---|
| D-1 | メトアナ | `dm_dpp4_biguanide_combination_oral` | **4 brand / 4 generic group** |
| D-2 | リオベル | `dm_dpp4_thiazolidinedione_combination_oral` | **1 brand** |
| D-3 | メタクト | `dm_thiazolidinedione_biguanide_combination_oral` | **1 brand** |
| D-4 | ツイミーグ | `dm_imeglimin_oral` | **1 brand** |

### 8.2 新設計下での扱い（ARCHITECTURE DECISION）

| ケース | 扱い |
|---|---|
| **D-2 / D-3** | single-brand module であるため、**module 到達から brand を構造的に導出できる**。`denotation: 'brand'` として解決され、**個別 alias containment は不要** |
| **D-1** | 4 brand すべてがメトホルミンを共有成分として持つため、クエリはどの brand も特定していない。**真の 4 値曖昧であり `denotation: 'module'` として unresolved を表明すべき。個別 alias を追加してはならない**（4 brand のうち 1 件へ寄せる根拠が存在しない） |
| **D-4** | brand 帰属は一意（single-brand）。問題は表示枠配分であり **Q-UX1 側**（§9） |

### 8.3 個別 alias containment を行わない理由と DP-18 との整合

シミュレーション（実ファイル非変更・in-memory）による実測:

| 操作 | 結果 |
|---|---|
| メタクト / メトアナへ salt-name reading を brand-level 追加 | `results[0]` がメトホルミン単剤から配合剤へ変化し、**Suite ⑦**（`tests/search.test.ts`「⑦ メトホルミン系」）の assertion を破壊する |
| リオベルへ同追加 | `results[0]` がリオベルとなり、**Suite ⑧**（同「⑧ ピオグリタゾン系」）を破壊する |

**DP-18 との整合**: DP-18 は「salt-name full reading を generic-labeled brand 自身にのみ登録し、family 内の他 brand へ機械的に複製しない」と定める。新設計は **alias を複製せずに brand 帰属を導出する**ため、DP-18 の要求と競合しない。D-2 / D-3 は複製なしで解決し、D-1 は複製すべきでないケースとして正しく unresolved になる。

---

## 9. Q-S2 / Q-UX1 の境界

### 9.1 責務の分離（ARCHITECTURE DECISION）

| 論点 | 保証対象 |
|---|---|
| **Q-S2** | クエリに対して意味的に正しい module / brand へ到達・確定できるか（correctness / semantic resolution） |
| **Q-UX1** | 複数の正しい候補が存在する状況で、限られた表示枠へどう優先順位をつけて見せるか（ranking / presentation） |

### 9.2 U-2 以降の必須制約

> **resolution state を ranking の入力にしてはならない。**

Q-S2 は「候補が**何を意味するか**」を変える工程であり、「候補が**どこに出るか**」を変える工程ではない。この制約を守る限り、bucket 結合順・`limit=8` の配分・既存 Suite ⑦ / ⑧ は影響を受けない。**制約が破られた瞬間に Suite ⑦ / ⑧ が破壊されるため、U-2 のレビュー観点として明記する。**

`lowConfidence` bucket は **ranking の概念として 1 つのまま維持**し、意味論の担い手からは外す（denotation / matchStrength はフィールドとして持つ）。bucket 名称の適正化は Q-UX1 着手時に行えば足りる。

### 9.3 Q-UX1 として Deferred する事項（DEFERRED）

- Suite ⑦ / ⑧ が固定する cross-module 順位（単剤 vs 配合剤の 1 位争い）
- D-4（ツイミーグ）の表示枠押し出し
- class-level 展開（U-6）が候補数を増やすことによる `limit=8` との干渉

---

## 10. Deterministic invariants と audit 設計

### 10.1 INV-1〜INV-6

| ID | invariant | 判定 |
|---|---|---|
| INV-1 | `denotation: 'brand'` ⇒ `brandKey ∈ drug.brandNames` | FAIL |
| INV-2 | `denotation: 'module'` ⇒ `brandKey === null` かつ `subject === null` | FAIL（型で保証） |
| INV-3 | いかなる消費経路も `subject === null` の候補から SOAP 主語を生成しない | FAIL |
| INV-4 | `denotation: 'generic'` ⇒ その generic group 内の全 brand の `handlingTags` が同一 | **CHECK** |
| INV-5 | module-level alias が brand-level に複製されていないこと自体を FAIL としない | 設計制約（DP-18 保護） |
| INV-6 | brand 1 件の module では、module 到達クエリが必ず `denotation: 'brand'` を返す | FAIL |

### 10.2 static / module-local audit へ移行できる理由

denotation は **module の静的構造（brand 件数・generic group 件数・handlingTags 均質性）から決定的に導出される**（§4.3）。これらはすべて単一 module の canonical JSON を読むだけで判定できる。

**したがって cross-module runtime simulation は Q-S2 correctness の必須検証から外せる。** cross-module の相対順位（`resolveSortLabel()` の `localeCompare` に依存する挙動）に関わるのは **ranking = Q-UX1** のみである。

調査段階で検討された案のうち、J-1（module-level alias が brand-level 未解決なケースの静的列挙）は**不要になる**。unresolved が欠陥ではなく正式状態になるため、列挙対象そのものが消えるからである。

### 10.3 新規 audit の方針（DEFERRED → U-7）

```
scripts/audit-brand-resolution-safety.ts（新設予定）
  ① generic group 内の handlingTags 不均質を検出        → CHECK
  ② brand 1 件 module で denotation が brand にならない  → FAIL
  ③ subject === null の候補が SOAP 経路へ到達しうる      → FAIL（型で担保できれば audit 不要）
```

`GENERIC_NAME_UNREACHABLE`（到達性）とは判定軸が異なるため、既存 audit の拡張ではなく**別スクリプトとして新設**する。

**かつて不採用とした「module-level alias があるのに brand-level 未解決なら一律 FAIL」は復活させない。** DP-18 が定める意図的な非複製と衝突するためであり、この制約は U-7 の設計時に必ず維持する。

`derm_heparinoid_moisturizer_ointment` の handlingTags 不均質（§6.2）は Q-S2 本体とは分離し、**U-8 で再評価する**（DEFERRED）。現時点で `genericKey` 変更等のデータ修正は行わない。

---

## 11. Implementation sequence

```
U-1  resolution schema（型契約の確立。runtime 未接続）      ← 完了（commit a263c69）
U-2  lib/search.ts が resolution を付与する
U-3  resolveDrugName() を resolution state → SOAP 主語へ刷新する
U-4  DashboardClient の独自 fallback を本契約へ統一する
U-5  SOAP / brand 依存処理の resolution gate
U-7  invariant tests / audit
U-6  class-level query の generic group 展開
U-8  個別 Finding 再評価（D-1〜D-3 / heparinoid handlingTags 不均質）
```

### 11.1 順序の設計根拠（ARCHITECTURE DECISION）

- **U-1 を独立させた理由**: 型契約のみであれば consumer が 0 件であり、`git revert` が dangling reference を生まない。この rollback boundary の清潔さは U-1 でのみ成立する
- **U-5（SOAP gate）を U-4 から分離した理由**: 「型で未確定を表現する」ことと「未確定時に生成を止める」ことは別責務であり、後者は UI 挙動を変えるため独立した rollback boundary を要する
- **U-6（class-level 展開）を後段へ隔離した理由**: 候補**集合**を変える唯一の Unit であり、`limit=8` と干渉しうる Q-UX1 との境界面にある。単独で revert できる必要がある

### 11.2 新規 module 開発へ戻れる最低条件

**U-1〜U-5 および U-7 が完了し、既存テスト・Suite ⑦ / ⑧・multi-drug が維持され、新規 audit が機能した時点。**

U-6 / U-8 は上記条件を満たしていれば新規 module 開発と並行して進行してよい。

---

## 12. 本記録で行っていないこと

- 新しい設計判断の追加（本記録は確定済み Owner Decision の根拠の再構成である）
- コード・canonical JSON・bridge の変更
- U-2 以降の実装および Execution Plan の作成
- `docs/reviews/` の Documentation Map 登録（GG-2。別 Unit として維持）
- `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` §1〜§8 の書き換え（§9 の訂正追記のみ行った）
- Q-UX1 の実装・ranking の変更

---

## 13. 後続 Decision 追記（2026-08-12）— 実装工程の分割

> 本節は §11 の実装工程に対する**後続の Owner Decision** の記録である。
> **§1〜§12 の本文は変更していない。** 当時の判断は historical record としてそのまま保持し、
> 後続の実測で判明した事項に基づく変更のみを本節へ追記する
> （`docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` §9 と同じ追記方式）。
>
> **工程の正本は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 である。** 本節と Q-S2 が食い違う場合は Q-S2 を優先する。

### 13.1 分割の理由（RUNTIME-VERIFIED）

§11 の工程は「U-4（consumer 移行）→ U-5（gate）」の順だったが、Repository 実測により
**U-4 を単独で完了させると中間状態が安全でない**ことが判明した。

`lib/drugSubject.ts` の `resolveDrugSubject()` は `drugName` が空文字のときスロットを残す仕様である。
したがって U-4 で subject 源を `resolution.subject` へ切り替えると、`denotation: 'module'`
（`subject === null`）の候補では **`{{drug_subject}}` というテンプレート記号が SOAP 本文へそのまま出力される**。
U-5 の gate が入るまでこの状態が続く。

実測（全 module の alias / brand / displayGenericName から生成した 588 クエリ・1572 候補行）:

| 指標 | 実測値 |
|---|---|
| `denotation` 分布 | brand 893 / generic 621 / **module 58** |
| `denotation: 'module'` へ到達する module | **20**（`花粉症` `保湿` `SGLT2阻害薬` `DPP-4阻害薬` 等、実運用で自然に打たれるクエリで到達） |
| legacy subject と `resolution.subject` の乖離 | 83 行 / 26 パターン（うち 20 パターンが `module`、6 パターンが `generic`） |

### 13.2 確定した工程（ARCHITECTURE DECISION）

```
U-4a  plumbing（resolution を production state へ保持。挙動不変）
  ↓
U-5   safety gate（生成阻止・brand 固有解決の遮断）
  ↓
U-4b  consumer migration（subject を新契約へ移行）
```

§11.1 が定めた「型で未確定を表現することと、未確定時に生成を止めることは別責務である」という
分割原則は維持されている。本 Decision はその原則を**より忠実に**適用し、
「保持」「阻止」「移行」の 3 責務をそれぞれ独立した rollback boundary へ分離したものである。

採用理由:

1. **U-5 適用時点で臨床的安全性が確保される。** placeholder 露出を発生させずに、
   誤った brand 名が記録される経路を先に閉じられる
2. **regression の症状が Unit と 1 対 1 に対応する。** 「候補が出ない」= U-5、
   「主語が変わった」= U-4b と切り分けられる（結合すると切り分け不能になる）
3. **U-4b を revert しても U-5 の gate が残る。** 安全側へ倒れる

### 13.3 U-5 設計へ引き継ぐ実測（U-5 着手時に再確認すること）

| 項目 | 実測 |
|---|---|
| SOAP 生成の入口 | 検索由来は `handleSelectScenario` の 1 本のみ（`TemplateListPanel` 経由）。Rapid（S 先頭文 / ADDON）は `currentScenarioId !== null` の下流に完全に含まれるため独立した gate を要さない |
| gate 後の UI | `availableGroups` が空 / `groupScenarios` が空 / `showSoapEditor` が false の各パスはいずれも**既存の描画経路**であり、新規 UI 概念を要さない。compose 側は既存の pending 状態が吸収する |
| `getVisibleAddonKeys` の `undefined` 挙動 | `brandHandlingTags === undefined` は**フィルタを丸ごとスキップする**（後方互換仕様）。`undefined` を渡すと brand 依存 ADDON が全表示され U-5 の目的と逆行する。**空配列 `[]` を渡すこと**で 3 consumer（ADDON / availableGroups / groupScenarios）すべてが正しい意味論になる |
| tag 依存の範囲 | `requiredTags` を持つ ADDON は 514 件中 **11 件**、`scenarioRequiredTags` を持つ scenario は 1060 件中 **41 件**。gate に使われている tag は **18 種** |
| generic group の均質性 | 全 **96** generic group 中、`handlingTags` が不均質なのは `derm_heparinoid_moisturizer_ointment` の **1 件のみ**。その差分 tag（`ointment` / `oily_cream` 等）は **gate に 1 つも使われていない**（§6.2 が指摘したリスクは実在するが、現時点では潜在的であり ADDON 選択結果には現れていない）。データ修正は §10.3 のとおり U-8 のまま |

`denotation: 'generic'` における handlingTags の取得方法（U-1 JSDoc が「U-5 / U-8 の対象」として
保留した論点）は **U-5 で確定させる必要がある**。代表 brand の選択が禁止である点は §6.2 のとおり変更しない。

### 13.4 U-4a の完了記録（FACT）

| 項目 | 内容 |
|---|---|
| 変更 | `lib/types.ts`（`ComposeNode.resolution?` 追加）/ `app/components/DashboardClient.tsx`（state・ref・保持 2 箇所）/ `tests/brandResolutionPlumbing.test.ts`（新規） |
| runtime behavior | **変更なし**（tsc 0 / test 2735→2750（新規 15 件のみ増）/ audit 3 系統 PASS / multi-drug 20 PASS / build 成功・bundle size 同一 / 警告 18 件で同数） |
| golden projection | `tests/searchResolution.test.ts` T-U2-1 が無変更で PASS（ranking / 候補集合の不変を確認） |
| 非使用の担保 | `tests/brandResolutionPlumbing.test.ts` T-U4a-5 が、resolution を含むコード行を**ホワイトリスト 5 行で完全固定**している。U-4b / U-5 で consumer を追加すると必ず FAIL するため、意図しない consumer 混入を検出できる |
