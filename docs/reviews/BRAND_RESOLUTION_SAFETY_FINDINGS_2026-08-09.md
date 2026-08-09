# Brand Resolution Safety — 調査記録（2026-08-09）

> **文書の性格**: 本記録は時点付きの実施記録であり **正本ではない**。
> 正本は以下である。
> - 設計原則: `docs/DESIGN_PRINCIPLES.md` DP-18
> - 未解決論点: `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 / Q-UX1
> - 技術的負債の記録: `prompts/vNext/HANDOFF.md` §6「DashboardClient の resolveDrugName() SSOTバイパス」
>
> 本記録は、上記正本が確定するに至った調査過程・時点付き実測・commit根拠を保存する。
> 正本と本記録が食い違う場合は正本を優先する。
>
> **表記規約**: 各記述は次の4種を明示的に区別する。
> - **FACT**: 本セッションでRepository（ファイル内容・git history）から直接確認した事実
> - **RUNTIME-VERIFIED**: 本セッションで実際にコマンドを実行し実測した結果
> - **REPORTED（未再検証）**: 前セッションの会話引き継ぎとして報告された内容のうち、本セッションでは再実行・再現確認していないもの
> - **INFERENCE**: 上記FACT/RUNTIME-VERIFIEDから導いた推論
> - **OWNER DECISION**: Ownerが確定した判断

---

## 1. メタデータ

| 項目 | 値 |
|---|---|
| 作成日 | 2026-08-09 |
| 対象commit（本記録作成時点のHEAD） | `1164207` — "fix(search): resolve safe single-brand generic aliases" |
| ブランチ | `feat/nlp-input-panel-and-new-schema` |
| 調査の発端 | 前セッションでの「drug.search.nameAliases では module に到達できるが、brandCatalog.aliases では brand を解決できず、matchedBrandName === undefined のまま lowConfidence 経路へ落ちるケース」の調査（本セッションでは会話引き継ぎとして受領） |
| 本記録でのRepository変更 | なし（本ファイルの新規作成のみ。コード・data/modules配下のJSONへの変更は行っていない） |

---

## 2. FACT（本セッションで直接確認した事実）

### 2.1 resolveDrugName() のSSOT宣言

`lib/drugSubject.ts` 42〜53行、`resolveDrugName()` の docstring:

```
/**
 * モジュールの drug 情報と matchedBrandName から薬剤名を解決する。
 *
 * 通常UI・SOAP生成における薬剤名解決のSSOT。呼び出し元固有のフォールバック
 * ロジックを個別に書かず、常にこの関数を経由すること。
 *
 * 優先順:
 *   1. matchedBrandName（サジェスト時のブランド選択 = 商品名）
 *   2. drug?.brandNames?.[0] に対応する brandCatalog[...].displayGenericName
 *      （ブランド未確定時。表示用一般名のSSOT）
 *   3. ''（解決不能: スロットを残す。genericName＝正式名称へは暗黙フォールバックしない）
 */
```

`docs/JSON_STANDARD.md` 231行も同旨（「UI側は `genericName` へのフォールバックを行わない。`resolveDrugName()` が薬剤名解決の唯一の正本」）。

### 2.2 DashboardClient.tsx の独自fallback

検索語 `resolvedBrand` で `app/components/DashboardClient.tsx` を検索すると、以下の箇所で `resolveDrugName()` を経由しない直接 fallback を確認した（本記録作成時点の行番号。将来ずれる可能性があるため検索語での再特定を推奨）。

```
513行付近: const resolvedBrand = activeNode !== null
  ? ...
  : (activeBrandName ?? activeModuleData.drug?.brandNames?.[0])

718行付近: const resolvedBrand = activeBrandName ?? activeModuleData.drug?.brandNames?.[0]
```

また `handleSelectDrugSuggestion()`（1004〜1039行付近）内の `displayNameForSubject` 算出も、`item.displayName` / `item.drugDisplayLabel` を直接参照しており `resolveDrugName()` を経由しない。

一方、`primaryDrugName`（804〜805行付近）は `activeDrugDisplayNameRef.current ?? resolveDrugName(activeModuleData.drug, activeBrandName)` という形で、fallback側は `resolveDrugName()` を正しく呼んでいる。**バイパスの実体は `activeDrugDisplayNameRef.current` 自体が `resolveDrugName()` を経由せずに事前設定される経路（`handleSelectDrugSuggestion()` 側）にある**（FACT。前セッション報告の記述は「短絡箇所の特定」がやや粗く、本セッションで該当行を再確認して精緻化した）。

### 2.3 commit 89cf33f（DP-18の直接根拠）

```
commit 89cf33f
fix: prioritize own-brand matches and suppress redundant salt-name headers
```

diff実測: `lib/search.ts`・`lib/types.ts` に `matchPolicy.preferOwnNameMatchOverGenericMatch` / `matchPolicy.suppressRedundantGenericHeaderOnDirectMatch` の2フラグを追加（デフォルトfalse）。`bridges/dm_biguanide_metformin_oral.md` / `bridges/dm_thiazolidinedione_pioglitazone_oral.md` および対応するJSONへ、salt-name full readingを**generic-labeled brand自身のbrandCatalog aliasesにのみ**追加（家族内の他brandへは複製しない）。コミットメッセージには「2026-07-05の判断（家族内複製を避けた決定）を、単一brand追加には適用対象外として revise する」旨が明記されている。

### 2.4 commit a31ba2e（lowConfidence bucketの導入根拠）

```
commit a31ba2e
fix: prevent cross-token ghost matches in drug search
```

diff実測: `SearchEntry.corpus`（単一結合文字列）を`corpusTokens`（個別正規化トークン配列）へ置換。あわせて `getDrugSuggestions()` に `lowConfidence` bucket を追加し、「brand/generic名が解決できず弱いcorpus matchのみ残った候補」を末尾へ隔離する設計を導入。

### 2.5 module-level到達／brand-level未解決の非対称の実例

`data/modules/dm_thiazolidinedione_biguanide_combination_oral.json`（メタクト）を実測: `search.nameAliases` / `search.prefixAliases` にはメトホルミン塩酸塩のsalt-name readingが含まれるが、`brandCatalog["メタクト"].aliases` / `normalizedAliases` / `aliasToBrand` のいずれにも同readingは存在しない（当該brandの`aliases`は「めたくと」「めとほるみん」「ぴおぐりたぞんえんさんえん」の3件のみ）。**module単位では到達するがbrand単位では解決しない、という前セッション報告の構造が実データで確認できた（FACT）**。

### 2.6 S4-B/S4-Cの裏付け

`app/page.tsx` 49〜58行: `assertModuleValid(m)` はtry/catchで囲まれ、エラーはconsole.errorに記録されるのみで起動を止めない（コメント「本番でも起動を止めず、エラーをログに残す」も現存）。`GENERIC_NAME_UNREACHABLE`は現状`scripts/audit-generic-name-reachability.ts`のみに存在し`lib/moduleValidator.ts`には未組込み（grep実測: 0件）。CI/git hook基盤はRepository内に存在しない（`.github/`等のディレクトリなし）。

---

## 3. RUNTIME-VERIFIED（本セッションで実行したコマンドの結果）

| コマンド | 結果 |
|---|---|
| `npx tsc --noEmit` | エラー0 |
| `npm run audit` | addon-bridge-chain / alias-bridge-chain / generic-name-reachability の3系統、35モジュール全PASS |
| `npm test` | 2709 tests / 143 suites / 全PASS / 0 fail |

いずれも本記録作成時点のHEAD（`1164207`）に対する実測であり、ドキュメントのみの本Unitではコード変更を行っていないため再実行の必要はない。

---

## 4. REPORTED（未再検証）— 前セッション由来の時点付き実測

以下は前セッションの会話引き継ぎとして報告された内容であり、**本セッションでは再現・再実行していない**。数値・具体的query文字列はいずれも今後変動しうるため、正本文書（DP-18／Q-S2／Q-UX1）には転記していない。再検証が必要な場合は、下記の再現手順（§6）に従って改めて実行すること。

### 4.1 D-1〜D-4のDeferred理由（報告内容）

| ケース | 対象module | 報告されたquery | 報告された衝突 |
|---|---|---|---|
| D-1 | `dm_dpp4_biguanide_combination_oral` | メトホルミン塩酸塩のsalt-name reading | 単剤メトホルミンを1位に維持する既存test（`tests/search.test.ts`内、"めとほるみんえんさんえん"を含むtest）と衝突する |
| D-2 | `dm_thiazolidinedione_pioglitazone_oral`系（リオベル） | ピオグリタゾンのsalt-name reading | ピオグリタゾン単剤を1位に維持する既存testと衝突する |
| D-3 | `dm_thiazolidinedione_biguanide_combination_oral`（メタクト） | メトホルミンのsalt-name reading | D-1と同一の既存testと衝突する |
| D-4 | `dm_thiazolidinedione_sulfonylurea_combination_oral`系（ツイミーグ） | イメグリミンのsalt-name reading | query="い"の全prefix blast-radius確認で、`dm_insulin_glp1_combination`のソリクアがlimit=8から脱落しツイミーグに置き換わることを確認したと報告された |

`tests/search.test.ts`内に該当するtest（"めとほるみんえんさんえん" → メトホルミン系候補、"ぴおぐりたぞんえんさんえん" → ピオグリタゾン系候補）が実在することは**本セッションでgrep実測済み（FACT）**。ただしD-1〜D-4個別のblast-radius再走査・ソリクア脱落の再現automated実行は本セッションでは行っていない。

### 4.2 F-S3-1（Q-UX1の根拠、報告内容）

「全prefix再走査でmodule脱落prefix 19件。完全一般名検索では脱落0件」と報告された。個別の脱落prefix一覧・再走査スクリプトの実行結果は本セッションでは確認していない。

### 4.3 「unresolved 14 → containment後9」という件数

前セッションの会話引き継ぎ中に言及された集計値。本セッションでは母集団の定義（何をもって「14件」と数えたか）を含め再現していないため、正確な意味は本記録では確定できない（**UNKNOWN**）。

---

## 5. INFERENCE（FACTから導いた推論）

- 89cf33fの決定（salt-name readingを単一brandに限定登録）と、a31ba2eの決定（lowConfidence bucketで弱い一致を隔離）は、**独立した時期に別々の目的で導入された**（89cf33fは2026-07-16、a31ba2eは2026-07-15、いずれもDP-09策定作業と近い時期）。両者の相互作用（「意図的にbrand未解決のまま残したsalt-name readingが、結果としてlowConfidence bucketへ落ちる」という経路）は、いずれのcommitでも明示的に設計されたものではなく、**事後的に発見された副作用**である可能性が高い
- 同じsalt-name readingでも、メタクト／ソニアスでは安全にcontainmentできた（commit `1164207`）一方、リオベル・メタクト側のめとほるみんえんさんえん・ツイミーグでは見送られたのは、cross-module tie-break（`resolveSortLabel()`の挙動）が配合剤の成分表記順によって結果を変えるためと報告されている。この機構自体はコードを読めば確認できるFactであり、本記録では再説明しない

---

## 6. 再現手順（今後の検証者向け）

DP-00ルール5（検証手段の永続化）に従い、以下の手順で再検証できる。

1. `npm run dev`でローカル起動、または`npx tsx`で`lib/search.ts`の`getDrugSuggestions()`を直接呼び出す
2. D-1〜D-4の再確認: 対象moduleのbridgeへ該当salt-name readingを`brandCatalog[brand].aliases`へ追加した上で、`npx tsx --test tests/search.test.ts`を実行し、Suite⑦・⑧に相当する既存testが依然PASSするか確認する
3. D-4（ツイミーグ）・F-S3-1の再確認: 全prefix（1文字〜）に対して`getDrugSuggestions(prefix, fullIndex, 8)`を走査し、各moduleが最低1件はいずれかのprefixで表示枠内に入るかを確認するスクリプトを新規に書く必要がある（本記録作成時点でこの走査を行う専用scriptはRepository内に存在しない）
4. いずれの再検証も`npm run audit`・`npm test`・`npx tsc --noEmit`の全PASSを前提条件として維持すること

---

## 7. Owner Decision（本記録の永続化方針として確定した事項）

- D-DOC-1: F-3は技術的負債として`prompts/vNext/HANDOFF.md` §6へ記録する（具体的修正方法・blast radiusは今回決定しない）
- D-DOC-2: 89cf33fのDecisionはDP-09へ吸収せず独立した新規Design Principle（DP-18）とする
- D-DOC-3: Q-S2（brand-level resolution / fallback safety）とQ-UX1（表示枠配分・ranking）は分離する
- D-DOC-4: GG-2（`docs/reviews/`のDocumentation Map未登録）は本Unitでは解消しない。本記録への到達経路はQ-S2／Q-UX1からの明示参照に依存する
- D-DOC-5: driftする実測値（件数・query文字列・blast radius・コード行番号）はSSOT本文（DP-18／Q-S2／Q-UX1／HANDOFF §6）へ複製せず、本記録にのみ保持する

---

## 8. 本記録で行っていないこと

- D-1〜D-4・F-S3-1の実測再現（§4はいずれも前セッション報告の転記であり、本セッションでの再実行ではない）
- コード修正・data/modules配下JSONの変更
- 新規audit/validatorの設計・実装
- `docs/reviews/`のDocumentation Map登録（GG-2の解消）
- git commit / git push
