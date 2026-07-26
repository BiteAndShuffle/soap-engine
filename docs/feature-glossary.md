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
| ② Runtime 文体変換 | `lib/applyPersona.ts` / `lib/personaGuard.ts`。`PERSONA_PROFILES`（polite / gentle / concise の軸重み）による表示直前の変換。**Phase 1 で実稼働中** | 稼働中 |
| ③ module JSON の `persona` フィールド | top-level `persona.defaultStyle` / `availableStyles` / `styleProfiles`。**Phase 2 で Runtime 接続予定の予約枠。現在どのコードからも読まれていない** | Future Expansion |

②と③は別物である。`lib/applyPersona.ts` は module JSON の `persona` フィールドを一切参照せず、
自身が定義する `PERSONA_PROFILES` のみを使用する。

**状態（③について）**: Future Expansion（再判断時期: Phase 2）。
`docs/DESIGN_PRINCIPLES.md` DP-13 / `docs/DEVELOPMENT_STANDARD.md` §10 参照。

**品質条件 Q1（配置の一貫性）未充足の記録**: 現在 `data/modules/` の 35 モジュール中 33 モジュールが
`persona` フィールドを保持し、2 モジュール（`dm_insulin_intermediate` / `dm_insulin_regular`）は
未保持である。これは段階的実装の途中段階であり、Phase 2 の設計確定まで均一化は行わない。

---

## まとめ対応表

| 用語 | 場所 | `buildNodeFields` | 状態 |
|------|------|-------------------|------|
| Rapid | 右パネル（ThirdPanel） | 呼ばない | 稼働中 |
| ADDON | 右パネル（ThirdPanel） | 呼ばない | 稼働中 |
| Express | 中央パネル | 呼ぶ（シナリオ確定時） | 稼働中 |
| NLP生成 | — | 呼ばない（NLP出力を直接セット） | Future Expansion |
| Persona（Runtime変換） | Topbar / lib/applyPersona.ts | 呼ばない（表示直前の変換） | 稼働中 |
| Persona（module JSON フィールド） | data/modules/*.json top-level | — | Future Expansion |
