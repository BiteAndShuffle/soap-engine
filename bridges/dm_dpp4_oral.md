# =========================================
# SOAP-ENGINE MODULE (bridge原稿 / lightweight)
# dm_dpp4_oral
# =========================================
#
# ⚠️ STATUS: FROZEN_FOR_PN1 ⚠️
#
# ヘッダー案および SCENARIOS_START〜SCENARIOS_END のシナリオ本文は
# ユーザーによる確認・凍結宣言を経て確定しました。
#
# 目的: DPP4 の brandCatalog / handlingTags / scenarioRequiredTags /
# weekly addon 設計を、会話ログではなくリポジトリ上に固定するための
# 作業ファイルです（2026-07-05 作成、同日シナリオ本文追加・凍結）。
#
# 次の作業: PN1 開始（prompts/vNext/HANDOFF.md の
# 「bridge 作成から開始する」手順に従う）。
#
# 参照:
#   - docs/DESIGN_PRINCIPLES.md DP-09（一般名検索到達性原則）
#   - prompts/RULES.md §21（genericName/genericKey 役割分離）
#   - prompts/RULES.md §23（alias系フィールド同期原則）
#   - docs/VALIDATOR_STANDARD.md §5（exactAliases網羅性は人間判断）
#
# =========================================

moduleId: "dm_dpp4_oral"

categoryPath:
  - "糖尿病"
  - "DPP-4阻害薬"
  - "内服"

drug:
  genericName: "DPP-4阻害薬"

  brandNames:
    - "トラゼンタ"
    - "マリゼブ"
    - "ザファテック"
    - "スイニー"
    - "オングリザ"
    - "テネリア"
    - "ネシーナ"
    - "エクア"
    - "ジャヌビア"
    - "グラクティブ"

  drugClass:
    - "DPP4_INHIBITOR"

  route: "oral"

  dosageForms:
    - "tablet"
  # tablet で確定（2026-07-05）。OD錠等の詳細剤形は今回の DPP4 bridge では扱わない。
  # 将来必要になった場合は別途拡張する（本モジュールの剤形分離は現時点で未検討）。

  drugSpecificTags:
    - "dpp4_oral"

  # ─────────────────────────────────────────
  # search セクション: alias確定（2026-07-05）
  # ─────────────────────────────────────────
  # ブランド名読みは kataToHira による機械的なひらがな変換のみ（推測なし、normalizeText()で導出確認済み）。
  # 成分名読みは module 単位の prefixAliases/nameAliases にのみ追加し、
  # brandCatalog[brand].aliases への複製は行わない
  # （DP-09: displayGenericName が resolveAllHighPrecisionBrands で既に解決されるため、
  #   単剤ブランドの成分名フルネームは brandCatalog.aliases への複製が不要。
  #   Q-S1 で複製が必要だったのは配合剤の「いんすりん+成分」プレフィックスが
  #   短縮形の prefix match を妨げるケースに限られ、DPP4 の単剤10ブランドには該当しない）。
  search:
    primaryDisplayName: "DPP-4阻害薬"

    exactAliases:
      - "トラゼンタ"
      - "マリゼブ"
      - "ザファテック"
      - "スイニー"
      - "オングリザ"
      - "テネリア"
      - "ネシーナ"
      - "エクア"
      - "ジャヌビア"
      - "グラクティブ"

    prefixAliases:
      - "とらぜんた"
      - "まりぜぶ"
      - "ざふぁてっく"
      - "すいにー"
      - "おんぐりざ"
      - "てねりあ"
      - "ねしーな"
      - "えくあ"
      - "じゃぬびあ"
      - "ぐらくてぃぶ"
      - "りなぐりぷちん"
      - "おまりぐりぷちん"
      - "とれらぐりぷちん"
      - "あなぐりぷちん"
      - "さきさぐりぷちん"
      - "てねりぐりぷちん"
      - "あろぐりぷちん"
      - "びるだぐりぷちん"
      - "したぐりぷちん"

    nameAliases:
      - "とらぜんた"
      - "まりぜぶ"
      - "ざふぁてっく"
      - "すいにー"
      - "おんぐりざ"
      - "てねりあ"
      - "ねしーな"
      - "えくあ"
      - "じゃぬびあ"
      - "ぐらくてぃぶ"
      - "りなぐりぷちん"
      - "おまりぐりぷちん"
      - "とれらぐりぷちん"
      - "あなぐりぷちん"
      - "さきさぐりぷちん"
      - "てねりぐりぷちん"
      - "あろぐりぷちん"
      - "びるだぐりぷちん"
      - "したぐりぷちん"

    keywords: []

    priority: 5

    matchPolicy:
      preferExactAlias: true
      allowPrefixMatch: true
      suppressCrossModuleSuggestionsOnExactHit: true

  nameAliases:
    - "とらぜんた"
    - "まりぜぶ"
    - "ざふぁてっく"
    - "すいにー"
    - "おんぐりざ"
    - "てねりあ"
    - "ねしーな"
    - "えくあ"
    - "じゃぬびあ"
    - "ぐらくてぃぶ"
    - "りなぐりぷちん"
    - "おまりぐりぷちん"
    - "とれらぐりぷちん"
    - "あなぐりぷちん"
    - "さきさぐりぷちん"
    - "てねりぐりぷちん"
    - "あろぐりぷちん"
    - "びるだぐりぷちん"
    - "したぐりぷちん"

  # ─────────────────────────────────────────
  # brandCatalog: 10 ブランド
  # ─────────────────────────────────────────
  # genericKey 命名規則: 成分名の英語スネークケース（PN2-Drug-Header.md 準拠）
  # ジャヌビア / グラクティブ は同一成分（シタグリプチン）の共同販売品のため
  # genericKey を共有する（RULES.md §21、ノボリンR/ヒューマリンR と同型）。
  #
  # handlingTags 方針（3種、DashboardClient.tsx 既存フィルタ + addonFilter.ts
  # requiredTags と同一の AND 条件メカニズムを使用）:
  #   - "dpp4_standard_titration": 通常の増量・減量シナリオを表示するブランド
  #   - "dpp4_renal_dose_adjustment": 腎機能に応じた減量シナリオのみ表示するブランド
  #   - "weekly_dpp4": 週1回製剤（addon_weekly_dpp4_admin 表示条件）
  #   - トラゼンタは上記いずれのタグも持たない
  #     （タグ不在 → 増量・減量系シナリオが自動的に非表示になる。RULES.md §21 参照）
  #
  # 正本（ユーザー確定・2026-07-05）:
  #   トラゼンタ（リナグリプチン）: 通常増減量なし
  #   マリゼブ（オマリグリプチン）: 週1回、腎機能減量あり
  #   ザファテック（トレラグリプチン）: 週1回、腎機能減量あり
  #   スイニー（アナグリプチン）〜グラクティブ（シタグリプチン）: 標準増減量あり
  brandCatalog:
    トラゼンタ:
      displayName: "トラゼンタ"
      genericName: "リナグリプチン"
      displayGenericName: "リナグリプチン"
      genericKey: "linagliptin"
      handlingTags: []
      aliases:
        - "とらぜんた"
      normalizedAliases:
        - "とらぜんた"

    マリゼブ:
      displayName: "マリゼブ"
      genericName: "オマリグリプチン"
      displayGenericName: "オマリグリプチン"
      genericKey: "omarigliptin"
      handlingTags:
        - "weekly_dpp4"
        - "dpp4_renal_dose_adjustment"
      aliases:
        - "まりぜぶ"
      normalizedAliases:
        - "まりぜぶ"

    ザファテック:
      displayName: "ザファテック"
      genericName: "トレラグリプチン"
      displayGenericName: "トレラグリプチン"
      genericKey: "trelagliptin"
      handlingTags:
        - "weekly_dpp4"
        - "dpp4_renal_dose_adjustment"
      aliases:
        - "ざふぁてっく"
      normalizedAliases:
        - "ざふぁてっく"

    スイニー:
      displayName: "スイニー"
      genericName: "アナグリプチン"
      displayGenericName: "アナグリプチン"
      genericKey: "anagliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "すいにー"
      normalizedAliases:
        - "すいにー"

    オングリザ:
      displayName: "オングリザ"
      genericName: "サキサグリプチン"
      displayGenericName: "サキサグリプチン"
      genericKey: "saxagliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "おんぐりざ"
      normalizedAliases:
        - "おんぐりざ"

    テネリア:
      displayName: "テネリア"
      genericName: "テネリグリプチン"
      displayGenericName: "テネリグリプチン"
      genericKey: "teneligliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "てねりあ"
      normalizedAliases:
        - "てねりあ"

    ネシーナ:
      displayName: "ネシーナ"
      genericName: "アログリプチン"
      displayGenericName: "アログリプチン"
      genericKey: "alogliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "ねしーな"
      normalizedAliases:
        - "ねしーな"

    エクア:
      displayName: "エクア"
      genericName: "ビルダグリプチン"
      displayGenericName: "ビルダグリプチン"
      genericKey: "vildagliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "えくあ"
      normalizedAliases:
        - "えくあ"

    ジャヌビア:
      displayName: "ジャヌビア"
      genericName: "シタグリプチン"
      displayGenericName: "シタグリプチン"
      genericKey: "sitagliptin"
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "じゃぬびあ"
      normalizedAliases:
        - "じゃぬびあ"

    グラクティブ:
      displayName: "グラクティブ"
      genericName: "シタグリプチン"
      displayGenericName: "シタグリプチン"
      genericKey: "sitagliptin"
      # ↑ ジャヌビアと同一 genericKey（共同販売・同一成分）
      handlingTags:
        - "dpp4_standard_titration"
      aliases:
        - "ぐらくてぃぶ"
      normalizedAliases:
        - "ぐらくてぃぶ"

  aliasToBrand:
    "とらぜんた": "トラゼンタ"
    "まりぜぶ": "マリゼブ"
    "ざふぁてっく": "ザファテック"
    "すいにー": "スイニー"
    "おんぐりざ": "オングリザ"
    "てねりあ": "テネリア"
    "ねしーな": "ネシーナ"
    "えくあ": "エクア"
    "じゃぬびあ": "ジャヌビア"
    "ぐらくてぃぶ": "グラクティブ"
  # aliasToBrand は brandCatalog[brand].normalizedAliases（ブランド名読みのみ）を
  # 過不足なく網羅する（RULES.md §10）。成分名読み（りなぐりぷちん 等）は
  # module 単位 nameAliases 側のみに存在し brandCatalog.aliases には複製していないため、
  # aliasToBrand の対象外（dm_insulin_regular の「ヒトインスリン」等と同型の扱い）。

  # ─────────────────────────────────────────
  # drugResolution.brandToTags: 確定（2026-07-05）
  # ─────────────────────────────────────────
  # PN2-Drug-Header.md の MUST_STOP ルールにより必須。
  # brandToTags は検索・表示制御用の handlingTags（weekly_dpp4 /
  # dpp4_standard_titration / dpp4_renal_dose_adjustment）とは役割を分離し、
  # ブランドの薬効/成分識別タグとして扱う（VALIDATOR_STANDARD.md：
  # brandToTags＝成分識別タグ、handlingTags＝製品取り扱いタグ、両者は別概念）。
  # 各 brand: ["dpp4_oral", {genericKey と同一の成分タグ}] の2件で統一。

drugResolution:
  brandToTags:
    トラゼンタ:
      - "dpp4_oral"
      - "linagliptin"
    マリゼブ:
      - "dpp4_oral"
      - "omarigliptin"
    ザファテック:
      - "dpp4_oral"
      - "trelagliptin"
    スイニー:
      - "dpp4_oral"
      - "anagliptin"
    オングリザ:
      - "dpp4_oral"
      - "saxagliptin"
    テネリア:
      - "dpp4_oral"
      - "teneligliptin"
    ネシーナ:
      - "dpp4_oral"
      - "alogliptin"
    エクア:
      - "dpp4_oral"
      - "vildagliptin"
    ジャヌビア:
      - "dpp4_oral"
      - "sitagliptin"
    グラクティブ:
      - "dpp4_oral"
      - "sitagliptin"
      # ↑ ジャヌビアと同一成分（シタグリプチン）のため sitagliptin を共有

composition:
  classKey: "dpp4"
  # nodeKey は "{classKey}_{route}" 規則（display.nodeKey と一致）で確定（2026-07-05）
  nodeKey: "dpp4_oral"
  priority: "chronic"
  # priority は "chronic"（慢性疾患薬）で確定（2026-07-05）

display:
  nodeKey: "dpp4_oral"
  nodeLabelShort: "DPP4"
  nodeLabelLong: "DPP-4阻害薬（内服）"

# =========================================
# scenario availability 設計（確定済み・2026-07-05 シナリオ本文へ反映済み）
# =========================================
#
# 全ブランド共通で表示するシナリオ（scenarioRequiredTags なし）:
#   - initial / restart / external_start
#   - side_effect 系（全種）
#   - adherence 系（全種）
#   - treatment_end 系（全種）
#   - lifestyle_guidance 系（全種）
#   - sickday
#
# scenarioRequiredTags: ["dpp4_standard_titration"] を付与済みシナリオ
# （スイニー/オングリザ/テネリア/ネシーナ/エクア/ジャヌビア/グラクティブのみ表示）:
#   - dose_increase_low_perceived_effect
#   - dose_increase_no_lab_improvement
#   - dose_increase_due_to_other_med_adjustment
#   - dose_decrease_improved
#   - dose_decrease_low_perceived_effect
#   - dose_decrease_due_to_other_med_adjustment
#
# scenarioRequiredTags: ["dpp4_renal_dose_adjustment"] を付与済みシナリオ
# （マリゼブ/ザファテックのみ表示）:
#   - dose_decrease_renal_function（新規 scenario id・本文確定済み）
#
# トラゼンタは上記いずれの handlingTags も持たないため、
# dose_increase_* / dose_decrease_*（renal 含む）は自動的に全て非表示になる。
#
# =========================================
# addon 設計（確定済み・2026-07-05 シナリオ本文へ反映済み）
# =========================================
#
# addon_weekly_dpp4_admin:
#   requiredTags: ["weekly_dpp4"] 付与済み
#   → マリゼブ / ザファテックのみ AddonPanel に表示
#   → initial / restart / external_start の P_ADDON へ参照追加済み
#   本文（text / title 等）は確定済み

# =========================================
# 確定済み事項（設計・確定の経緯記録）
# =========================================
#
# 1. dose_decrease_renal_function の S/O/A/P 本文 → 2026-07-05 シナリオ本文追加時に確定済み
# 2. drug.search.exactAliases 以外の prefixAliases / nameAliases / brandCatalog.aliases
#    の具体的な読み仮名 → 2026-07-05 確定済み（ブランド名読み10件 + 成分名読み9件、
#    normalizeText() による機械的導出のみ、推測なし）
# 3. drugResolution.brandToTags の具体的なタグ設計 → 2026-07-05 確定済み
#    （["dpp4_oral", {genericKeyと同一の成分タグ}] の2件で統一。
#    handlingTags 用タグ（weekly_dpp4 等）とは分離）
# 4. lib/moduleValidator.ts の scenarioRequiredTags ⇔ handlingTags 整合性検証チェック
#    → check 32（SCENARIO_REQUIRED_TAG_UNREACHABLE）として追加済み（2026-07-05）
# 5. エクア（ビルダグリプチン）の腎機能に関する添付文書上の扱い
#    → 2026-07-05、ユーザー正本分類に従い group C（標準増減量あり）として確定
# 6. composition.nodeKey（"dpp4_oral"）/ priority（"chronic"）
#    → 2026-07-05 正式確定
# 7. drug.dosageForms → 2026-07-05、"tablet" で確定（詳細は下記「将来拡張事項」参照）
#
# =========================================
# 残る未確定事項
# =========================================
#
# なし（2026-07-05 時点、本 bridge のヘッダー設計に関する未確定事項は解消済み）
#
# =========================================
# 将来拡張事項（今回の DPP4 bridge では扱わない・スコープ外）
# =========================================
#
# - OD錠等の詳細剤形分離: 現時点では drug.dosageForms = ["tablet"] のみを扱い、
#   剤形ごとの module 分離（DP-01 相当の検討）は行わない。必要になった時点で
#   bridge 原稿を起点に別途拡張する
# - 配合剤・GE 追加: DP-09 / RULES.md §21 の既存方針（専用 genericKey 付与、
#   構成成分ごとの読み登録）に従って対応する。今回のブランド構成（10ブランド）
#   への追加は行わない
=======SCENARIOS_START=======
【SCENARIO｜type=treatment_start｜id=initial｜title=DPP4阻害薬 初回】
S
DPP4阻害薬は、血糖値が高いため追加となった。
O
DPP4阻害薬　処方
A
DPP4阻害薬は、血糖コントロール不十分のため追加となった。
インクレチンの働きを高め、血糖値が高い時にインスリン分泌を促進するとともにグルカゴン分泌を抑制することで血糖改善を目的として服用する。
P
DPP4阻害薬は、血糖値を改善する薬です。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_se_pancreatitis_guidance
- addon_glycemic_guidance_initial
- addon_weekly_dpp4_admin
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=side_effect_guidance｜id=addon_se_hypoglycemia_guidance｜title=副作用注意喚起（低血糖）】
P_APPEND
他の糖尿病薬と併用している場合は、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
低血糖症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。




【ADDON｜type=side_effect_guidance｜id=addon_se_pancreatitis_guidance｜title=副作用注意喚起（膵炎）】
P_APPEND
DPP4阻害薬の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
こうした症状が続く場合は膵炎の可能性があります。
痛みが強い・発熱を伴う・我慢できないほどの場合は、救急受診も検討してください。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_initial｜title=生活指導（血糖指導）】
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。


【ADDON｜type=administration_guidance｜id=addon_weekly_dpp4_admin｜title=週1回DPP4阻害薬 服用方法｜requiredTags=[weekly_dpp4]】
P_APPEND
週1回服用する薬のため、決められた曜日に服用してください。
飲み忘れた場合は、気づいた時点で1回分を服用し、その後は決められた曜日に服用してください。
同じ日に2回分を服用しないでください。




【ADDON｜type=sickday_guidance｜id=addon_initial_sickday_guidance｜title=初回シックデイ】
P_APPEND
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
体調不良時は水分を少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なるため、自己判断せず処方医へご相談ください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。


【ADDON｜type=lifestyle_guidance｜id=addon_hyperkalemia_guidance｜title=生活指導（カリウム）】
S_APPEND
カリウムの値が高いと言われた。
A_APPEND
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P_APPEND
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。






【SCENARIO｜type=treatment_start｜id=restart｜title=DPP4阻害薬 再開】
S
DPP4阻害薬は、血糖値が高いため再開となった。
O
DPP4阻害薬　処方
A
DPP4阻害薬は、血糖コントロール不十分のため再開となった。
インクレチンの働きを高め、血糖値が高い時にインスリン分泌を促進するとともにグルカゴン分泌を抑制することで血糖改善を目的として服用する。
P
DPP4阻害薬は、血糖値を改善する薬です。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_se_pancreatitis_guidance
- addon_glycemic_guidance_initial
- addon_weekly_dpp4_admin
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_start｜id=external_start｜title=DPP4阻害薬 他所開始】
S
DPP4阻害薬は、他院で開始され継続使用中であった。
O
DPP4阻害薬　処方
A
DPP4阻害薬は、血糖コントロール改善を目的として使用中であった。
インクレチンの働きを高め、血糖値が高い時にインスリン分泌を促進するとともにグルカゴン分泌を抑制することで血糖改善を目的として服用する。
P
DPP4阻害薬は、血糖値を改善する薬です。
お腹の調子が悪くなることがあります。
副作用が出た場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
- addon_se_pancreatitis_guidance
- addon_glycemic_guidance_initial
- addon_weekly_dpp4_admin
- addon_initial_sickday_guidance
- addon_hyperkalemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_low_perceived_effect｜title=DPP4阻害薬 増量（効果実感乏しい）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、効果の実感が乏しいため増量となった。
O
DPP4阻害薬　増量
A
DPP4阻害薬は、効果不十分のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP4阻害薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_no_lab_improvement｜title=DPP4阻害薬 増量（検査値改善なし）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、検査値が改善しないため増量となった。
O
DPP4阻害薬　増量
A
DPP4阻害薬は、検査値改善が不十分なため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP4阻害薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_increase_due_to_other_med_adjustment｜title=DPP4阻害薬 増量（他剤との調整）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、他剤変更に伴う調整により増量となった。
O
DPP4阻害薬　増量
A
DPP4阻害薬は、他剤変更に伴う調整のため増量となった。増量に伴い副作用が増強する可能性があるため、注意が必要である。
P
DPP4阻害薬は、増量によりお腹の調子が悪くなることがあります。
消化器症状が強い場合はご相談ください。
P_ADDON
- addon_se_hypoglycemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_renal_function｜title=DPP4阻害薬 減量（腎機能低下）｜scenarioRequiredTags=[dpp4_renal_dose_adjustment]】
S
DPP4阻害薬は、腎機能を考慮して減量となった。
O
DPP4阻害薬　減量
A
DPP4阻害薬は、腎機能低下に伴い用量調整となった。減量後の血糖推移に注意が必要である。
P
DPP4阻害薬は、腎機能に応じて用量調整が必要になることがあります。
減量後は血糖値が変動する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、血糖推移および体調変化の有無を確認。








【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_improved｜title=DPP4阻害薬 減量（症状改善）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、検査値が改善したため減量となった。
O
DPP4阻害薬　減量
A
DPP4阻害薬は、血糖推移を踏まえ減量となった。減量後に血糖が上昇する可能性があるため、注意が必要である。
P
DPP4阻害薬は、減量により血糖値が上がることがあります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_low_perceived_effect｜title=DPP4阻害薬 減量（効果実感乏しい）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、効果の実感が乏しいため減量を希望された。
O
DPP4阻害薬　減量
A
DPP4阻害薬は、患者希望を踏まえ減量となった。減量後の血糖推移に注意が必要である。
P
DPP4阻害薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_adjustment｜id=dose_decrease_due_to_other_med_adjustment｜title=DPP4阻害薬 減量（他剤との調整）｜scenarioRequiredTags=[dpp4_standard_titration]】
S
DPP4阻害薬は、他剤変更に伴う調整のため減量となった。
O
DPP4阻害薬　減量
A
DPP4阻害薬は、併用薬変更に伴う血糖調整のため減量となった。減量後の血糖推移に注意が必要である。
P
DPP4阻害薬は、減量により血糖値が上昇する可能性があります。
体調変化があればご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_hypo_none｜title=DPP4阻害薬 副作用なし（低血糖）】
S
DPP4阻害薬を服用して症状は落ち着いている。
ふらつき・冷汗・動悸などの低血糖症状は認めない。
O
DPP4阻害薬　処方
A
DPP4阻害薬による低血糖は現時点で認められず、治療継続が可能である。
P
DPP4阻害薬の継続中に、ふらつき・冷汗・動悸などの低血糖症状が出ることがあります。
単剤では低血糖は起こりにくい薬ですが、他の糖尿病薬と併用中は低血糖が起こることがあります。
症状が出た場合は、まずブドウ糖を摂取して対処してください。ブドウ糖がない場合は、糖分を含む飲食物で対応してください。
改善しない場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。




【ADDON｜type=lifestyle_guidance｜id=addon_glycemic_guidance_followup｜title=生活指導（血糖指導）】
A_APPEND
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
高血糖が持続すると、網膜症・腎症・神経障害などの合併症が生じる可能性があります。
食事療法および運動療法は、血糖コントロールを維持するうえで重要な柱となります。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖が改善してきた際には低血糖症状が出ることがあります。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hypertension_guidance｜title=生活指導（血圧）】
S_APPEND
血圧が高いと言われた。
A_APPEND
血圧コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
血圧が高い状態が続くと、心臓や血管へ負担がかかることがあります。
食事療法や運動療法は、血圧のコントロールにおいて重要です。
塩分の摂りすぎに注意しましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_dyslipidemia_guidance｜title=生活指導（脂質）】
S_APPEND
脂質が高いと言われた。
A_APPEND
脂質コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P_APPEND
脂質が高い状態が続くと、動脈硬化のリスクが高まることがあります。
食事療法や運動療法は、脂質のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。


【ADDON｜type=lifestyle_guidance｜id=addon_hyperuricemia_guidance｜title=生活指導（尿酸）】
S_APPEND
尿酸が高いと言われた。
A_APPEND
尿酸コントロールが不十分であり、食事療法および生活習慣の見直しが必要である。
P_APPEND
尿酸が高い状態が続くと、痛風発作などにつながることがあります。
食事療法は、尿酸のコントロールにおいて重要です。
食生活の見直しを継続していきましょう。
気になることがあればご相談ください。






【SCENARIO｜type=side_effect｜id=se_constipation_none｜title=DPP4阻害薬 副作用なし（便秘）】
S
DPP4阻害薬を服用して症状は落ち着いている。
便秘は認めない。
O
DPP4阻害薬　処方
A
DPP4阻害薬による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP4阻害薬の継続中に、お腹の調子が悪くなることがあります。
便秘が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_abdominal_distension_none｜title=DPP4阻害薬 副作用なし（腹部膨満感）】
S
DPP4阻害薬を服用して症状は落ち着いている。
お腹が張った感じは認めない。
O
DPP4阻害薬　処方
A
DPP4阻害薬による消化器症状は現時点で認められず、治療継続が可能である。
P
DPP4阻害薬の継続中に、お腹の調子が悪くなることがあります。
お腹の張りが続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_pancreatitis_none｜title=DPP4阻害薬 副作用なし（膵炎）】
S
DPP4阻害薬を服用して症状は落ち着いている。
強い腹痛や背部痛などの症状は認めない。
O
DPP4阻害薬　処方
A
DPP4阻害薬による膵炎は現時点で認められず、治療継続が可能である。
P
DPP4阻害薬の継続中に、強い腹痛や背中に響く痛みが出ることがあります。
こうした症状が続く場合は膵炎の可能性があります。
痛みが強い・発熱を伴う・我慢できないほどの場合は、救急受診も検討してください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_bullous_pemphigoid_none｜title=DPP4阻害薬 副作用なし（類天疱瘡）】
S
DPP4阻害薬を服用して症状は落ち着いている。
かゆみや湿疹、水ぶくれなどの症状は認めない。
O
DPP4阻害薬　処方
A
DPP4阻害薬による皮膚症状は現時点で認められず、治療継続が可能である。
P
DPP4阻害薬の継続中に、かゆみや湿疹、水ぶくれなどが出ることがあります。
こうした症状が続く場合はご相談ください。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_good｜title=DPP4阻害薬 CP良好】
S
薬を服用して症状は落ち着いている。
継続して服用できている。
O
DPP4阻害薬　服用中
A
コンプライアンスは良好である。治療継続に問題はない。
P
引き続き用法を守って服用することで、血糖コントロールの維持および合併症予防が期待できます。
今後も継続して服用できるようにすることが大切です。
P_ADDON
- addon_glycemic_guidance_followup
- addon_hyperkalemia_guidance
- addon_hypertension_guidance
- addon_dyslipidemia_guidance
- addon_hyperuricemia_guidance
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_missed_doses｜title=DPP4阻害薬 CP不良（服薬忘れ）】
S
服薬忘れがみられる。
継続して服用できていない。
O
DPP4阻害薬　服用中
A
コンプライアンスは不良で、服薬忘れがみられる。
P
継続して服用することで血糖コントロールの維持が期待されます。
服薬忘れが続くと血糖値が不安定となる可能性があります。
P_ADDON
- addon_adherence_reminder_alarm
- addon_adherence_reminder_app
- addon_adherence_visual_calendar_checklist
- addon_adherence_visual_note
- addon_adherence_prep_previous_night
- addon_adherence_prep_before_meal
- addon_adherence_support_family_reminder
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_alarm｜title=服薬忘れ対策（通知：アラーム）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、アラームを服薬時間に合わせて設定しておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_reminder_app｜title=服薬忘れ対策（通知：服薬アプリ）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、服薬を記録できるアプリを活用する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_calendar_checklist｜title=服薬忘れ対策（見える化：お薬カレンダー・チェックリスト）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、お薬カレンダーや服用チェックリストで確認する方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_visual_note｜title=服薬忘れ対策（見える化：貼り紙）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、薬を飲む時間を目立つ場所に書いておく方法があります。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_previous_night｜title=服薬忘れ対策（準備：前夜）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、前夜のうちに翌朝の薬を目につく場所へ準備しておく習慣も役立ちます。


【ADDON｜type=adherence_guidance｜id=addon_adherence_prep_before_meal｜title=服薬忘れ対策（準備：食前）｜uiVariant=rightAccentBlue】
P_APPEND
飲み忘れを防ぐ方法の一つとして、食事の前に薬を目につく場所へ準備しておく習慣も役立ちます。


【ADDON｜type=adherence_guidance｜id=addon_adherence_support_family_reminder｜title=服薬忘れ対策（支援：家族などの声掛け）｜uiVariant=rightAccentLavender】
P_APPEND
飲み忘れを防ぐ方法の一つとして、家族や身近な方に服薬したか声をかけてもらう方法があります。






【SCENARIO｜type=adherence｜id=cp_poor_self_adjust｜title=DPP4阻害薬 CP不良（自己判断）】
S
自己判断での服用調整がみられる。
用法どおりの継続服用ができていない。
O
DPP4阻害薬　服用中
A
コンプライアンスは不良で、自己判断による調整がみられる。
P
継続して服用することで血糖コントロールが安定し、合併症予防につながります。
自己判断での中止・調整により血糖値が不安定となり、十分な治療効果が得られない可能性があります。
体調変化や気になる症状がある場合は、自己判断せず医療機関へご相談ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=adherence｜id=cp_poor_visit_delay｜title=DPP4阻害薬 CP不良（受診遅延）】
S
都合により受診遅延がみられる。
継続した服用に不安がある。
O
DPP4阻害薬　服用中
A
コンプライアンスは不良で、受診遅延がみられる。
P
継続的な服用が血糖コントロールの維持と合併症予防につながります。
治療が中断すると血糖値が悪化する可能性があります。
次回受診が難しい場合は、早めに医療機関へご連絡ください。
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_improved｜title=DPP4阻害薬 終了（改善）】
S
DPP4阻害薬は、血糖コントロールが改善したため中止となった。
O
DPP4阻害薬　処方終了
A
DPP4阻害薬は、血糖コントロールの改善により終了となった。終了後に血糖が変動する可能性があるため、注意が必要である。
P
DPP4阻害薬終了後、血糖上昇や体調変化がある場合はご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_insufficient_effect｜title=DPP4阻害薬 終了（効果不十分）】
S
DPP4阻害薬は、効果不十分のため中止となった。
O
DPP4阻害薬　処方終了
A
DPP4阻害薬は、効果不十分のため終了となった。血糖管理の再評価が必要である。
P
DPP4阻害薬終了後、血糖が上昇する可能性があります。
次の治療方針については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。






【SCENARIO｜type=treatment_end｜id=end_ineffective｜title=DPP4阻害薬 終了（無効）】
S
DPP4阻害薬は、効果が認められなかったため中止となった。
O
DPP4阻害薬　処方終了
A
DPP4阻害薬は、効果が認められなかったため終了となった。治療方針の変更が必要である。
P
DPP4阻害薬終了後、血糖が上昇する可能性があります。
代替治療については処方医にご相談ください。
P_CLOSING
次回、治療経過および体調変化の有無を確認。








【SCENARIO｜type=side_effect｜id=se_mild_continue｜title=DPP4阻害薬 SE継続（軽症）】
S
DPP4阻害薬の服用により便秘やお腹が張った感じなどがあるが、日常生活は送れている。
O
DPP4阻害薬　処方
A
DPP4阻害薬による消化器症状を軽度認めるが、治療継続が可能である。
P
DPP4阻害薬による症状が軽い場合は、水分摂取や食事内容を無理のない範囲で見直すことで改善することがあります。
便秘やお腹が張った感じなどの症状が強く続く場合は、薬の調整が必要になることがあります。
ご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_moderate_consider_dr｜title=DPP4阻害薬 SE継続（中等度）】
S
DPP4阻害薬の服用により便秘やお腹が張った感じが強く、辛いことがあるが、日常生活は送れている。
O
DPP4阻害薬　処方
A
DPP4阻害薬による消化器症状が強く、継続困難の可能性があるため対応を要する。
P
DPP4阻害薬による症状が強い場合は、水分を十分に摂取し、無理のない範囲で食事内容を見直して様子をみてください。
症状が強く続く場合は、薬の調整や変更が必要になることがあります。
自己判断せず、処方医へご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_change_due_to_gi_symptoms｜title=DPP4阻害薬 SE変更（消化器症状）】
S
DPP4阻害薬の服用により便秘やお腹が張った感じが出現したため、他剤へ変更となった。
O
DPP4阻害薬　処方変更
A
DPP4阻害薬の服用による消化器症状を認め、他剤変更後の経過確認を要する。
P
DPP4阻害薬の変更後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_dose_decrease_due_to_gi_symptoms｜title=DPP4阻害薬 SE減量（消化器症状）】
S
DPP4阻害薬の服用により便秘やお腹が張った感じがひどいため、減量となった。
O
DPP4阻害薬　減量
A
DPP4阻害薬の服用による消化器症状を認め、減量後の経過確認を要する。
P
DPP4阻害薬の減量後も消化器症状が続く場合はご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=side_effect｜id=se_stop_due_to_gi_symptoms｜title=DPP4阻害薬 SE中止（消化器症状）】
S
DPP4阻害薬の服用により便秘やお腹が張った感じがひどいため、中止となった。
O
DPP4阻害薬　処方中止
A
DPP4阻害薬の服用による消化器症状を認め、中止後の経過確認を要する。
P
DPP4阻害薬の中止後、血糖上昇や体調変化があればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperglycemia｜title=DPP4阻害薬 生活指導（血糖）】
S
血糖値がなかなか改善しない。
O
DPP4阻害薬　処方
A
血糖コントロールが不十分であり、食事・運動療法の継続と生活習慣の見直しが必要である。
P
高血糖が続くと、眼・腎・神経障害などのリスクが高まります。
薬物療法に加え、食事・運動療法も血糖コントロールにおいて重要です。
間食や食事量の変化は血糖値に影響するため、食事内容の見直しを継続していきましょう。
血糖コントロールの改善に伴い、低血糖症状が出ることがあります。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=lifestyle_guidance｜id=lifestyle_guidance_hyperkalemia｜title=DPP4阻害薬 生活指導（カリウム）】
S
カリウムの値が高いと言われた。
O
DPP4阻害薬　処方
A
カリウムコントロールが不十分であり、食事内容の見直しが必要である。
P
カリウムが高い状態が続くと、心臓へ負担がかかることがあります。
食事療法は、カリウムのコントロールにおいて重要です。
カリウムを多く含む食品の摂りすぎに注意しましょう。
気になることがあればご相談ください。
P_CLOSING
次回、治療経過および副作用の有無を確認。






【SCENARIO｜type=sickday｜id=sickday｜title=DPP4阻害薬 シックデイ】
S
発熱・嘔吐・下痢などの体調不良がみられる。
O
DPP4阻害薬　服用中
A
食事摂取低下および消化器症状により脱水リスクが上昇している。併用薬によっては低血糖リスクもあり、シックデイ時の対応に注意が必要である。
P
発熱・嘔吐・下痢などで食事や水分が十分に摂れない場合は、脱水や低血糖のリスクが高まります。
血糖測定が可能であれば行ってください。
水分は少量ずつこまめに摂取してください。
治療継続の可否は体調や摂取状況によって異なります。
自己判断せず、処方医に相談してください。
嘔吐が続く、水分が摂れない、尿量が減る、強い倦怠感がある場合は受診してください。
P_ADDON
- addon_sickday_hold_sglt2_metformin
P_CLOSING
次回、引き続き使用できているか、副作用の有無を確認。


【ADDON｜type=sickday_guidance｜id=addon_sickday_hold_sglt2_metformin｜title=シックデイ時併用薬注意】
P_APPEND
併用中のSGLT2阻害薬やメトホルミンは、脱水時は休薬が必要な場合があります。
自己判断で中止せず、処方医へご相談ください。
=======SCENARIOS_END=======
