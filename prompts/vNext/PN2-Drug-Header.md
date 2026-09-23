# PN2 — Drug Header（薬剤ヘッダー変換フェーズ）

## 参照
→ prompts/RULES.md §1 STANDARD_REFERENCE_PATHS
→ prompts/RULES.md §8 drug.nameAliases完全一致ルール

## 位置づけ
bridge ヘッダーセクション（SCENARIOS_START より前）を JSON 構造に変換する。
シナリオ本文・シナリオメタデータには一切触れない。

---

## 入力

- bridge.md のヘッダーセクション（moduleId から SCENARIOS_START の前まで）
- `/tmp/soap-build/{moduleId}/phase1_text_spine.json`（followupProfiles / defaultFollowupRef の読み取り）

---

## 責務

### drug セクション生成

bridge.md の `drug:` / `search:` / `nameAliases:` / `brandCatalog:` / `aliasToBrand:` から生成する。

**必須整合確認（生成と同時に確認すること）:**

1. `drug.nameAliases` と `drug.search.nameAliases` は完全一致させること
   - 順序・表記・エントリ数のすべてが一致すること
   - → RULES.md §8

2. 各ブランドについて `brandCatalog.{brand}.aliases` と `brandCatalog.{brand}.normalizedAliases` を完全一致させること

3. `aliasToBrand` が brandCatalog の全 aliases を網羅していること
   - 各ブランドの aliases の全値が aliasToBrand のキーとして存在すること

4. 生成した alias 系フィールド（aliases / normalizedAliases / aliasToBrand / nameAliases /
   search.nameAliases / search.exactAliases）は、bridge.md 側にも同じ内容で反映すること
   （JSON側だけの追加・変更は禁止 → RULES.md §23。機械検証は
   `scripts/audit-alias-bridge-chain.ts`）

**`drug.drugClass` の保持（必須・明示 preservation 対象）:**

本フィールドは bridge Header 由来の **preservation field** であり、derived metadata ではない
（`prompts/RULES.md` §4 MANDATORY_PRESERVATION_TARGETS「Drug header identifier」）。

- bridge Header の `drug.drugClass` に宣言された値を、**件数・順序・表記のいずれも変えず**
  canonical の `drug.drugClass` へ **exact preservation** で転記する。大文字小文字の変換・
  語形の言い換え（例: `SECOND_GEN` → `2nd_gen`）・略語化・別 token への改名・要素の追加削除をしない
- 以下から値を推測・導出してはならない: `moduleId` / `drug.route` / `drug.dosageForms` /
  `composition.classKey` / `composition.nodeKey` / `display.drugClassLabel` / 既存 canonical の前例
  （sibling module の値をそのまま流用しない）
- `composition.classKey` を `drug.drugClass` から導出しない。両者は別フィールド・別 consumer であり、
  `classKey` の導出規則は本ファイル「classKey 導出ルール」が正本である
- **bridge authoring 規約（UPPER_SNAKE）**: bridge が宣言する各値は `^[A-Z0-9]+(?:_[A-Z0-9]+)*$` に
  合致していなければならない。合致しない値を発見した場合、**canonical 側で自動修正・正規化しては
  ならない**。`PENDING` として停止し、bridge 側の修正可否をユーザーへ確認する
  （`prompts/RULES.md` §3 PENDING）
- **配列の要素数は規定しない。** 現行 corpus が 1 要素であることを理由に、要素数 1 を前提とした
  処理・検査・省略を行わない
- bridge が `drug.drugClass` について沈黙している場合の canonical 側の扱いは本規則の対象外である
  （requiredness は別 Owner Decision であり未確定。沈黙を理由に値を補完しないこと）

機械検証は `scripts/audit-drugclass-bridge-chain.ts`（PN7 item AK）。

**`drug.drugSpecificTags` の保持（必須・明示 preservation 対象）:**

本フィールドは bridge Header 由来の **preservation field** であり、derived metadata ではない
（`prompts/RULES.md` §4 MANDATORY_PRESERVATION_TARGETS「Drug header search metadata」）。

- bridge Header の `drug.drugSpecificTags` に宣言された token 配列を、**件数・順序・表記のいずれも
  変えず** canonical の `drug.drugSpecificTags` へ **exact preservation** で転記する
- **禁止**: 並べ替え（sorting）／重複除去（dedupe）／大文字小文字の変換／単数・複数形の統一／
  compound ⇔ atomic token の書き換え（例: `antihistamine` ⇔ `h1_antihistamine_oral`）／
  token の追加／token の削除／sibling module の値の流用
- 以下から値を推測・導出してはならない: `moduleId` / `drug.route` / `drug.drugClass` /
  `composition.classKey` / `composition.nodeKey` / `categoryPath` / `display.*` / 既存 canonical の前例
- **語彙の正しさを canonical 側で判定しない。** 既存 module に存在しない token であっても、
  bridge が宣言していればそのまま転記する（token 語彙の SSOT は存在しない）
- **要素数は規定しない。** 現行 corpus が 1〜11 要素であることを理由に、特定の要素数を前提とした
  処理・省略を行わない
- bridge 配列に重複 token が含まれる場合も、**canonical 側で黙って除去しない**（そのまま転記する）
- bridge が `drug.drugSpecificTags` について沈黙している場合の canonical 側の扱いは本規則の対象外
  である（requiredness は別 Owner Decision であり未確定。沈黙を理由に値を補完しない）

機械検証は `scripts/audit-drug-specific-tags-bridge-chain.ts`（PN7 item AL）。

### brandCatalog 表示名フィールドの責務（displayName / genericName / displayGenericName）

← docs/JSON_STANDARD.md JS-A-drug「brandCatalog エントリのスキーマ」（正本）

| フィールド | 責務 |
|---|---|
| `displayName` | 商品名 |
| `genericName` | 有効成分同一性を表す、剤形非依存の正規化済み基本成分名（DP-21）。塩類名・水和物等を保持するフィールドではない。**通常UIでは参照しない** |
| `displayGenericName` | 表示用一般名。**必須**。利用者向け／検索用の一般名表示のSSOT。必要に応じて剤形修飾を含み得る。通常UIにおける一般名表示のSSOT。検索候補・パンくず・SOAP本文・`{{drug_subject}}` が参照する |

本表は `brandCatalog` エントリ内のフィールドのみを対象とする。top-level の `drug.genericName` は
**薬効クラス名**であり（`display.subtitle` の生成元。後述）、本表の `genericName` とは別概念である。
両者の責務境界は後述「alias の責務境界」C を参照する。

**生成時の注意（MUST_STOP 相当）:**

- `genericName` は DP-21 に従い、塩類名・水和物等の技術的修飾語を含まない正規化済み基本成分名で確定すること（`メトホルミン塩酸塩` ではなく `メトホルミン`）。正式名称の忠実性を理由に塩類名・水和物表記を書き加えてはならない。詳細は `docs/JSON_STANDARD.md` JS-A-drug および `docs/DESIGN_PRINCIPLES.md` DP-21 を正本とする
- `displayGenericName` は全 brand に必須。省略・空文字は不可（ModuleValidator が ERROR として検出する）
- `genericName` への暗黙フォールバックは禁止。`displayGenericName` は常に独立した値として明示すること
- 実行時（UI/検索候補生成時）の文字列加工（塩類名の機械的除去等）で `displayGenericName` を代替してはならない。値は bridge で人間が確定したものをそのまま canonical JSON へ転記する
- `genericName` に塩類名・水和物等の技術的修飾語が混入し、かつ `displayGenericName` がそれと完全一致する場合は旧コピーパターン（塩／水和物再混入）であり、PN2 が機械的に補正するのではなく bridge へ差し戻して人間が確定すること

### genericKey 生成規則（任意フィールド）

← RULES.md §21（役割分離の原則）

`brandCatalog.{brand}.genericKey` は検索グルーピング判定専用のキーであり、無理に全ブランドへ設定する必要はない（省略時は `displayGenericName ?? genericName` へフォールバックする）。設定する場合は以下に従う。

- 命名規則: `{成分}_{系統/剤形差分}` のスネークケース（例: `insulin_lispro`, `tranilast_ophthalmic_pf`）
- 同一成分でも表示上区別したい製剤（PF製剤・ウルトラファースト製剤等）には別の `genericKey` を割り当てること
- 同一 `genericKey` を持つブランド同士は検索候補で同一成分グループとして展開されるため、臨床的に別グループとして扱うべき場合は必ずキーを分けること
- 配合剤には単剤の `genericKey` を流用せず、専用の単一文字列キーを割り当てること（例: `insulin_degludec_aspart_combo`）。単剤・配合剤間のクロス検索は現時点で非対応

### alias の責務境界（brand identity / generic identity / 薬効クラス名）

← `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）/ DP-18（alias複製境界とown-name優先原則）

alias 系フィールドには**性質の異なる 3 つの概念**が流れ込む。PN2 はそれぞれの格納先の境界を定め、
一般名検索そのものの挙動は DP-09 を正本として参照する（DP-09 の内容を本節へ複製しない）。

#### A. brand identity alias（`brandCatalog.{brand}.aliases` の責務）

`brandCatalog.{brand}.aliases` には、**その brand／製品自身を指す**別名のみを置く。具体的には:

- 正式名の表記揺れ（全角半角・記号・送り仮名等）
- 確立済みのかな読み・音写
- 実務で通用する略称
- 同一 brand を指す製品名バリアント

検索カバレッジを広げる目的で alias を推測生成・捏造しない。

#### B. brand-level generic identity（`brandCatalog[*].genericName` / `brandCatalog[*].displayGenericName`）

一般名（成分名）による検索到達性は **DP-09 の所管**であり、PN2 はその格納先の境界のみを定める。

- 通常の**単一成分 brand** では、generic identity の到達性は **module 単位の alias**
  （`drug.search.exactAliases` / `drug.search.nameAliases` / `drug.nameAliases`）で表現する
- **一般名検索を成立させる目的で、generic identity を `brandCatalog.{brand}.aliases` /
  `normalizedAliases` / `aliasToBrand` へ複製しない。** 単一成分 brand では
  `resolveAllHighPrecisionBrands()` の tier2 が `displayGenericName` 照合で当該 brand を
  解決するため、この複製は冗長であり、かつ「その一般名はその商品の別名である」という
  誤った意味を canonical へ固定する（DP-09 / DP-18）
- 到達性のために、実在しない一般名製品を `brandCatalog` へ作成しない（DP-09）

**本境界の対象外（既存の 2 条項。新設の例外ではない）:**

- **DP-09 配合剤条項** — brand-level generic identity が複数成分から構成され、tier2 の
  generic identity resolution のみでは個々の構成成分名から当該 brand へ解決できない場合は、
  構成成分の読みを当該 brand の `brandCatalog.{brand}.aliases` に保持してよい（`aliasToBrand` は
  RULES.md §10 / §23 の既存同期契約に従う）。これは到達性のための複製ではなく、
  成分名から brand を解決する唯一の経路である
- **DP-18 の generic-labeled brand** — 一般名をそのまま brand 名として持つエントリ
  （例: `エピナスチン点眼液`）の `aliases` は、その brand **自身の identity**（＝上記 A）であり、
  branded product へ複製された generic reachability ではない

判定の指針: 「その読みは**その brand 自身を指すか**（A・許容）」か、
「generic reachability を branded product 側へ**複製したものか**（B・不可）」かで区別する。

#### C. top-level `drug.genericName`（薬効クラス名。B とは別概念）

本 Repository の top-level `drug.genericName` は**薬効クラス名**であり
（例: `"ケミカルメディエーター遊離抑制薬系の抗アレルギー点眼薬"`）、
上記 B の brand-level generic identity とは**値空間も責務も異なる**。
DP-09 Generic Identity Search Principle の対象は `brandCatalog[*].genericName` /
`brandCatalog[*].displayGenericName` のみであり、top-level `drug.genericName` は対象外である。
両者を同一視して alias を生成してはならない。

#### 共通ルール（A / B いずれにも適用）

- 新規 alias を推測生成しない（RULES.md §2 PROHIBITED_UNIVERSAL）
- 既に確立済みの読みが同系統モジュールに存在する場合はそれを流用する（例: `ぐらるぎん` / `でぐるでく` は `dm_insulin_long_acting`、`あすぱると` は `dm_insulin_mixed_rapid_intermediate` で確立済み）。流用先は上記 A / B の境界に従って決める
- alias 追加の要否自体は人間判断（`docs/VALIDATOR_STANDARD.md` §5「exactAliases の網羅性は設計判断」）であり、機械的な網羅性チェックは行わない

### drug.search 検索トークンの生成規則（commonSearchTokens / formulationSearchTokens）

← `docs/DESIGN_PRINCIPLES.md` DP-05（heparinoid 剤形検索分離原則）/ `prompts/RULES.md` §2・§3

`drug.search.commonSearchTokens` / `drug.search.formulationSearchTokens` は、bridge の同名フィールドの記載をそのまま転記して生成する。

| フィールド | 生成元 | 内容 |
|---|---|---|
| `drug.search.commonSearchTokens` | bridge の `drug.search.commonSearchTokens:` 記載 | 成分名トークン（剤形横断で共通の読み） |
| `drug.search.formulationSearchTokens` | bridge の `drug.search.formulationSearchTokens:` 記載 | 剤形識別トークン（軟膏・ローション等の読み） |

**生成ルール:**

- bridge に明示された値のみを、記載順のまま転記する
- **bridge に記載がないフィールドは omit する**（空配列 `[]` を生成しない。PENDING にもしない）。剤形が 1 種類しかない薬剤では `formulationSearchTokens` は不要であり、欠落は正常な状態である（DP-05）
- bridge 未明示のトークンを推測生成しない（`prompts/RULES.md` §2 PROHIBITED_UNIVERSAL）
- **alias 系フィールドへ展開しない。** 具体的には `brandCatalog.{brand}.aliases` / `normalizedAliases` / `aliasToBrand` / `drug.nameAliases` / `drug.search.nameAliases` / `drug.search.exactAliases` のいずれにも、これらのトークンを複写・追加してはならない（`prompts/RULES.md` §3 ERROR 条件。`lib/moduleValidator.ts` の `SEARCH_TOKEN_ALIAS_POLLUTION` が WARNING として検出する）
- 検索トークンは alias ではない。分割検索（例:「へぱ なんこう」）は bridge 側で大量の alias を列挙するのではなく、本トークンと検索エンジン側の AND prefix match で吸収する設計である（DP-05）

**MUST_STOP 相当:**

- bridge に記載のないトークンを追加する必要があると判断した場合は、生成せず停止して報告する

### composition セクション生成

bridge の composition フィールドおよび同系統モジュールを参考に生成する。

**groupKeyRegistry は暫定空配列 `[]` としてよい。**
Phase 3A が完成次第、Phase 6 が確定値（groupKeyRegistry: Phase 3A 出力の全 groupKey ユニークリスト）に更新する。

**bridge に `composition:` セクションが存在しない場合のフォールバック（必須）:**

| フィールド | 導出元 | ルール |
|---|---|---|
| `composition.nodeKey` | `display.nodeKey`（bridge） | display.nodeKey をそのままコピー |
| `composition.nodeLabelShort` | `display.nodeLabelShort`（bridge） | display から投影 |
| `composition.nodeLabelLong` | `display.nodeLabelLong`（bridge） | display から投影 |
| `composition.domain` | `categoryPath[0]` から判断 | `"糖尿病"` → `"diabetes"` / `"アレルギー"` → `"allergy"` 等 |
| `composition.priority` | インスリン注射 → `"chronic"` | 慢性疾患薬は `"chronic"` として確定 |
| `composition.clinicalDomain` | `composition.domain` と同値 | `"diabetes"` 等 |
| `composition.sMergeDomain` | `composition.domain` と同値 | `"diabetes"` 等 |
| `composition.classKey` | 下記「classKey 導出ルール」参照 | 標準形式一致時のみ機械導出。それ以外は **PENDING** |

**nodeKey / classKey は bridge.composition から取得する。**
存在しない場合は上記フォールバック表に従う。

**classKey 導出ルール（2026-07-24 正式化）:**

bridge に `composition.classKey` の記載がない場合、`composition.nodeKey`（= `display.nodeKey` フォールバック値）が
既知の標準形式 `<classKey>_<route>` に一致するときに限り、`<route>` 部分を機械的に取り除いて `classKey` を導出してよい。
`route` は `drug.route` の値（`oral` / `injection` / `topical` / `ophthalmic` / `inhalation` 等）と一致していることを確認すること。

- 一致例: `nodeKey: "h1_antihistamine_ophthalmic"` かつ `drug.route: "ophthalmic"` → `classKey: "h1_antihistamine"`（末尾が route と一致する標準形式）
- 不一致例（機械導出せず PENDING とする）:
  - 配合剤（例: `nodeKey` が2成分名を連結した形式で、単純な `<classKey>_<route>` に分解できない）
  - `dual_mechanism` 等、nodeKey が単一 classKey + route の1:1構造になっていない module
  - nodeKey 末尾が `drug.route` の値と一致しない、またはそもそも route を示す語尾になっていない場合
- 上記いずれかに該当し標準形式と断定できない場合は、推測で classKey を確定せず `"PENDING"` として人間確認へ回す。同系統 JSON の classKey 命名を参考情報として提示してよいが、それをそのまま流用して確定してはならない。

**composition.sMergePolicy（必須・PN2が常に生成する固定値）:**

bridge の記載有無に関わらず、以下の固定値を composition に含める（bridge からは抽出しない、
全モジュール共通の model_managed 値。PENDING にしない）:

```json
"sMergePolicy": {
  "unit": "clinical_domain",
  "conflictStrategy": "separate_by_domain",
  "withinDomainStrategy": "groupKey_based_semantic_merge"
}
```

**JS-B 条件付き 4 key（新規 module では生成しない。current-generation policy）:**

次の 4 key は、**新規 module の canonical には生成しない**。

- `composition.canonicalSource`
- `composition.defaultSMergeLevel`
- `composition.domainPolicy`
- `composition.nodeIdentityPolicy`

- **family / route / domain / 配合剤かどうかで分岐しない。** すべての新規 module で一律に生成しない
- **bridge に同名・類似の情報があっても、新規 canonical へ転記しない**（bridge の
  `constitution.canonicalSource` は bridge 原稿を SSOT とする宣言文であり、
  `composition.canonicalSource` とは別物である）
- **`"PENDING"` placeholder としても生成しない**
- 本規則は新規生成のみを対象とする。**既存 canonical（4 key を保持する module）の値を削除・
  変更する指示ではない**
- 根拠: `docs/JSON_STANDARD.md` JS-B / `docs/DESIGN_PRINCIPLES.md` DP-03 の
  current-generation policy。「多剤合成対象 module」の判定条件は current Repository に存在せず、
  当該 4 key の runtime consumer も 0 件である。**これは 4 key の future lifecycle を確定する
  判断ではない**（`docs/OPEN_DESIGN_QUESTIONS.md` Q-F4 は PENDING のまま）

### display / template / persona / regulatory / topical

bridge の対応フィールドから移植する。

`template.urgentFlag` / `urgentCriteria` はモジュールの臨床特性に基づいて設定する。
参照: 同系統モジュール（dm_insulin_rapid_analog.json 等）。

**`template.handlingTags` / `template.reservedHandlingTags` の保持（必須・明示 preservation 対象）:**

この 2 フィールドは bridge Header に配列として記載されている場合、**値・順序とも一切変更せずそのまま転記する**。
「対応フィールドから移植する」という総称規則に埋没させず、以下を個別に守ること。

- `template.handlingTags` が bridge に存在する場合 → 全要素をそのままの順序で転記する。要素の追加・削除・言い換えをしない
- `template.reservedHandlingTags` が bridge に存在する場合 → 同様にそのまま転記する。**この配列は
  scenarioRequiredTags / addon.requiredTags が参照する到達不能タグを ERROR ではなく WARNING として
  扱うための宣言であり（`prompts/RULES.md` §27）、欠落すると到達不能タグが ERROR 化し build が停止する**
- bridge にいずれかのフィールドが存在しない場合 → canonical 側にも生成しない（空配列 `[]` を推測生成しない）
- 値の推測・要約・並べ替えは禁止

**`display.adjustmentExpression` の保持（必須・明示 preservation 対象）:**

本フィールドは bridge Header 由来の **preservation field** であり、derived metadata ではない。
`template.handlingTags` / `reservedHandlingTags` と同様、「対応フィールドから移植する」という
総称規則に埋没させず、以下を個別に守ること。

- bridge Header の `display.adjustmentExpression` に `increasePast` / `decreasePast` が記載されている
  場合 → 両文字列を canonical の `display.adjustmentExpression.increasePast` /
  `display.adjustmentExpression.decreasePast` へ **exact preservation** で転記する。
  正規化・言い換え・語尾変換・文法的な調整をしない
- bridge に `display.adjustmentExpression` が記載されていない場合 → canonical 側にも生成しない。
  「他 module が持っている」「同じ route だから」「Rapid で使うから」等を理由に補完しない
- 以下から値を推測・導出してはならない: `drug.route` / `drug.dosageForms` / `moduleId` /
  `drug.drugClass` / 既存 canonical の前例。`drug.route` は値を deterministic に導出できる
  根拠にはならない（route ごとの固定マッピングを作ってはならない）
- `display.menuGroupLabels` は本規則の対象外である（別フィールド・別 consumer）。
  `menuGroupLabels` の保持規則は下記「`display.menuGroupLabels` の保持」を参照する

**`display.menuGroupLabels` の保持（bridge 明示時は必須・明示 preservation 対象）:**

本フィールドは左メニューの MenuGroup 表示ラベルをモジュール単位でオーバーライドする
UI 表示専用フィールドである。`display.adjustmentExpression`（文生成専用）とは別フィールド・
別 consumer であり、両者が同一の文言を持つ必要はない。一方の値からもう一方を推測・複製しない。

- bridge Header の `display.menuGroupLabels` にラベルオーバーライドが記載されている場合 →
  記載された mapping を canonical の `display.menuGroupLabels` へ **exact preservation** で
  転記する。正規化・言い換え・sibling module（同一薬効クラス・同一 route の他 module）の値からの
  流用をしない
- bridge に `display.menuGroupLabels` が記載されていない場合 → canonical 側に必ず生成する
  必要はない。省略時の runtime fallback は MenuGroup 標準値そのもの（`lib/types.ts` 参照）であり、
  全エントリが `value === key` となる identity/default override
  （例: `{ "増量": "増量", "減量": "減量" }`）は、省略時の fallback と描画結果が完全に一致するため
  preservation 違反として扱わない。bridge が沈黙していることのみを理由に、既存の identity override
  を削除しない
- bridge が沈黙しており、かつ canonical に identity ではない値（`value !== key` となるエントリを
  含む override）が存在する場合 → 現時点でこれを承認する生成規則は存在しない。推測で承認・削除
  せず、authority 未確認の状態として保持し、別途確認する
- 以下から値を推測・導出してはならない: `drug.route` / `drug.dosageForms` / `moduleId` /
  `drug.drugClass` / 既存 canonical の前例（sibling module の値をそのまま流用しない）

**bridge に `persona:` セクションが存在しない場合:**
`persona` フィールドを OUTPUT_JSON から omit する（省略）。PENDING にしない。
model_managed 項目であり、後工程で別途追加可能。

**bridge に `regulatory:` / `topical:` セクションが存在しない場合:**
以下の確定値を設定する（注射薬全般に適用可能な model_managed 値）:
```json
"regulatory": {
  "psychotropicClass": "not_applicable",
  "controlledSubstance": "not_applicable",
  "notes": null
},
"topical": {
  "steroidPotency": "not_applicable",
  "notes": null
}
```

### display.subtitle の確定ルール（推測生成禁止）

**bridge に `display.subtitle` が明記されている場合:** その値をそのまま使用する。

**bridge に明記がない場合:** ブランド名の列挙（例:「トラゼンタ・マリゼブ・ザファテック 他」）や
同系統モジュールの表示パターンを模倣して生成してはならない（copied/reference pattern による
creative build と判定される）。以下の標準 fallback を確定値として使用する。

```
display.subtitle = "{drug.genericName}（{routeLabel}）"
```

`routeLabel` は `drug.route` から以下のとおり導出する:

| drug.route | routeLabel |
|---|---|
| oral | 内服 |
| injection | 注射 |
| topical | 外用 |
| ophthalmic | 点眼 |
| inhalation | 吸入 |

例（`dm_dpp4_oral`: `drug.genericName="DPP-4阻害薬"`, `route="oral"`）:
```
display.subtitle = "DPP-4阻害薬（内服）"
```

この fallback は `display.title` / `display.drugClassLabel` と同一値になる場合があるが、
それ自体は問題ない（`dm_insulin_rapid_analog.json` の title / drugClassLabel / nodeLabelLong が
同値である実績と同型）。

### defaults セクション

`defaults.followup` と `defaults.followupProfiles` は bridge から直接生成しない。
Phase 1 が確定した `phase1_text_spine.json` の値を使用する:

```
defaults.followupProfiles ← phase1_text_spine.followupProfiles（スキーマ: Record<string, {S?: string|null, P?: string|null}>）
defaults.followup         ← followupProfiles[phase1_text_spine.defaultFollowupRef] の内容（{S: null, P: "..."} 形式）
```

例: defaultFollowupRef = "default_followup" のとき:
```json
"defaults": {
  "followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
  "followupProfiles": {
    "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" },
    "end_followup":     { "S": null, "P": "次回、治療経過および体調変化の有無を確認。" },
    "se_followup":      { "S": null, "P": "次回、治療経過および副作用の有無を確認。" }
  }
}
```

これ以外の defaults フィールド（brandName 初期値等）は bridge から生成する。

### drugResolution セクション

**MUST_STOP（実機クラッシュ要因）:**

- `drugResolution.brandToTags` は必須。`null` / `undefined` / キー欠落 → 実装禁止
- `brandToTags` のキーは `drug.brandCatalog` の全キーと完全一致させること
- 各値は `string[]`（空配列 `[]` は許容、`null` / 文字列は禁止）
- 欠落・不一致の場合は生成を停止し MUST_STOP を報告すること

---

## 出力

`/tmp/soap-build/{moduleId}/phase2_drug_header.json` に保存する。

含めるセクション:
```
moduleId
moduleVersion
categoryPath
composition（groupKeyRegistry は暫定 []）
drug（genericName / brandNames / drugClass / route / dosageForms /
     drugSpecificTags / search / nameAliases / brandCatalog / aliasToBrand）
drugResolution
regulatory
topical
template
display
defaults
persona
```

含めないセクション（後工程が生成）:
```
scenarios（Phase 3B / 4 が生成）
addons（Phase 1 + 3B が生成）
ui / risks / searchConfig / tagCatalog / expressModes（Phase 5 が生成）
```

---

## 禁止事項

- シナリオ本文（S / O / A / P）を触らない
- Phase 1 の凍結テキストを参照しない
- scenario metadata を生成しない

---

## 次工程へのハンドオフ

PN2 完了後、以下を報告する:
- 保存先
- drug.nameAliases エントリ数
- brandCatalog ブランド数
- aliasToBrand キー数
- 整合確認結果（nameAliases一致 / aliases一致 / aliasToBrand網羅）
- display.adjustmentExpression を転記したか（bridge 記載の有無。記載ありの場合は転記した exact value）
- drug.drugClass を転記したか（bridge 宣言値の exact value。UPPER_SNAKE authoring 規約への適合可否を含む）
- drug.drugSpecificTags を転記したか（bridge 宣言値の exact value。件数・順序を含む）

次工程: PN3A（Scenario Classification）
