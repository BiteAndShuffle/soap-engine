'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import styles from './page.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SOAPSections { S: string; O: string; A: string; P: string }

interface Chip {
  id: string
  label: string
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray'
  soap: SOAPSections
}

interface Primary {
  id: string
  label: string
  color: 'positive' | 'negative' | 'neutral'
  chips: Chip[]
  defaultSoap: SOAPSections
}

// ─── GLP-1 Template Data ─────────────────────────────────────────────────────

const PRIMARIES: Primary[] = [
  {
    id: 'initial', label: '初回', color: 'neutral',
    defaultSoap: {
      S: '[薬剤名] 導入目的で初回受診。肥満症・2型糖尿病（または肥満関連疾患）の管理目的。現在の主な訴え：[症状]。既往歴・アレルギー：[記載]。',
      O: 'BMI [__] kg/m²。体重 [__] kg。腹囲 [__] cm。BP [__]/[__] mmHg。HbA1c [__%]。eGFR [__]。甲状腺疾患・膵炎の既往なし。',
      A: 'GLP-1受容体作動薬の適応あり。禁忌（甲状腺髄様癌の個人・家族歴、MEN2）なし。患者は治療内容・期待される効果・主な副作用について説明を受け同意。',
      P: '[薬剤名] [開始用量] を[投与経路・頻度]にて開始。[期間]後に[次用量]へ増量予定。注射手技・保管方法・低血糖対応について指導。悪心・嘔吐・腹部不快感が持続する場合は受診。[期間]後再診。',
    },
    chips: [
      { id: 'initial:ozempic', label: 'オゼンピック®', color: 'blue',
        soap: { S: 'セマグルチド（オゼンピック®）導入目的で初回受診。食欲抑制・血糖管理の改善を希望。現在の主な訴え：[症状]。', O: 'BMI [__] kg/m²。体重 [__] kg。HbA1c [__%]。eGFR [__]。禁忌項目なし。', A: 'セマグルチド（オゼンピック®）の適応あり。週1回注射製剤。血糖降下・体重減少の二重効果を説明。', P: 'オゼンピック® 0.25mg 週1回より皮下注射にて開始。4週後に0.5mgへ増量予定。注射手技・保管（冷蔵）・低血糖対応を指導。4週後再診。' } },
      { id: 'initial:victoza', label: 'ビクトーザ®', color: 'blue',
        soap: { S: 'リラグルチド（ビクトーザ®）導入目的で初回受診。現在の主な訴え：[症状]。', O: 'BMI [__] kg/m²。体重 [__] kg。HbA1c [__%]。eGFR [__]。禁忌項目なし。', A: 'リラグルチド（ビクトーザ®）の適応あり。毎日注射製剤。用量漸増スケジュールを説明。', P: 'ビクトーザ® 0.6mg 1日1回皮下注射で開始。1週後に1.2mgへ増量。最大用量1.8mg。注射手技・副作用モニタリングを指導。2週後再診。' } },
      { id: 'initial:trulicity', label: 'トルリシティ®', color: 'blue',
        soap: { S: 'デュラグルチド（トルリシティ®）導入目的で初回受診。週1回製剤を希望。現在の主な訴え：[症状]。', O: 'BMI [__] kg/m²。体重 [__] kg。HbA1c [__%]。eGFR [__]。禁忌項目なし。', A: 'デュラグルチド（トルリシティ®）の適応あり。オートインジェクター型で自己注射が容易。', P: 'トルリシティ® 0.75mg 週1回より開始。4週後に1.5mgへ増量。注射手技・保管・副作用について指導。4週後再診。' } },
      { id: 'initial:rybelsus', label: 'リベルサス®', color: 'blue',
        soap: { S: 'セマグルチド内服（リベルサス®）導入目的で初回受診。注射を希望しない。現在の主な訴え：[症状]。', O: 'BMI [__] kg/m²。体重 [__] kg。HbA1c [__%]。eGFR [__]。禁忌項目なし。', A: '内服GLP-1受容体作動薬（リベルサス®）の適応あり。注射不要。空腹時服用の重要性を説明。', P: 'リベルサス® 3mg 1日1回、起床後空腹時に水のみで内服開始。4週後に7mgへ増量。服用方法・食事制限（服用後30分は飲食禁止）を指導。4週後再診。' } },
    ],
  },
  {
    id: 'increase', label: '増量', color: 'positive',
    defaultSoap: {
      S: '前回からの経過は概ね良好。体重・血糖は一定の改善を認めるが目標値まで至らず。副作用の新たな訴えなし。増量の意向あり。',
      O: '体重 [__] kg（前回比 [±__] kg）。BMI [__]。BP [__]/[__]。HbA1c [__%]。忍容性良好。',
      A: '現用量での治療的有効性を確認。忍容性良好につき次段階への増量が適切と判断。',
      P: '[薬剤名] を [現在量] から [新用量] へ増量。増量後の副作用モニタリング（悪心・嘔吐・腹部症状）を指導。[期間]後に効果・忍容性を評価のため再診。',
    },
    chips: [
      { id: 'inc:0.25-0.5', label: '0.25→0.5mg', color: 'green',
        soap: { S: 'セマグルチド0.25mg 4週間使用後の受診。忍容性良好。副作用の訴えなし。効果向上のため増量を希望。', O: '体重 [__] kg。BP [__]/[__]。HbA1c [__%]。悪心・嘔吐なし。', A: '0.25mg忍容性良好。標準スケジュール通り0.5mgへ増量が適切。', P: 'オゼンピック® 0.5mg 週1回へ増量。増量後の消化器症状に注意するよう指導。4週後再診。' } },
      { id: 'inc:0.5-1', label: '0.5→1mg', color: 'green',
        soap: { S: 'セマグルチド0.5mg 使用中。忍容性良好。目標体重・HbA1cに未到達のため増量希望。副作用の新たな訴えなし。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。BP [__]/[__]。消化器症状なし。', A: '0.5mgで良好な忍容性を確認。体重・血糖目標向けさらなる効果が期待されるため1mgへ増量。', P: 'オゼンピック® 1mg 週1回へ増量。4週間の反応評価後、必要時2mgへの増量を検討。副作用出現時は受診するよう指導。4週後再診。' } },
      { id: 'inc:1-2', label: '1→2mg', color: 'green',
        soap: { S: 'セマグルチド1mg 使用中。忍容性良好。体重・血糖コントロールのさらなる改善を目指し最大用量への増量を希望。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。消化器症状なし。', A: '1mg忍容性良好。最大用量2mgへの増量により追加的な体重・血糖改善が期待される。', P: 'オゼンピック® 2mg 週1回へ増量（最大用量）。体重・血糖・副作用を継続モニタリング。8週後再診。' } },
      { id: 'inc:victoza-0.6-1.2', label: 'ビクトーザ 0.6→1.2', color: 'green',
        soap: { S: 'リラグルチド0.6mg 1週間使用後の受診。忍容性良好。効果向上のため標準用量への増量を希望。', O: '体重 [__] kg。HbA1c [__%]。消化器症状なし。', A: '0.6mg忍容性良好。標準維持用量1.2mgへ増量。', P: 'ビクトーザ® 1.2mg 1日1回へ増量。最大用量1.8mgへの増量も今後検討。副作用出現時は受診するよう指導。2週後再診。' } },
    ],
  },
  {
    id: 'decrease', label: '減量', color: 'neutral',
    defaultSoap: {
      S: '体重・血糖コントロールは良好に維持。副作用軽減または曝露最小化のため減量を検討。',
      O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。現用量での忍容性：[良好/不良]。',
      A: '減量適応あり。副作用軽減または曝露最小化の観点から前用量への減量が妥当。治療目標の再評価が必要。',
      P: '[薬剤名] を [現在量] から [新用量] へ減量。症状再燃または血糖悪化時は受診するよう指導。[期間]後に効果を再評価のため再診。',
    },
    chips: [
      { id: 'dec:ae', label: '副作用で減量', color: 'orange',
        soap: { S: '現用量での副作用（悪心・嘔吐・腹部不快感）が持続しQOLに影響。治療継続のため減量を希望。', O: '体重 [__] kg。副作用症状：[悪心/嘔吐/腹部膨満/その他]。脱水所見 [あり/なし]。', A: '副作用による忍容性不良。前用量への減量で副作用軽減を図る。治療継続のために忍容性改善を優先。', P: '[薬剤名] を [現在量] から [新用量] へ減量。少なくとも4週間新用量で評価後、忍容性改善を確認してから再増量を検討。副作用持続時は受診するよう指導。4週後再診。' } },
      { id: 'dec:goal', label: '目標達成で減量', color: 'green',
        soap: { S: '目標体重を達成。現在の体重を維持しながら最小有効量での治療継続を希望。', O: '体重 [__] kg（目標達成）。BMI [__]。HbA1c [__%]（目標範囲内）。', A: '治療目標達成。最小有効量へ減量し長期維持療法へ移行。体重リバウンドのモニタリングが重要。', P: '[薬剤名] を [現在量] から [新用量] へ減量。3ヶ月ごとに体重・血糖をモニタリング。体重3kg以上増加した場合は増量を再検討。次回8週後。' } },
    ],
  },
  {
    id: 'no-ae', label: '副作用なし', color: 'positive',
    defaultSoap: {
      S: '[薬剤名] 使用中。副作用の訴えなし。忍容性良好。体重・食欲に満足している。',
      O: '体重 [__] kg（前回比 [±__] kg）。BP [__]/[__]。HbA1c [__%]。消化器症状なし。注射部位反応なし。',
      A: '忍容性良好。治療継続が適切。体重・血糖管理に引き続き有効。',
      P: '[薬剤名] [現在量] を継続。生活習慣指導を継続。[期間]後に体重・血糖をモニタリングのため再診。',
    },
    chips: [
      { id: 'no-ae:cont', label: '現用量継続', color: 'green',
        soap: { S: '[薬剤名] 使用中。副作用なし。体重・血糖コントロール良好。現用量での継続を希望。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。消化器症状なし。', A: '現用量での治療有効性・忍容性ともに良好。現状維持。', P: '[薬剤名] [現在量] を継続。次回受診は [期間] 後。' } },
      { id: 'no-ae:up', label: '増量も検討', color: 'blue',
        soap: { S: '[薬剤名] 使用中。副作用なし。体重・血糖のさらなる改善を望み、増量について相談。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。消化器症状なし。増量の余地あり。', A: '忍容性良好。副作用なく目標値未達成のため増量を検討。', P: '[薬剤名] を [現在量] から [新用量] へ増量。増量後の消化器症状モニタリングを指導。4週後再診。' } },
    ],
  },
  {
    id: 'ae', label: '副作用あり', color: 'negative',
    defaultSoap: {
      S: '[薬剤名] 使用中。副作用の訴えあり：[症状]。日常生活への影響：[あり/なし]。対症療法として [対応] を試みた。',
      O: '体重 [__] kg。BP [__]/[__]。脱水所見 [あり/なし]。腹部所見：[所見]。',
      A: '副作用はGLP-1受容体作動薬に関連している可能性が高い。重症度：[軽度/中等度/重度]。対応を要する。',
      P: '副作用の種類・重症度に応じて対応。[減量/投与間隔延長/投与一時中断/中止] を検討。',
    },
    chips: [
      { id: 'ae:nausea', label: '悪心・嘔吐', color: 'red',
        soap: { S: '[薬剤名] 開始後より悪心・嘔吐が出現。食事摂取に影響あり。脂っこい食事・過食で増悪。少量頻回食で一部改善。', O: '体重 [__] kg（前回比 [±__] kg）。脱水所見 [あり/なし]。腹部：軽度圧痛 [あり/なし]。嘔吐回数：[__]/日。', A: '悪心・嘔吐はGLP-1受容体作動薬による消化器系副作用として矛盾しない。重症度：[軽度/中等度]。脱水・栄養障害の評価が必要。', P: '食事指導（少量頻回・高脂肪食回避・ゆっくり摂食）を強化。必要に応じ [薬剤名] を [現在量] から [前用量] へ減量。制吐薬（メトクロプラミド等）の使用を検討。脱水が疑われる場合は輸液を考慮。4週後再評価。' } },
      { id: 'ae:constipation', label: '便秘', color: 'red',
        soap: { S: '[薬剤名] 使用開始後より便秘が出現または増悪。排便回数 [__] 回/週。腹部膨満感を伴う。', O: '体重 [__] kg。腹部：[膨満/軽度圧痛/腸蠕動音低下]。直腸診は [施行/未施行]。', A: '便秘はGLP-1受容体作動薬による腸管蠕動抑制に関連している可能性が高い。腸閉塞の除外が必要。', P: '水分摂取増量・食物繊維摂取を指導。緩下薬（酸化マグネシウム等）を追加または増量。症状が改善しない場合は [薬剤名] の減量を検討。腹痛が著明な場合は腸閉塞除外のため検査を考慮。4週後再診。' } },
      { id: 'ae:injection', label: '注射部位反応', color: 'orange',
        soap: { S: '[薬剤名] の注射部位に発赤・腫脹・掻痒感が出現。投与後 [__] 時間で出現し [__] 日で改善する傾向。', O: '注射部位：発赤 [+/-]、腫脹 [+/-]、硬結 [+/-]、壊死 [+/-]。全身反応なし。', A: '注射部位反応は軽度の局所炎症反応として考えられる。注射手技・部位のローテーションを再確認。', P: '注射部位のローテーション（腹部・大腿・上腕を交互に使用）を指導。同一部位への連続注射を回避。硬結部位への投与を禁止。症状が改善しない場合または全身反応が出現した場合は受診するよう指導。4週後再診。' } },
      { id: 'ae:pancreatitis', label: '膵炎疑い', color: 'purple',
        soap: { S: '[薬剤名] 使用中に上腹部痛・背部放散痛が出現。悪心・嘔吐を伴う。食事摂取後に増悪。', O: '体重 [__] kg。腹部：上腹部圧痛 [+/-]。リパーゼ [__] U/L（基準値上限の [__] 倍）。アミラーゼ [__] U/L。', A: 'GLP-1受容体作動薬による膵炎の可能性を否定できない。リパーゼ・画像検査による精査が必要。', P: '[薬剤名] を即時中止。膵炎の精査（腹部CT、膵酵素の経時的モニタリング）を実施。入院適応を検討。GLP-1受容体作動薬は再開禁忌。膵炎が否定された場合は代替薬を検討。' } },
    ],
  },
  {
    id: 'cp-good', label: 'CP良', color: 'positive',
    defaultSoap: {
      S: '[薬剤名] 使用中。コンプライアンス良好。注射を忘れることなく使用継続。生活習慣改善にも取り組んでいる。',
      O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。BP [__]/[__]。臨床的に安定。',
      A: 'コンプライアンス良好。治療目標に向けて順調に経過。継続支援が重要。',
      P: '[薬剤名] [現在量] を継続。良好なコンプライアンスを維持するよう激励。生活習慣指導を継続。[期間]後再診。',
    },
    chips: [
      { id: 'cp-good:track', label: '目標通り経過', color: 'green',
        soap: { S: '[薬剤名] を忘れずに使用。食事・運動療法も継続。体重・食欲ともに改善傾向で治療に満足している。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。コンプライアンス：定期注射を確実に実施。', A: '良好なコンプライアンスのもと治療目標に向け順調に経過。現状維持。', P: '[薬剤名] [現在量] を継続。引き続き定期注射・生活習慣改善を指導。次回 [期間] 後に体重・血糖を評価のため再診。' } },
      { id: 'cp-good:encourage', label: '激励・継続', color: 'blue',
        soap: { S: '[薬剤名] 使用継続中。体重減少の実感があり、治療継続の意欲が高い。副作用の訴えなし。', O: '体重 [__] kg（開始時比 -[__] kg）。HbA1c [__%]。BP [__]/[__]。', A: '治療効果を認め患者の意欲も高い。このまま継続することで目標達成が見込まれる。', P: '[薬剤名] [現在量] を継続。体重・血糖の改善を継続的にフィードバックし動機づけを維持。次回 [期間] 後再診。' } },
    ],
  },
  {
    id: 'cp-poor', label: 'CP不良', color: 'negative',
    defaultSoap: {
      S: '[薬剤名] を処方されているが投与を忘れることが多い。理由：[コスト/副作用/忘れ/注射への抵抗感/その他]。',
      O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。コンプライアンス不良が疑われる。',
      A: 'コンプライアンス不良。原因の同定と対策が必要。治療効果が不十分となっている可能性がある。',
      P: 'コンプライアンス不良の原因を確認し対策を立案。[副作用対応/コスト相談/注射指導強化/リマインダー設定] を実施。必要に応じ内服薬への切り替えを検討。4週後再診。',
    },
    chips: [
      { id: 'cp-poor:cost', label: 'コスト問題', color: 'purple',
        soap: { S: '[薬剤名] の自己負担額が家計に影響しており継続が困難と感じている。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。', A: '経済的負担によるコンプライアンス不良。費用対効果の高い代替手段を検討する必要がある。', P: '内服GLP-1薬（リベルサス®等）への切り替えを検討。ジェネリック・処方箋薬局の確認を提案。社会資源（医療費助成制度等）の情報提供。次回4週後再診。' } },
      { id: 'cp-poor:needle', label: '注射恐怖', color: 'purple',
        soap: { S: '注射への恐怖心・抵抗感から投与を回避していることがある。痛みへの不安が強い。', O: '注射手技を再確認。部位の選択・手順の問題点を評価。', A: '針恐怖症によるコンプライアンス不良。心理的サポートと手技の再教育が必要。', P: '細針（32G以上）への変更を検討。自動投与デバイスの使用を提案。注射手技の再指導（アイスパック冷却等の疼痛軽減策）。内服GLP-1薬（リベルサス®）への切り替えも選択肢。4週後再診。' } },
      { id: 'cp-poor:forget', label: 'うっかり忘れ', color: 'red',
        soap: { S: '週1回の注射を忘れることがある。リマインダーは設定していない。忙しい日が続くと特に忘れがち。', O: '体重 [__] kg。HbA1c [__%]。忘れた場合の対応（5日以内なら投与可）を確認。', A: 'うっかり忘れによるコンプライアンス不良。習慣化のサポートが必要。', P: 'スマートフォンのリマインダー設定を指導（毎週同じ曜日・時間）。注射忘れ時の対応（次回投与まで5日以上ある場合は投与可）を再確認。注射カレンダーの活用を提案。4週後再診。' } },
    ],
  },
  {
    id: 'end', label: '終了', color: 'neutral',
    defaultSoap: {
      S: '[薬剤名] の中止を希望。理由：[副作用/目標達成/コスト/その他]。',
      O: '体重 [__] kg（治療開始時比 [±__] kg）。HbA1c [__%]。',
      A: '中止は [患者希望/医学的理由] による。中止後の体重リバウンドおよび血糖悪化のリスクについて説明。',
      P: '[薬剤名] を中止。中止後の体重・血糖モニタリングを継続。生活習慣療法を強化。体重が増加した場合は再開を検討することを説明。3ヶ月後に再評価のため受診。',
    },
    chips: [
      { id: 'end:goal', label: '目標達成で終了', color: 'green',
        soap: { S: '目標体重・HbA1cを達成。[薬剤名] を中止し生活習慣療法のみで管理する方針に同意。', O: '体重 [__] kg（目標達成）。BMI [__]。HbA1c [__%]（目標範囲内）。', A: '治療目標達成により薬物療法の中止が可能と判断。中止後のリバウンド予防が重要。', P: '[薬剤名] を中止。食事・運動療法を継続。3ヶ月後に体重・HbA1cを評価のため再診。3kg以上体重増加した場合は再開を検討することを説明。' } },
      { id: 'end:intol', label: '副作用で中止', color: 'red',
        soap: { S: '[薬剤名] による副作用（[症状]）が改善せず治療継続が困難。中止を希望。', O: '体重 [__] kg。副作用所見：[所見]。症状の重症度：[軽度/中等度/重度]。', A: '副作用による忍容性不良のため中止。代替治療の検討が必要。', P: '[薬剤名] を中止。副作用症状の経過を観察。代替療法（[内服GLP-1薬/SGLT2阻害薬/その他]）を検討。副作用が改善しない場合は精査を考慮。4週後再診。' } },
      { id: 'end:cost', label: 'コストで中止', color: 'purple',
        soap: { S: '[薬剤名] の継続費用が困難なため中止を希望。治療効果自体には満足していた。', O: '体重 [__] kg（治療開始時比 [±__] kg）。HbA1c [__%]。', A: '経済的理由による治療中止。より費用対効果の高い代替手段の提供が重要。', P: '[薬剤名] を中止。リベルサス® 等の内服GLP-1薬または他の低コスト代替薬を提案。生活習慣療法の強化を指導。3ヶ月後再診。' } },
    ],
  },
  {
    id: 'self-adjust', label: '自己調整', color: 'negative',
    defaultSoap: {
      S: '患者が指示なく自己判断で投与量・投与間隔を変更していることが判明。理由：[副作用/費用/体重減りすぎ/その他]。',
      O: '体重 [__] kg。HbA1c [__%]。自己調整の内容：[用量変更/投与間隔変更/中断後再開]。',
      A: '自己調整による治療効果の不確実性および安全上のリスクについて評価が必要。原因を探り改善策を立案。',
      P: '自己調整の理由を傾聴し指示通りの使用の重要性を説明。[副作用/コスト/その他の問題] に対する医学的対応を実施。適切な用量・投与方法を再指導。4週後再診。',
    },
    chips: [
      { id: 'sa:under', label: '減らして使用', color: 'red',
        soap: { S: '副作用軽減のために処方量より少ない量を自己判断で使用していた。悪心が怖くて量を減らしていた。', O: '体重 [__] kg（期待より体重減少が少ない）。HbA1c [__%]。消化器症状：現在はなし。', A: '過少投与により治療効果が不十分。副作用への不安が原因と思われる。適切な用量管理が必要。', P: '副作用管理について再説明（食事指導・少量頻回食等）。正規の増量スケジュールに戻す。現在 [新用量] から再開。副作用が出た場合の対処法を指導。4週後再診。' } },
      { id: 'sa:skip', label: '飛ばして使用', color: 'red',
        soap: { S: '費用節約のため週1回ではなく2週に1回投与していた。体重はある程度維持できていると思っていた。', O: '体重 [__] kg（前回比 [±__] kg）。HbA1c [__%]。', A: '投与間隔の延長により血中濃度が不安定になり治療効果が低下。費用の問題に対する現実的な対応策が必要。', P: '週1回投与の薬物動態的根拠を説明。費用軽減策（内服GLP-1薬/助成制度）を情報提供。正規の週1回投与に戻すよう指導。4週後再診。' } },
    ],
  },
  {
    id: 'other', label: 'その他', color: 'neutral',
    defaultSoap: {
      S: '定期受診。特記事項：[内容]。[薬剤名] 使用中。',
      O: '体重 [__] kg（前回比 [±__] kg）。BP [__]/[__]。HbA1c [__%]。',
      A: '[臨床的評価を記載]。',
      P: '[薬剤名] [現在量] を継続（または [変更内容]）。[期間] 後再診。',
    },
    chips: [
      { id: 'other:switch', label: '薬剤切り替え', color: 'blue',
        soap: { S: '現在のGLP-1受容体作動薬から別製剤への切り替えを希望。理由：[副作用/効果不足/コスト/利便性]。', O: '体重 [__] kg。HbA1c [__%]。現在使用中：[薬剤名] [用量]。', A: '切り替えの適応あり。[新薬剤名] の特性・用量スケジュールを説明。', P: '[現薬剤名] を中止し [新薬剤名] [開始用量] より開始。切り替え時の注意事項（洗い出し期間の要否等）を説明。4週後に効果・忍容性を評価のため再診。' } },
      { id: 'other:lab', label: '検査結果確認', color: 'gray',
        soap: { S: '定期検査結果の確認受診。自覚症状の変化なし。[薬剤名] 継続中。', O: 'HbA1c [__%]（前回比 [±]）。eGFR [__]。肝機能：[正常/異常]。リパーゼ [__]（正常範囲内/異常）。体重 [__] kg。', A: '検査結果は [正常範囲内/一部異常あり]。[異常値がある場合の評価]。[薬剤名] 継続に問題なし（または [対応が必要]）。', P: '[薬剤名] [現在量] を継続。[異常値がある場合の対応策]。次回検査は [期間] 後。[期間] 後再診。' } },
      { id: 'other:pregnancy', label: '妊娠・授乳', color: 'purple',
        soap: { S: '妊娠が判明（または妊娠を計画中、または授乳中）。[薬剤名] の継続可否について相談。', O: '妊娠 [__] 週（または妊娠計画中/授乳中）。体重 [__] kg。BP [__]/[__]。', A: 'GLP-1受容体作動薬は妊娠中・授乳中には安全性が確立されていないため中止が原則。血糖管理の代替手段が必要。', P: '[薬剤名] を即時中止。産婦人科・内分泌科へのコンサルトを検討。妊娠中の血糖管理としてインスリン療法を検討。産後に再開の可否を評価。' } },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHIP_COLOR_CLASS: Record<string, string> = {
  blue: styles.chipBlue, green: styles.chipGreen, red: styles.chipRed,
  purple: styles.chipPurple, orange: styles.chipOrange, gray: styles.chipGray,
}
const PRIMARY_COLOR_CLASS: Record<string, string> = {
  positive: styles.primaryPositive,
  negative: styles.primaryNegative,
  neutral: styles.primaryNeutral,
}
const SOAP_KEYS: Array<keyof SOAPSections> = ['S', 'O', 'A', 'P']
const SOAP_LABEL: Record<keyof SOAPSections, string> = {
  S: 'S（主観）', O: 'O（客観）', A: 'A（評価）', P: 'P（計画）',
}

function buildFullSOAP(soap: SOAPSections, drug: string, label: string): string {
  const drugStr = drug.trim() ? `薬剤名: ${drug.trim()}\n` : ''
  return [
    `SOAP NOTE  ─  GLP-1 / ${label}`,
    drugStr,
    '=========',
    '',
    'S（主観）:', soap.S, '',
    'O（客観）:', soap.O, '',
    'A（評価）:', soap.A, '',
    'P（計画）:', soap.P, '',
    '---',
    `作成: ${new Date().toLocaleString('ja-JP')}`,
  ].join('\n')
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
}

// ─── Lock screen ─────────────────────────────────────────────────────────────

const LOCK_KEY = 'app_unlock'

function useLock() {
  const enabled = process.env.NEXT_PUBLIC_APP_LOCK === 'true'
  const password = process.env.NEXT_PUBLIC_APP_LOCK_PASSWORD ?? ''
  // null = not yet read from localStorage (avoid SSR mismatch)
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    if (!enabled) { setUnlocked(true); return }
    setUnlocked(localStorage.getItem(LOCK_KEY) === '1')
  }, [enabled])

  const unlock = () => { localStorage.setItem(LOCK_KEY, '1'); setUnlocked(true) }
  const logout = () => { localStorage.removeItem(LOCK_KEY); setUnlocked(false) }

  return { enabled, password, unlocked, unlock, logout }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { enabled, password, unlocked, unlock, logout } = useLock()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const [drug, setDrug] = useState('')
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [soap, setSoap] = useState<SOAPSections>({ S: '', O: '', A: '', P: '' })
  const [appendMode, setAppendMode] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  // Y offset for secondary panel alignment
  const [secondaryOffset, setSecondaryOffset] = useState(0)

  // Refs for DOM measurement
  const sidebarRef = useRef<HTMLElement>(null)
  // Map from primary id → button element
  const primaryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const activePrimary = PRIMARIES.find(p => p.id === primaryId) ?? null

  // Measure and apply Y alignment whenever primaryId changes
  useEffect(() => {
    if (!primaryId) { setSecondaryOffset(0); return }
    // rAF ensures the DOM has painted the active state before measuring
    const raf = requestAnimationFrame(() => {
      const sidebar = sidebarRef.current
      const btn = primaryBtnRefs.current.get(primaryId)
      if (!sidebar || !btn) { setSecondaryOffset(0); return }
      const sidebarRect = sidebar.getBoundingClientRect()
      const btnRect = btn.getBoundingClientRect()
      // offset = how far the button top is from the sidebar top
      const offset = btnRect.top - sidebarRect.top + sidebar.scrollTop
      setSecondaryOffset(Math.max(0, offset))
    })
    return () => cancelAnimationFrame(raf)
  }, [primaryId])

  // Re-measure on window resize
  useEffect(() => {
    const onResize = () => {
      if (!primaryId) return
      const sidebar = sidebarRef.current
      const btn = primaryBtnRefs.current.get(primaryId)
      if (!sidebar || !btn) return
      const sidebarRect = sidebar.getBoundingClientRect()
      const btnRect = btn.getBoundingClientRect()
      setSecondaryOffset(Math.max(0, btnRect.top - sidebarRect.top + sidebar.scrollTop))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [primaryId])

  const flashCopied = (key: string) => {
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  const handlePrimary = useCallback((p: Primary) => {
    setPrimaryId(p.id)
    setSelectedChips([])
    setSoap({ ...p.defaultSoap })
  }, [])

  const handleChip = useCallback((chip: Chip) => {
    setSelectedChips(prev =>
      prev.includes(chip.id) ? prev.filter(c => c !== chip.id) : [...prev, chip.id]
    )
    if (appendMode) {
      setSoap(prev => ({
        S: prev.S + (prev.S && chip.soap.S ? '\n\n' + chip.soap.S : chip.soap.S),
        O: prev.O + (prev.O && chip.soap.O ? '\n\n' + chip.soap.O : chip.soap.O),
        A: prev.A + (prev.A && chip.soap.A ? '\n\n' + chip.soap.A : chip.soap.A),
        P: prev.P + (prev.P && chip.soap.P ? '\n\n' + chip.soap.P : chip.soap.P),
      }))
    } else {
      setSoap({ ...chip.soap })
    }
  }, [appendMode])

  const handleCopySection = async (key: keyof SOAPSections) => {
    await copyText(soap[key])
    flashCopied(key)
  }

  const handleCopyAll = async () => {
    const label = activePrimary
      ? activePrimary.label + (selectedChips.length
          ? ' › ' + activePrimary.chips
              .filter(c => selectedChips.includes(c.id))
              .map(c => c.label).join(', ')
          : '')
      : '—'
    await copyText(buildFullSOAP(soap, drug, label))
    flashCopied('all')
  }

  // Callback ref setter — stores button el into the Map
  const setPrimaryBtnRef = useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) primaryBtnRefs.current.set(id, el)
      else primaryBtnRefs.current.delete(id)
    },
    []
  )

  const hasSoap = SOAP_KEYS.some(k => soap[k].trim())

  // ── Lock gate ────────────────────────────────────────────────────────────────
  if (unlocked === null) return null   // wait for localStorage read

  if (enabled && !unlocked) {
    const noPassword = password === ''
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (noPassword) return
      if (pwInput === password) { unlock(); setPwError(false) }
      else { setPwError(true); setPwInput('') }
    }
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh', background:'#1a1a2e', fontFamily:'system-ui,sans-serif' }}>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.75rem', background:'#24243c', padding:'2rem', borderRadius:'14px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', minWidth:'280px' }}>
          <span style={{ color:'#e8e8ff', fontWeight:800, fontSize:'1rem', letterSpacing:'-0.01em' }}>
            SOAP Engine{' '}
            <span style={{ background:'#0a84ff', color:'#fff', borderRadius:'4px', padding:'1px 6px', fontSize:'0.62rem', fontWeight:700, verticalAlign:'middle', marginLeft:'4px' }}>GLP-1</span>
          </span>
          {noPassword ? (
            <span style={{ color:'#ff9f0a', fontSize:'0.82rem', fontWeight:600 }}>パスワード未設定のため解除できません</span>
          ) : (
            <>
              <input
                type="password"
                autoFocus
                placeholder="パスワードを入力"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                style={{ padding:'0.55rem 0.9rem', borderRadius:'8px', border:`1.5px solid ${pwError ? '#ff453a' : '#3d3d5c'}`, background:'#1a1a2e', color:'#e8e8ff', fontSize:'0.95rem', outline:'none' }}
              />
              {pwError && <span style={{ color:'#ff453a', fontSize:'0.78rem', fontWeight:600 }}>パスワードが正しくありません</span>}
              <button type="submit" style={{ padding:'0.65rem', background:'#0a84ff', color:'#fff', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'0.95rem', cursor:'pointer' }}>
                ロック解除
              </button>
            </>
          )}
        </form>
      </div>
    )
  }
  // ── end lock gate ────────────────────────────────────────────────────────────

  return (
    <div className={styles.layout}>
      {/* ── Topbar ── */}
      <header className={styles.topbar}>
        <span className={styles.topbarTitle}>
          SOAP Engine <span className={styles.topbarBadge}>GLP-1</span>
        </span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="薬剤名 / 疾患 / キーワード"
          value={drug}
          onChange={e => setDrug(e.target.value)}
        />
        {enabled && (
          <button
            onClick={logout}
            style={{ marginLeft:'0.75rem', padding:'0.3rem 0.8rem', background:'transparent', color:'#888', border:'1px solid #444', borderRadius:'6px', fontSize:'0.75rem', cursor:'pointer', whiteSpace:'nowrap' }}
          >
            Logout
          </button>
        )}
      </header>

      <div className={styles.body}>
        {/* ── Col 1: primary buttons ── */}
        <nav className={styles.sidebar} ref={sidebarRef}>
          {PRIMARIES.map(p => (
            <button
              key={p.id}
              ref={setPrimaryBtnRef(p.id)}
              className={[
                styles.primaryBtn,
                PRIMARY_COLOR_CLASS[p.color],
                primaryId === p.id ? styles.primaryActive : '',
              ].join(' ')}
              onClick={() => handlePrimary(p)}
            >
              {p.label}
            </button>
          ))}
        </nav>

        {/* ── Col 2: secondary vertical list ── */}
        <div className={styles.secondaryCol}>
          {activePrimary ? (
            <div
              className={styles.secondaryList}
              style={{ paddingTop: secondaryOffset }}
            >
              <div className={styles.secondaryHeading}>{activePrimary.label}</div>
              {activePrimary.chips.map(chip => (
                <button
                  key={chip.id}
                  className={[
                    styles.secondaryBtn,
                    CHIP_COLOR_CLASS[chip.color ?? 'gray'],
                    selectedChips.includes(chip.id) ? styles.secondaryBtnActive : '',
                  ].join(' ')}
                  onClick={() => handleChip(chip)}
                >
                  {chip.label}
                </button>
              ))}
              {/* Append toggle lives at bottom of secondary panel */}
              <div className={styles.appendRow}>
                <span className={styles.appendText}>Append to SOAP</span>
                <button
                  className={[styles.toggle, appendMode ? styles.toggleOn : ''].join(' ')}
                  onClick={() => setAppendMode(v => !v)}
                  role="switch"
                  aria-checked={appendMode}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.secondaryEmpty}>
              <span>←</span>
            </div>
          )}
        </div>

        {/* ── Col 3: center spacer ── */}
        <div className={styles.center} />

        {/* ── Col 4: SOAP editor ── */}
        <section className={styles.editor}>
          {hasSoap ? (
            <>
              <div className={styles.soapFields}>
                {SOAP_KEYS.map(key => (
                  <div key={key} className={styles.soapField}>
                    <div className={styles.soapFieldHeader}>
                      <span className={styles.soapFieldLabel}>{SOAP_LABEL[key]}</span>
                      <button
                        className={[
                          styles.copySecBtn,
                          copied === key ? styles.copySecBtnDone : '',
                        ].join(' ')}
                        onClick={() => handleCopySection(key)}
                      >
                        {copied === key ? '✓' : `コピー${key}`}
                      </button>
                    </div>
                    <textarea
                      className={styles.soapTextarea}
                      value={soap[key]}
                      rows={key === 'P' ? 5 : 4}
                      onChange={e =>
                        setSoap(prev => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                className={[
                  styles.copyAllBtn,
                  copied === 'all' ? styles.copyAllBtnDone : '',
                ].join(' ')}
                onClick={handleCopyAll}
              >
                {copied === 'all' ? '✓ コピー完了' : '全文コピー'}
              </button>
            </>
          ) : (
            <div className={styles.editorEmpty}>
              <p>パターンを選択するとSOAPが表示されます</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
