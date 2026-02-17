'use client';

import { useRef } from 'react';
import type { SoapContent } from '@/types';

interface Props {
  soap: SoapContent;
  onSoapChange: (soap: SoapContent) => void;
  onClear: () => void;
}

const SOAP_KEYS: Array<{ key: keyof SoapContent; label: string; color: string }> = [
  { key: 'S', label: 'S — Subjective（主観的情報）', color: 'soap-s' },
  { key: 'O', label: 'O — Objective（客観的情報）',  color: 'soap-o' },
  { key: 'A', label: 'A — Assessment（評価）',       color: 'soap-a' },
  { key: 'P', label: 'P — Plan（計画・指導）',        color: 'soap-p' },
];

export function SoapEditor({ soap, onSoapChange, onClear }: Props) {
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function handleChange(key: keyof SoapContent, value: string) {
    onSoapChange({ ...soap, [key]: value });
  }

  async function copyAll() {
    const text = [
      `【S】\n${soap.S}`,
      `【O】\n${soap.O}`,
      `【A】\n${soap.A}`,
      `【P】\n${soap.P}`,
    ].join('\n\n');
    await navigator.clipboard.writeText(text);
  }

  async function copySection(key: keyof SoapContent) {
    await navigator.clipboard.writeText(soap[key]);
  }

  const isEmpty = !soap.S && !soap.O && !soap.A && !soap.P;

  return (
    <section className="soap-section">
      <div className="soap-header">
        <h2 className="section-title">SOAP</h2>
        <div className="soap-actions">
          <button
            className="copy-btn copy-all"
            onClick={copyAll}
            disabled={isEmpty}
            type="button"
          >
            全文コピー
          </button>
          <button
            className="clear-btn"
            onClick={onClear}
            type="button"
          >
            クリア
          </button>
        </div>
      </div>

      {isEmpty && (
        <p className="soap-empty">薬剤を選択してアクションを押すとSOAPが生成されます</p>
      )}

      <div className="soap-fields">
        {SOAP_KEYS.map(({ key, label, color }) => (
          <div key={key} className={`soap-field ${color}`}>
            <div className="soap-field-header">
              <label className="soap-field-label" htmlFor={`soap-${key}`}>
                {label}
              </label>
              <button
                className="copy-btn copy-section"
                onClick={() => copySection(key)}
                disabled={!soap[key]}
                type="button"
              >
                コピー
              </button>
            </div>
            <textarea
              id={`soap-${key}`}
              ref={el => { textareaRefs.current[key] = el; }}
              className="soap-textarea"
              value={soap[key]}
              onChange={e => handleChange(key, e.target.value)}
              rows={3}
              placeholder={`${key}欄（直接編集可）`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
