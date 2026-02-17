'use client';

import type { LogEntry } from '@/types';

interface Props {
  log: LogEntry[];
}

export function GenerationLog({ log }: Props) {
  return (
    <section className="log-section">
      <h2 className="section-title">
        生成ログ
        {log.length > 0 && <span className="log-count">{log.length}件</span>}
      </h2>

      {log.length === 0 ? (
        <p className="log-empty">まだ操作がありません</p>
      ) : (
        <ul className="log-list">
          {log.map(entry => (
            <li key={entry.id} className="log-entry">
              <span className="log-time">{entry.timestamp}</span>
              <span className="log-action">{entry.action}</span>
              <span className="log-details">{entry.details}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
