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
| Q-J1 | derm 3系 `composition.classKey` の剤形込み設計 | 🟡 中 | heparinoid 複数剤形の同時処方ユースケースが確定した時 |
| Q-K1 | `moduleVersion` 採番ルール | 🟢 低 | 複数 module の同時リリースが発生した時 |
| Q-K4b | `display.localInput` の条件定義 | 🟢 低 | localInput の参照先コードを確認した時 |
| Q-F4 | `composition.canonicalSource` の必須化範囲 | 🟡 中 | 多剤合成機能が安定した時 |
| Q-TOP | top-level key 順序の標準パターン | 🟢 低 | 新規 module 追加前（急がない）|

優先度の凡例:
- 🔴 要判断: 新規 module 追加前に確定が必要
- 🟡 中: 現状の動作に支障はないが早期確定が望ましい
- 🟢 低: 当面は現状維持で問題なし

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

## Q-K1: moduleVersion 採番ルール

**論点**
canonical JSON では `moduleVersion` を保持する（DP-04）が、採番ルールが未定義。
現在の値が不統一。

**現状**

| module | moduleVersion |
|---|---|
| allergy_h1_antihistamine_second_gen_oral | `1.0.0` |
| allergy_h1_antihistamine_eye_drops | `1.0.10` |
| derm_heparinoid_moisturizer_cream | `1.0.10` |
| derm_heparinoid_moisturizer_lotion | `1.0.10` |
| derm_heparinoid_moisturizer_ointment | `1.0.10` |
| dm_glp1ra_injection | `1.0.10` |
| dm_glp1ra_semaglutide_oral | `1.1.0` |

**選択肢**

**選択肢A: Semantic Versioning（MAJOR.MINOR.PATCH）厳密化**
- メリット: 業界標準。破壊的変更を MAJOR で明示できる
- デメリット: PATCH 相当の更新が頻繁で管理コスト高。「破壊的変更」の定義が難しい

**選択肢B: 管理簡略化（マイルストーン単位）**
- draft = `0.x`、実運用 = `1.x`、安定 = `2.x` 程度の区分
- メリット: 管理コストが低い
- デメリット: 外部システムとの互換性判断に使いにくい

**選択肢C: 採番放棄（存在のみ必須、値は任意）**
- メリット: 管理コストゼロ
- デメリット: lifecycle 管理の意味が失われる

**推奨判断タイミング**
複数 module の同時リリース・外部システムとの JSON 連携が必要になった時点。

**現時点の扱い**
JSON_STANDARD.md JS-D（意図的差分許容）で暫定保持。

---

## Q-K4b: display.localInput の条件定義

**論点**
4 module に存在し 3 module に不在。どのような条件で必要かが未定義。
runtime / UI での参照先の確認が先決。

**現状**

| module | display.localInput |
|---|---|
| allergy_h1_antihistamine_eye_drops | あり |
| derm_heparinoid_moisturizer_cream | あり |
| derm_heparinoid_moisturizer_lotion | あり |
| derm_heparinoid_moisturizer_ointment | あり |
| allergy_h1_antihistamine_second_gen_oral | **なし** |
| dm_glp1ra_injection | **なし** |
| dm_glp1ra_semaglutide_oral | **なし** |

**確認が必要な事項**
- `display.localInput` がどのコンポーネントで参照されているか
- 不在の場合に fallback が発生するか、エラーになるか

**選択肢**

**選択肢A: 条件付き必須（剤形固有入力が必要な場合のみ）**
- メリット: 不要な module に不要なフィールドを強制しない
- デメリット: 「剤形固有入力が必要」の定義が曖昧なまま

**選択肢B: 全 module 必須（空オブジェクト許容）**
- メリット: 構造が統一される
- デメリット: 空フィールドが多発

**選択肢C: 廃止**
- 参照箇所がない場合に検討

**推奨判断タイミング**
`display.localInput` の参照先コードを確認した後。

**現時点の扱い**
JSON_STANDARD.md JS-B の候補として保留。欠落を「バグ」と判断しない。

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

## Q-TOP: top-level key 順序の標準パターン

**論点**
現在 2 パターンが並存。新規 module 作成時の基準が曖昧。

**現状**

**Pattern A**（allergy_eye_drops / derm 3系）:

```
moduleId → moduleVersion → categoryPath → composition → drug → drugResolution
→ regulatory → topical → template → display → defaults → persona → scenarios
→ addons → ui → risks → searchConfig → index → tagCatalog → expressModes
```

**Pattern B**（allergy_oral / dm_glp1ra_oral / dm_glp1ra_injection）:

```
moduleId → moduleVersion → regulatory → topical → categoryPath → composition
→ drug → drugResolution → template → risks → searchConfig → index → display
→ defaults → ui → persona → tagCatalog → addons → expressModes → scenarios
```

主な違い:
- Pattern A: `categoryPath → composition → drug` の順（論理的な識別 → 薬剤情報の流れ）
- Pattern B: `regulatory → topical` が先（規制情報が前置）

**選択肢**

**選択肢A: Pattern A を新規作成の標準とする（既存は変更しない）**
- メリット: JSON_STANDARD.md JS-A に「推奨順序 Pattern A」として記載（実施済み）
- デメリット: 既存の Pattern B ファイルとの非対称が残る

**選択肢B: Pattern B を新規作成の標準とする**
- メリット: 既存ファイルの多数派に合わせる
- デメリット: 新しいドキュメント化の方向性（Pattern A）と逆行する

**選択肢C: 統一しない（薬剤種ごとに自由）**
- メリット: 追加管理コストなし
- デメリット: 一貫性が失われる

**推奨判断タイミング**
次の新規 module 追加前に確定。機能差はないため急がない。

**現時点の扱い**
JSON_STANDARD.md JS-D で暫定保持。新規作成は Pattern A を推奨（JS-A に記載）。

---

## 判断確定後の処理手順

1. 論点が確定したら、採用した選択肢と根拠を
   DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ追記する
2. このドキュメントから該当項目を削除する
3. 影響する canonical JSON の修正が必要な場合は、bridge 原稿を起点として対応する
4. 関連する module の再バリデーションを行う
