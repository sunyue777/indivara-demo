/**
 * ============================================================
 * Data wrapper — reads pre-generated mock data from /public/data
 * ============================================================
 *
 * For the demo, all data is static. The dataset covers 4 RMs with
 * a meaningful client base:
 *   - INVPTL       (2,164 clients)
 *   - RAMPVERIMG   (1,255 clients)
 *   - RAMPVER      (299 clients)
 *   - RAMPVER_OFL  (191 clients)
 *
 * The data is loaded once per cold start and cached in module scope,
 * so repeated requests don't re-parse the JSON.
 */

import fs from 'fs';
import path from 'path';

const VALID_FILTERS = ['ALL', 'GROWTH', 'RISK_MISMATCH', 'UPSELL', 'CROSSSELL'];
export const ALLOWED_SALES_CODES = ['RAMPVERIMG'];

// Module-level cache to avoid re-reading JSON on every request
let LIST_CACHE = null;
let DETAIL_CACHE = null;

function loadList() {
  if (LIST_CACHE) return LIST_CACHE;
  const filePath = path.join(process.cwd(), 'public', 'data', 'clients_list.json');
  LIST_CACHE = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return LIST_CACHE;
}

function loadDetail() {
  if (DETAIL_CACHE) return DETAIL_CACHE;
  const filePath = path.join(process.cwd(), 'public', 'data', 'clients_detail.json');
  DETAIL_CACHE = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return DETAIL_CACHE;
}

function sortForFilter(clients, filter) {
  const sorted = [...clients];
  switch (filter) {
    case 'GROWTH':
      sorted.sort((a, b) => a.aum - b.aum); break;
    case 'RISK_MISMATCH':
      sorted.sort((a, b) => (b.max_gap || 0) - (a.max_gap || 0) || b.aum - a.aum); break;
    case 'UPSELL':
      sorted.sort((a, b) => b.aum - a.aum); break;
    case 'CROSSSELL':
      sorted.sort((a, b) => b.aum - a.aum); break;
    case 'ALL':
    default:
      sorted.sort((a, b) => (b.priority_flags.length - a.priority_flags.length) || (b.aum - a.aum));
  }
  return sorted;
}

function applyParallelSort(clients, sortAum, sortHoldings) {
  let sorted = [...clients];
  if (sortHoldings === 'asc') sorted.sort((a, b) => a.holdings_count - b.holdings_count);
  else if (sortHoldings === 'desc') sorted.sort((a, b) => b.holdings_count - a.holdings_count);
  if (sortAum === 'asc') sorted.sort((a, b) => a.aum - b.aum);
  else if (sortAum === 'desc') sorted.sort((a, b) => b.aum - a.aum);
  return sorted;
}

// ------------------------------------------------------------
// Endpoint A — Client List
// ------------------------------------------------------------
export async function getClientList({
  salesCode,
  priorityFilter = 'ALL',
  sortAum = 'none',
  sortHoldings = 'none',
  search = '',
  page = 1,
  pageSize = 20,
}) {
  if (!ALLOWED_SALES_CODES.includes(salesCode)) {
    return { error: 'Invalid sales_code', allowed: ALLOWED_SALES_CODES };
  }

  const filter = VALID_FILTERS.includes(priorityFilter) ? priorityFilter : 'ALL';
  const all = loadList();

  // Filter by sales_code FIRST
  let clients = all.clients.filter(c => c.sales_code === salesCode);

  // Tag filter
  if (filter !== 'ALL') {
    clients = clients.filter(c => c.priority_flags.includes(filter));
  }

  // Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    clients = clients.filter(c =>
      (c.client_name || '').toLowerCase().includes(q) ||
      (c.avatar_initials || '').toLowerCase().includes(q)
    );
  }

  // Sort
  const userSortActive = (sortAum && sortAum !== 'none') || (sortHoldings && sortHoldings !== 'none');
  if (userSortActive) {
    clients = applyParallelSort(clients, sortAum, sortHoldings);
  } else {
    clients = sortForFilter(clients, filter);
  }

  // Inject contextual suggestion + rank
  clients = clients.map((c, idx) => ({
    ...c,
    rank: idx + 1,
    contextual_suggestion: filter !== 'ALL' && c.suggestions?.[filter]
      ? c.suggestions[filter]
      : c.default_suggestion,
  }));

  const total = clients.length;
  const start = (page - 1) * pageSize;
  const paged = clients.slice(start, start + pageSize);

  return {
    sales_code: salesCode,
    priority_filter: filter,
    sort_aum: sortAum,
    sort_holdings: sortHoldings,
    search,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    clients: paged,
  };
}

// ------------------------------------------------------------
// Endpoint B — Client Detail
// ------------------------------------------------------------
export async function getClientDetail({ customerId, fromTag = null }) {
  const all = loadDetail();
  const detail = all[customerId];
  if (!detail) return null;

  const pool = detail.talking_points_pool || {};
  const order = [];

  if (fromTag && pool[fromTag]) order.push(fromTag);
  if (!order.includes('BIRTHDAY') && pool['BIRTHDAY']) order.push('BIRTHDAY');
  for (const k of ['GROWTH', 'UPSELL', 'RISK_MISMATCH', 'CROSSSELL', 'CONCENTRATION']) {
    if (!order.includes(k) && pool[k]) order.push(k);
  }
  for (const k of ['LIFESTAGE', 'PROFESSION', 'FAMILY', 'CONTEXT']) {
    if (!order.includes(k) && pool[k] && order.length < 3) order.push(k);
  }
  if (pool['DEFAULT'] && order.length === 0) order.push('DEFAULT');

  const talking_points = order.slice(0, 3).map(k => pool[k]);

  return { ...detail, talking_points, from_tag: fromTag };
}
