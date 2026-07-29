# PN6 — Assembly（組み立てフェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS

## 位置づけ
**PN6 の責務: 生成済み成果物を統合するだけ。不足項目の独自生成・補完は禁止。**
PN1〜PN5 の全成果物を統合し、完成 JSON を生成する。
新規コンテンツの生成・修正は行わない。統合と保存のみ。

**PN5 成果物の事前確認（統合開始前に必ず確認）:**
phase5_non_scenario.json に以下が存在しない場合、即 MUST_STOP → PN5 へ差し戻す:
- `persona`
- `ui` / `risks` / `searchConfig` / `tagCatalog` / `expressModes`

**composition.sMergePolicy の確認:**
phase2_drug_header.json の `composition` に `sMergePolicy` が存在しない場合、即 MUST_STOP → PN2 へ差し戻す。
（PN6 が独自補完してはならない）

---

## 入力

以下の Phase 成果物をすべて Read する:
```
/tmp/soap-build/{moduleId}/phase1_text_spine.json
/tmp/soap-build/{moduleId}/phase2_drug_header.json
/tmp/soap-build/{moduleId}/phase3a_decisions.json   ← groupKeyRegistry の確定値
/tmp/soap-build/{moduleId}/phase3b_meta.json
/tmp/soap-build/{moduleId}/phase4a_structured.json
/tmp/soap-build/{moduleId}/phase4b_structured.json
/tmp/soap-build/{moduleId}/phase5_non_scenario.json
```

### 大規模モジュール（シナリオ 20 件超）での Read 順序

7ファイルを以下の順序で Read することでコンテキスト効率を最大化する:

```
1. phase3a_decisions.json  （軽量 ~150行 / groupKeyRegistry のみ必要）
2. phase2_drug_header.json （中量 ~200行 / 基盤フィールド）
3. phase5_non_scenario.json（軽量 ~120行 / ui / risks / searchConfig 等）
4. phase4a_structured.json （中量 ~250行 / 治療系 xStructured）
5. phase4b_structured.json （中量 ~350行 / 副作用系 xStructured）
6. phase3b_meta.json       （最大 ~1,600行 / シナリオ全体 — 最後に Read）
7. phase1_text_spine.json  （通常は phase3b_meta で代替可能。必要な場合のみ追加 Read）
```

phase3b_meta.json が 2,000 行を超える場合は分割 Read する:
- 1回目: `offset=0, limit=2000`
- 2回目: `offset=2000, limit=2000`（以降必要に応じて続ける）

---

## 責務

### 統合手順

**Step 1: 基盤フィールドの確定（Phase 2 から）**
以下をすべて Phase 2 からそのまま採用する:
`moduleId / moduleVersion / categoryPath / composition / drug / drugResolution / regulatory / topical / template / display / defaults`

> ⚠️ **MUST_STOP**: `drugResolution.brandToTags` が null / undefined / キー欠落の場合は組み立てを停止し報告すること（実機クラッシュ要因 → PN7-F 参照）。

`defaults` セクション（`defaults.followup` / `defaults.followupProfiles` を含む）は Phase 2 の値をそのまま採用する。
Phase 1 の `followupProfiles` が Phase 2 に正しく取り込まれていることを前提とする。

**Step 2: composition.groupKeyRegistry の確定**
Step 1 で採用した composition の `groupKeyRegistry` を Phase 3A の値に上書きする（Phase 2 では暫定 `[]` のため）。

**Step 3: scenarios[] の構築**
Phase 3B の scenarios[] をベースとし、各シナリオの空配列 `SStructured / AStructured / PStructured` を Phase 4A / 4B の対応する値で置き換える。

- Phase 4A の対象（treatment_start / treatment_adjustment / treatment_end）は Phase 4A から取得
- Phase 4B の対象（side_effect / adherence / lifestyle_guidance / sickday / followup）は Phase 4B から取得
- id キーで突き合わせる
- `addonsRef` は Phase 3B の値（配列順を含む）をそのまま引き継ぐ。PN6 では並び替えない（addonsRef.P の順序は表示順として扱われる。RULES.md §25）

**xStructured 突き合わせ時の確認手順（シナリオ 20 件超の場合）:**
1. phase4a_structured.json の scenarios キー一覧を確認し、対象 id リストを把握する
2. phase4b_structured.json の scenarios キー一覧を確認し、対象 id リストを把握する
3. PN4A + PN4B の id リストの和集合が phase3b_meta の全シナリオ id と一致することを確認する
4. 不一致（漏れ / 重複）があれば、該当 Phase に差し戻してから PN6 を再実行する
5. 一致が確認できた場合のみ最終 JSON 生成を開始する

**Step 4: addons の構築**
Phase 3B の addons.items（テキスト + メタデータ）をベースとし、以下の標準ルールを適用して確定させる。
Phase 5 の addons.orderPresets を追加する。

#### addon.text 標準ルール（必須）

`addons.items[].text` は**当該モジュール自身の bridge**のコンテンツ本文を使用する。title を text に流用してはならない。

- addon の `sectionTexts` に `P_APPEND` が存在する場合 → `text = P_APPEND` 本文
- `P_APPEND` が存在せず `A_APPEND` のみの場合 → `text = A_APPEND` 本文
- `P_APPEND` も `A_APPEND` もなく `S_APPEND` のみの場合 → `text = S_APPEND` 本文

bridge を single source of truth とし、title は `title` フィールドにのみ使用する。

**bridgeを読まず、他モジュールの JSON や過去の生成結果を正本として利用してはならない。** 同一 addon id を複数モジュールが使用している場合でも、各モジュールの `text` / `sectionTexts.*` は必ずそのモジュール自身の bridge から個別に抽出する。自身の bridge を確認せず他モジュールの JSON や過去の生成結果を正本として流用すると、当該モジュールの bridge と JSON が乖離する（bridge 側の修正が JSON に反映されない状態を招く）。なお、各モジュールが独立して自身の bridge から抽出した結果、複数モジュールの text が同一の文言になること自体は問題ない（禁止対象は「複製という行為」であり、「結果としての一致」ではない）。

**選択薬剤自身を指す薬剤名部分は `{{drug_subject}}` へ変換する（`docs/JSON_STANDARD.md` addon.text 薬剤名ルール）。** bridge は決め打ち表記が正本のため、scenario の S/O/A/P と同様に、addon 本文内で選択薬剤自身を指す箇所（他剤・製剤カテゴリ等を指す箇所は対象外）は bridge の薬効群・配合剤クラス名固定表記を `{{drug_subject}}` へ変換して JSON へ格納する。

#### addon.group 標準変換表（必須）

bridge 上の type をそのまま `group` にコピーしない。必ず以下の変換表を経由する:

| bridge type | group（JSON） |
|---|---|
| `lifestyle_guidance` | `counseling` |
| `side_effect_guidance` | `sideEffects` |
| `adherence_guidance` | `adherence` |
| `sickday_guidance` | `sickday` |
| `followup_monitoring` | `followup` |
| `administration_guidance` | `counseling`（2026-07-24 正式化。RULES.md §5 / PN3A-Scenario-Classification.md と同期。bridge type は意味上の分類として保持し、JSON group のみ counseling へ変換する。新規 group `administration_guidance` は追加しない） |

変換表にない type が出現した場合は MUST_STOP し、ユーザーへ確認する。

この変換表は AUTORUN 標準仕様の SSOT である。

#### addon.uiVariant 保持ルール（必須）

bridge の ADDON ヘッダーに `uiVariant` が定義されている addon → JSON に `uiVariant` フィールドを含める。
bridge に `uiVariant` の定義がない addon → `uiVariant` フィールドを生成しない。
**推測生成は禁止。bridge に存在しない uiVariant を付与してはならない。**

**Step 5: 非シナリオ構造の追加**
Phase 5 の以下をそのまま追加する:
```
ui
risks
searchConfig
tagCatalog
expressModes
persona        ← phase5 の persona を top-level へ配置（defaults の直後）
```

### 除去する中間フィールド

最終 JSON から以下を削除する:
```
_phase
_frozenAt
_closingText
```

### フィールド順序

以下の標準順序で出力する:

```
moduleId
moduleVersion
categoryPath
composition
drug
drugResolution
regulatory
topical
template
display
defaults
persona
scenarios
addons
ui
risks
searchConfig
tagCatalog
expressModes
```

---

## 出力

**完成 JSON 全文をチャットテキストとして出力しない。**

Write ツールを使用して以下のパスに直接保存する:

```
data/modules/{moduleId}.json
```

保存完了後、以下のみをチャットに報告する:

```
■ PN6 Assembly 完了
保存先: data/modules/{moduleId}.json
総行数: {N} 行
scenarios 数: {N}
addons.items 数: {N}
xStructured 突き合わせ: PN4A {N}件 / PN4B {N}件 / 合計 {N}件（全シナリオと一致）
```

**不完全な出力が発生した場合:**
- Write が途中で失敗した場合は `rm data/modules/{moduleId}.json` で削除し、PN6 を最初から再実行する
- 部分的な JSON ファイルを残したままにしない（PN7 が不完全なファイルを監査するリスクを防ぐ）

---

## 禁止事項

- 完成 JSON をチャットテキストとして出力しない
- 新規コンテンツを生成しない
- 中間フィールド（_phase / _frozenAt / _closingText）を最終 JSON に含めない
- Phase 1 凍結テキストを変更しない
- **PN5 成果物に存在しない標準構造を PN6 が独自補完しない**（検出したら MUST_STOP → PN5 差し戻し）
- **composition.sMergePolicy を PN6 が独自追加しない**（PN2 で生成すること）

---

## 次工程へのハンドオフ

PN6 完了後、保存先・行数・シナリオ数・addon 数を報告する。

次工程: PN7（Cross Reference Audit）
