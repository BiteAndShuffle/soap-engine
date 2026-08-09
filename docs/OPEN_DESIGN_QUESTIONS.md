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

## 判断確定後の処理手順

1. 論点が確定したら、採用した選択肢と根拠を
   DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ追記する
2. このドキュメントから該当項目を削除する
3. 影響する canonical JSON の修正が必要な場合は、bridge 原稿を起点として対応する
4. 関連する module の再バリデーションを行う
