export type CategoryId = 'glp1_oral' | 'glp1_inject';

export interface ActiveDrug {
  category: CategoryId;
  drugName: string;
  isCategory: boolean;
}

export interface SoapContent {
  S: string;
  O: string;
  A: string;
  P: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface SearchResult {
  type: 'category' | 'drug';
  category: CategoryId;
  categoryLabel: string;
  drugName?: string;
  displayLabel: string;
}

export interface AddonProposal {
  addonType: string;
  title: string;
  description: string;
}

export type PhaseType =
  | { type: 'idle' }
  | { type: 'se_none' }
  | { type: 'se_present' }
  | { type: 'se_symptom'; symptom: 'hypoglycemia' | 'gi' | 'anorexia'; seMode: 'present' }
  | { type: 'cp' };
