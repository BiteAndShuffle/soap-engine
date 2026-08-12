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

### 13.5 U-5 の完了記録（FACT・2026-08-12）

**確定した generic handlingTags 導出規則**: `brandKeys` 全件の `handlingTags` の**交差集合**
（Owner Decision。正本は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2、実装は `lib/brandTags.ts`）。
§6.2 が「取得方法は U-1 では定めない」として保留した論点は、これにより解消した
（`derm_heparinoid_moisturizer_ointment` のデータ不均質そのものの評価は §10.3 のとおり U-8 のまま）。

| 項目 | 内容 |
|---|---|
| gate 判定 | `resolution.denotation === 'module'` のみ。**`subject` を読まない**（subject 算出は U-4b の責務であり、gate とは独立） |
| SOAP 生成 gate | `availableGroups` と `groupScenarios` の 2 点。検索由来の生成入口は `handleSelectScenario` 1 本のみであり（NLP 経路は UI 未接続、Express は分離）、Rapid は `currentScenarioId !== null` の下流に含まれるため独立した gate を要さない |
| brand 固有解決 gate | `addonBrandHandlingTags`（`lib/brandTags.ts` へ委譲）と `brandToTags`（`tagBrandKey` へ分離）。表示用 `resolvedBrand` は変更していない |
| 未確定の表現 | **空配列 `[]`**。`undefined` は「フィルタ非適用」の既存後方互換状態であり、未確定の表現に流用しない（`lib/addonFilter.ts` JSDoc に明記） |
| UX | 既存 `editorGuide` の条件分岐のみ。新規パネル・モーダルは作らない（U-6 までの最小案内） |
| 挙動不変の実測 | `denotation='brand'` 893 行で `handlingTags` の生値差分 **0**。generic は 91 の一意な `(moduleId, genericKey)` すべてで ADDON 可視数・scenario 可視数の差分 **0**（production 実装 `resolveBrandHandlingTags()` で再検証） |
| 順序非依存 | 複数 brand を持つ全 generic group で、逆順・ソート順いずれも同値（`intersectHandlingTags` は `brandKeys` への添字アクセスを持たない） |
| 検証 | tsc 0 / test 2750→2789（新規 39 件のみ増）/ audit 3 系統 PASS / multi-drug 20 PASS / build 成功 / 警告 18 件で同数 / golden projection 無変更 PASS |

**lifecycle completeness（U-5 で確立した不変条件）**

`activeResolution` は U-4a では write-only であったため stale でも無害だったが、U-5 で
production の判断入力になったことで、**primary context を切り替える遷移がすべて
`activeResolution` を更新しなければならない**という不変条件が新たに成立した。

実測により、`handleExpressAdd` の primary 分岐が `activeModuleData` / `activeBrandName` /
`activeDrugDisplayName` は更新する一方で `activeResolution` を更新していないことが判明した。
これを放置すると「検索で候補を選び、シナリオを選ぶ前に Express を押す」という通常操作で
前の context の `denotation` により gate が誤発火する（実測で確認）。

> **Owner Decision（U5-Lifecycle-1）**: Express primary 分岐で `setActiveResolution(undefined)`
> を実行する。`undefined` は「`BrandResolution` を持たない legacy / 非検索経路」を表す既存契約であり、
> Express 用に resolution を新規構築するものではない。Express は引き続き legacy path とする。

再発防止として `tests/brandResolutionGate.test.ts` の T-U5-9 / T-U5-10 が、
**primary context を切り替える各 transition のソース領域**に 4 つの state setter が
揃っていることを検証する（用途差による false positive を避けるため、単純な呼び出し回数の
一致では判定しない）。

### 13.6 U-4b の完了記録（FACT・2026-08-12）

§2.2 が root cause の症状として指摘した「候補の意味論をその表示文字列から逆算する推論」
（`item.drugDisplayLabel !== item.matchedBrandName`）を、検索由来 production path から除去した。

| 項目 | 内容 |
|---|---|
| 実装形 | **write site 2 箇所のみ**（`handleSelectDrugSuggestion` / `handleComposeDrugSelect`）。consumer（primary 再構築 / node 再構築 / Rapid / S先頭文 / ADDON 再生成）は単一の write-site 値を読むため無変更。これにより §9 の「同じ薬剤で subject source が異なる」状態が構造的に発生しない |
| 解決経路 | 検索由来 = `resolveSubjectFromResolution()` / Express・legacy 非検索経路 = `resolveDrugName()`（Owner Decision S-1-A。削除も deprecated 化もしない） |
| `resolveDrugName()` 呼出し | 4 → **3 件**。すべて `?? resolveDrugName(...)` の形であり、resolution 由来 subject が無い経路の分岐に限定される |
| `subject === null` | 別値で埋めない。`denotation: 'module'` のみが該当し U-5 gate により到達しない（Owner Decision S-2-A） |
| expected semantic delta | production 到達可能な変更は **generic 6 パターン / 25 行 / 6 module のみ**。brand 0 差分。module 58 行は gate 済みで SOAP に現れない。`tests/fixtures/subjectMigration.expected.json` に実装前に凍結し、T-U4b-12 が全 1572 行の一致を検証 |
| 根本原因の確認 | 6 パターンすべてで `brandCatalog[brandNames[0]].displayGenericName` が `resolution.subject` と一致する。すなわち legacy の `resolveDrugName(drug, undefined)` は**正しい値を返していた**が、`displayNameForSubject` が `drugDisplayLabel`（= `brandNames[0]` = 商品名）で先回りして上書きしていた。U-4b の意味論的変更は **F-3 バイパスの除去と等価**である |
| 検証 | tsc 0 / test 2789→2820（新規 31 件のみ増）/ audit 3 系統 PASS / multi-drug 20 PASS / build 成功 / 警告 18 件で同数 / golden projection 無変更 PASS |

### 13.7 Runtime Preview 検証記録（RUNTIME-VERIFIED・2026-08-13）

> Q-S2 / BrandResolution 基盤が、静的検証（tsc / test / audit）だけでなく
> **実際にアプリを操作した挙動としても確認済み**であることを記録する。
> `docs/IMPLEMENTATION_CHECKLIST.md`「Runtime / 実機横断確認」に相当する工程である。

**実施条件**

| 項目 | 値 |
|---|---|
| 対象 commit | **`2106b4d`**（U-4b 完了時点。画面右下の `BUILD:` 表示で照合） |
| 実施環境 | `npm run dev`（localhost:3000）。production deploy は行っていない |
| localhost 検証が成立した理由 | 認証は `middleware.ts` の Basic 認証であり、`BASIC_AUTH_USER` / `BASIC_AUTH_PASS` **未設定時は fail-open**（`NextResponse.next()`）。`.env.local` に両変数は未定義。`app/components/LockGate.tsx` は §10.2 Legacy 台帳登録済みで `app/` / `lib/` からの import 0 件のため作用しない（`docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md` §303 の記述と一致） |

**検証結果**

| 区分 | 実施ケース | 判定 |
|---|---|---|
| brand | `リベルサス` / `ジャヌビア` | **PASS**（subject・scenario 一覧・ADDON・Topbar とも変化なし） |
| generic | `ヒトインスリン`→`dm_insulin_regular`＝`インスリンヒト` / `中間型インスリン製剤`→`dm_insulin_intermediate`＝`イソフェンインスリン` / `ヒルドイド軟膏`＝`ヘパリン類似物質油性クリーム` / `保湿`→cream＝`ヘパリン類似物質クリーム` | **EXPECTED DELTA**（§13.6 の 6 パターンのうち 4 を実機確認） |
| generic（不変ケース） | `シタグリプチン`→`dm_dpp4_oral`＝`シタグリプチン` | **PASS** |
| module unresolved | `SGLT2阻害薬` / `花粉症` / `ろいことりえん` | **PASS**。グループ 10 件すべて `aria-disabled="true"` かつ `onClick` が no-op、`textarea` 0 個（SOAP 生成不可）、`{{drug_subject}}` の本文露出なし、`brandNames[0]` への silent fallback なし、`editorGuide` に「成分が特定できていません」を表示 |
| compose | generic + generic（ヘパリン軟膏 + ヒトインスリン）／ module unresolved を compose 追加 | **PASS**。node ごとに subject が独立、cross-node leakage なし、module unresolved node は pending 維持で primary SOAP を破壊しない |
| Rapid / S先頭文 | generic 候補で ADDON 再生成・S 先頭文トグル | **PASS**。いずれも通常 SOAP と同一 subject（`インスリンヒト` / `イソフェンインスリン`） |
| generic handlingTags | `シタグリプチン` で `dpp4_standard_titration` gated の増量シナリオ 3 件が表示 | **PASS**（§13.5 の交差集合が代表 brand 方式と同結果） |
| Express | GE モード＝`ヘパリン類似物質油性クリーム` / 先発モード＝`ヒルドイドソフト軟膏` | **PASS**（U-4b 前から挙動不変） |
| Topbar | 全ケース | **PASS**（`ノボリンR｜インスリンヒト｜速効INS` 等、U-4b 前と同一） |

**REGRESSION: 0 件。Runtime Preview 総合判定: PASS。**

**未実機確認（blocker としない）**

`保湿`→lotion と `ヒトインスリン`→`dm_insulin_mixed_regular_intermediate` の 2 パターンは実機未確認である。
blocker としない根拠: いずれも実機確認済みの cream / `dm_insulin_regular` と**同一のコード経路**（同じ write site・同じ `resolveSubjectFromResolution`）であり、
かつ `tests/brandResolutionSubjectMigration.test.ts` T-U4b-12 が **全 1572 候補行を fixture と完全一致で照合**しているため、
値の正しさは機械的に担保されている（Owner 承認済み）。

### 13.8 U-7 の完了記録（FACT・2026-08-13）— INV の再定義と audit 新設

§10.1 で定義した INV-1〜INV-6 を U-1〜U-5 / U-4b 完了後の実装へ再照合し、
`scripts/audit-brand-resolution-safety.ts` を新設して `npm run audit` へ統合した。
**検査内容・code・FAIL / CHECK の意味の正本は `docs/VALIDATOR_STANDARD.md` §2-B**であり、本節へ複製しない。

**再照合の実測結果**

| INV | 実測 | 結論 |
|---|---|---|
| INV-1 | brand 候補 893 行で違反 0。静的にも `brandCatalog` キー集合 = `brandNames` 集合が 35/35 一致 | audit で FAIL 検査（前提の担保） |
| INV-2 | 58 行で違反 0。かつ union member が `brandKey: null` / `subject: null` を**リテラル型で宣言** | **型で完全保証**。audit へ重複実装しない |
| INV-3 | U-5 gate で実現。Runtime Preview PASS（§13.7） | test が担当。canonical static audit の対象外 |
| INV-4 | **原定義の前提が失効**（下記） | 4a / 4b / 4c へ再定義 |
| INV-5 | 該当 audit は存在しない（DP-18 遵守） | 維持。一律 FAIL 案は復活させない |
| INV-6 | **原定義は 9/9 で「違反」**（下記） | 再定義 |

**INV-4 の前提失効（RUNTIME-VERIFIED）**

U-5 の交差集合 Decision（§13.5）により、generic の `handlingTags` は group 全体で真のタグのみとなった。
したがって**均質性はもはや安全性の前提ではない**。実測:

- 不均質 group は **1 件**（`derm_heparinoid_moisturizer_ointment`）のみで、その差分タグは gate 対象に **0 件**
- 交差集合が空になる group は 9 件あるが、**すべて全 brand が `handlingTags` 未宣言**であり情報損失はない
- group 内 `displayGenericName` 不一致: **0 件** / grouping key 解決不能 brand: **0 件**

→ 均質性 CHECK を廃し、INV-4a（subject 一意性・FAIL）/ INV-4b（grouping key 解決・FAIL）/
INV-4c（gate 対象タグの脱落・CHECK）へ再定義した。

**INV-6 の再定義（RUNTIME-VERIFIED）**

原定義「brand 1 件の module では module 到達クエリが必ず `denotation: 'brand'` を返す」は、
single-brand module 9 件すべてで `generic` も観測されるため**そのまま audit 化すると 9 件の false FAIL を生む**。
観測された `generic` は generic-header 経路（一般名検索の正当な結果）であり、
いずれも `brandKeys.length === 1` / `subject` = 一般名で安全である。

一方、安全性上意味を持つ性質「**single-brand module に `denotation: 'module'` が発生しない**」は
**9/9 で成立**していた（0 件）。INV-6 はこの性質へ再定義した。

**module-local static audit で十分であることの再確認**

runtime で観測された denotation は、canonical JSON の静的構造のみで **35 / 35 の module について説明可能**
（説明外 0）。§10.2 の結論は U-2〜U-4b 後も成立しており、**cross-module runtime simulation は
Q-S2 correctness の必須検証に含めない**（Q-UX1 との責務分離を維持）。

### 13.9 U-8 の完了記録（FACT・2026-08-13）— Deferred 再評価と Q-S2 CLOSED 判定

> 本節は U-1〜U-7 完了後に実施した **read-only の Deferred 再評価**の記録である。
> canonical JSON / bridge / production runtime code は一切変更していない。
> **正本は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2「U-8」節**であり、本節は実測の根拠を保存する。

**対象 commit**: `9afe714`（U-7 完了時点）

#### 13.9.1 D-1〜D-4 の再評価（RUNTIME-VERIFIED）

| ケース | module（実測訂正後） | 構造 | 現在の denotation / subject | U-5 gate | 分類 |
|---|---|---|---|---|---|
| D-1 メトアナ | `dm_dpp4_biguanide_combination_oral` | 4 brand / 4 group | `module` / `null` | **発動**（生成不可） | **TRANSFERRED_TO_U6** |
| D-2 リオベル | `dm_dpp4_thiazolidinedione_combination_oral` | 1 brand / 1 group | `brand` / `"リオベル"` | 通過 | **RESOLVED** |
| D-3 メタクト | `dm_thiazolidinedione_biguanide_combination_oral` | 1 brand / 1 group | `brand` / `"メタクト"` | 通過 | **RESOLVED** |
| D-4 ツイミーグ | `dm_imeglimin_oral` | 1 brand / 1 group | `brand` / `"ツイミーグ"` | 通過 | **RESOLVED** ＋ Q-UX1 移管 |

**個別 alias containment は 4 件とも不要**であった。§8.2 の予測どおり brand は module の静的構造から
導出され、Deferred 理由であった ranking 衝突を発生させずに解決した。ranking の実測:

- `めとほるみんえんさんえん` → 1. メトホルミン[brand] / 2. メタクト[brand] / 3. メトアナ[module]（**Suite ⑦ 維持**）
- `ぴおぐりたぞんえんさんえん` → 1. ピオグリタゾン[brand] … 6. リオベル[brand]（**Suite ⑧ 維持**）

D-1 は候補として 3 位に表示されるため **DP-09 の到達性は維持**されており、選択後は gate により
`成分が特定できていません` で停止する。誤った `brandNames[0]`（メトアナ）への確定は構造的に不可能になった。

D-4 の残余は prefix `い` の表示枠問題である。実測では `limit=8` をインスリン系 7 件 + ソリクア 1 件が占有し、
**ツイミーグは alias を追加していない現在も脱落している**。これは candidate visibility / ranking の問題であり
**Q-UX1** へ移管する（BrandResolution correctness とは独立）。

#### 13.9.2 heparinoid handlingTags の再評価（RUNTIME-VERIFIED）

§6.2 が指摘した `derm_heparinoid_moisturizer_ointment` の不均質について、**データ修正は不要**と判定した。

```
交差集合 : apply_thin_layer / avoid_mucosa / external_use /
           room_temperature_storage / topical_application / wash_hands_before_use
脱落タグ : ointment / ointment_application / oily_cream / cream_application（剤形固有）
この module の gate 対象タグ（requiredTags ∪ scenarioRequiredTags）: 0 件
脱落タグのうち gate 対象: 0 件
```

判断根拠は「audit が CHECK 0 だから」ではなく意味論による:

1. 交差集合に残る 6 タグは**両剤形に等しく妥当な外用薬指導**であり、脱落した 4 タグは剤形を区別するもの
2. §6.2 の懸念（油性クリーム患者へ軟膏用 ADDON が提示される）は、**代表 brand 方式なら起きたが
   交差集合方式では構造的に起こらない**。generic 選択時は「どちらの剤形でも真である指導」のみが提示される
3. 剤形固有の指導が必要な場合、brand を直接選択すれば `denotation: 'brand'` として取得できる
   （Runtime Preview で `ヒルドイド軟膏` 検索の brand 固有経路を確認済み）
4. `genericKey` を分割する修正は、むしろ一般名検索の到達性（DP-09）を損なう方向の変更である

→ §10.3 / Owner Decision #4 が U-8 へ送った本件は、**データ修正なしで閉じる**。

#### 13.9.3 最終分類と Q-S2 CLOSED 判定

| 分類 | 件数 |
|---|---|
| RESOLVED | 4（D-2 / D-3 / D-4 correctness / heparinoid） |
| TRANSFERRED_TO_U6 | 2（D-1 の操作性 / U-6 本体） |
| TRANSFERRED_TO_Q_UX1 | 3（D-4 表示枠 / F-S3-1 / U-6 の limit 干渉） |
| CLEANUP_FINDING | 4（F-RAPID-1 / F-EXP-1 / AddonPanel / untracked 参照文書） |
| **REMAINING_QS2** | **0** |

**Q-S2 は CLOSED。** §11.2 の到達条件（U-1〜U-5・U-4b・U-7 完了 / 既存テスト・Suite ⑦⑧・multi-drug 維持 /
新規 audit の機能）をすべて満たし、加えて Runtime Preview が REGRESSION 0 で PASS した（§13.7）。

**U-6 は correctness blocker ではない。** `denotation: 'module'` へ到達する module は **20 件**で、
いずれも brand 複数・generic group 複数である（group 1 件なら `deriveUnresolvedResolution` が
`generic` を返すため定義上ゼロ）。これらは U-5 gate により誤った主語生成が阻止されており、
U-6 は行き止まりを解消する **UX 改善**として Q-S2 とは独立に扱う。

#### 13.9.4 将来 module に対する再発防止

| 旧 Deferred の再発 | 検出機構 |
|---|---|
| single-brand module が未確定へ落ちる | **U-7 audit `SINGLE_BRAND_RESOLUTION_UNSAFE`（FAIL）** |
| generic subject が brand 宣言順に依存する | **U-7 audit `GENERIC_SUBJECT_AMBIGUOUS`（FAIL）** |
| generic group が形成できない | **U-7 audit `GENERIC_GROUPING_KEY_UNRESOLVABLE`（FAIL）** |
| `brandKey ∈ brandNames` の前提崩れ | **U-7 audit `BRAND_CATALOG_BRANDNAMES_MISMATCH`（FAIL）** |
| generic 選択時に gate 対象タグが脱落 | **U-7 audit `GENERIC_GATE_TAG_DROPPED`（CHECK）** |
| 未確定候補から SOAP 主語が生成される | **U-5 gate** ＋ `tests/brandResolutionGate.test.ts` / `tests/brandResolutionSubjectMigration.test.ts` |
| `denotation: 'module'` が brandKey / subject を持つ | **TypeScript discriminated union（型で完全保証）** |
| 検索由来 subject が文字列推論へ戻る | `tests/brandResolutionPlumbing.test.ts` T-U4a-5 / T-U4b-7〜9 |

**唯一の再発防止ギャップ**: `lib/moduleValidator.ts` の `validateExpressModes` は
`expressModes[].defaultBrandName` を必須フィールドとしていない（存在時のみ型・参照を検証）。
現データは 43/43 が宣言済みで `handleExpressAdd` の `brandName ?? brandNames[0]` は到達不能だが、
将来の新規 module が省略すると Q-S2 が排除した `brandNames[0]` anti-pattern が Express 経由で再入しうる。
**Q-S2 の closure blocker とはせず、cleanup / validator hardening の別 Unit 候補として
`prompts/vNext/HANDOFF.md` §6 へ記録する**（Owner Decision OD-U8-1(c)）。本 Unit ではコードを変更しない。
