# PN7 — Cross Reference Audit（クロスリファレンス監査フェーズ）

## 参照
→ prompts/RULES.md §2 PROHIBITED_UNIVERSAL
→ prompts/RULES.md §3 ERROR / PENDING / CHECK 共通定義
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS
→ prompts/RULES.md §8 drug.nameAliases完全一致ルール
→ prompts/RULES.md §11 addons.orderPresets object必須ルール
→ prompts/RULES.md §12 treatment_end scenarioGroup
→ prompts/RULES.md §13 sickday situationFilter
→ prompts/RULES.md §14 thirdPanelSPlacement
→ prompts/RULES.md §15 addon 必須フィールド
→ prompts/RULES.md §16 scenario omit 禁止フィールド
→ prompts/RULES.md §20 addonsRef Source of Truth 原則
→ prompts/RULES.md §4 MANDATORY_PRESERVATION_TARGETS
→ PN6-Assembly.md addon.text 標準ルール / addon.group 標準変換表 / addon.uiVariant 保持ルール

## 位置づけ
完成 JSON の構造整合性を全項目検証する。
修正は行わない。報告のみ。

---

## 入力
- `data/modules/{moduleId}.json`（PN6 完成 JSON）
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（本文凍結照合用）
- `bridges/{moduleId}.md`（原稿。check Y の bridge P_ADDON 突合に使用）

### 大規模 JSON の読み込み手順（必須）

`data/modules/{moduleId}.json` は 2,000 行を超える場合がある。
全範囲を読み込むために以下の手順で分割 Read を行う:

```
Step 1: wc -l data/modules/{moduleId}.json  で総行数を確認する
Step 2: 2,000 行以内 → 1回の Read で完了（offset 不要）
        2,001 行以上 → 以下の通り分割 Read する:
          1回目: offset=0,    limit=2000
          2回目: offset=2000, limit=2000
          3回目: offset=4000, limit=2000（必要な場合）
          ... 総行数に達するまで繰り返す
Step 3: 最後の Read が空またはコンテンツなしになったら全範囲を確認済みとする
```

**末尾確認を省略しない（禁止）:**
scenarios[] の末尾 / addons.items / expressModes / searchConfig は
ファイルの後半部分に存在する。末尾側の Read を省略すると監査項目 N / G / E 等が
未確認になるため、**必ず全範囲を Read してから監査を開始すること**。

---

## 責務

各項目に `PASS` / `FAIL` / `NOT_CHECKED`（該当条件なし）を付ける。

---

### A. addonsRef 参照整合

```
対象: 全 scenarios[].addonsRef.P の各 addon id
確認: addons.items にそのキーが存在すること
不存在 → FAIL（参照切れ: {addon_id} in scenario {scenario_id}）
```

---

### B. drug.nameAliases 完全一致確認

← RULES.md §8

```
drug.nameAliases === drug.search.nameAliases
  ・エントリ数が一致すること
  ・順序が一致すること
  ・各エントリの表記が一致すること
不一致 → FAIL
```

---

### C. brandCatalog aliases 一致確認

```
各ブランドについて:
  brandCatalog.{brand}.aliases === brandCatalog.{brand}.normalizedAliases
  （エントリ数・順序・表記のすべて）
不一致 → FAIL（brand: {brand_name}）
```

---

### D. aliasToBrand 全 aliases 網羅確認

```
brandCatalog の各ブランドの全 aliases 値が
aliasToBrand のキーとして存在すること
不足キー → FAIL（missing: {alias}）
```

---

### E. groupKeyRegistry 整合

```
【正方向】composition.groupKeyRegistry が
全 scenarios[].mergePolicy.S.groupKey の値を包含すること
不足値 → FAIL（missing groupKey: {value}）

【逆方向】composition.groupKeyRegistry に存在するが、
どの scenarios[].mergePolicy.S.groupKey にも使われていない値 → CHECK（余剰 groupKey: {value}）
※ 余剰は即 FAIL ではなく CHECK として報告する。削除要否はユーザー確認。
```

---

### F. drugResolution.brandToTags 整合

**MUST_STOP（実機クラッシュ要因: DashboardClient が brandToTags[brand] を直接参照）**

```
1. drugResolution.brandToTags が object として存在すること
   → null / undefined / 欠落 → FAIL（MUST_STOP）

2. brandToTags のキーが drug.brandCatalog の全キーと完全一致すること
   → 片側のみに存在するキーがある → FAIL

3. 各値が string[]（配列）であること
   → null / string / number → FAIL

欠落または型不正は PN7 の他項目より優先して報告すること。
```

---

### G. addons.orderPresets 形式確認

← RULES.md §11

```
addons.orderPresets が object として存在すること
{} → PASS
配列・null・undifined → FAIL
```

---

### H. thirdPanelSPlacement 対象シナリオ確認

← RULES.md §14

```
injection module の場合:
  以下の3シナリオに thirdPanelSPlacement フィールドが存在すること:
    se_injection_site_induration_none
    se_hypo_none
    cp_good
  かつ enabled: true であること

上記3シナリオ以外に thirdPanelSPlacement が付与されていないこと

injection 以外のモジュール → NOT_CHECKED
```

---

### I. Phase 1 本文凍結照合

```
data/modules/{moduleId}.json の
  scenarios[].S / O / A / P が
  phase1_text_spine.json の対応テキストと完全一致すること

  addons.items[].text が phase1_text_spine の対応値と完全一致すること
  addons.items[].sectionTexts.* が phase1_text_spine の対応値と完全一致すること

不一致 → FAIL（scenario/addon id と不一致フィールド名を明記）
```

**I 補足: {{drug_subject}} プレースホルダー確認**

← RULES.md §9（O フィールドの薬剤名ルール）

`phase1_text_spine.json` が利用不可の場合でも、以下のルールで独立確認すること:

```
【O フィールド — 全シナリオ必須】
  全 scenarios[].O に {{drug_subject}} が含まれること
  固定薬剤名（ブランド名 / genericName / drugClass）が O に直書きされている → FAIL

【S / A / P フィールド — scenarioType 依存】
  以下のシナリオ分類では、S に {{drug_subject}} がなくても正常:
    - adherence 系（cp_good / cp_poor_* 等）
    - lifestyle_guidance 系
    - sickday 系
    - injection_technique_check 等の followup 系
  （これらは主語省略または状態報告が bridge 設計の意図であるため）

  上記以外（treatment_start / treatment_adjustment / side_effect / treatment_end 系）の
  S / A / P には {{drug_subject}} が含まれることを確認すること。
  欠落の場合は FAIL ではなく CHECK として報告する（bridge 本文凍結との一致を優先するため）。

不一致 → FAIL（scenario id と欠落フィールドを明記）
主語省略該当シナリオの S への {{drug_subject}} 欠落 → PASS（正常）
```

---

### J. scenario id 重複確認

```
scenarios[].id がすべてユニークであること
重複 → FAIL（重複 id: {id}）
```

---

### K. addon id 重複確認

```
addons.items のキー（addon id）がすべてユニークであること
重複 → FAIL（重複 id: {id}）
```

---

### L. treatment_end scenarioGroup 確認

← RULES.md §12

```
id=end_improved → scenarioGroup: "end_improved"
id=end_insufficient_effect → scenarioGroup: "end_insufficient_effect"
id=end_ineffective → scenarioGroup: "end_ineffective"
不一致 → FAIL
```

---

### M. sickday situationFilter 確認

← RULES.md §13

```
scenarioType: sickday のシナリオの situationFilter が ["sickday"] であること
["general", "sickday"] ではないことを確認する
不一致 → FAIL
```

---

### N. addon 必須フィールド確認

← RULES.md §15

```
全 addons.items の各エントリに以下が存在すること:
  key / id / title / group / targetSection / text /
  clinicalTags / counselingTags / workflowTags / evidenceRefs / intentTags / tone
欠落 → FAIL（addon: {id}, 欠落フィールド: {field}）
```

---

### P. addon 未参照確認（接続漏れ）

← RULES.md §15

```
全 addons.items のキー（= addon id）が、
少なくとも 1 つの scenarios[].addonsRef.P に含まれていること

未参照 addon id → FAIL（unreferenced addon: {addon_id}）
```

備考: intentional orphan（意図的に未接続）を許容する仕組みは現状ない。
addon を追加した場合は必ずいずれかのシナリオの addonsRef.P に登録すること。

---

### R. persona 存在確認

```
persona は Future Expansion であり、docs/DEVELOPMENT_STANDARD.md §10 の F5
（Future Expansion を Validator / 監査工程の FAIL 条件にしない）に該当する。

top-level に persona フィールドが存在するかを記録する
（存在する場合は defaultStyle / availableStyles / styleProfiles の有無も記録する）
欠落 → FAIL としない（記録のみ）

現状、data/modules/ の一部モジュール（dm_insulin_intermediate / dm_insulin_regular）が
persona を持たないが、これは FAIL ではない。

参照: docs/DESIGN_PRINCIPLES.md DP-13 / docs/DEVELOPMENT_STANDARD.md §10
```

---

### S. composition.sMergePolicy 存在確認

```
composition.sMergePolicy は現在 Owner Decision Required であり、
Future Expansion / Legacy いずれとも確定していない。
位置づけが確定するまで FAIL 条件としない。

composition.sMergePolicy が存在するかを記録する
（存在する場合は unit / conflictStrategy / withinDomainStrategy の3フィールドの有無も記録する）
欠落 → FAIL としない（記録のみ）

参照: docs/DEVELOPMENT_STANDARD.md §10
```

---

### T. xStructured 構造確認

← RULES.md §17 Structured.role 確立済み語彙

```
全 scenarios[].SStructured / AStructured / PStructured の各アイテムについて:
  - `text` フィールドが存在すること
  - `content` フィールドが存在しないこと（禁止）
  - id / role / transform / safety / lockTerms / notes が存在すること
  - role が以下の確立済み語彙であること（未定義 role は FAIL）
違反 → FAIL（scenario id / field / item id を明記）
```

**T 監査: SStructured.role 確立済み語彙（許可）:**

| role 値 | 適用対象 |
|---|---|
| `treatment_start_reason` | treatment_start 系の S 行 |
| `dose_adjustment_reason` | treatment_adjustment 系の S 行 |
| `side_effect_status` | sideEffectPresence=absent_or_not_observed |
| `side_effect_presence` | sideEffectPresence=present_\* |
| `adherence_status` | adherence 系 / lifestyle / sickday / followup 系 |
| `treatment_end_reason` | treatment_end 系の S 行 |

**T 監査: AStructured.role 確立済み語彙（許可）:**

| role 値 | 適用対象 |
|---|---|
| `treatment_assessment` | 汎用（treatment_start / adjustment / adherence / lifestyle 等） |
| `side_effect_assessment` | side_effect 系の A 行 |
| `adherence_assessment` | adherence 系 |
| `treatment_end_assessment` | treatment_end 系 |

**T 監査: PStructured.role 確立済み語彙（許可）:**

`drug_effect_explanation` / `side_effect_attention` / `side_effect_guidance` /
`dose_adjustment_guidance` / `treatment_end_guidance` / `adherence_guidance` /
`followup_guidance` / `lifestyle_guidance` / `administration_guidance` /
`sickday_guidance` / `urgent_consult_guidance`

**T 監査で必ず FAIL にする禁止 role:**

| role | 禁止スコープ | 代替 |
|---|---|---|
| `drug_status` | SStructured | scenarioType に応じた treatment_start_reason / dose_adjustment_reason / treatment_end_reason |
| `administration_instruction` | PStructured | `administration_guidance` |
| `followup_monitoring` | PStructured | `followup_guidance` |
| `content` フィールド混入 | 全 Structured | `text` フィールドを使用すること |

**SStructured.role 追加禁止語彙（ERROR）:**
`treatment_adjustment_reason` / `adherence_observation` / `side_effect_observation` /
`symptom_observation` / `sickday_status` / `followup_status`

**AStructured.role 追加禁止語彙（ERROR）:**
`drug_mechanism` / `lifestyle_assessment` / `sickday_assessment` / `risk_assessment` / `clinical_guidance`

**確認手順:** 禁止 role 一覧を xStructured.role 全件に対して明示的にスキャンすること。
許可語彙に含まれない role が出現した場合は FAIL（未確認推測生成語彙）として報告すること。

---

### U. addon.text 内容確認

← PN6-Assembly.md addon.text 標準ルール / docs/JSON_STANDARD.md addon.text 薬剤名ルール

`phase1_text_spine` 等の中間キャッシュとの比較のみで済ませず、**当該モジュール自身の bridge ファイルを直接再読込して**比較すること。キャッシュが古い場合、bridge が既に更新されていても検出できない。

**比較は完全一致ではなく、以下の正規化手順を経た一致で判定する。**
bridgeは薬剤名を決め打ち表記する正本であり、JSONは選択薬剤自身を指す箇所を `{{drug_subject}}` に変換する仕様であるため、素の完全一致ではこの変換部分が常に不一致になってしまう。許可される変換は下記の1種類のみとする。

```
bridge本文（正本・決め打ち表記）
  ↓ 許可されたトークン変換（これ以外の変換は一切許可しない）:
    選択薬剤自身を指す薬効群・配合剤クラス名の決め打ち表記
      → {{drug_subject}} に置換
    （他剤・製剤カテゴリ等、選択薬剤以外を指す箇所は置換しない）
  ↓
正規化後の比較対象文字列
  ↓
JSON の text / sectionTexts.* と完全一致するか比較
```

トークン変換以外の差異（言い回しの変更・要約・語順変更・表現の簡略化など）は正規化とみなさない。その場合は bridge と JSON の内容乖離として FAIL とする。

```
全 addons.items の各エントリについて:
  当該モジュールの bridge から対応する P_APPEND（存在しなければ A_APPEND、それもなければ S_APPEND）を取得する
  bridge本文に対し、選択薬剤自身を指す薬効群・配合剤クラス名の決め打ち表記を {{drug_subject}} へ置換する
  置換後の文字列と JSON の text / sectionTexts.* が完全一致するか確認する
    一致しない場合 → FAIL（addon: {id}）
      - トークン変換以外の差異がある場合 → 内容乖離
      - bridge に決め打ち表記が残っているのに JSON が {{drug_subject}} 化されていない場合 → 未変換
      - JSON に {{drug_subject}} があるのに bridge 側で対応する決め打ち表記が特定できない場合 → 変換対象の誤認の疑い

  text が title フィールドの値と一致している場合 → FAIL（title を text に流用している）

  同一 addon id を複数モジュールが使用している場合:
    各モジュールの text は必ずそのモジュール自身の bridge から独立に正規化・比較する。
    「bridge を読まず、他モジュールの JSON や過去の生成結果を正本として利用する」行為を検出対象とする
    （結果として複数モジュールの text が同一文言になること自体は禁止しない。
      各モジュールが個別に自身の bridge と正規化後一致していれば PASS）
```

---

### V. addon.group 標準変換確認

← PN6-Assembly.md addon.group 標準変換表

```
全 addons.items の group 値が以下の変換表に従っていること:
  lifestyle_guidance  → counseling
  side_effect_guidance → sideEffects
  adherence_guidance  → adherence
  sickday_guidance    → sickday

未変換の値（変換前の bridge type がそのまま残っている）→ FAIL
変換表外の値が存在する場合 → CHECK（変換表に追加が必要な可能性）
```

---

### W. uiVariant 保持確認

← PN6-Assembly.md addon.uiVariant 保持ルール

```
phase3b_meta.json に uiVariant が記録されている addon:
  JSON の addons.items[]{addon_id}.uiVariant が存在すること
  かつ bridge の定義値と一致すること
  欠落または不一致 → FAIL

bridge に uiVariant が定義されていない addon:
  JSON に uiVariant フィールドが存在しないこと
  推測生成による uiVariant の付与 → FAIL

phase3b_meta.json に uiVariant 情報が記録されていない場合 → NOT_CHECKED
（phase3b_meta に uiVariant を記録することを次回以降推奨）
```

---

### Y. bridge P_ADDON ⇔ addonsRef 順序を含む完全一致 + AddonPanel 到達確認

← RULES.md §20 / §25（`scripts/audit-addon-bridge-chain.ts` と同一ロジック）

Aは JSON 内部の参照切れのみを確認する。Y は bridge 本文まで遡って比較する唯一の監査項目であり、A とは独立して必ず実行する。

Addon の表示順は bridge の P_ADDON 記載順をそのまま UI へ反映する設計（DP-10 / RULES.md §25）のため、集合一致だけでなく配列の順序一致も確認する。

```
対象: 全 scenarios[]
1. bridge の P_ADDON 記載一覧と scenarios[].addonsRef.P を、配列の順序を含めて突合する
   - bridge にあるが addonsRef に無い → FAIL（欠落: {addon_id} in scenario {scenario_id}）
   - addonsRef にあるが bridge に無い → FAIL（bridge外追加: {addon_id} in scenario {scenario_id}）
   - bridge に P_ADDON が無いシナリオに addonsRef が存在する → FAIL（bridge外追加）
   - 集合は一致するが並び順が異なる → FAIL（順序不一致: {addon_id} in scenario {scenario_id}）
2. addonsRef.P の各 id が addons.items に存在すること（A と重複する場合は一本化してよい）
3. lib/addonFilter.ts の getVisibleAddonKeys() と同じロジックで
   実際に AddonPanel へ表示されるキーとその順序を再現し、bridge 宣言分がすべて同じ順序で含まれることを確認する
   - 表示されないキーがある、または順序が異なる → FAIL（AddonPanel 到達不能または順序不一致: {addon_id}）
```

---

### Z. Addon Responsibility Consistency（Addon責務一貫性監査）

← RULES.md §22

目的: Addonが担う責務が、本文編集や周辺シナリオ整理の過程で失われていないかを監査する。
手段: 責務が近いシナリオ間でaddonsRef構成を比較し、責務では説明できない差分を検出する
      （近似シナリオ比較は目的ではなく手段である）。

```
対象: 同一モジュール内で「責務が近い」と判断できるシナリオ群

例)
  ・安定継続フォロー（例: type=side_effect かつ id末尾が `_none`、type=adherence の cp_good系）
  ・副作用なしフォロー
  ・同一治療段階の生活指導
  ・その他、設計上同一責務を持つシナリオ群

  上記は例示であり、領域（糖尿病・吸入薬・外用薬・漢方等）ごとに
  「責務が近い」の具体的な括り方は異なってよい。

1. 対象シナリオ群の addonsRef.P を横並びで比較する
2. あるシナリオにのみ存在するaddonについて:
   - requiredTags等、当該シナリオ固有の制約がある → 説明可能な差分 → PASS
   - 制約が無い汎用addon（例: group=counseling かつ requiredTags無し）にも
     かかわらず一部シナリオにのみ存在する → 説明できない差分 → CHECK
3. CHECK とは、Addon責務の変更として説明できない差分を指す。
   本文変更・文章整理・重複排除・表現変更のみを根拠として説明される差分は CHECK とする
   （= 「本文に書いたからaddonを消した／付けなかった」は説明にならない）。
   Addon自身の責務変化（対象患者像の変更・requiredTagsの見直し等）を根拠として
   説明できる差分のみが PASS となる。
4. CHECK は FAIL ではない。完全一致を要求する監査ではなく、
   「責務の欠落らしき差分」を人が確認するためのフラグである
```

---

### AA. Alias Field Bridge Parity（alias系フィールド同期監査）

← RULES.md §23

Y（addonsRef）と同じ構造の監査を、alias系フィールドに適用する。
詳細な機械比較は `scripts/audit-alias-bridge-chain.ts` に委譲し、
本チェックでは対象範囲と判定基準のみを定義する（PN7自体を肥大化させない）。

```
対象:
  - brandCatalog[brand].aliases
  - brandCatalog[brand].normalizedAliases
  - drug.aliasToBrand
  - drug.nameAliases
  - drug.search.nameAliases
  - drug.search.exactAliases

1. npx tsx scripts/audit-alias-bridge-chain.ts を実行する
2. 出力された不整合はすべて bridge⇔JSON の同期漏れとして扱う
3. 修正方針は RULES.md §23 に従う（機械的にどちらかを勝たせず、
   内容を確認したうえでbridge/JSONいずれを直すか判断する）
4. drug.search.prefixAliases は runtime から参照されない情報的フィールドのため、
   本チェックの対象外とする（moduleValidator の別チェックで形式のみ確認する）
```

---

### AB. brandCatalog displayGenericName 責務確認

← docs/JSON_STANDARD.md JS-A-drug「brandCatalog エントリのスキーマ」（正本。責務の詳細説明はここでは繰り返さない）
← RULES.md §21

機械的に検証可能な項目は ModuleValidator（`DISPLAY_GENERIC_NAME_MISSING` / `_EMPTY` / `_SALT_COPY`）が
ビルド時に強制する。本項目はそれに加えて、bridge との突合と、機械検証だけでは判断できない
「値の質」を人が確認するためのものである。

```
対象: 全 brandCatalog エントリ

1. bridge⇔JSON 完全一致（機械確認可能）
   brandCatalog[brand].genericName と .displayGenericName が、当該モジュールの
   bridge の同ブランド定義値と完全一致すること
   不一致 → FAIL（brand: {brand_name}, field: genericName|displayGenericName）

2. ModuleValidator 準拠（参照確認）
   当該モジュールで DISPLAY_GENERIC_NAME_MISSING / _EMPTY / _SALT_COPY が
   発生していないこと（`npm run build` のバリデーション出力で確認する）
   発生 → FAIL

3. 値の質（人による判断・機械検証不可）
   displayGenericName が、機械的な塩類名除去ではなく bridge 執筆時に人間が
   確定した自然な患者向け表示名になっていること
   （例: 単純な接尾辞削除では説明できない表記・配合剤の区切り方等、
   人間の判断が介在したと合理的に読み取れること）
   機械生成の疑い・不自然な表記 → CHECK
```

CHECK は FAIL ではない（Z と同様、要確認フラグ）。PN8 進行のブロッカーにはしないが、
チャット出力では内容を必ず報告する。

---

### O. scenario omit 禁止フィールド確認

← RULES.md §16

```
全 scenarios[] に以下が存在すること:
  id / scenarioType / scenarioGroup / S / O / A / P /
  mergePolicy / followupRef / intentTags /
  clinicalTags / counselingTags / workflowTags /
  SStructured / AStructured / PStructured
欠落 → FAIL（scenario: {id}, 欠落フィールド: {field}）
```

---

## 出力

**チャット出力（必須）:**

```
■ PN7 Cross Reference Audit
module: {moduleId}

A. addonsRef参照整合:                 PASS / FAIL
B. drug.nameAliases完全一致:           PASS / FAIL
C. brandCatalog aliases一致:           PASS / FAIL
D. aliasToBrand網羅:                  PASS / FAIL
E. groupKeyRegistry整合:              PASS / FAIL
F. drugResolution.brandToTags整合:    PASS / FAIL
G. addons.orderPresets形式:           PASS / FAIL
H. thirdPanelSPlacement対象:         PASS / FAIL / NOT_CHECKED
I. Phase1本文凍結照合:                PASS / FAIL
J. scenario id重複なし:               PASS / FAIL
K. addon id重複なし:                  PASS / FAIL
L. treatment_end scenarioGroup:       PASS / FAIL
M. sickday situationFilter:          PASS / FAIL
N. addon必須フィールド:               PASS / FAIL
O. scenario omit禁止フィールド:       PASS / FAIL
P. addon未参照確認:                   PASS / FAIL
R. persona存在:                       PASS / FAIL
S. composition.sMergePolicy存在:      PASS / FAIL
T. xStructured構造:                   PASS / FAIL
U. addon.text内容確認:                PASS / FAIL
V. addon.group標準変換確認:           PASS / FAIL
W. uiVariant保持確認:                 PASS / FAIL / NOT_CHECKED
Y. bridge P_ADDON⇔addonsRef一致:      PASS / FAIL
Z. Addon責務一貫性:                   PASS / CHECK
AA. alias系フィールド同期:            PASS / FAIL
AB. displayGenericName責務確認:       PASS / FAIL / CHECK

---
FAIL: {N} 件 / NOT_CHECKED: {N} 件 / CHECK: {N} 件

FAIL が 0 件 → PN8 へ進む
FAIL がある場合 → 差し戻し先 Phase を明記して報告する
```

FAIL がある場合は、差し戻し先 Phase と修正内容を具体的に示す。

**スクラッチパッド書き込み（必須）:**

Write ツールを使用して `/tmp/soap-build/{moduleId}/audit_report.json` に保存する。

```json
{
  "moduleId": "{moduleId}",
  "auditedAt": "phase7_complete",
  "results": {
    "A_addonsRef": "PASS",
    "B_nameAliases": "PASS",
    "C_brandCatalogAliases": "PASS",
    "D_aliasToBrand": "PASS",
    "E_groupKeyRegistry": "PASS",
    "F_brandToTags": "PASS",
    "G_orderPresets": "PASS",
    "H_thirdPanelSPlacement": "NOT_CHECKED",
    "I_textFreeze": "PASS",
    "J_scenarioIdUnique": "PASS",
    "K_addonIdUnique": "PASS",
    "L_treatmentEndGroup": "PASS",
    "M_sickdaySituationFilter": "PASS",
    "N_addonRequiredFields": "PASS",
    "O_scenarioRequiredFields": "PASS",
    "P_addonUnreferenced": "PASS",
    "R_persona": "PASS",
    "S_sMergePolicy": "PASS",
    "T_xStructured": "PASS",
    "U_addonText": "PASS",
    "V_addonGroup": "PASS",
    "W_uiVariant": "NOT_CHECKED",
    "Y_addonsRefBridgeMatch": "PASS",
    "Z_addonResponsibilityConsistency": "PASS",
    "AA_aliasFieldBridgeParity": "PASS",
    "AB_displayGenericNameResponsibility": "PASS"
  },
  "failCount": 0,
  "checkCount": 0,
  "verdict": "PASS"
}
```

`verdict` は `"PASS"` / `"FAIL"` のいずれか。PN8 はこのファイルを読んで判定する。
`Z_addonResponsibilityConsistency` / `AB_displayGenericNameResponsibility` が `"CHECK"` の場合は
`verdict` を FAIL にはしない（CHECK は要確認フラグであり、PN8 進行のブロッカーではない）。
ただしチャット出力では CHECK の内容を必ず報告する。

---

## 禁止事項

- `data/modules/{moduleId}.json` を修正しない
- 報告のみ行う
- FAIL を PENDING に格下げしない
- FAIL の根拠を曖昧にしない
- **A〜T の標準監査項目を独自の簡略版に置き換えない**（項目名・チェック内容は本ファイルの定義に完全準拠すること）

---

## 次工程へのハンドオフ

全項目 PASS（または NOT_CHECKED のみ残存）の場合: PN8 へ進む
FAIL がある場合: 該当 Phase を差し戻し。PN8 は開始しない。
