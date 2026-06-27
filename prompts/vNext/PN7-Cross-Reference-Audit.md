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
→ prompts/P1.md Rule 4

## 位置づけ
完成 JSON の構造整合性を全項目検証する。
修正は行わない。報告のみ。

---

## 入力
- `data/modules/{moduleId}.json`（PN6 完成 JSON）
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（本文凍結照合用）

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
scenarios[] の末尾 / addons.items / expressModes / searchConfig / index は
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
composition.groupKeyRegistry が
全 scenarios[].mergePolicy.S.groupKey の値を包含すること
不足値 → FAIL（missing groupKey: {value}）
```

---

### F. drugResolution.brandToTags 整合

```
drugResolution.brandToTags のキーが drug.brandCatalog のキーと一致すること
各値が string[] であること
不一致 / 非 string[] → FAIL
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

---
FAIL: {N} 件 / NOT_CHECKED: {N} 件

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
    "O_scenarioRequiredFields": "PASS"
  },
  "failCount": 0,
  "verdict": "PASS"
}
```

`verdict` は `"PASS"` / `"FAIL"` のいずれか。PN8 はこのファイルを読んで判定する。

---

## 禁止事項

- `data/modules/{moduleId}.json` を修正しない
- 報告のみ行う
- FAIL を PENDING に格下げしない
- FAIL の根拠を曖昧にしない

---

## 次工程へのハンドオフ

全項目 PASS（または NOT_CHECKED のみ残存）の場合: PN8 へ進む
FAIL がある場合: 該当 Phase を差し戻し。PN8 は開始しない。
