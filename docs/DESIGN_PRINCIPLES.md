# DESIGN_PRINCIPLES.md

SOAP Engine — 設計原則集

このドキュメントは、新規チャット開始時でも同じ設計判断を再現できるよう、
SOAP Engine の設計根拠・例外許容条件・禁止事項を永続化したものです。

設計判断の参照順序:
  このドキュメント → JSON_STANDARD.md → OPEN_DESIGN_QUESTIONS.md → bridge 原稿 → canonical JSON

最終更新: 2026-06-20

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

**採用理由**
このプロジェクトでは新規チャット開始時に会話履歴が失われる。
設計意図が伝わらないまま作業を続けると、過去の判断が覆され一貫性が崩れる。
「強くてニューゲーム」とは、前回セッションの知識をそのまま引き継いで
次のセッションを開始できる状態を指す。

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

### 失われると事故要因になる原則

| 原則 | リスク |
|---|---|
| DP-02 | classKey 誤設定 → 意図しない class-level S 統合 → 複数薬剤の S が誤マージ |
| DP-05 | formulationSearchTokens 削除 → 剤形分割検索が壊れ誤剤形選択 |
| DP-07 | JSON 直接編集 → bridge と乖離 → 次回 JSON 化で変更が消える |
| DP-08 | 推測 preset 追加 → 意図しない ADDON 組み合わせが固定化 |
