# OPEN_DESIGN_QUESTIONS.md

SOAP Engine — 設計保留事項

このドキュメントは、現時点で設計判断が確定していない「まだ決めていないこと」を記録します。
「どう書くか」は JSON_STANDARD.md を参照してください。
「なぜそうするのか」は DESIGN_PRINCIPLES.md を参照してください。

判断が確定した項目は DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ移管し、
このドキュメントから削除します。

最終更新: 2026-09-17（Q-RAPID1 OD-RAPID-READINESS-1 §7・§8-3 へ Unit A「diabetes domain metadata consistency」の解消を記録: `diabetes` / `diabetes_mellitus` の domain metadata を PN2 生成規則どおり `diabetes` へ整合〔解消記録・mergePolicy 旧 schema drift の別 Finding は `prompts/vNext/HANDOFF.md` §6〕。§8 前提 3 は充足、4〔validator scope の同期判断〕は global promotion 実装時に実施。global promotion は引き続き未実装。一覧表の Q-RAPID1 行を同期。同日先行: 6-module Rapid v2 pilot の Human Review 結果を Q-RAPID1 §3・§4 へ記録し、pilot の Human Review を CLOSE。§3 の topical/cardiorenal/combination 評価軸と mixed-route cp_good、§4 の4観点（scenario切替/OFF復帰/SOAP可読性/剤形横断）、composition 境界（cross-domain 非共有/同一 domain 共有）をすべて実施し blocker 0件。mixed-route realization と composition 横断最適化は Owner 判断により runtime を変更せず、§9・§10 に Known observation / deferred として記録（再開 Trigger は module 開発が一周する少し前・十分な実 SOAP 例が揃った段階。priority / solution /実装時期は未確定）。FAC-10 は今回の file:// 確認（`428d754` base + 未commit 6-module pilot static build。Windows company PC 相当環境ではない）では元定義の再開 Trigger を満たさず、`prompts/vNext/HANDOFF.md` の FAC-10 status は NOT YET VERIFIED のまま維持（同ファイルへ 2026-09-17 追記）。§8 の global promotion 前提1・2は充足、3・4は未充足のまま — **pilot の Human Review は CLOSE だが、global promotion は未承認**。一覧表の Q-RAPID1 行を同期。2026-09-16: Q-RAPID1 §1 へ Owner 確認を追記: bridge authored 表現が「症状」を評価対象としている間は現行 Rapid v2 表現を許容し、bridge 表現が「症状」以外へ変わった時点を再開 Trigger とする方針を確定（単純な名詞置換は不採用、現在の pilot の global promotion 判断の blocker ではない）。同日、§3 へ `cardiorenal_sglt2_oral` の Human Review 結果（現行「症状」表現は実務上許容。clinical subject generalization を承認する判断ではない）を追記し、残り module / 観点 / FAC-10 は未実施のまま明記。同日: Q-RAPID1 §3 へ追加 pilot allowlist の実装状況を追記: `lib/rapidV2.ts` の `RAPID_V2_MODULE_IDS` を Owner 承認済みの exact 6 module へ拡張〔既存3 ＋ 外用・心腎・配合剤の3〕。production 変更は central allowlist のみで、eligibility / composition / route verb / RapidState / canonical / bridge / `adjustmentExpression` 値は不変。validator は allowlist 追従のみで global 化せず。file:// での Human Review と commit / push は未実施。一覧表の Q-RAPID1 行を同期。2026-09-15: Q-RAPID1 へ Owner Decision OD-RAPID-READINESS-1 を追記: Unit「Rapid v2 global promotion readiness review」の結果として、global promotion を行わず追加 pilot を1回挟む方針・clinical subject generalization の PENDING 化・future-subject tripwire（`tests/rapidCapableSubjectTripwire.test.ts`）の承認・追加 pilot 3 module の承認〔allowlist 未実装〕・既存3 module Human 評価の補完方針・FAC-10 の位置づけ・chemical mediator 点眼の追加 pilot 除外・clinicalDomain 値の揺れの別 Finding 化を確定。一覧表の Q-RAPID1 行を同期。2026-09-14: Q-RAPID1 へ Unit「Rapid v2 composition + realization hardening」の Human UI確認由来の Known UX observation（UX-1: Rapid未選択node表示順ズレ／UX-2: 同一module複数追加時のchip識別性。いずれも現時点では blocker ではなく実運用後に再評価）を追記。同日: Q-RAPID1 へ Owner Decision OD-RAPID-ROUTE-VERB-1（Do の動詞を canonical `drug.route` から解決。OD-RAPID-MULTI-PILOT-1 §G へ Superseded 注記）・OD-RAPID-COMPOSITION-1（Rapid v2 multi-node S composition と Unit 付随判断）を追記。同日: Q-RAPID1 へ Owner Decision OD-RAPID-MULTI-PILOT-1 を追記: H1点眼限定だった pilot allowlist を、内服 `dm_dpp4_oral`・注射 `dm_insulin_rapid_analog` を加えた3 module限定 multi-module pilot へ拡張したことを確定。OD-RAPID-H1-PILOT-1 の「H1限定境界」条件はこの新 Decision により superseded（historical record として保持）。6系統taxonomyの全module一般化は引き続き Under Validation・Owner判断待ちのまま変更なし。2026-09-13: Q-RAPID1 へ Owner Decision OD-RAPID-H1-PILOT-1 を追記: H1限定境界・H1内の適用範囲・Do×stable=Default の3点を確定し、H1 Reference Implementation の実装を許可。6系統taxonomyの全module一般化は引き続き検証中。Q-RAPID1 を新設: Rapid transition taxonomy の6種化・H1点眼 Reference Implementation による検証。2026-09 検索ユニット完了に伴い Q-S3・Q-R1・Q-R2・Q-R3 を新設。Q-UX1 に Q-S3 との相互参照を追記）

---

## 保留事項一覧

| No | 項目 | 優先度 | 推奨判断タイミング |
|---|---|---|---|
| Q-A1 | Addon Responsibility をどう構造化するか | 🟡 中 | 糖尿病以外の領域でPN7 check Z相当の監査を展開する際、命名規則ヒューリスティックの精度が不十分と判明した時 |
| Q-J1 | derm 3系 `composition.classKey` の剤形込み設計 | 🟡 中 | heparinoid 複数剤形の同時処方ユースケースが確定した時 |
| Q-F4 | `composition.canonicalSource` の必須化範囲 | 🟡 中 | 多剤合成機能が安定した時 |
| Q-G1 | 配合剤の `genericKey` 複数成分対応（`genericKeys: string[]`） | 🟢 低 | 単剤↔配合剤のクロス成分検索が要件化した時 |
| Q-S1 | 一般名検索が module 単位 `exactAlias` 命中時に `brandNames[0]` へ縮退する検索ロジック | 🟡 中 | brandCatalog.aliases への一般名フルストリング拡張、または `lib/search.ts` 横断修正の要否を判断する時 |
| Q-S2 | module 到達後の brand-level resolution / fallback safety（lowConfidence bucket の意味論混在） | **✅ CLOSED**（2026-08-13） | **完了**。U-1〜U-7 + Runtime Preview + U-8 再評価により correctness / safety を達成。**削除せず historical record として保持する**（設計判断と closure 根拠を将来再構成できるようにするため） |
| Q-UX1 | short-prefix 検索時の limit 内候補配分・ranking（F-S3-1） | 🟢 低 | 表示枠拡張または bucket 別最低保証の要否を判断する時 |
| Q-S3 | 1〜2文字 bare 薬剤名クエリの順位安定性最適化（OD-DRUG-PREFIX-BOUNDARY-1 の best-effort 帯。Q-UX1 とは別軸） | 🟢 低 | 薬剤データが大幅に増えた時。現状は `docs/DESIGN_PRINCIPLES.md` DP-18 の 2026-09 追補（OD-DRUG-PREFIX-BOUNDARY-1）により best-effort として凍結中 |
| Q-R1 | 剤形／投与経路／部位 intent アーキテクチャ（secondary clinical token の一般化） | 🟡 中 | 点眼以外の複数剤形領域が増え、個別対応が積み上がった時 |
| Q-R2 | route-label 表示（例:「オゼンピック注」）の一般化方針 | 🟢 低 | 複数剤形・複数経路を持つ module が増え、表示ラベルの個別対応が積み上がった時 |
| Q-R3 | Phase 2-B display dedup（配合剤候補の表示順・家族単位対称性） | 🟢 低（凍結範囲は DP-20 が既に定義済み） | `docs/DESIGN_PRINCIPLES.md` DP-20「適用しないこと」節の凍結解除を Owner が判断した時 |
| Q-RAPID1 | Rapid transition taxonomy の6種化（Do/追加/変更/削除/増/減）— H1点眼 Reference Implementation → 限定3 module multi-module pilot（点眼/内服/注射）→ 追加 pilot 3 module（外用/心腎/配合剤。OD-RAPID-READINESS-1 §3 で承認・2026-09-16 に allowlist 実装済みで pilot は exact 6 module）による検証。**6-module pilot の Human Review は 2026-09-17 に CLOSE**（blocker 0件。mixed-route composition・composition boundary は Known observation / deferred として記録）。clinical subject generalization は PENDING（許容条件は §1） | 🟡 中 | global promotion 判断は、OD-RAPID-READINESS-1 §8 の残り前提（validator scope の同期判断。clinicalDomain Finding は 2026-09-17 に別 Unit で解消済み）が満たされた時点。**pilot の Human Review 完了は global promotion の承認ではない。** clinical subject は「症状」以外の評価 subject を持つ Rapid-capable scenario が初めて実装された時点で別 Unit の設計レビュー |
| Q-E | Phase 1 監査（2026-07-25）由来の未回答事項 E-1〜E-7（環境・運用・体制に関する Owner 回答待ち） | 項目別（下記） | 項目別の Trigger を参照 |

優先度の凡例:
- 🔴 要判断: 新規 module 追加前に確定が必要
- 🟡 中: 現状の動作に支障はないが早期確定が望ましい
- 🟢 低: 当面は現状維持で問題なし

---

## Q-A1: Addon Responsibility をどう構造化するか

**論点**
Addonは本文（S/O/A/P）の付随物ではなく独立した責務を持つ（RULES.md §22）が、
その「責務」は現状コード上で明示的な構造を持たない。PN7 check Z（Addon
Responsibility Consistency）のような監査も、責務の近さを判定するヒューリ
スティック（命名規則）に依存している。糖尿病以外の領域（吸入薬・外用薬・
漢方等）へ展開する際、この構造化方針が必要になる。

**現状**
- addonの責務は `addons.items[key]` の `group` / `title` / `text` から人間が読み取る運用
- シナリオの「責務の近さ」（例: `cp_good` と `se_hypo_none` がどちらも
  「安定継続フォロー」）も、`type` / `id` の命名規則から推測している
- 明示的な責務メタデータ（例: `responsibilityTag` のようなフィールド）は存在しない

**選択肢**

**選択肢A: 命名規則ヒューリスティックのまま運用（現状維持）**
- メリット: スキーマ変更不要。追加コストが低い
- デメリット: 領域が増えるほど命名規則の推測精度が下がる。領域ごとに再検証が必要

**選択肢B: addonsに責務メタデータを追加する（例: `addons.items[key].responsibilityTag`）**
- メリット: 監査ロジックが命名規則に依存しなくなり、領域横断で再利用できる
- デメリット: 全addonへの遡及的なタグ付けが必要。スキーマ変更を伴う

**選択肢C: シナリオ側に「責務クラスタID」を持たせる（例: `scenario.followupClusterId`）**
- メリット: シナリオ単位で「近似責務グループ」を明示でき、addon側の変更が不要
- デメリット: シナリオ数が多く、既存モジュールへの遡及付与コストが大きい

**推奨判断タイミング**
糖尿病以外の領域（吸入薬・外用薬・漢方等）でPN7 check Z相当の監査を展開する際、
命名規則ヒューリスティックの精度が実用上不十分と判明した時点。

**現時点の扱い**
選択肢Aで運用（命名規則ヒューリスティック: `type=side_effect`かつid末尾`_none`、
`type=adherence`のcp_good系、を「安定継続フォロー」クラスタとして扱う）。
シナリオのグルーピング方法自体は、この構造化方針が確定するまでの暫定実装とする。

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

**runtime / validator 現状確認（2026-06-20）**
- 現在の runtime / validator / UI では `composition.classKey` は参照されていない
- `composition.sMergeDomain` も現時点では合成判定に未使用
- `lib/types.ts` 上でも `sMergeDomain` は「MergedBlock への伝播のみ行い、合成判定には未使用」とされている
- そのため、現時点で heparinoid 剤形間の class-level S 統合は発生しない
- ただし、将来 class-level S 統合機能が実装される可能性があるため、設計判断は継続保留とする

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

**runtime / validator 現状確認（2026-06-20）**
- `composition.canonicalSource` は現時点で runtime / validator / UI から参照されていない
- `lib/types.ts` の `composition` 型にも `canonicalSource` は定義されていない
- そのため、現時点では `canonicalSource` の有無は runtime 挙動に影響しない
- ただし、多剤合成対象 module の構造説明として使われているため、必須化範囲の設計判断は継続保留とする

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

## Q-G1: 配合剤の genericKey 複数成分対応（genericKeys: string[]）

**論点**
`brandCatalog[brand].genericKey`（RULES.md §21）は現在単一文字列のみ。配合剤（例: インスリンデグルデク／インスリンアスパルト配合の「ライゾデグ」）には単剤の genericKey とは別の専用 combo キー（例: `insulin_degludec_aspart_combo`）を割り当てる方針で運用している。単剤の成分名検索（例: 「アスパルト」）で配合剤を候補に含めるかどうかは未確定。

**現状**
- 単剤: `genericKey` は成分単位の単一文字列（例: `insulin_aspart`）
- 配合剤: 単剤とは重複しない専用の単一文字列キー（例: `insulin_degludec_aspart_combo`）を使用し、単剤の検索グループには含めない

**選択肢**

**選択肢A: 現状維持（配合剤は単剤検索に出さない）**
- メリット: 検索候補が過剰に広がらない。安全側
- デメリット: 「アスパルト」検索で配合剤（ライゾデグ等）を探したいユーザーには不便

**選択肢B: `genericKeys: string[]` を導入し、複数成分の共有判定を可能にする**
- メリット: 単剤↔配合剤のクロス成分検索が可能になる
- デメリット: 判定ロジックが複雑化し、過剰マッチのリスクが上がる。既存の単一 `genericKey` 前提のロジック（`lib/search.ts`）の書き換えが必要

**推奨判断タイミング**
単剤↔配合剤のクロス成分検索が実際の要件として上がった時点。

**現時点の扱い**
選択肢Aで運用（`genericKey: string` のみ、配列は未導入）。

---

## Q-S1: 一般名検索が module 単位 exactAlias 命中時に brandNames[0] へ縮退する検索ロジック

→ 確定した設計原則は `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）を参照。本節は Tier 分類・調査経緯・残課題の詳細記録。

**現象**
module 単位 `exactAlias` 命中時に `resolveAllHighPrecisionBrands()` がブランドを1件も特定できず、`entry.drugDisplayLabel ?? brandNames[0]`（module 内で最初に宣言されたブランド）へ縮退する。同一一般名に属する兄弟ブランドが検索結果から欠落する。

**論点（原因）**
`lib/search.ts` の `getDrugSuggestions()` は、クエリが `drug.search.exactAliases`（module 単位の一般名エイリアス）にのみ完全一致し、`brandCatalog[brand].aliases`（brand 単位のエイリアス）には一致しない場合、`resolveAllHighPrecisionBrands()` が `brandCatalog[brand].aliases` と `brandNames` のみを参照し、`drug.search.exactAliases` も `brandCatalog[brand].displayGenericName` も見ないため、候補ブランドを1件も特定できない。

**2026-07 調査で判明した Tier 分類（全19モジュール横断スキャンで実測確認）**

| Tier | 内容 | 実例 |
|---|---|---|
| Tier1: 兄弟ブランド脱落 | 正しい成分の代表1ブランドは出るが、同成分の他ブランドが出ない | `インスリンヒト`（5ブランド→2）/ `イソフェンインスリン`（`dm_insulin_intermediate`、2→1）/ `インスリングラルギン`（`dm_insulin_long_acting`、2→1）/ `インスリンアスパルト`・`インスリンリスプロ`（`dm_insulin_mixed_rapid_intermediate` / `dm_insulin_rapid_analog`、各2→1〜3→1） |
| Tier2: cross-module 欠落 | module 単位 `exactAliases` に成分名自体が登録されておらず、スコア0で候補から完全に消える。他 module 経由でも救済されない | `dm_glp1ra_injection`（「セマグルチド」で検索してもオゼンピックが一切出ない。同成分の `dm_glp1ra_semaglutide_oral` のリベルサスのみヒット） |
| Tier3: 無関係な代表ブランド表示の危険 | クエリに一致する成分と無関係な薬剤が、その module の `brandNames[0]` というだけで単独表示される（最も深刻） | `allergy_chemical_mediator_release_inhibitor_eye_drops`（「ペミロラスト点眼液」で検索→無関係な「ゼペリン点眼液」(アシタザノラスト) が返る） |

逆に `allergy_leukotriene_receptor_antagonist_oral`（モンテルカスト等）・`derm_heparinoid_moisturizer_cream/lotion/ointment/spray`（ヘパリン類似物質）は正常動作していた。理由は `brandCatalog[brand].aliases` に一般名のひらがな読み（例: `もんてるかすと`）を各ブランドへ既に複製していたため。

**採用方針: displayGenericName / brandCatalogGenericMap を解決に使う（旧選択肢Cを採用）**
`resolveAllHighPrecisionBrands()` で `brandCatalogGenericMap`（`buildSearchIndex()` が既に構築済みの `brand → displayGenericName ?? genericName` マップ）を参照し、クエリと一致する brand を high precision brand として抽出する。`brandCatalog[brand].displayGenericName` は JS-A-drug で全 brand 必須の既存フィールドであり、bridge への新規追記なしに正しく機能する。genericKey によるグルーピング判断（`groups` 構築ロジック）は変更しない。displayGenericName は「クエリと一致するか」の単純な一致判定にのみ使い、「どのブランドを束ねるか」というグルーピング判定には使わない（RULES.md §21 の genericName/genericKey 役割分離を維持）。

**不採用: brandCatalog.aliases への一般名フルストリング複製（旧選択肢A）**
`allergy_leukotriene_receptor_antagonist_oral` 等で既に実践されていたが、300+ module 規模では module 追加のたびに bridge / JSON 双方で全 brand の aliases に同一文字列を手動複製し続ける必要があり保守負荷が高すぎる。複製漏れが `ペミロラスト点眼液`（Tier3）のように実際に発生していたことも確認済み。`docs/VALIDATOR_STANDARD.md` §5 が「`exactAliases` の網羅性は設計判断」と明記する領域のため、機械的な自動複製もできない。

**残課題1: Tier2（cross-module 欠落）は本対応の対象外**
`resolveAllHighPrecisionBrands()` は `scoreEntryAND()`（`scoreEntry`）で一度 `score > 0` と判定された `scored` エントリに対してのみ呼ばれる。`dm_glp1ra_injection` は module 単位の `exactAliases`/`nameAliases`/corpus のいずれにも「セマグルチド」（ひらがな含む）を含まないため、`resolveAllHighPrecisionBrands` に到達する前の `scoreEntryAND` 時点でスコア0となり `scored` に一切入らない。今回の修正は `resolveAllHighPrecisionBrands` 内部（`scored` 通過後の候補ブランド抽出）のみのスコープであり、`scored` に入るかどうかの判定（`scoreEntry`/corpus）には影響しないため、Tier2 は本対応では解決しない。修正実装後に実測で確認済み（`getDrugSuggestions("セマグルチド")` は `dm_glp1ra_semaglutide_oral` のリベルサスのみで、`dm_glp1ra_injection` のオゼンピックは依然出ない）。Tier2 に対応する場合は `scoreEntry`/corpus 構築側に `brandCatalogGenericMap` 相当の一般名を含める別途の変更が必要であり、影響範囲が本対応より広いため別タスクとする。

**残課題2: genericKey 不統一（cross-module 統合への影響は実測上ないことを確認）**
`dm_insulin_rapid_analog` は `genericKey: "insulin_lispro"` のように明示キーを設定しているが、`dm_insulin_mixed_rapid_intermediate` は `genericKey` 未設定で `displayGenericName`（"インスリンリスプロ"）へフォールバックしている。当初は文字列不一致によりこの2 module が合流しないと想定していたが、修正実装後に `getDrugSuggestions("インスリンリスプロ")` / `getDrugSuggestions("インスリンアスパルト")` で実測したところ、**両 module の全ブランドが1つの結果セットに正しく展開されることを確認した**（cross-module の候補結合は `moduleId:brand` 単位の dedup と、`displayGenericName` 文字列一致によるヘッダー dedup（`__generic__:${genericName}` キー）で行われており、`genericKey` の値そのものはこの結合処理に使われないため）。したがって genericKey 不統一は現時点の検索 UX には影響しない。ただし `genericKey` は「同一成分としてまとめてよいか」の判定専用キー（RULES.md §21）であり、将来 `genericKey` を基準にした結合ロジックへ変更された場合に問題が顕在化しうるため、命名規則の統一（明示キー化 or フォールバック文字列の統一）は引き続き別タスクの検討対象とする。

**残課題3: 一般名読み到達性の監査**
Tier2 が `dm_glp1ra_injection` の5ブランド全件・配合剤3件（ソリクア/ゾルトファイ/ライゾデグ）で発生していたことは、`brandCatalog[brand].displayGenericName` の読み（ひらがな）が module 単位・brand 単位のどちらのエイリアス群にも一切存在しない brand を機械的に検出すれば事前に発見できた不整合である。2026-07 の対応では `dm_glp1ra_injection`（ビクトーザ/バイエッタ/リキスミア/トルリシティ/オゼンピック）・`dm_insulin_glp1_combination`（ソリクア/ゾルトファイ、成分ごとに個別追加）・`dm_insulin_mixed_rapid_long`（ライゾデグ、成分ごとに個別追加）へ bridge 起点で一般名読みを追加し解消したが、`derm_heparinoid_moisturizer_spray`（ヒルドイドフォーム）は当時対象外のまま残っていた。今後 300+ module 規模でモジュールを量産する際、bridge 作成時に一般名読みの登録を失念すると同じ Tier2 が再発するため、「brandCatalog の各 brand について、displayGenericName の正規化形が module 単位・brand 単位いずれかのエイリアス群に最低1つ存在すること」を確認する audit を新設した。これは「このaliasが正しいか」という内容判断ではなく「一般名の読みが1件も登録されていない brand があるか」という存在確認のみであり、`docs/VALIDATOR_STANDARD.md` の Structural 分類（フィールド間の同期）に該当し、§5 が禁じる「exactAliasesの網羅性の自動生成」には抵触しない。**監査機構は `scripts/audit-generic-name-reachability.ts` として実装済み・`npm run audit` に登録済みである（詳細は `docs/VALIDATOR_STANDARD.md` §6 を参照）。当時検出されていた唯一の未到達データ（`derm_heparinoid_moisturizer_spray` / ヒルドイドフォーム）は、`drug.search.exactAliases` へ `displayGenericName` の確定値を bridge 起点で追記する対応により解消済みである（`npm run audit` 実測: `GENERIC_NAME_UNREACHABLE` CHECK 0 / FAIL 0）。監査機構自体は今後の module 追加・変更時の検出責務を継続して持つ。`GENERIC_NAME_UNREACHABLE` の severity は CHECK から FAIL へ昇格済みであり、以後同種の未到達データが再発した場合 `npm run audit` は非0終了する。`lib/moduleValidator.ts` への組込み判断、および build / CI への配線判断は引き続き未了である。**

**現時点の扱い**
2026-07、`lib/search.ts` の `resolveAllHighPrecisionBrands()` に `brandCatalogGenericMap` 参照を追加し、Tier1・Tier3 は解決済み（実測確認済み）。同日、`dm_glp1ra_injection` / `dm_insulin_glp1_combination` / `dm_insulin_mixed_rapid_long` へ一般名読みエイリアスを追加し、これらモジュールにおける Tier2 も解消済み（実測確認済み）。`derm_heparinoid_moisturizer_spray` の Tier2 相当（ヒルドイドフォーム）は、当時対象外のまま残存していたが、`drug.search.exactAliases` への bridge 起点の追記により解消済みである（`npm run audit` 実測: `GENERIC_NAME_UNREACHABLE` CHECK 0 / FAIL 0）。一般名読み到達性を機械的に監査する仕組み（残課題3）は `scripts/audit-generic-name-reachability.ts` として実装済みであり、今後の module 追加・変更時の検出責務を引き続き持つ。同 audit の `GENERIC_NAME_UNREACHABLE` severity は CHECK から FAIL へ昇格済みである。`lib/moduleValidator.ts` への組込み判断、および build / CI gate への配線判断は未了のままである。本 Q-S1 は残課題1・残課題2 とあわせて未解決のまま残る。

---

## Q-S2: module到達後のbrand-level resolution / fallback safety

> ## ✅ CLOSED（2026-08-13）
>
> **`REMAINING_QS2 = 0`。** BrandResolution の correctness / safety は
> U-1〜U-7 + Runtime Preview 検証 + U-8 Deferred 再評価をもって完了した。
>
> **本項目は削除せず historical record として保持する**（Owner Decision OD-U8-2）。
> BrandResolution の設計判断・closure 根拠・U-1〜U-8 の履歴への入口を残すためである。
> 以下の本文は **closure 時点までの経緯**であり、確定した設計・工程・最終分類は
> 「実装工程」節以降を参照する。closure の詳細な実測は
> `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §13.9 を参照する。
>
> **closure 後に残った作業は Q-S2 の blocker ではない**:
> U-6（検索 UX 改善）→ 本 Question とは別工程 ／ Q-UX1（ranking / limit）→ 独立 Question ／
> cleanup Finding（F-RAPID-1 / F-EXP-1 / AddonPanel）→ `prompts/vNext/HANDOFF.md` §6

**論点**
module 単位の alias（`drug.search.nameAliases` 等）でクエリが module へ到達しても、`brandCatalog[brand].aliases` で候補 brand を一意に解決できない場合、`getDrugSuggestions()` は `matchedBrandName === undefined` のまま `lowConfidence` bucket へ候補を落とす。この状態で UI が `entry.drugDisplayLabel ?? brandNames[0]`（module 内で最初に宣言された brand）へ静かに確定すると、クエリが実際には指定していない brand・成分が確定表示される。

Q-S1（DP-09）は「module への到達性」を扱うのに対し、本論点は「到達した**後**の brand 帰属解決の安全性」を扱う。責務が異なるため独立した Question として扱う。

**現状（構造上の事実）**
`lowConfidence` bucket には、性質の異なる少なくとも3種の候補が区別されずに混在する。

| 種別 | 内容 |
|---|---|
| ① 本当に弱い corpus match | 明確な alias 一致がなく、周辺文言の緩い一致のみで拾われた候補 |
| ② module alias は強く一致するが brand 解決だけ失敗 | module 単位 alias には完全一致するが、`brandCatalog[brand].aliases` のいずれにも一致しない |
| ③ class-level query | クエリが特定 brand も特定成分も指定せず、module／薬効クラス全体を指している（例: 薬効分類名そのものでの検索） |

**具体的なDeferredケース**
以下は「module 単位では alias 到達済みだが brand 単位では未解決」という状態を、安全性を実測確認できなかったため意図的に補完しなかったケースである。個別の再現手順・実測件数は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照。

| ケース | 対象（module 帰属は U-8 で実測訂正済み） | Deferredの理由（衝突する既存仕様） | **U-8 最終分類** |
|---|---|---|---|
| D-1 | メトアナ = `dm_dpp4_biguanide_combination_oral`（4 brand / 4 generic group。メトホルミン塩酸塩の salt-name reading） | 単剤メトホルミンを1位に維持する ranking 仕様と衝突する | **TRANSFERRED_TO_U6**（correctness は U-5 gate で安全化済み。alias 追加は行わない） |
| D-2 | リオベル = **`dm_dpp4_thiazolidinedione_combination_oral`**（1 brand。ピオグリタゾンの salt-name reading） | ピオグリタゾン単剤を1位に維持する ranking 仕様と衝突する | **RESOLVED**（single-brand から構造的に `denotation: 'brand'` を導出。containment 不要） |
| D-3 | メタクト = `dm_thiazolidinedione_biguanide_combination_oral`（1 brand。メトホルミン塩酸塩の salt-name reading） | D-1 と同一の ranking 仕様と衝突する | **RESOLVED**（同上） |
| D-4 | ツイミーグ = **`dm_imeglimin_oral`**（1 brand。イメグリミン塩酸塩の salt-name reading） | brand 帰属自体は一意だが、追加すると別 module の選択可能 brand 行が表示枠（limit=8）から脱落する（Q-UX1 と同種の副作用が発生する） | **RESOLVED**（correctness）＋ **TRANSFERRED_TO_Q_UX1**（prefix `い` での表示枠脱落） |

> **module 帰属の訂正（U-8 実測）**: 上表の D-2 / D-4 は、調査段階の記録（会話引き継ぎ）に
> 由来する誤った module 帰属を長く保持していた。正しくは D-2 = `dm_dpp4_thiazolidinedione_combination_oral`、
> D-4 = `dm_imeglimin_oral` である。訂正の初出は
> `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` §9.1 および
> `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §8.1 であり、
> closure の一環として本表へ同期した（historical record 側は書き換えていない）。
>
> **個別 alias containment は 4 件とも不要**である。brand は module の静的構造から導出されるため、
> Deferred 理由であった ranking 衝突を発生させずに解決した（Suite ⑦ / ⑧ とも維持を実測）。

**なぜ機械的な一括解決を採用しないか（不採用とした方針）**
「module 単位 alias があるのに brand 単位で解決できないものを一律 FAIL にする」監査を検討したが、不採用とした。理由は、brand-level unresolved が **DP-18 が定める意図的な設計**（salt-name full reading を generic-labeled brand 自身にのみ登録し、family 内の他 brand へ機械的に複製しない）によって生じているケースが存在するためである。同じ salt-name reading でも、家族内のどの brand へ複製してよいかは cross-module tie-break の挙動に依存して結果が変わるため、alias family 単位の静的ルールだけでは安全性を判定できない。

**選択肢**

**選択肢A: 個別ケースごとに実測確認しながらcontainmentする（現状の運用）**
- メリット: 安全性を都度実測できる。誤った containment のリスクが低い
- デメリット: module 数が増えるほど確認コストが線形に増える。抜け漏れが発生しやすい

**選択肢B: lowConfidence bucketを3種に分離し、UIが種別ごとに異なる提示をする**
- メリット: ③class-level query は「複数候補から選ばせる」UI、②module一致だが未解決は「候補を明示提示」等、種別に応じた安全な提示ができる
- デメリット: `lib/search.ts` の bucket 構成・`DrugSuggestionItem` 型・UI 側の分岐が増える

**選択肢C: class-level query専用の新しい候補表現を設計する**
- メリット: 特定 brand・特定成分を指定しないクエリを、無理に brand へ確定させずに扱える
- デメリット: 新しい UI・データ構造の設計が必要。範囲が③単独にとどまらず Q-S2 全体の設計に波及しうる

**推奨判断タイミング**
lowConfidence bucket の実際の到達件数・誤解決の実害が、Runtime確認（`docs/IMPLEMENTATION_CHECKLIST.md`）で問題として顕在化した時点、または新しい薬効領域追加時に同種のケースが継続して発生すると判明した時点。

**現時点の扱い（設計方針確定・実装中）**

Architecture Review により設計方針が確定し、実装工程 U-1〜U-8 に着手している。選択肢は「A で運用継続」ではなく、**選択肢 B を中心に据える**方針で確定した。

**確定した Owner Decision**

| # | 決定 |
|---|---|
| 1 | **discriminated resolution state を採用する。** `matchedBrandName?: string` の undefined のみへ意味論を持たせる案は不採用。型定義は `lib/brandResolution.ts` |
| 2 | **「検索候補として選択可能」と「SOAP 生成可能な確定状態」を分離する。** `denotation: 'module'` / `subject: null` の状態から SOAP 生成・brand 依存 ADDON 解決を行ってはならない |
| 3 | class-level query は domain schema 上 module-level unresolved を正式状態として保持する。初期 UI では既存 generic group へ展開可能な場合は generic 候補へ展開し、複数 generic group がある場合のみ追加選択を要求する。**専用の新規「未確定候補 UI」は現時点では新設しない**（generic group で表現できない実例が出た場合に再検討する） |
| 4 | `derm_heparinoid_moisturizer_ointment` の generic group 内 handlingTags 不均質は、Q-S2 本体とは分離した Finding として **U-8 で再評価する**。現時点では genericKey 変更等を行わない |
| 5 | `resolveDrugName()`（`lib/drugSubject.ts`）は resolution state → SOAP subject の唯一の SSOT として維持・刷新する。`denotation: 'module'` では subject を生成しない |
| 6 | **Q-UX1 は引き続き Deferred。** Q-S2 実装中に ranking / bucket 結合順 / limit=8 の配分は変更しない |
| 7 | D-1〜D-3 は個別 alias containment を行わず、Q-S2 根本設計の完了後に再評価する |

**schema 上の確定事項**

`denotation: 'generic'` は **authoritative な単一 brandKey を持たない**。generic resolution は複数 brand を代表しうるため、単一 brandKey を型契約へ持たせると `brandNames[0]` fallback と同型の「意味論を持たない代表 brand 選択」を再導入することになる。`genericKey` が保持するのは canonical JSON の `brandCatalog[].genericKey` そのものではなく、`genericKey ?? displayGenericName ?? genericName`（§21）による解決済みグルーピングキーである。詳細は `lib/brandResolution.ts` の JSDoc を正本とする。

**実装工程**

```
U-1  resolution schema（型契約の確立。runtime 未接続）           ← 完了
U-2  lib/search.ts が resolution を付与する                      ← 完了
U-3  BrandResolution → subject resolver の実装                   ← 完了（consumer 0 件）
U-4a resolution を production state へ保持する（plumbing only）   ← 完了
U-5  SOAP 生成 / brand 依存処理の resolution gate                ← 完了
U-4b legacy consumer を BrandResolution 契約へ移行する           ← 完了
U-7  invariant tests / audit                                     ← 完了
U-6  class-level query の generic group 展開                      ← 未実施（Q-S2 の blocker ではない）
U-8  個別 Finding 再評価（D-1〜D-3 / heparinoid handlingTags 不均質） ← 完了
```

**U-4 を U-4a / U-4b へ分割し、U-5 を両者の間へ置く（Owner Decision・2026-08-12）**

当初の工程は「U-4（consumer 移行）→ U-5（gate）」だったが、Repository 実測により、この順序では
`denotation: 'module'`（`subject === null`）の候補について **U-4 完了時点で `{{drug_subject}}` が
未解決のまま SOAP 本文へ露出する**中間状態が生じることが判明した（`resolveDrugSubject()` は
空文字の場合にスロットを残す仕様であるため）。

そこで工程を次のとおり分割した。

| Unit | 責務 | runtime behavior |
|---|---|---|
| **U-4a** | `BrandResolution` を production state（`activeResolution` / `ComposeNode.resolution`）へ保持する | **変更しない**（plumbing only。resolution を判断入力として読まない） |
| **U-5** | `denotation: 'module'` で SOAP 生成を開始させない／authoritative な brandKey が無い状態で brand 固有解決を行わせない | 変更する（候補・可視性のみ） |
| **U-4b** | subject consumer を `resolveSubjectFromResolution()` へ移行する | 変更する（SOAP 本文のみ） |

この順序の利点は、①U-5 適用時点で placeholder 露出を発生させずに臨床的安全性が確保されること、
②regression の症状が Unit と 1 対 1 に対応すること（可視性 = U-5 / 本文 = U-4b）、
③U-4b を revert しても U-5 の gate が残り安全側に倒れること、である。
根拠となる実測は `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` §13 を参照。

**U-4a が行わないこと**: consumer 移行・安全 gate・`resolveDrugName()` の変更・
`lib/brandResolution.ts` の変更・Express 経路の変更。

**`denotation: 'generic'` の handlingTags 導出規則（Owner Decision・2026-08-12・確定）**

U-1 の型契約が「`brandKeys` から特定の 1 件を選んで brand 固有の値を取得してはならない。
取得方法は U-1 では定めない（U-5 / U-8 の対象）」として保留していた論点を、U-5 で次のとおり確定した。

> **`denotation: 'generic'` の `handlingTags` は、`brandKeys` に属する全 brand の
> `handlingTags` の交差集合とする。** 実装は `lib/brandTags.ts` の
> `intersectHandlingTags()` を正本とする。

採用理由:

- 特定の代表 brand を選ばない（`brandKeys` への添字アクセスを実装から排除している）
- brand の配列順に依存しない（集合演算のみで構成）
- generic group 全体について常に真であるタグのみを使用するため、患者が実際に受け取った
  brand が group 内のどれであっても提示内容が妥当である
- DP-15（明示的不確定性）および `lib/brandResolution.ts` の generic member 契約と整合する
- Repository 実測で、91 の一意な `(moduleId, genericKey)` すべてについて既存の可視性
  （ADDON 可視数・scenario 可視数）との差分が 0
- group 内にタグの差異があり、かつそれが将来 gate 対象になった場合は自動的に安全側へ倒れる

**未確定を `undefined` で表現してはならない。** `getVisibleAddonKeys()` は
`brandHandlingTags === undefined` のとき brand フィルタをスキップする後方互換仕様であり、
未確定を `undefined` で表すと brand 依存 ADDON が逆に全表示される。未確定は空配列 `[]` で表す
（`lib/addonFilter.ts` の JSDoc を参照）。

**U-5 が行わないこと**: subject 算出方法の変更・`resolveDrugName()` の consumer 移行・
Topbar 表示ラベルの変更（表示は `uiLabel` 責務として分離し、データアクセス用の
`tagBrandKey` のみを安全化した）・Express 経路の変更・候補集合 / ranking の変更。

**U-4b: SOAP subject source の移行（Owner Decision・2026-08-12・確定）**

検索由来候補の SOAP 主語を、表示文字列と brand 名の比較（`drugDisplayLabel !== matchedBrandName`）
による推論から `BrandResolution.subject` へ切り替えた。実装は primary / compose の
**write site 2 箇所のみ**であり、consumer（primary 再構築 / node 再構築 / Rapid / S先頭文 /
ADDON 再生成）は単一の write-site 値を読むため無変更である。

| 項目 | 内容 |
|---|---|
| 正式な解決経路 | 検索由来 = `resolveSubjectFromResolution()` / Express・legacy 非検索経路 = `resolveDrugName()` |
| `resolveDrugName()` | **削除も deprecated 化もしない**（Owner Decision S-1-A）。production 呼出しは 4 → 3 件へ減り、すべて `?? resolveDrugName(...)` の形＝ resolution 由来 subject が無い経路の分岐に限定される |
| `subject === null` の扱い | 別値で埋めない。`denotation: 'module'` のみが該当し、U-5 gate により SOAP 生成へ到達しない。state 上は「主語の上書きなし」を `undefined`、node では「主語なし」を空文字で記録する（Owner Decision S-2-A） |
| expected semantic delta | production 到達可能な変更は **generic の 6 パターン / 25 行 / 6 module のみ**。brand は 0 差分、module は gate 済みで SOAP に現れない。`tests/fixtures/subjectMigration.expected.json` に凍結 |
| 変更対象 module | `dm_insulin_regular` / `dm_insulin_mixed_regular_intermediate` / `dm_insulin_intermediate` / `derm_heparinoid_moisturizer_{ointment,cream,lotion}` |

**U-4b が行わないこと**: Express 経路の変更・`ComposeNode.resolvedDrugName` の削除・
Rapid の式形統一（F-RAPID-1。cleanup Finding として保持）・test harness の移行・
U-5 gate / `lib/brandResolution.ts` / `lib/search.ts` / `lib/brandTags.ts` / Topbar 表示の変更。

**U-7: invariant / audit（Owner Decision・2026-08-13・確定）**

新規 module を追加した際に BrandResolution safety を機械的に検証できるよう、
`scripts/audit-brand-resolution-safety.ts` を新設し `npm run audit` へ統合した。
検査内容・code 一覧・FAIL / CHECK の意味・責務境界は **`docs/VALIDATOR_STANDARD.md` §2-A / §2-B を正本**とする。

**INV-4 / INV-6 の再定義**（Architecture Review §10.1 の原定義を現実装に合わせて更新）

| INV | 再定義後 | 分類 |
|---|---|---|
| INV-4a | generic group 内で `displayGenericName` が一意 | FAIL |
| INV-4b | 全 brand で generic grouping key（`genericKey ?? displayGenericName ?? genericName`）が解決可能 | FAIL |
| INV-4c | `handlingTags` 交差集合により、現に gate へ使われているタグが脱落する group | CHECK |
| INV-6 | single-brand module が**未確定状態（`denotation: 'module'`）へ落ちない**（「常に `brand`」ではない。generic 候補の生成は正当） | FAIL |

旧 INV-4「generic group 内 handlingTags 均質性を CHECK」は、U-5 の交差集合 Decision により役割を終えた。
不均質そのものは欠陥ではないため FAIL / CHECK のいずれにもしない。

**U-7 が行わないこと**: INV-2（型で完全保証）と INV-3（U-5 / U-4b の test が担当）の audit への重複実装・
module-level alias の brand-level 非複製を FAIL にすること（INV-5 / DP-18）・cross-module ranking simulation・
Q-UX1 事項・canonical JSON / bridge の修正・production runtime code の変更・
S4-C（CI / git hook / build gate）の整備。

**新規 module 開発へ戻ってよい最低到達点**: U-1〜U-3・U-4a・U-5・U-4b および U-7 が完了し、既存テスト・Suite⑦/⑧・multi-drug が維持され、新規 audit が機能した時点。

調査経緯・時点付き実測（D-1〜D-4 の再現結果、コード位置、commit 根拠）は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照する。上記 Decision に至った設計根拠（root cause の同定、two-axis model、discriminated union の採用理由、責務分離、invariant / audit 設計）は `docs/reviews/BRAND_RESOLUTION_ARCHITECTURE_2026-08-09.md` を参照する。

---

### U-8: Deferred 再評価と Q-S2 の CLOSED 判定（Owner Decision・2026-08-13・確定）

**`REMAINING_QS2 = 0`。Q-S2 を CLOSED とする。**

**closure 条件の充足**（Architecture Review §11.2「新規 module 開発へ戻ってよい最低到達点」に照らして）

| 条件 | 実測 |
|---|---|
| U-1〜U-3 / U-4a / U-5 / U-4b / U-7 完了 | ✅ `a263c69` / `edcdec0` / `79db20a` / `d74409b` / `8e52c3f` / `2106b4d` / `9afe714` |
| 既存テスト維持 | ✅ 2820 pass / 0 fail |
| Suite ⑦ / ⑧ 維持 | ✅ D-1・D-3 でメトホルミン単剤 1 位、D-2 でピオグリタゾン単剤 1 位を実測 |
| multi-drug 維持 | ✅ 20 PASS / 0 FAIL |
| 新規 audit が機能 | ✅ `npm run audit` 4 系統・35 module PASS。self-test で 4 FAIL / 1 CHECK の発火を確認 |
| Runtime 検証 | ✅ REGRESSION 0（`6df37cc`。詳細は Architecture record §13.7） |

**Deferred の最終分類**

| 分類 | 件数 | 内訳 |
|---|---|---|
| **RESOLVED** | 4 | D-2 / D-3 / D-4（correctness）/ heparinoid handlingTags |
| **TRANSFERRED_TO_U6** | 2 | D-1 の操作性 / U-6 本体（`denotation: 'module'` へ到達する 20 module の unresolved 停止） |
| **TRANSFERRED_TO_Q_UX1** | 3 | D-4 の prefix `い` 表示枠脱落 / F-S3-1 / U-6 実施時の `limit=8` 干渉 |
| **CLEANUP_FINDING** | 4 | F-RAPID-1 / F-EXP-1 / AddonPanel raw placeholder / untracked 参照文書 |
| **REMAINING_QS2** | **0** | — |

**heparinoid handlingTags の最終判断（Owner Decision #4 の結論）**

`derm_heparinoid_moisturizer_ointment` の generic group 内不均質について、**データ修正は不要**と確定した。
脱落する 4 タグ（`ointment` / `ointment_application` / `oily_cream` / `cream_application`）は剤形固有であり、
交差集合に残る 6 タグは両剤形に等しく妥当な外用薬指導である。当該 module には
`requiredTags` / `scenarioRequiredTags` が **1 件も存在しない**ため runtime 上の作用もない。
剤形固有の指導が必要な場合は brand を直接選択すれば `denotation: 'brand'` として取得できる。
`genericKey` を分割する修正はむしろ一般名検索の到達性（DP-09）を損なうため行わない。
将来これらのタグが gate に使われた場合は U-7 の `GENERIC_GATE_TAG_DROPPED`（CHECK）が自動検出する。

**U-6 の位置づけ**

U-6（class-level query の generic group 展開）は **Q-S2 correctness 完了の必須条件ではない**。
`denotation: 'module'` へ到達する 20 module（いずれも brand 複数・generic group 複数）では
U-5 gate により誤った主語生成が構造的に阻止されており、correctness は達成済みである。
U-6 は「候補は選べるが SOAP を作れない」行き止まりを解消する**検索 UX 改善**として、
Q-S2 とは独立に実施を判断する。

**cleanup Finding は Q-S2 の blocker ではない**

F-RAPID-1（Rapid の式形。挙動差 0 件を実測）/ F-EXP-1（Express の `brandNames[0]` fallback。
現データ 43/43 で到達不能）/ AddonPanel の raw placeholder ラベル / untracked 参照文書 は、
いずれも BrandResolution の correctness / safety に影響しない。記録は `prompts/vNext/HANDOFF.md` §6 に置く。
特に **F-EXP-1 の validator gap**（`expressModes[].defaultBrandName` が `moduleValidator` の
必須フィールドでないため、将来の新規 module で fallback が再到達しうる）は、
**別 Unit（cleanup / validator hardening）として切り出す**（Owner Decision OD-U8-1）。
本 closure にコード変更は含めない。

**本項目の保持方針**: Q-S2 は削除せず **CLOSED として索引・本文を保持する**（Owner Decision OD-U8-2）。
索引欄の旧記載「実装完了時に本項目を移管・削除する」はこの方針へ更新済みである。

---

## Q-UX1: short-prefix時のlimit内候補配分・ranking

**論点**
`getDrugSuggestions()` の候補数上限（`limit=8`）に対し、short-prefix クエリでは direct／sibling bucket が上位を占有し、genericMode 側の他 module 候補が表示枠から脱落する場合がある（F-S3-1）。

Q-S1・Q-S2 が「クエリに対して意味的に正しい module／brand へ到達・確定できるか」（correctness／semantic resolution）を保証対象とするのに対し、本論点は「複数の正しい候補が存在する状況で、限られた表示枠内にどう優先順位をつけて見せるか」（ranking／presentation／UX）を保証対象とする。DP-09 の一般名検索到達性原則には違反しない（到達性そのものは損なわれていない）。両者は責務が異なるため統合しない。

**Q-S3 との違い（2026-09 追記）**
本論点は「表示枠 8 件のうち、どの bucket にどれだけ配分するか」という**枠配分**を扱う。Q-S3 は「1〜2文字クエリという特定の長さ帯において、同一 bucket 内の順位そのものが安定しているか」という**帯別の順位安定性**を扱い、対象範囲が異なる（Q-S3 は `OD-DRUG-PREFIX-BOUNDARY-1` が定める長さ帯の話であり、bucket 配分の話ではない）。両者を混同しないこと。

**現状**
実測件数・具体的な脱落 prefix の一覧は `docs/reviews/BRAND_RESOLUTION_SAFETY_FINDINGS_2026-08-09.md` を参照（時点付きのため本節では保持しない）。完全な一般名検索では脱落が発生しないことは確認済みで、事象は short-prefix 検索に限定される。

**選択肢**

**選択肢A: limitを引き上げる**
- メリット: 実装が単純
- デメリット: UI上の候補リストが長くなり、視認性が下がる

**選択肢B: bucket別の最低保証件数を設ける**
- メリット: genericMode側の候補が完全に消えることを防げる
- デメリット: bucket構成・スコアリングロジックの変更が必要

**選択肢C: 現状維持（ranking/UX品質issueとして記録のみ）**
- メリット: 変更不要
- デメリット: 短いprefix検索での体験は改善されないまま残る

**推奨判断タイミング**
Runtime確認・実機横断確認（`docs/IMPLEMENTATION_CHECKLIST.md`）でこの脱落がユーザー体験上の実害として確認された時点。

**現時点の扱い**
選択肢C（現状維持）。DP-09違反ではなくranking/UX品質issueとして記録し、Deferredのまま維持する。

---

## Q-S3: 1〜2文字 bare 薬剤名クエリの順位安定性最適化

**論点**
`docs/DESIGN_PRINCIPLES.md` DP-18 の 2026-09 追補（Owner Decision OD-DRUG-PREFIX-BOUNDARY-1）は、bare な薬剤名クエリ（単一トークン、secondary clinical token を伴わないもの）のうち正規化長 1〜2 文字の帯を best-effort（順位安定性を保証しない）として明示的に切り分けた。本論点は、その best-effort 帯の順位を将来どこまで最適化するか（あるいはしないか）を追跡する。

**Q-UX1 との違い（本節を新設した理由）**
Q-UX1 は `limit=8` の**表示枠配分**（bucket 別最低保証の要否）を扱う。本論点は表示枠配分とは独立に、**1〜2文字という長さ帯そのものにおける同一クエリの順位安定性**（例: G5 の `gateFloor` が 3 文字未満で 5 のまま据え置かれることの副作用で、2文字クエリの並びがデータ追加のたびに変動しうること）を扱う。両者は原因も対象も異なるため統合しない。混同を避けるため、以後どちらかの論点を扱う操作者は両節を必ず併読すること。

**現状**
2026-09 の G5／曖昧性ガード実装（`lib/search.ts` の `gateFloor`）により、3文字以上の bare クエリは意味的ファミリー順序（F1/F2/D1/D2/D3）が発動し順位が安定する。1〜2文字クエリは `gateFloor=5` のまま据え置かれており、意味的ファミリー順序が発動しない場合がある。これは `tests/search.test.ts` の凍結テーブル（「お」等の1文字クエリ）と `tests/searchG5PrefixGate.test.ts` G5-B が回帰対象として固定している既知の挙動であり、correctness／到達性の欠陥ではない（DP-09 は満たされている）。

**推奨判断タイミング**
薬剤データ（module・brand・alias）が大幅に増え、1〜2文字クエリでの体感順位不安定さが実務上の支障として確認された時点。

**現時点の扱い**
現状維持（Deferred）。OD-DRUG-PREFIX-BOUNDARY-1 によりこの帯は best-effort として設計上確定しているため、correctness blocker としては扱わない。

---

## Q-R1: 剤形／投与経路／部位 intent アーキテクチャ

**論点**
現状、剤形・投与経路・部位の intent 解決は `formulationSearchTokens`（DP-05）や DP-18 の「剤形intentを含むクエリでのみ該当剤形の module を優先する」個別ロジック（`lib/search.ts` の `brandCatalogIngredientMap` による有効成分一致スコープ化）など、事例ごとに個別実装されている。複数剤形領域（点眼・軟膏・貼付・吸入等）が今後増えた場合、この個別対応を一般化した intent アーキテクチャとして再設計すべきかどうかは未検討である。

**現状**
本項目は 2026-09 検索ユニットの完了報告により新設された。具体的な選択肢の検討・実装コスト試算はまだ行っていない（本節はその検討を先取りして決定しない）。既存の個別事例は `docs/DESIGN_PRINCIPLES.md` DP-05・DP-18 を参照。

**重要な留意点（現在の「あれじ てん」「あれじ がん」の挙動について。2026-09 監査で確認）**
これらのクエリが現在期待どおりの候補を返すのは、剤形／部位を認識した意図的な metadata 挙動ではない。`formulationSearchTokens` を持つのは derm_heparinoid 系 4 module のみであり、H1点眼系にはこのフィールドが存在しない。「てん」「がん」は `scoreSecondaryToken()` の alias 部分一致（score 2。`alias.includes(q)`）という**フォールバック経路**でたまたま一致しているにすぎず、意図された剤形／部位ルーティングではない。本項目の一般化検討にあたっては、この現状挙動をそのまま設計として採用しない。

**前提条件（2026-09 監査で確認）: 検索トークンの bridge⇔JSON parity 未整備**
本項目に着手する時点で、`drug.search.commonSearchTokens` / `formulationSearchTokens` の bridge ⇔ canonical JSON 一致は**機械的に検証されていない**。PN2（`prompts/vNext/PN2-Drug-Header.md`）は bridge 記載値のみをそのまま転記する明示的コピー規則（推測生成禁止・順序保持・bridge 未記載は omit）を定めているが、その遵守を検証する parity 監査は存在しない。`lib/moduleValidator.ts` の `SEARCH_TOKEN_ALIAS_POLLUTION` はこれとは別物であり、alias 系フィールドへの JSON 内混入のみを検出する（bridge との一致は対象外。`prompts/RULES.md` §4 が「監査未整備」と明記済み）。現在この 2 フィールドを持つのは derm_heparinoid 系 4 module のみで実測乖離は 0 件だが、剤形／経路／部位 intent を他領域へ一般化する前に、または同時に、決定論的な parity 監査を追加する必要がある（監査は bridge の記載値と canonical JSON を機械的に突合するのみとし、臨床語彙の推論・正規化は行わない）。本項目は実装しない。将来ユニットの前提条件として記録するのみ。

**推奨判断タイミング**
点眼以外の複数剤形領域（例: 軟膏・貼付・吸入）が追加され、剤形横断クエリの個別対応が複数モジュールにまたがって積み上がった時点。

**現時点の扱い**
現状維持（Deferred）。既存の個別実装（DP-05／DP-18）は correctness を満たしており、一般化は緊急性を持たない。

---

## Q-R2: route-label 表示の一般化方針

**論点**
候補表示に剤形・投与経路の装飾ラベル（例:「オゼンピック注」の「注」）を付与する場合の一般化された命名規則が未整理である。`uiLabel`（`drugDisplayLabel` とは意図的に分離された表示専用チャネル。`lib/search.ts`）はそのための**器として利用可能**だが、**route／剤形の装飾は現時点で一切実装されていない**（2026-09 監査で確認。現行の `uiLabel` 合成はすべて「ブランド名（一般名）」または適応ラベル装飾であり、投与経路・剤形の装飾語を付与する経路は存在しない）。

**現状**
本項目は 2026-09 検索ユニットの完了報告により新設された。具体的な選択肢の検討は行っていない。`uiLabel` と `drugDisplayLabel`（{{drug_subject}} 解決用の意味的な値）を混在させない設計方針自体は既に確立しており（`lib/search.ts` のコメントを参照）、route-label を将来実装する際の器としては適切だが、実装そのものは未着手である。

**推奨判断タイミング**
複数剤形・複数投与経路を持つ module が増え、route-label の個別対応が積み上がった時点。

**現時点の扱い**
現状維持（Deferred）。表示品質issueであり、correctness blocker ではない。

---

## Q-R3: Phase 2-B display dedup（配合剤候補の表示順・家族単位対称性）

**論点**
配合剤候補の表示順・挿入位置の最適化、および家族単位（brand family）での完全な集合対称性は、`docs/DESIGN_PRINCIPLES.md` DP-20 が「適用しないこと（Phase 2として明示的に凍結）」として既に凍結範囲を定義済みである。commit history 上ではこの範囲を `Phase 2-B` と呼んでいる。本項目は、その凍結解除を将来いつ判断するかを本表からも追跡できるようにするための pointer である。

**現状**
凍結範囲の定義・用語対応（`Phase 2-B` / DP-21 の `SF-2A` 表記との関係）は DP-20 の 2026-09 追記が正本である。本節では選択肢を独自に列挙しない（DP-20 が既に凍結の理由と範囲を定めているため、ここでの重複記載は避ける）。

**推奨判断タイミング**
DP-20「適用しないこと」節が凍結する内容について、Owner が凍結解除（着手）を判断した時点。

**現時点の扱い**
現状維持（Deferred）。DP-20 の凍結を継続する。

---

## Q-RAPID1: Rapid transition taxonomy の6種化（Reference Model・検証中）

**論点**
現行 Rapid は前回との関係性（relation）5種（`new_addition` / `med_changed` / `dose_increased` / `dose_decreased` / `continued_do`）× 状態（condition）4種の組み合わせで S先頭文を生成する。Owner は、これを次の6系統へ整理する候補を検討している。

1. Do（継続）
2. 追加
3. 変更
4. 削除（前回の処方整理。DP-19 OD-RAPID-SCOPE-1 が意味境界を定義済み）
5. 増
6. 減

**現状**
本項目はまだ Repository 上の確定仕様ではない。Owner は、まず H1 ヒスタミン H1 受容体拮抗薬点眼（`allergy_h1_antihistamine_eye_drops`）を Reference Implementation として先行実装し、実際のアプリ上で

- 単一 node
- 複数 node 合成
- scenario 切替
- Rapid ON/OFF
- SOAP 全体の読みやすさ（第1文と第2文の距離感を含む）

を Human が操作・評価したうえで、他 module・他剤形への一般化可否を判断する方針である。この6系統・4状態という骨格候補、および sentence realization の具体的な実現方式（DP-12 OD-COMPLIANCE-REALIZATION-1 が触れる regimen-level / drug-specific の使い分けを含む）は、いずれも Reference Implementation による検証結果を踏まえて確定させる。

**関連原則**
- DP-19（Rapid 入力支援境界原則）・OD-RAPID-SCOPE-1 — 「削除」が中止操作ではないという意味境界は本項目に先行して確定済み。本項目が確定させるのはあくまで taxonomy の具体形（何種類のボタンを持つか）である
- DP-12・OD-COMPLIANCE-REALIZATION-1 — コンプライアンス評価単位と realization の使い分けの原則は確定済み。本項目が確定させるのは具体的な文言・実装方式である
- DP-13（段階的実装原則）・DP-16（実物評価前の仕様固定回避の原則）— 実物評価によって判断基準が得られるまで最終仕様を固定しないという既存の姿勢を、本項目の taxonomy 検証へ適用したもの

**Owner Decision（2026-09、OD-RAPID-H1-PILOT-1）: H1 Reference Implementation 実装可否**

> **[Historical / 一部 Superseded]** 本 Decision のうち「1. H1限定境界」節が課す条件（allowlist は H1点眼1 moduleのみ・検証期間中に対象moduleを追加しない）は、H1 pilot の Human Review 通過を受けて後続の **OD-RAPID-MULTI-PILOT-1**（本節末尾）により更新された。本 Decision 自体は改変せず、当時の判断記録としてそのまま保持する。現在有効な allowlist 境界・条件は OD-RAPID-MULTI-PILOT-1 を正とする。「2. H1内の適用範囲」「3. Do × stable = Default」の2点は変更なく現在も有効。

以下3点を Owner Decision として確定する。

**1. H1限定境界**

H1点眼 `allergy_h1_antihistamine_eye_drops` のみ、中央 allowlist によって Rapid v2 Reference Implementation 対象とする。

これは本項目（Q-RAPID1）の検証期間に限る期限付き例外である。旧体系 `prompts/P0-C.md` §17 PROHIBITED_APP_LOGIC「特定module専用分岐を作らない」に対する、prototype限定の例外として Owner が承認する。

条件:
- allowlist 対象は H1点眼 1 module のみ
- 検証期間中に対象 module を追加しない
- 本項目（Q-RAPID1）を CLOSE する前に Human Review する
- 他 module へ展開する場合は、全体標準化または canonical 化の要否を再判断する
- H1専用の分岐を各所へ散在させず、中央判定関数（allowlist を参照する単一の判定点）へ閉じ込める

**2. H1内の適用範囲**

H1点眼 module 内で Rapid を利用できる6 scenario（副作用なし系5 scenario + `cp_good`）すべてを v2 対象とする。scenario 単位で v1/v2 を混在させない。

scenario 切替時は既存どおり Rapid state を保持し（`nextRapidStateOnScenarioChange` の Rapid可→Rapid可の既存規則をそのまま適用）、scenario の評価単位に応じて drug-specific / regimen-level realization を決定論的に切り替える（DP-12 OD-COMPLIANCE-REALIZATION-1 が確定した評価単位の原則の適用）。

**3. Do × stable = Default**

許容する。Rapid は「押したら必ず本文が変わる機能」ではなく、前回→今回の semantic state を選択する機能である。`null` と `Do × stable` は意味上別状態として保持する。

Do × stable の生成文が Default S と同一であっても、Rapid state が non-null であり、そのstateに対応する文が適用されていれば正常とする。

したがって、「Rapid ON なら必ず S が Default と異なる」という test contract は本質要件とは扱わない。v2 では、「ON 後の S が選択 state に対応する期待文と一致する」ことを test contract とする。OFF 時に Default へ byte 単位で復元する既存契約は維持する。

**Status**

この3点を Owner Decision として確定したため、本項目（Q-RAPID1）の H1 Reference Implementation は実装へ進めてよい。

ただし、6 transition taxonomy そのものの全 module 一般化は引き続き Under Validation とし、H1 prototype の Human 評価後に判断する。

**推奨判断タイミング**
H1点眼 Reference Implementation に対する Human 評価（上記5観点）が完了した時（6系統taxonomyの全module一般化の可否について）。

**現時点の扱い**
H1 Reference Implementation の実装可否は OD-RAPID-H1-PILOT-1 により確定し、実装へ進めてよい。ただし6系統 taxonomy の全module一般化は引き続き検証中（Under Validation）であり、本 Decision はそれを確定するものではない。**（2026-09-14現在: 「H1点眼以外の module」という記述は OD-RAPID-MULTI-PILOT-1 により pilot allowlist 自体が3 moduleへ拡張されたため、当時の記述として保持する。現在の非対象module範囲は OD-RAPID-MULTI-PILOT-1 を参照。）**

---

**Owner Decision（2026-09、OD-RAPID-MULTI-PILOT-1）: 限定 multi-module pilot（3 module）への拡張**

OD-RAPID-H1-PILOT-1 の「1. H1限定境界」で確定した H1点眼1 module限定の allowlist を、H1 pilot の Human Review 通過を受けて次の3 module限定へ拡張する。以下を Owner Decision として確定する。

**A. Under Validationの継続**

Rapid v2（6 transition taxonomy）は、本 Decision 後も引き続き **Under Validation** である。3 module pilotの通過は、taxonomy そのものの最終確定を意味しない。

**B. Pilot allowlistの拡張**

Rapid v2 pilot対象 allowlistは、現時点で次の3 module限定とする。

1. `allergy_h1_antihistamine_eye_drops`（点眼。H1 Reference Implementation）
2. `dm_dpp4_oral`（内服。トラゼンタ等）
3. `dm_insulin_rapid_analog`（注射。ノボラピッド等）

allowlistは `lib/rapidV2.ts` の中央判定点（`RAPID_V2_MODULE_IDS`）へ引き続き閉じ込める。H1専用/module専用の分岐を各所へ散在させないというOD-RAPID-H1-PILOT-1の運用条件は、3 moduleへ拡張後も変更なく維持する。

**C. Global promotionではない**

本 Decisionは、Rapid v2を全moduleへ有効化する決定ではない。3 module限定 pilotの拡張であり、global rolloutの承認ではない。

**D. 4件目以降の追加は個別Owner判断を要する**

pilot期間中、上記3 module以外への allowlist追加は、本項目（Q-RAPID1）の再判断を経ない限り行わない。

**E. 非対象moduleでの既存Rapidの継続**

上記3 module以外の全moduleでは、既存の5 relation（`new_addition`/`med_changed`/`dose_increased`/`dose_decreased`/`continued_do`）× 4 condition taxonomy（legacy Rapid）がそのまま稼働を継続する。`display.adjustmentExpression` を含む既存挙動・既存 eligibility 判定は変更されない。

**F. 拡張の目的**

H1（点眼）で確立した Reference Modelが、剤形の異なる

- 点眼（ophthalmic）
- 内服（oral）
- 注射（injection）

の3剤形へ、semantic driftなく一般化できるかを検証することが本 pilot拡張の目的である。3 moduleは意図的にこの3剤形を代表するよう選定されている。

**G. Pilot限定の administration-verb realization**

> **[Historical / Superseded]** 本節の pilot 限定 moduleId→verb 対応表は、後続の **OD-RAPID-ROUTE-VERB-1**（本節末尾）により、既存 canonical `drug.route` から動詞を deterministic に解決する方式へ置き換えられた。本節は当時の判断記録として改変せず保持する。現在有効な動詞の解決規則は OD-RAPID-ROUTE-VERB-1 を正とする。

3 module pilotでは、Rapid v2のDo（`continued_do`）drug-specific realizationに限り、pilot限定の中央 administration-verb 対応表を用いる。現在の対応:

- `dm_dpp4_oral` → 服用
- 点眼（H1）・注射（rapid insulin） → 現行pilotの既定値

これは **pilot限定の realizationロジックであり、確定した投与経路（route）アーキテクチャではない**。canonical JSONへ新規route fieldは追加していない。bridgeのroute migrationも行っていない。将来の剤形横断アーキテクチャ（Q-R1 剤形／投与経路intent アーキテクチャを含む）を本項目が先取りして解決するものではない。

**H. `regimen_reduced`の意味論（再確認・変更なし）**

`regimen_reduced`（前回、処方整理）の意味論は DP-19 OD-RAPID-SCOPE-1 が確定済みであり、3 module pilotへの拡張によっても変更しない。

`regimen_reduced` は「現在表示中の薬剤が中止された」ことを意味しない。「前回の処方変更時点で処方全体が整理され、今回はその後の患者の臨床状態を評価している」ことを意味する。削除された薬剤の識別情報は意図的に保持・推測しない。

3 module pilotでの承認済み基本文言（drug-specific / regimen-level 双方で薬剤名を含まない）:

- 前回の処方整理後も症状は落ち着いている。
- 前回の処方整理後も症状は変わりない。
- 前回の処方整理後、症状は良くなってきた。
- 前回の処方整理後も症状の改善は乏しい。

module固有の臨床内容へ展開すること（例: 剤形別に異なる意味論を持たせること）は本 Decisionの範囲外であり、行っていない。

**I. Severity gateの継続**

3 module pilotは、既存の Rapid eligibility 判定（`isScenarioSReplacementCapable`。severity分岐のある副作用scenarioを構造的にnon-capableとするgateを含む）にそのまま依拠する。本拡張により severity専用の新規ロジックは追加していない。全scenarioがRapid v2対象になるわけではない点は変更なく維持する。

**J. H1 Reference Modelの位置づけ**

H1点眼は引き続き Rapid v2の最初のReference Modelである。内服・注射は、このReference Modelが剤形横断で一般化するかを検証するために追加された。H1の既存semantics（6 transition順・4 outcome・Do×stable=Default・OFF byte復元・scenario/register切替契約）は、内服・注射への拡張のために弱められていない。本pilotはアーキテクチャの一般化可否を検証するものであり、H1 Reference Model自体を再設計するものではない。

**K. Global promotionは未解決のまま**

3 module pilotの通過は、以下のいずれも許可しない。

- 全moduleでのRapid v2有効化
- legacy Rapid（5 relation × 4 condition）の削除
- 全module `adjustmentExpression` のmigration
- グローバルなroute/剤形アーキテクチャの導入
- Persona設計への変更
- persistence設計への変更

Rapid v2taxonomyの全module一般化（Q-RAPID1本体の論点）は、引き続き **Under Validation / Owner判断待ち** のままとする。本 Decisionはこれを解決しない。

---

**Owner Decision（2026-09、OD-RAPID-ROUTE-VERB-1）: Do realization の動詞を canonical `drug.route` から解決する**

Rapid v2 の Do（`continued_do`）realization に使用する administration verb は、既存 canonical `drug.route` から deterministic に解決する。

現在の Rapid v2 pilot では次のとおりとする。

- `oral` → `服用`
- それ以外の現在サポート対象 route → `使用`

この route-derived verb は、drug-specific register・regimen-level register の両方に適用する。

- 新しい `administrationVerb` field は追加しない
- canonical / bridge schema は変更しない
- route metadata architecture の再設計は行わない

本 Decision は、OD-RAPID-MULTI-PILOT-1 §G にある pilot 限定 moduleId→verb 対応を置き換える（§G は Historical / Superseded として保持する）。

**OD-RAPID-MULTI-PILOT-1 §K との関係**: §K の「グローバルな route / 剤形アーキテクチャを導入しない」契約は維持する。本 Decision の `drug.route` 利用は、既存 canonical field を Rapid v2 pilot の realization に deterministic に利用するだけであり、新しい global route architecture の導入とは扱わない。

---

**Owner Decision（2026-09、OD-RAPID-COMPOSITION-1）: Rapid v2 multi-node S composition**

Rapid v2 S composition について以下を採用する。

1. Rapid v2 block は text-derived reason / observation / decision / other bucketing に参加させない。
2. 同一 clinicalDomain 内では、Rapid v2 block は stable node order を保持する。
3. 同一 domain に Rapid v2 と non-Rapid が混在する場合、non-Rapid block を既存 contract どおり先に realize し、その後に Rapid v2 block を stable node order で realize する。
4. non-Rapid の既存 bucketing contract は変更しない。
5. legacy Rapid v1 は今回変更しない。
6. regimen-level Rapid 第1文を共有できるのは、次がすべて一致する場合だけとする。
   - same clinicalDomain
   - same groupKey
   - same transition
   - same outcome
   - regimen-level realization
7. drug-specific Rapid sentence は、文面が同一でも node-specific のままとし共有しない。
8. shared regimen sentence が非連続 node に存在しても、node を移動して隣接させない。stable node order を優先し、最初の shared sentence だけを出力し、後続 node では shared 第1文だけを抑制する。
9. 各 node の remainder / addon は、その node の stable position に保持する。
10. shared regimen context 内で remainder も完全一致する場合に限り、remainder を1回だけ realize してよい。これは regimen-level semantic sharing 内部だけの限定 rule であり、generic S line dedupe へ一般化しない。
11. 既存の non-Rapid / generic full-block exact dedupe は今回変更しない。
12. transition taxonomy / outcome taxonomy / RapidState / eligibility / canonical JSON / bridge / O・A・P / scenario medical content は変更しない。

**Unit 付随判断（Unit「Rapid v2 composition + realization hardening」に限定）**

- **`rapidV2Register` の付与範囲**: composition 用の scenario register snapshot（`MergedBlock.rapidV2Register`）は、Rapid v2 pilot module かつ Rapid-capable scenario の block にだけ付与する。Rapid を使用できない scenario に将来用 metadata を持たせない。
- **Decision grouping fallback safety の後継 contract**: 旧 source contract「`lib/buildSoap.ts` 全体に Rapid 参照が無い」（`tests/decisionFallbackSafety.test.ts` B4）は本 Decision と両立しないため、元の安全意図を保存する後継 contract へ置き換える。後継 contract は、legacy / non-Rapid の `buildNarrativeS`（decision fallback 経路を含む）を Rapid-aware にしないこと、decision fallback 経路に Rapid-specific な条件分岐を入れないこと、非 Rapid / legacy v1 の既存出力契約を維持することを検証する。Rapid v2 realization を `lib/buildSoap.ts` の外へ移す必要はなく、composition layer に置いてよい。
- **Unit 3A parity contract**: `tests/nodeSnapshotUnit3A.test.ts` T-3A の oracle は、上記 `rapidV2Register` の追加だけを明示的な許容差分とする後継 contract へ更新する。非 Rapid-v2 / 非 capable 経路は従来 output と完全一致とし、それ以外の field 差分は 0 とする。
- **`RAPID_CAPABLE_S_CONTRACT` validator の scope**: 対象は Rapid v2 pilot allowlist 内の Rapid-capable scenario に限定し、corpus 全体へは有効化しない。2026-09-14 の実測では全 35 module の Rapid-capable 170 scenario（うち pilot 3 module 内は 15 scenario）で契約違反 0 件であったが、これは将来の global promotion 判断の evidence として記録するにとどめ、runtime / validator contract を今 global 化する根拠にはしない。validator scope は Rapid v2 の global promotion 判断時に改めて判断する。

**Known UX observation（2026-09-14。Unit「Rapid v2 composition + realization hardening」の Human UI確認〔port 3100〕で観測。ソースコード上の contract ではなく UI 上の観察記録であり、Rapid v2 の global promotion 判断とは独立に扱う）**

3 module pilot の Human UI 確認で、以下 2 点を UX 観察として記録する。**いずれも現時点では blocker ではない。** 一方は OD-RAPID-COMPOSITION-1 が確定した挙動どおりの表示上の帰結、もう一方は pilot 対象が 3 module に限定されていることに起因する可能性があり、いずれも実運用開始後に実害の有無を見てから再評価する。

**UX-1: Rapid 未選択 node が一時的に前へ出る表示上のズレ**

node bar 上では A→B の順で node が並んでいても、A が Rapid v2 選択済み・B が Rapid 未選択の間は、OD-RAPID-COMPOSITION-1 の 3（non-Rapid block を先に realize し、その後に Rapid v2 block を stable node order で realize する）により、S 欄では一時的に B→A の順に見えることがある。B で Rapid を選択すると stable node order に戻る。

現時点では OD-RAPID-COMPOSITION-1 が確定した挙動どおりであり、regression ではない。実運用開始後に、この一時的な表示順ズレが認知負荷や違和感として実害になるかを見てから、対応の要否・優先度を判断する。

**UX-2: 同一 module 複数追加時の node chip 識別性**

同じ module を compose へ複数回追加すると、node chip の表示ラベルが同一になり、位置と編集中マーク以外では見分けにくい。

現状は pilot 対象が 3 module に限定されており、Human 確認で同一 module を重ねて検証した際に目立った可能性がある。実運用での同一 module 複数追加の頻度と、実際の識別困難さの実害を見てから、対応の要否・優先度を判断する。

**Status**

いずれも今回 Unit の scope 外であり blocker ではない。speculative な解決策・優先度・実装時期は未確定のまま記録するにとどめる。Rapid v2 の global promotion 判断とは切り離して扱う。

---

**Owner Decision（2026-09-15、OD-RAPID-READINESS-1）: Rapid v2 global promotion readiness review 由来の決定**

Unit「Rapid v2 global promotion readiness review」（HEAD `428d754` 時点の Repository 実測に基づくレビュー）の結果、Owner は **global promotion を現時点では行わず、追加 pilot を1回挟む**方針とし、以下を確定する。**本 Decision は global promotion の承認ではない。** OD-RAPID-MULTI-PILOT-1 §K の未許可事項はすべて維持し、Rapid v2 は引き続き Under Validation である。

**1. clinical subject generalization は PENDING**

- 現行 Rapid v2 の realization は、**現在の bridge authored 表現を基準とする**。2026-09-15 の実測では、全 module の Rapid-capable scenario の authored S 第1文はすべて bridge 本文として「〜して症状は落ち着いている。」であり、「症状」以外の評価 subject を持つ Rapid-capable scenario は Repository に存在しない
- 血糖・HbA1c・眼圧・血圧等を想定した clinical subject architecture は、現時点では設計しない。**clinical subject generalization は未決定（PENDING）**であり、global promotion readiness の blocker として仮想的に設計しない
- **単純な名詞置換（「症状」を別の語へ機械的に差し替える等）による一般化は行わない**
- 追加 pilot（下記 3）に cardiorenal 等を含めても、「症状 → 血圧」等の subject 切替の検証とは扱わない
- **再開 Trigger**: Rapid-capable scenario で authored / canonical S の評価 subject が「症状」以外である module が初めて Repository に実装された時点。その時点で、**別 Unit として Human Review を含む clinical-subject realization の設計レビューを必須とする**。レビューは bridge を医療内容の SSOT とし（DP-07）、実際の文面を Human Review して realization を決める（Owner 見込み: 今後作成予定の緑内障領域で bridge / canonical 側が「眼圧は〜」となる可能性があり、最初の実例になりうる。着手領域そのものは Q-E E-7 の別判断であり、本項は領域を決定しない）
- **Owner 確認（2026-09-16）**: 上記の PENDING を、次のとおり明文の許容条件として確定する。**bridge authored 表現が「症状」を評価対象としている間は、現行 Rapid v2 表現を許容する。**bridge 表現自体が「症状」以外の評価 subject へ変わった時点で、上記の再開 Trigger に従いclinical subject realization を再検討する（単純な名詞置換は採用しない）。**本 PENDING は、現在の pilot（OD-RAPID-MULTI-PILOT-1 / 本 Decision §3）のglobal promotion 判断の blocker ではない。**根拠: 追加 pilot `cardiorenal_sglt2_oral`（心不全・腎疾患領域）の Human Review により、糖尿病以外の clinicalDomain でも現行 bridge の「症状」表現がそのまま実務上許容されることを確認した（下記 §3 Human Review 結果）。**この確認は将来の clinical subject generalization を承認する判断ではない。**

**2. future-subject tripwire（B1 採用・B2 保留・B3 不採用）**

- **B1（採用）**: v1 / v2 に関係なく、Rapid-capable scenario（`isScenarioSReplacementCapable`）の authored S 第1文が現在承認されている契約から外れた場合に `npm test` を停止させる tripwire test を置く（`tests/rapidCapableSubjectTripwire.test.ts`）
  - 現在承認されている契約: authored S の1行目 =「〈主語〉を〈動詞〉して症状は落ち着いている。」（主語: regimen register は「薬」、drug register は `{{drug_subject}}`〔DP-12 OD-COMPLIANCE-REALIZATION-1〕。動詞: canonical `drug.route` 由来〔OD-RAPID-ROUTE-VERB-1〕）。`RAPID_CAPABLE_S_CONTRACT` の第1文条件と同一の形である
  - **目的**: eligibility は S 本文を参照せず、Rapid の第1文置換は v1 / v2 とも主語を参照しない（2026-09-15 実測）。そのため将来「眼圧」「血圧」「HbA1c」等の新しい subject を持つ Rapid-capable scenario が追加されると、既存 Rapid が無言で適用されうる。tripwire はこれを検出し、上記 1 の再レビューへ必ず戻すための **review trigger** である
  - **現在の文型を永久仕様として固定する test ではない。** 未知の semantic form を検出するためのものであり、検出時に test の期待値・bridge・canonical を合わせて通過させてはならない。上記 1 の設計レビューを経て Owner が契約を改訂した場合に限り、同一作業内で本 test の承認済み契約を更新する
  - 新規 module 追加時は `prompts/PROJECT_CONTEXT.md` の Module Expansion guardrail #1（各 module 完了時の `npm test`）を通じて発火する
- **B2（保留）**: `RAPID_CAPABLE_S_CONTRACT` validator の global 化は行わない。validator scope は OD-RAPID-COMPOSITION-1 の Unit 付随判断のとおり pilot allowlist 内に限定したまま維持し、global promotion 時に runtime scope と同期して判断する
- **B3（不採用）**: runtime guard は採用しない。eligibility / runtime behavior は変更しない
- **Module Expansion = GO #4 との関係**: `prompts/PROJECT_CONTEXT.md`「③ Module Expansion = GO について」#4 は、Module Expansion 中は既存の generation / audit / validation pipeline（tests を含む）を変更せず維持することを定める。本 tripwire の追加は Module Expansion の作業ではなく、**Rapid v2 global promotion readiness の独立 Unit として Owner 承認の上で行うもの**であり、#4 と矛盾しない（検索ユニットを Module Expansion スコープの外側として扱った整理と同じ）。本 test は既存 module の生成・監査手順（PN1〜PN8・AUTORUN・validator・audit）を変更しない

**3. 追加 pilot（3 module）の承認**

OD-RAPID-MULTI-PILOT-1 §D（pilot 期間中の allowlist 追加は本項目の再判断を要する）に基づく再判断として、次の3 module を追加 pilot 対象として承認する。**本 Decision の時点では allowlist（`lib/rapidV2.ts` の `RAPID_V2_MODULE_IDS`）への追加は実装しない。** 実装されるまでは OD-RAPID-MULTI-PILOT-1 §B の3 module allowlist が現行値である。

| module | route / clinicalDomain | 評価軸 |
|---|---|---|
| `derm_heparinoid_moisturizer_ointment` | topical / dermatology | `display.adjustmentExpression`（使用回数が増えた／減った）を Rapid v2 の増量／減量へ抽象化することが実務上自然か |
| `cardiorenal_sglt2_oral` | oral / cardiorenal | 現在 bridge に存在する「症状」表現のまま Rapid v2 を使用した場合、実務上許容できるか。**clinical subject generalization の検証とは扱わない**（上記 1） |
| `dm_dpp4_biguanide_combination_oral` | oral / diabetes | 配合剤名を drug-specific 主語として使うこと、配合剤での追加／変更／増量表現が自然か |

- あわせて、既存 pilot の `dm_dpp4_oral`（トラゼンタ）cp_good ＋ `dm_insulin_rapid_analog`（ノボラピッド）cp_good により、oral / injection 混在時の regimen-level 表現（服用／使用）を Human 確認する（allowlist 追加を要しない）。なお、この組合せでは Rapid OFF の時点で既に「薬を服用して…」「薬を使用して…」の2行が併存する（既存の非 Rapid 合成挙動。2026-09-15 実測）
- `derm_heparinoid_moisturizer_*` 4 module は Rapid-capable scenario の authored S が同一である（2026-09-15 実測）ため、軟膏1 module を代表とする

**実装状況（2026-09-16・Owner 承認済み）**

上記3 module を `lib/rapidV2.ts` の `RAPID_V2_MODULE_IDS` へ追加し、pilot allowlist は **exact 6 module** となった（既存3 ＋ 追加3）。production の変更は同 allowlist（および直上のコメント）のみであり、eligibility / composition / route verb / RapidState / canonical / bridge / `display.adjustmentExpression` の値は変更していない。validator（`RAPID_CAPABLE_S_CONTRACT`）は allowlist へ追従するだけで、global 化していない（B2 は上記 2 のとおり保留）。

- allowlist の exact set 契約: `tests/rapidV2MultiModulePilot.test.ts` A ／ `tests/rapidV2H1Pilot.test.ts` D（**件数だけでなく Owner 承認済み集合との完全一致**を固定し、件数合わせの別 module 混入も FAIL させる）
- 追加3 module 側の契約: `tests/rapidV2AdditionalPilot.test.ts`（drug-specific 24文・regimen 24文・topical の使用回数表現が v2 に出ないこと・残余 byte 保持・OFF byte 復元・severity gate・cross-domain / 同一 domain の合成・非 pilot module が v1 realization と一致し続けること）
- 実測（2026-09-16）: 追加3 module の Rapid-capable scenario は 外用5 / 心腎4 / 配合剤8。非 pilot module の 2,760 組合せで v1 realization と差分 0 件。`RAPID_CAPABLE_S_CONTRACT` は corpus 全 module で 0 件
- **Human Review（file:// 静的配布版。上記 4 の不足観点と §3 の評価軸）は完了した（2026-09-17）。** FAC-10 は下記 5 のとおり原定義に対する gap が残るため、本 Human Review をもって FAC-10 が完了したとは扱わない。**commit / push は本 Decision の記録後も Owner の明示指示があるまで行わない。**

**Human Review 結果（2026-09-17・file:// 静的配布版。`428d754` を base とした未commit 6-module pilot static build。`commit 428d754 そのものの配布物`ではない）**

| module / 観点 | 結果 |
|---|---|
| `cardiorenal_sglt2_oral`（心腎） | 実施済み（2026-09-16）。現行 bridge の「症状」表現のまま Rapid v2 を使用しても実務上ほぼ違和感なく許容できる、と Human が判断した。**この結果は将来の clinical subject generalization を承認する判断ではない**（上記 1 参照）。§3 の評価軸「clinical subject generalization の検証とは扱わない」の条件どおり実施した |
| `derm_heparinoid_moisturizer_ointment`（外用） | 実施済み。「使用回数が増えた／減った」から Rapid v2 の「増量／減量」への抽象化を許容。remainder との接続も問題なし。blocker なし |
| `dm_dpp4_biguanide_combination_oral`（配合剤） | 実施済み。配合剤名を drug-specific 主語として使う表現、追加／変更／増量表現を許容。blocker なし |
| mixed-route cp_good（トラゼンタ + ノボラピッド） | 実施済み。「薬を服用して…」「薬を使用して…」の併存より共通表現へまとまる方が見た目は良いという Human 観察を得た。**Owner 判断: 現時点では runtime を変更しない**（下記 9）。blocker ではなく将来の composition cleanup 候補として記録する |
| composition 境界（cross-domain 非共有 / 同一 domain 共有） | 実施済み。異 domain では同一文が重複する場合があり、同一 domain では semantic sharing されることを確認した（OD-RAPID-COMPOSITION-1 が確定した挙動どおり）。**Owner 判断: cross-domain 側の重複は多少気になるが、現在の安全側の domain 境界を崩してまで今すぐ最適化する必要はない**（下記 10）。blocker ではない |
| 上記 4 の4観点（scenario切替・OFF復帰・SOAP可読性・剤形横断） | 実施済み（下記 4 参照） |
| FAC-10 | 部分実施。原定義の再開 Trigger（Windows company PC 相当環境）とは別に、今回の build 上での機能確認を補足観察として記録するにとどめる（下記 5） |

6-module pilot の Human Review はこれをもって完了した。global promotion の可否・pilot の close 判定は下記 8・11 を参照。

**4. 既存3 module pilot の Human 評価**

- 3 module pilot を最初からやり直さない。Unit「Rapid v2 composition + realization hardening」の Human UI 確認（port 3100）で既に確認した内容を再利用する
- 2026-09-15 時点で Repository に記録として存在したのは、H1 pilot の「Human Review 通過」（OD-RAPID-MULTI-PILOT-1）、および 3 module pilot の multi-node 合成に関する観察（上記 Known UX observation UX-1 / UX-2、`tests/rapidV2CompositionUnit.test.ts` A「Human 観察ケース」）のみであった
- 不足していた次の4点は、追加 pilot の Human Review（2026-09-17・file:// 静的配布版）で補完し、**最終的な Human 評価結果を本項目へ記録する**:
  - **scenario 切替**: Rapid-capable scenario 間の切替を実機確認。state の保持または reset は既存契約どおりで、S 全文が自然であることを確認した
  - **Rapid OFF 復帰**: Rapid 選択後に OFF へ戻す操作を実機確認。Default S へ byte-equivalent に戻り、UI 上も違和感がないことを確認した
  - **SOAP 全体としての読みやすさ**: S だけでなく O/A/P を含めた全体表示を確認。Rapid 文が他 section と不自然につながる事象は確認されなかった
  - **剤形をまたいだ意味の自然さ**: H1点眼・DPP-4内服・rapid insulin・外用（derm 軟膏）を見比べ、Rapid の意味が剤形をまたいでも自然に理解できることを確認した
- 既知の UX-1（Rapid未選択nodeが一時的に前へ出る表示ズレ）・UX-2（同一module複数追加時のnode chip識別性）は、今回の Human Review でも改めて blocker ではないことを確認した（deferred のまま維持する）

**5. FAC-10（file:// での Rapid / ADDON 動作）**

- FAC-10 は global promotion の設計判断そのものの blocker にはしない
- ただし、**global promotion 後の Rapid v2 を業務用配布（Static / Local First の file:// 配布物）へ出す前の必須条件**とする
- file:// で問題が見つかった場合は、global promotion とは分けて release / deployment issue として扱う
- FAC-10 の追跡の正本は引き続き `prompts/vNext/HANDOFF.md` §6

**2026-09-17 追記（今回 Human Review との照合）**: FAC-10 の元定義（`prompts/vNext/HANDOFF.md` §6）は「次回 Owner が同一の Windows company PC（または同等の制約環境）で file:// artifact に触れる機会があった時点」を再開 Trigger とする。今回の Human Review は次の点で元定義の条件を満たさない。

- **環境**: 今回の確認環境が Windows company PC、または Owner がそれと同等の制約環境として明示した環境であるという記録が本 Decision にはない
- **build の同一性**: 確認した build は `428d754` を base とした**未commit 6-module pilot static build**であり、`commit 428d754 そのものの配布物`ではない。FAC-10 が本来追跡するのは release 相当 build の file:// 動作である

したがって、**本 Human Review をもって FAC-10 を PASS へ変更しない。** 一方、今回確認できた事実（Rapid v2 UI 表示・Rapid 選択による SOAP 更新・scenario 操作・multi-node・ADDON・S/O/A/P 表示が、上記 build 上で file:// 起動から動作し、実機操作中に明確な runtime 異常は観察されず、DevTools Console で確認した範囲に赤い error はなかった）は、上記の build・環境の限定付きで補足観察として記録する。FAC-10 本体のステータスは `prompts/vNext/HANDOFF.md` §6 の記録（NOT YET VERIFIED のまま）を正本とし、本節では重複させない。

**6. chemical mediator 点眼の追加 pilot 除外**

- `allergy_chemical_mediator_release_inhibitor_eye_drops` は、現在の module を再構築する予定（Owner）のため、今回の Rapid 追加 pilot から除外する
- **永久除外ではない。** module 再構築後に、その時点の bridge / canonical を基準に Rapid v2 の適用を改めて判断する
- 点眼剤形は H1 点眼（Reference Implementation）で検証済みであり、本除外によって追加 pilot が検証する意味軸は減らない
- 本判断は 2026-09-15 以前の Repository には記録されていなかったため、本 Decision で記録する

**7. clinicalDomain 値の揺れ（別 Finding）**

- `composition.clinicalDomain` 等の `diabetes` / `diabetes_mellitus` の値の揺れは、Rapid 本体とは別 Finding として扱う（実測・runtime 影響は `prompts/vNext/HANDOFF.md` §6）
- 今回の Rapid pilot 実装と一緒に修正しない。推測で修正しない
- clinicalDomain の差によって S merge 結果が変わることが Repository 実測で確認されているため、**global promotion 前に**、意図的な domain 分離か data / schema 生成上の不整合かを別 Unit で確定する
- **解消（2026-09-17・Unit A「diabetes domain metadata consistency」）**: 意図的な domain 分離ではなく、module 作成時（commit `e650858`）の施行済み PN2 生成規則からの逸脱と確定し、対象 2 module の domain metadata を `diabetes` へ整合した。root cause・before / after・runtime 影響・scope 外事項、および同調査で観測した `dm_insulin_mixed_rapid_long` の mergePolicy 旧 schema drift（別 Finding・blocker ではない）は `prompts/vNext/HANDOFF.md` §6 を正本とする

**8. global promotion 判断との関係（本 Decision が定めた前提）**

本 Decision は、global promotion 判断へ進む前提として次を定める。

1. 上記 4 の Human 評価結果が本項目へ明示記録されていること — **充足済み（2026-09-17）**
2. 上記 3 の追加 pilot の Human 評価結果が本項目へ記録されていること — **充足済み（2026-09-17）**
3. 上記 7 の clinicalDomain Finding が別 Unit で確定していること — **充足済み（2026-09-17・Unit A。上記 7 参照）**
4. validator scope（B2）を global promotion 時に runtime scope と同期して判断すること — **未実施**

加えて、上記 5 の FAC-10 は業務用配布前の必須条件（release 条件）である。**本節は global promotion の承認でも条件の網羅でもない。** legacy Rapid v1 の扱い・allowlist の判定単位・`display.adjustmentExpression` の runtime 参照先等は、OD-RAPID-MULTI-PILOT-1 §K のとおり未解決のまま残る。

**9. mixed-route composition realization（Known observation・deferred。2026-09-17）**

- Human Review（トラゼンタ cp_good ＋ ノボラピッド cp_good）により、mixed-route（oral / injection 混在）の cp_good で「薬を服用して…」「薬を使用して…」が併存するより、共通表現へまとまる方が見た目は良いという観察を得た
- **Owner 判断**: cp_good を複数 node で同時に呼び出す運用自体を基本想定していない（通常は1つの cp_good を使用し、他 node では別 scenario を使う）。したがって**現時点では runtime を変更しない**。oral 単剤の「服用」・非oral単剤の「使用」は現行のまま維持し、mixed-route 専用 realization も今は追加しない
- blocker ではなく、**将来の composition cleanup 候補**として記録する
- OD-RAPID-COMPOSITION-1 が確定した既存の合成契約（stable node order・regimen-level 第1文の限定共有化）は本観察によって変更しない

**10. composition boundary（cross-domain 非共有 / 同一 domain 共有。Known observation・deferred。2026-09-17）**

- Human Review で、異 domain では同一文が重複する場合があり、同一 domain では semantic sharing されることを実機確認した（OD-RAPID-COMPOSITION-1 が確定した挙動どおり）
- **Owner 判断**: cross-domain 側の重複は多少気になるが、現在の安全側の domain 境界を崩してまで今すぐ最適化する必要はない。blocker ではない
- **再開 Trigger**: module 開発が一周する少し前、十分な実 SOAP 例が揃った段階で、cross-domain / regimen sharing / dedupe / ordering を横断的に再レビューする
- priority・solution・実装時期は確定しない。generic S line dedupe や buildS redesign には今は進まない
- 本観察は OD-RAPID-COMPOSITION-1 の既存契約を変更するものではなく、将来の横断 review の対象として記録するにとどめる

**11. 6-module pilot Human Review の closeout（2026-09-17）**

上記により、6-module pilot（H1点眼・トラゼンタ・ノボラピッド・外用・心腎・配合剤）の Human Review 評価軸（§3 の3 module評価軸＋mixed-route、§4 の4観点、composition 境界）はすべて実施済みとなり、いずれも blocker は検出されなかった（UX-1／UX-2／mixed-route／composition boundary は deferred 観察として記録済み）。

**6-module pilot の Human Review 自体はここで CLOSE してよい。** 一方、**global promotion はこの closeout によって承認されない。** 上記の前提条件のうち 1・2 はこれで充足したが、3（clinicalDomain Finding の別 Unit 確定）・4（validator scope の同期判断）は引き続き未充足であり、global promotion 判断はこれらの解消を待つ。（後続追記 2026-09-17: 3 は Unit A で充足。上記 8 参照。本節の記述は closeout 時点の記録として保持する）

---

## Q-E: Phase 1 監査由来の未回答事項（E-1〜E-7）

**論点**
`docs/reviews/CTO_DUE_DILIGENCE_PHASE1_2026-07-25.md` §9 が「Phase 2 前に必要」として列挙した
7 件の UNKNOWN である。いずれも**環境・運用・体制に関する Owner 回答**を要し、コードやデータからは
判定できない。同記録は historical evidence 層にあり読込経路から到達しないため、**現在の状態を
追跡する正本を本節へ移した**（初出の観測内容は同記録 §9 が正本）。

**本節の性格**

- 本節は **状態の追跡のみ**を行う。**回答そのものを本節で創作しない**
- historical review にしか存在しない検討内容を、Owner の確認なしに current decision へ昇格させない
- 回答が得られた項目は、その内容を適切な living SSOT（設計原則・標準・Roadmap 等）へ記載し、
  本表の状態を ANSWERED に更新して pointer を張る

**現在の状態**

| ID | 内容 | 状態 | Trigger（いつ回答が必要になるか） |
|---|---|---|---|
| **E-1** | Vercel 環境変数の設定状況（`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`）と本番 / Preview URL の公開範囲。実効的な認証境界が不明 | **OPEN** | Phase 3（第三者提供）着手時。または本番 URL を Owner 以外へ共有する時点。**現状の実装は `middleware.ts` が両変数未設定時に fail-open**（コードで確認可能な事実。方針の是非は未回答） |
| **E-2** | 利用実態（利用者数・端末・ブラウザ、電子薬歴側へのコピー運用） | **OPEN** | Phase 2 の実運用開始時。運用要件の確定に必要 |
| **E-3** | `main` ブランチの位置づけと Vercel が追跡するデプロイブランチ | **OPEN** | **CI 導入（S4-C）の前提。** CI を設計する時点で回答が必要 |
| **E-4** | NLP 生成の将来方針（外部 LLM API 前提か、ローカル完結か） | **OPEN** | NLP 経路の Lifecycle を確定する時点（`docs/DEVELOPMENT_STANDARD.md` §10.5 GG-1 の解消条件と連動）、または Phase 4（SaaS）設計着手時。**外部 LLM を選ぶ場合、患者テキストが初めて信頼境界を越える**（同記録がセキュリティ上の最大の分岐点と位置づけた項目） |
| **E-5** | 旧体系（`prompts/P0-A.md`〜`P5.md` / `docs/BOOTSTRAP_STANDARD.md` / `docs/P*_STANDARD.md`）の保守方針（凍結アーカイブ化の可否） | **OPEN** | 旧体系資産の Lifecycle を確定する時点（§10.2 Legacy の L1〜L7 判定）。**運用上の扱いは `prompts/PROJECT_CONTEXT.md` §10 が「新規作業では使用しない」と既に定めている**が、Lifecycle State としては未分類 |
| **E-6** | bridge 原稿の知財・医学的責任の整理（執筆者・監修体制・改訂責任） | **OPEN** | **Phase 3（Productization）の完了条件。** 第三者提供を意思決定した時点で回答が必要 |
| **E-7** | 長期構想機能（粉砕可否・腎機能等）の優先順位と次の着手領域 | **OPEN** | 次の薬効領域を決定する時点（MODULE EXPANSION = GO 判定後）。**領域の既定方針は `docs/DEVELOPMENT_STANDARD.md` §8 が「次の点眼領域から」と記載**しているが、着手対象としては未確定 |

**ANSWERED は現時点で 0 件である。** 7 件すべてが Owner 回答待ちであり、Repository 内に回答の記録は存在しない。

**Phase との対応**: E-3 は Phase 2 の CI 整備、E-1 / E-6 は Phase 3、E-4 は Phase 4 に対応する
（`docs/DEVELOPMENT_STANDARD.md` §12）。E-2 / E-5 / E-7 は Phase 2 で必要になる。

---

## 判断確定後の処理手順

1. 論点が確定したら、採用した選択肢と根拠を
   DESIGN_PRINCIPLES.md または JSON_STANDARD.md へ追記する
2. このドキュメントから該当項目を削除する
3. 影響する canonical JSON の修正が必要な場合は、bridge 原稿を起点として対応する
4. 関連する module の再バリデーションを行う
