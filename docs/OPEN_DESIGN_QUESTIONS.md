# OPEN_DESIGN_QUESTIONS.md

SOAP Engine — 設計保留事項

このドキュメントは、現時点で設計判断が確定していない「まだ決めていないこと」を記録します。
「どう書くか」は JSON_STANDARD.md を参照してください。
「なぜそうするのか」は DESIGN_PRINCIPLES.md を参照してください。

判断が確定した項目は DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ移管し、
このドキュメントから削除します。

最終更新: 2026-07-26

---

## 保留事項一覧

| No | 項目 | 優先度 | 推奨判断タイミング |
|---|---|---|---|
| Q-A1 | Addon Responsibility をどう構造化するか | 🟡 中 | 糖尿病以外の領域でPN7 check Z相当の監査を展開する際、命名規則ヒューリスティックの精度が不十分と判明した時 |
| Q-J1 | derm 3系 `composition.classKey` の剤形込み設計 | 🟡 中 | heparinoid 複数剤形の同時処方ユースケースが確定した時 |
| Q-F4 | `composition.canonicalSource` の必須化範囲 | 🟡 中 | 多剤合成機能が安定した時 |
| Q-G1 | 配合剤の `genericKey` 複数成分対応（`genericKeys: string[]`） | 🟢 低 | 単剤↔配合剤のクロス成分検索が要件化した時 |
| Q-S1 | 一般名検索が module 単位 `exactAlias` 命中時に `brandNames[0]` へ縮退する検索ロジック | 🟡 中 | brandCatalog.aliases への一般名フルストリング拡張、または `lib/search.ts` 横断修正の要否を判断する時 |
| Q-S2 | module 到達後の brand-level resolution / fallback safety（lowConfidence bucket の意味論混在） | 🟡 中 | **設計方針確定済み。U-1〜U-8 で実装中**（実装完了時に本項目を移管・削除する） |
| Q-UX1 | short-prefix 検索時の limit 内候補配分・ranking（F-S3-1） | 🟢 低 | 表示枠拡張または bucket 別最低保証の要否を判断する時 |

優先度の凡例:
- 🔴 要判断: 新規 module 追加前に確定が必要
- 🟡 中: 現状の動作に支障はないが早期確定が望ましい
- 🟢 低: 当面は現状維持で問題なし

---

## Q-A1: Addon Responsibility をどう構造化するか

**論点**
Addonは本文（S/O/A/P）の付随物ではなく独立した責務を持つ（RULES.md §22）が、
その「責務」は現状コード上で明示的な構造を持たない。PN7 check Z（Addon
Responsibility Consistency）のような監査も、責務の近さを判定するヒューリ
スティック（命名規則）に依存している。糖尿病以外の領域（吸入薬・外用薬・
漢方等）へ展開する際、この構造化方針が必要になる。

**現状**
- addonの責務は `addons.items[key]` の `group` / `title` / `text` から人間が読み取る運用
- シナリオの「責務の近さ」（例: `cp_good` と `se_hypo_none` がどちらも
  「安定継続フォロー」）も、`type` / `id` の命名規則から推測している
- 明示的な責務メタデータ（例: `responsibilityTag` のようなフィールド）は存在しない

**選択肢**

**選択肢A: 命名規則ヒューリスティックのまま運用（現状維持）**
- メリット: スキーマ変更不要。追加コストが低い
- デメリット: 領域が増えるほど命名規則の推測精度が下がる。領域ごとに再検証が必要

**選択肢B: addonsに責務メタデータを追加する（例: `addons.items[key].responsibilityTag`）**
- メリット: 監査ロジックが命名規則に依存しなくなり、領域横断で再利用できる
- デメリット: 全addonへの遡及的なタグ付けが必要。スキーマ変更を伴う

**選択肢C: シナリオ側に「責務クラスタID」を持たせる（例: `scenario.followupClusterId`）**
- メリット: シナリオ単位で「近似責務グループ」を明示でき、addon側の変更が不要
- デメリット: シナリオ数が多く、既存モジュールへの遡及付与コストが大きい

**推奨判断タイミング**
糖尿病以外の領域（吸入薬・外用薬・漢方等）でPN7 check Z相当の監査を展開する際、
命名規則ヒューリスティックの精度が実用上不十分と判明した時点。

**現時点の扱い**
選択肢Aで運用（命名規則ヒューリスティック: `type=side_effect`かつid末尾`_none`、
`type=adherence`のcp_good系、を「安定継続フォロー」クラスタとして扱う）。
シナリオのグルーピング方法自体は、この構造化方針が確定するまでの暫定実装とする。

---

## Q-J1: derm 3系 composition.classKey の剤形込み設計

**論点**
`heparinoid_moisturizer_cream` 等、classKey に剤形名が含まれている。
DESIGN_PRINCIPLES.md DP-02 では「DP-01 適用時は実運用上のモジュール境界を優先してよい」
と定めているが、この設計が意図的であることの確認が必要。

**現状**

| module | classKey | nodeKey |
|---|---|---|
| derm_heparinoid_moisturizer_cream | `heparinoid_moisturizer_cream` | `heparinoid_moisturizer_cream` |
| derm_heparinoid_moisturizer_lotion | `heparinoid_moisturizer_lotion` | `heparinoid_moisturizer_lotion` |
| derm_heparinoid_moisturizer_ointment | `heparinoid_moisturizer_ointment` | `heparinoid_moisturizer_ointment` |

GLP-1 との比較:

| 薬剤 | classKey | nodeKey の関係 |
|---|---|---|
| GLP-1 injection | `glp1ra`（共通）| `glp1ra_injection`（分離）|
| GLP-1 oral | `glp1ra`（共通）| `glp1ra_oral`（分離）|
| heparinoid cream | `heparinoid_moisturizer_cream`（剤形込み）| `heparinoid_moisturizer_cream`（同一）|

**runtime / validator 現状確認（2026-06-20）**
- 現在の runtime / validator / UI では `composition.classKey` は参照されていない
- `composition.sMergeDomain` も現時点では合成判定に未使用
- `lib/types.ts` 上でも `sMergeDomain` は「MergedBlock への伝播のみ行い、合成判定には未使用」とされている
- そのため、現時点で heparinoid 剤形間の class-level S 統合は発生しない
- ただし、将来 class-level S 統合機能が実装される可能性があるため、設計判断は継続保留とする

**選択肢**

**選択肢A: 現状維持（classKey に剤形を含める）**
- メリット: class-level S 統合を意図的に防ぐ。各剤形が完全独立した薬効クラスとして動作する
- デメリット: GLP-1 の classKey 設計との非対称が残る

**選択肢B: 統一（classKey = `heparinoid_moisturizer`、剤形なし）**
- メリット: DP-02 の基本ルール（薬効分類を表す）に近づく
- デメリット: classKey が共通化されると class-level S 統合の候補になる。
  heparinoid cream + lotion が同一患者に処方された場合に意図しない S 統合が発生するリスク

**推奨判断タイミング**
heparinoid 複数剤形の同時処方を SOAP Engine で合成するユースケースの要否が確定した時点。

**現時点の扱い**
JSON_STANDARD.md JS-C（薬剤固有差分許容）で暫定保持。

---

## Q-F4: composition.canonicalSource の必須化範囲

**論点**
現在は多剤合成対象の 3 module のみに存在。単剤・外用の 4 module には存在しない。
DP-03 では「多剤合成対象 module のみ必須」としているが、
将来的に全 module 必須にすべきかの方針が未確定。

**現状**

| module | composition.canonicalSource |
|---|---|
| allergy_h1_antihistamine_second_gen_oral | あり |
| dm_glp1ra_injection | あり |
| dm_glp1ra_semaglutide_oral | あり |
| allergy_h1_antihistamine_eye_drops | **なし** |
| derm_heparinoid_moisturizer_cream | **なし** |
| derm_heparinoid_moisturizer_lotion | **なし** |
| derm_heparinoid_moisturizer_ointment | **なし** |

存在する場合の値の例:

```json
{
  "nodeIdentity": "composition",
  "displayProjection": "display",
  "scenarioMergePolicy": "scenarios[].mergePolicy"
}
```

**runtime / validator 現状確認（2026-06-20）**
- `composition.canonicalSource` は現時点で runtime / validator / UI から参照されていない
- `lib/types.ts` の `composition` 型にも `canonicalSource` は定義されていない
- そのため、現時点では `canonicalSource` の有無は runtime 挙動に影響しない
- ただし、多剤合成対象 module の構造説明として使われているため、必須化範囲の設計判断は継続保留とする

**選択肢**

**選択肢A: 多剤合成対象のみ必須（現状維持・DP-03 準拠）**
- メリット: 不要な module に意味のないフィールドを持たせない
- デメリット: 「多剤合成対象かどうか」の判断を毎回行う必要がある

**選択肢B: 全 module 必須**
- メリット: 構造が統一される。将来の合成対象化に対応済み
- デメリット: 単剤 module に意味のない canonicalSource を維持する

**推奨判断タイミング**
多剤合成機能（S 統合・multi-module SOAP 生成）が安定した時点で全体方針を確定。

**現時点の扱い**
JSON_STANDARD.md JS-B で「多剤合成対象のみ必須」として暫定定義。

---

## Q-G1: 配合剤の genericKey 複数成分対応（genericKeys: string[]）

**論点**
`brandCatalog[brand].genericKey`（RULES.md §21）は現在単一文字列のみ。配合剤（例: インスリンデグルデク／インスリンアスパルト配合の「ライゾデグ」）には単剤の genericKey とは別の専用 combo キー（例: `insulin_degludec_aspart_combo`）を割り当てる方針で運用している。単剤の成分名検索（例: 「アスパルト」）で配合剤を候補に含めるかどうかは未確定。

**現状**
- 単剤: `genericKey` は成分単位の単一文字列（例: `insulin_aspart`）
- 配合剤: 単剤とは重複しない専用の単一文字列キー（例: `insulin_degludec_aspart_combo`）を使用し、単剤の検索グループには含めない

**選択肢**

**選択肢A: 現状維持（配合剤は単剤検索に出さない）**
- メリット: 検索候補が過剰に広がらない。安全側
- デメリット: 「アスパルト」検索で配合剤（ライゾデグ等）を探したいユーザーには不便

**選択肢B: `genericKeys: string[]` を導入し、複数成分の共有判定を可能にする**
- メリット: 単剤↔配合剤のクロス成分検索が可能になる
- デメリット: 判定ロジックが複雑化し、過剰マッチのリスクが上がる。既存の単一 `genericKey` 前提のロジック（`lib/search.ts`）の書き換えが必要

**推奨判断タイミング**
単剤↔配合剤のクロス成分検索が実際の要件として上がった時点。

**現時点の扱い**
選択肢Aで運用（`genericKey: string` のみ、配列は未導入）。

---

## Q-S1: 一般名検索が module 単位 exactAlias 命中時に brandNames[0] へ縮退する検索ロジック

→ 確定した設計原則は `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）を参照。本節は Tier 分類・調査経緯・残課題の詳細記録。

**現象**
module 単位 `exactAlias` 命中時に `resolveAllHighPrecisionBrands()` がブランドを1件も特定できず、`entry.drugDisplayLabel ?? brandNames[0]`（module 内で最初に宣言されたブランド）へ縮退する。同一一般名に属する兄弟ブランドが検索結果から欠落する。

**論点（原因）**
`lib/search.ts` の `getDrugSuggestions()` は、クエリが `drug.search.exactAliases`（module 単位の一般名エイリアス）にのみ完全一致し、`brandCatalog[brand].aliases`（brand 単位のエイリアス）には一致しない場合、`resolveAllHighPrecisionBrands()` が `brandCatalog[brand].aliases` と `brandNames` のみを参照し、`drug.search.exactAliases` も `brandCatalog[brand].displayGenericName` も見ないため、候補ブランドを1件も特定できない。

**2026-07 調査で判明した Tier 分類（全19モジュール横断スキャンで実測確認）**

| Tier | 内容 | 実例 |
|---|---|---|
| Tier1: 兄弟ブランド脱落 | 正しい成分の代表1ブランドは出るが、同成分の他ブランドが出ない | `インスリンヒト`（5ブランド→2）/ `イソフェンインスリン`（`dm_insulin_intermediate`、2→1）/ `インスリングラルギン`（`dm_insulin_long_acting`、2→1）/ `インスリンアスパルト`・`インスリンリスプロ`（`dm_insulin_mixed_rapid_intermediate` / `dm_insulin_rapid_analog`、各2→1〜3→1） |
| Tier2: cross-module 欠落 | module 単位 `exactAliases` に成分名自体が登録されておらず、スコア0で候補から完全に消える。他 module 経由でも救済されない | `dm_glp1ra_injection`（「セマグルチド」で検索してもオゼンピックが一切出ない。同成分の `dm_glp1ra_semaglutide_oral` のリベルサスのみヒット） |
| Tier3: 無関係な代表ブランド表示の危険 | クエリに一致する成分と無関係な薬剤が、その module の `brandNames[0]` というだけで単独表示される（最も深刻） | `allergy_chemical_mediator_release_inhibitor_eye_drops`（「ペミロラスト点眼液」で検索→無関係な「ゼペリン点眼液」(アシタザノラスト) が返る） |

逆に `allergy_leukotriene_receptor_antagonist_oral`（モンテルカスト等）・`derm_heparinoid_moisturizer_cream/lotion/ointment/spray`（ヘパリン類似物質）は正常動作していた。理由は `brandCatalog[brand].aliases` に一般名のひらがな読み（例: `もんてるかすと`）を各ブランドへ既に複製していたため。

**採用方針: displayGenericName / brandCatalogGenericMap を解決に使う（旧選択肢Cを採用）**
`resolveAllHighPrecisionBrands()` で `brandCatalogGenericMap`（`buildSearchIndex()` が既に構築済みの `brand → displayGenericName ?? genericName` マップ）を参照し、クエリと一致する brand を high precision brand として抽出する。`brandCatalog[brand].displayGenericName` は JS-A-drug で全 brand 必須の既存フィールドであり、bridge への新規追記なしに正しく機能する。genericKey によるグルーピング判断（`groups` 構築ロジック）は変更しない。displayGenericName は「クエリと一致するか」の単純な一致判定にのみ使い、「どのブランドを束ねるか」というグルーピング判定には使わない（RULES.md §21 の genericName/genericKey 役割分離を維持）。

**不採用: brandCatalog.aliases への一般名フルストリング複製（旧選択肢A）**
`allergy_leukotriene_receptor_antagonist_oral` 等で既に実践されていたが、300+ module 規模では module 追加のたびに bridge / JSON 双方で全 brand の aliases に同一文字列を手動複製し続ける必要があり保守負荷が高すぎる。複製漏れが `ペミロラスト点眼液`（Tier3）のように実際に発生していたことも確認済み。`docs/VALIDATOR_STANDARD.md` §5 が「`exactAliases` の網羅性は設計判断」と明記する領域のため、機械的な自動複製もできない。

**残課題1: Tier2（cross-module 欠落）は本対応の対象外**
`resolveAllHighPrecisionBrands()` は `scoreEntryAND()`（`scoreEntry`）で一度 `score > 0` と判定された `scored` エントリに対してのみ呼ばれる。`dm_glp1ra_injection` は module 単位の `exactAliases`/`nameAliases`/corpus のいずれにも「セマグルチド」（ひらがな含む）を含まないため、`resolveAllHighPrecisionBrands` に到達する前の `scoreEntryAND` 時点でスコア0となり `scored` に一切入らない。今回の修正は `resolveAllHighPrecisionBrands` 内部（`scored` 通過後の候補ブランド抽出）のみのスコープであり、`scored` に入るかどうかの判定（`scoreEntry`/corpus）には影響しないため、Tier2 は本対応では解決しない。修正実装後に実測で確認済み（`getDrugSuggestions("セマグルチド")` は `dm_glp1ra_semaglutide_oral` のリベルサスのみで、`dm_glp1ra_injection` のオゼンピックは依然出ない）。Tier2 に対応する場合は `scoreEntry`/corpus 構築側に `brandCatalogGenericMap` 相当の一般名を含める別途の変更が必要であり、影響範囲が本対応より広いため別タスクとする。

**残課題2: genericKey 不統一（cross-module 統合への影響は実測上ないことを確認）**
`dm_insulin_rapid_analog` は `genericKey: "insulin_lispro"` のように明示キーを設定しているが、`dm_insulin_mixed_rapid_intermediate` は `genericKey` 未設定で `displayGenericName`（"インスリンリスプロ"）へフォールバックしている。当初は文字列不一致によりこの2 module が合流しないと想定していたが、修正実装後に `getDrugSuggestions("インスリンリスプロ")` / `getDrugSuggestions("インスリンアスパルト")` で実測したところ、**両 module の全ブランドが1つの結果セットに正しく展開されることを確認した**（cross-module の候補結合は `moduleId:brand` 単位の dedup と、`displayGenericName` 文字列一致によるヘッダー dedup（`__generic__:${genericName}` キー）で行われており、`genericKey` の値そのものはこの結合処理に使われないため）。したがって genericKey 不統一は現時点の検索 UX には影響しない。ただし `genericKey` は「同一成分としてまとめてよいか」の判定専用キー（RULES.md §21）であり、将来 `genericKey` を基準にした結合ロジックへ変更された場合に問題が顕在化しうるため、命名規則の統一（明示キー化 or フォールバック文字列の統一）は引き続き別タスクの検討対象とする。

**残課題3: 一般名読み到達性の監査**
Tier2 が `dm_glp1ra_injection` の5ブランド全件・配合剤3件（ソリクア/ゾルトファイ/ライゾデグ）で発生していたことは、`brandCatalog[brand].displayGenericName` の読み（ひらがな）が module 単位・brand 単位のどちらのエイリアス群にも一切存在しない brand を機械的に検出すれば事前に発見できた不整合である。2026-07 の対応では `dm_glp1ra_injection`（ビクトーザ/バイエッタ/リキスミア/トルリシティ/オゼンピック）・`dm_insulin_glp1_combination`（ソリクア/ゾルトファイ、成分ごとに個別追加）・`dm_insulin_mixed_rapid_long`（ライゾデグ、成分ごとに個別追加）へ bridge 起点で一般名読みを追加し解消したが、`derm_heparinoid_moisturizer_spray`（ヒルドイドフォーム）は当時対象外のまま残っていた。今後 300+ module 規模でモジュールを量産する際、bridge 作成時に一般名読みの登録を失念すると同じ Tier2 が再発するため、「brandCatalog の各 brand について、displayGenericName の正規化形が module 単位・brand 単位いずれかのエイリアス群に最低1つ存在すること」を確認する audit を新設した。これは「このaliasが正しいか」という内容判断ではなく「一般名の読みが1件も登録されていない brand があるか」という存在確認のみであり、`docs/VALIDATOR_STANDARD.md` の Structural 分類（フィールド間の同期）に該当し、§5 が禁じる「exactAliasesの網羅性の自動生成」には抵触しない。**監査機構は `scripts/audit-generic-name-reachability.ts` として実装済み・`npm run audit` に登録済みである（詳細は `docs/VALIDATOR_STANDARD.md` §6 を参照）。当時検出されていた唯一の未到達データ（`derm_heparinoid_moisturizer_spray` / ヒルドイドフォーム）は、`drug.search.exactAliases` へ `displayGenericName` の確定値を bridge 起点で追記する対応により解消済みである（`npm run audit` 実測: `GENERIC_NAME_UNREACHABLE` CHECK 0 / FAIL 0）。監査機構自体は今後の module 追加・変更時の検出責務を継続して持つ。`GENERIC_NAME_UNREACHABLE` の severity は CHECK から FAIL へ昇格済みであり、以後同種の未到達データが再発した場合 `npm run audit` は非0終了する。`lib/moduleValidator.ts` への組込み判断、および build / CI への配線判断は引き続き未了である。**

**現時点の扱い**
2026-07、`lib/search.ts` の `resolveAllHighPrecisionBrands()` に `brandCatalogGenericMap` 参照を追加し、Tier1・Tier3 は解決済み（実測確認済み）。同日、`dm_glp1ra_injection` / `dm_insulin_glp1_combination` / `dm_insulin_mixed_rapid_long` へ一般名読みエイリアスを追加し、これらモジュールにおける Tier2 も解消済み（実測確認済み）。`derm_heparinoid_moisturizer_spray` の Tier2 相当（ヒルドイドフォーム）は、当時対象外のまま残存していたが、`drug.search.exactAliases` への bridge 起点の追記により解消済みである（`npm run audit` 実測: `GENERIC_NAME_UNREACHABLE` CHECK 0 / FAIL 0）。一般名読み到達性を機械的に監査する仕組み（残課題3）は `scripts/audit-generic-name-reachability.ts` として実装済みであり、今後の module 追加・変更時の検出責務を引き続き持つ。同 audit の `GENERIC_NAME_UNREACHABLE` severity は CHECK から FAIL へ昇格済みである。`lib/moduleValidator.ts` への組込み判断、および build / CI gate への配線判断は未了のままである。本 Q-S1 は残課題1・残課題2 とあわせて未解決のまま残る。

---

## Q-S2: module到達後のbrand-level resolution / fallback safety

**論点**
module 単位の alias（`drug.search.nameAliases` 等）でクエリが module へ到達しても、`brandCatalog[brand].aliases` で候補 brand を一意に解決できない場合、`getDrugSuggestions()` は `matchedBrandName === undefined` のまま `lowConfidence` bucket へ候補を落とす。この状態で UI が `entry.drugDisplayLabel ?? brandNames[0]`（module 内で最初に宣言された brand）へ静かに確定すると、クエリが実際には指定していない brand・成分が確定表示される。

Q-S1（DP-09）は「module への到達性」を扱うのに対し、本論点は「到達した**後**の brand 帰属解決の安全性」を扱う。責務が異なるため独立した Question として扱う。

**現状（構造上の事実）**
`lowConfidence` bucket には、性質の異なる少なくとも3種の候補が区別されずに混在する。

| 種別 | 内容 |
|---|---|
| ① 本当に弱い corpus match | 明確な alias 一致がなく、周辺文言の緩い一致のみで拾われた候補 |
| ② module alias は強く一致するが brand 解決だけ失敗 | module 単位 alias には完全一致するが、`brandCatalog[brand].aliases` のいずれにも一致しない |
| ③ class-level query | クエリが特定 brand も特定成分も指定せず、module／薬効クラス全体を指している（例: 薬効分類名そのものでの検索） |

**具体的なDeferredケース**
以下は「module 単位では alias 到達済みだが brand 単位では未解決」という状態を、安全性を実測確認できなかったため意図的に補完しなかったケースである。個別の再現手順・実測件数は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照。

| ケース | 対象 | Deferredの理由（衝突する既存仕様） |
|---|---|---|
| D-1 | `dm_dpp4_biguanide_combination_oral`（メトホルミン塩酸塩の salt-name reading） | 単剤メトホルミンを1位に維持する ranking 仕様と衝突する |
| D-2 | `dm_thiazolidinedione_pioglitazone_oral` 系（ピオグリタゾンの salt-name reading） | ピオグリタゾン単剤を1位に維持する ranking 仕様と衝突する |
| D-3 | `dm_thiazolidinedione_biguanide_combination_oral`（メトホルミン塩酸塩の salt-name reading） | D-1 と同一の ranking 仕様と衝突する |
| D-4 | `dm_thiazolidinedione_sulfonylurea_combination_oral` 系（イメグリミン塩酸塩の salt-name reading） | brand 帰属自体は一意だが、追加すると別 module の選択可能 brand 行が表示枠（limit=8）から脱落する（Q-UX1 と同種の副作用が発生する） |

**なぜ機械的な一括解決を採用しないか（不採用とした方針）**
「module 単位 alias があるのに brand 単位で解決できないものを一律 FAIL にする」監査を検討したが、不採用とした。理由は、brand-level unresolved が **DP-18 が定める意図的な設計**（salt-name full reading を generic-labeled brand 自身にのみ登録し、family 内の他 brand へ機械的に複製しない）によって生じているケースが存在するためである。同じ salt-name reading でも、家族内のどの brand へ複製してよいかは cross-module tie-break の挙動に依存して結果が変わるため、alias family 単位の静的ルールだけでは安全性を判定できない。

**選択肢**

**選択肢A: 個別ケースごとに実測確認しながらcontainmentする（現状の運用）**
- メリット: 安全性を都度実測できる。誤った containment のリスクが低い
- デメリット: module 数が増えるほど確認コストが線形に増える。抜け漏れが発生しやすい

**選択肢B: lowConfidence bucketを3種に分離し、UIが種別ごとに異なる提示をする**
- メリット: ③class-level query は「複数候補から選ばせる」UI、②module一致だが未解決は「候補を明示提示」等、種別に応じた安全な提示ができる
- デメリット: `lib/search.ts` の bucket 構成・`DrugSuggestionItem` 型・UI 側の分岐が増える

**選択肢C: class-level query専用の新しい候補表現を設計する**
- メリット: 特定 brand・特定成分を指定しないクエリを、無理に brand へ確定させずに扱える
- デメリット: 新しい UI・データ構造の設計が必要。範囲が③単独にとどまらず Q-S2 全体の設計に波及しうる

**推奨判断タイミング**
lowConfidence bucket の実際の到達件数・誤解決の実害が、Runtime確認（`docs/IMPLEMENTATION_CHECKLIST.md`）で問題として顕在化した時点、または新しい薬効領域追加時に同種のケースが継続して発生すると判明した時点。

**現時点の扱い（設計方針確定・実装中）**

Architecture Review により設計方針が確定し、実装工程 U-1〜U-8 に着手している。選択肢は「A で運用継続」ではなく、**選択肢 B を中心に据える**方針で確定した。

**確定した Owner Decision**

| # | 決定 |
|---|---|
| 1 | **discriminated resolution state を採用する。** `matchedBrandName?: string` の undefined のみへ意味論を持たせる案は不採用。型定義は `lib/brandResolution.ts` |
| 2 | **「検索候補として選択可能」と「SOAP 生成可能な確定状態」を分離する。** `denotation: 'module'` / `subject: null` の状態から SOAP 生成・brand 依存 ADDON 解決を行ってはならない |
| 3 | class-level query は domain schema 上 module-level unresolved を正式状態として保持する。初期 UI では既存 generic group へ展開可能な場合は generic 候補へ展開し、複数 generic group がある場合のみ追加選択を要求する。**専用の新規「未確定候補 UI」は現時点では新設しない**（generic group で表現できない実例が出た場合に再検討する） |
| 4 | `derm_heparinoid_moisturizer_ointment` の generic group 内 handlingTags 不均質は、Q-S2 本体とは分離した Finding として **U-8 で再評価する**。現時点では genericKey 変更等を行わない |
| 5 | `resolveDrugName()`（`lib/drugSubject.ts`）は resolution state → SOAP subject の唯一の SSOT として維持・刷新する。`denotation: 'module'` では subject を生成しない |
| 6 | **Q-UX1 は引き続き Deferred。** Q-S2 実装中に ranking / bucket 結合順 / limit=8 の配分は変更しない |
| 7 | D-1〜D-3 は個別 alias containment を行わず、Q-S2 根本設計の完了後に再評価する |

**schema 上の確定事項**

`denotation: 'generic'` は **authoritative な単一 brandKey を持たない**。generic resolution は複数 brand を代表しうるため、単一 brandKey を型契約へ持たせると `brandNames[0]` fallback と同型の「意味論を持たない代表 brand 選択」を再導入することになる。`genericKey` が保持するのは canonical JSON の `brandCatalog[].genericKey` そのものではなく、`genericKey ?? displayGenericName ?? genericName`（§21）による解決済みグルーピングキーである。詳細は `lib/brandResolution.ts` の JSDoc を正本とする。

**実装工程**

```
U-1 resolution schema（型契約の確立。runtime 未接続）
U-2 lib/search.ts が resolution を付与する
U-3 resolveDrugName() を resolution state → SOAP 主語へ刷新する
U-4 DashboardClient の独自 fallback を本契約へ統一する
U-5 SOAP / brand 依存処理の resolution gate
U-7 invariant tests / audit
U-6 class-level query の generic group 展開
U-8 個別 Finding 再評価（D-1〜D-3 / heparinoid handlingTags 不均質）
```

**新規 module 開発へ戻ってよい最低到達点**: U-1〜U-5 および U-7 が完了し、既存テスト・Suite⑦/⑧・multi-drug が維持され、新規 audit が機能した時点。

調査経緯・時点付き実測（D-1〜D-4 の再現結果、コード位置、commit 根拠）は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照する。

---

## Q-UX1: short-prefix時のlimit内候補配分・ranking

**論点**
`getDrugSuggestions()` の候補数上限（`limit=8`）に対し、short-prefix クエリでは direct／sibling bucket が上位を占有し、genericMode 側の他 module 候補が表示枠から脱落する場合がある（F-S3-1）。

Q-S1・Q-S2 が「クエリに対して意味的に正しい module／brand へ到達・確定できるか」（correctness／semantic resolution）を保証対象とするのに対し、本論点は「複数の正しい候補が存在する状況で、限られた表示枠内にどう優先順位をつけて見せるか」（ranking／presentation／UX）を保証対象とする。DP-09 の一般名検索到達性原則には違反しない（到達性そのものは損なわれていない）。両者は責務が異なるため統合しない。

**現状**
実測件数・具体的な脱落 prefix の一覧は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照（時点付きのため本節では保持しない）。完全な一般名検索では脱落が発生しないことは確認済みで、事象は short-prefix 検索に限定される。

**選択肢**

**選択肢A: limitを引き上げる**
- メリット: 実装が単純
- デメリット: UI上の候補リストが長くなり、視認性が下がる

**選択肢B: bucket別の最低保証件数を設ける**
- メリット: genericMode側の候補が完全に消えることを防げる
- デメリット: bucket構成・スコアリングロジックの変更が必要

**選択肢C: 現状維持（ranking/UX品質issueとして記録のみ）**
- メリット: 変更不要
- デメリット: 短いprefix検索での体験は改善されないまま残る

**推奨判断タイミング**
Runtime確認・実機横断確認（`docs/IMPLEMENTATION_CHECKLIST.md`）でこの脱落がユーザー体験上の実害として確認された時点。

**現時点の扱い**
選択肢C（現状維持）。DP-09違反ではなくranking/UX品質issueとして記録し、Deferredのまま維持する。

---

## 判断確定後の処理手順

1. 論点が確定したら、採用した選択肢と根拠を
   DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ追記する
2. このドキュメントから該当項目を削除する
3. 影響する canonical JSON の修正が必要な場合は、bridge 原稿を起点として対応する
4. 関連する module の再バリデーションを行う
