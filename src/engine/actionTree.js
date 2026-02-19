// =============================================================================
// GLP-1 Action Tree — FROZEN
// Defines the fixed primary button order and each button's secondary options.
// Do NOT reorder the primary actions — order is clinically intentional.
// =============================================================================

export const ACTION_TREE = [
  {
    id: 'initial',
    label: '初回',
    secondaryOptions: [
      { id: 'default', label: 'テンプレート適用', templateKey: ['初回', 'default'] },
    ],
  },
  {
    id: 'increase',
    label: '増量',
    secondaryOptions: [
      { id: 'planned', label: '予定通り増量', templateKey: ['増量', '予定通り'] },
      { id: 'cautious', label: '慎重増量', templateKey: ['増量', '慎重増量'] },
    ],
  },
  {
    id: 'decrease',
    label: '減量',
    secondaryOptions: [
      { id: 'side_effect', label: '副作用による', templateKey: ['減量', '副作用による'] },
      { id: 'patient_request', label: '患者希望', templateKey: ['減量', '患者希望'] },
    ],
  },
  {
    id: 'no_side_effect',
    label: '副作用なし',
    secondaryOptions: [
      { id: 'default', label: 'テンプレート適用', templateKey: ['副作用なし', 'default'] },
    ],
  },
  {
    id: 'side_effect',
    label: '副作用あり',
    secondaryOptions: [
      { id: 'nausea', label: '嘔気・嘔吐', templateKey: ['副作用あり', '嘔気嘔吐'] },
      { id: 'diarrhea', label: '下痢', templateKey: ['副作用あり', '下痢'] },
      { id: 'constipation', label: '便秘', templateKey: ['副作用あり', '便秘'] },
      { id: 'anorexia', label: '食欲不振', templateKey: ['副作用あり', '食欲不振'] },
      { id: 'injection_site', label: '注射部位反応', templateKey: ['副作用あり', '注射部位反応'] },
      { id: 'other_ae', label: 'その他副作用', templateKey: ['副作用あり', 'その他副作用'] },
    ],
  },
  {
    id: 'good_compliance',
    label: 'CP良',
    secondaryOptions: [
      { id: 'default', label: 'テンプレート適用', templateKey: ['CP良', 'default'] },
    ],
  },
  {
    id: 'poor_compliance',
    label: 'CP不良',
    secondaryOptions: [
      { id: 'forgotten', label: '注射忘れ', templateKey: ['CP不良', '注射忘れ'] },
      { id: 'wrong_usage', label: '用法間違い', templateKey: ['CP不良', '用法間違い'] },
      { id: 'cost', label: 'コスト問題', templateKey: ['CP不良', 'コスト問題'] },
    ],
  },
  {
    id: 'end',
    label: '終了',
    secondaryOptions: [
      { id: 'goal_achieved', label: '目標達成', templateKey: ['終了', '目標達成'] },
      { id: 'ae_end', label: '副作用による', templateKey: ['終了', '副作用による終了'] },
      { id: 'patient_wish', label: '患者希望', templateKey: ['終了', '患者希望'] },
      { id: 'insufficient', label: '効果不十分', templateKey: ['終了', '効果不十分'] },
    ],
  },
  {
    id: 'self_adjust',
    label: '自己調整',
    secondaryOptions: [
      { id: 'self_increase', label: '増量した', templateKey: ['自己調整', '増量した'] },
      { id: 'self_decrease', label: '減量した', templateKey: ['自己調整', '減量した'] },
      { id: 'self_stop', label: '中断した', templateKey: ['自己調整', '中断した'] },
    ],
  },
  {
    id: 'other',
    label: 'その他',
    secondaryOptions: [
      { id: 'free_text', label: 'フリーテキスト', templateKey: ['その他', 'フリーテキスト'] },
    ],
  },
]
