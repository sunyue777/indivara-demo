/**
 * ============================================================
 * Agent Studio API wrapper
 * ============================================================
 *
 * THIS IS THE ONLY FILE TO EDIT when the real Agent Studio API is ready.
 *
 * Right now, all functions return mock data loaded from /public/data/.
 * When the real API is ready, replace the mock-loading code with a real
 * fetch() call. The frontend does not need to change as long as the
 * response shape is preserved.
 */

import fs from 'fs';
import path from 'path';

const VALID_FILTERS = ['ALL', 'GROWTH', 'REBALANCE', 'UPSELL', 'CROSSSELL', 'BIRTHDAY'];

function loadMock(filename) {
  const filePath = path.join(process.cwd(), 'public', 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Tab-aware default sort.
 */
function sortForFilter(clients, filter) {
  const sorted = [...clients];
  switch (filter) {
    case 'GROWTH':
      sorted.sort((a, b) => a.aum - b.aum);
      break;
    case 'REBALANCE':
      sorted.sort((a, b) => (b.max_gap || 0) - (a.max_gap || 0) || b.aum - a.aum);
      break;
    case 'UPSELL':
      sorted.sort((a, b) => b.aum - a.aum);
      break;
    case 'CROSSSELL':
      sorted.sort((a, b) => b.aum - a.aum);
      break;
    case 'BIRTHDAY':
      // Soonest birthday first
      sorted.sort((a, b) => (a.days_to_birthday ?? 999) - (b.days_to_birthday ?? 999));
      break;
    case 'ALL':
    default:
      sorted.sort((a, b) => (b.priority_flags.length - a.priority_flags.length) || (b.aum - a.aum));
  }
  return sorted;
}

/**
 * Apply user-selected sort. AUM sort and Holdings sort can be combined
 * in parallel — that's why both keys are accepted independently.
 */
function applyParallelSort(clients, sortAum, sortHoldings) {
  let sorted = [...clients];

  // We apply the LESS specific (Holdings) first, then the MORE specific (AUM)
  // because JS sort is stable and the last sort dominates ties.
  if (sortHoldings === 'asc') {
    sorted.sort((a, b) => a.holdings_count - b.holdings_count);
  } else if (sortHoldings === 'desc') {
    sorted.sort((a, b) => b.holdings_count - a.holdings_count);
  }

  if (sortAum === 'asc') {
    sorted.sort((a, b) => a.aum - b.aum);
  } else if (sortAum === 'desc') {
    sorted.sort((a, b) => b.aum - a.aum);
  }

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
  // ========================================================
  // TODO: When real API is ready, replace below with fetch().
  // ========================================================

  const filter = VALID_FILTERS.includes(priorityFilter) ? priorityFilter : 'ALL';
  const all = loadMock('clients_list.json');
  let clients = all.clients;

  // Tag filter
  if (filter !== 'ALL') {
    clients = clients.filter(c => c.priority_flags.includes(filter));
  }

  // Search filter — match name or initials, case-insensitive
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    clients = clients.filter(c =>
      (c.client_name || '').toLowerCase().includes(q) ||
      (c.avatar_initials || '').toLowerCase().includes(q)
    );
  }

  // Sorting
  const userSortActive = (sortAum && sortAum !== 'none') || (sortHoldings && sortHoldings !== 'none');
  if (userSortActive) {
    clients = applyParallelSort(clients, sortAum, sortHoldings);
  } else {
    clients = sortForFilter(clients, filter);
  }

  // Inject contextual suggestion + assign rank
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
  // ========================================================
  // TODO: Replace with real fetch() when Agent B is live.
  // ========================================================

  const all = loadMock('clients_detail.json');
  const detail = all[customerId];
  if (!detail) return null;

  const pool = detail.talking_points_pool || {};
  const order = [];

  // 1. Tab-context point first
  if (fromTag && pool[fromTag]) {
    order.push(fromTag);
  }
  // 2. Then by business priority
  for (const k of ['BIRTHDAY', 'GROWTH', 'UPSELL', 'REBALANCE', 'CROSSSELL', 'CONCENTRATION']) {
    if (!order.includes(k) && pool[k]) order.push(k);
  }
  // 3. Then additional context — varies per client (life stage, profession, family, questionnaire)
  for (const k of ['LIFESTAGE', 'PROFESSION', 'FAMILY', 'CONTEXT']) {
    if (!order.includes(k) && pool[k] && order.length < 3) order.push(k);
  }
  if (pool['DEFAULT'] && order.length === 0) order.push('DEFAULT');

  const talking_points = order.slice(0, 3).map(k => pool[k]);

  return {
    ...detail,
    talking_points,
    from_tag: fromTag,
  };
}

// ------------------------------------------------------------
// Endpoint C — Chatbot is iframe-embedded directly in /detail.
// ------------------------------------------------------------
