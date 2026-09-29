# 検索単位・SOAP主語・製品バリエーション分離原則
## （Search Unit / SOAP Subject / Product Variant Separation Principle）

**ステータス**: Accepted
**採用日**: 2026-07-24
**適用範囲**: SOAPエンジン全体（点眼・点鼻・外用・吸入・注射など、剤形を問わない全 module）
**発端**: `bridges/allergy_h1_antihistamine_eye_drops.md` の設計中に発見された、アレジオン／アレジオンLXの扱いをめぐる判断
**位置づけ**: 本文書は `docs/DESIGN_PRINCIPLES.md` の DP-14 候補として書かれている。同ドキュメントへの統合は別作業とし、本文書はそれまでの間、単独の設計資産として参照する。

---

## 1. 背景・問題

アレジオン点眼液には、通常製剤に加えて「アレジオンLX」という高濃度・持続型のバリエーションが存在する。これをどう扱うかを検討する過程で、次の問いに直面した。

> 製品バリエーション（持続型製剤・BF・ミニ・容量違い・デバイス違い等の派生製剤）が増えるたびに、検索候補・SOAP主語・Bridge・canonical JSON を複製していくのか？

複製する設計を取ると、以下が module 数・製品バリエーション数に対して線形以上に増大する。

- Bridge 原稿（`bridges/*.md`）
- canonical JSON（`data/modules/*.json`）
- 検索候補（`drug.search.exactAliases` 等）
- SOAP 本文中の薬剤主語パターン

さらに、製品バリエーションへの「運用上の切替」を独立した薬剤として表現すると、「切り替えた後、CP不良になった場合はどのシナリオを使うのか」「バリエーション専用の副作用シナリオを通常製剤と別に持つのか」といった、実務上存在しないはずの分岐が設計上生まれてしまう。

この問題は点眼薬に限らず、点鼻・外用・吸入・注射など、同一成分に複数の容器・濃度・デバイスのバリエーションが存在するあらゆるドメインで起こりうる。この問題への一般解として整理したのが、本原則である。

---

## 2. 原則

**検索単位・SOAP主語・canonicalデータ（Bridge／canonical JSON）は、常に同一粒度で管理する。この単位を独立させてよいのは、薬歴上区別する必要がある場合のみである。** 製品バリエーションの違いは、この単位を増やす理由にはならない。

ここでいう「薬歴上区別する必要がある単位」とは、薬剤師が実際にSOAPで書き分ける必要がある単位を指す。製品バリエーションは、実務上その粒度で薬歴を記録しないため、独立した検索単位・SOAP主語・canonicalデータとはしない。これは技術的なデータ正規化の都合ではなく、薬剤師の実務を設計原則へ落とし込んだ判断である。

この原則を実現するために、SOAPエンジンでは次の3つの概念を明確に分離する。

| 概念 | 定義 | 増減の単位 |
|---|---|---|
| **検索単位** | 薬歴として区別する必要がある単位 | brandCatalog エントリ・検索候補・canonicalデータ（Bridge／canonical JSON） |
| **SOAP主語** | `{{drug_subject}}` に展開される薬剤名 | 検索単位と1:1（検索単位が増えない限り増えない） |
| **製品バリエーション** | 同一薬剤の運用・取り扱い上の差分（持続型製剤・BF・ミニ・容量違い・デバイス違い等） | handlingTag・ADDON（検索単位・canonicalデータの増減とは独立） |

**検索候補は「薬歴として区別する必要がある単位」のみを持つ。製品バリエーションごとに検索候補・SOAP本文・canonical JSON・Bridge を増やさない。**

差分は次の3つのフィールドのみで表現する。

- `handlingTags`（brandCatalog 側の性質宣言）
- `scenarioRequiredTags`（表示するSCENARIOの条件）
- `addonRequiredTags`（表示するADDONの条件）

ここでいう `handlingTags` は、製品名やバリエーション名そのものを格納するフィールドではない。「点眼回数を減らす選択肢が存在する」「遮光保存が必要である」のように、**運用上の性質・取り扱い・選択肢の有無**を表す語彙として設計する。タグ名に製品バリエーション名（持続型製剤の略称、BF、ミニ等）を直接使わない。この命名思想は、今後追加される全てのタグに適用する。

新しいフィールド・新しいレイヤーは追加しない。既存の3フィールドで表現できないバリエーションに出会った場合は、安易に新フィールドを作らず、まず「本当にSCENARIO本文を書き分ける必要があるか」（§4）に立ち返って判断する。

---

## 3. なぜこの設計を採用するのか

- **薬歴の区別単位と製品バリエーションは、実務上のレイヤーが異なる**。薬剤師が薬歴上「エピナスチン点眼液を使用中」と記録する単位と、「今回は持続型製剤を処方された」という運用上の違いは、同じ粒度で扱うべきではない。前者は検索・SOAP主語・canonicalデータの単位、後者は handlingTag/ADDON で吸収すべき差分である。
- **canonical データの複製は保守負荷を線形以上に増やす**（DP-09 の「不採用とした方針」と同じ構造の問題）。50〜300+ module 規模を見据えたとき、製品バリエーションの数だけ Bridge/JSON/alias を複製する設計は破綻する。
- **バリエーション切替後の運用は、ほとんどの場合ベース薬剤の通常シナリオへ戻る**。切替後のCP不良・副作用・終了等を別データとして持つ必要はなく、むしろ別データとして持つと「切替後、通常シナリオとバリエーション専用シナリオのどちらを使うべきか」という不要な曖昧さを生む。
- **将来のドメイン（点鼻・外用・吸入・注射）でも同型の問題が必ず起きる**。同一成分の容器サイズ違い（ミニ等）、防腐剤有無の違い（BF等）、外用薬のチューブサイズ違い、吸入薬のデバイス違いなど、容器・濃度・剤形のバリエーションはあらゆる剤形で発生する。本原則は特定の剤形・特定ブランドに依存しない、SOAPエンジン全体のドメイン非依存原則として位置づける。

---

## 4. 判断基準（新製品が出たときに最初に行うこと）

新しい製品・製品バリエーションに遭遇したら、最初に次の一点を判断する。

> **SOAP本文（S/O/A/P の文章そのもの）を書き分ける必要があるか？**

```
新製品・新バリエーションが登場
        │
        ▼
SOAP本文（S/O/A/P）を書き分ける必要があるか？
        │
   ┌────┴────┐
  YES        NO
   │          │
   ▼          ▼
新しい Bridge   既存 Bridge のまま
候補として検討   handlingTags / scenarioRequiredTags /
（別成分・別治療   addonRequiredTags で差分吸収
 文脈である場合等）
```

- **YES**（本文を書き分ける必要がある）→ 新しい Bridge 候補として検討する。例: 別成分、別適応、治療方針が本質的に異なる場合。
- **NO**（既存の文章で表現でき、差分は取り扱い・条件だけ）→ 既存 Bridge のまま、`handlingTags` / `scenarioRequiredTags` / `addonRequiredTags` で差分を吸収する。製品バリエーションのほとんどはこちらに該当する。

判断に迷う場合は、「その製品バリエーションについて、薬剤師が薬歴上どう記録するか」を基準に考える。同一成分・同一治療文脈として記録されるなら NO 側、別の薬剤として記録されるなら YES 側に倒す。

### 4.1 剤形・投与経路の違いは製品バリエーションと別レイヤー（2026-07-24 追記）

同一ブランド名を持つ製品でも、剤形・投与経路が異なれば、それは§2〜§4が扱う「製品バリエーション」ではなく、独立した薬剤単位として扱う。

- **剤形・投与経路の違いによって、薬剤師が現場でSOAP骨格を書き分ける必要がある場合は、製品バリエーションではなく、独立した検索単位・SOAP主語・canonical薬剤単位とする。**
  （例: アレジオン錠／アレジオン点眼液／アレジオン眼軟膏は、投与経路・使用方法・指導内容・SOAP骨格・シナリオ構造が異なるため、それぞれ独立した薬剤単位とする。単に「アレジオン」へ統合しない）
- **ミニ、PF、LX、容器、濃度等の同一剤形内バリエーションは、実務上SOAP骨格を分けず、ADDON・handlingTag・requiredTag等で表現できる場合、独立した検索単位・SOAP主語・canonical薬剤単位とはしない。**（§2〜§4の原則どおり）
- **検索候補の増加は薬剤単位の統合によって解決せず、複数トークンAND検索・剤形token・alias設計によって解決する。**（`lib/search.ts` の `scoreEntryAND` / 複数トークンAND検索機構を参照）

**背景**: 外用剤を含む実践的なSOAPアプリでは、薬剤単位を維持すると検索候補が増加する。しかし、検索性を理由に剤形を統合すると、SOAP主語と骨格の正確性が失われる。したがって、SOAP構造の責務と検索の責務を分離し、剤形単位は維持した上で、AND検索によって検索性を担保する（例: 「あれじお」で複数剤形が候補になり得るが、「あれじお てん」でアレジオン点眼液へ絞り込める）。

判断に迷う場合は、①剤形・投与経路が異なりSOAP骨格が変わる → 独立した薬剤単位・検索単位・SOAP主語とする。②同一剤形内の差異でSOAP本文や条件分岐によって表現できる → 独立した薬剤単位・検索単位・SOAP主語にしない、という2段階で判断する。将来的に②の差異がSOAP骨格を書き分ける必要があると現場で確認された場合は、その時点で改めて独立単位化を検討する（推測で先に分離しない）。

### 4.2 相互排他的variant propertyの自動帰属を避ける原則（2026-09 タプロス／タプロスミニ想定追加）

同一canonical drug unitが、複数の実世界instance（同一brand内のpackage variant、または
同一generic name配下の複数manufacturer製品）を代表する場合、それらのinstance間で
あるproperty（handlingTagとして表現される取り扱い上の性質）の正しい値が相互排他的に
分岐することがある（例: 通常製剤は室温保存、単回使用PF製剤は2〜8℃保存）。

**[Historical・2026-09] 記載当時の原則:**

- current runtimeが実際に交付されたvariantを判別できない場合、そのpropertyを
  **canonical unit全体のhandlingTagとして自動付与しない**
- 不明なvariant-specific propertyを「代表値」「安全側の値」「先発品の値」等で
  **補完しない**
- variant固有の差分は自動適用しない
- **ADDON**について、既存UI（薬剤師がscenario単位で個別addonを確認・選択するUI）で
  実際に交付された製剤を確認したうえで薬剤師が明示的に選択できる場合、
  当該ADDONは requiredTags を宣言しない manual candidate として扱ってよい
  （実例: `addon_eye_drop_contact_lens_remove_before_use`）
- **ただし、このgapを理由に SCENARIO の reachability を自動的に広げてはならない。**
  対象propertyのhandlingTagを持つ他のinstanceが存在する場合、そのinstanceに
  紐づくSCENARIOのreachabilityは通常どおりtagベースで制御し、gapを口実に
  全brandへ一律開放しない
- 本節は既存の3フィールド（handlingTags / scenarioRequiredTags / addonRequiredTags）の
  適用範囲を明確化するものであり、**新フィールド・新canonical unit・variant名を持つ
  独立brandCatalog entryを追加するものではない**

[Historical] 実装参照: `bridges/glaucoma_pg_analog_eye_drops.md`（タプロス／タプロスミニ想定。
`single_use_container` / `preservative_free` を自動付与せず、対応ADDONを
requiredTags未宣言の**全brand ungated** manual candidateとした実例。当時はfamily単位への
絞り込みという中間段階を持たず、「SKU propertyが確定している brandCatalog entry」と
「すべてのbrandで常時候補」の2値しかなかった）。

**[Current State・2026-09-30 H1 generic-noun O + ophthalmic family-level variant candidate
Unit・Owner Decision]** 上記の運用は「SKU propertyが確定している場合」と「確定していない
場合は全brand ungated manual candidate」の2値しか区別できず、実機確認で候補範囲が
広すぎる欠陥として顕在化した（例: 通常のキサラタン／ラタノプロスト／ルミガン／レスキュラ等
にも「ミニ・1回使い切り」「PF・防腐剤フリー」ADDONが常時候補として表示されていた）。
これを受け、本節を次の3段階（Level 1〜3）へ整理し、**Level 2「family内にvariantが存在する」
という中間段階**を導入した。上記の歴史的な運用は Level 1（property確定）と Level 3
（familyまで絞れない）の2値のみを扱っていたことになる。Level 2の新規導入により、
「property未確定だが対象variantがfamily内に実在し、既存ADDON本文がそのまま適用できる」
という中間ケースを、全brand ungatedより狭いproduct family単位のcandidateとして表現できる。

#### 4.3 Level 1 — SKU property confirmed

current SKU / brandCatalog entry自身のpropertyが確定している場合に適用する。

- **property tag**を使用する（例: `light_protection` / `preservative_free` /
  `single_use_container`）
- 対応するSCENARIO・ADDONのrequiredTagsに、このproperty tagをそのまま宣言する
- 本レベルの原則は変更していない（上記[Historical]の原則がそのままLevel 1に対応する）

#### 4.4 Level 2 — Variant exists in family

current runtimeでは実SKUを識別できないが、次の条件を**すべて**満たす場合に適用する。

1. 同一product family内（同一brandCatalog entryが代表する複数SKU、または同一
   generic name配下の複数manufacturer製品）に、該当propertyを持つmarketed SKU /
   variantが存在することが事実として確認できる
2. 既存ADDON本文が、そのvariantへ**そのまま適用可能**である（variant固有の追加説明・
   専用ADDONの新規作成が必要な場合はLevel 2の対象外。§4.5参照）

**この場合の原則は次のとおりである。**

- **family-level variant tag**（例: `light_protection_variant_in_family` /
  `preservative_free_variant_in_family` / `single_use_variant_in_family`）を
  対象brandCatalog entryへ付与する
- family-level variant tagは**Addon candidate reachability専用**であり、
  **scenarioRequiredTagsには使用しない**（SCENARIOの意味論はSKU propertyが確定している
  場合のみ変更する。§2「対象propertyのhandlingTagを持つ他のinstanceが存在する場合...
  gapを口実に全brandへ一律開放しない」という既存原則をscenario側では維持する）
- family-level variant tagは**SKU propertyそのものを主張しない**。
  例: `ラタノプロスト点眼液`（manufacturer-unspecified generic entry）へ
  `light_protection_variant_in_family` を付与することは、「ラタノプロスト点眼液という
  generic entry自体が遮光対象である」ことを意味しない。「市場に遮光対象製品が存在するため、
  薬剤師が実際の交付製品を確認して選択できる」ことのみを表す
- **property保持brandは、family = 自身を含むという意味で、対応するfamily-level tagも
  併記してよい**（例: キサラタン点眼液は`light_protection`〔property tag〕と
  `light_protection_variant_in_family`〔family tag〕の両方を持つ。「familyに該当propertyを
  持つSKUが存在する」という定義上、property保持brand自身がそれを満たすため自明に真である。
  ただし両者の意味は混同しない）
- 対応するADDONのrequiredTagsには、property tagではなくfamily-level variant tagを宣言する
- 新規field・新規canonical unit・variant名を持つ独立brandCatalog entryを追加するものではない

既存precedent: `reduced_frequency_option`（§5.1参照）は、Level 2と同じ性質の
**existence-class tag**の既存実装である。「現在のSKUそのものが持続型である」ことを
意味するのではなく、「同一family内に、点眼回数を減らせる持続型製剤への切替という
variant選択肢が存在する」ことを表す。本節のfamily-level variant tagは、この
`reduced_frequency_option`と同型の設計をstorage/PF/容器系propertyへ拡張したものである。

実装参照: `bridges/glaucoma_pg_analog_eye_drops.md`（タプロス／タプロスミニ・
キサラタン／ラタノプロスト・レスキュラ／イソプロピルウノプロストン）・
`bridges/allergy_chemical_mediator_release_inhibitor_eye_drops.md`（トラメラス点眼液・
クロモグリク酸点眼液のPF familyのみへ`preservative_free_variant_in_family`を付与し、
一般名entry「トラニラスト点眼液」へは付与しない。トラメラスPFの存在を
manufacturer-unspecified genericなトラニラスト全体へ横滑りさせないため）。

#### 4.5 Level 3 — Familyまで絞れない / Addon本文がvariantへ適合しない

次のいずれかに該当する場合に適用する。

- product familyまで安全に絞れない（「どのfamilyに属するか」自体が不明、または
  familyの範囲が定義できない）
- variant existenceは分かるが、既存ADDON本文がそのvariantへ正確に適用できない
  （variant固有の追加説明・専用ADDONの新規作成など、追加runtime contractが必要）

**この場合、property tag・family-level variant tagのいずれも無理に付けない。**
必要に応じて次のいずれかとして扱う。

- 既存UIで薬剤師が実際の交付製剤を確認して選択する、requiredTags未宣言のungated
  manual candidate（実例: `addon_eye_drop_contact_lens_remove_before_use`）
- variantの実情に正確に適合する専用ADDONの新規設計（本文書の判断基準§4に従って
  個別に検討する。既存の汎用ADDON本文を流用しない）
- 将来設計事項として`docs/OPEN_DESIGN_QUESTIONS.md`等へ記録し、runtime実装を保留する
  （§4.6「Future consideration」参照）

#### 4.6 Future consideration — タプロスミニの保存条件専用表示（2026-09-30・未実装）

タプロスミニ（PF・単回使用）は、通常のタプロス点眼液とは異なる保存条件
（**2〜8℃保存**。開封後はメーカー添付の遮光用投薬袋に入れて2〜8℃で1年以内、または
室温で保存する場合は1ヵ月以内に使用。出典: PMDA添付文書。詳細は
`bridges/glaucoma_pg_analog_eye_drops.md`「PG primary-source verification」記録参照）を持つ。

**現時点（2026-09-30）では、この保存条件差はLevel 2 family-level variant tagとしても
実装しない。** タプロス／タフルプロストのfamilyには`single_use_variant_in_family`
（Mini Addonのcandidate化）のみを付与し、storage系のfamily-level tag
（`light_protection_variant_in_family` / 冷所系family tag）は付与していない。
既存の汎用ADDON（`addon_eye_drop_storage_cold` / `addon_eye_drop_storage_cold_before_opening` /
`addon_eye_drop_storage_light_protection`）は、タプロスミニの存在だけを理由に
タプロス／タフルプロストへ表示させない。

**理由**: これらの汎用storage ADDON本文は「通常保存条件からの逸脱」を一般的に説明する
文言であり、タプロスミニの実際の保存条件（2〜8℃・遮光投薬袋・室温選択時1ヵ月以内という
複合条件）を正確に説明していない（Level 2の適用条件2「既存ADDON本文がそのまま適用可能」を
満たさない。Level 3に該当する）。

**将来検討の方向性（未実装）**: Mini Addon（`addon_eye_drop_single_dose_mini`）を薬剤師が
選択した場合に、タプロスミニ専用の保存方法ADDONを追加表示する、という
**Addon selection → dependent Addon visibility**の仕組みを将来の検討対象とする。
ただし、**current runtimeにはAddon→Addon依存を表現するcontractが存在しない**ため、
今回のUnitでは導入しない。将来この設計を検討する際も、既存の汎用storage ADDON
（冷所保存／未開封時のみ冷所保存／遮光保存）をそのまま流用するのではなく、
タプロスミニの実際の包装開封後条件・保存条件に正確に適合する**専用ADDON**が必要かを
先に検討すること（本節冒頭の複合条件を参照）。

---

## 5. 具体例

### 5.1 アレジオン／アレジオンLX（採用済み実例）

- canonical薬剤単位（brandCatalog正式名・SOAP主語）: 「アレジオン点眼液」「エピナスチン点眼液」。「アレジオン」「エピナスチン」（bare名）は入力alias（`drug.search.exactAliases`）としてのみ存在し、正式表示名・SOAP主語には使わない（剤形違い〔例: アレジオン錠〕との区別のため。§4.1参照）。「アレジオンLX」は独立した検索候補・SOAP主語・Bridge・canonical JSON を持たない。
- LXへの切替: `switch_to_high_strength_reduced_frequency` シナリオのみで表現する。
- 切替後の運用（CP・副作用・終了等）: ベース薬剤（アレジオン点眼液／エピナスチン点眼液）の通常シナリオをそのまま使う。専用シナリオは作らない。
- 差分吸収に使う handlingTag: `reduced_frequency_option`（「点眼回数を減らすための持続型製剤への切替選択肢が存在する」ことを表す運用タグ。「高濃度製剤そのもの」を表すタグではない点に注意）。
- 実装: `bridges/allergy_h1_antihistamine_eye_drops.md` の `brandCatalog.アレジオン点眼液` / `brandCatalog.エピナスチン点眼液` および `scenarioRequiredTags.switch_to_high_strength_reduced_frequency` を参照。

### 5.2 ヒアレイン／ヒアレインミニ／ヒアレイン点眼BF（将来適用の想定例）

- 検索候補: 「ヒアレイン」のみ。「ヒアレインミニ」「ヒアレイン点眼BF」は独立データを持たない。
- ミニ固有差分: 使い切り容器であることを ADDON／handlingTag で表現する（例: 開封後保存期間が異なる、使用時の取り扱い説明が異なる 等）。
- BF固有差分: 防腐剤無添加でコンタクトレンズ装用中も使用可能であることを ADDON／handlingTag で表現する。
- SOAP本文の主語は一貫して「ヒアレイン」を使用し、ミニ／BF専用のSOAP文は作成しない。

### 5.3 アンチパターン（採用しない設計）

以下は本原則違反として扱う。

- 製品バリエーション名（LX、ミニ、BF 等）を `drug.brandNames` / `brandCatalog` へ独立エントリとして追加する
- 製品バリエーション名を検索候補（`exactAliases` / `nameAliases`）に追加する
- 製品バリエーション専用の SCENARIO・ADDON を新規作成する（切替イベント自体を表すシナリオを除く）
- `{{drug_subject}}` が製品バリエーション名に展開されることを前提にした実装
- 製品バリエーションごとに Bridge ファイル・canonical JSON ファイルを複製する

---

## 6. 適用範囲

本原則は点眼薬に限らず、SOAPエンジンが扱う全てのドメインに適用する、剤形非依存・ブランド非依存の設計原則である。

- 点眼（本原則の発端。アレジオン／アレジオンLXの持続型製剤バリエーションが実例）
- 点鼻
- 外用（チューブサイズ・容器違い等）
- 吸入（デバイス違い等）
- 注射（カートリッジ・容量違い等）

新規ドメインの module を設計する際は、最初に製品バリエーションの一覧を洗い出し、§4 の判断基準を適用してから Bridge 設計に着手すること。

---

## 7. 関連するドキュメント・フィールド

- `docs/DESIGN_PRINCIPLES.md` DP-07（bridge SOT 原則）— Bridge が内容の正本であるという前提は本原則でも維持される
- `docs/DESIGN_PRINCIPLES.md` DP-09（一般名検索到達性原則）— 「データ複製に依存しない」という設計判断の構造が本原則と共通する
- `lib/types.ts` の `BrandEntry.handlingTags` / `ScenarioItem.scenarioRequiredTags` / `AddonItem.requiredTags`
- 実装参照: `bridges/allergy_h1_antihistamine_eye_drops.md`

---

## 付録: 製品バリエーション追加時チェックリスト

新しい製品バリエーション（持続型製剤・ミニ・BF・容量違い・デバイス違い等）に遭遇した際に、上から順に確認する。

1. **判断基準の適用**: そのバリエーションは SOAP本文（S/O/A/P）を書き分ける必要があるか（§4）。
   - YES → 新しい Bridge 候補として別途検討する（本チェックリストの対象外）。
   - NO → 以下のチェックリストを続ける。
2. **検索候補への追加禁止**: バリエーション名を `drug.search.exactAliases` / `drug.search.nameAliases` / `drug.nameAliases` に追加していないか。
3. **brandCatalog への追加禁止**: バリエーション名を `drug.brandNames` / `brandCatalog` の独立エントリとして追加していないか。
4. **aliasToBrand への追加禁止**: バリエーション名の読みを `aliasToBrand` に追加していないか。
5. **SOAP主語の一貫性**: `{{drug_subject}}` がバリエーション名に展開されることを前提にした本文・ADDONを作成していないか。ベース薬剤名で一貫しているか。
6. **専用SCENARIOの必要性確認**: バリエーションへの「切替イベント」自体を表すシナリオが必要か（アレジオンLXの例では `switch_to_high_strength_reduced_frequency` が該当）。必要な場合のみ最小限で追加し、切替後の通常運用（継続・副作用・CP・終了等）は既存シナリオを再利用する。
7. **差分表現フィールドの選定**: バリエーション差分を次のどれで表現できるか確認する。新しいフィールドを発明しない。
   - `handlingTags`（brandCatalog 側の性質宣言）
   - `scenarioRequiredTags`（表示するSCENARIOの条件）
   - `addonRequiredTags`（表示するADDONの条件）
8. **タグ名の妥当性**: 新しい handlingTag を追加する場合、そのタグ名が「製品バリエーション名そのもの」ではなく「運用上の性質・取り扱い・選択肢の存在」を表す命名になっているか（例: `reduced_frequency_option` は「点眼回数を減らす選択肢が存在する」という運用上の性質を表しており、`lx` のようなバリエーション名そのものではない）。
9. **既存タグの再利用確認**: 既に定義済みの handlingTag で表現できないか、新規タグ追加の前に確認したか。
10. **表示制御の妥当性確認**: タグを付与した結果、意図した製品のみにSCENARIO/ADDONが表示され、他の製品には表示されないことを確認したか（タグ未定義＝常時表示という既存仕様を踏まえる）。
11. **canonicalデータの複製有無**: この作業の結果、Bridge・canonical JSON・検索候補のいずれかが製品バリエーションの数だけ複製されていないか、最終確認する。
