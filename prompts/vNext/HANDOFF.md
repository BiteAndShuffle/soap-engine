# SOAP Engine — vNext プロンプト体系 新規チャット引き継ぎ文書

作成日: 2026-06-26  
最終更新: 2026-09-23（Unit「DG-5 JS-A-display TypeScript requiredness parity」:
`lib/types.ts` の `ModuleData.display` で optional だった **5 field**（`drugClassLabel` / `drugGeneric` /
`nodeLabelShort` / `nodeLabelLong` / `nodeKey`）から `?` を外し、**JS-A-display 7/7 が TypeScript でも required** になった
（`title` / `subtitle` は元から required・**`display?:` 自体は無変更**）。**目的は static contract parity** であり
runtime validation の強化ではない（canonical 欠落の実効 guard は ModuleValidator）。clean scratch で 5 field 同時
required 化 → **compile error 0**、harness validity も deliberate error で確認済み。runtime behavior・canonical /
bridge / manifest は不変。**`Canonical ↔ TypeScript type validation gap`（`as unknown as` 112 箇所）は OPEN のまま**で
cast は触っていない。これにより `display.drugGeneric` 系列（**DG-1 → DG-2 → DG-3a → DG-4 → DG-5**）が完了した。
validator / tests / PN2 / PN7 / RULES / JSON_STANDARD / VALIDATOR_STANDARD は無変更。
先行: 同日 Unit「DG-4 display.drugGeneric requiredness enforcement」:
`display.drugGeneric` を `lib/moduleValidator.ts` の **`MISSING_REQUIRED_DISPLAY_FIELD` 対象へ追加**した。
**新 errorCode は作らず**、display required fields は **6 → 7**、generic requiredness の対象は **16 → 17 field**
（drug 3 / drug.search 7 / display 7）。除外は `drug.search.primaryDisplayName` の 1 field のみ。
missing semantics は DR-2 継承（`undefined` / `null`）。前提は **DG-2 の generation contract 確定**と
**DG-3a の corpus exception 解消**で、corpus は **35/35** のため新 ERROR 0・baseline は ERROR 0 / WARN 35 のまま。
DR-2 時点の scope 固定 test（drugGeneric 欠落でも 0 件）は**反転**させた。
**`lib/types.ts` の `drugGeneric?: string` type drift は引き続き OPEN**（別 Unit）。
canonical / bridge / manifest / PN2 / JSON_STANDARD / `lib/types.ts` / PN7 / RULES は無変更。
先行: 同日 Unit「DG-3a H1 oral display.drugGeneric value parity」:
`allergy_h1_antihistamine_second_gen_oral.display.drugGeneric` の bridge ⇔ canonical 不一致を解消した（OD-DG3-1〜6）。
**bridge を先に repair**（`"第二世代H1受容体拮抗薬"` → **`"第二世代ヒスタミンH1受容体拮抗薬"`**。bridge 内 `genericName` との表記揺れ修正）し、
**canonical をその exact value へ追随**させた（旧値 `"フェキソフェナジン 他"`）。**Bridge SSOT の逆転ではない。**
13 成分を包含する class-level module であり、代表成分の選定規則が Repository に存在しないため代表成分方式は採らない
（ただし「代表成分＋他」方式自体を全面禁止する判断ではない）。正表記は `drug.genericName` / `display.drugClassLabel` /
bridge `genericName` / DG-2 fallback の 4 者と一致。事後照合は bridge explicit exact parity **19/19**・未宣言 **16/16**・
**known exception 0**。runtime behavior 不変（consumer 0）。**DG-4 validator enforcement は未着手**。
validator / PN2 / JSON_STANDARD / `lib/types.ts` / tests / manifest / 他 34 canonical / 他 bridge / PN7 / RULES は無変更。
先行: 同日 Unit「DG-1 調査 / DG-2 display.drugGeneric generation contract」:
`display.drugGeneric` の **semantics と生成規則を確定し、docs / PN2 へ明文化**した（OD-DG-1〜8）。
semantics は **module 単位の一般名系表示ラベル**（`drugClassLabel` = 薬効分類ラベル、
`brandCatalog[*].displayGenericName` = brand 単位とは責務が別）。生成規則は **bridge 明示 → exact copy /
bridge 未宣言 → `drug.genericName` を deterministic fallback**（推測生成・`"PENDING"` 禁止）。
DG-1 実測: normative 記述は JS-A の 1 行のみで semantics 未定義・bridge 宣言 19/35・canonical は 33/35 が
`drug.genericName` と同値・runtime consumer 0・bridge 未宣言 16 件の source provenance は説明不能・
H1 oral は canonical が先で bridge が後。**canonical は 1 件も変更していない**（H1 oral / semaglutide を含む）。
**H1 oral の value parity は OPEN**（bridge 側を別 Unit で Human Review）、**validator enforcement は DG-4 で未着手**、
**TypeScript requiredness は別 Unit**。canonical / bridge / manifest / validator / tests / `lib/types.ts` /
PN7 / RULES は無変更。
先行: 同日 Unit「DR-2 JS-A drug / display requiredness enforcement」:
`lib/moduleValidator.ts` へ section 単位の generic errorCode 3 つ（**`MISSING_REQUIRED_DRUG_FIELD` /
`MISSING_REQUIRED_DRUG_SEARCH_FIELD` / `MISSING_REQUIRED_DISPLAY_FIELD`**。ERROR・Structural）を追加し、
JS-A-drug / JS-A-display の **16 field の presence**（missing = `undefined` / `null`）を機械担保した（OD-DR2-1〜10）。
除外は `drug.search.primaryDisplayName`（既存 `MISSING_PRIMARY_DISPLAY_NAME` に委任）と
`display.drugGeneric`（generation contract 未確定のため暫定対象外）。`nameAliases` は **presence と parity の
責務を分離**（欠落＝新 code、両方 present の値不一致＝`NAME_ALIASES_MISMATCH`）し、二重報告をなくした。
`drug.brandCatalog` の presence hole も解消。current corpus 35 module で新 ERROR 0、baseline は ERROR 0 / WARN 35 のまま。
`""` / `[]` / `{}`・値域・型 parity は別 contract。canonical / bridge / manifest / `lib/types.ts` / PN2 / PN7 /
RULES / JSON_STANDARD は無変更。
先行: 同日 Unit「DR-1 display.drugGeneric exact restore」:
`dm_insulin_mixed_rapid_long.display.drugGeneric` の欠落（birth defect・`e650858` 由来）を、
**bridge の exact source**（`"混合型インスリン製剤（超速効型＋持効型）"`）から 1 行復元した（OD-DR-1）。
sibling inference / fallback 生成は不使用。事後 presence **35/35**、値は bridge と exact parity。
**DR-2 requiredness enforcement は未着手**（対象は Class A。`display.drugGeneric` は generation contract
未確定のため enforcement 対象外・OD-DR-3 / OD-DR-4）。**DR-1 後も validator は `display.drugGeneric` を
検査せず、同種の欠落を自動で止める経路は存在しない。**
H1 oral の value parity（OD-DR-2）/ generation rule 未確定 / type・記述 drift（OD-DR-5 / OD-DR-6）は
別 Finding として OPEN。bridge / manifest / `lib/**` / `app/**` / validator / tests / PN2 / PN7 / RULES /
JSON_STANDARD / `lib/types.ts` / 他 34 canonical は無変更。
先行: 2026-09-22 Unit「JSB-1 current-generation policy」:
JS-B 条件付き 4 key（`canonicalSource` / `defaultSMergeLevel` / `domainPolicy` / `nodeIdentityPolicy`）について、
**current の新規 module 生成では生成しない**という current-generation policy を docs / PN2 へ明文化した（OD-JSB-1〜11）。
判定条件は **新しく定義していない**（OD-JSB-1）。**canonical 21/14 は無変更**（migration なし・OD-JSB-3）、**validator も作らない**（OD-JSB-7）。
`Q-F4` は PENDING のまま（OD-JSB-6 / OD-JSB-9）、Finding `JS-B scope drift` も **OPEN のまま**。
変更は `docs/JSON_STANDARD.md`（JS-B / JS-D 注記）・`docs/DESIGN_PRINCIPLES.md`（DP-03 追記）・
`docs/OPEN_DESIGN_QUESTIONS.md`（Q-F4 追記）・`prompts/vNext/PN2-Drug-Header.md`（composition 生成節）・本ファイルの 5 件のみ。
canonical / bridge / manifest / `lib/**` / `app/**` / validator / tests / PN7 / RULES / `PROJECT_CONTEXT.md` / `P0-C.md` は無変更。
先行: 同日 Unit「Composition type parity」:
`lib/types.ts` の `ModuleData.composition` 型を JS-A-composition / RULES §18 / canonical corpus と一致させた。
**JS-A-composition 9/9 field の type parity を確認済み**で、実差分は不一致・未宣言だった 3 field のみ
（`priority?: number` → `priority?: string` ／ inline `sMergePolicy?: { unit; conflictStrategy; withinDomainStrategy: string }` を追加 ／
`groupKeyRegistry?: string[]` を追加）。3 field とも optional のまま、literal union・値域制約は導入していない（OD-TP-1〜5）。
canonical 35 module の `composition` が二重 cast なしで新しい型へ代入可能（scratch probe で error 0）。
**S3 / GG-3 は OPEN のまま**。別 Finding 候補 `Canonical ↔ TypeScript type validation gap` と、investigation 候補
`composition.drugClassLabel` / `composition.nodeLabel` を記録（OD-TP-6）。canonical / bridge / manifest / JSON_STANDARD /
RULES / PN2 / PN7 / validator / tests / `data/modules/index.ts` は無変更。
先行: 同日 Unit「R-2 JS-A composition requiredness enforcement」:
`lib/moduleValidator.ts` に generic errorCode **`MISSING_REQUIRED_COMPOSITION_FIELD`**（ERROR・Structural）を追加し、
JS-A-composition 必須 field のうち `nodeKey` / `classKey` / `clinicalDomain` / `sMergeDomain` / `groupKeyRegistry` /
`nodeLabelShort` / `nodeLabelLong` / `priority` の 8 field の **presence**（missing = `undefined` / `null`）を機械担保した。
`composition` 自体が absent / non-object なら 8 件報告。新しい Repository 規則ではなく JS-A の machine enforcement。
current corpus 35 module で新 ERROR 0。`sMergePolicy` は **S3 contradiction 未解決のため暫定対象外**（S3 は OPEN のまま）。
`""` / `[]` の妥当性・値域・Composition type parity（`lib/types.ts`。同日完了）・drug / display requiredness は後続。
canonical / bridge / manifest / PN7 / GG-3 / JSON_STANDARD / RULES / `lib/types.ts` は無変更。
先行: 2026-09-21 Unit「R-1 composition data repair」:
JS-A-composition の必須 field 欠落 2 件を、**現行 PN2 の規則をそのまま適用して**補完した。
`dm_insulin_mixed_rapid_intermediate` に `"priority": "chronic"`（PN2 フォールバック表「インスリン注射 → "chronic"」）、
`dm_insulin_intermediate` に PN2 固定値の `sMergePolicy` object（全 module 共通の model_managed 値）を追加
（OD-REQ-1 / OD-REQ-2。`sMergePolicy` の補完は GG-3 の Lifecycle 分類を確定するものではない）。
事後は priority / sMergePolicy とも presence 35/35、値も 35/35 一致。manifest はバイト不変で再生成せず、search 差分 0。
R-2 requiredness enforcement は R-1 時点で未着手（`moduleValidator`・generic code・ERROR・`sMergePolicy` を除く 8 field で決定済み。2026-09-22 に R-2 で完了）。
**S3 contradiction（PN7 item S / GG-3 ⇔ §10.1 / VALIDATOR_STANDARD §5）は OPEN** で、`sMergePolicy` の enforcement は
S3 解消まで対象外。別 Finding 候補として `JS-B scope drift`（2026-09-18 の削除は H1 点眼 1 module のみと実測で訂正）/
`Composition type parity` / `display.drugGeneric missing` を記録。bridge / PN2 / RULES / JSON_STANDARD /
VALIDATOR_STANDARD / validator / audit / tests / `lib/types.ts` / 他 33 canonical は無変更。
同日先行: Unit「N-3 composition.nodeLabelShort repair」:
`dm_insulin_mixed_rapid_intermediate` の canonical `composition.nodeLabelShort` 欠落（birth defect・
`e650858` 由来）を、**bridge `display.nodeLabelShort`（`混合型INS（超速/中間）`）を source として 1 行補完**した。
これは PN2「composition セクション生成」の**必須フォールバック条項の追認**であり新規則ではない（OD-N3-1 / OD-N3-2）。
`resolveNodeLabel()`（composition 優先・9 箇所）が `brandNames[0]` =「ノボラピッド30ミックス」へ
フォールバックしていた UI 不整合が解消し、**`resolveNodeLabel()` と `display.nodeLabelShort` が異なる module は 0 件**、
`composition.nodeLabelShort` presence **35/35**、display との一致 **35/35**。**parity は contract 化していない**（OD-N3-3）。
bridge / `data/search-manifest.json`（再生成なし・byte-identical）/ 他 34 canonical / `lib/` / `app/` /
`scripts/` / `tests/` / `docs/` はすべて無変更で、新 validator / audit / PN7 item / test も追加していない。
`composition.priority`（1 件）と `composition.sMergePolicy`（1 件）の欠落は修復せず、
**`JS-A composition requiredness enforcement / corpus missing fields`** として §6 へ Finding 候補（**OPEN**）に
まとめて記録した（OD-N3-4 / OD-N3-5）。
同日先行: Unit「D-15d + D-15e remediation」:
H1 oral の **bridge header** `drug.genericName` / `display.drugClassLabel` を正式語
`第二世代ヒスタミンH1受容体拮抗薬` へ修正（canonical は無変更。bridge 凍結本文 133 件・canonical
scenario title 29 件が同語を支持・OD-D15d-1〜5）。あわせて `display.nodeLabelShort` を
H1 oral = `抗ヒスタミン内服`（canonical display + composition）、`dm_insulin_mixed_rapid_long` =
`混合型INS（超速/持効）`（canonical display + bridge。canonical composition が正式値の出所）へ揃え、
**canonical 内部の display ≠ composition（N-2）も同時解消**（OD-D15e-1〜5）。事後 parity は
genericName 35/35・drugClassLabel 19/19・bridge 内部 19/19・canonical genericName==drugClassLabel 35/35・
nodeLabelShort 35/35・display==composition 34/34（両 field 存在 module）。**manifest は投影対象外のため
バイト不変で再生成せず、search regression は 17 query 差分 0**。RULES §4 への昇格・family naming の
contract 化・audit / validator / test の新設はいずれも行っていない。
**親 D-15 を CLOSED**（子 Unit 5/5 完了・scope の 8 divergence = 0）。調査中に発見した scope 外事項は
`N-1 categoryPath bridge↔canonical divergence` / `N-3 mixed_rapid_intermediate composition.nodeLabelShort
missing` として**独立 Finding へ分離**（remediation なし・正式 ID は昇格時に決定）。
同日先行: Unit「D-15b nodeKey bridge header drift repair」:
`allergy_h1_antihistamine_second_gen_oral` の **bridge header** `display.nodeKey` を
`antihistamine_second_gen_oral` → `h1_antihistamine_oral` へ 1 行修正し、bridge ⇔ canonical parity を
**35/35 へ回復**した（Owner Decision OD-D15b-1〜6）。**canonical 35 件・search-manifest・`lib/` / `app/` /
`scripts/` / `tests/` はすべて無変更**で、新しい audit / validator も追加していない。これは bridge 値を
authoring hint へ降格した closure ではなく、**back-fill 由来の machine identifier drift を Owner 承認の
もとで修復し、PN2 fallback 経路（bridge `display.nodeKey` → canonical `composition.nodeKey`）で current
canonical を決定論的に再生成できる状態へ戻した**ものである。あわせて `docs/JSON_STANDARD.md`
JS-A-composition の `nodeKey` 行へ「代表的な形式例であり、必須の命名規則ではない」旨の clarification を
追加（`{classKey}_{route}` を strict contract 化しない・OD-D15b-4）。`classKey` ↔ `nodeKey` の関係は
Q-J1 では包含できない別論点として §6 へ Finding 候補として記録（remediation なし・OD-D15b-5）。
§6 の D-15b を完了化し、**親 D-15 は OPEN 維持**（D-15d / D-15e は未着手。残存 divergence 5 → 4 件）。
`prompts/vNext/PN2-Drug-Header.md` は変更していない（生成規則自体は変わらないため・Owner 確認済み）。
同日先行: Unit「D-15c drugSpecificTags preservation / parity」:
`allergy_h1_antihistamine_second_gen_oral` の canonical `drug.drugSpecificTags` を bridge 宣言値
`["antihistamine", "second_generation", "allergy", "oral"]` へ修正し、`data/search-manifest.json` を
正規 generator で再生成。あわせて **bridge-owned exact preservation contract** を導入した
（OD-D15c-1〜8）: `prompts/RULES.md` §4 へ「Drug header search metadata」を新規登録、PN2 へ
逐語転記条項（sort / dedupe / case / 単複 / compound 変換 / 追加削除をすべて禁止）、
`scripts/audit-drug-specific-tags-bridge-chain.ts`（`npm run audit` 7 → 8 本）・
`tests/drugSpecificTagsBridgeParity.test.ts`・PN7 item AL を新設。**件数・順序・表記を含む逐語一致**を
要求し set equality にはしない。**vocabulary SSOT は作らず**、孤立 token・重複 token・空配列・表記形式には
issue code を作らない（OD-D15c-3 / OD-D15c-6）。requiredness は別 Decision のまま未着手（OD-D15c-7）。
検索到達性は `allergy` 3→4・`generation` 0→1 の増加のみで**消失 0**。parity は 35/35。§6 の D-15c を
完了化し、**親 D-15 は OPEN 維持**（D-15b / D-15d / D-15e は未着手。残存 divergence 6 → 5 件）。
bridge / 他 34 module の canonical / `lib/` / validator は無変更。
同日先行: Unit「D-15a display.subtitle legacy remediation」:
`allergy_h1_antihistamine_second_gen_oral` と `dm_insulin_mixed_rapid_long` の canonical
`display.subtitle` を bridge 宣言値へ修正し、`data/search-manifest.json` を正規 generator で再生成
（差分は `sourceHash` と `displaySubtitle` 2 箇所の計 3 行）。**新しい表示生成規則は作らず、PN2
「display.subtitle の確定ルール」の既存契約を適用した legacy data drift の解消**である（OD-D15-1）。
事後 parity は bridge 宣言 18/18 逐語一致・bridge 沈黙 17/17 fallback 適合・canonical 全 35/35 contract 適合。
query regression 差分 0。§6 の D-15 を親 Finding（**OPEN 維持**）+ 子 Unit D-15a〜D-15e へ分割し、
**D-15a のみ完了化**（D-15b〜D-15e は未着手・OD-D15-8）。subtitle を `prompts/RULES.md` §4 preservation
対象へ昇格させず、audit / validator / test も新設していない（OD-D15-7）。bridge / PN2 / RULES / `lib/` は無変更。
同日先行: Unit「D-9 drugClass preservation / parity contract」:
`drug.drugClass` を bridge-owned value として contract 化した（OD-D9-1）。`prompts/RULES.md` §4 へ
「Drug header identifier」を新規登録し、既に運用されていた `display.adjustmentExpression` /
`display.menuGroupLabels` の §4 未登録も documentation-contract repair として同時是正（OD-D9-3 / OD-D9-6）。
PN2 へ exact preservation + UPPER_SNAKE authoring 規約（規約外は PENDING 停止）を追加し、
`scripts/audit-drugclass-bridge-chain.ts`（`npm run audit` 6 → 7 本）・`tests/drugClassBridgeParity.test.ts`・
PN7 item AK を新設（OD-D9-2 / OD-D9-4）。**audit invariant は片方向**で、bridge 沈黙時は NOT_CHECKED。
bridge ファイル不在は CHECK、`drugClass:` はあるが parse 不能な場合のみ FAIL。requiredness は別 Decision の
まま未着手（OD-D9-5）。PN7 の採番注記を「A〜AH の全 32 項目」→「A〜AK の全 35 項目」へ是正（OD-D9-8）。
canonical / bridge / manifest / `lib/` / validator は無変更（データ差分ゼロ）。D-15 / GG-5 / `risks` /
`tests/risksContract.test.ts` の D-3 JSDoc は非対象。
同日先行: Unit「D-8 drugClass canonical mismatch remediation」:
`allergy_h1_antihistamine_second_gen_oral` の canonical `drug.drugClass` を bridge 逐語値
`["H1_ANTIHISTAMINE_SECOND_GEN"]` へ修正し、`data/search-manifest.json` を正規 generator で
再生成（差分は `sourceHash` と当該値の 2 箇所のみ）。**identifier normalization / bridge ⇔ canonical
parity repair であり、臨床分類の変更ではない**（Owner Decision OD-D8-1）。修正後の `drug.drugClass`
parity は 35/35。query `2nd` / `2n` / `2` の偶発的到達消失は許容（OD-D8-2。`second` / `h1` /
`antihistamine` / 日本語経路 / ブランド・alias 経路は維持）。§6 の D-8 を完了化し、D-15〔bridge ⇔
canonical の header / display divergence 8 件・記録のみ〕を追加。bridge / `composition.classKey` /
`prompts/RULES.md` / `docs/JSON_STANDARD.md` / validator / audit / tests / `lib/` は無変更で、
命名規約の明文化と再発防止 contract は D-9 のまま未着手（OD-D8-3）。
同日先行: Unit「D-3 type parity repair」: `lib/types.ts` の `ModuleRisks` へ
`secondary?: string[]` を追加し、canonical 2 キー contract との type parity を回復（§6 の D-3 を完了化）。
pure type-contract parity repair であり、`primary` / `secondary` はいずれも optional のまま、
semantic / values / runtime behavior・canonical・bridge・PN5・`docs/JSON_STANDARD.md`・validator・
tests・fixture・manifest は無変更。GG-5 は Pending 維持。
同日先行: Unit「D-13 conditional structure legacy removal」: canonical `risks` を
`primary` / `secondary` の 2 キーへ改訂し、`conditional` / `ConditionalRisk` / `whenAny` / `whenAll` を
canonical 35 件・PN5・`docs/JSON_STANDARD.md` JS-A・`lib/types.ts`・tests・fixture から撤去（Owner
Decision OD-L1〜OD-L4）。**future reservation として保持しない — 将来必要になった場合は旧構造を復活
させず、その時点の要件に基づく新しい Owner Decision として再設計する**（OD-L3）。§6 の D-13 を完了化し、
D-3 へ current observation〔canonical 2 キー / 型は `primary` のみ宣言。既存 D-3 の継続であり本 Unit が
作った drift ではない〕を追記。GG-5 は Pending 維持で保留理由の事実誤りのみ訂正（OD-L7 / OD-L8）。
`primary` / `secondary` の値・意味・legacy 22 module・bridge / validator / runtime / `app/` / `scripts/` /
manifest は無変更。
同日先行: Unit「D-11 / D-12 cross-corpus risk attribution remediation」: 非 SGLT2 15 module から
`ketoacidosis_risk_sglt2 ← concomitant_sglt2` を除去（誤帰属・未定義 trigger・producer/consumer 不在の
legacy conditional の除去。DKA という臨床事実の否定ではなく、SGLT2 含有 3 module の primary は無変更）。
`tests/fixtures/risksPreRuleBaseline.ts` の 15 行を `conditional: 0` へ追随。§6 の D-11 / D-12 を完了化し、
D-13（`risks.conditional` が corpus 全件 `[]` の currently uninstantiated structure）/ D-14（SGLT2 併用表現の
被覆不均一）を追加。PN5 / `lib/types.ts` / validator / runtime / `docs/` / bridge / manifest は無変更。
同日先行: Unit「insulin risks template clinical & semantic review」: PN5 insulin 標準テンプレートを
`primary: [hypoglycemia_risk, injection_site_reaction]` / `secondary: []` / `conditional: []` へ縮約し、
insulin 8 module の canonical を統一（Owner Decision OD-T1）。`dm_insulin_mixed_rapid_long` の temporary
deferral を解消し `INSULIN_RISKS_REVIEW_PENDING_MODULES` と T-R-4d〜T-R-4g を完全撤去。§6 の D-7 を完了化し、
D-11（非 SGLT2 module に残存する conditional）/ D-12（`concomitant_sglt2` namespace 未定義）を追加。
bridge / 非 insulin canonical / validator / `lib/types.ts` / runtime / `docs/` は無変更。
同日先行: Unit「insulin mixed rapid/long 構造修復」: `dm_insulin_mixed_rapid_long` の
`drug.drugClass` / `dosageForms` / `drugSpecificTags` を bridge 逐語値どおり復元し（transfer defect）、
`risks` を固定 empty へ正規化、`data/search-manifest.json` を再生成。insulin テンプレート適合と
`template.urgentCriteria` の扱いは Human Review Pending として `INSULIN_RISKS_REVIEW_PENDING_MODULES` が保持
〔当時の状態。insulin テンプレート適合は上記 Unit で解消し、同定数は撤去済み。`template.urgentCriteria` は D-10 が保持〕。
§6 の D-2 誤記〔「drugClass が小文字」→ 正しくは ABSENT〕を訂正し、D-7〜D-10 を追加。bridge / PN5 /
validator / `lib/types.ts` / runtime は無変更。
同日先行: Unit「PN5 non-insulin risks contract remediation」: PN5 §risks の non-insulin 分岐を
固定 empty 契約へ改訂し（override 経路は存在しない・bridge 自由文や scenario ID 等からの推測／導出／転記を禁止）、
§3 PN5 節へ追随。別 Unit 送りとなった D-1〜D-6 を §6 へ登録。canonical JSON / bridge / insulin risk values /
`lib/types.ts` / validator / runtime は無変更。`risks` の Lifecycle 位置づけは
`docs/DEVELOPMENT_STANDARD.md` §10.5 GG-5。
先行: 2026-08-18 Unit C: scenarioColor の bridge → canonical lossless 移送経路を PN3A/PN3B/PN6/PN7 へ接続。
scenarioColor は inline 専用（Header map 形式なし）のため PN3A が bridge SCENARIO ヘッダーを直接参照して取得する
（uiVariant/uiGroup と同型。PN1/PN2 は無変更）。PN7 監査項目 AH を新設（全32項目）。canonical 格納先は
`scenarios[].scenarioColor`（Unit B で追加した型のみ使用。新しい色語彙は作らない）。H1 canonical JSON の
再生成はまだ実施していない（Unit D で実施予定）。
先行する Unit A.1: PN3A の addon requiredTags / scenario scenarioRequiredTags を Header map 方式と
inline 方式の両対応へ拡張し、両方式併存時の競合規則（片方のみ採用／両方一致は CHECK／不一致は MUST_STOP）を追加。
PN1 は変更なし。PN7 AD/AE を両方式対応の意味 parity 監査へ拡張。先行する Unit A：PN1/PN2/PN3A/PN3B/PN6/PN7 へ
uiGroup・requiredTags・scenarioRequiredTags・template.handlingTags/reservedHandlingTags の lossless 保持規則を追加、
PN7 監査項目 AC〜AG を新設）  
対象ブランチ: `feat/nlp-input-panel-and-new-schema`  
リポジトリ: `/Users/AdNauseumTendrils/Desktop/soap-engine`

この文書は `prompts/vNext/STARTUP_PROMPT.md` が定める工程段階 Overlay の 1 つです。vNext module 生成（`bridges/{moduleId}.md` を起点に canonical JSON を生成・改修する作業）に着手するとき、PN1 より前に読みます。読込経路の正本は `prompts/vNext/STARTUP_PROMPT.md` です。

Human / ChatGPT / Claude の役割分担・協業原則は `docs/TEAM_CHARTER.md` を参照してください。

---

## 変更契機

（本節の要素・原則は `docs/DEVELOPMENT_STANDARD.md` §11 が定める）

**起点**: 次のいずれかを行ったとき、本ファイルは古くなる。

- `prompts/vNext/PN1-Text-Extraction.md` 〜 `PN8-Build-Runtime-Release.md` のいずれかで、
  フェーズの責務・入出力・停止条件を変更した
- `prompts/vNext/AUTORUN.md` の実行モードまたは MUST_STOP 条件を変更した
- `prompts/RULES.md` §24（bridge STATUS 遷移・PN1 開始条件）を変更した
- 本ファイルが技術的負債として記録している事項が解消した、または新たに記録する判断をした
- 本ファイルが正本として参照しているパス（`data/modules/index.ts` ／ 検証コマンド ／
  `docs/VALIDATOR_STANDARD.md` Appendix B）を変更・移動した

**更新対象**

- 「3. vNext プロンプト体系」の該当フェーズ記述（フェーズの責務・入出力・停止条件を変更した場合）
- 「5. 次モジュール作業開始手順」の該当手順（AUTORUN または bridge STATUS を変更した場合）
- 「6. 技術的負債」の該当項目（**解消した場合は削除する。記録を放置しない**）
- 参照先パス

**対象外**

- **モジュールの一覧・件数・登録状態・検証状態** — 本ファイルは保持しない。正本は
  `data/modules/index.ts` および検証コマンドの実行結果であり、実装側の変更に追随しない
  （**一覧・件数を本ファイルへ再び持ち込まないこと**）
- `docs/VALIDATOR_STANDARD.md` Appendix B の内容 — 同 Appendix が正本であり、
  本ファイルは台帳を二重管理しない

**検証**

- 本ファイル内にモジュールの一覧・件数が存在しないこと
- 参照先パスがすべて実在すること

**採用理由**

〔実測〕本節の制定前、本ファイルは「§1 に全 19 件」「§4 に 3 件＋他 11 件」という
相互に矛盾する 2 つのモジュール一覧を保持し、いずれも実態（35 件）と乖離していた。
「6. 技術的負債」の group 使用件数も同様に乖離していた。原因は、実装から機械取得できる値を
散文が複製したことである。

---

# 1. プロジェクト概要

## SOAPエンジンとは何か

日本の調剤薬局・薬剤師向けの **SOAP形式指導記録自動生成ツール** です。  
患者ごとの投薬状況（初回・継続・副作用・アドヒアランス等）をシナリオとして持ち、  
薬剤師が指導記録を素早く作成できるようにします。

技術スタック: **Next.js 15 App Router（TypeScript）**

## 目的

薬剤師がアプリ上でシナリオとADDONを選択するだけで、SOAP指導記録の草稿が生成されること。  
複数の薬剤が処方されている場合でも、SOAP記録を破綻なく合成すること（semantic merge）。

## 現在の開発フェーズ

`data/modules/` に薬剤ごとの JSON モジュールを追加する段階です。

**登録済みモジュールの一覧・件数・登録順は `data/modules/index.ts` を正本とします。**
本ファイルは一覧・件数を保持しません（`ALL_MODULES` を参照してください）。

検証状態（tsc / build / ModuleValidator / CrossModuleValidator）は静的な記録ではなく、
`npx tsc --noEmit` / `npm run build` / `npm run audit` の実行結果を正本とします。

次モジュールの着手手順は「5. 次モジュール作業開始手順」を参照してください。

## なぜ vNext プロンプト体系へ移行したのか

旧体系（P0-B / P1 / P2B / P3 / P4 / P5）は 1 つのプロンプトに複数の責務が混在していました。  
31 シナリオ・16 ADDON を持つ大規模モジュールでは以下の問題が生じることが判明しました:

- 出力が途中で途切れる（Output Limit 超過）
- セッションをまたぐと中間ファイルが消えて再開不能になる
- どの Phase が何を生成すべきか責務が曖昧で、修正が連鎖的に波及する
- bridge 本文と JSON 本文の乖離が後工程まで検知されない

vNext では責務を 8 フェーズに分割し、各フェーズの成果物を `/tmp/soap-build/{moduleId}/` に保存することで、
途中停止・再開・監査を安全に実行できるよう再設計しました。

---

# 2. 現在の設計思想

## Single Source of Truth (SSOT)

**bridge.md が内容の正本** です。JSON はその実装物にすぎません。  
JSON の本文（S / O / A / P / addon text）が bridge と違う場合、正しいのは bridge です。  
JSON を見て「こう書いた方が良い」と感じても、bridge を確認しなければ修正してはなりません。

## Bridge Preservation（bridge を書き換えない）

bridge.md は医療文書の草稿です。Claude が自主的に書き換えることは禁止です。  
`constitution.editingRules` に明記されています。

## 本文凍結（Text Freeze）

PN1（Phase 1）が bridge から本文を抽出した瞬間に、すべてのテキストは **凍結** されます。  
PN2 以降のフェーズは、S / O / A / P / addon text を一切変更してはなりません。  
変更が検知された場合は PN1 に差し戻します。

## 単一責務

各フェーズは 1 つのことだけを行います。

| フェーズ | 責務 |
|---|---|
| PN1 | bridge 本文をそのまま抽出して保存する |
| PN2 | drug / display / composition 等のヘッダー構造を生成する |
| PN3A | 各シナリオの分類（scenarioType / scenarioGroup 等）を **判断する**（JSON は書かない） |
| PN3B | PN3A の決定をシナリオメタデータとして適用する |
| PN4A | 治療系シナリオの xStructured を生成する |
| PN4B | 副作用系・adherence 系・sickday / followup の xStructured を生成する |
| PN5 | ui / risks / searchConfig 等の非シナリオ構造を生成する |
| PN6 | PN1〜PN5 を統合して最終 JSON を生成する（Write のみ） |
| PN7 | 完成 JSON を全 26 項目で監査する（修正しない） |
| PN8 | registry 登録確認 / tsc / build を実行して release 判定する |

## 考える工程と写す工程の分離

PN3A は **考えるだけ** です。JSON を書きません。  
「どのシナリオをどう分類するか」を `phase3a_decisions.json` に記録し、  
「写す」作業は PN3B が行います。  
これにより、PN3A のやり直しが PN3B に波及せず、独立して再実行できます。

## Output Limit 対策

31 シナリオ・16 ADDON を持つモジュールでは phase3b_meta.json が 1,500〜2,000 行規模になります。  
対策:

- Write ツールで 1 回出力する（分割出力しない）
- 完了後 `wc -l` で行数を確認する
- 途切れた場合は `rm` して再実行する（部分出力を使い続けない）
- PN6 では Read 順序を「軽量ファイルから先に」にしてコンテキストを節約する
- PN7 では `wc -l` で行数確認後、2,000 行超なら分割 Read する

## Write ツール中心

完成 JSON は **チャットテキストとして出力しない**。Write ツールでファイルに保存する。  
チャット出力は報告行（完了メッセージ・行数・シナリオ数）のみ。

## /tmp/soap-build 運用

スクラッチパスを `/tmp/soap-build/{moduleId}/` に固定することで、セッションをまたいで継続実行できます。  
セッション UUID に依存するパスは使用しません。

各フェーズの成果物は以下のパスに保存されます（`{moduleId}` を実際の値に置換）:

```
/tmp/soap-build/{moduleId}/phase1_text_spine.json
/tmp/soap-build/{moduleId}/phase2_drug_header.json
/tmp/soap-build/{moduleId}/phase3a_decisions.json
/tmp/soap-build/{moduleId}/phase3b_meta.json
/tmp/soap-build/{moduleId}/phase4a_structured.json
/tmp/soap-build/{moduleId}/phase4b_structured.json
/tmp/soap-build/{moduleId}/phase5_non_scenario.json
/tmp/soap-build/{moduleId}/audit_report.json

↓ 最終出力（プロジェクト内）
data/modules/{moduleId}.json
```

---

# 3. vNext プロンプト体系

## フロー図

```
PN1
 ↓
PN2 ‖ PN3A（並列可 — ただし PN3B は PN1 + PN3A 両方が完了してから）
 ↓     ↓
      PN3B
       ↓
PN4A ‖ PN4B ‖ PN5（3者は並列可 — すべて PN3B 完了後に開始）
   ↓    ↓    ↓
    PN6（PN4A + PN4B + PN5 すべて完了後）
     ↓
    PN7（監査のみ）
     ↓
    PN8（tsc / build / release）
```

**PN5 は PN4A / PN4B に依存しません。** PN5 の入力は phase1/phase2/phase3a/phase3b のみです。  
PN3B が完了した時点で PN4A / PN4B / PN5 の 3 者は同時実行可能です。

**実運用では AUTORUN モード（PN3A〜PN8 自動連続実行）を使用します（`prompts/vNext/AUTORUN.md` 参照）。**

## 各フェーズ詳細

### PN1 — Text Extraction

**プロンプトファイル**: `prompts/vNext/PN1-Text-Extraction.md`  
**入力**: bridge.md の SCENARIOS_START〜SCENARIOS_END  
**出力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json`

重要な処理:
- `【SCENARIO｜...】` ヘッダーから S / O / A / P を抽出
- `【ADDON｜...】` ヘッダーから P_APPEND / S_APPEND / A_APPEND を抽出  
  **ADDON ヘッダーはシナリオと混在・分散して出現する。漏れなく全件収集すること**
- ADDON ヘッダーの `uiGroup=` は `uiVariant=` と同じ任意トークンとして認識する（値の取得は PN3A が bridge を直接参照）
- `P_CLOSING` の内容を followupProfiles の雛形として記録する（P フィールドに格納）
- 薬剤名 / 薬効分類名を `{{drug_subject}}` に置換する（詳細なルールは bridge の editingRules 参照）
- S の主語省略を許容するシナリオ（cp_good 等）では `{{drug_subject}}` を補わない

出力形式（概要）:
```json
{
  "moduleId": "{moduleId}",
  "drugSubject": "{薬剤名}",
  "scenarios": { "initial": { "S": "...", "O": "...", "A": "...", "P": "..." }, ... },
  "addons": { "addon_xxx": { "text": "...", "sectionTexts": {} }, ... },
  "followupProfiles": {
    "default_followup": { "S": null, "P": "次回、引き続き使用できているか、副作用の有無を確認。" }
  },
  "defaultFollowupRef": "default_followup"
}
```

**followupProfiles の重要事項**:  
型は `Record<string, { S?: string | null; P?: string | null }>` です（lib/types.ts:765）。  
`{ closingText: "..." }` ではありません。P_CLOSING テキストは `P` フィールドに入れます。

---

### PN2 — Drug Header

**プロンプトファイル**: `prompts/vNext/PN2-Drug-Header.md`  
**入力**: bridge.md 全体 + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase2_drug_header.json`

責務: composition / drug / drugResolution / regulatory / topical / template / display / defaults / persona を生成する。

`template.handlingTags` / `template.reservedHandlingTags` は bridge の配列を値・順序とも変更せず転記する（PN2-Drug-Header.md 参照。
`reservedHandlingTags` の欠落は到達不能 requiredTags の ERROR 化・build 停止に直結するため軽視しないこと）。

bridge に `composition:` / `persona:` / `regulatory:` / `topical:` セクションが存在しない場合は、  
PN2 に実装されたフォールバックルールを使用する（PN2-Drug-Header.md 参照）。

**composition.classKey の取り扱い（2026-07-24 更新。PN2-Drug-Header.md の classKey 導出ルールと同期）**:  
bridge 未記載の場合、`composition.nodeKey`（= `display.nodeKey` フォールバック値）が既知の標準形式
`<classKey>_<route>` に一致し、かつ route 部分が `drug.route` の値と一致するときに限り、
`<route>` 部分を機械的に取り除いて classKey を導出してよい。  
配合剤・`dual_mechanism` 等 nodeKey が単一 classKey + route の1:1構造になっていない module、
または route 部分が `drug.route` と一致しない場合は、推測で確定せず PENDING とし、ユーザーへ確認を仰ぐ。  
既存モジュールの実績値（`data/modules/index.ts` から特定できる JSON）は参考情報として提示してよいが、
そのまま流用して確定してはならない。  
詳細な導出ルール・一致例・不一致例は `prompts/vNext/PN2-Drug-Header.md`「classKey 導出ルール」を正本とする。

`defaults.followupProfiles` は phase1_text_spine.json の followupProfiles を引き継ぎます。  
`defaults.followup` は followupProfiles のデフォルトエントリの内容オブジェクトをデリファレンスして設定します  
（文字列キーを代入するのではありません）。

---

### PN3A — Scenario Classification（判断専用）

**プロンプトファイル**: `prompts/vNext/PN3A-Scenario-Classification.md`  
**入力**: bridge.md + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase3a_decisions.json`

このフェーズは **判断するだけ** です。シナリオ本文・addon 本文を一切変更しません。

各シナリオに以下を決定します:
- `scenarioType`: bridge の `type=` フィールドと対応（treatment_start / treatment_adjustment / side_effect / adherence / treatment_end / lifestyle_guidance / sickday / followup）
- `scenarioGroup`: 内容に基づいた分類  
  **treatment_end 系の混同禁止**: `end_improved` / `end_insufficient_effect` / `end_ineffective` は各々その値を設定する。`"treatment_end"` は groupKey 専用であり scenarioGroup には使用しない（RULES.md §12）。
- `situationFilter`: `["general"]` または `["sickday"]`
- `sideEffectPresence`: side_effect 系シナリオのみ（absent_or_not_observed / present_mild 等）
- `sCompositionIntent` / `sCompositionTemplate` / `symptomCodes` / `symptoms`
- `groupKey`（semantic merge 用）
- `thirdPanelSPlacement`（injection module の特定シナリオ）

各 ADDON の `group` / `uiVariant` / `uiGroup` / `requiredTags` も PN3A で確定させます
（`uiGroup` は bridge ADDON ヘッダーに定義がある場合のみ。`requiredTags` は bridge Header の
`addonRequiredTags:` map、または ADDON ヘッダー行の inline `｜requiredTags=[...]｜` トークンの
**いずれか**に記載がある場合のみ。いずれも存在しない場合はキー自体を省略する）。

シナリオ側も同様に、bridge Header の `scenarioRequiredTags:` map、または SCENARIO ヘッダー行の
inline `｜scenarioRequiredTags=[...]｜` トークンのいずれかに記載がある scenario id のみ
`scenarioRequiredTags` を確定させます（PN3A-Scenario-Classification.md「addon requiredTags（Header map / inline 両対応）」
「scenario requiredTags（Header map / inline 両対応）」参照）。

**map と inline の両方に記載があり値が不一致の場合は MUST_STOP**（どちらか一方を優先しない・merge しない）。
両方に記載があり値が完全一致する場合はその値を採用しつつ CHECK として報告する
（現 Repository には両方式併存の precedent がないため）。詳細は PN3A の該当節を参照。

**scenarioColor（2026-08 追加・Unit C）**: SCENARIO ヘッダー行の inline `｜scenarioColor=...｜` トークンに
記載がある scenario id のみ PN3A が確定させます（Header map 形式は存在しない）。canonical 格納先は
`scenarios[].scenarioColor`（`lib/types.ts` の `Scenario.scenarioColor?: ChipColor`。Unit B で追加済み）。
記載がない scenario は runtime の既存 `scenarioToColor()` 導出ロジックへ 100% fallback するため、PN3A は
このフィールドを補完・推測せず、bridge に明示された値のみを転記します（詳細は PN3A の該当節を参照）。

| type= | group |
|---|---|
| lifestyle_guidance | `"counseling"` |
| sickday_guidance | `"sickday"` |
| adherence_guidance | `"adherence"` |
| side_effect_guidance | `"sideEffects"` |
| administration_guidance | `"counseling"` |

**変換表の正本は `prompts/RULES.md` §5 である。** 新規 module の group には
`"counseling"` / `"sideEffects"` / `"sickday"` / `"adherence"` / `"oral"` の 5 値のみを使用し、
`"lifestyle_guidance"` / `"administration_guidance"` という文字列を group 値として
直接設定してはならない（RULES.md §6）。bridge の `type=` は意味上の分類として
そのまま保持し、canonical JSON の group のみを変換する。

---

### PN3B — Scenario Metadata Apply

**プロンプトファイル**: `prompts/vNext/PN3B-Scenario-Metadata-Apply.md`  
**入力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json` + `/tmp/soap-build/{moduleId}/phase3a_decisions.json` + bridge.md（title のみ）  
**出力**: `/tmp/soap-build/{moduleId}/phase3b_meta.json`

PN3A の決定表を phase1_text_spine に適用して、シナリオと addon のメタデータ構造を完成させます。  
S / O / A / P / addon text は **一切変更しません**。

`scenarioRequiredTags`（scenario）/ `uiGroup` / `requiredTags`（addon）は PN3A の決定表にキーが
存在する場合のみ出力へ含める optional metadata です。存在しない場合はキー自体を省略します
（空配列・null の推測生成は禁止）。

出力規模: シナリオ数・ADDON 数が多い場合は 1,500〜2,000 行になります。  
Write ツールで 1 回出力し、完了後 `wc -l` で確認してください。

---

### PN4A / PN4B — xStructured 生成

**PN4A プロンプト**: `prompts/vNext/PN4A-Structured-GroupA.md`（治療系）  
**PN4B プロンプト**: `prompts/vNext/PN4B-Structured-GroupB.md`（副作用系・adherence 系・sickday / followup）  
**入力**: `/tmp/soap-build/{moduleId}/phase1_text_spine.json` + `/tmp/soap-build/{moduleId}/phase3b_meta.json`  
**出力**: `/tmp/soap-build/{moduleId}/phase4a_structured.json` / `phase4b_structured.json`

テキストを文単位に分解し、`SStructured / AStructured / PStructured` を生成します。  
text フィールドは phase1_text_spine からの **文字単位コピー** のみ。意訳・改変禁止。

**role 選択の重要ルール**（RULES.md §17 準拠）:

| シナリオ型 | SStructured.role |
|---|---|
| treatment_start | `treatment_start_reason` |
| treatment_adjustment | `dose_adjustment_reason` |
| treatment_end | `treatment_end_reason` |
| side_effect（副作用なし） | `side_effect_status` |
| side_effect（副作用あり） | `side_effect_presence` |
| adherence / lifestyle_guidance | `adherence_status` |
| sickday | `adherence_status`（usage 系として扱う） |
| followup（injection_technique_check） | `adherence_status`（usage 系として扱う） |
| usage（as_needed_refill 系等） | `adherence_status`（RULES.md §17 で 2026-07-24 に正式値化） |

**禁止語彙（使うとエラー）**: `sickday_status` / `followup_status` / `sickday_assessment` / `symptom_observation` / `adherence_observation` / `side_effect_observation` / `treatment_adjustment_reason`

PN4A と PN4B は並列実行可能です。PN3B 完了後に同時開始できます。

---

### PN5 — Non-Scenario Structure

**プロンプトファイル**: `prompts/vNext/PN5-Non-Scenario.md`  
**入力**: 複数の中間ファイル（PN2 / PN3A / PN3B / PN1）  
**出力**: `/tmp/soap-build/{moduleId}/phase5_non_scenario.json`

ui / risks / searchConfig / tagCatalog / expressModes を生成します。

**インスリン注射系の risks 標準テンプレート**（2026-09-20 Owner Review 確定。Owner Decision OD-T1）:

```json
"risks": {
  "primary": ["hypoglycemia_risk", "injection_site_reaction"],
  "secondary": [],
  "conditional": []
}
```

**non-insulin module の risks は常に固定 empty**（`{"primary": [], "secondary": [], "conditional": []}`）です。
structured Bridge risk contract も non-insulin 向け model_managed contract も存在しないため、有効な
override 経路はありません。bridge 自由文 / scenario ID / intentTags / 他 module / Reference・Golden
module / 既存 canonical からの推測・導出・転記はいずれも禁止です（宣言元: PN5 §risks セクション。
機械的担保: `tests/risksContract.test.ts`）。

---

### PN6 — Assembly

**プロンプトファイル**: `prompts/vNext/PN6-Assembly.md`  
**入力**: 7 つの中間ファイル（PN1〜PN5 すべて）  
**出力**: `data/modules/{moduleId}.json`（最終 JSON をプロジェクトに直接 Write）

新規コンテンツを生成しません。統合と保存のみ。  
最終 JSON はチャットテキストとして出力しません。Write ツールで保存します。

`uiVariant` と同型のルールで `uiGroup` / `requiredTags`（addon）/ `scenarioRequiredTags`（scenario）/
`scenarioColor`（scenario・2026-08 追加）を losslessly 保持します。中間工程に存在しないキーを PN6 が
独自補完することはありません（PN6-Assembly.md addon.uiGroup 保持ルール / addon.requiredTags 保持ルール参照）。
`template.handlingTags` / `reservedHandlingTags` は Step 1 で `template` セクションごと Phase 2 の値をそのまま採用するため、
個別ルールは不要です。

**Read 順序（コンテキスト効率化）**:
1. phase3a_decisions.json（軽量）
2. phase2_drug_header.json（中量）
3. phase5_non_scenario.json（軽量）
4. phase4a_structured.json（中量）
5. phase4b_structured.json（中量）
6. phase3b_meta.json（最大〜最後に）
7. phase1_text_spine.json（必要な場合のみ）

xStructured 突き合わせ確認: PN4A の id 一覧 + PN4B の id 一覧の和集合が全シナリオ id と一致することを確認してから生成を開始します。

---

### PN7 — Cross Reference Audit

**プロンプトファイル**: `prompts/vNext/PN7-Cross-Reference-Audit.md`  
**入力**: `data/modules/{moduleId}.json` + `/tmp/soap-build/{moduleId}/phase1_text_spine.json`  
**出力**: `/tmp/soap-build/{moduleId}/audit_report.json`

修正は行いません。32 項目を全確認します（A〜AH。**Q / X は欠番、項目 O は末尾に配置**）。
AC〜AG は uiGroup / requiredTags / scenarioRequiredTags / template.handlingTags / reservedHandlingTags、
AH は scenarioColor の bridge ⇔ canonical parity 監査（いずれも 2026-08 追加）。

**大規模 JSON の Read 手順**:
1. `wc -l data/modules/{moduleId}.json` で行数確認
2. 2,000 行超なら `offset=0, limit=2000` → `offset=2000, limit=2000` ... と分割 Read
3. 末尾（addons / expressModes / searchConfig）の確認を省略しない

32 項目すべて PASS → `audit_report.json` に `verdict: "PASS"` を書いて PN8 へ。  
FAIL がある → 該当 Phase に差し戻し。PN8 は開始しない。

---

### PN8 — Build / Runtime / Release

**プロンプトファイル**: `prompts/vNext/PN8-Build-Runtime-Release.md`  
**入力**: `/tmp/soap-build/{moduleId}/audit_report.json`

以下の順序で実行します:

1. `grep "{moduleId}" data/modules/index.ts` — registry 登録確認（未登録は RELEASE_HOLD）
2. `npx tsc --noEmit` — 型チェック
3. `npm run build` — ビルド確認（ModuleValidator / CrossModuleValidator を含む）

**重要**: tsc が通っても registry 未登録ではアプリ上にモジュールが現れません。  
登録確認を必ず tsc より先に行います。

---

# 4. 完了済み事項

## vNext プロンプト体系の設計・整備

以下のすべてが完了しています:

| ファイル | 完了内容 |
|---|---|
| PN1-Text-Extraction.md | ADDON 分散収集警告（M-5）+ /tmp/soap-build パス固定（H-1） |
| PN2-Drug-Header.md | bridge 欠落セクション fallback テーブル（M-1/M-2）+ パス固定（H-1） |
| PN3A-Scenario-Classification.md | followup 型 injection_technique → "injection_technique" 明記（M-4）+ パス固定（H-1） |
| PN3B-Scenario-Metadata-Apply.md | 大規模出力警告・wc-l 確認・削除再実行ルール（H-4）+ パス固定（H-1） |
| PN4A-Structured-GroupA.md | パス固定（H-1）+ 大規模 Read 注記 |
| PN4B-Structured-GroupB.md | sickday/followup SStructured.role 明示ルール + sickday_assessment 禁止（M-3）+ パス固定（H-1） |
| PN5-Non-Scenario.md | インスリン注射系 risks 標準テンプレート（M-6）+ こうけつ normalizedToken ルール + パス固定（H-1） |
| PN6-Assembly.md | Read 順序・xStructured 突き合わせ確認・不完全出力削除ルール（H-3）+ パス固定（H-1） |
| PN7-Cross-Reference-Audit.md | 分割 Read 手順・末尾省略禁止（H-2）+ パス固定（H-1） |
| PN8-Build-Runtime-Release.md | registry grep チェック・RELEASE_HOLD 条件追加（L-5）+ パス固定（H-1） |
| RULES.md §17 | sickday/followup の adherence_status ルール + 禁止語彙（M-3）+ followup_monitoring スコープ明確化 |
| docs/JSON_STANDARD.md | addon 必須 12フィールド / treatment_end 個別値 / sickday situationFilter / thirdPanelSPlacement / composition.priority / normalizedTokens 追記 |

## モジュールの一覧・由来・検証状態について

**本ファイルはモジュールの一覧・件数を保持しません。**

| 知りたいこと | 正本 |
|---|---|
| 登録済みモジュールの一覧・件数・登録順 | `data/modules/index.ts`（`ALL_MODULES`） |
| 現在の検証状態 | `npx tsc --noEmit` / `npm run build` / `npm run audit` の実行結果 |
| どのモジュールがどの体系・どの時期に生成されたか | **git history**（当該 JSON の追加 commit） |

由来（vNext / 旧体系）を単一のラベルとして保持しません。判断に必要となるのは
「その module が特定の規則の確定より前に作られたか」であり、これは git の日付から
判定します。個別の規則についての境界は、その規則を定めた文書側に記載します
（例: `prompts/RULES.md` §6 / §17、`docs/feature-glossary.md`）。

## 旧 followupProfiles バグの修正

PN1 / PN2 で `{ closingText: "..." }` という誤ったスキーマを生成していた問題を修正済みです。  
正しい型は `{ S?: string | null; P?: string | null }` です。この問題は再発しないよう両ファイルに明記されています。

## 事前設計審査（7項目）

旧体系 P0-B / P1 / P2B / P3 / P4 / P5 との比較、bridge→JSON 完全性確認、アプリ互換性確認、  
フェーズ責務マトリクス整合確認、最終 GO 判定を完了しています。

---

# 5. 次モジュール作業開始手順

## bridge 作成から開始する（JSON 未着手の新規モジュール）

新規モジュールの場合、PN1 に入る前に **bridge を作成する** 必要があります。

### bridge の構成

```
bridges/{moduleId}.md
```

構成は既存 bridge（例: `bridges/dm_insulin_intermediate.md`）を参照してください。

bridge の必須セクション:
1. **ヘッダーセクション**（moduleId / categoryPath / drug / display / composition / editingRules 等）
2. **SCENARIOS_START〜SCENARIOS_END**（シナリオ本文・ADDON 本文の全件）

### 作業順序

```
1. bridge ヘッダーを作成（STATUS: HEADER_ONLY）
     ↓
2. SCENARIOS_START〜SCENARIOS_END を作成（STATUS: DRAFT）
     ↓
3. ユーザー確認・凍結宣言（STATUS: DRAFT → FROZEN_FOR_PN1 へ更新）
     ↓
4. PN1 開始
     ↓
5. PN1 → [承認] → PN2 → [承認 + AUTORUN開始コマンド] → PN3A〜PN8 自動連続実行（完了後 STATUS: JSON_COMPLETE）
```

bridge の STATUS 値の定義・遷移ルール・PN1 開始条件は `prompts/RULES.md` §24（Bridge Status State Machine）を正本とする。

**bridge が既に完成している場合**: bridge ヘッダーの STATUS が `FROZEN_FOR_PN1` であることを確認してから手順 4 へ進んでください。STATUS が `DRAFT` / `HEADER_ONLY` の場合は PN1 を開始せず、ユーザーへ凍結宣言を確認してください。会話ログで「凍結済み」と伝えられていても、ファイル上の STATUS がそれと異なる場合はファイル側を優先し、矛盾があれば作業を停止してユーザーへ報告します（RULES.md §24）。

## PN1〜PN8 開始手順

```bash
# 1. /tmp/soap-build に既存ファイルがあるか確認する
ls /tmp/soap-build/{moduleId}/ 2>/dev/null && echo "既存ファイルあり" || echo "ディレクトリなし（クリーン）"

# 既存ファイルがある場合: 前回の中断セッションのファイルの可能性
# 内容をユーザーへ報告し、継続か再実行かを確認してから進む
# 再実行する場合: rm -rf /tmp/soap-build/{moduleId} && mkdir -p /tmp/soap-build/{moduleId}
# 継続する場合: 残存フェーズから再開する

# 2. ディレクトリ作成（新規の場合）
mkdir -p /tmp/soap-build/{moduleId}

# 3. bridge を確認
wc -l /Users/AdNauseumTendrils/Desktop/soap-engine/bridges/{moduleId}.md

# 4. PN1 プロンプトを読んでから PN1 を実行する
```

**PN1 実行前の確認チェックリスト:**
- [ ] bridge ヘッダーの STATUS が `FROZEN_FOR_PN1` であることを確認した（RULES.md §24。`DRAFT` / `HEADER_ONLY` の場合は開始しない）
- [ ] bridge の SCENARIOS_START〜SCENARIOS_END 範囲を確認した
- [ ] シナリオ数・ADDON 数を把握した
- [ ] P_CLOSING パターン数と件数内訳を把握した
- [ ] followupProfiles の型（S/P 形式）を理解した
- [ ] {{drug_subject}} 置換ルール（cp_good 等では補わない）を確認した
- [ ] ADDON が分散配置されている箇所を把握した

## 推奨実行順序

```
PN1 → [承認] → PN2 → [承認 + AUTORUN開始コマンド] → PN3A〜PN8 自動連続実行 → RELEASE_OK
```

半自動実行モード（AUTORUN）の詳細は `prompts/vNext/AUTORUN.md` を参照してください。  
通常モード（1 フェーズずつ）で実行する場合は、各フェーズ完了後にユーザーへ報告して停止します。

各フェーズ完了後の成果物確認コマンド:
```bash
wc -l /tmp/soap-build/{moduleId}/phase{N}*.json
```

## PENDING が発生した場合

PN2 で `composition.classKey` などが PENDING になった場合:  
その時点でユーザーへ確認を求め、回答を得てから PN2 を完成させてください。  
確認前に仮の値を埋めないでください。

**PN1 で対応表にない P_CLOSING に遭遇した場合**（2026-07-05 DPP4 対応で確定）:  
followupRef を独自命名で確定せず、`"PENDING"` として PN1 を停止し、ユーザー承認を待ってください。  
詳細は `prompts/vNext/PN1-Text-Extraction.md`「対応表にないP_CLOSINGテキストが出現した場合」を参照。

**PN2 で `display.subtitle` が bridge 未記載の場合**（同上）:  
ブランド列挙や他モジュール模倣で生成せず、`prompts/vNext/PN2-Drug-Header.md` の標準 fallback
（`"{drug.genericName}（{routeLabel}）"`）を使用してください。

**AUTORUN 中に PN7 で CHECK / PENDING が残った場合**（同上）:  
FAIL と同様に PN8 進行のブロッカーとして扱い、人間承認を得るまで PN8 を自動実行しないでください。  
詳細は `prompts/vNext/AUTORUN.md` MUST_STOP 条件 P / Q を参照。

---

# 6. 技術的負債（修正見送り中）

以下は機能上の問題はないが、将来対応が望ましい項目です。次モジュール作業のブロッカーではありません。

## AddonPanel.tsx の GROUP_LABELS 未登録グループ

Addon の表示順は DP-10 / RULES.md §25 の通り bridge / JSON の記載順（`addonsRef.P`）をそのまま使用する（固定配列 GROUP_ORDER は廃止済み）。
一方、`app/components/AddonPanel.tsx` の `GROUP_LABELS` には日本語ラベルが未登録のグループが存在します。未登録グループは `GROUP_LABELS[group] ?? group` により、表示順自体は JSON 記載順どおりだが、ラベルのみ英語文字列のまま表示されます（機能上は動作する）。

| group 値 | 対応方針 |
|---|---|
| `lifestyle_guidance` | GROUP_LABELS 追加を将来検討（ラベル案: "生活指導"） |
| `administration_guidance` | 同上（ラベル案: "使用方法"） |
| `adherence` | 同上（ラベル案: "アドヒアランス"） |

使用モジュール数・件数は保持しません（`data/modules/*.json` の `addons.items[].group` を
走査して取得します）。

**方針**: 新規 module の group にこれらの値を使用してはならない。`prompts/RULES.md` §5 の変換表に従い
`"counseling"` 等の正式 group 値へ変換すること（同 §6 で明示的に禁止されている）。本表が示しているのは
本ルール確定前に生成された既存 module の実態であり、既存 module の migration 要否は別途判断とする。
AddonPanel の表示ラベル改善（`adherence` を含む）も別タスク。

## ModuleValidator 既存 WARNING

既知の WARNING（意図的に残存させているもの）の台帳は
**`docs/VALIDATOR_STANDARD.md` Appendix B: KNOWN_INTENTIONAL_WARNINGS が正本**である。

`npm run build` で WARNING が出力された場合は、まず Appendix B に登録済みかを確認すること。
登録済みであれば対応不要。未登録の WARNING が出た場合は、今回の変更が原因である可能性を
確認した上で報告する。

本ファイルでは台帳を二重管理しない。

## git ワーキングツリーの残存差分

**現在の未コミット差分は `git status --porcelain=v1` の実行結果を正本とします。**
本ファイルは、現在の差分一覧・件数を保持しません。

以下は、該当ファイルが未コミット差分として存在する場合の既知の取扱いです。

| ファイル | 理由 |
|---|---|
| `.claude/settings.local.json` | Claude Code 自動更新の権限設定。2026-09 baseline cleanup（commit `1c8504a`）で untrack 化済み。`.gitignore` の既存ルールにより ignored。ローカルには存在するが `git status` には現れない |
| `.claude/launch.json` | 意図的な local-only の dev サーバー起動定義（`npm run dev` / port 3000）。Claude Code 専用設定であり product/runtime state ではない。追跡不要・untracked のまま維持してよい |

## GAP-01: vNext に CROSS_MODULE_DERIVATION_CHECK が存在しない

**内容**: 旧 P2B には「他モジュールの値を無断流用していないか」の確認 step があったが、  
vNext には対応する明示的なチェック項目がない。  
**現状**: 運用ルール「RULES.md §1 — 未指定の data/modules 内 JSON を自動選定してはならない」で代替している。  
**対応**: vNext への正式追加は未定。

## 一般名検索到達性（Q-S1）と O field 修正（2026-07 完了）

糖尿病領域モジュール群で、一般名（成分名）検索が同一成分の兄弟ブランドへ正しく展開されない問題（Tier1〜3）と、  
`dm_glp1ra_semaglutide_oral` / `dm_glp1ra_injection` の O field が薬効分類名固定になっていた問題（RULES.md §16 違反）を修正済みです。

- 採用した設計原則: `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）
- Tier 分類・残課題の詳細経緯: `docs/OPEN_DESIGN_QUESTIONS.md` Q-S1
- O field 修正の記録: `prompts/RULES.md` CHECK-O01

新規モジュール（DPP4 等）を作成する際は、上記 DP-09 と PN2-Drug-Header.md の「alias の責務境界（brand identity / generic identity / 薬効クラス名）」を確認してください。

## 検索ユニット（2026-09 完了）— G5 prefix gate / 曖昧性ガード / DP-18 leukotriene alignment

**この節は歴史的観測（historical observation）である。** 「最後に確認した時点の状態」を記録するものであり、
現在の Repository の恒常的事実ではない。現在の実装・テスト・監査結果は都度 `npx tsc --noEmit` /
`npm test` / `npm run audit` / `npm run test:multi-drug` の実行結果を正本とすること。

**最後に確認した deployed / remote 状態**

```
commit  54e77297fabbd518ba9391576e60fd44b0bd4132
subject fix: align leukotriene search name precedence
branch  feat/nlp-input-panel-and-new-schema
```

この commit を含む一連の検索ユニット（`ee99cd1` 〜 `54e7729`）で完了した事項:

- **G5: 意味的ファミリーゲート `gateFloor` の 3 文字プレフィックス拡張** — 単一トークン・正規化長 3 文字以上のクエリに限り活性化フロアを 4 まで緩和し、2 文字以下は既存の 5 を維持。活性化フロアと曖昧性走査フロアの結合を必須化。設計判断の正本は `docs/DESIGN_PRINCIPLES.md` DP-18（2026-09 追補）。回帰は `tests/searchG5PrefixGate.test.ts`
- **曖昧性ガード（MULTI_INGREDIENT_STRONG_ALIAS）の結合** — 意味的ファミリー挙動は、gateFloor 以上で一致した alias が単一有効成分（単剤のみ。配合剤は計数対象外）へ一意に解決する場合にのみ発動するよう明確化。唯一の Owner 承認済み例外は「のぼり」
- **D2: genericMode 側の重複ヘッダー抑制の過抑制修正**（`5c11012`。G5 に**先行**する） — ヘッダー抑制の判定を「grouping に存在するか」から「このクエリで実際に emit された brand と同名か」（`brandsInGroup.includes(genericName)`）へ変更。抑制が過剰に働いていた 13 クエリを是正（heparinoid 9 クエリ形／3 モジュール + H1点眼 4 ブランド読み = 13）。この時点で既にゲート適格だったクエリの是正であり、G5 によって到達可能になったものではない。**後続の G5（`8ba93c2`）がゲートを拡張したことで、この是正済み D2 判定が適用される母集団が広がり**、冗長な一般名見出しは 114 → 11 クエリへ減少した（`8ba93c2` 実測）
- **Montelukast / Pranlukast の DP-18 alignment** — `allergy_leukotriene_receptor_antagonist_oral` のデータのみを修正（`lib/search.ts` 無変更）。先発品（キプレス/シングレア/オノン）から借用していたペア一般名読みの alias を撤去し、`preferOwnNameMatchOverGenericMatch` を有効化
- **Owner Decision OD-DRUG-PREFIX-BOUNDARY-1 の確定** — bare 薬剤名クエリについて、正規化長 3 文字以上を厳格な UX 要件の帯、1〜2 文字を best-effort の帯として明示的に切り分けた。secondary clinical token（例:「あれじ てん」の第2トークン）には適用されない別軸の話であることも同時に確定。設計判断の正本は `docs/DESIGN_PRINCIPLES.md` DP-18（2026-09 追補）

**残存する検索バックログ（未着手・4件）**

いずれも本節にのみ一覧を置く。個別の再開 Trigger・詳細は各正本（`docs/DESIGN_PRINCIPLES.md` /
`docs/OPEN_DESIGN_QUESTIONS.md`）を参照し、本節では複製しない。

1. **剤形／投与経路／部位 intent アーキテクチャ**（例:「あれじ てん」「あれじ がん」、将来の眼軟膏系の lexical path）— `docs/OPEN_DESIGN_QUESTIONS.md` Q-R1
2. **route-label 表示の一般化方針**（例:「オゼンピック注」の装飾ラベル命名規則）— `docs/OPEN_DESIGN_QUESTIONS.md` Q-R2
3. **Phase 2-B display dedup**（配合剤候補の表示順・家族単位対称性。commit history 上の呼称。DP-21 の `SF-2A` も同一範囲を指す）— 凍結範囲の正本は `docs/DESIGN_PRINCIPLES.md` DP-20「適用しないこと」節（2026-09 用語対応追記あり）。追跡は `docs/OPEN_DESIGN_QUESTIONS.md` Q-R3
4. **1〜2文字 bare 薬剤名クエリの順位安定性最適化**（OD-DRUG-PREFIX-BOUNDARY-1 の best-effort 帯。Q-UX1 とは別軸であり統合しない）— `docs/OPEN_DESIGN_QUESTIONS.md` Q-S3

## 検索フェーズ closure チェックポイント（2026-09）

**本節も歴史的観測（historical observation）である。** 現在の Repository の恒久的事実ではない。新しいチャット・新しい担当者は、着手前に branch / HEAD / tracking / fresh remote / ahead-behind / working tree、および関連する検証コマンド（`npx tsc --noEmit` / `npm test` / `npm run audit` / `npm run test:multi-drug`）の実行結果を必ず再測定すること。

**最後に確認した local / tracking / fresh remote 状態**

```
commit  1c8504ad6d04188fe024ed7ad36ffe941a0d4fa1
subject chore: clean local claude baseline state
branch  feat/nlp-input-panel-and-new-schema
ahead/behind（当時の origin 比較）: 0 / 0
```

上記の検索ユニット（`54e7729` まで）に加え、以下も完了済み:

- **living-SSOT ドキュメント更新**（commit `ee2204e`）— G5 gateFloor 結合原則・曖昧性ガード（MULTI_INGREDIENT_STRONG_ALIAS）・D2 是正・DP-18 leukotriene alignment・Owner Decision OD-DRUG-PREFIX-BOUNDARY-1 を `docs/DESIGN_PRINCIPLES.md`（DP-18 追補・DP-20 用語対応）・`docs/OPEN_DESIGN_QUESTIONS.md`（Q-S3／Q-R1／Q-R2／Q-R3 新設）・本ファイル本節へ正式記録した。独立読込監査 → 事実訂正（causality・score 意味論・uiLabel 現状・typo の4件）→ 再監査を経て `READY_FOR_SEARCH_DOC_PUSH` 判定・push 済み
- **検索トークン pipeline 監査**（documentation-only。実装追加なし）— `commonSearchTokens` / `formulationSearchTokens` の bridge⇔canonical JSON parity は機械監査未整備であることを確認した（`lib/moduleValidator.ts` の `SEARCH_TOKEN_ALIAS_POLLUTION` は JSON 内混入検出のみで parity 監査ではない）。現状は derm_heparinoid 系 4 module のみが対象で、実測乖離は 0 件。**本検索フェーズを塞ぐものではない**が、将来の剤形／投与経路／部位 intent アーキテクチャに着手する前、またはそれと同時に、決定論的な parity 監査の追加が前提条件として記録されている（正本は `docs/OPEN_DESIGN_QUESTIONS.md` Q-R1。本節では複製しない）
- **local baseline cleanup**（commit `1c8504a`）— `.claude/settings.local.json` を untrack 化（`.gitignore` の既存ルールが有効化。ローカルの権限設定は保持したまま復元なし）。`bridges/dm_gip_glp1ra_tirzepatide_injection.md.bak`（未追跡ファイル）を削除 — Owner が唯一の未コミットシナリオ `se_dose_decrease_due_to_injection_site_reaction` をレビューし不採用と判断したため（注射部位反応には独立した減量シナリオではなく手技／部位調整・経過観察・中止・変更で対応する方針）。`.claude/launch.json` は意図的な local-only dev サーバー設定として untracked のまま維持

**現在の検索フェーズは完了した。残りの検索関連トピックは意図的に将来ユニットへ defer されたものである**（「検索が恒久的に完了した」という意味ではない。上記「残存する検索バックログ」4件は引き続き有効であり、本節はそれを縮小・拡大しない）。

**Owner Decision の正本（複製しない）**: OD-DRUG-PREFIX-BOUNDARY-1（bare 薬剤名クエリにおける正規化長 3 文字以上の厳格帯 / 1〜2文字 best-effort 帯。ordering・family 解決・generic/originator 関係・曖昧性安全性は 3+ 文字帯でのみ厳格 UX 要件）の正本は `docs/DESIGN_PRINCIPLES.md` DP-18（2026-09 追補）である。

**皮膚科 / KW-002 について（restart note のみ。新規実装判断なし）**: `docs/VALIDATOR_STANDARD.md` Appendix B KW-002（heparinoid 系 `SEARCH_TOKEN_ALIAS_POLLUTION` の module 一覧・理由記載のずれ）は `PENDING_VALIDATOR_STANDARD_KW002_DOC_DRIFT` として未修正のまま残っている。Owner は今後の方向性として、次の薬効領域は既定どおり点眼領域を継続し、皮膚科系は個別パッチではなく将来ユニットで同一品質基準に基づき包括的に再構築する意向を示した。**これは `docs/OPEN_DESIGN_QUESTIONS.md` E-7 を確定させる正式 Owner Decision ではなく、E-7 は引き続き OPEN のままである。** KW-002 の是正は緊急ではなく、皮膚科再構築ユニットの着手時にまとめて扱ってよい。`docs/VALIDATOR_STANDARD.md` 自体は本コミットで変更しない。

**次のチャット・次の担当者への再開手順**

1. Repository が唯一の正本である。本ファイル（本節を含む）は index であり、現在の事実そのものではない
2. 作業着手前に、branch / HEAD / tracking / fresh remote / ahead-behind / working tree、および直近の `npm test` 等の検証結果を必ず再測定すること
3. 現在の検索フェーズは、上記「最後に確認した」チェックポイントの時点でクローズされている
4. 上記「残存する検索バックログ」4件は、次のユニットとして明示的に選択されない限り再開しない
5. 次の主要タスクは検索と無関係である可能性がある（本節は次のタスクを推測・指定しない）

## 多剤合成テスト（`npm run test:multi-drug`）— 正式回帰テストとして運用

**なぜ正式化したか**  
検索・alias・drug 構造（Q-S1 対応）を変更した際、複数薬剤を同時選択して SOAP を合成する経路（`buildNodeFields` + `mergeBlocks`）に悪影響がないかを、UI 実機確認だけでは見落としやすいと判明したため、`scripts/test-multi-drug-synthesis.ts` として Node/tsx のみで再実行できる形に整備しました。当初は一時スクリプトでしたが、DP-00（強くてニューゲーム原則）に基づき「検証手段も会話履歴に依存させずリポジトリへ永続化する」方針のもと、`npm run test:multi-drug` として正式にコミットしています。会話ログに検証手順が残っているだけでは、生成AIの担当交代（新規チャットへの切替、利用するAIサービスの変更を含む）が起きた瞬間に再現不能になるためです。

**何を検出するか**  
{{drug_subject}} 未解決 / O フィールドが薬効分類名固定のまま残っていないか（CHECK-O01 の回帰確認）/ uiVariant 等の内部文字列の SOAP 混入 / addonsRef 参照切れ / `getVisibleAddonKeys()`（AddonPanel が実際に呼ぶ関数）でのキー解決可否 / P closing の不自然な重複 / 同一成分・類似成分を含む薬剤同士の合成破綻。

**いつ実行するか**
- 検索・alias・drug 構造（`drug.search` / `brandCatalog` / `aliasToBrand` 等）を変更した場合（`docs/IMPLEMENTATION_CHECKLIST.md` に明記済み）
- **糖尿病領域を完了とみなす前、および DPP4 など次の薬効領域に着手する前**（現状 20 ケース全 PASS が前提条件）
- 新しい薬効領域のモジュールを追加した後（下記参照）

**今後の運用**  
新しい薬効領域（DPP4 等）のモジュールを追加したら、既存の 20 ケース（`scripts/test-multi-drug-synthesis.ts` の `TEST_CASES` 配列）に、その領域を含む組み合わせケースを追加していくこと。既存モジュールとの多剤併用（例: DPP4 + 既存インスリン/GLP-1）を必ず1ケース以上含める。ケースを削除する場合は「なぜ不要になったか」を PR やコミットメッセージに残すこと（DP-00 準拠）。

## DashboardClient の resolveDrugName() SSOTバイパス

`lib/drugSubject.ts` の `resolveDrugName()` は、薬剤名解決の唯一の正本として設計されている。関数の docstring に「通常UI・SOAP生成における薬剤名解決のSSOT。呼び出し元固有のフォールバックロジックを個別に書かず、常にこの関数を経由すること」と明記されており、`docs/JSON_STANDARD.md`（231行、`resolveDrugName()` 節）も「UI側は `genericName` へのフォールバックを行わない。`resolveDrugName()` が薬剤名解決の唯一の正本」と同旨を記載している。

`app/components/DashboardClient.tsx` の一部箇所は、この SSOT を経由せず独自の fallback ロジックで brand 名を直接確定させている（検索語: `resolvedBrand`。`activeBrandName ?? activeModuleData.drug?.brandNames?.[0]` という形で `resolveDrugName()` を介さずに直接 fallback している箇所が存在する）。

**扱い**: 既存の確定済みルール（`resolveDrugName()` をSSOTとして常に経由する）への未追随であり、新しい設計判断が必要な Question ではなく、**技術的負債**として扱う。

**現時点で確定していること**
- `resolveDrugName()` がSSOTである
- `DashboardClient.tsx` の一部fallbackがこのSSOTを迂回している

**今回決めていないこと**: 具体的な修正方法・変更箇所・移行順序・修正時の blast radius。これらは Repository 実測に基づき実装時に別 Unit として設計する。

**進捗（Q-S2 U-3・2026-08-09）**: 安全な resolver 契約（`resolveSubjectFromResolution()`、`lib/drugSubject.ts`）は実装済み。ただし `DashboardClient.tsx` 等の consumer は引き続き legacy 経路（`resolveDrugName()`）を使用中であり、本 SSOT バイパスは**未解決のまま**である。

**進捗（Q-S2 U-4a・2026-08-12）**: `BrandResolution` を production state（`activeResolution` / `ComposeNode.resolution`）へ保持する plumbing のみを実施した。**consumer 移行は行っていないため、本 SSOT バイパスは引き続き未解決である。** U-4a は runtime behavior を一切変更しない Unit であり、consumer 移行は **U-4b**、`denotation: 'module'` に対する安全 gate は **U-5** が担当する（工程順は U-4a → U-5 → U-4b）。

**バイパス箇所の補足（U-4a 実測で追記）**: 本節が例示していた `resolvedBrand` 系（brandKey 用途）に加え、`handleAddonToggle` の Rapid ADDON 経路が `activeDrugDisplayNameRef.current ?? activeBrandName ?? ''` という形で `resolveDrugName()` を**完全に迂回**して brandKey を SOAP 主語に流用している（検索語: `rapidDrugName`）。本箇所も U-4b の移行対象である。

**進捗（Q-S2 U-5・2026-08-12）**: `denotation: 'module'`（指示対象が未確定）の状態から SOAP 生成・brand 固有解決へ進ませない安全 gate を導入した。あわせて `denotation: 'generic'` における brand 固有 `handlingTags` の取得を「`brandKeys` 全件の交差集合」へ改め、代表 brand fallback を production から除去した（`lib/brandTags.ts`）。**subject の算出方法は変更していないため、本 SSOT バイパスは引き続き未解決である**（U-4b の責務）。ただし `denotation: 'module'` は SOAP 生成へ到達不能になったため、U-4b が扱う subject 乖離は brand / generic の 6 パターンのみに縮小した。

**解消（Q-S2 U-4b・2026-08-12）**: 検索由来候補の SOAP 主語は `BrandResolution` → `resolveSubjectFromResolution()` へ移行し、`drugDisplayLabel !== matchedBrandName` による主語推論は production から除去された。**本節が記録していた SSOT バイパス（検索由来経路）は解消済みである。** 意味論的変更は generic 6 module のみ（代表 brand 名 → 一般名）。

ただし **`resolveDrugName()` は削除も deprecated 化もしていない**（Owner Decision S-1-A）。`BrandResolution` を持たない Express・legacy 非検索経路・test harness の resolver として引き続き使用する。production 呼出しは 3 件残り、すべて `?? resolveDrugName(...)` の形＝ resolution 由来 subject が無いときにのみ到達する分岐である。**「Repository 全体で削除済み」ではない。**

**F-RAPID-1 の現状（U-4b 後）**: `rapidDrugName` の式形（`activeDrugDisplayNameRef.current ?? activeBrandName ?? ''`）は U-4b でも変更していない。ただし write-site 移行により `activeDrugDisplayName` が `resolution.subject` を保持するようになったため、**通常 SOAP / Rapid / S先頭文 / ADDON 再生成は同一の subject source を読む**。実測で挙動差は 0 件。式形の統一は cleanup Finding として保持する。

**別 Finding（Q-S2 とは無関係・cleanup 候補・2026-08-13 記録）**: `app/components/AddonPanel.tsx` はボタンラベルに `item.title ?? item.text` を描画する。`addons.items[].text` に `{{drug_subject}}` を含む addon（例: `dm_insulin_regular` の `addon_initial_sickday_guidance`）では、**ADDON パネルのラベル上に raw placeholder がそのまま見える**。ADDON を ON にして **SOAP 本文へ挿入される際は正しく薬剤名へ置換される**ことを Runtime Preview で確認済みであり、**clinical content の correctness ではなく UI ラベル表示のみの問題**である。`AddonPanel.tsx` は Q-S2 の全 commit（U-1〜U-4b）で未変更であり、**U-4b 起因ではない**。本 Unit では修正しない。

**別 Finding（今回変更しない）**: `handleExpressAdd` の `brandName ?? mod.drug?.brandNames?.[0]`（brandKey）および `displayName ?? resolvedBrandKey ?? ''`（主語を brandKey から導出）も legacy fallback である。ただし Express は `DrugSuggestionItem` を経由せず、有効な express entry 全件が canonical JSON 側で `defaultBrandName` を明示宣言しているため、検索由来の brand 未確定とは性質が異なる。Q-S2 の U-4a / U-5 / U-4b 系列からは分離し、cleanup 候補として保持する。

**Q-S2 CLOSED（U-8・2026-08-13）**: BrandResolution 系列（U-1〜U-7 + Runtime Preview 検証 + U-8 Deferred 再評価）は完了し、**`REMAINING_QS2 = 0`** で Q-S2 は CLOSED となった。本節が記録していた **F-3（`resolveDrugName()` SSOT バイパス）は解消済み**である。Deferred の最終分類・closure 条件・再発防止機構は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2「U-8」節（正本）および `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §13.9 を参照。

**Q-S2 の blocker ではない残作業**（いずれも別工程として扱う）:

- **U-6**（class-level query の generic group 展開）— correctness 完了の必須条件ではない。`denotation: 'module'` へ到達する 20 module で「候補は選べるが SOAP を作れない」行き止まりを解消する**検索 UX 改善**。
  **再開 Trigger**: `docs/OPEN_DESIGN_QUESTIONS.md` Q-UX1 の方針（選択肢 A/B/C）が Owner により決定された時点。U-6 は候補**集合**を変える唯一の Unit であり `limit=8` の配分と干渉するため、Q-UX1 の方針決定前に着手しない（依存は一方向。Q-UX1 は U-6 なしで単独実施できる）
- **Q-UX1**（ranking / `limit=8` / candidate visibility）— 独立した Question。D-4 の prefix `い` 表示枠脱落・F-S3-1 を含む。**再開 Trigger** は同 Q-UX1「推奨判断タイミング」（実機で表示枠脱落が実害として確認された時点）
- **cleanup Finding** — 下記 F-RAPID-1 / AddonPanel。いずれも BrandResolution の correctness / safety に影響しない（F-EXP-1 は U-EXP1 で解消済み。下記参照）

**F-EXP-1 は解消済み（U-EXP1・2026-08-13）**: ACTIVE な Express エントリ（`enabled === true && disabled !== true`）に対し `defaultBrandName` / `defaultScenarioId` / `sortOrder` を必須とする契約を、`docs/JSON_STANDARD.md` JS-expressModes（正本）・`lib/moduleValidator.ts`（詳細診断）・`scripts/audit-brand-resolution-safety.ts`（exit code による enforcement）の 3 層で機械化した。canonical JSON・bridge・runtime はいずれも変更していない。`handleExpressAdd` の `brandName ?? mod.drug?.brandNames?.[0]` は runtime に残置しており（削除すると `{{drug_subject}}` が未解決のまま SOAP 本文へ露出するため）、到達不能な safety net として扱う。

**F-EXP-2: legacy 単数 `expressMode` 構造（未対応・別 Unit）**: `lib/types.ts` の `ModuleData.expressMode?`（単数）は `expressModes[]`（配列）とは別系統の Express 入口である。

| 観測（U-EXP1 実測） | 内容 |
|---|---|
| canonical JSON での使用 | **0 件** |
| runtime 分岐 | **残存**（`app/components/DashboardClient.tsx` の `expressCandidates`。`expressModes` が無い module でのみ発火） |
| validator 検査 | **0 件**（check 17 は `expressModes` が配列のときのみ実行される） |
| JSDoc | `defaultBrandName` 省略時の `drug.brandNames[0]` フォールバックを**後方互換仕様として明示的に認めている** |

すなわち U-EXP1 が閉じた anti-pattern の再入経路が単数形側に残っている。使用 0 件のため現時点の実害はないが、新規 module が単数形を採用すると validator を素通りする。**廃止（型・runtime 分岐の削除）／ validator 追加 ／ 現状維持 のいずれを採るかは別 Unit の判断とする**（Owner Decision OD-D・2026-08-13。U-EXP1 へは統合しない）。

**`expressModes[].genericDisplayName` の必須性は未確定（Finding・U-EXP1 で判断保留）**: `docs/JSON_STANDARD.md` JS-expressModes は本フィールドを `enabled: true` のエントリに設定するものとして記載する一方、`lib/types.ts` / `ThirdPanel.tsx` の JSDoc は「省略時は `label` をそのまま使用する」と optional を明示しており、両者が食い違う。実測では `enabled: true` の 59 件すべてが宣言済み（`enabled: false` の 86 件は 0 件）で、runtime の参照箇所はすべて `?? label` の fallback を持ち、SOAP 主語へは到達しない（表示ラベル専用）。**述語も fallback の安全性も上記 3 フィールドと異なるため、U-EXP1 の invariant には含めていない。** 必須化するか optional と確定するかは Owner Decision を要する。

関連する brand 解決の安全性論点全体は `docs/OPEN_DESIGN_QUESTIONS.md` Q-S2 を参照。

## Phase 1 監査（2026-07-25）由来の未解消 Finding

`docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md` §6 の所見のうち、**未解消のまま量産フェーズへ
持ち越すもの**を本節へ移した（初出の根拠・再現手順は同記録が正本。同記録は historical evidence 層に
あり読込経路から到達しないため、現在の状態と再開 Trigger は本節が持つ）。

**M-1: bridge STATUS 状態機械が実データで維持されていない**

`prompts/RULES.md` §24 は `HEADER_ONLY → DRAFT → FROZEN_FOR_PN1 → JSON_COMPLETE` を定めるが、
canonical JSON 化・registry 登録が済んだ bridge の大半が `JSON_COMPLETE` へ遷移していない。
STATUS 記載自体がない bridge（§24 制定前に作られたもの）もある。**canonical / runtime / correctness の
いずれにも影響しない**が、`prompts/RULES.md` §24 の「PN1 開始条件」判定に使う値であるため、
量産中は module 追加のたびに乖離が 1 件ずつ増える。現在の分布は
`grep -H "STATUS: " bridges/*.md` の実行結果を正本とする（本節は件数を保持しない）。

> **再開 Trigger**: 次のいずれか。① 次の薬効領域が Domain Complete（`docs/DEVELOPMENT_STANDARD.md` §8）
> に到達する時点 ② STATUS 値を根拠に PN1 の開始可否を判断する場面が実際に発生した時点
> ③ Owner が bridge STATUS の一括是正を指示した時点（**STATUS 行の変更には Owner の明示指示が必要**。
> RULES §24「Claude が自主的に降格させてはならない」「変更してよいのは Owner が明示的に状態遷移を
> 指示した場合のみ」）。監査を機械化する場合は `scripts/audit-bridge-status.ts` 相当を
> `npm run audit` へ追加する案が同監査記録 §11.1 T-4 に記録されている

**M-4: `as unknown as ModuleData` による型境界の迂回**

`data/modules/index.ts` は各 JSON を `as unknown as ModuleData` でキャストしており、**module 1 件につき
1 箇所ずつ増える**。`tsc` は JSON の構造を検査しない。当初監査は「量産再開前」の対応を推奨していた。

ただし当時と異なり、構造整合は現在**機械的に担保されている**: `lib/moduleValidator.ts`（37 check）/
`lib/crossModuleValidator.ts` / `npm run audit` 4 系統 / `tests/moduleRegistry.test.ts`（登録漏れ検出）/
`tests/moduleValidator.test.ts`（全 module ERROR 0 の invariant）。**型が担保するはずだった範囲は
これらが代替しているため、キャスト自体は現時点で欠陥として顕在化していない。**

> **再開 Trigger**: 次のいずれか。① **validator / audit / test のいずれでも検出できない構造欠陥が
> 1 件でも実測された時点**（＝機械担保に穴があると判明した時点） ② canonical JSON のスキーマを
> 外部（他ツール・API・SaaS）へ公開する必要が生じた時点（Phase 3〜4） ③ Owner が
> スキーマ進化戦略（JSON Schema / zod 導入）に着手すると判断した時点。
> **「キャストが 35 件ある」こと自体は再開理由にならない**（件数は module 数の従属変数であり、
> 欠陥の指標ではない）

**その他の Phase 1 所見の所在**: H-1 / H-2（persona バグとテスト）は解消済み（`37a9262` /
`tests/personaState.test.ts`）。H-4（正本の陳腐化）は変更契機・Lifecycle・読込経路の制度化により解消。
H-3（CI / ブランチ戦略・本文書での通称 S4-C）は **`docs/OPEN_DESIGN_QUESTIONS.md` Q-E の E-3
（main の位置づけ）が回答されるまで着手条件が揃わない**。M-2（認証境界）は Phase 3〜4、
M-3（全 module 配信）は F-1 で帯域評価が更新され Phase 5 相当へ後退、M-5（DashboardClient の状態集中）は
保守者が増える時点（Phase 3）。E-1〜E-7 の現在状態は `docs/OPEN_DESIGN_QUESTIONS.md` Q-E が正本。

## STRUCTURED_ROLE_FORBIDDEN validator の coverage gap（blocklist 方式の限界 — SStructured / AStructured / PStructured 共通）

**FACT**:
- `lib/moduleValidator.ts` の `STRUCTURED_ROLE_FORBIDDEN` check は `FORBIDDEN_S_STRUCTURED_ROLES` / `FORBIDDEN_A_STRUCTURED_ROLES` / `FORBIDDEN_P_STRUCTURED_ROLES` の 3 本を用い、**SStructured / AStructured / PStructured の role を対象とする 1 つの check** である（`docs/VALIDATOR_STANDARD.md` §3-B check 29）。いずれも禁止語彙の**ブロックリスト方式**であり、`prompts/RULES.md` §17 の確立語彙に存在しない role でも、このブロックリストに明示されていなければ validator は検出しない場合がある。**本 gap は S に限定されない。**
- 実測例（SStructured）:
  - `symptom_observation`（`dm_insulin_rapid_analog`）— ブロックリスト登録済みのため検出され、**deterministic migration 済み**（2026-08-16、`adherence_status` へ）
  - `acute_condition_status`（`dm_gip_glp1ra_tirzepatide_injection` / `dm_glp1ra_injection` / `dm_glp1ra_semaglutide_oral`）— ブロックリスト**未登録**のため build では検出されず、横断調査で判明。**deterministic migration 済み**（2026-08-16、`adherence_status` へ）
  - `as_needed_status`（`allergy_h1_antihistamine_second_gen_oral`）— `prompts/RULES.md` §17 が「本ルール確定前の legacy 実装であり ERROR 該当」と明記しているにもかかわらず、ブロックリスト未登録のため build 上は無検出だった。**deterministic migration 済み**（2026-08-16・U-SR3-A / `b613722`、`adherence_status` へ）。**occurrence は解消したが、`as_needed_status` がブロックリスト未登録であるという coverage gap 自体は未解消である。**
- 2026-08-16 の全35 module 横断スキャンで、RULES.md §17 の確立語彙・禁止語彙のいずれにも属さない `SStructured.role` が複数種・80箇所超（5 module 以上）存在することを確認した。**これらを一括して defect と分類してはいない。** `symptom_absence_check` / `symptom_presence_check` 等は `2becf03`（2026-04-19）で著者が `acute_condition_status` から意図的に移行させた先であり、legacy defect ではなく現行の未文書化語彙である可能性がある。個別の classification が必要であり、今回は実施していない。
- 実測例（AStructured・2026-08-16 の Cold-Start 調査で判明）:
  - `sickday_assessment`（`dm_gip_glp1ra_tirzepatide_injection` / `dm_glp1ra_injection` の `sickday` シナリオ・計 2 件）— `prompts/RULES.md` §17 が **AStructured.role の禁止語彙（ERROR）**として明示列挙しているが、`FORBIDDEN_A_STRUCTURED_ROLES`（`drug_mechanism` / `lifestyle_assessment` の 2 値のみ）に**未登録**のため、validator / audit / test / build のいずれでも検出されなかった。**deterministic migration 済み**（2026-08-16・U-SR3-A / `b613722`、`treatment_assessment` へ）。**occurrence は解消したが、`sickday_assessment` がブロックリスト未登録であるという coverage gap 自体は未解消である。**
  - `administration_assessment`（2 件）/ `dose_adjustment_assessment`（6 件）— RULES.md §17 の AStructured 確立語彙・禁止語彙のいずれにも属さない
- 実測例（PStructured・同上）:
  - `urgent_consult_advice`（3 件）— RULES.md §17 の PStructured 確立語彙・禁止語彙のいずれにも属さない
- **`administration_assessment` / `dose_adjustment_assessment` / `urgent_consult_advice` を defect と断定してはいない。** legacy defect か現行の未文書化語彙かの classification は未実施であり、SStructured 側の未分類 role と同じ扱いとする。
- なお `FORBIDDEN_S_STRUCTURED_ROLES` も RULES.md §17 が ERROR と宣言する `drug_status` / `sickday_status` / `followup_status` を含まない（canonical JSON 上の使用は 0 件）。blocklist が §17 の宣言を全数反映していないことは S / A / P に共通する。

**impact**:
- Structured metadata（`SStructured` / `AStructured` / `PStructured`）は現在 runtime 未接続（`prompts/PROJECT_CONTEXT.md` §5、`lib/types.ts`）であり、現行 SOAP 生成 correctness への直接影響は確認されていない。**この既存判断は A / P の追加によって変わらない。**
- ただし「validator / audit / test のいずれでも検出できない構造差異が存在する」という機械担保上の gap であり、将来 Structured metadata / Persona Structured metadata の runtime 接続を行う場合には correctness risk になりうる。

**current status**:

| 対象 | 状態 |
|---|---|
| `symptom_observation`（SStructured） | 解消済み |
| `acute_condition_status`（SStructured・3 module） | 解消済み |
| `as_needed_status`（SStructured） | **解消済み**（2026-08-16・U-SR3-A。`adherence_status` へ migration） |
| `sickday_assessment`（AStructured・2 module） | **解消済み**（同上。`treatment_assessment` へ migration） |
| `lifestyle_issue` / `patient_report` / `treatment_continuation_status`（SStructured） | **解消済み**（同上。§17 行文脈規定に従い `adherence_status` / `treatment_start_reason` / `side_effect_status` へ migration） |
| その他の未分類 `SStructured.role`（`symptom_absence_check` / `symptom_presence_check` / `adherence_problem` / `visit_status` / `lifestyle_problem` / `administration_problem`） | 未監査・未分類 |
| `administration_assessment` / `dose_adjustment_assessment`（AStructured）／ `urgent_consult_advice`（PStructured） | 未監査・未分類（defect / 未文書化語彙のいずれとも確定していない） |
| validator の allow-list 化 ／ blocklist 拡張 ／ Structured role 語彙体系整理の方針 | **未決定** |
| **行文脈 drift**（`sideEffectPresence = present_*` の S 行に `side_effect_status`）46 occurrence / 6 module | **既存 occurrence は未解消**。ただし新規 module への再増殖経路は 2026-08-16 の PN4B 修正で閉鎖済み（下記「行文脈 drift」節） |
| **新規の非確立 role が silent に追加される検出 gap** | **解消済み**（2026-08-16・U-SR1）。`tests/structuredRoleVocabulary.test.ts` が `lib/structuredRoleVocabulary.ts`（RULES §17 の機械可読 mirror）と `tests/fixtures/structuredRolePreRuleBaseline.ts`（**pre-rule baseline: 27 key / 104 occurrence**）を突き合わせ、baseline 外の非確立 role・既知 key の件数増減・両者の相殺をいずれも検出する。`lib/moduleValidator.ts` の blocklist 方式自体は未変更 |

**pre-rule baseline の現在値は 21 key / 90 occurrence（5 module）である**（U-SR1 の初回凍結時は 27 key / 104 occurrence / 6 module）。U-SR3-A（2026-08-16）で、**RULES §17 から移行先が deterministic に確定する 6 key / 14 occurrence のみ**を migration した（`as_needed_status` 4 → `adherence_status` ／ `sickday_assessment` 2 → `treatment_assessment` ／ `lifestyle_issue` 2・`patient_report` 3 → `adherence_status` ／ `treatment_continuation_status` 3 → `treatment_start_reason` 1・`side_effect_status` 2）。**残る 90 occurrence の classification / migration は引き続き Deferred である。** `urgent_consult_advice`（3・PStructured）は §17 に明文の禁止・置換規定がなく、`urgent_consult_guidance` への置換が Repository authority だけでは deterministic と確定しないため **OWNER DECISION REQUIRED として今回の対象から除外した**（本節の未分類欄に残置）。

**PN4A authority drift（`dose_adjustment_assessment`）は解消済み（2026-08-16・Owner Decision OD-DA1〜4）**: `prompts/vNext/PN4A-Structured-GroupA.md` が AStructured の生成候補として列挙していた `dose_adjustment_assessment` を削除し、`prompts/RULES.md` §17 ／ `prompts/vNext/PN7-Cross-Reference-Audit.md` check T ／ `lib/structuredRoleVocabulary.ts` の 4 値へ整合させた（**§17 が Structured role vocabulary の authority である**）。`dm_insulin_intermediate` の canonical 6 occurrence は**未変更**であり、pre-rule baseline 内の既知 occurrence として本 Finding の Deferred 対象に留まる。**本判断は Structured role / Persona の将来拡張余地を削除するものではない**（「role という拡張可能な器」と「`dose_adjustment_assessment` という個別語彙」は別事項であり、器は維持される）。将来 runtime 接続等で細粒度 role が必要と判明した場合は、§17「Structured role 確立語彙の変更契機」に従う正規の vocabulary change process で追加する。

**行文脈 drift（established 語彙どうしの取り違え — 本 Finding の blocklist gap とは検出機構が異なる）**: `prompts/RULES.md` §17「side_effect 系 S 行の区別（混同禁止）」は `sideEffectPresence = present_*` の S 行に `side_effect_presence` を要求するが、canonical には `side_effect_status` を使用する既存 drift が **46 occurrence / 6 module**（いずれも insulin 系。`side_effect_presence` 側は 128 occurrence）存在する。**両 role とも established vocabulary であるため、U-SR1（`tests/structuredRoleVocabulary.test.ts`）の「非確立 role 検出」ではこの取り違えを検出できない**（同テストは語彙の所属のみを検査し、行文脈の適合は検査しない）。validator / audit / PN7 check T にも行文脈の検査は存在しない。**Structured metadata は runtime 未接続であり、Phase 1 の SOAP runtime correctness への直接影響は確認されていない。** 新規 module 生成時の再増殖経路は 2026-08-16 の `PN4B-Structured-GroupB.md` 修正（`side_effect_presence` の選択肢明記と `sideEffectPresence` による判定表の追加）で閉鎖済みであり、**本 Finding は Module Expansion の blocker ではない**（Gate Review 2026-08-16）。**既存 46 occurrence は変更していない。** 当該 occurrence が医学的に誤っているか、`side_effect_presence` へ migration すべきかは**未判定**であり、classification / remediation は Structured metadata / Persona を runtime 接続する前（下記 再開 Trigger ②）に行う。

> **再開 Trigger**（S / A / P 共通。本 scope 拡張により新しい Trigger は追加しない）: 次のいずれか。① 未分類の Structured role（`SStructured` 80箇所超 ／ 上記 `AStructured` / `PStructured` 分を含む）を対象とする横断監査 Unit に着手する時点 ② Structured metadata / Persona Structured metadata を runtime 接続する時点 ③ Owner が Structured role validator の allow-list 化・blocklist 再設計・語彙体系整理を指示した時点。
>
> **M-4 との関係**: `acute_condition_status` は validator / audit / test のいずれでも検出されなかった事例であり、M-4 の再開 Trigger「① validator / audit / test のいずれでも検出できない構造欠陥が1件でも実測された時点」（本文書 L747 参照）の**文言と表面上一致する**。ただし `STRUCTURED_ROLE_FORBIDDEN` は `docs/VALIDATOR_STANDARD.md` 上 **Design Rule** 分類であり、M-4 が問題とする `as unknown as ModuleData` による構造保証（Structural / Reference カテゴリ）とは対象範囲が異なる可能性がある。**本事例を M-4 Trigger①の充足として扱うべきかは、M-4 本文だけからは確定できず、Owner 判断を要する。** 本 Finding は M-4 とは異なる機構（個別 validator check のブロックリスト設計）に起因するため、**M-4 へ統合せず独立した Finding として記録する。M-4 自体は Deferred のままであり、この cross-reference によって M-4 の即時 investigation / resolution が要求されるものではない。**

## 任意 cleanup（correctness blocker ではない）

次は **BrandResolution / canonical / runtime の correctness・safety のいずれにも影響しない**。
精密な再開 Trigger を定義せず、**任意の cleanup** として扱う。関連箇所へ触れる作業が発生した際に
ついでに処理してよく、単独で工程化する必要はない。

| Finding | 内容 |
|---|---|
| F-RAPID-1 | `rapidDrugName` の式形が未統一（挙動差 0 件を実測済み） |
| AddonPanel raw placeholder | ADDON ボタンのラベルに `{{drug_subject}}` が見える（SOAP 本文では正しく置換される。UI ラベルのみ） |
| F-EXP-2 | legacy 単数 `expressMode`（使用 0 件・runtime 分岐残存・validator 検査 0）。**ただし将来 module が採用すると anti-pattern が再入するため、廃止判断のみ別 Unit として保持する** |
| `genericDisplayName` の必須性 | `JSON_STANDARD` と `lib/types.ts` の記述が不一致。Owner Decision を要する |
| L-1 AddonPanel GROUP_LABELS | 未登録グループのラベルが英語のまま表示される（本節冒頭の項を参照） |

## `composition.clinicalDomain` 値の揺れ（`diabetes` / `diabetes_mellitus`）— Rapid 本体とは別 Finding（2026-09-15 観測・2026-09-17 解消）

Unit「Rapid v2 global promotion readiness review」で観測した。**Rapid v2 の Finding ではなく、canonical data の domain 値の Finding として扱う。**

**状態: 解消（2026-09-17・Unit A「diabetes domain metadata consistency」・Owner Decision A1）。** 解消記録は本節末尾。以下の実測は観測時点の記録として保持する。

**実測（2026-09-15・HEAD `428d754`）**

| module | `composition.domain` | `composition.clinicalDomain` | `composition.sMergeDomain` | `drug.clinicalDomain`（標準外の位置） |
|---|---|---|---|---|
| `dm_insulin_mixed_rapid_intermediate` | （キーなし） | `diabetes_mellitus` | `diabetes_mellitus` | （キーなし） |
| `dm_insulin_mixed_rapid_long` | `diabetes` | `diabetes` | `diabetes_mellitus` | `diabetes_mellitus` |

上記以外の糖尿病 module の値は `data/modules/*.json` を走査して取得する（本ファイルは一覧を保持しない）。

- 導入: commit `e650858`（2026-06-29、insulin mix 系 module の追加・再構成）。bridge にはいずれの domain 値も記載がない
- `prompts/vNext/PN2-Drug-Header.md` の bridge `composition:` 不在時フォールバックは、`composition.domain` を `categoryPath[0]` から導出し（`"糖尿病"` → `"diabetes"`）、`clinicalDomain` / `sMergeDomain` を `domain` と同値とする
- validator / audit / PN7 に `clinicalDomain` の値の整合を検査する項目はない。値の意図を記録した文書もない
- **runtime 影響（実測）**: `lib/buildSoap.ts` の `mergeBlocks` は S 合成を `clinicalDomain` 単位でグループ化する。Rapid OFF で cp_good 同士を2剤合成すると、`dm_insulin_mixed_regular_intermediate`（`diabetes`）＋ `dm_insulin_rapid_analog` では同一 block が1回に集約される（S 2行）一方、`dm_insulin_mixed_rapid_intermediate`（`diabetes_mellitus`）＋ `dm_insulin_rapid_analog` では集約されない（S 4行）

**現状**: 意図的な domain 分離か、data / schema 生成上の不整合かは**未確定**。**推測で修正しない。Rapid v2 pilot 実装と一緒に修正しない。**

**再開 Trigger**: Rapid v2 の global promotion 判断の前（`docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 OD-RAPID-READINESS-1 §7）。別 Unit で確定する。

**解消記録（2026-09-17・HEAD `c47f39e` 上の Unit A。Owner Decision A1）**

- **root cause**: 2 module とも commit `e650858`（2026-06-29）の**新規作成時点**で値が入った。生成規則（`prompts/vNext/PN2-Drug-Header.md` composition フォールバック / `prompts/vNext/PN3B-Scenario-Metadata-Apply.md` mergePolicy テンプレート）は 2 日前の `df876b2`（2026-06-27）で導入済みであり、施行済み規則からの逸脱である。同 commit で追加された `dm_insulin_mixed_regular_intermediate` は規則どおり全 field `diabetes`。bridge はいずれも `composition:` セクション・domain 値を持たないため PN2 フォールバックの適用対象。意図的な domain 分離を示す記録は Repository に存在しない。validator / audit / PN7 に domain 値の検査項目がなく検出されなかった
- **正しい値（Fact）**: bridge `composition:` 不在 → `composition.domain` = `categoryPath[0]`「糖尿病」→ `diabetes`、`clinicalDomain` / `sMergeDomain` = `domain` と同値。`drug.clinicalDomain` は生成規則・`lib/types.ts` のいずれにも存在しない非標準キー
- **修正（canonical）**:

| module | field | before | after |
|---|---|---|---|
| `dm_insulin_mixed_rapid_intermediate` | `composition.domain` | （キーなし） | `diabetes` |
| `dm_insulin_mixed_rapid_intermediate` | `composition.clinicalDomain` | `diabetes_mellitus` | `diabetes` |
| `dm_insulin_mixed_rapid_intermediate` | `composition.sMergeDomain` | `diabetes_mellitus` | `diabetes` |
| `dm_insulin_mixed_rapid_long` | `composition.sMergeDomain` | `diabetes_mellitus` | `diabetes` |
| `dm_insulin_mixed_rapid_long` | `drug.clinicalDomain` | `diabetes_mellitus` | （削除） |

- **派生物**: `data/search-manifest.json` を正規手順（`npm run generate:search-manifest`）で再生成（intermediate の `clinicalDomain` と `sourceHash` のみ変化）。他の fixture は domain 値を含まず変化なし
- **runtime 影響（実測）**: S 合成に効くのは intermediate の `composition.clinicalDomain` のみ。Rapid OFF で intermediate cp_good ＋ `dm_insulin_rapid_analog` cp_good を合成すると S 4 行 → 2 行（同一 domain として集約）となり、兄弟 module `dm_insulin_mixed_regular_intermediate` ＋ `dm_insulin_rapid_analog` と同一の出力になった。`composition.domain`（`block.domain`）・`sMergeDomain`・`drug.clinicalDomain` は runtime 未参照
- **scope 外（修正していない）**: rapid_long の `scenarios[].clinicalTags` / `tagCatalog.clinicalTags` の `diabetes_mellitus`（タグ語彙であり domain metadata ではない）／intermediate の `priority`・`nodeLabelShort` 欠落・`drugClassLabel` 保持／derm 4 module の `sMergeDomain` = `dermatology_topical`（`domain` と不一致。PN2 フォールバック表とのずれとして観察のみ）／rapid_long の mergePolicy 旧 schema（下記別 Finding）

## `dm_insulin_mixed_rapid_long` の `scenarios[].mergePolicy` 旧 schema drift（2026-09-17）

Unit A「diabetes domain metadata consistency」の調査で観測した。**domain metadata consistency とは別種の schema drift として扱う。**

- **対象**: `dm_insulin_mixed_rapid_long` の **全 31 scenario**
- **現状**: `mergePolicy` が S / O / A / P とも旧形。S は `{ groupKey, situationFilter }`、O / A / P は `{ groupKey }` のみ（`S.situationFilter` は scenario 直下の `situationFilter` と全件同値）
- **PN3B 現行形との不一致**: `prompts/vNext/PN3B-Scenario-Metadata-Apply.md` のテンプレートは S = `{ domain, behavior, groupKey, mergeLevel, sectionRole }`、O / A = `{ behavior, mergeLevel, sectionRole }`、P = `{ behavior, mergeLevel, closingBehavior, sectionRole }`。`S.domain` / `behavior` / `mergeLevel` / `sectionRole` / `P.closingBehavior` が欠落し、S / O / A / P に非標準キーがある。糖尿病領域の他 25 module は現行形
- **runtime**: 現 runtime が読むのは `mergePolicy.S.groupKey`（存在する）と `mergePolicy.P.closingBehavior` のみ。後者は未定義時に `dedupe_or_last` へ fallback する（`lib/buildSoap.ts`）ため、**現在は fallback により現行形と同等の結果**である
- **位置づけ**: 将来の schema cleanup / migration 候補。**現時点では blocker ではない**
- **未確定**: solution・priority・実施時期は未確定

## `risks` contract remediation の別 Unit 送り事項（D-1〜D-15・2026-09-20）

2026-09-20 の 6 つの Unit の Owner Decision により、別 Unit へ送った事項。
**各項目に記載した corpus 件数は当該時点の historical observation であり、current contract ではない。**

- Unit 1「PN5 non-insulin risks contract remediation」: PN5 §risks の生成契約（non-insulin = 固定 empty）・
  `tests/risksContract.test.ts` の新設・`docs/DEVELOPMENT_STANDARD.md` §10.5 GG-5 の公告を実施。
  canonical JSON / bridge / insulin risk values / `lib/types.ts` / validator / runtime は無変更
- Unit 2「insulin mixed rapid/long 構造修復」: `dm_insulin_mixed_rapid_long` の `drug` サブフィールド
  transfer defect 修復・`risks` の固定 empty 正規化・`data/search-manifest.json` 再生成・D-2 誤記訂正を実施。
  bridge / PN5 / validator / `lib/types.ts` / runtime は無変更
- Unit 3「insulin risks template clinical & semantic review」: PN5 insulin 標準テンプレートを
  `primary` 2 token のみへ縮約し、insulin 8 module の canonical を統一。`dm_insulin_mixed_rapid_long` の
  temporary deferral を解消し、deferral machinery を完全撤去。bridge / validator / `lib/types.ts` /
  runtime / `docs/` は無変更（Owner Decision OD-T1〜OD-T9）
- Unit 4「D-11 / D-12 cross-corpus risk attribution remediation」: 非 SGLT2 15 module から
  `ketoacidosis_risk_sglt2 ← concomitant_sglt2` を除去し、`tests/fixtures/risksPreRuleBaseline.ts` の
  該当 15 行を追随。SGLT2 含有 3 module の primary・PN5・`lib/types.ts`（`ConditionalRisk` /
  `whenAny` / `whenAll`）・validator / runtime / `docs/` / bridge / manifest は無変更
  （Owner Decision OD-N1〜OD-N8）
- Unit 5「D-13 conditional structure legacy removal」: canonical `risks` を `primary` / `secondary` の
  2 キーへ改訂し、`conditional` / `ConditionalRisk` / `whenAny` / `whenAll` を canonical・PN5・
  `docs/JSON_STANDARD.md`・`lib/types.ts`・tests・fixture から撤去。future reservation として
  保持しない。`primary` / `secondary` の値・意味は無変更。GG-5 は Pending 維持（保留理由の事実
  誤りのみ訂正）。bridge / validator / runtime / `app/` / `scripts/` / manifest は無変更
  （Owner Decision OD-L1〜OD-L9）
- Unit 6「D-3 type parity repair」: `lib/types.ts` の `ModuleRisks` へ `secondary?: string[]` を
  追加し、canonical 2 キー contract との type parity を回復。pure type-contract parity repair であり、
  semantic / values / runtime behavior・canonical・bridge・PN5・`docs/JSON_STANDARD.md`・validator・
  tests・fixture・manifest は無変更。GG-5 は Pending 維持

`risks` 自体の Lifecycle 位置づけは `docs/DEVELOPMENT_STANDARD.md` §10.5 GG-5（Classification Pending）。

- **D-1: `dm_insulin_mixed_rapid_long.risks` の構造不正** — **2026-09-20 に構造部分を解消済み。臨床部分は Human Review Pending**
  - 旧状態: `risks` のキーが `urgentFlag` / `urgentCriteria` / `conditional` であり、JS-A が要求する `primary` / `secondary` が存在しなかった（corpus 唯一）。`conditional[].risk` は日本語 prose（`"重症低血糖リスク上昇"`）、`conditional[].rule.whenAny` は患者状態トークンではなく **scenario ID**（他 22 件はすべて `concomitant_sglt2`）。いずれも初出 commit `e650858`（2026-06-29）からの birth defect であり、同一 commit の兄弟 4 module は PN5 insulin テンプレート値で正常に生成されていた
  - 実測: これらの臨床 semantics は bridge に根拠がない（`bridges/dm_insulin_mixed_rapid_long.md` に「意識消失」「けいれん」「重症低血糖」の出現は **0 件**）
  - 2026-09-20 の Unit「insulin mixed rapid/long 構造修復」（Owner Decision OD-M3 / OD-M4）で、出自を Repository で裏付けられない semantics を除去し `{"primary": [], "secondary": [], "conditional": []}` へ正規化した。**これは「臨床的にリスクがない」という判断ではなく、provenance を裏付けられない値を canonical から除去する情報規律上の措置である**
  - ①（本 module へ insulin 標準テンプレートを適用するか・OD-M6）は **2026-09-20 に解消**。Human Review により縮約後テンプレートを適用した（D-7 / OD-T1）
  - ②（`意識消失・けいれんを伴う重症低血糖` を `template.urgentCriteria` の正規型 `{seekUrgentCareIf, contactPrescriberIf}` へ移すか、破棄するか・OD-M5）は**未解消**。D-10 が保持する
  - 同 module には別種の drift も既記録（上記「`scenarios[].mergePolicy` 旧 schema drift」）。**両者は別 Finding**
- **D-2: 同 module の `drug` サブフィールド transfer defect** — **2026-09-20 に解消済み**
  - > ⚠️ **訂正（2026-09-20）**: 本項目は当初「`drug.drugClass` が小文字（`insulin_mixed_rapid_long`）」と記録していたが、これは**誤りであった**（commit `7b9e5ea`）。正しくは **`drug.drugClass` は ABSENT（キー自体が存在しない）** であり、小文字の `insulin_mixed_rapid_long` は `composition.classKey` の値で、これは全 35 module で小文字が正しい設計値である（`docs/JSON_STANDARD.md` JS-A-composition）。誤った historical fact を残さないため、ここで訂正する。
  - 実測された defect: `drug.drugClass` / `drug.dosageForms` / `drug.drugSpecificTags` の 3 フィールドが、**bridge が逐語宣言しているにもかかわらず canonical に存在しなかった**（3 フィールドとも欠落は corpus で本 module 1 件のみ）。初出 commit `e650858` からの birth defect で、同一 commit の兄弟 4 module は 3 フィールドとも正常
  - 影響: `drug.drugClass` と `drug.drugSpecificTags` は `lib/search.ts` の検索コーパスと `data/search-manifest.json` へ投影される。修復前は latin クエリ `insulin` で insulin 8 module 中 7 件しかヒットせず、**本 module のみ到達不能**だった（`drug.dosageForms` は runtime 未参照のため影響なし）
  - 2026-09-20 の Unit で bridge 逐語値どおり復元し（Owner Decision OD-M1）、`data/search-manifest.json` を正規 generator で再生成した（OD-M2）。latin `insulin` の到達は 8/8 へ回復
  - 復元により本 module は PN5 §risks の insulin 分岐へ移ったが、テンプレート適用は D-1 の Human Review Pending 事項として defer している（下記 D-7）
- **D-7: `dm_insulin_mixed_rapid_long` の insulin risks semantic Human Review — 2026-09-20 に完了・解消済み**
  - Unit「insulin risks template clinical & semantic review」の Human Review により、本 module でも `hypoglycemia_risk` / `injection_site_reaction` の 2 token が支持できると判断され（Owner Decision OD-T1）、縮約後の insulin 標準テンプレートを適用した。これをもって temporary contract deferral は解消した
  - `tests/risksContract.test.ts` の `INSULIN_RISKS_REVIEW_PENDING_MODULES`・`PENDING_NOTICE`・T-R-4d〜T-R-4g は**役割終了として完全撤去済み**（空の exception mechanism を将来用として残さない方針）。本 module は以後、他の insulin module と同じく T-R-4c が検査する
  - 残る臨床判断は `template.urgentCriteria` の扱いのみで、これは D-10 が保持する（OD-M5 / OD-R5 / OD-T9）
- **D-8: `allergy_h1_antihistamine_second_gen_oral` の `drug.drugClass` が bridge と不一致 — 2026-09-20 に解消済み**
  - **解消前の状態〔historical〕**: bridge `["H1_ANTIHISTAMINE_SECOND_GEN"]` ⇔ canonical `["H1_antihistamine_2nd_gen"]`（大文字小文字と token 自体の両方が異なる）
  - 2026-09-20 の Unit「insulin mixed rapid/long 構造修復」の調査中に発覚。〔当時の観測〕bridge ⇔ canonical の `drug.drugClass` 一致は 35 module 中 33 件で成立しており、不一致は本件と `dm_insulin_mixed_rapid_long`（D-2・解消済み）の 2 件のみだった
  - 2026-09-20 の Unit「D-8 drugClass canonical mismatch remediation」で、**canonical を bridge 逐語値 `["H1_ANTIHISTAMINE_SECOND_GEN"]` へ修正した**（Owner Decision OD-D8-1）。**bridge は無変更**。修正後の bridge ⇔ canonical `drug.drugClass` parity は **35/35**
  - **これは臨床分類の変更ではない。** 両値は「第二世代 H1 受容体拮抗薬」という同一の分類を指しており、差は casing と序数表記（`SECOND` / `2nd`）のみである。本 Unit は identifier normalization / bridge ⇔ canonical parity repair であり、医療内容の判断を含まない
  - **read-only investigation の実測**: canonical 値は初出 commit `625ac7e`（2026-05-23）からの birth value、bridge 値は初出 commit `10d1e2f`（2026-06-20）からの birth value であり、**いずれも一度も変更されていなかった**。canonical が bridge より 28 日先行しており、本 module の bridge は canonical 成立後に後追いで作成された back-fill である（同種の back-fill は corpus に 8/35 件あり、他 7 件は `drugClass` が逐語一致していた）。どちらの値を選んだかの理由を記録した文書は両 commit とも存在しない
  - `drug.drugClass` は `lib/search.ts` の `globalCorpusTokens`（スコア 1 の部分一致層）と `data/search-manifest.json` へのみ投影される。`normalizeText` が `toLowerCase` と区切り除去を行うため **casing は検索挙動に影響せず**、実質的な差は `second` ⇔ `2nd` の語形のみだった
  - **意図的に許容した到達性の消失**（Owner Decision OD-D8-2）: query `2nd` / `2n` / `2` による本 module への到達を失った。`second`（`drug.drugSpecificTags` 由来）/ `h1` / `antihistamine` / `gen` / `oral` / 日本語経路（`第二世代` / `抗ヒスタミン`）/ ブランド・alias 経路は**すべて維持**されている（修正前後の実測で差分はこの 3 query のみ）。`2nd` は明示的な search alias ではなく最下位 tier の偶発的到達であったため、bridge へ search keyword を追加しない。将来 `2nd` 到達が業務要件として必要と判明した場合は、正式な search contract として別途設計する
  - `data/search-manifest.json` は `npm run generate:search-manifest` で正規再生成した（差分は `sourceHash` と当該 `drugClass` の 2 箇所のみ。手編集していない）
  - `composition.classKey`（`h1_antihistamine_2nd_gen`）は**変更していない**。`classKey` は `drugClass` から導出されるフィールドではなく（`lower(drugClass) === classKey` の成立は 25/35）、当該 bridge は `classKey` を宣言していない
  - 命名規約（`drug.drugClass` の UPPER_SNAKE。corpus 実測では 35/35 だが明文規定は Repository に存在しない）の明文化と再発防止 contract は **D-9 へ送った**（Owner Decision OD-D8-3）。本 Unit では `prompts/RULES.md` / `docs/JSON_STANDARD.md` / validator / audit / tests を変更していない
  - 同一 module および他 module で発見された他の bridge ⇔ canonical 差分は **D-15 が保持する**（Owner Decision OD-D8-4）
- **D-9: `drug.drugClass` の bridge 保持義務・parity 監査が未整備 — 2026-09-20 に解消済み**
  - **解消前の状態〔historical〕**: `drug.drugClass` は 35/35 の bridge が宣言しているが、`prompts/RULES.md` §4 MANDATORY_PRESERVATION_TARGETS に列挙されておらず、validator（`moduleValidator.ts` / `crossModuleValidator.ts` とも参照 0 件）にも `npm run audit` の 6 系統にも検査が存在しなかった。D-2 / D-8 がいずれも検出されないまま commit された原因
  - 2026-09-20 の Unit「D-9 drugClass preservation / parity contract」で解消した（Owner Decision OD-D9-1〜OD-D9-8）
  - **authority model（OD-D9-1）**: `drug.drugClass` は **bridge-owned value**。canonical は bridge 宣言値を逐語保持し、canonical 側での推測・正規化・改名を禁止する
  - **naming（OD-D9-2）**: **bridge authoring 規約**として各宣言値は `^[A-Z0-9]+(?:_[A-Z0-9]+)*$`（UPPER_SNAKE）。PN2 は規約外を自動修正せず **PENDING で停止**する。canonical 側に独立した normalize 規則は持たせない。**配列要素数 1 は contract 化していない**（現行 corpus が全件 1 要素であることを前提にした判定を行わない）
  - **preservation（OD-D9-3）**: `prompts/RULES.md` §4 へ新カテゴリ「Drug header identifier」として登録した。あわせて、既に PN2 + audit + test で mandatory preservation として運用されていながら §4 へ未登録だった `display.adjustmentExpression` / `display.menuGroupLabels` の 2 件を同時に登録した。**後者は新しい保持義務の追加ではなく、実態を正本へ反映する documentation-contract repair**であり、判定基準・挙動を変更していない。これにより PN7 item AI が参照していた RULES §4 の dangling pointer も解消した（OD-D9-6）
  - **enforcement（OD-D9-4）**: PN2 の preservation 条項 + `scripts/audit-drugclass-bridge-chain.ts`（`npm run audit` へ登録。6 → 7 本）+ `tests/drugClassBridgeParity.test.ts`（synthetic fixture による検出感度の regression test）+ PN7 item **AK**。**`moduleValidator` / `crossModuleValidator` には入れていない**（`docs/VALIDATOR_STANDARD.md` §5「A の値は B の値と一致すべき」型のルールは Validator に入れない）
  - **audit invariant は片方向である。** bridge が宣言している場合にのみ ① canonical の存在 ② 逐語一致（要素数・順序・表記。大文字小文字差も不一致）③ bridge 値の authoring 規約適合 を検査する。**bridge が沈黙している場合は NOT_CHECKED** であり、reverse invariant（bridge 沈黙 → canonical も持ってはならない）は課していない
  - **bridge missing / parse failure は分離している**（OD-D9-4 追加指示）: bridge ファイル不在 → **CHECK**（`BRIDGE_NOT_FOUND`。bridge existence contract は未決定のため FAIL にしない）／ bridge はあるが `drugClass:` キーがない → **NOT_CHECKED**／ `drugClass:` はあるが値ブロックを contract 形式で parse できない → **FAIL**（`DRUGCLASS_BRIDGE_PARSE_ERROR`。silent skip / CHECK 扱いにしない）
  - FAIL 系 error code: `DRUGCLASS_MISSING_IN_CANONICAL` / `DRUGCLASS_VALUE_MISMATCH` / `DRUGCLASS_AUTHORING_FORMAT_VIOLATION` / `DRUGCLASS_BRIDGE_PARSE_ERROR`
  - **requiredness は別 Decision として未着手**（OD-D9-5）。`lib/types.ts` の `drugClass?: string[]` は optional のまま、`docs/JSON_STANDARD.md` JS-A への登録・`MISSING_DRUG_CLASS`・validator の missing check はいずれも実施していない。bridge 35/35 が宣言している現状では、本 parity audit が D-2 型の omission を検出する
  - **導入時点で canonical / bridge / `data/search-manifest.json` はデータ差分ゼロ**。新 audit は corpus 全件で FAIL 0 / CHECK 0 であった
  - 併せて `docs/VALIDATOR_STANDARD.md` §2-A の audit 責務表を実態（7 本）へ更新し、`prompts/vNext/PN7-Cross-Reference-Audit.md` の採番注記を「A〜AH の全 32 項目」→「A〜AK の全 35 項目」へ是正した（AI / AJ 追加時の追随漏れ。OD-D9-8）
  - **非対象**: D-15 の各 field（`drug.genericName` / `drug.drugSpecificTags` / `display.*`）へ parity contract を拡張していない。GG-5 / `risks` lifecycle にも触れていない。`tests/risksContract.test.ts` の D-3 陳腐化 JSDoc も未変更（別の軽微 cleanup へ残置・OD-D9-7）
  - 残る軽微 cleanup 候補: `prompts/vNext/PN7-Cross-Reference-Audit.md` 冒頭「## 参照」の `prompts/RULES.md §4` 重複 2 行（本 Unit では触れていない）
- **D-10: `dm_insulin_mixed_rapid_long` の `template.urgentFlag` / `urgentCriteria` の型不整合**
  - `template.urgentFlag: true` でありながら `template.urgentCriteria: []`。正規型は `EmergencyCriteria`（`{seekUrgentCareIf, contactPrescriberIf}`。他 5 module が保持）であり、空配列はこれを満たさない
  - `dm_insulin_mixed_rapid_intermediate` にも同種の型逸脱がある（`urgentFlag: false` + `urgentCriteria: []`）
  - **corpus 実測〔2026-09-20 時点の historical observation〕**: insulin 8 module の `template.urgentFlag` は **4 通りに割れている** — `true` + object 3 件（`dm_insulin_rapid_analog` / `dm_insulin_regular` / `dm_insulin_intermediate`。3 件とも文言は同一）、`false` + `null` 2 件、`false` + `[]` 1 件、`true` + `[]` 1 件、キー自体なし 1 件（`dm_insulin_glp1_combination`）。`urgentFlag=true` の意味を規定した文書は存在せず、validator にも urgent 系の検査は 0 件
  - **本 Unit では変更しない**（Owner Decision OD-M7 / OD-R5 / OD-T9）。urgent semantics drift として別 Unit へ送る
- **D-3: `ModuleRisks.secondary` type drift — 2026-09-20 に解消済み**
  - **解消前の状態〔historical〕**: canonical `risks` は `primary` / `secondary` の 2 キー（35/35）で `docs/JSON_STANDARD.md` JS-A もこれを規定していたが、`lib/types.ts` の `ModuleRisks` は **`primary` のみを宣言**しており、**型が canonical の 2 キー中 1 キーしか宣言していない**状態だった。drift の向きは型側の追随漏れで、canonical / JSON_STANDARD 側は一致していた
  - この drift は D-13 の Unit が作ったものではなく、それ以前からの継続だった。`secondary` は元から `ModuleRisks` に宣言されておらず、D-13 では `conditional` のみを削除した（Owner Decision OD-L1 / §0 案 (a)）
  - `data/modules/index.ts` が 35 件すべてを `as unknown as ModuleData` で二重キャストしているため、この drift は `tsc` では検出できなかった（D-1 のキー不正が検出されなかったのと同じ機構）
  - **current state〔2026-09-20〕**: Unit「D-3 type parity repair」で `ModuleRisks` へ **`secondary?: string[]` を追加**し、canonical 2 キー contract との type parity を回復した。`ModuleRisks` の宣言は `primary` / `secondary` となり、canonical・`docs/JSON_STANDARD.md` JS-A の 3 者が一致している
  - **pure type-contract parity repair であり、semantic / values / runtime behavior は変更していない。** `primary` / `secondary` はいずれも optional のまま（required へ変更していない）、semantic 定義・risk vocabulary は追加しておらず、canonical / bridge / PN5 / `docs/JSON_STANDARD.md` / validator / runtime / tests / fixture / manifest はすべて無変更。`risks.secondary` の production runtime consumer は本 Unit 前後とも **0 件**
  - **GG-5 は Pending 継続**（`docs/DEVELOPMENT_STANDARD.md` §10.5）。本 Unit は `risks` field の Lifecycle 判断に関与しない
  - 残件: `tests/risksContract.test.ts` の JSDoc（`scanModules` 付近）に「`lib/types.ts` の `ModuleRisks` が宣言していない `secondary` も観測できる」という記述が残っている。**生 JSON を読む理由そのもの（二重キャストを経由しない）は現在も有効だが、`secondary` を例に挙げた部分は本 Unit で陳腐化した。** 本 Unit は tests を変更対象外としたため訂正していない（別 Unit の軽微 cleanup 候補）
- **D-4: validator に `MISSING_RISKS` 相当が存在しない**
  - `risks` は JS-A（全 module 必須）だが、`lib/moduleValidator.ts` の必須検査は `MISSING_PERSONA` 等に限られ、`risks` は対象外。D-1 が `npm run build` / `npm test` を通過している直接原因
  - `tests/risksContract.test.ts` T-R-1 はキー集合も検査するため**新規 module での同型再発は防がれる**が、既存 1 件は baseline 収載のため検出対象外
  - 本 Unit では validator を変更しない（Owner Decision OD-8）
- **D-5: 既存 non-insulin 22 module の risk 値は遡及対象外**
  - `tests/fixtures/risksPreRuleBaseline.ts` に収載した 22 module の risk 値（`primary` + `secondary` 計 142 token）は、**bridge に機械的 traceability を持たない**〔実測: risk token 33 種のうち bridge に文字列として出現するのは 4 種のみで、いずれも scenario ID としての出現であり risk 宣言ではない〕
  - historical corpus remediation は別 Unit（Owner Decision OD-3）。baseline 収載は正当性の承認でも legacy defect の認定でもない
- **D-6: 意味定義・語彙・field 存廃の未確定**
  - `risks.primary` と `risks.secondary` を分ける意味基準は Repository に定義が存在しない。**PENDING のまま**（Owner Decision OD-4）
  - risk identifier の vocabulary SSOT は作らない（Owner Decision OD-5）。`lib/structuredRoleVocabulary.ts` に相当するものは `risks` には存在しない
  - `risks` field 自体の存廃（runtime 未参照であり `drug.search.prefixAliases` と同型の dead-field 判定条件を満たす）は今回判断しない（Owner Decision OD-9 / OD-T5）。撤去には `docs/JSON_STANDARD.md` JS-A の改訂が前提
  - **corpus 実測〔2026-09-20 時点の historical observation〕**: `primary` と `secondary` の**両方**に出現する token が 6 種ある（`hypoglycemia_risk` P11/S13、`dehydration_risk` P6/S19、`injection_site_reaction` P7/S2、`gastrointestinal_symptoms` P10/S1、`liver_dysfunction_risk` P2/S5、`weight_gain_risk` P1/S3）。分類は corpus 上安定していない
  - `ketoacidosis_risk_sglt2` の primary（自薬剤リスク）/ conditional（併用薬リスク）**二重用法**は今回再設計しない（Owner Decision OD-T5）
- **D-11: 非 SGLT2 module の `ketoacidosis_risk_sglt2 ← concomitant_sglt2` — 2026-09-20 に解消済み**
  - Unit「D-11 / D-12 cross-corpus risk attribution remediation」（Owner Decision OD-N1 / OD-N8）で、**非 SGLT2 の 15 module から当該 conditional を除去**した。`primary` / `secondary` は無変更
  - **除去は DKA という臨床事実の否定ではない。** 除去したのは ① 非 SGLT2 module への誤帰属 ② 未定義 trigger `concomitant_sglt2` ③ producer / consumer を持たない legacy conditional の 3 点である
  - 根拠〔実測・一次情報〕: 自薬剤側の電子添文に DKA の記載がないことを 3 系統で確認した — **インスリン**（ライゾデグ配合注 / ノボラピッド注: DKA 記載なし。10.2 併用注意の SGLT2 阻害薬は「血糖降下作用の増強による低血糖症状」）、**メトホルミン**（メトグルコ錠: DKA 記載なし。SGLT2 阻害剤は 10.2.1「利尿作用を有する薬剤」として**脱水→乳酸アシドーシス**、10.2.2 で**低血糖**）、**DPP-4**（ジャヌビア錠: DKA・脱水とも記載なし。SGLT2 併用注意は**低血糖**）。さらに非 SGLT2 の 15 bridge すべてで「ケトアシドーシス」の出現が **0 件**
  - 一方 SGLT2 製剤側（ジャディアンス錠）は **11.1.2 重大な副作用 脱水** / **11.1.3 重大な副作用 ケトアシドーシス** を持ち、**8.6** で正常血糖でも DKA に至りうること、**8.6.1(2)** で発現しやすい条件（インスリン分泌能の低下、**インスリン製剤の減量や中止**、過度な糖質摂取制限、食事摂取不良、感染症、脱水）を規定する。すなわち帰属先は SGLT2 製剤であり、発火条件も「SGLT2 を併用していること」そのものではない
  - **SGLT2 含有 3 module（`dm_sglt2_oral` / `cardiorenal_sglt2_oral` / `dm_dpp4_sglt2_combination_oral`）が `ketoacidosis_risk_sglt2` / `dehydration_risk` を primary に持つ状態は電子添文と整合しており、変更していない**（OD-N8）
  - 併せて `ketoacidosis_risk_sglt2` の primary（自薬剤リスク）/ conditional（併用薬リスク）二重用法は自然解消した。新 identifier は作っていない（OD-N2）
  - SGLT2 併用時の実務上の注意は bridge 由来の `addon_sickday_hold_sglt2_metformin`（「脱水時は休薬が必要な場合があります」「自己判断で中止せず、処方医へご相談ください」）が引き続き担っており、**canonical から臨床情報は失われていない**
- **D-12: `concomitant_sglt2` の namespace 未定義 — 2026-09-20 に解消済み（namespace を作らない形で）**
  - D-11 の remediation により `concomitant_sglt2` は **canonical から消滅**（出現 0 件）。残る出現は本ファイルの historical record のみ
  - **namespace は作らなかった**（Owner Decision OD-N3）。定義元・producer・consumer のいずれも存在しなかったため、新しい patient-state vocabulary / token registry は導入していない。patient-state layer の設計も行っていない（OD-N5）
  - 同じ併用概念は bridge 由来の `addon_sickday_hold_sglt2_metformin` と `clinicalTags: sglt2_inhibitor` が別 namespace で表現している。ただし **addon / scenario を SGLT2 併用表現の正式 SSOT とは宣言していない**（OD-N4。被覆不均一のため別 Unit）
  - namespace が未定義であったことが、`dm_insulin_mixed_rapid_long` で `whenAny` に scenario ID が入っていた defect（D-1）を機械的に検出できなかった一因である、という観察は記録として保持する
- **D-13: `risks.conditional` / `ConditionalRisk` の legacy removal — 2026-09-20 に完了**
  - **除去前の実測**〔2026-09-20 時点〕: corpus 全 35 module で `risks.conditional` が `[]`、`ConditionalRisk` の `risk` / `rule.whenAny` / `rule.whenAll` に実データを持つ module は **0 件**、`rule.whenAll` は**確認した全時点で値を持ったことがない**、production runtime / validator / audit / UI / search / manifest の consumer **0**、PN5 の生成契約も `[]` のみ
  - **Lifecycle 判断の根拠**〔read-only audit の実測〕: 導入は commit `f7e9d88`（2026-03-10、NLP 経路と同一 commit。rationale の記録なし）で、**同 commit の時点から code 側 consumer はゼロ**。実データは 1 → 23 module（2026-07-11 peak）まで増えたが、**23 件すべてが単一 shape**（`ketoacidosis_risk_sglt2 ← concomitant_sglt2`）であり、その唯一の用法は D-11 で unsupported として撤回された。Future Expansion 成立要件 **F1（将来の目的・用途がリポジトリ内に記録されている）を満たす記録は 1 件も存在しなかった**
  - **2026-09-20 の Unit「D-13 conditional structure legacy removal」で撤去した**（Owner Decision OD-L1〜OD-L4）: canonical 35 module の `conditional` キー、`lib/types.ts` の `ConditionalRisk` / `whenAny` / `whenAll` / `ModuleRisks.conditional`、PN5 の 2 分岐テンプレートと旧形式規則とハンドオフ報告項目、`docs/JSON_STANDARD.md` JS-A 備考、`tests/risksContract.test.ts` / `tests/fixtures/risksPreRuleBaseline.ts`
  - **future reservation として保持しない**（Owner Decision OD-L3）。**将来 conditional mechanism が必要になった場合は、旧構造を復活させるのではなく、その時点の要件に基づく新しい Owner Decision として再設計する。**
  - canonical `risks` の shape は `primary` / `secondary` の **2 キー**になった（`docs/JSON_STANDARD.md` JS-A 表を同一 Unit で改訂済み）
  - `primary` / `secondary` の値・意味は本 Unit で変更していない（OD-L6 により semantic contract は PENDING 継続）
- **D-14: SGLT2 併用表現の被覆不均一（addon 集合と conditional 集合の過去不一致）**
  - 〔2026-09-20 時点の historical observation〕`addon_sickday_hold_sglt2_metformin` 保有は **20 module**、除去前の conditional 保有は **15 module** で、**どちらも他方の部分集合ではなかった**（共通 12 / addon のみ 8 / conditional のみ 3）。両表現は一度も同期されたことがない
  - **addon を持たない 3 module**: `dm_dpp4_biguanide_combination_oral` / `dm_thiazolidinedione_biguanide_combination_oral` / `dm_imeglimin_oral`。うち後者 2 件は **bridge に SGLT2 の記述が 0 件**であり、SGLT2 併用概念への接点が canonical にも bridge にも存在しない
  - 参考〔実測〕: メトホルミン含有 2 module については、メトグルコ錠電子添文が示す SGLT2 併用時の懸念（脱水→乳酸アシドーシス）は**自 module の `lactic_acidosis_risk`（primary）が既に覆っている**
  - addon は bridge 由来のため、被覆の補完には bridge 改訂＝ Owner の臨床判断が必要。**本 Unit では変更しない**（OD-N4）。SSOT 宣言と併せて別 Unit へ送る
  - 関連: `clinicalTags: sglt2_inhibitor` を持つのは corpus で 1 module のみで、同じ addon を持つ他 19 module は tagCatalog に持たない（clinicalTags drift）
- **D-15（親 Finding・CLOSED / 2026-09-21）: bridge ⇔ canonical の header / display divergence（D-8 調査由来）**
  - 〔2026-09-20 実測〕D-8 の read-only investigation で、`drug.drugClass` 以外にも bridge 宣言値と canonical が一致しない箇所が **8 件**あることが判明した。2026-09-21 の read-only investigation で corpus 全 35 module × 11 field を再実測し、**8 件すべてが現存・新規 divergence なし**であることを確認したうえで、Owner Decision OD-D15-8 により**子 Unit D-15a〜D-15e へ分割**した
  - **8 件を同一原因・同一 remediation とみなしてはならない。** 医療・表示内容／検索 identifier／構造 projection／既存生成規則の適用対象が混在しており、正本の所在は項目ごとに異なる
  - **2026-09-21 に CLOSED。** closure 条件（本項が定めた「全子 Unit が完了するまで closed にしない」）を次のとおり満たした: ① 子 Unit **D-15a / D-15b / D-15c / D-15d / D-15e = 5/5 complete** ② 本親 Finding が scope として宣言した **8 divergence = 0 件**（`drug.drugSpecificTags` / `display.subtitle` ×2 / `display.nodeKey` / `display.nodeLabelShort` ×2 / `drug.genericName` / `display.drugClassLabel`） ③ D-15d / D-15e の期待 parity がすべて成立（下記各項）
  - **closure の意味**: 「新規発見事項がゼロになった」のではない。**本親 Finding が定義した scope（corpus 35 module × `drug.*` / `display.*` の 11 field）の divergence をすべて解消し、調査中に発見した scope 外事項は別 Finding へ明示的に分離した**という意味である。分離した事項（下記 `N-1` / `N-3`）は本親 Finding の scope に追加しておらず、**D-15 の closure を妨げない**
  - 〔2026-09-21 実測・調査で判明した構造事実〕
    - canonical では `drug.genericName == display.drugClassLabel` が **35/35** で成立する（undocumented だが例外なし）。bridge 側で両方を宣言する 19 module のうち 18 は同値で、**不一致は H1 oral の bridge のみ**。したがってこの 2 field は切り離して決められない
    - `display.title` / `subtitle` / `drugClassLabel` は bridge の **16〜17 module が宣言していない**。これら 3 field は「全 bridge が宣言する preservation field」ではない（`genericName` / `drugSpecificTags` / `nodeLabelShort` / `nodeLabelLong` / `nodeKey` は 35/35 宣言）
    - canonical `display.nodeKey == composition.nodeKey` は **35/35**（`docs/JSON_STANDARD.md` JS-A-display の明文規則）。bridge `display.nodeKey == canonical composition.nodeKey` は調査時点で 34/35（例外は H1 oral のみ）だったが、**D-15b の bridge header drift 修復により 35/35 へ回復済み**
    - `display.nodeLabelShort` は insulin family 7/8 が略記「◯◯INS」、allergy family が剤形付き。**いずれも bridge 値の方が family 規約に沿う**
    - 対象 8 件は bridge / canonical とも **birth value のまま一度も変更されていない**
  - **子 Unit**
    - **D-15a: `display.subtitle` legacy remediation — 2026-09-21 に完了**（下記）
    - **D-15b: `display.nodeKey` bridge header drift repair — 2026-09-21 に完了**（下記）
    - **D-15c: `drug.drugSpecificTags` preservation / parity — 2026-09-21 に完了**（下記）
    - **D-15d: `drug.genericName` + `display.drugClassLabel` — 2026-09-21 に完了**（下記）
    - **D-15e: `display.nodeLabelShort` — 2026-09-21 に完了**（下記）
  - **preservation contract の現状**（Owner Decision OD-D15-7 / OD-D15c / OD-D15d-4 / OD-D15e-5）: `display.subtitle` は既存の PN2 確定ルールのみで運用し、`prompts/RULES.md` §4 へ昇格させない。`drug.drugSpecificTags` は **D-15c で §4「Drug header search metadata」へ登録済み**。`drug.genericName` / `display.drugClassLabel` / `display.nodeLabelShort` / `display.nodeKey` には**新しい preservation contract を課していない**（D-15d / D-15e とも §4 へ昇格させず、family naming の一般 contract も新設していない）
  - 〔2026-09-21 実測〕`display.title` / `display.nodeLabelLong` / `drug.route` / `drug.dosageForms` は 35/35 一致。`drug.drugClass` は D-8 の remediation と D-9 の contract により 35/35 一致
- **D-15a: `display.subtitle` の legacy data drift — 2026-09-21 に解消済み**
  - **解消前の状態〔historical〕**: `allergy_h1_antihistamine_second_gen_oral` の canonical が「アレグラ・クラリチン・ザイザル・ビラノア 他」（ブランド名列挙）、`dm_insulin_mixed_rapid_long` の canonical が「ライゾデグ」（ブランド名）で、いずれも bridge 宣言値と異なっていた
  - 2026-09-21 の Unit「D-15a display.subtitle legacy remediation」で、canonical 2 値を **bridge 宣言値へ修正**した（Owner Decision OD-D15-1）: H1 oral →「アレルギー症状に対する内服治療」／ mixed insulin →「混合型インスリン製剤（超速効型＋持効型）」
  - **新しい表示生成規則は作っていない。** `prompts/vNext/PN2-Drug-Header.md`「`display.subtitle` の確定ルール（推測生成禁止）」の**既存契約をそのまま適用した**もので、同ルールは ① bridge に明記があればその値をそのまま使用 ② bridge 沈黙時は `{drug.genericName}（{routeLabel}）` の固定 fallback ③ **ブランド名の列挙・同系統 module の模倣は creative build として禁止** を定めている
  - **legacy data drift と判断した実測**: bridge が沈黙している 17 module の canonical subtitle は **17/17 が fallback 式に完全一致**しており、規則は corpus 全体で守られていた。逸脱は当該 2 件のみで、いずれも規則制定前の birth value（H1 oral: canonical `625ac7e` 2026-05-23 ／ mixed insulin: canonical・bridge とも同一 commit `e650858` 2026-06-29）であり、両側とも一度も変更されていない。また 2 件とも family 規約（insulin 7/8 がクラス表記、allergy family が治療対象の記述）から外れた唯一の module だった
  - **事後 parity**: bridge 宣言 18 module → canonical 逐語一致 **18/18**、bridge 沈黙 17 module → fallback 適合 **17/17**、canonical subtitle 全 35 件の PN2 contract 適合 **35/35**。D-15 の残存 divergence は **8 件 → 6 件**
  - `data/search-manifest.json` は `npm run generate:search-manifest` で正規再生成した（差分は `sourceHash` と `displaySubtitle` 2 箇所の計 3 行のみ。手編集していない）
  - **検索到達性の変化なし。** 16 query（ブランド名・日本語・latin）で修正前後を実測し**差分 0 件**。旧 subtitle のブランド名トークンは `brandNames` / alias 経由で既に到達可能であったため、失った到達はない
  - 副作用の確認〔実測〕: mixed insulin は修正後 `title` / `subtitle` / `drugClassLabel` / `nodeLabelLong` が同値になるが、PN2 はこれを明示的に許容しており先例 `dm_insulin_rapid_analog` が 4 field 同値で実在する。また subtitle の module 間重複は既存実績がある（heparinoid 4 件・SGLT2 2 件）ため、H1 oral と leukotriene が同一 subtitle になることも逸脱ではない
  - **contract は追加していない**（OD-D15-7）: `prompts/RULES.md` §4 への昇格・audit・validator check・regression test のいずれも新設していない。bridge / PN2 / RULES / `lib/` / `app/` / `docs/` / `tests/` / `scripts/` は無変更
  - 軽微 cleanup 候補: `lib/search.ts` の 2 箇所のコメント（L42 / L211）は、ゴースト一致問題の実例として H1 oral の**旧** subtitle「アレグラ・クラリチン・ザイザル・ビラノア 他」を引用しており、本 Unit 後は実在データ例として陳腐化する。**`SEPARATOR_PATTERN` の設計理由そのものは有効**であり search behavior にも影響しないため、本 Unit では `lib/**` を無変更のまま維持した（Owner Decision）。`tests/risksContract.test.ts` の D-3 JSDoc・PN7「## 参照」の `prompts/RULES.md §4` 重複 2 行・`docs/OPEN_DESIGN_QUESTIONS.md` Q-J1 の現状表が heparinoid spray を欠いている件（D-15b で観測）とあわせ、**documentation / comment cleanup Unit へまとめる候補**とする
- **D-15b: `display.nodeKey` の bridge header drift — 2026-09-21 に解消済み（bridge 1 行修復による parity 回復）**
  - **解消前の状態〔historical〕**: `allergy_h1_antihistamine_second_gen_oral` の bridge `display.nodeKey` が `antihistamine_second_gen_oral`、canonical の `display.nodeKey` / `composition.nodeKey` がともに `h1_antihistamine_oral` で、corpus 唯一の不一致だった（34/35 は一致）
  - 2026-09-21 の Unit「D-15b nodeKey bridge header drift repair」で、**bridge header の `display.nodeKey` 1 行を `h1_antihistamine_oral` へ修正**した（Owner Decision OD-D15b-2）。**canonical 35 件・`data/search-manifest.json`・`lib/` / `app/` / `scripts/` / `tests/` はすべて無変更**
  - **本 closure は「bridge 値を authoring hint として許容した」ものではない。** back-fill 由来で fallback input 側に入り込んだ machine identifier の drift を Owner 承認のもとで修正し、**bridge ⇔ canonical parity を回復**したものである。`prompts/vNext/HANDOFF.md` §7「bridge は読み取り専用」に対する例外であり、bridge **本文（SCENARIOS_START〜END）・STATUS・他 header フィールドは無変更**（前例: `e6756d4` の corpus 横断 bridge header 改訂）
  - **source hierarchy（Owner Decision OD-D15b-1・確定）**
    1. bridge に `composition.nodeKey` が明記されている場合 → それが canonical `composition.nodeKey` の source（corpus 17/35 が該当し、17/17 一致）
    2. bridge に `composition:` ブロックがない場合 → bridge `display.nodeKey` が canonical `composition.nodeKey` の **authoritative fallback source**（`prompts/vNext/PN2-Drug-Header.md` のフォールバック表「display.nodeKey をそのままコピー」）。**単なる authoring hint ではない**
    3. canonical `composition.nodeKey` → canonical structural identifier
    4. canonical `display.nodeKey` → `composition.nodeKey` の display-side projection（`lib/types.ts` L799 / `docs/JSON_STANDARD.md` JS-A-display）
  - **修復の効果**: 修正後は PN2 の fallback 経路（bridge `display.nodeKey` → canonical `composition.nodeKey`）で **current canonical を決定論的に再生成できる**。bridge ⇔ canonical `display.nodeKey` parity と bridge `display.nodeKey` ⇔ canonical `composition.nodeKey` parity はいずれも **35/35** へ回復した
  - **canonical internal parity（OD-D15b-3）**: `display.nodeKey == composition.nodeKey` は canonical contract として維持する（35/35 成立）。**新しい audit / validator は追加していない**（違反実績がないため）
  - **naming convention（OD-D15b-4）**: `{classKey}_{route}` / `{classKey}_{formulationType}` を**厳格 contract 化していない**。`docs/JSON_STANDARD.md` JS-A-composition の当該行へ「代表的な形式例であり、必須の命名規則ではない。個別 module の設計判断により他の形式を取り得る」という clarification を追加した。**個別例外の意味論は新規 contract 化していない**
  - **canonical 側を動かさなかった理由〔実測〕**: ① canonical 3 値（`display.nodeKey` / `composition.nodeKey` / `classKey`）は初出 commit `625ac7e`（2026-05-23）の birth value で**一度も変更されていない** ② bridge は 28 日後の back-fill `10d1e2f`（2026-06-20）で、同じ波の他 bridge が canonical を逐語で写しているのに本 module だけ写していない ③ canonical の `h1_antihistamine_oral` は兄弟 family（H1 点眼 `h1_antihistamine_ophthalmic` / GLP-1 `glp1ra_oral`・`glp1ra_injection`）と同形 ④ canonical 側を動かすと、コミット済み生成物（`data/search-manifest.json`・静的 `out/`）に載る identifier の rename になる
  - **nodeKey の consumer〔実測〕**: `display.nodeKey` の production runtime consumer は **0 件**。`composition.nodeKey` も runtime（UI / merge / persona / routing / 永続状態）からは読まれず、**`data/search-manifest.json` への投影**（`lib/searchManifest.ts`）と **`prompts/RULES.md` §14 の生成時判定（`_injection` を含むか）**、および `tests/searchCoverage.test.ts` の manifest ⇔ canonical 動的比較のみが consumer である。search corpus（`globalTags`）には入らないため検索一致には寄与しない
  - **旧記述の訂正**: 本項目は D-15 調査時に「H1 oral の canonical nodeKey は JS-A の `{classKey}_{route}` / `{classKey}_{formulationType}` のどちらにも該当しない」と記録していたが、本 Unit の実測により ① JS-A-composition の当該行は**規範文言（MUST / 禁止 / ERROR）を持たない記述的 pattern** ② 非該当は **7/35**（heparinoid 4 = `nodeKey == classKey`・CMRI = formulationType 枝・tirzepatide = 成分入り・H1 oral）で、うち heparinoid 4 件は DP-02 が明示的に許容し Q-J1 が保留登録している ③ H1 oral の pattern 不一致は **nodeKey ではなく `classKey`（`h1_antihistamine_2nd_gen`）側に由来する**、ことが判明した。**「H1 oral の nodeKey が JS-A 違反」という評価は取り下げる**
  - **分離事項（OD-D15b-6）**: requiredness / uniqueness contract / identifier lifecycle / rename・migration policy / classKey naming semantics はいずれも別 Decision のまま未着手
- **D-15d: `drug.genericName` + `display.drugClassLabel` の bridge header drift — 2026-09-21 に解消済み**
  - **解消前の状態〔historical〕**: canonical は両 field とも `第二世代ヒスタミンH1受容体拮抗薬`、bridge は `drug.genericName` = `第二世代H1受容体拮抗薬` / `display.drugClassLabel` = `第二世代抗ヒスタミン薬` で、**bridge 内部でも 2 値が食い違う corpus 唯一の module** だった
  - **正式語は `第二世代ヒスタミンH1受容体拮抗薬`**（Owner Decision OD-D15d-2）。**canonical は変更せず、bridge header の 2 行のみを正式語へ修正**した（OD-D15d-3）。修正後、bridge ⇔ canonical parity は `drug.genericName` **35/35**、`display.drugClassLabel`（bridge 宣言 19 module）**19/19**、bridge 内部の `genericName == drugClassLabel` **19/19**
  - **`drug.genericName == display.drugClassLabel` の同値関係を維持する**（OD-D15d-1）。canonical は **35/35 のまま**（無変更）
  - **語の選択根拠〔実測〕**: ① **bridge の凍結本文（SCENARIOS ブロック）に `第二世代ヒスタミンH1受容体拮抗薬` が 133 件**出現し、他 2 語は本文に **0 件** ② canonical の scenario title 29 件も同じ語 ③ canonical は 35/35 で `genericName == drugClassLabel` が成立 ④ B / C を採ると凍結本文との新しい不一致を作る。**bridge を医療内容の SSOT とする原則に立っても、bridge 自身の本文が支持するのは canonical の語**であり、header 側の 2 値が back-fill 由来の drift だったと読める（D-8 / D-15b と同型）
  - **意図的に残した境界（誤認防止）**: 本 Unit は `display.drugGeneric`（`第二世代H1受容体拮抗薬`）/ `search.primaryDisplayName` / `categoryPath[1]` / `display.title` / `display.nodeLabelLong`（いずれも `第二世代抗ヒスタミン薬` 系）/ `brandCatalog[*].genericName` 13 件を**変更していない**（OD-D15d-5）。その結果 H1 oral の bridge header には語の混在が残るが、これは **Owner Decision による scope 限定の結果であり未修正の drift ではない**
  - **`prompts/RULES.md` §4 へは昇格していない**（OD-D15d-4）。audit / validator / test も新設していない
  - machine impact: canonical 無変更のため **manifest / search / runtime ともゼロ**。bridge は runtime 非経路
- **D-15e: `display.nodeLabelShort` の bridge ⇔ canonical 不一致 — 2026-09-21 に解消済み（N-2 も同時解消）**
  - **解消前の状態〔historical〕**: H1 oral は bridge `抗ヒスタミン内服` ⇔ canonical `抗ヒスタミン薬`（display / composition とも）。`dm_insulin_mixed_rapid_long` は **3 値が併存** — bridge `混合型INS（超速効/持効）` / canonical `display` `混合型インスリン（超速効+持効）` / canonical `composition` `混合型INS（超速/持効）`（**canonical 内部の display ≠ composition = N-2**。corpus でこの 1 件のみ）
  - **H1 oral の正式 short label は `抗ヒスタミン内服`**（OD-D15e-1）。canonical の `display.nodeLabelShort` と `composition.nodeLabelShort` の**両方**をこの値へ揃えた。bridge は既に同値のため無変更
  - **mixed insulin の正式 short label は `混合型INS（超速/持効）`**（OD-D15e-2）。canonical `composition.nodeLabelShort` を正とし、canonical `display.nodeLabelShort` と bridge `display.nodeLabelShort` をこの値へ揃えた
  - **事後 parity**: bridge ⇔ canonical `display.nodeLabelShort` **35/35**、`display.nodeLabelShort == composition.nodeLabelShort` は**両 field が存在する 34 module で 34/34**（corpus 全体では下記 `N-3` の欠落 1 件を残して 34/35）
  - **選択根拠〔実測〕**: ① H1 oral: allergy family は剤形マーカー付き（`H1点眼` / `ケミ点眼` / `抗ロイコトリエン内服`）で、canonical 旧値だけが route 非表示だった ② mixed insulin: insulin 8 module のうち 7 件が `INS` 略記で、canonical 旧値だけが非略記かつ **corpus 最長（16 文字）** だった。`composition` 値は兄弟 `混合型INS（超速/中間）` と完全同型 ③ UI では `resolveNodeLabel()`（composition 優先・8 箇所）と `activeDrugLabel`（display 優先）が **別表記を描画していた**が、本 Unit で一致した
  - **family naming を一般 contract 化していない**（OD-D15e-5）。RULES §4 への昇格・audit・validator・test の新設もなし
  - machine impact〔実測〕: `nodeLabelShort` は `data/search-manifest.json` へ投影されないため **manifest はバイト不変（再生成不要・stale なし）**、**search regression は 17 query で差分 0**
- **独立 Finding（記録のみ・remediation なし）: `N-1 categoryPath bridge↔canonical divergence`**
  - 〔2026-09-21 実測〕`allergy_h1_antihistamine_second_gen_oral` の `categoryPath` が bridge `['アレルギー','第二世代抗ヒスタミン薬','内服']`（3 要素）⇔ canonical `['アレルギー','ヒスタミンH1受容体拮抗薬','第二世代','内服']`（4 要素）で不一致（corpus 1/35）
  - **親 D-15 の scope（`drug.*` / `display.*` の 11 field）に含まれないため、D-15 へは追加せず独立 Finding として保持する**（Owner Decision OD-D15-N1）。D-15 の closure を妨げない
  - 分離理由: `categoryPath` は **`data/search-manifest.json` へ投影され、search corpus にも入る**ため、header / display の表示 divergence とは責務が異なる。DP-11（`categoryPath[0]` = 適応領域）や Domain Complete 判定にも接続する
  - 〔実測〕canonical を bridge 値へ寄せると **manifest は変化する**（再生成が必要）が、検証 8 query の hit 集合は不変だった
  - **remediation は行わない。** 正式 ID は remediation Unit へ昇格する時点で既存採番を確認して決める（OD-D15-N3 と同じ扱い）
- **`N-3 mixed_rapid_intermediate composition.nodeLabelShort missing` — 2026-09-21 に解消済み（data repair）**
  - **解消前の状態〔historical〕**: `dm_insulin_mixed_rapid_intermediate` の canonical `composition.nodeLabelShort` が **ABSENT**（`docs/JSON_STANDARD.md` JS-A-composition の必須サブフィールド。corpus でこの 1 件のみ）。初出 commit `e650858`（2026-06-29）からの **birth defect** で、一度も存在したことがない（削除ではない）。同一 commit の兄弟 mixed insulin module は保持していた
  - **実動作の影響〔実測〕**: `app/components/DashboardClient.tsx` の `resolveNodeLabel()` は `composition.nodeLabelShort` → `composition.nodeLabel` → `NODE_LABEL_MAP[categoryPath[1]]` → `brandNames[0]` の順で解決し、**`display.nodeLabelShort` を参照しない**。本 module では `categoryPath[1] = 'インスリン製剤'` が `NODE_LABEL_MAP` に無いため **`brandNames[0]` =「ノボラピッド30ミックス」** が描画されていた（同関数は multi-drug ノードバー・Topbar `baseDrugLabel` 等 **9 箇所**で使用）。一方 `activeDrugLabel`（display 優先）は `混合型INS（超速/中間）` を描画しており、**同一 module が UI 経路によって 2 通りに描画されていた**
  - 2026-09-21 の Unit「N-3 composition.nodeLabelShort repair」で、canonical へ **`"nodeLabelShort": "混合型INS（超速/中間）"` を 1 行追加**した（`nodeKey` の直後。sibling `dm_insulin_mixed_regular_intermediate` と同じキー順）
  - **source は bridge の `display.nodeLabelShort`**（逐語 `混合型INS（超速/中間）`）。本 module の bridge には `composition:` ブロックがないため、`prompts/vNext/PN2-Drug-Header.md`「composition セクション生成」の**フォールバック表（必須）「`composition.nodeLabelShort` ← `display.nodeLabelShort`（bridge）を投影」をそのまま適用した追認**である。**新しい規則は作っていない**（Owner Decision OD-N3-2）
  - **sibling naming から値を生成していない**（Case C 不採用）。**canonical `display.nodeLabelShort` を source とする新規則も作っていない**（Case B 不採用）
  - **事後〔実測〕**: `resolveNodeLabel()` の返値は `混合型INS（超速/中間）` となり、**`resolveNodeLabel()` と `display.nodeLabelShort` が異なる module は 0 件**。`composition.nodeLabelShort` presence **35/35**、display との一致 **35/35**
  - **parity を contract 化していない**（OD-N3-3）。結果として `display.nodeLabelShort == composition.nodeLabelShort` が 35/35 になるが、これを `prompts/RULES.md` / `docs/JSON_STANDARD.md` / validator へ一般規則として昇格していない
  - **machine impact なし〔実測〕**: `composition.nodeLabelShort` は `data/search-manifest.json` へ投影されないため **manifest はバイト不変（再生成していない）**、search regression は 8 query で差分 0。bridge / 他 34 canonical / `lib/` / `app/` / `scripts/` / `tests/` / `docs/` はすべて無変更
  - **requiredness enforcement は本 Unit に含めていない**（OD-N3-4）。下記 Finding 候補として OPEN のまま保持する
- **Finding 候補（OPEN）: `JS-A composition requiredness enforcement / corpus missing fields`**
  - 〔2026-09-21 実測〕`docs/JSON_STANDARD.md` JS-A-composition が**必須サブフィールド**として収載する 9 field について corpus 35 module を実測し、次の欠落を確認した。**3 件とも data repair 済み**
    - `composition.nodeLabelShort` missing 1 件（`dm_insulin_mixed_rapid_intermediate`）→ **N-3 で data repair 済み**
    - `composition.priority` missing 1 件（`dm_insulin_mixed_rapid_intermediate`）→ **R-1 で data repair 済み**
    - `composition.sMergePolicy` missing 1 件（`dm_insulin_intermediate`）→ **R-1 で data repair 済み**
  - **本 Finding は OPEN のまま（残: `sMergePolicy` の enforcement）。** data の欠落は解消し、再発防止は **R-2 で 8 field について導入済み**（下記 R-2）。`sMergePolicy` の欠落は S3 未解決のため引き続きどの層でも FAIL にならない。R-1 時点では `lib/moduleValidator.ts`（`MISSING_*` は moduleId / moduleVersion / persona / primaryDisplayName のみ）／ `lib/crossModuleValidator.ts` ／ `npm run audit` の 8 本 ／ PN7 の 36 項目 ／ tests のいずれも composition 必須 field の存在を検査していなかった（間接的に検出されていたのは `tests/searchCoverage.test.ts` が manifest 経由で確認する `nodeKey` / `classKey` / `clinicalDomain` の 3 field のみ）
  - **R-2 の scope（Owner Decision OD-REQ-4〜7・決定済み／2026-09-22 に R-2 で実装）**: 置き場所は `lib/moduleValidator.ts`（存在確認は構造健全性であり `MISSING_PERSONA` と同じ責務。bridge ⇔ canonical の値一致 audit とは混ぜない）／ error code は **generic 1 つ**（例: `MISSING_REQUIRED_COMPOSITION_FIELD`。field path は detail に入れ、field ごとの code は作らない）／ severity は **ERROR**（R-1 完了で baseline が green になった後に導入する）／ 対象は **JS-A-composition 9 field のうち `sMergePolicy` を除く 8 field**。scope は composition で仕組みを確立してから drug / display へ拡張する（Scope 3）
  - **S3 contradiction（OPEN）**: `prompts/vNext/PN7-Cross-Reference-Audit.md` item S と `docs/DEVELOPMENT_STANDARD.md` §10.5 GG-3 は「`composition.sMergePolicy` は位置づけが確定するまで FAIL 条件としない（欠落は記録のみ）」とする。一方 `docs/DEVELOPMENT_STANDARD.md` §10.1 の注記は「JS-A の field の欠落を Lifecycle を根拠に FAIL 対象から除外してはならない」とし、`docs/VALIDATOR_STANDARD.md` §5（`MISSING_PERSONA`）も「Lifecycle State と severity 判定は独立」とする。**正本同士が矛盾しており、未解決**
  - **`sMergePolicy` を R-2 の enforcement 対象から外すのは S3 が未解決であるための暫定措置**（OD-REQ-3）。これは PN7 item S が正しいと確定したことも、§10.1 を否定したことも、Lifecycle を理由に JS-A の必須性を外したことも意味しない。PN7 item S を改訂して JS-A requiredness を enforce するのか、GG-3 / JS-A 側の位置づけを変えるのかは、後続の Owner Decision で扱う
- **R-1: composition data repair — 2026-09-21 に完了**
  - 上記 Finding の data 欠落のうち、`composition.priority` と `composition.sMergePolicy` の 2 件を **現行 PN2 の規則をそのまま適用して**補完した（Owner Decision OD-REQ-1 / OD-REQ-2）。兄弟 module から値を推測していない
  - `dm_insulin_mixed_rapid_intermediate`: `"priority": "chronic"` を `sMergeDomain` の直後へ 1 行追加。根拠は `prompts/vNext/PN2-Drug-Header.md`「bridge に `composition:` セクションが存在しない場合のフォールバック（必須）」表の行「`composition.priority` ← インスリン注射 → `"chronic"`（慢性疾患薬は `"chronic"` として確定）」。本 module は bridge に `composition:` ブロックがなく、route が `injection`、drugClass が `INSULIN_MIXED_RAPID_INTERMEDIATE` のため条件を満たす。`prompts/RULES.md` §18 も `"chronic"` をインスリン等の慢性期維持管理薬と定める（値は string）
  - `dm_insulin_intermediate`: `sMergePolicy` を `groupKeyRegistry` の直後へ追加（値は `{"unit": "clinical_domain", "conflictStrategy": "separate_by_domain", "withinDomainStrategy": "groupKey_based_semantic_merge"}`）。根拠は PN2「composition.sMergePolicy（必須・PN2が常に生成する固定値）」で、bridge の記載有無に関わらず全 module 共通の model_managed 固定値を入れ、PENDING にしないと定めている。module 分岐・bridge 依存・例外はない。直前の `groupKeyRegistry` の閉じ括弧に `,` を付けた 1 行の変更は JSON 構文上不可避のもので、値の変更ではない
  - **`sMergePolicy` の補完は GG-3 の Lifecycle 分類を確定する判断ではない。** 現行 PN2 が固定値を明示しているため、欠落 1 件へそれを適用しただけである
  - 2 件とも **birth defect**（`priority` は `e650858` 2026-06-29、`sMergePolicy` は `1a072d4` 2026-06-27 の初出時点から ABSENT で、一度も存在したことがない）
  - **事後〔実測〕**: `composition.priority` presence **35/35**（値の分布は `{"chronic": 35}`）／ `composition.sMergePolicy` presence **35/35**（35/35 が PN2 固定 object と完全一致）
  - **machine impact なし〔実測〕**: 両 field とも `data/search-manifest.json` へ投影されないため manifest はバイト不変（再生成していない）。search regression は 10 query で差分 0。両 field とも `lib` / `app` から読まれていないため runtime への影響もない
  - bridge / PN2 / RULES / JSON_STANDARD / VALIDATOR_STANDARD / validator / audit / tests / `lib/types.ts` / 他 33 canonical はすべて無変更
- **R-2: JS-A composition requiredness enforcement — 2026-09-22 に完了**
  - `lib/moduleValidator.ts` に generic errorCode **`MISSING_REQUIRED_COMPOSITION_FIELD`**（**ERROR**・Structural）を 1 つ追加した。field ごとの code は作らず、欠落 field は detail に `composition.<field>` として明記する（例: `composition.priority が存在しません（JSON_STANDARD JS-A-composition: 必須）`）
  - **対象 8 field**: `nodeKey` / `classKey` / `clinicalDomain` / `sMergeDomain` / `groupKeyRegistry` / `nodeLabelShort` / `nodeLabelLong` / `priority`
  - **判定は presence のみ**: missing = `undefined` / `null`（`EXPRESS_MODE_MISSING_FIELD` と同じ判定。`MISSING_PERSONA` の falsy 判定は一般化しない）。`composition` 自体が absent / `null` / object でない場合は 8 field それぞれを報告する（計 8 件。1 件に集約しない）
  - **新しい Repository 規則ではない**: JSON_STANDARD JS-A-composition の既存宣言の machine enforcement（`MISSING_PERSONA` と同じ位置づけ）。`docs/VALIDATOR_STANDARD.md` Appendix に errorCode を追加し、§5 に適用例を記録した（§3-A の番号付き表には `MISSING_PERSONA` と同様に収載しない）
  - **current corpus 35 module で新 ERROR 0〔実測〕**。ModuleValidator の baseline（ERROR 0 / WARNING 35）は不変
  - **`composition.sMergePolicy` は暫定対象外**: S3 contradiction（上記）が未解決のため。`sMergePolicy` を必須でないと判断したものではない。**S3 は OPEN のまま**で、PN7 item S / GG-3 / JSON_STANDARD / RULES は変更していない。`sMergePolicy` を削除しても本 check が ERROR を出さないことを test で固定した
  - **扱わないもの（別論点・未決）**: `""` / `[]` の許否（content validity）／ `priority` の値域（`"chronic"` / `"acute"` / `"prn"`）／ bridge との値一致 ／ `groupKeyRegistry` の内容の参照整合（check 18 の責務のまま）
  - tests: `tests/moduleValidator.test.ts` に table-driven の 12 test を追加（8 field の個別削除 / `null` / `composition` 削除で 8 件 / 正常データで 0 件 / `sMergePolicy` 削除で 0 件）
  - **後続**: Composition type parity（`lib/types.ts`。別 Unit・OD-REQ-10。**同日完了**・下記）／ JS-A drug / display requiredness（OD-REQ-8。`display.drugGeneric missing` を含む）／ S3 解消の Owner Decision
  - canonical / bridge / `data/search-manifest.json` / PN2 / PN7 / RULES / JSON_STANDARD / `lib/types.ts` は無変更
- **Finding 候補（記録のみ・remediation なし）: `JS-B scope drift`**
  - `composition.canonicalSource` / `defaultSMergeLevel` / `domainPolicy` / `nodeIdentityPolicy` は **`docs/JSON_STANDARD.md` JS-B（多剤合成対象 module のみ必須・DP-03）で宣言された条件付き field であり、宣言のない legacy key ではない**。JS-D は allergy_eye_drops / derm 3 系での欠落を「多剤合成対象外」として許容している
  - 問題点〔2026-09-21 実測〕: ① corpus の分布が保有 21 / 非保有 14（非保有は点眼 2・heparinoid 4・insulin 7・`cardiorenal_sglt2_oral`・`dm_dpp4_sglt2_combination_oral`）② JS-B の「現在の対象」欄が「allergy_oral / GLP-1 2系」のままで実態と一致しない ③ insulin 7 件・SGLT2 系 2 件が多剤合成の対象かどうかを定める明文がない
  - **2026-09-18 の削除について（Repository 実測を正とする）**: commit `1ed17e9`「establish H1 eye drops golden reference」が上記 4 key を削除したのは **`allergy_h1_antihistamine_eye_drops` の 1 module だけ**である。DP-03 が当該 module を多剤合成対象外と明記しているにもかかわらず、`82923dd` の再生成時に `allergy_h1_antihistamine_second_gen_oral` から逐語コピーされて混入していた **reference contamination の除去**であり、**corpus 全体からの削除ではない**。corpus 全体から消えたのは同日の `e11d3a2`「remove legacy composition searchDomain」による `composition.searchDomain` のみ（現 corpus で 0 件）
  - requiredness enforcement とは別問題として保持する（OD-REQ-9）
  - **JSB-1 current-generation policy — 2026-09-22 に docs 明文化を完了（Finding 自体は OPEN のまま）**
    - **本 Finding は CLOSE していない。** 「多剤合成対象 module」の判定条件は **新しく定義していない**（OD-JSB-1）。current 21/14 から contract を復元することも、family / route / domain / historical presence から新しい条件を推測生成することもしていない
    - **corpus 実測〔2026-09-22〕**: 4 key の **保有 21 / 非保有 14 / 部分保有 0**。4 key は **all-or-nothing**（4 つ揃うか 4 つとも無いか）で、**値は各 key 1 種類のみ**（`defaultSMergeLevel` = `"clinical_domain"`、他 3 key も固定 object。module 間のばらつきなし）
    - **historical birth distribution〔実測〕**: 保有・非保有は **module 誕生時点で決まっている**（`dm_insulin_regular` `ffadbeb` 2026-06-26 / `dm_insulin_rapid_analog` `5182357` 2026-06-27 は誕生時から保有、`dm_insulin_intermediate` `1a072d4` 2026-06-27 / `dm_insulin_long_acting` `e650858` 2026-06-29 は誕生時から非保有）。**同一 family・同一時期でも割れており**、insulin 2/7・SGLT2 系 1/2・配合剤は混在。唯一 `dm_glp1ra_semaglutide_oral` のみ誕生後（`b7e3f75` 2026-04-11）に追加された。これらは **contract ではなく historical distribution として扱う**（OD-JSB-4）
    - **runtime consumer 0 件〔実測〕**: `lib/**` / `app/**` / validator / search / manifest / tests / scripts のいずれからも 4 key は参照されていない。S 統合が実際に読むのは `clinicalDomain` と `scenarios[].mergePolicy.S.groupKey`（`deriveNodeFields` / `soapComposer`）であり、4 key は経路に入っていない
    - **PN2 / bridge に従来の生成規則がない〔実測〕**: 改訂前の `prompts/vNext/PN2-Drug-Header.md` に 4 key の記載は 0 件。bridge 35 本のうち 19 本が `canonicalSource` を含むが、これは `constitution.canonicalSource`（bridge 原稿を SSOT とする宣言文）であり `composition.canonicalSource` とは別物。他 3 key は bridge 0 件
    - **multi-drug test に非保有 module が参加している〔実測〕**: `scripts/test-multi-drug-synthesis.ts`（`npm run test:multi-drug`）が使う 16 module のうち **10 module が 4 key 非保有**（H1 点眼・chemical mediator 点眼・heparinoid 4・insulin 4・`dm_insulin_glp1_combination`）。JS-D が「多剤合成対象外」としている点眼・derm も含まれる。したがって **「multi-drug synthesis に参加するか」を 4 key の生成条件とすることも current では成立しない**
    - **2026-09-18 の 2 commit の区別〔history 実測〕**: `1ed17e9`「establish H1 eye drops golden reference」が 4 key を削除したのは **`allergy_h1_antihistamine_eye_drops` の 1 module のみ**（変更は当該 bridge と当該 JSON の 2 ファイルだけ）。**corpus 全体からの削除ではない**。corpus 全体から消えたのは同日の `e11d3a2`「remove legacy composition searchDomain」による `composition.searchDomain` であり、両者は別事象
    - **Owner Decision OD-JSB-1〜11**: ① 判定条件を新しく定義しない ② **新規 module では 4 key を生成しない**（current-generation policy。「将来不要」と確定する判断ではない） ③ 既存 21 module から削除しない・21 を正しいとも 14 を欠落とも確定しない・**corpus migration をしない** ④ insulin / SGLT2 / 配合剤を family 単位で対象・非対象と決めない ⑤ 「多剤合成対象 module のみ必須」を current generation contract としては使用しない方向で整理し、docs へ historical / unresolved metadata であることを明文化 ⑥ `canonicalSource` も他 3 key と同じ current-generation policy とするが **Q-F4 は PENDING のまま** ⑦ **conditional requiredness validator は作らない**（作れば historical 21/14 を誤って contract 化するため） ⑧ 新規 module 生成は決定論的に扱い、insulin / 配合剤 / 新 family でも分岐させない ⑨ Q-F4 の旧「現状」表（7 module）は historical observation として保持し、current 実測 21/14 を追記（status は変更しない） ⑩ `prompts/PROJECT_CONTEXT.md` を read-only 確認 ⑪ `JSON_STANDARD.md` / `DESIGN_PRINCIPLES.md` に新しい変更契機節は作らず、関連正本を内容ベースで横断確認する
    - **PROJECT_CONTEXT 確認結果〔read-only・OD-JSB-10〕**: 4 key / 「多剤合成」/ JS-B / DP-03 の記述は **0 件**であり、本 Decision と直接矛盾する current contract 記述はない。**無変更**
    - **横断確認結果〔OD-JSB-11〕**: 編集対象 5 ファイル以外で 4 key に言及するのは **旧体系の `prompts/P0-C.md` のみ**（別 Unit 候補として下記に記録）。`docs/IMPLEMENTATION_CHECKLIST.md` / `docs/DEVELOPMENT_STANDARD.md` の「多剤合成」は runtime 確認・テスト実施の記述であり 4 key の生成条件とは無関係で追随不要
    - **本 Unit で変更していないもの**: canonical 21/14 / bridge / `data/search-manifest.json` / `lib/**` / `app/**` / validator / tests / PN7 / RULES / `lib/types.ts` / `PROJECT_CONTEXT.md` / `P0-C.md` / S3 / GG-3 / Q-F4 status / JS-B の Requirement Class 分類。JS-B・DP-03 の既存表・見出し・採用理由は historical record として保持し、削除も置き換えもしていない
- **別 Unit 候補（記録のみ・変更なし）: legacy `prompts/P0-C.md` の `composition.domainPolicy`**
  - 旧体系 P0-C（`MULTI_DRUG_MERGE_RULE`）が app 受け口仕様として `composition.domainPolicy` を列挙している〔2026-09-22 実測・178 行目〕。current runtime は当該 key を参照していない
  - P0-C は旧体系の工程プロンプトであり、`prompts/PROJECT_CONTEXT.md` §10 が「新規作業では使用しない」と定めているため、current の新規 module 生成経路（vNext PN1〜PN8）には影響しない。JSB-1 では変更していない
- **別 Unit 候補（記録のみ・変更なし）: document change-trigger governance**
  - `docs/JSON_STANDARD.md` / `docs/DESIGN_PRINCIPLES.md` には**変更契機節が存在しない**。`docs/DEVELOPMENT_STANDARD.md` §11.6 は「節が存在しないことを理由に追随不要と判定してはならない」「適用対象外か未適用かは判定できない」と定める
  - JSB-1 では **新しい変更契機節を作らず**（OD-JSB-11）、関連正本を内容ベースで横断確認する方法を採った。両文書が変更契機の適用対象かどうかの判定は **本 Unit では行っていない**。governance 自体の整備は別 Unit で扱う
- **`Composition type parity` — 2026-09-22 に完了**
  - 〔historical・2026-09-21 実測〕`lib/types.ts` の `composition` 型が JS-A / corpus と一致していなかった: ① `priority?: number` だが、JS-A・`prompts/RULES.md` §18・corpus 35 件はすべて string（`"chronic"`）② `sMergePolicy` の型宣言がない ③ `groupKeyRegistry` の型宣言がない。`data/modules/index.ts` の二重キャストにより `tsc` では検出されていなかった（D-3 と同じ機構）。R-1 / R-2 では `lib/types.ts` を変更しなかった（OD-REQ-10）
  - **current state〔実測〕: JS-A-composition 9/9 field の type parity を確認済み**（JSON_STANDARD / RULES / canonical 35 件 / `lib/types.ts` の 4 者）。`nodeKey` / `classKey` / `clinicalDomain` / `sMergeDomain` / `nodeLabelShort` / `nodeLabelLong` の 6 field は既に一致しており無変更
  - **実差分は 3 field のみ**（Option B: 9 field を確認し、差分は不一致・未宣言分だけ。OD-TP-4）。既存 field の並べ替えなし
    - `priority?: number` → **`priority?: string`**（OD-TP-1）。literal union `'chronic' | 'acute' | 'prn'` は採用しない: JSON_STANDARD / RULES が型として定めるのは string であり 3 値は valid values であって TypeScript literal contract ではない／JSON import の string widening により literal union では 35 module すべてが型不一致になる（scratch 実測）／型修復のついでに新しい値制約を加えない。値域 validation は別 Unit
    - **`sMergePolicy?: { unit: string; conflictStrategy: string; withinDomainStrategy: string }`** を inline で追加（OD-TP-2。`composition` / `display` の inline style に合わせ named type は作らない）。各 key は literal ではなく string で、PN2 の現行固定値を TypeScript literal contract へ昇格させていない。**型宣言の追加は S3 contradiction・GG-3 の Lifecycle 分類を解消する判断ではない**
    - **`groupKeyRegistry?: string[]`** を追加（OD-TP-3）。non-empty array 型は導入しない（`[]` の妥当性は別 contract。PN2 は暫定 `[]` を許容している）
  - **optionality は変更していない**（OD-TP-5）。3 field とも optional のまま。requiredness は R-2 validator の責務であり、`sMergePolicy` には S3 contradiction も残るため、compile-time required 化はしない
  - `sMergePolicy` / `groupKeyRegistry` は `sMergeDomain` の直後へ追加（JS-A の並び `sMergeDomain → sMergePolicy → groupKeyRegistry` と局所的に一致）。JSDoc は型の意味のみを記し、設計判断・履歴は本節に保持する
  - **検証〔実測〕**: canonical 35 module の `composition` を二重 cast なしで新しい `NonNullable<ModuleData['composition']>` へ代入する scratch probe で error 0（修復前は 35 件すべてが `priority` で TS2322）。`composition.priority` / `sMergePolicy` / `groupKeyRegistry` を型経由で読む production consumer は 0 件のため runtime behavior は不変
  - **S3 / GG-3 は OPEN のまま**。canonical / bridge / `data/search-manifest.json` / JSON_STANDARD / RULES / PN2 / PN7 / validator / tests / `data/modules/index.ts`（cast）は無変更。dedicated test は追加していない（前例: `2e2c183`）
- **Finding 候補（記録のみ・remediation なし）: `Canonical ↔ TypeScript type validation gap`**（OD-TP-6）
  - `data/modules/index.ts` が 35 module すべてを `raw as unknown as ModuleData` で二重キャストしており、canonical JSON と `ModuleData` の型不一致を `tsc` が検出できない
  - composition の type parity 修復後も、**composition 外に型不一致が残る**〔2026-09-22 実測・scratch probe で cast を外した場合の各 module の最初の不一致〕: `template.urgentCriteria` 21 / `searchConfig.multiTerm.operator` 7 / `display.localInput.targetField` 6 / `drug.brandCatalog`（`displayName` 欠落を含む）2。先頭エラーのみの計数であり全件数ではない。literal union 型（`multiTerm.operator` 等）は JSON import の string widening でも不一致になる
  - 本 Unit では cast を変更していない。remediation（型修復・cast 除去・型検査方式の選択）は別 Unit で扱う
- **investigation / cleanup 候補（記録のみ・変更なし）**（OD-TP-6）
  - **`composition.drugClassLabel`**: corpus で 1 件のみ（`dm_insulin_mixed_rapid_intermediate`）。JSON_STANDARD の composition field としては未宣言（JS 上の `drugClassLabel` は `display` 側）。wrong location かどうかは未確定であり、今回変更しない
  - **`composition.nodeLabel`**: corpus 0 件だが `lib/types.ts` に宣言あり。`app/components/DashboardClient.tsx` の node label fallback と tests が参照しているため dead field と断定しない。cleanup 可否は別調査
- **`display.drugGeneric missing` — 2026-09-23 に DR-1 で完了（exact Bridge restore）**
  - 〔historical・2026-09-21 実測〕`dm_insulin_mixed_rapid_long` の canonical に `display.drugGeneric` が **ABSENT** だった（`docs/JSON_STANDARD.md` JS-A-display の必須サブフィールド。corpus でこの 1 件のみ）。R-1 / R-2 / Composition type parity では修復しなかった（OD-REQ-8）
  - **DR-1〔実測〕**: `bridges/dm_insulin_mixed_rapid_long.md` が宣言する `drugGeneric: "混合型インスリン製剤（超速効型＋持効型）"` を **exact restore** で canonical へ 1 行追加した（OD-DR-1）。**sibling inference / fallback 生成は使っていない**。値は bridge と exact parity。挿入位置は `drugClassLabel` の直後（JS-A-display の並び・兄弟 module の key 順と一致）で、**他 field の変更・key reorder はしていない**
  - **birth defect**〔history 実測〕: 生成 commit `e650858`（2026-06-29）時点から ABSENT で、以後 `drugGeneric` に触れた commit は 0 件。**同一 commit で作られた兄弟 2 件**（`dm_insulin_mixed_rapid_intermediate` / `dm_insulin_mixed_regular_intermediate`）は誕生時から保持しており、本件は transfer omission と評価できる（ただし「なぜ 1 件だけ落ちたか」を示す記述は Repository にない）
  - **事後〔実測〕**: `display.drugGeneric` presence **35/35**。他 33 canonical / bridge / `data/search-manifest.json` は無変更（manifest はバイト不変）。`display.drugGeneric` の runtime consumer は 0 件のため runtime behavior も不変
  - **DR-1 後も validator は `display.drugGeneric` を検査しない。** `lib/moduleValidator.ts` / `lib/crossModuleValidator.ts` / PN7 / `npm run audit` のいずれも当該 field の presence を見ておらず、**bridge に source があるのに canonical が欠落しても自動で止める経路は現時点でも存在しない**。これは OD-DR-3 による意図的な状態であり、enforcement は DR-2 で扱う
- **Finding（OPEN・DR-1 では修復しない）: `display.drugGeneric` value parity（H1 oral）**
  - 〔2026-09-23 実測〕`allergy_h1_antihistamine_second_gen_oral` の bridge は `drugGeneric: "第二世代H1受容体拮抗薬"`、canonical は `"フェキソフェナジン 他"` で **値が一致しない**（presence は両者にあり、requiredness defect ではない）。誕生 commit `625ac7e`（2026-05-23）から canonical は現在の値
  - **requiredness ではなく semantic / value parity の問題として分離する**（OD-DR-2）。**Bridge SSOT 原則だけを理由に即時置換しない。** `display.drugGeneric` の field semantics 自体を確認してから判断する
- **`display.drugGeneric` generation contract — 2026-09-23 に DG-1（調査）／ DG-2（明文化）で確定**
  - **DG-1 調査結果〔実測・historical〕**
    - **normative 記述は JS-A-display 表の 1 行のみ**で、備考欄は「—」だった。`prompts/RULES.md` / `prompts/vNext/PN2-Drug-Header.md` / `prompts/vNext/PN7-Cross-Reference-Audit.md` / `docs/DESIGN_PRINCIPLES.md` には **言及が 0 件**。**field semantics が Repository に存在しなかった**
    - bridge 宣言 **19/35**（うち canonical と exact parity 18・MISMATCH 1）／ bridge 未宣言 **16/35**
    - canonical 値は **33/35 が `drug.genericName` と同値**であり、**同時に 33/35 が `display.drugClassLabel` とも同値**（両者が同値の corpus のため、パターンからは source を特定できない）。単一 `displayGenericName` と一致するのは 1/35 のみ
    - bridge 宣言 19 件の値自体が **class label 17 件 / ingredient name 1 件（`dm_glp1ra_semaglutide_oral` = `"セマグルチド"`）/ 例外 1 件**と、**2 つの意味レベルが混在**していた
    - **bridge 未宣言 16 件はすべて module 誕生時から canonical に値を持つ**（2026-07-05〜07-14 の一連の生成 wave）。当該 bridge の `display:` ブロックは `nodeKey` / `nodeLabelShort` / `nodeLabelLong` のみで、**その値がどの source から生成されたかは Repository から説明できない（unresolved）**
    - **production runtime consumer は 0 件**（`lib/**` / `app/**` / search / manifest / validator / audit / tests）。`lib/menuGroups.ts` は `drugGeneric` を「個別一般名」として prefix 候補から**除外する**旨のコメントを持つのみ
    - **H1 oral の順序〔history 実測〕**: canonical は `625ac7e`（2026-05-23）誕生時から `"フェキソフェナジン 他"`。**bridge は約 1 か月後の `10d1e2f`（2026-06-20）に追加**され、そこで class label（`"第二世代H1受容体拮抗薬"`）が記載された。**canonical が bridge から drift したのではなく、後から作られた bridge が異なる意味レベルで書かれた**
  - **OD-DG-1 semantics（確定）**: `display.drugGeneric` = **module 単位の一般名系表示ラベル**。責務分離は `display.drugClassLabel` = 薬効分類ラベル ／ `drug.brandCatalog[*].displayGenericName` = brand 単位の一般名表示 ／ `display.drugGeneric` = module 単位の一般名系表示。**「必ず個別有効成分名」とは定義せず**、class-level module では代表ラベルを許容する。**`drugClassLabel` の機械コピーとも定義しない**
  - **OD-DG-2 generation rule（確定）**: ① bridge に `display.drugGeneric` が明示 → **exact copy** ② 明示なし → **`drug.genericName` を deterministic fallback**。sibling / family pattern / `drugClassLabel` / brandCatalog の列挙からの推測生成は禁止。`"PENDING"` placeholder も生成しない。PN2 が `display.subtitle` 等で既に採る「明示値優先 → deterministic source fallback」と同じ方針
  - **OD-DG-3 bridge authoring**: `drug.genericName` では表現できない module-level 表示が必要な場合のみ bridge が明示する（代表成分名＋「他」／ module 固有表示／複数成分の集約）。**bridge への記載は全 module 必須ではない**
  - **DG-2 implementation（2026-09-23）**: `docs/JSON_STANDARD.md` JS-A-display の `drugGeneric` 備考へ semantics と生成規則の要約を記載し、表の直後へ 3 field の責務分離を明記。`prompts/vNext/PN2-Drug-Header.md` の「`display.subtitle` の確定ルール」直後へ **「`display.drugGeneric` の確定ルール（推測生成禁止）」を新設**。**本ルールは今後の新規 module 生成を決定論的にするための current rule であり、bridge 未宣言 16 件の historical origin を追認するものではない**（DG-2 内にその旨を明記）
  - **現 corpus と新ルールの照合〔2026-09-23 実測〕**: bridge 明示 + canonical exact parity **18** ／ bridge 未宣言 + `drug.genericName` parity **16** ／ **known exception 1**（H1 oral）
  - **canonical は 1 件も変更していない**（H1 oral / `dm_glp1ra_semaglutide_oral` を含む）。bridge / manifest / validator / tests / `lib/types.ts` / PN7 / RULES も無変更
- **H1 oral `display.drugGeneric` value parity — 2026-09-23 に DG-3a で解消**
  - **確定値**: `allergy_h1_antihistamine_second_gen_oral.display.drugGeneric` = **`"第二世代ヒスタミンH1受容体拮抗薬"`**（bridge / canonical とも同値）
  - **class-level module としての判断（OD-DG3-1）**: 本 module は **brandCatalog 13 brand・一般名 13 種すべて異なる**（フェキソフェナジン / ロラタジン / レボセチリジン / ビラスチン / デスロラタジン / オロパタジン / ベポタスチン / エバスチン / エピナスチン / ルパタジン / メキタジン / セチリジン / アゼラスチン）module である。したがって代表成分＋「他」ではなく、**module 全体を表す分類レベルの一般名系表示**を採る
  - **`"フェキソフェナジン 他"` を採用しない理由**: 13 成分のうち**フェキソフェナジンを代表成分として選ぶ規則が Repository に存在しない**（結果として brandCatalog 先頭 brand「アレグラ」の `displayGenericName` と一致していたが、これを根拠とする規則はない）。**DG-2 は family / sibling / brand 順からの推測生成を禁止**しており、根拠のない代表選定はこれに反する
  - **正表記の根拠〔実測〕**: `"第二世代ヒスタミンH1受容体拮抗薬"` は canonical `drug.genericName` / canonical `display.drugClassLabel` / bridge `genericName`（11 行目）/ DG-2 の bridge 未宣言時 fallback 値の **4 者すべてと一致**する。旧 bridge 値 `"第二世代H1受容体拮抗薬"` は「ヒスタミン」を欠く短縮形で、**bridge 内部で `genericName` と表記が揺れていた**（OD-DG3-2）。`"第二世代抗ヒスタミン薬"` は `display.title` / `nodeLabelLong` 系の presentation label として保持し、`drugGeneric` の正値にはしない
  - **修正順序（OD-DG3-3 / OD-DG3-4）**: **bridge を先に repair し、canonical をその exact value へ追随**させた。これは Human Review により **bridge 正本自体の表記揺れを修正**したものであり、**Bridge SSOT の逆転ではない**。結果として DG-2 の「bridge explicit → exact copy」と一致する。sibling inference / 別 family の模倣は使っていない
  - **「代表成分＋他」方式を全面禁止した Decision ではない**（OD-DG3-5）。将来その表現が必要な module では bridge author が明示し、**代表成分を選ぶ根拠を Human Review で確認する**。本 module にはその根拠が存在しなかったため採用しなかった
  - **history〔実測〕**: canonical は `625ac7e`（2026-05-23）誕生時から `"フェキソフェナジン 他"` で、以後当該値に触れた commit は 0 件。**bridge は約 1 か月後の `10d1e2f`（2026-06-20）に追加**され、field semantics 未定義の時期に異なる意味レベル（短縮した分類名）で記載された。canonical が bridge から drift したのではない
  - **事後の corpus 照合〔実測〕**: bridge explicit + canonical exact parity **19/19** ／ bridge 未宣言 + `drug.genericName` parity **16/16** ／ **known exception 0**。`display.drugGeneric` は 35/35 が DG-2 の生成規則どおりになった
  - **runtime behavior は不変**（`display.drugGeneric` の production consumer は 0 件）。他 34 canonical / 他 bridge / manifest / validator / PN2 / JSON_STANDARD / `lib/types.ts` / tests / PN7 / RULES は無変更
  - **DG-4（`display.drugGeneric` の validator enforcement）は引き続き未着手**（下記）
- **historical: DG-3a 着手前の Finding（OPEN だったもの）**（OD-DG-4）
  - `allergy_h1_antihistamine_second_gen_oral`: canonical `"フェキソフェナジン 他"` ⇔ bridge `"第二世代H1受容体拮抗薬"`。**canonical は今回変更しない**
  - current canonical は OD-DG-1 の semantics（module 単位の一般名系ラベル）に**適合可能**である一方、bridge 側の値は薬効分類レベルの表現である。したがって **canonical を bridge の class label へ寄せるのではなく、bridge 側が確定 semantics に適合するかを別 Unit で Human Review する**
  - **Bridge SSOT 原則は維持する。** ただし本件は bridge が canonical より後に、かつ field semantics 未定義の時期に異なる意味レベルで作成されたことが history から確認されているため、「現在 bridge に書いてあるから自動的に canonical を置換する」とはしない
  - **新ルール適用上の既知の例外として保持する**（DG-2 で無理に整合させていない）
  - `dm_glp1ra_semaglutide_oral` の ingredient-level 値（`"セマグルチド"`）は **許容**（OD-DG-5）。class label へ統一しない
- **DG-4: `display.drugGeneric` の validator enforcement — 2026-09-23 に完了**
  - `lib/moduleValidator.ts` の **`MISSING_REQUIRED_DISPLAY_FIELD` の対象へ `display.drugGeneric` を追加**した。**新しい errorCode は作っていない**（既存 code をそのまま使用）
  - **display required fields = 7**（`title` / `subtitle` / `drugClassLabel` / **`drugGeneric`** / `nodeLabelShort` / `nodeLabelLong` / `nodeKey`）。**generic requiredness の対象は計 17 field**（drug 3 / drug.search 7 / display 7。DR-2 時点の 16 から +1）
  - **除外は `drug.search.primaryDisplayName` の 1 field のみ**になった（既存 `MISSING_PRIMARY_DISPLAY_NAME` が担当。二重報告しない）
  - missing semantics は DR-2 をそのまま継承（missing = `undefined` / `null`。`""` / semantic invalid value / parity mismatch は別 contract）
  - **前提の充足**: generation contract は **DG-2** で確定（bridge 明示 → exact copy／未宣言 → `drug.genericName`）、H1 oral の value parity は **DG-3a** で解消し corpus の known exception は 0。`display.drugGeneric` は **corpus 35/35** のため presence baseline は green のまま導入できた
  - **current corpus で新 ERROR 0〔実測〕**。ModuleValidator baseline（ERROR 0 / WARN 35）は不変
  - tests: DR-2 の table-driven へ `display.drugGeneric` を追加し、`null` 検出 test を追加。**DR-2 時点の「`display.drugGeneric` 欠落でも新 code 0 件」という scope 固定 test は役目を終えたため反転させた**（historical behavior を残すためだけの test にはしていない）。parent 削除時の display 件数 assert も 6 → 7 へ更新
  - `docs/VALIDATOR_STANDARD.md` §5 の除外理由を current state へ更新（DG-2 / DG-3a / DG-4 の経緯を表で記録）。**Appendix の errorCode 追加は不要**（新 code なし）、**§3-A も変更なし**
  - **残る OPEN**: `lib/types.ts` の `drugGeneric?: string`（optional）と JS-A required の **type drift は未解消**。別 Unit で扱う
  - canonical / bridge / manifest / PN2 / JSON_STANDARD / `lib/types.ts` / PN7 / RULES は無変更
- **historical: DG-4 着手前の状態**（OD-DG-7）
  - generation contract が DG-2 で確定したため、DR-2 の `MISSING_REQUIRED_DISPLAY_FIELD` の対象へ `display.drugGeneric` を追加できる状態になった。現 corpus は 35/35 のため presence baseline は green のまま導入可能
  - **DG-2 では validator を変更していない。** 別 Unit / 別 commit で扱う
- **DG-5: JS-A-display の TypeScript requiredness parity — 2026-09-23 に完了**
  - `lib/types.ts` の `ModuleData.display` で **optional だった 5 field から `?` を外した**: `drugClassLabel` / `drugGeneric` / `nodeLabelShort` / `nodeLabelLong` / `nodeKey`。**`title` / `subtitle` は元から required** のため無変更
  - 結果として **JS-A-display の 7 field すべてが TypeScript 上でも required** になり、JSON_STANDARD / PN2 / ModuleValidator / corpus / TypeScript の 5 者が一致した
  - **`display?:` 自体は変更していない。** `ModuleData` の top-level field が optional である既存方針には触れない（変更するなら別 Unit）
  - **目的は static contract parity であり、runtime validation の強化ではない。** canonical の欠落に対する実効 guard は引き続き **ModuleValidator**（DR-2 の `MISSING_REQUIRED_DISPLAY_FIELD` ＋ DG-4 の `drugGeneric` 追加）が担う
  - **実測〔clean scratch〕**: 5 field を同時に required 化して full-project `tsc --noEmit` を実行し **compile error 0 件**。`npm test` も 3891 / pass 3889 / fail 0 / skipped 2 で本体と同値
  - **harness validity も確認済み**: scratch は `tsconfig.tsbuildinfo` を持ち込まず毎回削除したうえで、cast のない箇所（`lib/menuGroups.ts`）へ **故意の型エラーを入れて検出されること**（exit 2 / `TS2322`）を確認してから測定した。`incremental: true` の tsbuildinfo を持ち込むと tsc が何も検査せず exit 0 になる事象を実際に踏んだため、以後の型 probe では必ずこの手順を採る
  - **runtime behavior 不変**（型は実行時に存在しない）。canonical / Bridge / `data/search-manifest.json` は不変
  - **`Canonical ↔ TypeScript type validation gap` は OPEN のまま**。`as unknown as` の二重 cast は repository 全体で **112 箇所**（`data/modules/index.ts` 35 / tests 71 / `lib/searchManifest.ts` 1 / `lib/moduleValidator.ts` 1 / scripts 1）あり、**required 化しても canonical JSON の欠落は `tsc` では検出されない**。cast gap は本 Unit でも触っていない
  - validator / tests / PN2 / PN7 / RULES / JSON_STANDARD / VALIDATOR_STANDARD は無変更
- **`display.drugGeneric` 系列 — DG-1 → DG-5 で完了**
  - **DG-1**（調査）: normative 記述は JS-A の 1 行のみで semantics 未定義・bridge 宣言 19/35・runtime consumer 0・bridge 未宣言 16 件の provenance は説明不能、を実測
  - **DG-2**（generation contract）: semantics（module 単位の一般名系表示ラベル）と生成規則（bridge 明示 → exact copy / 未宣言 → `drug.genericName`）を JSON_STANDARD・PN2 へ明文化
  - **DG-3a**（value parity）: H1 oral の bridge を先に repair し canonical を追随させ、corpus の known exception を 0 にした
  - **DG-4**（validator enforcement）: `MISSING_REQUIRED_DISPLAY_FIELD` の対象へ追加（display 7 field・全体 17 field）
  - **DG-5**（type parity）: TypeScript の optional を解消し 7/7 parity
  - 残る関連 OPEN は `Canonical ↔ TypeScript type validation gap` のみ
- **historical: DG-5 着手前の状態**（OD-DG-6 / OD-DG-8）
  - `display.drugGeneric` は **JS-A required のまま維持**する（optional / legacy へ降格しない）。generation rule 確定により新規 module でも決定論的に生成可能になった
  - `lib/types.ts` の `drugGeneric?: string`（optional）は、generation contract と validator enforcement が閉じた後に別 Unit で扱う。**DG-2 では型を変更していない**
- **DR-2: JS-A drug / display requiredness enforcement — 2026-09-23 に完了**
  - `lib/moduleValidator.ts` に section 単位の generic errorCode **3 つ**を追加した（いずれも **ERROR**・Structural。OD-DR2-1）。R-2 の `MISSING_REQUIRED_COMPOSITION_FIELD` と命名・責務粒度を揃えたもので、新しい Repository 規則ではなく JS-A-drug / JS-A-display の machine enforcement
    - `MISSING_REQUIRED_DRUG_FIELD` / `MISSING_REQUIRED_DRUG_SEARCH_FIELD` / `MISSING_REQUIRED_DISPLAY_FIELD`
  - **対象は 16 field**（OD-DR2-5）: drug 3（`nameAliases` / `aliasToBrand` / `brandCatalog`）／ drug.search 7（`exactAliases` / `nameAliases` / `keywords` / `priority` ＋ `matchPolicy` 3 field）／ display 6（`title` / `subtitle` / `drugClassLabel` / `nodeLabelShort` / `nodeLabelLong` / `nodeKey`）
  - **除外 2 field**: `drug.search.primaryDisplayName`（既存 `MISSING_PRIMARY_DISPLAY_NAME` に委任。二重報告しない・OD-DR2-2）／ `display.drugGeneric`（generation contract 未確定のため暫定対象外・OD-DR-3。**必須でないと判断したものではない**。DR-1 で 35/35 になっても、presence が揃うことと generation contract が確定していることは別）
  - **判定は presence のみ**（OD-DR2-6）: missing = `undefined` / `null`。`""` / `[]` / `{}` は別 contract で、**`drug.search.keywords: []`（28 module）は requiredness として PASS のまま**。値域・値の一致・型 parity も扱わない
  - **parent object**（OD-DR2-7）: `drug` / `drug.search` / `matchPolicy` / `display` が absent / `null` / 配列 / 非 object の場合、配下の required field をそれぞれ報告する（`drug`→10 件、`drug.search`→7 件、`matchPolicy`→3 件、`display`→6 件）。R-2 の pattern を再利用
  - **`nameAliases` の責務分離**（OD-DR2-3）: 片側・両側の**欠落**は presence check（`MISSING_REQUIRED_DRUG_FIELD` / `MISSING_REQUIRED_DRUG_SEARCH_FIELD`）が担当し、**両方 present で値が不一致のときのみ** `NAME_ALIASES_MISMATCH` が担当する。check 3a を「両方 present のときのみ比較」へ変更したが、**欠落は引き続き ERROR で停止する**（担当 code が変わるだけ）。〔実測〕当該挙動に依存する既存 test は 0 件で、`scripts/audit-alias-bridge-chain.ts` は独立した別 code 体系のため影響なし
  - **`drug.brandCatalog` の presence hole を解消**（OD-DR2-4）: 従来は `validateBrandConsistency` が `if (!brandCatalog) return null` で早期 return するため、`brandCatalog` を削除しても ERROR が 0 件だった。新 presence check が停止させる。**既存 consistency validator の挙動自体はリファクタリングしていない**
  - **current corpus 35 module で新 ERROR 0〔実測〕**。ModuleValidator baseline（ERROR 0 / WARN 35）は不変
  - tests: `tests/moduleValidator.test.ts` に table-driven で 24 test 追加（16 field の個別削除 / `null` / parent 4 種 / parent 非 object 4 種 / 正常データ / `display.drugGeneric` 削除で 0 件 / `keywords: []` で 0 件 / `primaryDisplayName` は既存 code のみ / `nameAliases` 片側欠落で二重報告なし / 両方 present の値不一致で `NAME_ALIASES_MISMATCH` 維持）。ファイル単体で 70 tests PASS
  - `docs/VALIDATOR_STANDARD.md`: Appendix へ 3 code を追加し、§5 へ適用例と責務分離を記録（OD-DR2-8 / OD-DR2-10）。**§3-A の `NAME_ALIASES_MISMATCH` 行は変更していない**（parity rule の説明として有効）。§3-A の番号付き表には新 code を収載しない（`MISSING_PERSONA` / R-2 と同じ扱い）
  - canonical / bridge / `data/search-manifest.json` / `lib/types.ts` / PN2 / PN7 / RULES / JSON_STANDARD は無変更（OD-DR2-9）
  - **残る enforcement 空白**: `display.drugGeneric` は引き続き validator の検査対象外であり、bridge に source があるのに canonical が欠落しても自動で止める経路は存在しない（意図的な状態）
- **historical: DR-2 着手前の状態（2026-09-23 実測）**
  - 〔2026-09-23 実測〕JS-A-display 7 field と JS-A-drug / `drug.search` 必須 field の **presence を検査する validator / PN7 / audit は存在しない**（validator の display 系は `display.localInput` の参照整合のみ。drug 系は `MISSING_PRIMARY_DISPLAY_NAME` / `NAME_ALIASES_MISMATCH` / `BRAND_CATALOG_MISMATCH` / `DISPLAY_GENERIC_NAME_*` で、presence の網羅検査ではない）
  - **enforcement 対象は 2 群に分ける**（OD-DR-3）: ① **今すぐ enforce 可能** = Class A（drug 3 field / `drug.search` 8 field / display の `title`・`subtitle`・`drugClassLabel`・`nodeLabelShort`・`nodeLabelLong`・`nodeKey`。いずれも現在 35/35 green） ② **まだ enforce しない** = `display.drugGeneric`（DR-1 で 35/35 になっても対象外。bridge 宣言 19/35・未宣言時の生成規則なし・H1 oral の value 不一致・PN2 専用規則なしのため）
  - **presence が揃うことと generation contract が確定していることは別**である。R-2（composition）と同型の generic error code で実装する想定だが、本 Unit では未実装
- **Finding（OPEN・記録のみ）: JS-A drug / display の type・記述 drift**（OD-DR-5 / OD-DR-6）
  - `lib/types.ts` の `display.drugGeneric?: string` は **optional** だが JS-A-display は必須。Composition type parity と同型の requiredness / type drift（本 Unit では修正しない）
  - top-level `topical` は **`lib/types.ts` に型宣言がなく**、corpus は **object 32 / boolean（`false`）3**（`dm_insulin_glp1_combination` / `dm_insulin_mixed_rapid_intermediate` / `dm_insulin_mixed_rapid_long`）。JS-A は object（`steroidPotency` / `notes`）と規定。runtime consumer 0 件
  - `drug.search.keywords` は 35/35 present だが **28 module が空配列**（非空は allergy 3・derm 4 のみ）。missing ではなく empty であり、R-2 と同じく別 contract として分離する
  - JS-A top-level 表は `scenarios` を **object** と記載しているが corpus は 35/35 **array**（記述 drift）
  - いずれも requiredness とは別契約として分離し、DR-1 では触れていない

- **Finding 候補（記録のみ・remediation なし）: `composition.classKey` ↔ `composition.nodeKey` の関係**
  - D-15b の調査で分離した論点（Owner Decision OD-D15b-5）。**新しい Q-ID は払い出していない**
  - `docs/OPEN_DESIGN_QUESTIONS.md` **Q-J1** は「derm 3系 `composition.classKey` の剤形込み設計」、すなわち heparinoid で classKey に剤形名が含まれ `classKey == nodeKey` となっている問題を扱う
  - 一方 H1 oral は「**同一 H1 family 内で `_2nd_gen` により classKey が分岐している**」（`allergy_h1_antihistamine_eye_drops` は `classKey = h1_antihistamine`、H1 oral は `classKey = h1_antihistamine_2nd_gen`）という別論点であり、**Q-J1 だけでは完全には包含できない**
  - 本論点は DP-02 の class-level S 統合（classKey が同じ module 同士が統合候補になる）および将来の composition 設計に接続するため、**現時点では remediation しない**。独立 Finding 候補として保持し、将来の Owner Decision で扱う
  - 関連〔実測〕: Q-J1 の現状表は cream / lotion / ointment の 3 件を列挙しているが、corpus には **spray を含む 4 件**が存在する（表が 1 件分 stale）。**本 Unit では修正せず**、documentation cleanup 候補へ追加した（下記）
- **D-15c: `drug.drugSpecificTags` の bridge ⇔ canonical 不一致 — 2026-09-21 に解消済み**
  - **解消前の状態〔historical〕**: `allergy_h1_antihistamine_second_gen_oral` の canonical が `["h1_antihistamine_oral", "second_gen_antihistamine"]`、bridge が `["antihistamine", "second_generation", "allergy", "oral"]` で、corpus 唯一の不一致だった（34/35 は逐語一致）。両値とも birth value で一度も変更されていない（canonical `625ac7e` 2026-05-23 ／ bridge `10d1e2f` 2026-06-20 の back-fill）
  - 2026-09-21 の Unit「D-15c drugSpecificTags preservation / parity」で、**canonical を bridge 宣言値へ修正**したうえで preservation contract を導入した（Owner Decision OD-D15c-1〜8）。**bridge は無変更**。修正後の parity は **35/35**
  - **authority（OD-D15c-1）**: `drug.drugSpecificTags` は **bridge-owned preservation field**。canonical は bridge 宣言値を逐語保持する
  - **ordering（OD-D15c-2）**: **件数・順序・表記を含む逐語一致**を要求する。set equality ではない。canonical 側での sort を許可しない（multi-element 配列のため `drugClass` と異なり順序が争点になる）
  - **vocabulary（OD-D15c-3）**: **SSOT を新設していない。** H1 oral bridge の `antihistamine` / `second_generation` は corpus 内で他 module に出現しない孤立 token だが、**孤立していること自体をエラーとしない**。語彙の良し悪しは本 Unit の責務外
  - **normalization（OD-D15c-4）**: canonical 側での sorting / dedupe / case normalization / 単数複数の統一 / compound ⇔ atomic token 変換 / token の追加・削除 / sibling module からの流用を**すべて禁止**した
  - **enforcement（OD-D15c-5）**: PN2 の preservation 条項 + `scripts/audit-drug-specific-tags-bridge-chain.ts`（`npm run audit` へ登録。7 → 8 本）+ `tests/drugSpecificTagsBridgeParity.test.ts`（25 tests）+ PN7 item **AL** + RULES §4「Drug header search metadata」。**`moduleValidator` / `crossModuleValidator` には入れていない**
  - **semantic FAIL は 3 系統のみ**: `DRUG_SPECIFIC_TAGS_MISSING_IN_CANONICAL` / `DRUG_SPECIFIC_TAGS_VALUE_MISMATCH` / `DRUG_SPECIFIC_TAGS_BRIDGE_PARSE_ERROR`。`BRIDGE_NOT_FOUND` は **CHECK**、bridge が key を持たない場合は **NOT_CHECKED**（reverse invariant を課さない）。`JSON_NOT_FOUND` / `JSON_PARSE_ERROR` は既存 bridge-chain audit と共通の infra behavior であり D-15c 固有の semantics ではない（OD-D15c §11-A）
  - **重複 token / 空配列 / token の表記形式には issue code を作っていない**（OD-D15c-6）。FAIL にも CHECK にも分類せず、canonical 側で黙って修正することも禁止した。authoring error とするかは必要になった時点で別 Owner Decision とする
  - 〔FACT・contract ではない〕現行 corpus の tag は **61/61 が `^[a-z0-9]+(?:_[a-z0-9]+)*$` に合致**する。ただし runtime / generation に live dependency がないため **authoring contract 化していない**。また 61 token 中 **44 が 1 module 限定**で、`nodeKey` を含む module 17/35・`classKey` を含む module 11/35 という緩い傾向はあるが機械規則は存在しない
  - **空配列の parser semantics（OD-D15c §11-B）**: `drugSpecificTags:` の直後に値が 0 件の場合は **PRESENT + 空配列**として扱う（bridge `[]` / canonical `[]` → PASS、bridge `[]` / canonical non-empty → VALUE_MISMATCH）。**`scripts/audit-drugclass-bridge-chain.ts` が同状態を PARSE_ERROR とするのとは意図的に異なり**、field-specific contract の差として regression test（T-9b）が両者を固定している
  - **requiredness は別 Decision として未着手**（OD-D15c-7）。`lib/types.ts` の `drugSpecificTags?: string[]` は optional のまま、`docs/JSON_STANDARD.md` JS-A 登録・validator の missing check・bridge 沈黙時の reverse invariant はいずれも実施していない
  - 検索到達性〔実測〕: query `allergy` が 3 → **4 件**、`generation` が 0 → **1 件**へ増加。**消失到達は 0 件**で、その他の query（`antihistamine` / `second` / `oral` / `h1` / 日本語経路 / ブランド・alias 経路）は hit 集合・順序とも不変
  - `data/search-manifest.json` は `npm run generate:search-manifest` で正規再生成した（差分は `sourceHash` と当該 `drugSpecificTags` ブロックのみ。手編集していない）
  - **他 34 module の tags は無変更**。正規化の波及を行っていない

## Static / Local First — file:// deployment 個別動作確認の残項目（2026-08-15）

`docs/STATIC_DEPLOYMENT.md`（living SSOT）・`docs/reviews/PHASE1_STATIC_DEPLOYMENT_VERIFICATION_2026-08-15.md`
（検証記録）が示すとおり、Windows company PC・production `out/`・real `file://` 環境で
local/static deployment の技術成立性・end-to-end 業務利用経路（電子薬歴貼り付けまで）は実証済みである。

一方、次の項目は Owner 実測が存在しないため **NOT YET VERIFIED** のまま保持する。**推測で PASS へ変更しない。**

| ID | 内容 | 現状 |
|---|---|---|
| FAC-10 | Rapid / ADDON 操作が file:// 環境で動作するか | **VERIFIED（2026-09-17）** |
| FAC-13 | reload 後も正常に再表示されるか | NOT YET VERIFIED |
| FAC-14 | console fatal error が 0 件か | NOT YET VERIFIED |
| FAC-15 | Windows 実機の file:// 上で外部ネットワーク通信が 0 件か（コード上は外部通信処理自体が存在しないことを別途確認済み） | NOT YET VERIFIED |

**再開 Trigger**: 次回 Owner が同一の Windows company PC（または同等の制約環境）で SOAP Engine の
`file://` artifact に触れる機会があった時点。correctness / safety blocker ではないため、
単独でこの確認のためだけに Unit を立てる必要はない。確認できた項目は
`docs/STATIC_DEPLOYMENT.md` §6 の該当行と本節を同一作業内で更新し、本節から除去する。

**FAC-10 と Rapid v2 の関係（2026-09-15・Owner Decision）**: FAC-10 は Rapid v2 global promotion の設計判断の
blocker ではないが、**global promotion 後の Rapid v2 を業務用配布（file://）へ出す前の必須条件**とする。
Rapid v2 追加 pilot の Human UI 評価を file:// 静的配布版で行える場合は、その機会に確認する。file:// で問題が
見つかった場合は global promotion とは分けて release / deployment issue として扱う
（正本: `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 OD-RAPID-READINESS-1 §5）。

**2026-09-17 追記**: Rapid v2 6-module pilot の Human Review で、`428d754` を base とした未commit 6-module pilot
static build（`commit 428d754 そのものの配布物`ではない）を file:// で開き、Rapid v2 UI表示・Rapid選択による
SOAP更新・scenario操作・multi-node・ADDON・S/O/A/P表示が動作し、実機操作中に明確な runtime 異常なし・
DevTools Console で確認した範囲に赤い error なしを確認した。**ただし、この確認は上表の FAC-10 の再開 Trigger
（Windows company PC または同等の制約環境での確認）を満たすものではない**（確認環境が Windows company PC で
あるという記録がない／build が commit 相当ではなく未commit working tree である）。したがって**上表の FAC-10
status は引き続き NOT YET VERIFIED のまま維持する**。今回の確認は補足観察として記録するにとどめ、
正本は `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 OD-RAPID-READINESS-1 §5 に置く。

**2026-09-17 追記（Rapid v2 global promotion。[Historical / Superseded] 直後の「FAC-10 VERIFIED」により本段落の
NOT YET VERIFIED 記述は解消済み）**: Owner Decision OD-RAPID-GLOBAL-1 により Rapid v2 は全 module の
既定 profile となった（一時除外は `allergy_chemical_mediator_release_inhibitor_eye_drops` のみ）。**global promotion の
実装完了は業務配布可能を意味しない。** global promotion 後の正式 static build を Windows company PC（または同等の
制約環境）の file:// で確認するまで、FAC-10 は NOT YET VERIFIED のまま業務配布前の release gate として残る
（正本: `docs/OPEN_DESIGN_QUESTIONS.md` Q-RAPID1 OD-RAPID-GLOBAL-1 §6）。

**FAC-10 VERIFIED（2026-09-17・Owner 実機確認）**: Rapid v2 global promotion commit `4238d88` を祖先に含む
post-promotion cleanup 後の最新 clean HEAD `65b056c049f9b2e7d479f0d19f71033e1f2a3780` から生成した正式
static build（`npm run build:static`。working tree は tracked 部分 clean、BUILD バッジが `65b056c` と一致することを
build 直後に確認済み）を、Windows company PC 相当環境の file:// で Owner が実機確認した。既定 v2 module・一時除外
module（`allergy_chemical_mediator_release_inhibitor_eye_drops`。旧 Rapid UI のまま v2 の6 transition UI になって
いないことを画面で確認）・multi-node 合成・ADDON・SOAP 更新を含む主要操作を確認し、DevTools Console にも
明確な赤い runtime error は見当たらなかった。**上表の FAC-10 status を VERIFIED とする。**

FAC-13（reload 再表示）・FAC-14（console fatal error 0 件の悉皆確認）・FAC-15（外部ネットワーク通信 0 の実機確認）は
今回の確認範囲に含まれず、引き続き NOT YET VERIFIED のまま上表のとおり保持する。

---

# 7. 絶対に守るルール

以下のルールに違反した場合、JSON が正しく見えても医療文書として信頼できないものになります。

## bridge を書き換えない

bridge.md は読み取り専用です。  
文言の改善提案・構造の変更・空行の追加などを含め、一切変更してはなりません。

## 本文を変更しない

PN1 が保存した S / O / A / P / addon text は **凍結** されています。  
PN2 以降のフェーズで内容を変更すること（言葉の置き換え・文末の修正・行の追加）は禁止です。  
PN7 の項目 I（本文凍結照合）でこれを検証します。

## 推測生成しない

bridge に記述がないフィールドを推測で埋めないでください。  
わからない値は `PENDING` と書き、ユーザーに確認してから埋めます。

## 勝手に改善しない

「こうした方が良い SOAP になる」「このフィールドを追加すると便利」という判断を Claude が行ってはなりません。  
ユーザーが依頼した内容のみを実施します。bridge に書かれていない情報を JSON に追加しないでください。

## Write ツールで保存する

完成 JSON と中間ファイルはすべて Write ツールで保存します。  
JSON 全文をチャットテキストとして出力しないでください（出力 Limit 超過 + レビューが困難になるため）。

## 途中で JSON 全文をチャット出力しない

PN6 の最終 JSON は特に大規模になります（2,000行超）。  
「確認のため表示する」という行為も行いません。PN7 が JSON ファイルを直接 Read して検証します。

## 禁止 role 語彙を使わない

以下は RULES.md §17 で明示的に禁止されています。使用した場合は PN4 からやり直しです:

- SStructured: `sickday_status` / `followup_status` / `symptom_observation` / `adherence_observation` / `side_effect_observation` / `treatment_adjustment_reason`
- AStructured: `drug_mechanism` / `lifestyle_assessment` / `sickday_assessment` / `risk_assessment` / `clinical_guidance`
- PStructured: `treatment_start_reason` / `followup_monitoring`

## フェーズ実行モードの選択

**PN1 / PN2 は常に手動承認必須**です。

- PN1 を実行したら → 完了報告を行い、ユーザーの承認を待つ
- PN2 が PENDING になったら → 作業を止め、ユーザーへ確認事項を提示し、返答を待つ
- PN2 承認後、ユーザーが AUTORUN 開始コマンドを送った場合 → `prompts/vNext/AUTORUN.md` に従い PN3A〜PN8 を自動連続実行する
- PN2 承認後、ユーザーが個別に「PN3A を実行して」と指示した場合 → 通常モード（1 フェーズずつ）で実行する

AUTORUN モードでの詳細ルール・MUST_STOP 条件は `prompts/vNext/AUTORUN.md` を参照してください。

---

# 付録: bridge ヘッダー構成の参考例

新規 bridge を作成する際のヘッダー構成参考です。  
既存 bridge（例: `bridges/dm_insulin_intermediate.md`）の実際のヘッダーも参照してください。

```markdown
# {薬剤名} bridge

moduleId: {moduleId}
categoryPath: ["{大分類}", "{中分類}", "{小分類}"]
drug:
  genericName: {一般名}
  brandNames: [{ブランド名}, ...]
  drugClass: [{薬効クラス定数}, ...]
  route: injection / oral / topical
display:
  nodeKey: {classKey}_{route}
  nodeLabelShort: {短縮表示名}
  nodeLabelLong: {長表示名}
composition:
  classKey: {薬効クラス英略}
  priority: "chronic" / "acute"
editingRules:
  drugSubject: {{{drug_subject}}} 置換対象のリスト
  preserveOriginal: true
  allowSubjectOmission:
    - cp_good（など主語省略を許容するシナリオ）

SCENARIOS_START
【SCENARIO｜id=initial｜type=treatment_start｜...】
...
SCENARIOS_END
```

---

以上がすべての引き継ぎ内容です。  
新しいチャットはまず bridge ヘッダー作成（または PN1）から作業を開始してください。
