# P1-W2: P0-B.md カバレッジ調査

> 本文書は Phase 1 Architecture Consolidation P1-W2 の調査記録である。
> `prompts/P0-B.md`（旧体系・bridge → canonical 格納ルール定義工程）の全格納ルールが、
> vNext（PN1 + PN2 + PN3A + PN3B + PN4A + PN4B + PN5 + `prompts/RULES.md` §5 + その他 Current Standard）
> でカバーされているかを、フィールド単位で確定する。
> 本文書は調査記録であり、vNext・RULES へのルール追加は行っていない。

---

## 0. 調査方法

`prompts/P0-B.md`（541行）を全17規則セクション（`JSON_RULE_SCOPE` 〜 `OUTPUT_REQUIREMENTS`）にわたって精読し、各セクションから抽出できる「bridge → canonical JSON の格納ルール」をフィールド単位で列挙した。各ルールについて、対応する vNext 側の生成・検証工程を、実際のファイル内容の grep・読み込みによって特定した（推測によらない）。

**対象外とした項目**: P0-B.md の一部セクション（`JSON_RULE_SCOPE` / `OUTPUT_UNIT_RULE` / `BRIDGE_TO_JSON_MAPPING` の総論部分 / `OUTPUT_REQUIREMENTS`）は、bridge 要素の格納先を定めるフィールド単位の格納ルールではなく、**P0-B という文書自体の出力粒度・記述形式を定める手続き規定**である。これらはフィールド単位のカバレッジ判定になじまないため、下記の表には含めず §4 に別掲した。

---

## 1. カバレッジ対応表

| P0-B の格納ルール | vNext 対応先 | カバレッジ判定 |
|---|---|---|
| **SOURCE_OF_TRUTH_RULE**: bridge管理項目（scenario id/title/S/O/A/P/P_ADDON/P_APPEND/P_CLOSING/addon key/id/title/text/brand/alias/followup）は bridge を SSOT とする原則 | `docs/DESIGN_PRINCIPLES.md` DP-07（bridge SOT 原則）+ PN1「本文凍結宣言」 | 完全代替 |
| **MODULE_METADATA_MAPPING** — `moduleId` | PN1（`phase1_text_spine.json` の `"moduleId": "{bridge から取得}"`） | 完全代替 |
| 同 — `moduleVersion` / `categoryPath` | PN2（出力セクションに明記） | 完全代替 |
| 同 — `composition` / `drug` / `template` / `display` / `defaults` / `drugResolution` / `regulatory` / `topical` | PN2（`drug セクション生成` / `composition セクション生成` / `display / template / persona / regulatory / topical` / `defaults セクション` / `drugResolution セクション`） | 完全代替 |
| 同 — `risks` / `searchConfig` / `ui` / `tagCatalog` / `expressModes` | PN5（`risks セクション` / `searchConfig セクション` / `ui セクション` / `tagCatalog セクション` / `expressModes セクション`） | 完全代替 |
| 同 — `persona`（top-level） | PN5（`persona セクション（必須）`）※ PN6-Assembly.md の入力一覧では phase2_drug_header.json（PN2）由来としても言及されており、PN2/PN5 間で記述の重複が見られる。**本調査の範囲外の内部不整合として参考記録するのみとし、判断しない** | 完全代替（生成先はPN5と特定できるため） |
| **BRAND_ALIAS_MAPPING**: `drug.brandCatalog` / `aliasToBrand` / `aliases` / `normalizedAliases` / `search.exactAliases` / `search.prefixAliases` / `search.nameAliases` | PN2（`drug セクション生成`、bridge の `brandCatalog:` / `aliasToBrand:` から生成）+ PN7 item B/C/D/AA + `scripts/audit-alias-bridge-chain.ts` | 完全代替 |
| 同 — `drug.nameAliases`（`drug.search.nameAliases` との完全一致・複写生成ルール） | PN2（必須整合確認 1）+ `prompts/RULES.md` §8 | 完全代替 |
| 同 — **Search Token**（`drug.search.commonSearchTokens` / `formulationSearchTokens`。bridge明示分のみ格納・alias系フィールドへの非展開） | **なし**。PN2 / PN5 のいずれにも Search Token を生成する指示が存在しない（grep 0件で確認済み）。alias系フィールドへの混入検出（`SEARCH_TOKEN_ALIAS_POLLUTION`）は `lib/moduleValidator.ts` に存在するが、これは生成規則ではなく事後検証であり、かつ `prompts/RULES.md` §4 で「監査未整備」と明記済みの3系統の一つと一致する | **未代替** |
| **SCENARIO_MAPPING**: `scenario.id` / `title` / `S` / `O` / `A` / `P` / `P_ADDON` / `P_CLOSING` | PN1（本文抽出・凍結） | 完全代替 |
| 同 — `scenario.globalId`（`{moduleId}.{scenario.id}` 規則） | PN3B（`"globalId": "{moduleId}.{id}"`） | 完全代替 |
| 同 — `scenarioType` / `scenarioGroup` | PN3A（判断）+ PN3B（適用） | 完全代替 |
| 同 — `scenarioTags` | PN3B（`scenarioTags の自動生成ルール`）/ `lib/types.ts:144` に型定義あり | 完全代替 |
| 同 — `followupRef` / `mergePolicy` | PN3A（判断）+ PN3B（適用） | 完全代替 |
| 同 — `SStructured` / `OStructured` / `AStructured` / `PStructured` | PN4A（治療系）+ PN4B（副作用/adherence/sickday/followup系） | 完全代替 |
| 同 — `intentTags` / `clinicalTags` / `counselingTags` / `workflowTags` | PN3A（判断）+ PN3B（適用） | 完全代替 |
| **ADDON_MAPPING**: `addons.items[].key` / `id` / `title` / `group` / `targetSection` / `text` / `intentTags` / `requiredTags` | PN1（text抽出）+ PN3A（group/uiVariant確定） | 完全代替 |
| 同 — `addons.orderPresets`（object必須・未使用時`{}`・preset key はbridge明示のみ） | PN5（`addons.orderPresets` セクション）+ `docs/DESIGN_PRINCIPLES.md` DP-08 | 完全代替 |
| 同 — type → group / targetSection 変換表（`lifestyle_guidance` / `side_effect_guidance` / `glycemic_guidance` / `sickday_guidance` / `adherence_guidance`） | `prompts/RULES.md` §5（P0-B の5値に加え `administration_guidance` を含む上位互換の表として存在。実測で確認済み） | 完全代替 |
| **ADDON_REFERENCE_MAPPING**: `P_ADDON` 参照 / `addonsRef` / 参照先存在確認 | PN1（抽出）+ PN3B（`addonsRef` 確定）+ PN7 item A（参照整合）/ item P（未参照検出）/ item Y（順序込み完全一致）+ `scripts/audit-addon-bridge-chain.ts` | 完全代替 |
| **FOLLOWUP_MAPPING**: `P_CLOSING` / `defaults.followup` / `defaults.followupProfiles` / `scenarios[].followupRef`（参照整合） | PN1（雛形抽出）+ PN2（`defaults.followupProfiles` 確定）+ PN3A/PN3B（`followupRef` 割当）+ `lib/moduleValidator.ts`（`FOLLOWUP_REF_BROKEN` / `FOLLOWUP_REF_MISSING` / `FOLLOWUP_SCOPE_VIOLATION`） | 完全代替（**参照整合のみ**。followupProfiles の**テキスト内容**の bridge 一致監査は `prompts/RULES.md` §4 で既に「監査未整備」と明記済み。本行はストレージ・参照ルールの代替可否のみを判定するため完全代替とする） |
| **STRUCTURED_MAPPING**: Model JSON非存在時は生成しない / text sync監査 | PN4A/PN4B（生成規則に同旨の制約あり）+ PN7 item T（xStructured構造確認） | 完全代替 |
| **PERSONA_MAPPING**: `persona` / `availableStyles` / `styleProfiles`（本文生成禁止・格納ルールのみ） | PN5（`persona セクション（必須）`） | 完全代替 |
| **THIRD_PANEL/EXPRESS_MAPPING**: `thirdPanelSPlacement` | `prompts/RULES.md` §14（標準ルール）+ PN3A/PN3B（適用） | 完全代替 |
| 同 — `expressModes[]`（`defaultBrandName` / `defaultScenarioId` / `genericBrandName` 等の参照制約含む） | PN5（`expressModes セクション`）+ PN2（`genericBrandName` 生成規則） | 完全代替 |
| **PRESERVATION_FIREWALL**（Count/Identity/Brand-Alias/Text/Followup/Reference/Structure/Persona の mandatory diff 総覧） | 上記各行の集約であり新規の格納ルールを含まない。vNext における実質的な mandatory diff 相当は PN7（26項目 A〜AB）が担う | 完全代替（上記各行の再掲のため独立判定はしない） |
| **CHECK_ERROR_PENDING_RULES**（ERROR/PENDING/CHECK候補の定義） | `prompts/RULES.md` §3（ERROR / PENDING / CHECK 共通定義） | 完全代替 |
| **PROHIBITED_INFERENCE**（alias推定生成禁止・本文補完禁止 等） | `prompts/RULES.md` §2（PROHIBITED_UNIVERSAL） | 完全代替 |

---

## 2. 対象外とした手続き規定（P0-B 自身の文書仕様であり、格納ルールではない）

| P0-B の規定 | 対象外とする理由 |
|---|---|
| `JSON_RULE_SCOPE` | P0-B 自身の出力文書（JSON RULE）の記載範囲（module単位/scenarios_only等）を定める規定であり、bridge → JSON の格納先を定めるものではない |
| `OUTPUT_UNIT_RULE` | 同上。P0-B 出力の分割単位の規定 |
| `BRIDGE_TO_JSON_MAPPING`（総論部分） | 「格納ルールを記載する際に含めるべき列（JSONパス・型・必須任意等）」という記述フォーマットの規定であり、個別フィールドの格納先そのものではない（個別フィールドは他セクションで規定済み） |
| `OUTPUT_REQUIREMENTS` | P0-B 出力文書の記述要件（JSONパス表記・型明示等）の規定 |

vNext はこれらに相当する独立文書を持たないが、これは vNext が PN1〜PN8 という実行工程へ直接出力する設計であり、P0-B のような中間「JSON RULE」文書を経由しないためである（`prompts/vNext/HANDOFF.md` §1参照）。中間文書の形式規定が不要になったことは、格納ルールの欠落ではない。

---

## 3. カバレッジ判定の集計

```
完全代替: 27件
一部欠落:  0件
未代替:    1件（Search Token 生成規則）
```

---

## 4. W14 処理結論

**判定: STOP**

理由: 「Search Token（`drug.search.commonSearchTokens` / `formulationSearchTokens`）の生成規則」が vNext のいずれの工程（PN2 / PN5）にも存在せず、**未代替**と判定された。P1設計書 v2.3 の決定表は「一部欠落または未代替を1件でも含む場合、`prompts/vNext/PN2-Drug-Header.md` および `prompts/RULES.md` の処理をいずれも実行せず STOP する」と定めている。この決定表を機械的に適用した結果、STOP となる。

```
prompts/vNext/PN2-Drug-Header.md:6  → 処理しない（STOP）
prompts/RULES.md（P0-B.md 正本指定行） → 処理しない（STOP）
```

**補足（判断ではなく事実の記録）**: Search Token 生成規則の欠落は、本調査以前から `prompts/RULES.md` §4（P1-W1 で確定済みの版）が「監査未整備」として既に明記している事実と一致する。すなわち今回の未代替判定は新規の発見ではなく、既存の記録と整合する結果である。この欠落を vNext へ補うかどうかは設計判断であり、本調査では判断しない。

※ 本結論は P1設計書 v2.3「W14 処理方法の決定表」の機械的適用であり、Tier2 による判断を含まない。
