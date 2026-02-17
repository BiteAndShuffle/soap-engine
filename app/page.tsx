'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { ActionButtons } from '@/components/ActionButtons';
import { TreeOptions } from '@/components/TreeOptions';
import { SoapEditor } from '@/components/SoapEditor';
import { GenerationLog } from '@/components/GenerationLog';
import {
  searchDrugs,
  generateSoap,
  applyAddon,
  appendSoap,
  getAddonProposals,
} from '@/lib/soapEngine';
import type {
  ActiveDrug,
  SoapContent,
  LogEntry,
  SearchResult,
  AddonProposal,
  PhaseType,
} from '@/types';

const EMPTY_SOAP: SoapContent = { S: '', O: '', A: '', P: '' };
const LS_KEY = 'soap-engine-v1';

function makeLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeDrug, setActiveDrug] = useState<ActiveDrug | null>(null);
  const [soap, setSoap] = useState<SoapContent>(EMPTY_SOAP);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [appendMode, setAppendMode] = useState(false);
  const [phase, setPhase] = useState<PhaseType>({ type: 'idle' });
  const [addonProposals, setAddonProposals] = useState<AddonProposal[]>([]);
  const [appliedAddons, setAppliedAddons] = useState<Set<string>>(new Set());

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        soap?: SoapContent;
        log?: LogEntry[];
        appendMode?: boolean;
        activeDrug?: ActiveDrug;
      };
      if (saved.soap) setSoap(saved.soap);
      if (saved.log) setLog(saved.log);
      if (saved.appendMode !== undefined) setAppendMode(saved.appendMode);
      if (saved.activeDrug) setActiveDrug(saved.activeDrug);
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ soap, log, appendMode, activeDrug }));
    } catch {
      // ignore
    }
  }, [soap, log, appendMode, activeDrug]);

  // Live search
  useEffect(() => {
    setSearchResults(query.trim() ? searchDrugs(query) : []);
  }, [query]);

  const addLog = useCallback((action: string, details: string) => {
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      action,
      details,
    };
    setLog(prev => [entry, ...prev]);
  }, []);

  const handleDrugSelect = useCallback(
    (result: SearchResult) => {
      const drug: ActiveDrug = {
        category: result.category,
        drugName: result.drugName ?? result.categoryLabel,
        isCategory: result.type === 'category',
      };
      setActiveDrug(drug);
      setQuery('');
      setSearchResults([]);
      setPhase({ type: 'idle' });
      setAddonProposals([]);
      setAppliedAddons(new Set());
      addLog('薬剤選択', result.displayLabel);
    },
    [addLog],
  );

  /**
   * Core: write soap (append mode aware)
   */
  const writeSoap = useCallback(
    (generated: SoapContent, drug: ActiveDrug, label: string) => {
      if (appendMode && (soap.S || soap.O || soap.A || soap.P)) {
        const merged = appendSoap(soap, generated, drug.drugName);
        setSoap(merged);
        addLog(label, `【${drug.drugName}】を末尾に追記`);
      } else {
        setSoap(generated);
        addLog(label, `SOAP生成 — ${drug.drugName}`);
      }
      setAppliedAddons(new Set());
    },
    [appendMode, soap, addLog],
  );

  const handleAction = useCallback(
    (action: string) => {
      if (!activeDrug) return;

      const simple = (templateType: string, label: string) => {
        const gen = generateSoap(activeDrug.category, templateType);
        if (!gen) {
          addLog('エラー', `テンプレート "${templateType}" が見つかりません`);
          return;
        }
        writeSoap(gen, activeDrug, label);
        setPhase({ type: 'idle' });
        setAddonProposals([]);
      };

      switch (action) {
        case 'initial':
          simple('initial', '初回');
          setAddonProposals(getAddonProposals(activeDrug.category, 'initial'));
          break;
        case 'increase':
          simple('increase', '増量');
          break;
        case 'decrease':
          simple('decrease', '減量');
          break;
        case 'se_none':
          setPhase({ type: 'se_none' });
          setAddonProposals([]);
          break;
        case 'se_present':
          setPhase({ type: 'se_present' });
          setAddonProposals([]);
          break;
        case 'cp':
          setPhase({ type: 'cp' });
          setAddonProposals([]);
          break;
        case 'end':
          simple('end', '終了');
          break;
        case 'sick_day':
          simple('sick_day', 'シックデイ');
          setAddonProposals(getAddonProposals(activeDrug.category, 'sick_day'));
          break;
      }
    },
    [activeDrug, writeSoap, addLog],
  );

  const handleSubAction = useCallback(
    (subAction: string) => {
      if (!activeDrug) return;

      const run = (templateType: string, label: string) => {
        const gen = generateSoap(activeDrug.category, templateType);
        if (!gen) {
          addLog('エラー', `テンプレート "${templateType}" が見つかりません`);
          return;
        }
        writeSoap(gen, activeDrug, label);
        setPhase({ type: 'idle' });
        setAddonProposals([]);
      };

      switch (subAction) {
        // SE none symptoms
        case 'se_none_hypo':
          run('adverse_hypoglycemia', '副作用なし（低血糖）');
          break;
        case 'se_none_gi':
          run('adverse_gi', '副作用なし（悪心・下痢）');
          break;
        case 'se_none_appetite':
          run('adverse_appetite', '副作用なし（食欲不振）');
          break;
        // SE present — choose symptom → go to severity level
        case 'se_hypo':
          setPhase({ type: 'se_symptom', symptom: 'hypoglycemia', seMode: 'present' });
          break;
        case 'se_gi':
          setPhase({ type: 'se_symptom', symptom: 'gi', seMode: 'present' });
          break;
        case 'se_appetite':
          setPhase({ type: 'se_symptom', symptom: 'anorexia', seMode: 'present' });
          break;
        // CP
        case 'cp_good':
          run('cp_good', 'CP良');
          break;
        case 'cp_poor':
          run('cp_poor', 'CP不良');
          break;
      }
    },
    [activeDrug, writeSoap, addLog],
  );

  const handleSESeverity = useCallback(
    (severity: string, symptomLabel: string) => {
      if (!activeDrug) return;

      const SEVERITY_MAP: Record<string, string> = {
        mild_continue: 'se_mild_continue',
        consider_doctor: 'se_strong_consider_doctor',
        reduce: 'se_decrease',
        change: 'se_change',
        stop: 'se_stop',
      };

      const SEVERITY_LABELS: Record<string, string> = {
        mild_continue: '軽症継続',
        consider_doctor: 'Dr検討',
        reduce: '減量',
        change: '変更',
        stop: '中止',
      };

      const templateType = SEVERITY_MAP[severity];
      const severityLabel = SEVERITY_LABELS[severity] ?? severity;
      const label = `副作用あり（${symptomLabel}）→ ${severityLabel}`;

      const gen = generateSoap(activeDrug.category, templateType);
      if (!gen) {
        addLog('エラー', `テンプレート "${templateType}" が見つかりません`);
        setPhase({ type: 'idle' });
        return;
      }
      writeSoap(gen, activeDrug, label);
      setPhase({ type: 'idle' });
      setAddonProposals([]);
    },
    [activeDrug, writeSoap, addLog],
  );

  const handleAddonApply = useCallback(
    (addonType: string, title: string) => {
      if (!activeDrug || appliedAddons.has(addonType)) return;
      const newSoap = applyAddon(soap, activeDrug.category, addonType);
      setSoap(newSoap);
      setAppliedAddons(prev => new Set([...prev, addonType]));
      addLog(`アドオン適用: ${title}`, 'Pへ追記しました');
    },
    [activeDrug, soap, appliedAddons, addLog],
  );

  const handleClear = useCallback(() => {
    setSoap(EMPTY_SOAP);
    setLog([]);
    setPhase({ type: 'idle' });
    setAddonProposals([]);
    setAppliedAddons(new Set());
  }, []);

  return (
    <main className="page-root">
      <header className="page-header">
        <h1 className="app-title">薬剤師SOAP自動生成</h1>
        <span className="app-subtitle">GLP-1受容体作動薬対応 MVP</span>
      </header>

      <div className="page-body">
        {/* ── 上部: 検索 + Appendトグル ── */}
        <div className="top-area">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            results={searchResults}
            onSelect={handleDrugSelect}
            activeDrug={activeDrug}
          />

          <label className="append-toggle">
            <input
              type="checkbox"
              checked={appendMode}
              onChange={e => setAppendMode(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className={`toggle-track ${appendMode ? 'on' : ''}`}>
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label-text">
              SOAPに追記（Appendモード）
            </span>
            {appendMode && <span className="badge-append">追記中</span>}
          </label>
        </div>

        {/* ── メインアクション ── */}
        <ActionButtons
          activeDrug={activeDrug}
          onAction={handleAction}
          currentPhase={phase.type}
        />

        {/* ── ツリー / アドオン提案 ── */}
        {activeDrug && (
          <TreeOptions
            phase={phase}
            onSubAction={handleSubAction}
            onSESeverity={handleSESeverity}
            addonProposals={addonProposals}
            appliedAddons={appliedAddons}
            onAddonApply={handleAddonApply}
          />
        )}

        {/* ── SOAPエディタ ── */}
        <SoapEditor
          soap={soap}
          onSoapChange={setSoap}
          onClear={handleClear}
        />

        {/* ── 生成ログ ── */}
        <GenerationLog log={log} />
      </div>
    </main>
  );
}
