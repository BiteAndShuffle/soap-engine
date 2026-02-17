'use client';

import type { PhaseType, AddonProposal } from '@/types';

interface Props {
  phase: PhaseType;
  onSubAction: (subAction: string) => void;
  onSESeverity: (severity: string, symptom: string) => void;
  addonProposals: AddonProposal[];
  appliedAddons: Set<string>;
  onAddonApply: (addonType: string, title: string) => void;
}

const SE_NONE_OPTIONS = [
  { key: 'se_none_hypo',     label: '低血糖なし' },
  { key: 'se_none_gi',       label: '悪心・下痢なし' },
  { key: 'se_none_appetite', label: '食欲不振なし' },
];

const SE_PRESENT_OPTIONS = [
  { key: 'se_hypo',     label: '低血糖あり',    symptom: 'hypoglycemia' },
  { key: 'se_gi',       label: '悪心・下痢あり', symptom: 'gi' },
  { key: 'se_appetite', label: '食欲不振あり',   symptom: 'anorexia' },
];

const SE_SEVERITY_OPTIONS = [
  { key: 'mild_continue',    label: '軽症継続' },
  { key: 'consider_doctor',  label: 'Dr検討' },
  { key: 'reduce',           label: '減量へ' },
  { key: 'change',           label: '変更へ' },
  { key: 'stop',             label: '中止へ' },
];

const SYMPTOM_LABELS: Record<string, string> = {
  hypoglycemia: '低血糖',
  gi: '悪心・下痢',
  anorexia: '食欲不振',
};

export function TreeOptions({
  phase,
  onSubAction,
  onSESeverity,
  addonProposals,
  appliedAddons,
  onAddonApply,
}: Props) {
  const hasContent =
    phase.type !== 'idle' ||
    addonProposals.length > 0;

  if (!hasContent) return null;

  return (
    <div className="tree-area">
      {/* SE None sub-options */}
      {phase.type === 'se_none' && (
        <section className="tree-section">
          <h3 className="tree-title tree-title--green">副作用なし — 確認した症状を選択</h3>
          <div className="tree-btn-row">
            {SE_NONE_OPTIONS.map(o => (
              <button
                key={o.key}
                className="tree-btn btn-green"
                onClick={() => onSubAction(o.key)}
                type="button"
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SE Present — choose symptom */}
      {phase.type === 'se_present' && (
        <section className="tree-section">
          <h3 className="tree-title tree-title--red">副作用あり — 症状を選択</h3>
          <div className="tree-btn-row">
            {SE_PRESENT_OPTIONS.map(o => (
              <button
                key={o.key}
                className="tree-btn btn-red"
                onClick={() => onSubAction(o.key)}
                type="button"
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SE Present — choose severity (2nd level) */}
      {phase.type === 'se_symptom' && (
        <section className="tree-section">
          <h3 className="tree-title tree-title--red">
            {SYMPTOM_LABELS[phase.symptom]} — 対応を選択
          </h3>
          <div className="tree-btn-row">
            {SE_SEVERITY_OPTIONS.map(o => (
              <button
                key={o.key}
                className="tree-btn btn-red-light"
                onClick={() => onSESeverity(o.key, SYMPTOM_LABELS[phase.symptom])}
                type="button"
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CP sub-options */}
      {phase.type === 'cp' && (
        <section className="tree-section">
          <h3 className="tree-title tree-title--purple">CP確認 — 結果を選択</h3>
          <div className="tree-btn-row">
            <button
              className="tree-btn btn-purple"
              onClick={() => onSubAction('cp_good')}
              type="button"
            >
              CP良
            </button>
            <button
              className="tree-btn btn-purple"
              onClick={() => onSubAction('cp_poor')}
              type="button"
            >
              CP不良
            </button>
          </div>
        </section>
      )}

      {/* Addon proposals */}
      {addonProposals.length > 0 && (
        <section className="tree-section">
          <h3 className="tree-title tree-title--addon">追加情報の提案（任意）</h3>
          <div className="tree-btn-row">
            {addonProposals.map(p => {
              const applied = appliedAddons.has(p.addonType);
              return (
                <button
                  key={p.addonType}
                  className={`addon-btn ${applied ? 'applied' : ''}`}
                  onClick={() => !applied && onAddonApply(p.addonType, p.title)}
                  type="button"
                  disabled={applied}
                  title={p.description}
                >
                  {applied ? `✓ ${p.title}` : `＋ ${p.title}`}
                </button>
              );
            })}
          </div>
          <p className="addon-hint">ボタンを押すとPへ追記されます（各1回のみ）</p>
        </section>
      )}
    </div>
  );
}
