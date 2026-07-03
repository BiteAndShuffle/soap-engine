# OPEN_DESIGN_QUESTIONS.md

SOAP Engine — 設計保留事項

このドキュメントは、現時点で設計判断が確定していない「まだ決めていないこと」を記録します。
「どう書くか」は JSON_STANDARD.md を参照してください。
「なぜそうするのか」は DESIGN_PRINCIPLES.md を参照してください。

判断が確定した項目は DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ移管し、
このドキュメントから削除します。

最終更新: 2026-06-20

---

## 保留事項一覧

| No | 項目 | 優先度 | 推奨判断タイミング |
|---|---|---|---|
| Q-A1 | Addon Responsibility をどう構造化するか | 🟡 中 | 糖尿病以外の領域でPN7 check Z相当の監査を展開する際、命名規則ヒューリスティックの精度が不十分と判明した時 |
| Q-J1 | derm 3系 `composition.classKey` の剤形込み設計 | 🟡 中 | heparinoid 複数剤形の同時処方ユースケースが確定した時 |
| Q-F4 | `composition.canonicalSource` の必須化範囲 | 🟡 中 | 多剤合成機能が安定した時 |
| Q-G1 | 配合剤の `genericKey` 複数成分対応（`genericKeys: string[]`） | 🟢 低 | 単剤↔配合剤のクロス成分検索が要件化した時 |

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

## 判断確定後の処理手順

1. 論点が確定したら、採用した選択肢と根拠を
   DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ追記する
2. このドキュメントから該当項目を削除する
3. 影響する canonical JSON の修正が必要な場合は、bridge 原稿を起点として対応する
4. 関連する module の再バリデーションを行う
