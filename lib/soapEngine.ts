import type { CategoryId, SoapContent, SearchResult, AddonProposal } from '@/types';
import glp1OralRaw from '../templates/glp1_oral.json';
import glp1InjectRaw from '../templates/glp1_inject.json';

interface TemplateEntry {
  type: string;
  title: string;
  S: string;
  O: string;
  A: string;
  P: string;
}

interface AddonEntry {
  type: string;
  title: string;
  P_add: string;
}

interface DrugData {
  drug_group: string;
  therapeutic_area: string;
  route: string;
  brand_names: string[];
  generic_names: string[];
  search_keywords: string[];
  templates: TemplateEntry[];
  addons: AddonEntry[];
}

const glp1Oral = glp1OralRaw as DrugData;
const glp1Inject = glp1InjectRaw as DrugData;

const DRUG_DATA: Record<CategoryId, DrugData> = {
  glp1_oral: glp1Oral,
  glp1_inject: glp1Inject,
};

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  glp1_oral: 'GLP-1受容体作動薬（内服）',
  glp1_inject: 'GLP-1受容体作動薬（注射）',
};

// Flatten all searchable terms for each category
function buildSearchIndex(): Array<{
  category: CategoryId;
  term: string;
  drugName?: string;
}> {
  const index: Array<{ category: CategoryId; term: string; drugName?: string }> = [];

  for (const [catId, data] of Object.entries(DRUG_DATA) as [CategoryId, DrugData][]) {
    // therapeutic area
    index.push({ category: catId, term: data.therapeutic_area.toLowerCase() });
    // drug group
    index.push({ category: catId, term: data.drug_group.toLowerCase() });
    // route
    index.push({ category: catId, term: data.route.toLowerCase() });
    if (data.route === 'oral') {
      index.push({ category: catId, term: '内服' });
      index.push({ category: catId, term: '経口' });
    } else if (data.route === 'injection') {
      index.push({ category: catId, term: '注射' });
    }
    // brand names (each mapped to specific drug)
    for (const bn of data.brand_names) {
      index.push({ category: catId, term: bn.toLowerCase(), drugName: bn });
    }
    // generic names
    for (const gn of data.generic_names) {
      index.push({ category: catId, term: gn.toLowerCase() });
    }
    // search keywords
    for (const kw of data.search_keywords) {
      index.push({ category: catId, term: kw.toLowerCase() });
    }
  }

  return index;
}

const SEARCH_INDEX = buildSearchIndex();

export function searchDrugs(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const categoryResults = new Map<CategoryId, boolean>();
  const drugResults = new Map<string, SearchResult>();

  for (const entry of SEARCH_INDEX) {
    const matches = entry.term.includes(q) || q.includes(entry.term);
    if (!matches) continue;

    if (entry.drugName) {
      const key = `${entry.category}:${entry.drugName}`;
      if (!drugResults.has(key)) {
        drugResults.set(key, {
          type: 'drug',
          category: entry.category,
          categoryLabel: CATEGORY_LABELS[entry.category],
          drugName: entry.drugName,
          displayLabel: `${entry.drugName}（${CATEGORY_LABELS[entry.category]}）`,
        });
      }
    } else {
      categoryResults.set(entry.category, true);
    }
  }

  const results: SearchResult[] = [];

  // Add drug-specific results first
  for (const result of drugResults.values()) {
    results.push(result);
  }

  // Add category results (if not already covered by drug result)
  for (const [catId] of categoryResults) {
    // Only add category if no drug-level result already covers this category
    const hasDrugResult = [...drugResults.values()].some(r => r.category === catId);
    if (!hasDrugResult) {
      results.push({
        type: 'category',
        category: catId,
        categoryLabel: CATEGORY_LABELS[catId],
        displayLabel: CATEGORY_LABELS[catId],
      });
    }
  }

  return results;
}

export function getTemplate(category: CategoryId, type: string): TemplateEntry | null {
  const data = DRUG_DATA[category];
  return data.templates.find(t => t.type === type) ?? null;
}

export function hasTemplate(category: CategoryId, type: string): boolean {
  return getTemplate(category, type) !== null;
}

export function getAddon(category: CategoryId, type: string): AddonEntry | null {
  const data = DRUG_DATA[category];
  return data.addons.find(a => a.type === type) ?? null;
}

export function generateSoap(
  category: CategoryId,
  templateType: string,
): SoapContent | null {
  const template = getTemplate(category, templateType);
  if (!template) return null;
  return { S: template.S, O: template.O, A: template.A, P: template.P };
}

export function applyAddon(
  currentSoap: SoapContent,
  category: CategoryId,
  addonType: string,
): SoapContent {
  const addon = getAddon(category, addonType);
  if (!addon) return currentSoap;
  return {
    ...currentSoap,
    P: currentSoap.P + (currentSoap.P ? '\n' : '') + addon.P_add,
  };
}

export function appendSoap(
  existing: SoapContent,
  newContent: SoapContent,
  drugName: string,
): SoapContent {
  const header = `【${drugName}】`;
  const join = (a: string, b: string) =>
    a ? `${a}\n${header}\n${b}` : `${header}\n${b}`;

  return {
    S: join(existing.S, newContent.S),
    O: join(existing.O, newContent.O),
    A: join(existing.A, newContent.A),
    P: join(existing.P, newContent.P),
  };
}

export function getCategoryLabel(category: CategoryId): string {
  return CATEGORY_LABELS[category];
}

export function getDrugData(category: CategoryId): DrugData {
  return DRUG_DATA[category];
}

export function getAddonProposals(
  category: CategoryId,
  action: string,
): AddonProposal[] {
  const proposals: AddonProposal[] = [];
  const data = DRUG_DATA[category];

  if (action === 'initial') {
    if (category === 'glp1_oral') {
      const a = data.addons.find(x => x.type === 'oral_storage');
      if (a) proposals.push({ addonType: a.type, title: a.title, description: 'Pに保管方法を追記' });
    } else if (category === 'glp1_inject') {
      const a = data.addons.find(x => x.type === 'injection_rotation');
      if (a) proposals.push({ addonType: a.type, title: a.title, description: 'Pに部位ローテーションを追記' });
    }
    const gi = data.addons.find(x => x.type === 'gi_warning');
    if (gi) proposals.push({ addonType: gi.type, title: gi.title, description: 'Pに消化器症状の注意を追記' });
    const hypo = data.addons.find(x => x.type === 'hypo_combo_warning');
    if (hypo) proposals.push({ addonType: hypo.type, title: hypo.title, description: 'Pに低血糖注意を追記' });
  }

  if (action === 'sick_day') {
    const sd = data.addons.find(x => x.type === 'sick_day_common');
    if (sd) proposals.push({ addonType: sd.type, title: sd.title, description: 'Pにシックデイ共通注意を追記' });
  }

  return proposals;
}
