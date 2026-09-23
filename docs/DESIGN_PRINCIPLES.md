# DESIGN_PRINCIPLES.md

SOAP Engine — 設計原則集

このドキュメントは、新規チャット開始時でも同じ設計判断を再現できるよう、
SOAP Engine の設計根拠・例外許容条件・禁止事項を永続化したものです。

設計判断の参照順序:
  このドキュメント → JSON_STANDARD.md → OPEN_DESIGN_QUESTIONS.md → bridge 原稿 → canonical JSON

最終更新: 2026-09-24（DP-22 inline addon placement 原則を新設。2026-09-22: DP-03 へ current-generation policy と current observation を追記: 条件付き必須 4 key は current の新規 module 生成では生成しない／判定条件は未定義のまま／既存 canonical は preserve／採用理由の前提と runtime consumer 0 件の実測が一致していない。本文・表・採用理由は historical design record として不変。2026-09-13: DP-19 へ Owner Decision OD-RAPID-SCOPE-1 を追記: Rapid の薬歴確認前提と「処方整理」の意味境界。DP-12 へ Owner Decision OD-COMPLIANCE-REALIZATION-1 を追記: コンプライアンス評価単位が Rapid sentence realization に与える含意。DP-18 へ 2026-09 追補: OD-DRUG-PREFIX-BOUNDARY-1・G5 gateFloor・MULTI_INGREDIENT_STRONG_ALIAS を追記。DP-20 へ Phase 2-A/2-B/SF-2A の用語対応を追記）

---

## DP-00: 強くてニューゲーム原則（New Game+ Reproducibility Principle）

**目的**
新規チャット開始時に会話履歴が失われても、同じ設計判断を再現できるよう、
すべての設計決定・例外許容条件・保留理由を永続化する。

**適用範囲**
このプロジェクト全体

**ルール**
1. 設計判断は「何を決めたか」だけでなく「なぜ決めたか」を記録する
2. 例外を許容した場合は「なぜ例外を許容するのか」を明記する
3. 判断を保留した場合は「何が確定すれば判断できるか」を明記する
4. 差分を発見した場合は「バグか、意図的差分か、保留事項か」を最初に判断する
5. 検証手段（テスト・回帰確認の方法）も会話履歴に依存させず、リポジトリへ永続化する。口頭やチャットでしか説明されない検証手順は、次のセッションでは存在しないものとして扱われる

**採用理由**
このプロジェクトでは新規チャット開始時に会話履歴が失われる。
設計意図が伝わらないまま作業を続けると、過去の判断が覆され一貫性が崩れる。
「強くてニューゲーム」とは、前回セッションの知識をそのまま引き継いで
次のセッションを開始できる状態を指す。
これは設計判断だけでなく、「どう検証すれば同じ品質を維持できるか」という
再現手段そのものにも当てはまる。生成AIの担当交代（新規チャットへの切替、
利用するAIサービスの変更を含む）を前提とすると、検証手順は会話ではなく
リポジトリ内の実行可能な形（スクリプト・npm script 等）で残す必要がある。

---

## DP-06 について（欠番注記）

DP-06 として定義していた **expressModes 配列構造統一原則** は、
「なぜそうするか」よりも「どう書くか」の性格が強い JSON 実装ルールのため、
JSON_STANDARD.md へ移管しました（`JS-expressModes` 節参照）。

DP 番号は再採番せず、欠番を許容します。
このドキュメント内の原則番号として DP-06 は存在しません。

---

## DP-01: 剤形分離原則（Formulation Separation Principle）

**目的**
同一成分・同一ブランド群であっても、剤形が異なる場合は独立モジュールとして設計する。
剤形ごとの最適化と誤 SOAP 生成の防止を両立する。

**適用範囲**
- 外用薬（軟膏・クリーム・ローション・ゲル・スプレー）
- 点眼薬と眼軟膏
- 経口薬と注射薬
- 内服・吸入・貼付剤など route が異なる全剤形

**例外条件**
- 同一剤形内の用量違い・ブランド違いは同一 module 内で扱う
  （expressModes / brandCatalog で分岐）
- 製剤的に同一であり、使用方法・シナリオ・注意点が区別不要な場合は module 分割しない

**採用理由**
剤形が変わると「使用方法・注意点・検索語・UI・Express・シナリオ」が変化する。
これらを 1 module に統合すると条件分岐が爆発して保守不能になる。
独立 module にすることで各剤形の SOAP を最適化でき、
誤った剤形の指示が生成されるリスクを排除できる。

**関連フィールド**
`moduleId` / `composition.nodeKey` / `categoryPath` / `expressModes`

**関連原則**
DP-02: 剤形分離時の classKey 命名に影響する

---

## DP-02: classKey 設計方針（ClassKey Design Policy）

**目的**
`classKey` は「S 統合・class-level merge の対象グループ」を定義する識別子であり、
runtime がどのモジュールを同一薬効クラスとして扱うかを決定する。

**適用範囲**
全 module

**基本ルール**
`classKey` は基本的には薬効分類を表す（例: `glp1ra`, `h1_antihistamine`）。

ただし、DP-01（剤形分離原則）が適用される場合は、
薬効分類よりも実運用上のモジュール境界を優先してよい。
その結果として classKey に剤形名が含まれることは許容される。

**命名形式**

| 用途 | 形式 | 例 |
|---|---|---|
| 薬効クラス共通（統合許容） | `{薬効クラス英略}` | `glp1ra`, `h1_antihistamine` |
| 剤形分離優先（統合防止） | `{薬効クラス英略}_{剤形}` | `heparinoid_moisturizer_cream` |

**設計根拠**
- `classKey` が同じ module 同士は class-level S 統合の候補になる
- 統合させたくない場合は `classKey` を分離することが手段となる
- GLP-1 injection / oral: `classKey=glp1ra` で共通 → class-level S 統合候補
- heparinoid cream / lotion: 剤形間の S 統合が不要 → classKey に剤形を含めて分離（保留: Q-J1）

**例外条件**
- classKey が異なっても sMergeDomain が同一であれば domain-level 統合は発生しうる
- classKey の分離は class-level merge を防ぐものであり、
  domain-level merge は sMergePolicy で別途制御する

**関連フィールド**
`composition.classKey` / `composition.nodeKey` / `composition.sMergeDomain`

**保留事項**
Q-J1: derm 3系 classKey の剤形込み設計（→ OPEN_DESIGN_QUESTIONS.md）

---

## DP-03: 多剤合成フィールド条件付き必須原則
（Multi-Drug Composition Field Conditional Requirement）

**目的**
多剤合成・S 統合に関連する composition フィールドは、多剤合成対象 module のみ必須とし、
単剤・外用・局所薬 module には強制しない。

**適用範囲（条件付き必須フィールド）**

| フィールド | 必須条件 |
|---|---|
| `composition.canonicalSource` | 多剤合成対象 module（保留: Q-F4） |
| `composition.defaultSMergeLevel` | 多剤合成対象 module |
| `composition.domainPolicy` | 多剤合成対象 module |
| `composition.nodeIdentityPolicy` | 多剤合成対象 module |
| `composition.sMergePolicy` | 全 module 必須 |
| `composition.groupKeyRegistry` | 全 module 必須 |

**例外条件**
- 将来的に多剤合成対象になる可能性がある module は、設計確定後に追加する
- 現時点で合成対象外と判断された module（allergy_eye_drops / derm 3系）への強制は行わない

**採用理由**
不要なフィールドを全 module に強制すると保守コストが上がり、
意味のない値の維持が必要になる。
runtime が実際に参照するフィールドのみを必須とする最小構成の原則に従う。

**関連フィールド**
`composition.canonicalSource` / `composition.defaultSMergeLevel` /
`composition.domainPolicy` / `composition.nodeIdentityPolicy`

**current-generation policy（2026-09-22。上記 4 key に限る）**

本原則の本文・適用範囲の表・採用理由は historical design record として保持する。そのうえで、
**current の新規 module 生成では上記 4 key を生成しない。**

- **current の判定条件は未定義である。** 「多剤合成対象 module」が何を満たせば該当するのかを
  定義した記述は Repository に存在せず、`prompts/vNext/PN2-Drug-Header.md` と bridge にも
  当該 4 key の生成規則がない。family / route / domain / 配合剤かどうかで分岐させない
- **既存 canonical は preserve する。** 4 key を保持する module の値は削除・変更しない
- 本 policy は 4 key の future lifecycle を確定する判断ではない（Q-F4 は PENDING のまま）

**current observation（2026-09-22 実測）**
上記「採用理由」は *runtime が実際に参照するフィールドのみを必須とする* と述べているが、
当該 4 key の runtime consumer は現在 0 件である（`lib/**` / `app/**` / validator / search /
manifest / tests / scripts のいずれからも参照されていない）。すなわち採用理由の前提と current の
実測が一致していない。**これは本原則が誤りであったこと・廃止されたこと・解決済みであることを
意味しない。** 対象条件の定義は未解決であり、判断記録は `prompts/vNext/HANDOFF.md`
（Finding `JS-B scope drift`・OD-JSB-1〜11。本 Finding は OPEN）。

**保留事項**
Q-F4: composition.canonicalSource の必須化範囲（→ OPEN_DESIGN_QUESTIONS.md）

---

## DP-04: moduleVersion 二重管理原則（moduleVersion Dual Management Policy）

**目的**
bridge 原稿と canonical JSON で `moduleVersion` の扱いを明確に分離する。

**適用範囲**
全 module

**ルール**

| 場所 | 扱い | 理由 |
|---|---|---|
| bridge 原稿 | **定義しない（廃止済み）** | bridge は内容の正本。バージョン番号は bridge の責務ではない |
| canonical JSON | **保持する** | lifecycle / revision / 後方互換性管理のため |

**採用理由**
bridge 原稿にバージョンを持つと bridge と JSON の二重管理が発生し、
同期ズレのリスクが生じる。
バージョン管理は JSON レイヤーで完結させる。

**関連フィールド**
`moduleVersion`（JSON のみ）

---

## DP-05: heparinoid 剤形検索分離原則
（Heparinoid Formulation Search Separation Principle）

**目的**
heparinoid 系では、成分名共通トークンと剤形識別トークンを分離して管理し、
AND prefix match で組み合わせることで大量 alias 化を避ける。

**適用範囲**
`derm_heparinoid_*` 全剤形

**ルール**

| フィールド | 用途 | 例 |
|---|---|---|
| `drug.search.commonSearchTokens` | 成分名トークン（剤形横断） | `"へぱ"`, `"へぱりん"` |
| `drug.search.formulationSearchTokens` | 剤形識別トークン | `"なんこう"`, `"ろーしょん"` |
| `matchPolicy.allowMultiTokenAndMatch` | AND prefix match 有効化 | `true` |
| `matchPolicy.allowFormulationTokenMatch` | 剤形トークンマッチ有効化 | `true` |

大量 alias 化禁止: bridge 側での剤形分割検索を検索エンジンの AND match に委ねる。

**例外条件**
他薬効クラスの単一剤形 module には適用しない。
剤形が 1 種類しかない薬剤では `formulationSearchTokens` は不要。

**採用理由**
「へぱ 軟膏」「へぱりん ろー」のような分割検索に対応するため、
bridge 側で大量 alias を列挙するのではなく、検索エンジン側の AND prefix match に委ねた。
剤形追加時も `formulationSearchTokens` に 1 エントリ追加するだけで対応でき、保守性が高い。

**関連フィールド**
`drug.search.commonSearchTokens` / `drug.search.formulationSearchTokens` /
`drug.search.matchPolicy.allowMultiTokenAndMatch` /
`drug.search.matchPolicy.allowFormulationTokenMatch`

---

## DP-07: bridge SOT 原則（Bridge Single Source of Truth Principle）

**目的**
bridge 原稿と canonical JSON の役割を明確に分離し、
各レイヤーを適切な正本として扱う。

**適用範囲**
全 module

**役割の分離**

Bridge は内容の正本である。JSON は構造実装の正本である。両者は役割が異なる。

| レイヤー | 正本の対象 | 保持する内容 |
|---|---|---|
| Bridge 原稿 | **内容の正本** | 文言・シナリオ・人間可読の設計意図 |
| canonical JSON | **構造実装の正本** | runtime / UI / search / validation が参照する実装構造 |

Bridge は文言・シナリオ・人間可読の設計意図を保持し、
JSON は runtime / UI / search / validation が参照する実装構造を保持する。

**ルール**
- 文言修正: bridge 原稿で確認 → JSON へ反映
- 構造修正: bridge 原稿で設計 → JSON へ実装
- 新規フィールド: bridge 原稿に明示してから JSON へ追加
- JSON は bridge 原稿の実装であり、JSON から bridge を逆生成しない
- JSON の構造詳細（risks / ui / searchConfig 等）は JSON_STANDARD.md が正本

**採用理由**
新規チャット開始時に過去の会話履歴が失われるこのプロジェクトでは、
bridge 原稿を読めば設計意図を再現できる構造が必要。
JSON は機械処理向けであり人間可読性が低い。
bridge 原稿を SOT とすることで、人間が読んで理解できる設計ドキュメントとして機能する。

**関連フィールド**
`constitution.canonicalSource`（bridge 原稿内の宣言）

---

## DP-08: addons.orderPresets 最小構成原則
（addons.orderPresets Minimal Structure Principle）

**目的**
`addons.orderPresets` は bridge 原稿に明示がある場合のみ定義し、
未使用 module では `{}` を許容する。

**適用範囲**
全 module

**ルール**
- 未使用: `{}` を保持（キー自体は削除しない）
- preset キー: bridge 原稿に明示されている名称のみ使用
- 推測生成禁止: bridge 原稿に記載のない preset キーを追加しない
- 実運用で確定した ADDON 組み合わせを bridge 原稿に記載 → JSON に反映

**例外条件**
GLP-1 系のように実運用 preset が確定している module では複数 preset の定義を許容。

**採用理由**
preset は実運用で確定した ADDON の組み合わせを固定するもの。
未確定のままで preset を追加すると誤った SOAP 組み合わせが量産されるリスクがある。

**関連フィールド**
`addons.orderPresets`

---

## DP-09: 一般名検索到達性原則（Generic Name Search Reachability Principle）

**目的**
ユーザーが一般名（成分名）で検索した場合、その成分に属する全ブランドへ到達できるようにする。
この到達性は、当該一般名に対応する一般名製品・GE 製品が現在発売されているかどうかと**独立に**保持する。

**用語定義（先に読むこと）**

本原則が扱う「generic identity」は **brand-level generic identity**、すなわち
`brandCatalog[brand].genericName` と `brandCatalog[brand].displayGenericName` の 2 フィールドのみを指す。

**top-level の `drug.genericName` は本原則の対象外である。** 本 Repository における
`drug.genericName` は薬効**クラス**名（例: `"ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"`、
`"ヒスタミンH1受容体拮抗薬系抗アレルギー点眼薬"`）であり、有効成分の identity ではない。
両者は値空間も責務も異なるため、本原則の適用にあたって混同してはならない。
以下、本節で「generic identity」と書いた場合は常に brand-level generic identity
（`brandCatalog[*].genericName` / `brandCatalog[*].displayGenericName`）を意味する。

| 対象か | フィールド | 意味 |
|---|---|---|
| ❌ 対象外 | `drug.genericName`（top-level） | 薬効クラス名。有効成分 identity ではない |
| ✅ 対象 | `brandCatalog[brand].genericName` | 剤形非依存の有効成分 identity（DP-21 により塩類名を含まない） |
| ✅ 対象 | `brandCatalog[brand].displayGenericName` | 表示用一般名の SSOT。必要に応じ剤形修飾を含む |

**適用範囲**
複数 brand を持つ全 module（単剤・配合剤とも）。
**対応する一般名製品エントリが `brandCatalog` に存在しない場合（GE 未発売・GE 販売中止・
先発のみ収載）も含む。**

**方針**
- `brandCatalog[brand].displayGenericName` を検索解決に活用する。`lib/search.ts` の `resolveAllHighPrecisionBrands()` がクエリと各 brand の `displayGenericName`（正規化形）を照合し、一致した brand を検索候補として抽出する
- `genericKey` によるグルーピング判断（RULES.md §21）とは役割を分離する。`displayGenericName` はクエリとの一致判定のみに使い、「どの brand を束ねるか」の判断には使わない
- 配合剤（例: ソリクア＝インスリングラルギン／リキシセナチド）は、構成成分ごとの読みを個別に登録し、単剤側（例: ランタス）からも配合剤側（例: ソリクア）からも、どちらの成分名で検索しても到達できるようにする

**方針: Generic Identity Search Principle（2026-09-19 Owner Decision による明文化）**

本項は新原則の追加ではなく、DP-09 が当初から内包していた「generic reachability」の責務を
明文化したものである（corpus 実測: 一般名製品エントリを持たない 74 brand が既に本方式で運用されている）。

1. **brand-level generic identity（`brandCatalog[*].genericName` / `brandCatalog[*].displayGenericName`）の
   検索到達性は、対応する一般名製品・GE 製品の発売有無と独立に保持する。**
   GE 未発売・GE 販売中止・先発販売中止のいずれの局面でも、generic identity は薬剤 identity として
   検索可能でよい。日本の医薬品市場では一般名処方が実務として存在し、GE の発売・販売中止のたびに
   検索 identity を増減させる運用は保守コストが高く、かつ一般名処方に対応できない。
2. **generic reachability は module-level search aliases で表現する。**
   具体的には `drug.search.exactAliases` / `drug.search.nameAliases` / `drug.nameAliases`。
   `lib/search.ts` の module ゲート（`scoreEntry()`）のスコアリング対象に
   `displayGenericName` は含まれないため、module へ到達させるにはこれらの alias が必要である。
   これは **module への到達性**（reachability）についての規定であり、到達した後の
   brand 帰属（下記 4・配合剤条項）を代替するものではない。
3. **検索到達性を担保する目的で、実在しない一般名製品・GE 製品を `brandCatalog` へ作成しない。**
   `brandCatalog` は marketed product の正本であり、検索の都合で架空のエントリを追加してはならない。
4. **generic identity から current marketed product への解決は、既存の tier2
   （`resolveAllHighPrecisionBrands()` の priority 5/6・`displayGenericName` 照合）が担う。**
   新しい resolution 機構を追加しない。これは「その一般名製品が販売されている」ことを意味せず、
   drug identity から現在収載されている製品へ解決しているにすぎない。
5. **検索到達性を得る目的だけで、generic identity を brand-scoped alias へ複製しない。**
   単一成分の brand（`displayGenericName` が単一の有効成分を表すもの）について、
   `brandCatalog[brand].aliases` / `normalizedAliases` / `drug.aliasToBrand` へ generic identity を
   書き込まない（下記「不採用とした方針」および DP-18 の複製境界）。`aliasToBrand` のキー集合は
   全 brand の `normalizedAliases` の和集合でなければならない（RULES.md §10）ため、
   generic identity をここへ入れることは「その一般名は当該ブランドの商品別名である」という
   誤った意味を canonical へ固定することになる。
   単一成分 brand では上記 4 の tier2 が当該 brand を解決できるため、この複製は冗長でもある。

   **本規定の対象外（既存の 2 条項。いずれも新設の例外ではない）:**

   - **配合剤条項（上記「方針」3 点目）**: 配合剤等、brand-level generic identity が複数成分から
     構成され、tier2 の generic identity resolution のみでは個々の構成成分名から当該 brand へ
     解決できない場合は、DP-09 配合剤条項に従い、構成成分の読みを当該 brand の brand-scoped
     alias に保持してよい。`aliasToBrand` は必要に応じて既存の同期契約（RULES.md §10 / §23）に従う。
     これは「検索到達性のための複製」ではなく、**成分名から brand を解決する唯一の経路**であり、
     欠けると unresolved 候補（`denotation='module'` / `subject=null`）が生じる。
     （実装ノート: 現行の `resolveAllHighPrecisionBrands()` tier2 は `displayGenericName` 全体に対する
     完全一致／前方一致で判定するため、`"A/B"` 形式の第2成分名は一致しない。成分の分解は
     `splitGenericComponents()` / `GENERIC_COMPONENT_SEPARATORS` が担う。本条項の根拠は
     「個々の構成成分名から当該 brand へ解決できるか」という意味論であり、特定の定数や
     実装の詳細に依存して判断しない。）
   - **DP-18 の generic-labeled brand**: 一般名をそのまま brand 名として持つエントリ
     （例: `エピナスチン点眼液` / `トラニラスト点眼液`）の `aliases` は、**その brand 自身の
     identity alias** であって、branded product へ複製された generic reachability ではない。
     DP-18 はこの読みを当該エントリにのみ登録することを定めており、本規定はそれを禁じない。

   判定の指針: 「この読みは**その brand 自身を指しているか**」（= identity・許容）か、
   「generic reachability を branded product 側へ**複製したもの**か」（= 本規定が禁じるもの）かで区別する。
6. **対応する一般名製品エントリが `brandCatalog` に存在しない場合、剤形修飾を含むかな読み
   （例: 「あしたざのらすと**てんがん**」）を module-level alias として追加しない。**
   当該読みでは `displayGenericName` の前方一致が成立せず brand へ解決できないため、
   unresolved 候補（`resolution.denotation = 'module'` / `subject = null`）が発生し、
   SOAP 主語が空になる。剤形修飾かな読みは、一般名製品エントリが存在する場合にのみ
   **その entry 自身の `aliases`** として登録する（例: H1 点眼の「えぴなすちんてんがん」は
   `エピナスチン点眼液` エントリの alias であり、`アレジオン点眼液` の alias ではない）。
7. **marketed product の lifecycle と generic search identity の lifecycle は別責務として扱う。**
   GE 発売時は `brandCatalog` / `brandNames` へ製品を追加するだけでよく、generic alias は変更しない
   （追加された製品は tier2 経由で自動的に候補へ加わり、重複する generic header は既存の
   true-duplicate 抑制で消える）。GE 販売中止時は製品エントリのみを削除し、generic alias は残す。
   両者を同一作業として扱わない。

**不採用とした方針**
`brandCatalog[brand].aliases` へ一般名のフルストリングを brand ごとに複製する方式は、50〜300+ module 規模の量産局面で bridge / JSON 双方への複製作業が線形に増え保守負荷が高すぎるため不採用とした。複製漏れは実際に発見されており（無関係な brand が代表候補として誤表示される事例）、データ複製に依存しない現方針の採用理由となっている。
ここで不採用としたのは「**到達性を得る手段として一律に複製する**」方式である。上記「方針」3 点目の配合剤条項（成分名から brand を解決する唯一の経路である場合）と、DP-18 の generic-labeled brand 自身の identity alias は、この不採用方針の対象ではない（上記 5 の「本規定の対象外」を参照）。

「一般名では module へ到達するが特定 brand へは解決しない」方式（module 到達のみ）も不採用とする。
`deriveUnresolvedResolution()` は multi-brand module に対して `denotation='module'` / `subject=null` を返すため、
SOAP 主語が空の候補が生まれる。これは Q-S1 Tier2 として実際に発生した不具合であり、
`scripts/audit-generic-name-reachability.ts` はその再発防止のために存在する。

**採用理由**
`displayGenericName` は JS-A-drug（`docs/JSON_STANDARD.md`）で全 brand 必須のフィールドであり、bridge 記載時点で既に人間レビュー済みである。新たな alias データを追加生成せず、既存の正本データを検索にも活用することで、bridge への追記なしに全 module へ適用される。

**関連原則**
- DP-18（alias複製境界とown-name優先原則）— DP-09 は「一般名検索で **module へ到達できるか**」（reachability）を扱い、DP-18 は「到達した後に**どの brand へ帰属させるか**」と「alias をどこまで複製してよいか」を扱う。Generic Identity Search Principle は前者に属する
- DP-21（塩／水和物正規化）— `brandCatalog[brand].genericName` の正規化規則。本原則が扱う identity 値そのものの表記規則を定める

**関連フィールド**
`brandCatalog[brand].genericName` / `brandCatalog[brand].displayGenericName` / `genericKey`（RULES.md §21）/ `drug.search.exactAliases` / `drug.search.nameAliases` / `drug.nameAliases` / `lib/search.ts` の `resolveAllHighPrecisionBrands()`
（**`drug.genericName`（top-level）は薬効クラス名であり本原則の関連フィールドではない**）

**詳細経緯**
Tier 分類・残課題（cross-module 欠落・genericKey 命名不統一等）は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S1 を参照。
Generic Identity Search Principle（上記 1〜7）の明文化経緯は、ZEP-1 Design Review（2026-09-19 Owner Decision D-1〜D-7）による。
適用事例は `bridges/allergy_chemical_mediator_release_inhibitor_eye_drops.md` の Owner-approved amendment（ゼペリン点眼液／アシタザノラスト）、
corpus 先例は `dm_dpp4_oral`（トラゼンタ／リナグリプチン）・`dm_glp1ra_injection`（ビクトーザ／リラグルチド）を参照。

---

## DP-10: Addon 表示順原則（Addon Display Order Principle）

**目的**
Addon の表示順を、コード側の固定順ではなく bridge / canonical JSON に記載された順序そのものへ一本化する。

**適用範囲**
全 module

**背景**
従来、UI（`AddonPanel.tsx`）は `GROUP_ORDER` というコード側の固定配列でグループ表示順を決定しており、bridge の `P_ADDON` 記載順・canonical JSON の `addonsRef.P` 配列順とは独立していた。そのため「JSON の `addonsRef.P` を修正しても UI の表示順が変わらない」という、bridge / JSON / UI 三者不一致の不具合が発生した。

**ルール**
- bridge を唯一の正本とする
- bridge の `P_ADDON` 記載順を canonical JSON が保持する
- canonical JSON の `addonsRef.P` 配列順を UI がそのまま保持する
- コード側で表示順を補正・推測・優先順位付けしない（`GROUP_ORDER` のような固定配列を用いない）
- グループ見出し（服薬指導／シックデイ／副作用等）自体は維持するが、見出しの表示順は JSON 内で最初に登場したグループの順（Map挿入順）とする
- 順序もデータの一部とみなし、監査対象とする

**採用理由**
DP-07（bridge SOT 原則）の「データを正本とする」という思想を、Addon の表示順という運用面まで一貫させるための拡張。コード側の並び替え定義（`GROUP_ORDER`）を撤廃することで、新規診療領域（循環器・呼吸器・皮膚科・耳鼻科・眼科・泌尿器・漢方等）への拡張時にコード変更が不要になり、bridge / JSON の記載だけで表示順を完全に表現できる。

**運用ルール（bridge 執筆時）**
`P_ADDON` は表示したい順番で記載する。コード側では順番を補正しない（詳細は `prompts/RULES.md` §25）。

**関連フィールド**
`scenarios[].addonsRef.P` / `app/components/AddonPanel.tsx` / `scripts/audit-addon-bridge-chain.ts`

**関連原則**
DP-07（bridge SOT 原則）— 同じ「データが正本」という思想の適用範囲を表示順まで拡張したもの

---

## DP-11: 適応横断検索到達性原則（Cross-Indication Search Reachability Principle）

**目的**
同一成分・同一ブランドが、適応領域（`categoryPath[0]`）の異なる複数モジュールに重複して存在する場合、検索結果からモジュール横断 dedup で一方を消さず、適応ラベルで区別しながら双方に到達できるようにする。

**適用範囲**
同一 `genericKey`（RULES.md §21）が複数モジュールにまたがって存在する module 群のうち、`matchPolicy.crossModuleIndicationLabel` を opt-in した module のみ。

**基本ルール**
- 同一成分でも適応領域が異なる候補は、モジュール横断 dedup の対象外とする（1 件に集約しない）
- 適応ラベル（例:「糖尿病」「心・腎」「腎」）を候補の `uiLabel` に付与し、ユーザーがモジュールを区別できるようにする
- 直接一致（クエリと直接一致する型 — ブランド名検索ならブランド、一般名検索なら一般名）を優先して先に表示し、その後に対応する別名候補（ブランド名検索なら一般名、一般名検索ならブランド名）を表示する
- 対応するブランド名⇔一般名の相互到達性を失わせない。一方の型で検索した結果、他方の型の候補が消えることがあってはならない
- 各適応ペア内の順序は既存のモジュール登録順（`data/modules/index.ts` の登録順、例: 糖尿病 → 心・腎／腎）を維持し、新たな優先順位ロジックを追加しない
- `genericKey` が単一モジュールにのみ存在するブランド・成分には一切影響させない（適応ラベル化・dedup 挙動の変更を波及させない）
- 既に `genericKey` 横断集約が行われている薬剤（例: 同一成分を複数モジュールで共有するインスリン製剤等）の挙動を、本原則の適用によって不用意に変更しない

**例外条件**
- `matchPolicy.crossModuleIndicationLabel` を opt-in していない module には適用しない
- 同一 `genericKey` が単一 module にのみ存在する場合は適用しない（適応ラベル化は発生せず、DP-09 の従来挙動のまま）

**プロセス連動ルール**
`matchPolicy` フィールドの追加・挙動変更に伴う**同一作業内の更新対象**、および**検索ロジック変更時の確認範囲**は、`prompts/RULES.md` §26 を正本とする。本節では重複して定義しない。

**採用理由**
糖尿病領域で SGLT2 阻害薬（`dm_sglt2_oral` = 糖尿病適応 / `cardiorenal_sglt2_oral` = 心不全・慢性腎臓病適応）が同一ブランド・同一一般名を持つケースが発生した。適応ラベル表示のみを狙った初期実装が、ブランド名検索⇔一般名検索の相互到達性を壊す回帰を引き起こしたため、再発防止として原則化する。同種の複数適応薬剤は今後他の薬効クラス（循環器・腎臓連携薬等）でも発生しうる。

**関連フィールド**
`matchPolicy.crossModuleIndicationLabel` / `brandCatalog[brand].genericKey` / `brandCatalog[brand].handlingTags`（`heart_failure_supported` / `ckd_supported`）/ `categoryPath[0]`

**関連原則**
DP-09（一般名検索到達性原則）— 「検索到達性を失わせない」という思想を、単一適応内の到達性から複数適応にまたがる到達性へ拡張したもの

**詳細経緯**
実装の技術的詳細（tier 分類・dedup キー設計）は `lib/search.ts` の `resolveAllHighPrecisionBrands()` / `crossModuleIndicationLabel` 関連分岐のコメントを参照。本原則制定時点で設計保留事項はない。

---

## DP-12: 薬局実務に基づく評価基準原則（Practical Pharmacy Evaluation Principles）

**目的**
新規チャット・新しい生成AIがSOAPエンジンをRuntime評価・品質評価する際に、薬局実務の実際の利用パターンを踏まえた優先順位で評価できるようにする。技術的に確認可能な事象と、実務上優先すべき評価軸を区別する。

**適用範囲**
Runtime確認・実機横断確認・品質評価全般（`docs/IMPLEMENTATION_CHECKLIST.md` Runtime / 実機横断確認、多剤合成関連の評価すべて）

**コンプライアンス評価について**

コンプライアンスシナリオ（`cp_good` / `cp_poor_*` 等）は、薬剤ごとの効果判定ではなく、**患者全体の服薬行動を薬剤へ紐付けて記録する目的**で使用する。

薬局実務では、
- 朝の薬をまとめて飲み忘れる
- 夕食後薬をまとめて飲み忘れる
- 全体として飲めている

など、**服薬タイミング単位**で評価することが多く、薬剤ごとに異なるコンプライアンス評価となるケースは比較的少ない。

そのため、複数薬剤で同一コンプライアンスシナリオを選択した際にA/P欄の定型文が薬剤数だけ逐語的に重複する事象は、技術的には確認事項ではあるが、**SOAPエンジンの主要ユースケースではない**。

**SOAPエンジンが重視する多剤合成**

本システムが目指す多剤合成は、「同一シナリオを複数薬剤へ適用すること」ではなく、

**継続薬の状態確認 ＋ 今回開始・追加・変更された薬剤**

を一つのSOAPへ自然に統合することである。

代表的ユースケース:
- 糖尿病薬 CP良好 ＋ アレルギー点眼 初回
- 糖尿病薬 効果確認 ＋ 去痰薬 初回
- 高血圧薬 継続 ＋ 抗菌薬 初回

**評価時の優先順位**

Runtime評価・品質評価を行う際は、この実務上の利用方法（継続薬＋新規/変更薬の異なるシナリオ種別の組み合わせ）を優先して評価する。同一シナリオを複数薬剤へ適用するケース（例: 複数薬剤とも `cp_good`）は、発生しうる組み合わせとして技術的に確認する価値はあるが、主要ユースケースの評価より優先度を上げない。

**関連フィールド**
`scenarios[].scenarioType`（`treatment_start` / `adherence` 等の種別混在パターン）/ `mergePolicy.A` / `mergePolicy.P`

**関連原則**
DP-03（多剤合成フィールド条件付き必須原則）— composition フィールドの構造要件を定めるのに対し、DP-12 は「何を優先して評価するか」という評価軸を定める

**Owner Decision（2026-09、OD-COMPLIANCE-REALIZATION-1）: コンプライアンス評価単位と Rapid sentence realization への含意**

コンプライアンス（服薬アドヒアランス）は原則として個別薬剤ではなく、処方全体・服薬行動全体を評価する。複数薬剤をまとめて確認し、すべて問題なければコンプライアンス良好、一つでも問題があればコンプライアンス不良と分岐したうえで、「朝起きられず服用できない」「夜の飲酒で忘れる」等の具体的理由へさらに分岐する（本節冒頭のコンプライアンス評価についての具体化）。

この評価単位は、Rapid（DP-19）が S先頭文として生成する表現にも影響する。コンプライアンス系シナリオの Rapid 表現では、薬剤名を必要以上に固定せず regimen-level（処方全体を主語とする）表現を優先してよい。一方、副作用確認のように特定薬剤との関連を評価するシナリオでは、drug-specific な Rapid 表現を引き続き許容する。

Rapid の semantic taxonomy（前回との関係性の種類）自体は評価単位によらず共通としてよいが、それを文としてどう実現するか（sentence realization）は scenario の評価単位に応じて異なり得る。この realization の具体的な仕組みは `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1（Reference Model・検証中）で扱い、本節では評価単位の違いという原則のみを確定させる。

---

## DP-13: 段階的実装原則（Staged Implementation Principle）

**目的**
実装予定であるが意図的に Runtime へ接続していない設計資産を、未完成・設計負債と誤認させないための原則を定める。

**適用範囲**
このプロジェクト全体（設計資産・schema フィールド・UI 経路を含む）

**ルール**
- Runtime 未接続は未完成を意味しない
- Phase 1 はアプリとしての完成を最優先とし、大型機能は最終形を見据えて JSON 構造・schema のみ先行確保し、Runtime には意図的に接続しない場合がある
- 「まだ実装しないと決めたこと」も設計決定であり、記録対象である
- 「Runtime で未使用だから不要」と判断してはならない
- 意図的に未接続である資産は、その旨を判別可能な形で記録しなければならない

**採用理由**
Runtime 未接続の資産が設計負債と誤認され、監査 1 サイクル分のコストが発生した実例がある。一方 NLP 経路は `docs/feature-glossary.md` に「UI 未接続」と記載されていたため一度も誤判定されなかった。差は実装状態ではなく記録の有無であった。

**関連原則**
- DP-00（強くてニューゲーム原則）— 決定を記録するという思想を「実装しない決定」まで拡張したもの
- 運営規則（設計資産ライフサイクル 5 状態 / Legacy 完了条件 L1〜L7 / Future Expansion 成立条件 F1〜F5 / 品質条件 Q1 / 体系移行完了条件 M1〜M8）は `docs/DEVELOPMENT_STANDARD.md` §10 を参照

---

## DP-15: 明示的不確定性の原則（Explicit Uncertainty Principle）

**目的**
生成 AI が不確かな情報に直面したとき、推測で埋めて確定事項として下流工程へ流すことを防ぐ。不確定性を「消す」のではなく「公告する」ことを工程の標準動作とする。

**適用範囲**
このプロジェクトの全工程（vNext PN1〜PN8、bridge 作成、監査、レビューを含む）。特定の工程体系に依存しない。

**ルール**

- **AI は「なんとかする」傾向がある。** 不確かな情報に直面したとき、推測・補完・最良の推定で埋めようとする。この傾向を前提として工程を設計する
- **明示的な不確定は、暗黙の確定よりも常に安全である。** 判断できない項目を「わからない」と記録することは、もっともらしい値で埋めることに常に優先する
- **CHECK は「宿題リスト」ではなく「不確定の公告」である。** CHECK 項目が存在する場合、後続工程はその項目について独自の推測で進まず、人間の判断を待つ
- 不確定な構造判断が確定済みとして基盤に組み込まれると、後続工程はそれを「検証済み」と信じて動作する。問題が顕在化するのは、しばしば最終検証や実機確認の段階になってからである
- 解決した不確定項目は「解決済み」と明示する。明示しない場合は「未解決のまま後続工程へ引き継ぐ」という意味になる

**採用理由**

本原則は旧体系 Bootstrap 工程（`docs/BOOTSTRAP_STANDARD.md` BS-05 / BS-09 / BS-10）で確立された。記述は旧体系固有の仕組み（CHECK_ITEMS / Prohibited Inference）の説明として書かれていたが、**洞察そのものは工程体系に依存しない**。旧体系を Legacy 化するにあたり、体系非依存の部分のみを Current Standard へ移管した。

移管対象を BS-05 / BS-09 / BS-10 の 3 節に限定した根拠: `docs/P1_STANDARD.md` 〜 `docs/P5_STANDARD.md` は「工程 X がなぜ独立した工程なのか」という旧パイプラインの分解の正当化が中心であり、異なる分解（PN1〜PN8）を採る vNext へは転用できないため、抽出対象から除外した。

**関連原則**

- DP-00（強くてニューゲーム原則）— 「判断を保留した場合は何が確定すれば判断できるかを明記する」というルール 3 の思想的基盤にあたる
- DP-13（段階的実装原則）— 「まだ実装しないと決めたことも決定である」と「わからないことを明示する」は、いずれも「記録されない判断は存在しないのと同じ」という同一の思想の別側面である

**運用上の分類定義**

ERROR / PENDING / CHECK の具体的な分類基準・停止条件は `prompts/RULES.md` §3 を参照。AUTORUN モードにおける CHECK の扱いは `prompts/vNext/AUTORUN.md` の MUST_STOP 条件を参照。

**出典**

`docs/BOOTSTRAP_STANDARD.md` BS-05（STOP 条件の思想）/ BS-09（CHECK_ITEMS の考え方）/ BS-10（Prohibited Inference）からの移管。

---

## DP-16: 実物評価前の仕様固定回避の原則（Deferred Specification Principle）

**目的**
実物を評価しなければ品質基準を確定できない領域において、早期の仕様確定が誤った基準を恒久化することを防ぐ。

**適用範囲**
このプロジェクト全体。特に、出力品質の良否を事前に定義できない機能。

**ルール**

- **実物を評価しなければ品質基準を確定できない領域では、実物評価によって判断基準が得られるまで最終仕様を固定しない**
- **最終仕様を保留している期間でも、将来の変更コストを抑えるために必要な構造・検証経路・不確定性の記録は先行して整備してよい**
- 「まだ決めない」は未整備ではなく設計判断である。決めない理由と決める時期を記録する

**関連原則**

- DP-13（段階的実装原則）— 未接続資産の扱い方を定める。本原則は「なぜ最終形をまだ決めないか」という確定行為のタイミングを定めるものであり、対象が異なる
- DP-15（明示的不確定性の原則）— 不確定性を推測で埋めず公告する姿勢を定める。本原則は不確定性を保持する判断そのものの根拠を与える

**適用事例**

適用事例と詳細は `docs/PERSONA_PROJECT_PRINCIPLE.md` を正本とする。本原則へ個別プロジェクトの時間軸・工程・判断条件を記載しない。

---

## DP-17: Fact／Decision／History 分類原則
（Fact / Decision / History Classification Principle）

**目的**
実装から機械的に取得できる値（Fact）を散文へ複製して保持することで生じる
実態との乖離（drift）を防ぐため、Repository 内の情報を Fact／Decision／History
の3種に分類し、それぞれの権威（正本）を明確にする。

**適用範囲**
このプロジェクト全体（bridge、canonical JSON、prompts/ 配下、docs/ 配下を含む
Repository 内の全ドキュメント）

**分類と権威**

| 種別 | 定義 | 権威（正本） |
|---|---|---|
| Fact | 実装から機械的に取得できる値（件数・行番号・現在の登録状態等） | 実装そのもの、および再実行可能なコマンド |
| Decision | Owner 判断を要する設計上の選択とその理由 | Owner 判断、および各正本文書 |
| History | 過去に何が起きたか、いつ・どのような状態であったか、その実施履歴・時点記録 | git history、および時点付き実行記録 |

**Decision / Fact の境界判定基準**
ある記述が Fact か Decision かを判定する基準は、「実装を見れば機械的に取得できるか」
である。実装を参照すれば決定的に導出できる値は Fact として扱い、散文への複製を
避け、実装または再実行可能なコマンドへの参照に置き換える。Owner 判断でなければ
確定できない事項は Decision として扱う。

**MEMORY の位置づけ**
MEMORY は Repository の正本ではなく、補助情報として扱う。MEMORY と Repository
正本が矛盾する場合は、常に Repository 正本を優先する。MEMORY 内の矛盾記述は
放置しない。

**PROJECT_CONTEXT の扱い**
`prompts/PROJECT_CONTEXT.md` は、実装から機械的に取得できる Fact や、
現在地の再現に不要な完了履歴を重複保持せず、Current Decision（現在有効な
判断・現在地の記述）を中心に保持する。本原則が定めるのはこの位置づけの
みであり、`PROJECT_CONTEXT.md` からどの記述を Fact／Decision／History の
いずれに分類し、実際に何を除去・ポインタ化するかは、本原則を適用する
別 Unit の責務とする。

**運用原則（二面モデル）**
情報分類の実効性を保つため、Unit 完了時の書き手側更新と、新規セッション
起動時の読み手側検証の両面を運用原則とする。書き手側更新とは、正本文書
への反映だけでなく、Current Focus・現在フェーズ・次に行う作業・まだ実施
しない事項など、Unit 完了によって実態が変わった「現在地」を表す記述を、
同一作業内で更新することを含む。読み手側検証とは、新規セッション起動時
に、実装から再取得できる値と記載内容を突合することをいう。具体的な
更新先・検証項目・不整合時の挙動は、本原則の適用対象ごとに後続の実装
作業で定める。

**採用理由**
`prompts/vNext/HANDOFF.md` や `prompts/PROJECT_CONTEXT.md` 等で、機械取得
可能な Fact を散文へ複製したことによる drift が発生した実例がある。正本
ポインタ方式を採った箇所（例: `HANDOFF.md` §6 の ModuleValidator WARNING
が `docs/VALIDATOR_STANDARD.md` Appendix B を正本として参照する構成）
では同種の drift が発生していない。MEMORY の権威関係は
`docs/PERSONA_PROJECT_APPENDIX.md` に個別事例として既に存在しており、
本原則はこれをプロジェクト全体へ一般化する。

**関連原則**
- DP-00（強くてニューゲーム原則）— 「なぜ決めたか」を記録する思想の基盤。
  DP-00 は記録行為そのものを扱い、本原則はその記録対象を情報種別ごとに
  権威づける
- DP-07（bridge SOT 原則）— bridge と JSON という2レイヤー間の正本分離を
  定める。本原則はより一般的な Fact／Decision／History という情報種別の
  分類であり、対象レイヤーを限定しない
- DP-13（段階的実装原則）— Runtime 未接続資産の記録義務を定める。本原則
  はその記録された情報が Fact／Decision／History のいずれかを分類する
  上位の枠組みを与える
- DP-15（明示的不確定性の原則）— 不確定性を推測で埋めず公告する姿勢を
  定める。本原則は「わかっていること」の分類・権威づけを扱い、「わかって
  いないこと」の扱いを定める DP-15 とは対象が異なる
- DP-16（実物評価前の仕様固定回避の原則）— 最終仕様を確定するタイミング
  を扱う。本原則は確定済み情報の権威づけを扱い、確定のタイミングそのもの
  には関与しない
- `docs/DEVELOPMENT_STANDARD.md` §11（変更契機）— 索引・台帳の乖離を防ぐ
  ための「起点・更新対象」という仕組みを定める。本原則は情報の種別と権威
  を定める分類基準であり、§11 とは軸が異なる（§11 は「いつ追随するか」、
  本原則は「何が正本か」）

---

## DP-18: alias複製境界とown-name優先原則（Alias Duplication Boundary and Own-Name Priority Principle）

**目的**
一般名のフルストリング読み（salt-name reading）を含む alias について、どの brand へ登録してよいか、どの範囲まで家族内で複製してよいかの境界を定める。同一 family 内で own-name（自分自身の名称）にクエリが一致する候補を、他 brand 経由の一致より優先して表示する。

**適用範囲**
同一 module 内に複数 brand を持ち、そのうち特定 brand が一般名そのものを peer brand として `brandCatalog` に登録している場合（例: メトホルミン塩酸塩単剤と、同薬効クラス系列に属する配合剤）。

**方針**
- `drug.search.matchPolicy.preferOwnNameMatchOverGenericMatch`: module の direct 候補内で、自身の名称／alias に一致した brand（tier1）を、`brandCatalog[].genericName` 経由でのみ一致した brand（tier2）より優先して並べる。この tier 優先は direct（ブランド名検索）経路だけでなく genericMode（成分名検索）経路のグルーピング内順序にも一貫して適用する
- `drug.search.matchPolicy.suppressRedundantGenericHeaderOnDirectMatch`: 同一成分の direct／genericMode 候補が既に存在する場合、独立した salt-name header 候補を出さない
- salt-name full reading（例: 一般名の塩類名まで含めた読み）は、**generic-labeled brand（一般名をそのまま brand 名として持つエントリ）自身の `brandCatalog[brand].aliases` にのみ登録する**。同一 family 内の他 brand（配合剤等）へ機械的に複製しない
- **tier2 の一致面としてのペア一般名 alias 参照（own-name優先を維持したまま候補消失を防ぐ拡張）**: 一般名の完全な読み（例:「てんがん」等の剤形かな読みを含む full reading）は、上記の複製禁止により先発品側の own alias（tier1）には存在しない。この場合でも、`preferOwnNameMatchOverGenericMatch` が有効かつ両エントリが同一グルーピングキー（`genericKey` 未設定時は `displayGenericName` へフォールバック）を共有するペアに限り、先発品は**ペアの一般名候補が保持する alias**を tier2 の一致面として参照してよい。これらの alias の所有権は一般名候補側に残ったままであり、先発品側の own alias（tier1）へは一切複製されない。同一グルーピングキーであることの確認は、metformin/pioglitazone のように異なる `genericKey` を持つペア（own-name優先度が既に成立している）へこの拡張が誤って波及しないための必須ゲートである
- **direct-over-genericMode 促進の例外（関係スコープ化）**: 単一トークンのクエリが、別モジュールの一般名識別（`brandCatalogGenericMap`——`brandCatalog[brand].displayGenericName` 由来——の完全一致、またはその前方一致）に該当する場合でも、それだけでは `preferOwnNameMatchOverGenericMatch` が有効な自モジュールの促進（`[direct]` を `[genericMode]` より先に処理する既存の促進契約）を無条件には抑制しない。抑制するのは、その別モジュールが自モジュールと**同一の有効成分**（`brandCatalogIngredientMap`——`brandCatalog[brand].genericName` 由来。`displayGenericName` と異なり剤形の修飾を含まない、剤形非依存の成分識別）を扱っている場合に限る。これにより、剤形かな読みの「完全な読み」に限らず前方一致（例:「おろぱた」＝「オロパタジン」の前方一致）でも姉妹剤形モジュール間の表示順を正しく保ちつつ、有効成分を共有しない無関係な別モジュールが偶然クエリの前方一致を満たすだけで促進を妨げる、という誤ったブロックを防ぐ（例:「め」に前方一致する「メキタジン」＝H1内服のゼスランは、メトホルミン系モジュールと有効成分を共有しないため、メトホルミンの単剤優先促進を妨げない）。剤形を問わない bare な一般名クエリ（例:「エピナスチン」）は促進未適用時の既存の剤形間表示順を保ったまま、剤形intentを含むクエリ（例:「エピナスチン点眼」）でのみ該当剤形の module が正しく優先される

**不採用とした方針**
salt-name full reading を family 内の全 brand の `aliases` へ複製する方式は、複製そのものが「どの brand が正しい帰属先か」という意味を薄め、複数配合剤が同一 salt-name reading に反応してしまう曖昧さを生むため採用しない。

**採用理由**
`drug.search.exactAliases`（module 単位）が peer brand としての一般名を持つ設計では、salt-name reading をそのまま `brandNames` 宣言順にランキングさせると、無関係な配合剤や医学的に非対称な候補が先頭に来る回帰が生じた。own-name 一致を優先し、salt-name の複製範囲を単一 brand に限定することで、この回帰を再発させずに検索到達性を確保する。

**DP-09との責務境界**
- DP-09: 一般名検索によって **module へ到達できるか**（reachability）を扱う
- DP-18: module へ到達した**後**に、**どの brand へ帰属させるか**（own-name priority）と、**alias をどこまで複製してよいか**（複製境界）を扱う

両者は同じ検索パイプラインの隣接する段階を扱うが、責務は異なり、一方が他方を代替しない。

**関連フィールド**
`drug.search.matchPolicy.preferOwnNameMatchOverGenericMatch` / `drug.search.matchPolicy.suppressRedundantGenericHeaderOnDirectMatch` / `brandCatalog[brand].aliases`

**関連原則**
DP-09（一般名検索到達性原則）— 上記「DP-09との責務境界」参照

**詳細経緯**
cross-module tie-break の具体的挙動（`resolveSortLabel()` の実装詳細等、実装から機械的に確認できる事実）は本原則へ複製しない。個別 module の適用状況・残存する未解決ケースは `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 を参照。

**Owner Decision（2026-09、OD-DRUG-PREFIX-BOUNDARY-1）: bare 薬剤名クエリの length band 原則**

bare な薬剤名クエリ（単一トークンであり、剤形・部位等の secondary clinical token を伴わないもの。例:「もん」）について、正規化文字数によって厳格性の水準を分ける。

- **3文字以上**: 主要な実務検索帯（primary practical search band）である。検索順序・ファミリー解決（generic／originator 関係）・曖昧性安全性は厳格な UX 要件として扱う
- **1〜2文字**: best-effort 検索である。詳細な順位の安定性は保証しない
- 1〜2文字クエリで目的の薬剤が見つからない場合、3文字以上の入力を促すことは許容される

本原則が扱うのは bare な薬剤名クエリの長さ帯のみである。剤形・部位等の secondary clinical token を伴うクエリ（例:「あれじ てん」の第2トークン「てん」）の挙動は本原則の対象外であり、独立した未解決アーキテクチャ課題として扱う（`docs/OPEN_DESIGN_QUESTIONS.md` を参照）。第2トークン以降は `lib/search.ts` の `scoreSecondaryToken()` が評価し、`gateFloor`／`strongQueryBase`（下記）は `tokens.length === 1` を前提とするため、そもそも判定対象にならない。

**G5（2026-09）: 意味的ファミリーゲート gateFloor の結合原則**

`strongSingleIngredientQuery`（Search Family Phase 2-A の発動条件。用語対応は DP-20「適用しないこと」節の 2026-09 追記を参照）の活性化フロアは次のとおり結合されている（`lib/search.ts` の `gateFloor`）。

- 単一トークンかつ正規化長 3 文字以上のクエリに限り floor=4（alias 前方一致以上。完全一致は score 5）まで緩和する。G5 の主眼はこの非完全一致の 3+ 文字プレフィックス（例:「あれじ」「したぐ」「リナグリ」）にゲートを開くことにあり、floor=4 を「完全一致以上」と読むと G5 の意図そのものを取り違える
- 3文字未満のクエリは floor=5（alias 完全一致以上）を維持する。既存の高精度 2 文字 `nameAliases`（あぴ／おぜ／せま／とる／とれ／ばい／ひと／びく／ふぃ／らん／りき／るむ／りべ／れべ の14件）が持つ完全一致特権を守るためである（`scoreEntry()` の `aliasTokens` 経由で score 5 に到達する。2026-09 の `prefixAliases` 撤去以前は同じ 14 件が `prefixAliases` にも重複記載されていたが、runtime が参照していたのは一貫して `nameAliases` 側である）
- 活性化フロア（`strongQueryBase`）と曖昧性走査フロア（`seenGateModules` ループ）は同一の `gateFloor` を共有しなければならない。曖昧性走査だけを緩めると、本来ブロックすべき多成分エイリアスを見逃す

回帰は `tests/searchG5PrefixGate.test.ts` が合成 module により構造的に固定する。Owner-rejected literal 述語（`tokens.length===1 && tokens[0].length>=3 && score>=4`。3文字未満クエリを長さのみで無条件ゲート不成立にする）は、当時の全既存テストをコーパス差分ゼロで通過しており、出力ベースの回帰テストでは検出不能な盲点だった。

**曖昧性ガード（MULTI_INGREDIENT_STRONG_ALIAS）: 単一有効成分への一意解決**

意味的ファミリー挙動（F1／F2／D1／D2／D3）は、`gateFloor` 以上のスコアで一致した alias が**単一の有効成分**（単剤の `brandCatalogIngredientMap` 由来。配合剤は計数対象外）へ一意に解決する場合にのみ発動する。複数の単剤有効成分へ同時に強一致する alias（例: インスリンの「のぼ」→ インスリンヒト／イソフェンインスリン／インスリンアスパルト）は、クエリが1つの成分を一意に指していないため発動しない。実装は `lib/search.ts` の `strongSingleAgentIngredients` / `strongSingleIngredientQuery`。唯一の Owner 承認済み非活性化事例は「のぼり」（候補の行集合・モジュール集合・SOAP主語集合は完全に保持され、並び順のみが変化する。`tests/searchG5PrefixGate.test.ts` G5-D で固定）。

---

## DP-19: Rapid 入力支援境界原則（Rapid Input-Assist Boundary Principle）

**目的**
Rapid が「代表的な薬局実務パターンを簡便かつ高速に SOAP へ反映する入力支援」であることを明示し、理論上あり得るすべての処方変更パターンを網羅的にモデル化する方向へ設計が拡大することを防ぐ。

**適用範囲**
Rapid（S先頭文ボタン / ADDON ボタン等の右パネル簡易操作）の product 設計判断。用語としての Rapid の定義は `docs/feature-glossary.md` を正本とし、本原則はその**設計方針**のみを扱う。

**方針**

- **Rapid は入力支援である。** 代表的な実務パターンを高速に反映することを目的とし、網羅的な処方変更モデルの実現を目的としない
- **使用するかどうかは薬剤師が判断する。** 生成された表現が当該症例に適さない場合、薬剤師は Rapid を使用しない、または生成後の SOAP 本文を編集して対応できる
- **Rapid は薬剤師の臨床判断を代替するものとして設計してはならない**
- **処方変更の調整軸（濃度 / 投与回数 / 1回量 等）を Rapid が個別に構造化して表現することは要件ではない。** 実務上十分であれば、「前回増えて」「前回減って」に相当する抽象化された方向表現を許容する。具体的な変更内容を完全に S へ再現すること自体を Rapid の要件としない

**現時点の非要件（Current Non-Requirements）**

次の項目は、現時点では実装しないと決定している。

- multi-axis adjustment model
- 濃度 × 投与回数 の state model
- 全処方変更パターンの自動分類
- edge case 専用の Rapid UI
- edge case 専用の canonical schema 拡張

**edge case を根拠に複雑化しない**

理論上の edge case が存在することのみを根拠として、上記の非要件を先行実装しない。例えば点眼薬では濃度と点眼回数の複数軸が治療強度に関係し得るが、その可能性だけを理由に multi-axis model を導入しない。単純な「増えた／減った」表現を適切と判断できない症例では、薬剤師が Rapid を使わないか本文を編集すればよい。

**実務観測に基づく例外方針（Evidence-Driven Exception Policy）**

一周実装・実運用したうえで、特定の薬剤または薬剤群について Rapid の抽象化が**反復して**実務上の不便を生じることが観測された場合にのみ、その薬剤・薬剤群への個別対応を検討する。

これは「将来対応できない」という決定ではなく、「必要性が実務で観測されるまで実装しない」という決定である。

**本原則から導出してはならないこと**

- 本原則は「すべての薬剤で同じ文言を使用する」ことを意味しない
- 既存の drug-specific な表現（`display.adjustmentExpression` 等）を削除・一般化する決定ではない
- bridge / canonical に明示された表現は DP-07（bridge SOT 原則）に従い、引き続き bridge を正本として保持する。本原則は Rapid が調整軸を網羅的にモデル化する必要はないという product 設計方針であり、既存データの normalization とは別問題である

**関連原則**
- DP-07（bridge SOT 原則）— 既存の drug-specific 表現の帰属先。本原則はこれを変更しない
- DP-12（薬局実務に基づく評価基準原則）— 実務上の利用パターンを評価の優先軸に置く姿勢。本原則は同じ姿勢を Rapid の機能範囲の決定へ適用したもの
- DP-13（段階的実装原則）— 「まだ実装しないと決めたこと」も設計決定であり記録対象であるという原則。本節の非要件一覧はその記録である
- DP-16（実物評価前の仕様固定回避の原則）— 実物評価によって判断基準が得られるまで最終仕様を固定しない。本原則の例外方針はこれを Rapid の調整軸へ適用したもの

**Owner Decision（2026-09、OD-RAPID-SCOPE-1）: 薬歴確認前提と「処方整理」の意味境界**

Rapid は、薬剤師が前回薬歴・電子薬歴上の処方差分・過去の処方歴を通常どおり確認することを前提とする機能である。したがって、Rapid にしか存在しない詳細情報を新たに増やしてはならない。

- 増量が回数変更によるものか濃度変更によるものか、といった処方変更の内訳は、前回処方・薬歴側に存在する情報であり、Rapid が推測・再構築するものではない（本原則冒頭の「調整軸を個別に構造化して表現することは要件ではない」の具体化）
- Rapid が将来「前回の処方整理」に相当する概念を持つ場合、その意味は「現在表示されている薬剤をこれから中止する」ことではない。想定する意味は次の通りである:

  ```
  3剤処方
    ↓
  前回2剤へ処方整理
    ↓
  今回、その後の状態を評価する
  ```

  すなわち「前回の処方整理後の、現在時点での評価」を表す。継続薬（現在表示中の薬剤）の状態確認であり、中止操作ではない
- Rapid は削除された薬剤名・削除薬リストを推測・創作してはならない。保持してよいのは「前回、処方整理があった」という意味情報のみであり、具体的にどの薬剤が削除されたかを新たに構造化して保持する必要はない（Repository にその情報の元データが存在しないため）

この意味境界は、Rapid が処方変更の内訳を再現する機能ではないという本原則の適用対象を明確化するものであり、具体的な transition taxonomy（何種類の操作をボタンとして持つか）を確定させる決定ではない。taxonomy の具体形は `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1（Reference Model・検証中）を参照。

---

## DP-20: 配合剤成分展開による候補集合対称性原則（Combination Component Expansion Symmetry Principle）

**目的**
単剤の一般名／ブランド名のいずれで検索しても、その有効成分を含む配合剤の候補へ対称的に到達できるようにする。表示順（ranking）は対象外とする。

**適用範囲**
`brandCatalog[brand].displayGenericName` が OD-2 の区切り文字（`/` `／` `・`）で複数成分に分解できる配合剤 brand を持つ全 module。

**背景**
一般名クエリ（例:「リナグリプチン」）は配合剤モジュール自身の `nameAliases` 経由で配合剤（トラディアンス）へ既に到達できていたが、対になる先発品ブランドクエリ（例:「トラゼンタ」）からは到達できなかった（候補集合の非対称性。実機 build `d42efbe` で確認）。

**方針**
- 展開元は、そのクエリで**単剤**（`displayGenericName` が区切りを含まない）として解決した候補の有効成分に限定する。配合剤候補自身は展開の起点にしない（再帰防止）
- 追加候補は既存の `pushCandidate` dedup（`moduleId:brand`）へそのまま合流させる。展開専用の第二の merge/dedup 機構を作らない
- **追加候補は既存4バケツ（genericMode / direct / sibling / genericHeader）の処理をすべて終えたあとの残り枠にのみ追加する（`lowConfidence` バケツを使う）。** genericMode 等の先頭バケツへ追加すると、新規追加候補が既存の強い直接一致より前に表示されてしまい、ranking 凍結の要件に反する（2026-09 実装時に `ぐらくてぃぶ` 等で実際に検出・修正）
- 成分分解は OD-2（`lib/search.ts` の `GENERIC_COMPONENT_SEPARATORS` / `splitGenericComponents()`、`scripts/audit-generic-name-reachability.ts` と単一定義を共有）にのみ依拠する。分解規則をここで独自に拡張しない

**適用しないこと（Phase 2 として明示的に凍結）**
- 配合剤候補の表示順・挿入位置の最適化
- 単剤側・配合剤側どちらを先に見せるかの並び替え
- 家族単位（brand family）での完全な集合対称性（`suppressRedundantGenericHeaderOnDirectMatch` 等、本原則が触れないフラグ群）

**用語対応（2026-09 追記）**
本節が凍結する範囲（配合剤候補の表示順・挿入位置最適化・家族単位での完全な集合対称性）は、commit history 上でのみ `Phase 2-B` と呼ばれてきた（Repository の living SSOT には本節まで未登録だった）。同じ範囲を DP-21 は `SF-2A`（Search Family Phase 2）として言及している——`SF-2A` は本節と同一の凍結範囲を指す表記であり、`lib/search.ts` のコード comment が呼ぶ、既に実装済みの `Search Family Phase 2-A`（gate／family 順序ロジック。DP-18 の 2026-09 追補「OD-DRUG-PREFIX-BOUNDARY-1」「G5」を参照）とは**別物**である。以後、`Phase 2-B` および DP-21 の `SF-2A` はいずれも本節への pointer として読み替える。新しい正式名称は導入せず、命名の再設計も行わない。

**関連原則**
- DP-09（一般名検索到達性原則）— `displayGenericName` を検索解決に用いる先例。本原則は「単剤 brand の解決」から「単剤成分を含む配合剤への展開」へ対象を拡張したもの
- DP-11（適応横断検索到達性原則）— 「一方の型で検索した結果、他方の型の候補が消えてはならない」という相互到達性の思想を、単剤⇔配合剤の関係へ適用したもの

**関連フィールド**
`brandCatalog[brand].displayGenericName` / `lib/search.ts` の `splitGenericComponents()` / `combinationsByIngredient` / `resolvedSingleAgentIngredients` / `bucketed.lowConfidence`

**詳細経緯**
実装の技術的詳細は `lib/search.ts` の「Search Family Phase 1」コメントを参照。

---

## DP-21: 塩／水和物正規化原則（Salt / Hydrate Normalization Principle）

**Owner Decision（2026-09、SH-1B。旧「塩非表記／塩表記の2形式併記」運用をこの時点以降で置き換える）**

**方針**
- canonical の有効成分同一性（検索同一性・Search Family 同一性・brand⇔generic ペアリング・配合剤成分関係・ユーザー向け一般名表示）は、**塩・水和物・溶媒和物・対イオン等の製剤形態修飾語を含まない基本有効成分名**を用いる。
  - `メトホルミン塩酸塩` → `メトホルミン` ／ `ピオグリタゾン塩酸塩` → `ピオグリタゾン` ／ `アログリプチン安息香酸塩` → `アログリプチン` ／ `ミチグリニドカルシウム水和物` → `ミチグリニド`
  - 配合剤は成分ごとに、監査済みの `displayGenericName` を正規化ターゲットとして用いる。regex による接尾辞除去・文字列からの基本成分推測は行わない。
- **塩／水和物の正式名読みは検索面を持たない。** 塩形の kana 読み（例: `めとほるみんえんさんえん` `ぴおぐりたぞんえんさんえん` `いめぐりみんえんさんえん` `みちぐりにどかるしうむすいわぶつ`）は alias から撤去する。基本一般名読み（`めとほるみん` 等）は従来どおり到達性を保持する。
- **医学的に意味のある塩／水和物表記は削除しない。** 公式名称の引用・出典忠実性・製剤特異的説明・安定性／配合変化・安全性情報・用量／力価解釈・物質間の医学的差異に必要な場合は保持する（SH-1B 監査では該当 0 件）。
- **塩再混入ガードは維持する。** `lib/moduleValidator.ts` の `SALT_TERMS` と `DISPLAY_GENERIC_NAME_SALT_COPY` は将来の塩／水和物再混入を検出するために存置する（正規化後の corpus に塩形 genericName が無くなっても弱めない）。

**適用対象フィールド**
`brandCatalog[brand].genericName`（唯一の canonical 塩表記フィールドだった）を正規化する。`displayGenericName` / `genericKey` は SH-1B 以前から塩非表記であり変更しない。alias 系フィールド（`search.nameAliases` / `search.prefixAliases` / module `nameAliases` / `brandCatalog[brand].aliases` / `normalizedAliases` / `aliasToBrand`）からは、上記の塩形 kana 読み4件のみを撤去する（Owner Decision D-2）。基本一般名読み・ブランド名読みは変更しない。`data/search-manifest.json` の `genericName` / alias projection は generator で追随する。

**歴史記録の扱い（D-3）**
bridge の `# 確定済み事項` 節・`docs/reviews/` 配下・`docs/OPEN_DESIGN_QUESTIONS.md` の過去 Owner Decision 記録に残る旧塩表記値（`メトホルミン塩酸塩` 等）は**歴史記録として逐語保持する**。本 DP-21 がそれらを prospective に supersede する。過去記録を書き換えて塩表記を消す運用はしない。

**関連原則**
- DP-09（一般名検索到達性原則）— 基本一般名読みの到達性は不変。撤去するのは塩形読みのみ。
- DP-18（own-name 優先 / salt-name reading を family 内へ複製しない）— salt-name reading 自体が canonical から撤去されたことで、DP-18 が警告する「salt-name reading の family 内複製」の再発余地が構造的に縮小した。
- SF-2A（Search Family Phase 2）— `suppressRedundantGenericHeaderOnDirectMatch` の runtime 挙動は SH-1B では変更しない。正規化により同フラグの塩名由来の存在意義は薄れたが、その再解釈は Phase 2 の責務。

**関連フィールド**
`brandCatalog[brand].genericName` / `lib/search.ts` の `brandCatalogIngredientMap` / `lib/moduleValidator.ts` の `SALT_TERMS`・`DISPLAY_GENERIC_NAME_SALT_COPY`

---

## DP-22: inline addon placement 原則（Inline Addon Placement Principle）

**Owner Decision（2026-09-24、AVAREPT-P1 / P2-a）**

**目的**
Human-authored の P 本文の途中（前半と後半の間）へ addon を差し込む指導順序を、推測なしに
bridge → canonical → runtime で同じ順序として再現する。

**背景**
従来の addon 配置は「scenario P 本文全体 → 選択された addon → followup（P_CLOSING）」の 1 形式のみだった
（`lib/buildSoap.ts` buildNodeFields。2026-04 commit 3938564 で確立）。Avarept（ドライアイ TRPV1 拮抗薬）の
Human-authored draft は「P 前半 → 製品固有 addon → P 後半（相談文）→ 通常 addon → P_CLOSING」という
順序を持ち、既存形式では表現できなかった。相談文を addon の前へ移すと文言が同じでも指導の説明順序が
変わり、addon を固定 P 本文化すると選択性・brand gating・将来拡張性を失う。

**ルール**
- **bridge 内の marker 位置が inline addon placement の正本（SOT）である。** P セクション内に
  `P_ADDON_INLINE` を 0 個以上置き、その直後の連続する `- addon_…` 行を inline list とする
  （文法・変換は `prompts/vNext/PN1-Text-Extraction.md` §3b）
- **canonical はその位置を決定論的に保持する。** `scenarios[].addonInsertions[]`
  （`{ afterLine, keys }`。inline block を除外した `scenarios[].P` 行列上の位置と inline list 順）。
  `scenarios[].P` は inline block を除いた Human-authored 本文そのままであり、分割・トークン埋め込みをしない
- runtime は original `scenarios[].P` の行境界へ、選択された key を `keys` 順（click 順ではない）で挿入し、
  通常 addon 出力（tail）では skip する。未選択時は何も挿入せず P 本文がそのまま連続する
- `before_followup` 等の **semantic placement type は先行設計しない**。位置の意味は marker 位置そのもので表す
- **scope は P 内部 inline のみ**。S / A への inline addon、named slot、領域別 placement type は
  実要件が出た時点で別 Unit として検討する
- P 先頭・P 末尾への inline 挿入は現時点で禁止する（末尾は通常 `P_ADDON` の責務）

**採用理由**
比較した案のうち、P を前半／後半 field へ分割する案は `scenarios[].P` を読む既存 consumer
（validator check 16・PN7 item I・persona・PN1 逆置換照合）をすべて変更させ、P 本文へ slot token を
埋め込む案は未解決 token の漏出経路を作る。marker 位置 → `afterLine` 変換は `scenarios[].P` を不変に保ち、
field absent の既存 scenario を従来経路のまま残せる最小の決定論的 contract である。

**関連フィールド**
`scenarios[].addonInsertions` / `scenarios[].addonsRef.P` / `lib/buildSoap.ts`（buildNodeFields）/
`lib/moduleValidator.ts`（`ADDON_INSERTION_REF_BROKEN` / `ADDON_INSERTION_INVALID`）/
`scripts/audit-addon-bridge-chain.ts` / `scripts/bridgeAddonGrammar.ts`

**関連原則**
- DP-07（bridge SOT 原則）— 位置情報も bridge を正本とする
- DP-10（Addon 表示順原則）— AddonPanel の表示順は `addonsRef.P`（inline addon を含む bridge 上の出現順）。
  DP-22 が定めるのは SOAP 本文（P）への出力位置・順であり、表示順とは別軸

---

## 監査・設計時の参照ガイド

### 新人が最初に読むべき原則

1. **DP-00** — 何のためにこのドキュメントがあるか
2. **DP-07** — 何を正本として読むか（bridge vs JSON）
3. **DP-01** — なぜ module がこんなに分かれているか

### JSON 監査時の参照マップ

| 確認内容 | 参照原則 |
|---|---|
| 新規 module 構造 | DP-01 / DP-02 / DP-03 |
| classKey / nodeKey | DP-02 |
| heparinoid 検索フィールド | DP-05 |
| composition フィールド差分 | DP-03 |
| addons.orderPresets | DP-08 |
| bridge と JSON の乖離 | DP-07 |
| moduleVersion | DP-04 |
| 一般名検索到達性 / brandCatalog alias | DP-09 |
| brand 帰属解決 / alias 複製境界 | DP-18 |
| Addon 表示順 / P_ADDON 記載順 | DP-10 |
| P 本文内部への inline addon 挿入 / P_ADDON_INLINE | DP-22 |
| 適応横断検索（crossModuleIndicationLabel） | DP-11 |
| 多剤合成のRuntime評価優先順位 | DP-12 |
| Runtime 未接続資産が設計負債か Future Expansion か | DP-13 |
| 不確定項目の扱い / PENDING・CHECK の判断 | DP-15 |
| 最終仕様を確定する時期の判断 / 実物評価前の仕様固定 | DP-16 |
| 配合剤成分展開 / 単剤⇔配合剤の候補集合対称性 | DP-20 |
| 塩／水和物と有効成分同一性 / 塩形読みの検索面 | DP-21 |

### 失われると事故要因になる原則

| 原則 | リスク |
|---|---|
| DP-02 | classKey 誤設定 → 意図しない class-level S 統合 → 複数薬剤の S が誤マージ |
| DP-05 | formulationSearchTokens 削除 → 剤形分割検索が壊れ誤剤形選択 |
| DP-07 | JSON 直接編集 → bridge と乖離 → 次回 JSON 化で変更が消える |
| DP-08 | 推測 preset 追加 → 意図しない ADDON 組み合わせが固定化 |
| DP-10 | コード側に固定順（GROUP_ORDER 相当）を再導入 → bridge/JSON の記載順が UI に反映されなくなる |
| DP-22 | inline addon を click 順・tail 側で出力する／`scenarios[].P` を分割・加工する → Human-authored の P 本文と addon の説明順序が崩れる、または inline addon が二重出力される |
| DP-11 | crossModuleIndicationLabel 実装時に dedup・優先順位ロジックのみを変更 → ブランド⇔一般名の相互到達性が失われる（2026-07 に実際に発生した回帰） |
| DP-13 | 意図的な未接続が記録されないまま放置 → Runtime 未接続資産が設計負債と誤認され削除・改変される、または監査のたびに同じ調査コストが発生する |
| DP-15 | 不確定を推測で埋める運用へ回帰 → 誤った値が「検証済み」として基盤に固定され、実機確認や最終監査まで発覚しない |
| DP-16 | 実物評価前に最終仕様を確定 → 評価によって初めて分かる基準ではなく、設計時に想像した基準が仕様として恒久化する。保留中の構造整備を怠ると、方式確定後に型・canonical・Validator・UI の全面改修が発生する |
| DP-18 | own-name priority を外す・salt-name reading を family 内へ複製 → 無関係な配合剤や非対称な候補が誤って先頭表示される回帰の再発 |
| DP-20 | 配合剤展開候補を `genericMode` 等の先頭バケツへ追加 → 新規候補が既存の強い直接一致より前に表示され ranking 凍結が崩れる（2026-09 実装時に実際に発生し `lowConfidence` へ変更して修正） |
| DP-21 | 塩再混入ガード（`SALT_TERMS` / `DISPLAY_GENERIC_NAME_SALT_COPY`）を削除 → 塩／水和物名が canonical 有効成分同一性へ再混入し、検索・Search Family・SOAP 主語に技術的修飾語が露出する回帰を検出できなくなる。／ 基本一般名読みまで撤去 → DP-09 一般名検索到達性の回帰 |
