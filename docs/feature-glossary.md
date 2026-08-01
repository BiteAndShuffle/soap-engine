# 機能用語定義 (Feature Glossary)

Claude が次回コードを読む際に Rapid / Express / NLP を混同しないための定義集。

---

## Rapid（ラピッド）— 右パネル簡易操作

**定義**: 右パネル（ThirdPanel）に配置された、1剤目 SOAP を即座に微調整するボタン群。

| 操作 | ハンドラ | 変更対象 |
|------|----------|----------|
| S先頭文ボタン（継続投与・新規など） | `handleSToggle` | S欄のみ（A・P は保持） |
| ADDONボタン（生活指導などの追加文） | `handleAddonToggle` | 現在の `primaryBaseFields` に ADDON テキストを追加・削除 |

**廃止済み機能**: フラグボタン（副作用なし / CP良好）は UI 未接続の dead code として
2026-07-25（P2-F1）に整理・削除された。歴史的経緯・発生背景は
`docs/reviews/PHASE2_STAGE1_R1_REVIEW_2026-07-25.md` の Lessons Learned を参照。

**重要な制約:**
- Rapid 操作中は `buildNodeFields` を呼ばない。シナリオ再構築は行わない。
- `primaryBaseFieldsRef.current` を常にベースとして使用する。
- `rapidBaseFieldsRef` は NLP生成モード用のフィールドであり、通常の Rapid 操作では `null`。

---

## ADDON（アドオン）— 追加文オーバーレイ

**定義**: 生活指導・禁忌確認などの補足文を SOAP の各セクションに追記する機能。Rapid の一部。

- ハンドラ: `handleAddonToggle`
- データ: `activeModuleData.addons.items[key]`（`targetSection` + `text` または `sectionTexts`）
- ON 時: `primaryBaseFieldsRef.current` に ADDON テキストを末尾追記
- OFF 時: 全 ADDON テキストをフィルタで除去し、選択中の ADDON だけ再付加

**禁止事項**: ADDON トグル時に `buildNodeFields` を呼んではならない（S先頭文の変更が消える）。

---

## Express（エクスプレス）— 中央パネル薬剤追加フロー

**定義**: 中央パネルで医療領域→サブカテゴリ→剤形/候補を選択し、SOAP を即時確定するフロー。

| ステップ | UI要素 | ハンドラ |
|----------|--------|----------|
| 医療領域アコーディオン展開 | `MedicalAreaAccordion` | — |
| サブカテゴリ選択 | サブカテゴリボタン | `handleSubcategorySelect` |
| 剤形 / 候補選択 → SOAP確定 | Express候補ボタン | `handleExpressAdd` |

- 1剤目（primary）またはノード追加（composeNodes）どちらにも対応
- シナリオ選択が確定した時点で `buildNodeFields` を呼ぶ（Express の責務）

---

## NLP生成（NLPせいせい）— 現在未使用・将来機能

**定義**: 患者テキストの入力からシナリオを推定する将来機能。**現在 UI には一切表示されない。**
実体は `lib/scenarioSelector.ts` のキーワード辞書 + 3〜6文字スライディングウィンドウによる
**決定論的スコアリング**であり、外部 LLM 呼び出しは存在しない。

- `showNlpButton = false` で NLP 切替ボタンは非表示
- `handleSwitchToNlp` はどの UI コンポーネントにも渡されていない
- `uiMode` が `'nlp'` になることは現在のコードフローでは起きない

| ハンドラ | 役割 | 状態 |
|----------|------|------|
| `handleSwitchToNlp` | NLPモードへ切替 + manual状態のスナップショット保存 | UI未接続 |
| `handleNlpGenerate` | 患者テキスト → SOAP 生成 | UI未接続 |
| `handleSwitchToManual` | NLPモード解除 + スナップショット復元 | UI未接続（NlpInputPanel は `uiMode==='nlp'` 時のみ表示） |

**Rapid との違い**: NLP生成は Rapid（右パネルボタン操作）とは完全に別概念。混同禁止。

**状態**: Future Expansion（再判断時期: Phase 2）。`docs/DESIGN_PRINCIPLES.md` DP-13 /
`docs/DEVELOPMENT_STANDARD.md` §10 参照。

---

## Persona（ペルソナ）— 3つの独立した概念

**重要**: 「persona」という語は本プロジェクトで3つの異なるものを指しうる。混同禁止。

| 概念 | 実体 | 状態 |
|---|---|---|
| ① bridge本文そのものの文体 | PN1 の本文凍結宣言と PN7 item I（本文凍結照合）で保護される | 稼働中 |
| ② Runtime 文体変換 | `lib/applyPersona.ts` / `lib/personaGuard.ts`。`PERSONA_PROFILES`（polite / gentle / concise / plain の軸重み）による表示直前の変換。**Phase 1 で実稼働中** | 稼働中 |
| ③ module JSON の `persona` フィールド | top-level `persona.defaultStyle` / `availableStyles` / `styleProfiles`。**canonical field である。現在どのコードからも読まれていない** | **2 軸で位置づける（下記）** |

②と③は別物である。`lib/applyPersona.ts` は module JSON の `persona` フィールドを一切参照せず、
自身が定義する `PERSONA_PROFILES` のみを使用する。

### 概念③ の位置づけ — Canonical Requirement と Lifecycle State の 2 軸

`module.persona` は **canonical field** である。次の 2 軸で位置づけられ、**両者は直交する。一方が他方を決定しない。**

| 軸 | 値 | 正本 |
|---|---|---|
| **Canonical Requirement** | **全 module 必須** | `docs/JSON_STANDARD.md` **JS-A** |
| **Lifecycle State** | **Persona runtime connection は未接続。将来接続予定** | `docs/DEVELOPMENT_STANDARD.md` §10 / `docs/DESIGN_PRINCIPLES.md` DP-13 |

Lifecycle 台帳へ登録する対象は、canonical field である `module.persona` ではなく、将来機能の側である
「**Persona runtime connection**」である。

> **runtime 未接続であることは、canonical field の欠落を許容する根拠にならない。**
> canonical field の必須性を決めるのは Canonical Requirement（JS-A）であり、Lifecycle State ではない。

現在の `module.persona` は、**将来の Persona 接続点が全 module に存在することを保証する予約枠**であり、
値は `prompts/vNext/PN5-Non-Scenario.md` の fallback 既定値である。
**現在の枠形状を、最終的な人格別固定文章の格納構造として確定するものではない**（加算 / 移行 / 置換の
いずれになるかは第3段階で判断する）。

設計思想・時間軸・判断規則の正本は `docs/PERSONA_PROJECT_PRINCIPLE.md`（Core）である。

### 旧記述の撤回（2026-08-01）

本節にはかつて、**2 module（`dm_insulin_intermediate` / `dm_insulin_regular`）の `persona` 欠落を
「品質条件 Q1（配置の一貫性）未充足の記録」として扱い、均一化を Phase 2 の設計確定まで行わないとする
記述**（旧 L94-96）が存在した。**この記述は撤回した。**

**撤回理由は方針の変更ではなく、次の構造上の誤りによる。**

| # | 誤り |
|---|---|
| 1 | **canonical field へ Lifecycle の品質条件 Q1 を適用していた。** Q1（`docs/DEVELOPMENT_STANDARD.md` §10.3）は Future Expansion 資産に対する品質条件であり、canonical field は適用対象ではない |
| 2 | **Lifecycle State と Canonical Requirement を混同していた。** runtime 未接続という Lifecycle 上の事実から、canonical 構造としての充足を先送りしてよいという結論を導いていた |
| 3 | **現行 JS-A では `persona` は全 module 必須である。** 欠落は canonical 完成条件の未充足であり、均一化を先送りする根拠がない |

欠落している 2 module については、**F-4b で現行 `prompts/vNext/PN5-Non-Scenario.md` の規則を
遡及適用して補完する予定である。** 両 module の欠落原因は工程逸脱ではなく、PN5 に persona 規則が
成立する前に生成されたことによる**規則導入境界**である。

---

## まとめ対応表

| 用語 | 場所 | `buildNodeFields` | 状態 |
|------|------|-------------------|------|
| Rapid | 右パネル（ThirdPanel） | 呼ばない | 稼働中 |
| ADDON | 右パネル（ThirdPanel） | 呼ばない | 稼働中 |
| Express | 中央パネル | 呼ぶ（シナリオ確定時） | 稼働中 |
| NLP生成 | — | 呼ばない（NLP出力を直接セット） | Future Expansion |
| Persona（Runtime変換） | Topbar / lib/applyPersona.ts | 呼ばない（表示直前の変換） | 稼働中 |
| Persona（module JSON フィールド） | data/modules/*.json top-level | — | **Canonical Requirement: JS-A 全 module 必須 ／ Lifecycle: runtime 未接続** |
