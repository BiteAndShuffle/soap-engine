'use client';

import type { ActiveDrug, PhaseType } from '@/types';

interface Props {
  activeDrug: ActiveDrug | null;
  onAction: (action: string) => void;
  currentPhase: PhaseType['type'];
}

interface ActionDef {
  key: string;
  label: string;
  color: string;
}

const ACTIONS: ActionDef[] = [
  { key: 'initial',    label: '初回',       color: 'btn-blue' },
  { key: 'increase',   label: '増量',       color: 'btn-teal' },
  { key: 'decrease',   label: '減量',       color: 'btn-teal' },
  { key: 'se_none',    label: '副作用なし', color: 'btn-green' },
  { key: 'se_present', label: '副作用あり', color: 'btn-red' },
  { key: 'cp',         label: 'CP確認',     color: 'btn-purple' },
  { key: 'end',        label: '終了',       color: 'btn-gray' },
  { key: 'sick_day',   label: 'シックデイ', color: 'btn-orange' },
];

export function ActionButtons({ activeDrug, onAction, currentPhase }: Props) {
  if (!activeDrug) return null;

  return (
    <section className="action-section">
      <h2 className="section-title">アクション選択</h2>
      <div className="action-grid">
        {ACTIONS.map(a => (
          <button
            key={a.key}
            className={`action-btn ${a.color} ${currentPhase === a.key ? 'active' : ''}`}
            onClick={() => onAction(a.key)}
            type="button"
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
