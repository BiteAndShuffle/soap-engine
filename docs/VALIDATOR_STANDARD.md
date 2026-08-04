# VALIDATOR STANDARD

SOAP Engine における Validator の責務境界・分類基準・運用ルールを定めた標準書。

---

## 変更契機

（本節の要素・原則は `docs/DEVELOPMENT_STANDARD.md` §11 が定める）

本節は、実装の状態を写し取る 2 つの台帳 —— **Appendix: errorCode 一覧** と
**Appendix B: KNOWN_INTENTIONAL_WARNINGS** —— を対象とする。

### Appendix: errorCode 一覧

**起点**: 次のいずれかを行ったとき、本 Appendix は古くなる。

- `lib/moduleValidator.ts` または `lib/crossModuleValidator.ts` へ errorCode を追加した
- 既存 errorCode を削除した、または errorCode 名を変更した
- 既存 errorCode の severity（ERROR / WARNING）を変更した
- 既存 errorCode の分類（Structural / Reference / Design Rule）を変更した

**更新対象**

- 本 Appendix の該当行（errorCode / ERROR・WARN / 分類）。severity を変更した場合は、
  変更が §5「判定基準」を満たすことを確認した上で更新する

### Appendix B: KNOWN_INTENTIONAL_WARNINGS

**起点**: 次のいずれかを行ったとき、本 Appendix B は古くなる。

- Validator が検出する WARNING を意図的に残存させる判断を行った
- 登録済みエントリの WARNING が解消した（対象ブランド・module の追加による自然解消を含む）
- 登録済みエントリの status または対応方針を変更した

**更新対象**

- 本 Appendix B の該当エントリ（新規登録 ／ 解消時の削除 ／ status・対応方針の更新）

### 対象外

- `prompts/vNext/HANDOFF.md` §6「ModuleValidator 既存 WARNING」 —— 同節は
  **Appendix B を正本と宣言し、台帳を二重管理しない旨を明記している**。よって
  Appendix B の更新に追随しない（追随させると二重管理が復活する）

### 検証

- 本 Appendix の全 errorCode が `lib/moduleValidator.ts` / `lib/crossModuleValidator.ts`
  に実在し、かつ両ファイルの全 errorCode が本 Appendix に存在すること（双方向の照合）
- Appendix B の各エントリが、`npm run build` 実行時に実際に出力される WARNING と
  対応していること

---

## 1. Validator の目的

### 保証すること

- **参照の存在**：あるフィールドが参照する ID・キーが、同一モジュール内（または全モジュール内）に存在すること
- **構造の健全性**：必須フィールドの存在・型の正当性・一意性制約・フィールド間の同期
- **モジュール境界の整合**：クロスモジュール横断で一意であるべき識別子の重複なし

### 保証しないこと

- **医療記録の内容的適切性**（S/O/A/P の文言が医療記録として正しいか）
- **設計解釈を要するルール**（「このフィールドの値はあのフィールドと一致すべき」という意味的制約）
- **Runtime での描画・検索品質**（サジェストの出力順、persona 適用の正確さ）
- **ドメイン知識を必要とする判断**（処方指示の妥当性、成分名の正確さ）
- **ブランドコンテキスト依存の正当性**（brandToTags の値が TAG_TO_GENERIC_NAME 上で医学的に正しいか）

Validator は「機械的に判定できること」のみを保証する。設計解釈・ドメイン判断・Runtime 品質は P3/P4 と人間レビューが担う。

---

## 2. Responsibility Matrix

| 分類 | 説明 | Validator | P2B | P3 | P4 | 人間レビュー |
|---|---|---|---|---|---|---|
| Reference Integrity | A が参照する B が存在する | **主担当** | - | 補完 | - | - |
| Structural Integrity | 型・必須フィールド・一意性・フィールド同期 | **主担当** | - | - | - | - |
| Design Rule | 運用ルール・設計思想・ドメイン制約 | 警告のみ可 | - | **主担当** | - | 最終確認 |
| Runtime Compatibility | Runtime での動作検証 | - | - | - | **主担当** | - |
| Human Review | 医療記録品質・成分名正確性・分類妥当性 | - | - | P3 補完 | - | **主担当** |

**原則**: Validator は Reference / Structural の2分類のみ ERROR にできる。Design Rule の ERROR 化は禁止（後述）。

---

## 3. ModuleValidator の責務（check 1〜34。枝番 3a / 3b / 13b を含む全 37 check）

`lib/moduleValidator.ts` — 単一モジュールスコープ。

### 3-A. ERROR（isWarning: false）

build/runtime を停止させる致命的問題。

| check | errorCode | 分類 | 内容 |
|---|---|---|---|
| 1 | `MISSING_MODULE_ID` | Structural | `moduleId` の存在・非空 |
| 3 | `MISSING_PRIMARY_DISPLAY_NAME` | Structural | `drug.search.primaryDisplayName` の存在 |
| 3a | `NAME_ALIASES_MISMATCH` | Structural | `drug.nameAliases` と `drug.search.nameAliases` の SSOT 同期 |
| 4 | `ADDON_KEY_MISMATCH` | Structural | `addons.items[key].key` がマップキーと一致すること |
| 5 | `ADDON_REF_BROKEN` | Reference | `scenarios[].addonsRef.*` → `addons.items` |
| 6 | `PANEL_ORDER_MISMATCH` | Reference | `ui.panelOrder[]` → `ui.panels[].id` |
| 7a | `ORDERPRESETS_MISSING` | Structural | `addons.items` 存在時に `orderPresets` が必須 |
| 7b | `ORDERPRESETS_TYPE_INVALID` | Structural | `addons.orderPresets` が object 型であること |
| 7c | `ADDON_REF_BROKEN` | Reference | `addons.orderPresets[*]` → `addons.items` |
| 13 | `BRAND_CATALOG_MISMATCH` | Reference | `drug.brandNames` と `drug.brandCatalog` キー集合の双方向一致 |
| 17a | `EXPRESS_MODE_MISSING_FIELD` | Structural | `expressModes[]` の必須5フィールド存在 |
| 17b | `EXPRESS_MODE_REF_BROKEN` | Reference | `expressModes` 内の `defaultBrandName`/`scenarioCandidates`/`defaultScenarioId` → `brandCatalog`/`scenarios[].id` |
| 18 | `MERGE_POLICY_GROUPKEY_INVALID` | Reference | `mergePolicy.S.groupKey` → `composition.groupKeyRegistry` |
| 19 | `LOCALINPUT_SCENARIOID_BROKEN` | Reference | `display.localInput.applyScenarioIds[]` → `scenarios[].id` |
| 20 | `DRUGRESOLUTION_REF_BROKEN` | Reference | `drugResolution.brandToTags` keys → `drug.brandCatalog` |
| 21 | `ALIAS_TO_BRAND_VALUE_BROKEN` | Reference | `drug.aliasToBrand` values → `drug.brandCatalog` keys |
| 22 | `FOLLOWUP_ADDONID_BROKEN` | Reference | `scenarios[].followup[].addonId` → `addons.items` |
| 23 | `SCENARIO_ID_DUPLICATE` | Structural | `scenarios[].id` のモジュール内一意性 |
| 24 | `SCENARIO_GLOBALID_DUPLICATE` | Structural | `scenarios[].globalId` のモジュール内一意性 |
| 25 | `SIDE_EFFECT_PRESENCE_INVALID` | Design Rule | `scenarios[].sideEffectPresence` が有効 7 値（`not_applicable` / `absent_or_not_observed` / `present_mild` / `present_moderate` / `present_change` / `present_dose_decrease` / `present_stop`）以外 |
| 32 | `SCENARIO_REQUIRED_TAG_UNREACHABLE` | Reference | `scenarios[].scenarioRequiredTags` → `brandCatalog[].handlingTags`（いずれかの brand が保持していること）。`addons.items[].requiredTags` の到達可能性チェック（check 15、WARNING）とは独立。タグ typo によるシナリオのサイレント非表示を防ぐため ERROR |
| 33 | `DISPLAY_GENERIC_NAME_MISSING` | Structural | `brandCatalog[brand].displayGenericName` の存在。通常UIが参照する表示用一般名のSSOTであり、欠落を許すと `genericName`（塩類名含む正式名称）への暗黙フォールバックが復活しうるため ERROR |
| 34 | `DISPLAY_GENERIC_NAME_EMPTY` | Structural | `brandCatalog[brand].displayGenericName` が空文字・空白のみでないこと |
| 35 | `DISPLAY_GENERIC_NAME_SALT_COPY` | Design Rule | `genericName` が塩類名・水和物等の技術的修飾語を含み、かつ `displayGenericName` と完全一致（`genericName` をそのままコピーした旧アンチパターン） |

### 3-B. WARNING（isWarning: true）

build は継続するが、コンソールに出力される問題。

| check | errorCode | 分類 | 内容 |
|---|---|---|---|
| 2 | `MISSING_MODULE_VERSION` | Structural | `moduleVersion` の存在 |
| 3b | `SEARCH_TOKEN_ALIAS_POLLUTION` | Design Rule | `formulationSearchTokens`/`commonSearchTokens` が alias フィールドに混入 |
| 8 | `FOLLOWUP_REF_BROKEN` | Reference | `scenarios[].followupRef` → `defaults.followupProfiles`（参照先が存在しない） |
| 9 | `TAG_NOT_IN_CATALOG` | Reference | `*Tags[]` → `tagCatalog.*` |
| 10 | `ADDON_SCOPE_VIOLATION` | Design Rule | `addon.text` に医療判断語を含む |
| 11 | `FOLLOWUP_SCOPE_VIOLATION` | Design Rule | `defaults.followup*` に医療判断語を含む |
| 12 | `SCENARIO_PRIORITY_INVALID` 他 | Structural | `priority`/`exclusiveGroup`/`combinable` の型 |
| 14 | `FOLLOWUP_REF_MISSING` | Structural | `followupProfiles` 存在時に `followupRef` が未設定 |
| 15 | `ADDON_REQUIRED_TAG_UNREACHABLE` | Reference | `addon.requiredTags` のタグが `brandCatalog.handlingTags` で到達不能 |
| 16 | `STRUCTURED_TEXT_MISMATCH` | Structural | `*Structured` 連結と S/A/P 本文の不一致 |
| 26 | `SCOMPOSITION_TEMPLATE_NONSTANDARD` | Design Rule | `sComposition.template` が `symptom_based` / `status_based` 以外の推測生成値（`adjustment_based` / `adherence_based` / `continuation_based` / `outcome_based` 等） |
| 27 | `SCOMPOSITION_NONSTANDARD_KEY` | Design Rule | `sComposition` に禁止キーが存在（`adjustmentCodes` / `adherenceCodes` / `outcomeCodes` / `severity`）|
| 28 | `SCOMPOSITION_INTENT_FORBIDDEN` | Design Rule | `sComposition.intent` が禁止値（`side_effect_absent` / `adherence_good` / `adherence_poor`）|
| 29 | `STRUCTURED_ROLE_FORBIDDEN` | Design Rule | `SStructured.role` の禁止語彙（`treatment_adjustment_reason` / `adherence_observation` / `side_effect_observation` / `symptom_observation` / `lifestyle_assessment`）または `AStructured.role` の禁止語彙（`drug_mechanism` / `lifestyle_assessment`）または `PStructured.role` の禁止語彙（`treatment_start_reason` / `followup_monitoring`）|
| 30 | `ROLE_MAPPING_NOTE_PRESENT` | Design Rule | `SStructured`/`AStructured`/`PStructured` の `notes` フィールドに `"ROLE_MAPPING_UNCLEAR"` が含まれる（P2B 未完了の暫定マッピングが残存）|
| 31 | — | — | PStructured.role 禁止語彙は check 29 の `STRUCTURED_ROLE_FORBIDDEN` で統合処理 |

**WARNING は Design Rule を Validator に持ち込む唯一の方法**。ただし WARNING は最終判断ではなく「P3/人間レビューへの情報提供」として位置づける。

---

## 4. CrossModuleValidator の責務

`lib/crossModuleValidator.ts` — 全モジュール横断スコープ。

### 現在実装済み（すべて ERROR）

| errorCode | 分類 | 内容 | runtime リスク |
|---|---|---|---|
| `MODULE_ID_DUPLICATE` | Structural | `moduleId` が `ALL_MODULES` 内で重複 | `allModules.find(m => m.moduleId === ...)` が最初の一致のみ返す。後続モジュールが永遠に到達不能。サイレント誤動作 |
| `SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE` | Structural | `scenario.globalId` が複数モジュールに存在 | `search.ts` コメントで「アプリ全体で一意」と明記。状態永続化・LazyLoad 拡張時に wrong scenario 選択の latent bug |

### 品質ゲートの設計方針

CrossModuleValidator は try-catch で握り潰さず、エラー時に throw して build/runtime を停止させる。`assertModuleValid` は各モジュールを try-catch で包んで継続するが、CrossModuleValidator は継続しない。理由：

- `MODULE_ID_DUPLICATE` が発生した状態で runtime を続行すると、重複した moduleId を持つモジュールのいずれかが永遠に参照不能になる
- この状態での SOAP 生成は「正しいモジュールを使っているつもりで別のモジュールを使っている」という誤動作を引き起こし、エラー表示が一切出ない

---

## 5. Validator に入れてはいけないもの

### 原則: 設計解釈を必要とするルールは Validator に入れない

**事例: `DRUGRESOLUTION_TAGS_MISMATCH`（実装中止）**

当初の想定ルール:
> `drugResolution.brandToTags[brand]` の値は `drug.brandCatalog[brand].handlingTags` と完全一致しなければならない

実装・テスト後に `dm_glp1ra_semaglutide_oral` で誤検知が発生した。調査の結果:

- `drugResolution.brandToTags`: 成分識別タグ（`TAG_TO_GENERIC_NAME` で一般名解決に使用）
- `drug.brandCatalog[brand].handlingTags`: 製品取り扱いタグ（`addonFilter` で addon 表示制御に使用）

**両者は別概念・別タグ名前空間であり、値の一致は要求されない**。P3.md の記述が誤っており、Validator 実装が誤った設計前提を固定化するところだった。

### なぜ誤検知が起きたか

1. ルールが書かれた時点では heparinoid/allergy モジュールのみ存在し、当該モジュールでは `brandToTags` と `handlingTags` が偶然一致していた
2. GLP-1 モジュール追加後、一致しない正当なケースが発生した
3. しかし Validator は「一致しない → ERROR」として正常データを拒絶した

### 判定基準

Validator に入れてよいルール:
- 「A が B を参照し、B が存在するかどうか」
- 「フィールドの型が X であるか」
- 「同一 ID が n 件以上存在するか」

Validator に入れてはいけないルール:
- 「A の値は B の値と一致すべき」（一致の根拠が設計解釈に依存する場合）
- 「このフィールドには特定の値のみ許容される」（値域がドメイン知識に依存する場合）
- 「このフィールドの組み合わせは医療的に正しいか」

**禁止基準の言語化**: ルールを機械的に適用したとき、正当な将来データを ERROR にする可能性があるなら、そのルールは Validator に入れず P3/P4 または人間レビューに委ねる。

### 適用例: `MISSING_PERSONA`（2026-07-29 追加）

**本 check は新しい Repository 規則を追加していない。** `persona` の必須性は
`docs/JSON_STANDARD.md` の JS-A（全 module 必須）が既に宣言しており、本 check はその
**既存宣言を機械的に担保する層を追加したにすぎない**。必須性の宣言元は引き続き
JSON_STANDARD であり、本文書ではない。

判定内容は「top-level キー `persona` が存在するか」のみである。内部構造（軸の値域・
profile の妥当性）には立ち入らない。persona の変換品質は §1「保証しないこと」のとおり
P4 / 人間レビューが担う。上記「Validator に入れてよいルール」のうち、必須フィールドの
存在確認（§1 構造の健全性）に該当する。

**Lifecycle State と severity 判定は独立している。** `module.persona` は canonical field
であり、その必須性は Canonical Requirement（JS-A）が決定する。一方、`Persona runtime
connection` は Lifecycle State が Future Expansion（未接続）である将来機能であり、
`docs/DEVELOPMENT_STANDARD.md` §10.3 に登録されている。**両者は直交する別軸であり、
Lifecycle State が Future Expansion であることは本 check の severity を左右しない**
（`docs/JSON_STANDARD.md` JS-00 ／ `docs/DEVELOPMENT_STANDARD.md` §10.1・§10.3 の
「F5 の適用範囲」）。

**severity（2026-08-01 に ERROR へ昇格済み）**: 本 check は導入時点で未充足のモジュールが
存在したため WARN として導入された。当該データは F-4b で補完され、全 module で検出 0 件と
なったため、**canonical 完成条件の欠落として ERROR へ昇格した**。

**昇格は build 停止を目的とするものではない。** canonical 完成条件を満たさない状態を warning
ではなく defect として分類するための変更である。build を停止するか否かは Validator ではなく
呼び出し側が決定する（§4「品質ゲートの設計方針」）。

なお本 check は Appendix の errorCode 一覧にのみ収載しており、§3-A / §3-B の番号付き
本文チェック表には未収載である。収載には check 番号の採番を要し、番号体系の扱いが
確定していないためである（暫定状態であり恒久的な運用ではない）。

---

## 6. P2B / P3 / P4 と Validator の関係

```
P2B（生成）→ P3（構造レビュー）→ P4（Runtime レビュー）→ Validator（機械判定）
```

| 工程 | 担当 | 判定主体 | スコープ |
|---|---|---|---|
| P2B | JSON 生成 | AI | bridge → JSON 変換。preservation・必須フィールド生成 |
| P3 | 構造レビュー | AI | 生成 JSON の参照整合・設計ルール適合・drugResolution 正当性 |
| P4 | Runtime レビュー | AI | 生成 JSON が runtime で正しく動くか。描画・addon フィルタ・persona |
| ModuleValidator | 単一モジュール機械判定 | コード | Reference + Structural + Design Rule（WARNING）の全 37 check（番号は 1〜34。枝番 3a / 3b / 13b を含む）。build 時に必ず通る |
| CrossModuleValidator | クロスモジュール機械判定 | コード | moduleId + globalId の横断一意性。build 時に必ず通る |
| `scripts/audit-addon-bridge-chain.ts` | bridge⇔JSON⇔runtime 横断監査 | コード | bridge の `P_ADDON` 記載まで遡って `addonsRef`（配列の順序を含む）と突合し、`getVisibleAddonKeys()` を実行して AddonPanel に実際に届くか・同じ順序で表示されるかまで確認する（DP-10 / RULES.md §25）。ModuleValidator / P3 は JSON 内部の整合のみを見るため代替できない。既存モジュール改修時は毎回実行する（`docs/IMPLEMENTATION_CHECKLIST.md` 参照） |
| PN7 check Z（Addon Responsibility Consistency） | 近似シナリオ間の addon 責務一貫性監査 | 現状は AI（PN7 実行時） | 責務が近いシナリオ間で `addonsRef` 構成を比較し、責務では説明できない差分を CHECK として報告する（RULES.md §22）。将来的に `scripts/audit-addon-bridge-chain.ts` 等への自動化を予定するが、現時点ではコード化されていない |
| `scripts/audit-alias-bridge-chain.ts` | alias系フィールドの bridge⇔JSON 同期監査 | コード | `brandCatalog[].aliases`/`normalizedAliases`・`aliasToBrand`・`nameAliases`・`search.nameAliases`・`search.exactAliases` がbridgeとJSONで一致しているかを確認する（RULES.md §23）。`scripts/audit-addon-bridge-chain.ts` とはモジュール一覧取得・出力形式（`scripts/auditShared.ts`）のみ共有し、パース対象は別（フレームワーク化は将来課題） |

### 具体的な責務分担例

| 判定内容 | 担当 |
|---|---|
| `addonsRef["foo"]` → `addons.items["foo"]` が存在するか | **ModuleValidator** (check 5) |
| bridge の `P_ADDON` と `addonsRef` が順序を含む完全一致か、AddonPanel に実際に同じ順序で表示されるか | **`scripts/audit-addon-bridge-chain.ts`**（PN7 check Y） |
| 近似責務シナリオ間で addon 構成に説明できない差分が無いか | **PN7 check Z**（将来的に自動化予定） |
| alias系フィールドがbridgeとJSONで一致しているか | **`scripts/audit-alias-bridge-chain.ts`**（PN7 check AA） |
| `brandToTags` のタグが `TAG_TO_GENERIC_NAME` で解決できるか | **P3** |
| `brandToTags` のタグが成分名として医学的に正しいか | **人間レビュー** |
| `scenario.S` が医療記録として適切な文言か | **P3** + **人間レビュー** |
| `moduleId` がすべてのモジュールで一意か | **CrossModuleValidator** |
| サジェスト結果の表示順が意図通りか | **P4** |
| persona 変換後の文体が適切か | **P4** + **人間レビュー** |

### P3 と Validator の補完関係

P3 は Validator の pass を前提に動作する。Validator が pass した状態でのみ P3 に渡す。Validator で検出できた問題は P3 で再チェックしない（二重チェックは不要）。

ただし、Validator WARNING（Design Rule 系）は P3 が最終判断層である。Validator の WARNING はヒント情報であり、P3 が「WARNING は誤検知である」と判断した場合は P3 の判断を優先する。

---

## 7. 将来候補

### Structural（単一モジュール内）

| 候補 | 内容 | 優先度 |
|---|---|---|
| `SCENARIO_ID_MISSING` | `scenario.id` が未定義 | 中（scenarioValidator でカバー済みか確認要） |
| `ADDON_P_APPEND_MISSING` | addon に `P_APPEND` が存在しない | 中（P3 が現在 ERROR とする） |
| `GENERIC_NAME_UNREACHABLE` | `brandCatalog[brand].displayGenericName` の正規化形が、module 単位・brand 単位いずれの alias にも存在しない brand の存在確認（Q-S1 Tier2/3 再発防止。「読みが1件もないか」の存在確認のみで内容判断は含まない） | 中（`docs/OPEN_DESIGN_QUESTIONS.md` Q-S1 参照。未実装） |

### Reference（単一モジュール内）

現行の Reference check は主要パスをほぼ網羅している。追加候補はほぼない。

### CrossModule

| 候補 | 内容 | 優先度 |
|---|---|---|
| `EXACTALIAS_SUPPRESS_CONFLICT` | `suppressOnExactHit=true` と `false` が同一 `exactAlias` で衝突 | 中（50モジュール超で重要） |
| `PRIMARYDISPLAYNAME_DUPLICATE` | `primaryDisplayName` が複数モジュールで完全一致かつ suppress 設定が異なる | 低 |
| モジュール総数・scenario 総数レポート | インデックスサイズの把握 | 低（REPORT ONLY） |

### Human Review に委ねるもの（Validator 化禁止）

| 内容 | 理由 |
|---|---|
| `brandToTags[brand]` の値が成分名として正しいか | 医療ドメイン知識が必要 |
| `handlingTags` の内容が製品特性として正しいか | 同上 |
| `categoryPath` の分類が適切か | 分類ツリーの妥当性判断 |
| `exactAliases` の網羅性（登録すべき読み仮名が漏れていないか） | 「何が正解か」は設計判断 |
| `addon.text` の内容が医療記録として適切か | P3 WARNING は補助。最終判断は人間 |

---

## Appendix: errorCode 一覧

### ModuleValidator（lib/moduleValidator.ts）

| errorCode | ERROR/WARN | 分類 |
|---|---|---|
| `MISSING_MODULE_ID` | ERROR | Structural |
| `MISSING_MODULE_VERSION` | WARN | Structural |
| `MISSING_PERSONA` | ERROR | Structural |
| `MISSING_PRIMARY_DISPLAY_NAME` | ERROR | Structural |
| `NAME_ALIASES_MISMATCH` | ERROR | Structural |
| `SEARCH_TOKEN_ALIAS_POLLUTION` | WARN | Design Rule |
| `ADDON_KEY_MISMATCH` | ERROR | Structural |
| `ADDON_REF_BROKEN` | ERROR | Reference |
| `PANEL_ORDER_MISMATCH` | ERROR | Reference |
| `ORDERPRESETS_MISSING` | ERROR | Structural |
| `ORDERPRESETS_TYPE_INVALID` | ERROR | Structural |
| `FOLLOWUP_REF_BROKEN` | WARN | Reference |
| `TAG_NOT_IN_CATALOG` | WARN | Reference |
| `ADDON_SCOPE_VIOLATION` | WARN | Design Rule |
| `FOLLOWUP_SCOPE_VIOLATION` | WARN | Design Rule |
| `SCENARIO_PRIORITY_INVALID` | WARN | Structural |
| `SCENARIO_EXCLUSIVE_GROUP_INVALID` | WARN | Structural |
| `SCENARIO_COMBINABLE_INVALID` | WARN | Structural |
| `BRAND_CATALOG_MISMATCH` | ERROR | Reference |
| `FOLLOWUP_REF_MISSING` | WARN | Structural |
| `ADDON_REQUIRED_TAG_UNREACHABLE` | WARN | Reference |
| `STRUCTURED_TEXT_MISMATCH` | WARN | Structural |
| `EXPRESS_MODE_MISSING_FIELD` | ERROR | Structural |
| `EXPRESS_MODE_REF_BROKEN` | ERROR | Reference |
| `MERGE_POLICY_GROUPKEY_INVALID` | ERROR | Reference |
| `LOCALINPUT_SCENARIOID_BROKEN` | ERROR | Reference |
| `DRUGRESOLUTION_REF_BROKEN` | ERROR | Reference |
| `ALIAS_TO_BRAND_VALUE_BROKEN` | ERROR | Reference |
| `FOLLOWUP_ADDONID_BROKEN` | ERROR | Reference |
| `SCENARIO_ID_DUPLICATE` | ERROR | Structural |
| `SCENARIO_GLOBALID_DUPLICATE` | ERROR | Structural |
| `SIDE_EFFECT_PRESENCE_INVALID` | ERROR | Design Rule |
| `SCOMPOSITION_TEMPLATE_NONSTANDARD` | WARN | Design Rule |
| `SCOMPOSITION_NONSTANDARD_KEY` | WARN | Design Rule |
| `SCOMPOSITION_INTENT_FORBIDDEN` | WARN | Design Rule |
| `STRUCTURED_ROLE_FORBIDDEN` | WARN | Design Rule |
| `ROLE_MAPPING_NOTE_PRESENT` | WARN | Design Rule |
| `SCENARIO_REQUIRED_TAG_UNREACHABLE` | ERROR | Reference |
| `DISPLAY_GENERIC_NAME_MISSING` | ERROR | Structural |
| `DISPLAY_GENERIC_NAME_EMPTY` | ERROR | Structural |
| `DISPLAY_GENERIC_NAME_SALT_COPY` | ERROR | Design Rule |
| `BRAND_DISPLAY_NAME_MISMATCH` | ERROR | Structural |
| `RESERVED_TAG_UNUSED` | WARN | Design Rule |
| `RESERVED_TAG_REACHABLE` | WARN | Design Rule |

### CrossModuleValidator（lib/crossModuleValidator.ts）

| errorCode | ERROR/WARN | 分類 |
|---|---|---|
| `MODULE_ID_DUPLICATE` | ERROR | Structural |
| `SCENARIO_GLOBALID_DUPLICATE_CROSS_MODULE` | ERROR | Structural |

---

## Appendix B: KNOWN_INTENTIONAL_WARNINGS

Validator が検出するが、意図的に残存させている WARNING の台帳。
`npm run build` / ModuleValidator 実行時にこれらが出力されても対応不要。

### KW-001

| 項目 | 内容 |
|---|---|
| **errorCode** | `ADDON_REQUIRED_TAG_UNREACHABLE` |
| **module** | `allergy_h1_antihistamine_eye_drops` |
| **対象** | `addons.items["addon_eye_drop_storage_cold"].requiredTags["cold_storage"]` |
| **status** | `INTENTIONAL_KEEP` |
| **理由** | H1点眼を ophthalmic module の base として使用しているため。現在の登録ブランド（アレジオン・ザジテン・パタノール・リボスチン）はいずれも室温保存であり `cold_storage` tag を持たないが、将来の冷所保存点眼薬 module 横展開時の canonical addon structure として保持する。 |
| **対応方針** | 削除しない。冷所保存点眼薬 module 追加時に `cold_storage` ブランドが登録されることで自然解消する。 |

### KW-002

| 項目 | 内容 |
|---|---|
| **errorCode** | `SEARCH_TOKEN_ALIAS_POLLUTION` |
| **module** | `derm_heparinoid_moisturizer_cream` / `derm_heparinoid_moisturizer_lotion` / `derm_heparinoid_moisturizer_ointment` / `derm_heparinoid_moisturizer_spray` / `allergy_h1_antihistamine_eye_drops` |
| **対象** | `drug.search.commonSearchTokens` が `prefixAliases` に混入している状態 |
| **status** | `INTENTIONAL_KEEP` |
| **理由** | DP-05（heparinoid 剤形検索分離原則）に基づく剤形分割検索の実装過程で生じた既知の重複。検索 runtime 側の dedupe 対応が完了するまでは、トークンを削除すると分割検索（例:「へぱ なんこう」）が機能しなくなる可能性がある。 |
| **対応方針** | 削除しない。search ロジック側の dedupe 対応時に併せて解消する。新規 module では `prompts/vNext/PN2-Drug-Header.md`「drug.search 検索トークンの生成規則」に従い、alias 系フィールドへ展開しないこと。 |
