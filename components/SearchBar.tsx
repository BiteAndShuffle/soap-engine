'use client';

import { useRef, useEffect } from 'react';
import type { SearchResult, ActiveDrug } from '@/types';
import { CATEGORY_LABELS } from '@/lib/soapEngine';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  activeDrug: ActiveDrug | null;
}

export function SearchBar({ query, onQueryChange, results, onSelect, activeDrug }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        onQueryChange('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onQueryChange]);

  return (
    <div className="search-wrapper">
      <div className="search-input-row">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="病名または薬剤名で検索（例：糖尿病、リベルサス）"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          autoComplete="off"
        />
        {activeDrug && (
          <button
            className="clear-drug-btn"
            onClick={() => onQueryChange('')}
            title="薬剤クリア"
            type="button"
          >
            ✕ 薬剤変更
          </button>
        )}
      </div>

      {results.length > 0 && (
        <ul ref={listRef} className="search-dropdown">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="search-result-item"
                onClick={() => onSelect(r)}
                type="button"
              >
                <span className={`result-badge ${r.type}`}>
                  {r.type === 'category' ? 'カテゴリ' : '薬剤名'}
                </span>
                <span className="result-label">{r.displayLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeDrug && (
        <div className="active-drug-info">
          <span className="active-drug-label">選択中：</span>
          <span className={`active-drug-badge ${activeDrug.category}`}>
            {activeDrug.isCategory
              ? CATEGORY_LABELS[activeDrug.category]
              : `${activeDrug.drugName}（${CATEGORY_LABELS[activeDrug.category]}）`}
          </span>
          {activeDrug.isCategory && (
            <span className="category-note">カテゴリ選択</span>
          )}
        </div>
      )}

      {!activeDrug && !query && (
        <p className="search-hint">
          「糖尿病」「GLP-1」「リベルサス」などで検索してください
        </p>
      )}
    </div>
  );
}
