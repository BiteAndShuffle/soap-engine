# DESIGN_PRINCIPLES.md

SOAP Engine — 設計原則集

このドキュメントは、新規チャット開始時でも同じ設計判断を再現できるよう、
SOAP Engine の設計根拠・例外許容条件・禁止事項を永続化したものです。

設計判断の参照順序:
  このドキュメント → JSON_STANDARD.md → OPEN_DESIGN_QUESTIONS.md → bridge 原稿 → canonical JSON

最終更新: 2026-07-26

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

**適用範囲**
複数 brand を持つ全 module（単剤・配合剤とも）

**方針**
- `brandCatalog[brand].displayGenericName` を検索解決に活用する。`lib/search.ts` の `resolveAllHighPrecisionBrands()` がクエリと各 brand の `displayGenericName`（正規化形）を照合し、一致した brand を検索候補として抽出する
- `genericKey` によるグルーピング判断（RULES.md §21）とは役割を分離する。`displayGenericName` はクエリとの一致判定のみに使い、「どの brand を束ねるか」の判断には使わない
- 配合剤（例: ソリクア＝インスリングラルギン／リキシセナチド）は、構成成分ごとの読みを個別に登録し、単剤側（例: ランタス）からも配合剤側（例: ソリクア）からも、どちらの成分名で検索しても到達できるようにする

**不採用とした方針**
`brandCatalog[brand].aliases` へ一般名のフルストリングを brand ごとに複製する方式は、50〜300+ module 規模の量産局面で bridge / JSON 双方への複製作業が線形に増え保守負荷が高すぎるため不採用とした。複製漏れは実際に発見されており（無関係な brand が代表候補として誤表示される事例）、データ複製に依存しない現方針の採用理由となっている。

**採用理由**
`displayGenericName` は JS-A-drug（`docs/JSON_STANDARD.md`）で全 brand 必須のフィールドであり、bridge 記載時点で既に人間レビュー済みである。新たな alias データを追加生成せず、既存の正本データを検索にも活用することで、bridge への追記なしに全 module へ適用される。

**関連フィールド**
`brandCatalog[brand].displayGenericName` / `genericKey`（RULES.md §21）/ `lib/search.ts` の `resolveAllHighPrecisionBrands()`

**詳細経緯**
Tier 分類・残課題（cross-module 欠落・genericKey 命名不統一等）は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S1 を参照。

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
新しい `matchPolicy` フィールドを追加した場合は、以下を同一作業内で更新する（型定義のみの先行実装を禁止する）:
- `lib/types.ts`（型定義）
- `docs/JSON_STANDARD.md`（matchPolicy 仕様表）
- `docs/DESIGN_PRINCIPLES.md`（新しい設計パターンを伴う場合、新規 DP として追加）
- 検索 unit tests（`tests/search.test.ts` 等）・回帰テスト
- Runtime / 実機横断チェック項目（`docs/IMPLEMENTATION_CHECKLIST.md`）

検索ロジックの変更では、direct match 系のコードパスと generic match 系のコードパスの両方を確認する（詳細な手順は `prompts/RULES.md` §26）。

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
| Addon 表示順 / P_ADDON 記載順 | DP-10 |
| 適応横断検索（crossModuleIndicationLabel） | DP-11 |
| 多剤合成のRuntime評価優先順位 | DP-12 |
| Runtime 未接続資産が設計負債か Future Expansion か | DP-13 |
| 不確定項目の扱い / PENDING・CHECK の判断 | DP-15 |

### 失われると事故要因になる原則

| 原則 | リスク |
|---|---|
| DP-02 | classKey 誤設定 → 意図しない class-level S 統合 → 複数薬剤の S が誤マージ |
| DP-05 | formulationSearchTokens 削除 → 剤形分割検索が壊れ誤剤形選択 |
| DP-07 | JSON 直接編集 → bridge と乖離 → 次回 JSON 化で変更が消える |
| DP-08 | 推測 preset 追加 → 意図しない ADDON 組み合わせが固定化 |
| DP-10 | コード側に固定順（GROUP_ORDER 相当）を再導入 → bridge/JSON の記載順が UI に反映されなくなる |
| DP-11 | crossModuleIndicationLabel 実装時に dedup・優先順位ロジックのみを変更 → ブランド⇔一般名の相互到達性が失われる（2026-07 に実際に発生した回帰） |
| DP-13 | 意図的な未接続が記録されないまま放置 → Runtime 未接続資産が設計負債と誤認され削除・改変される、または監査のたびに同じ調査コストが発生する |
| DP-15 | 不確定を推測で埋める運用へ回帰 → 誤った値が「検証済み」として基盤に固定され、実機確認や最終監査まで発覚しない |
