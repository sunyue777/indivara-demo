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
 *
 * Environment variables (set in Vercel dashboard, NOT in code):
 *   AGENT_STUDIO_API_URL        - e.g. https://agents.dyna.ai/api/v1/xxx
 *   AGENT_STUDIO_TOKEN          - the Token string
 *   AGENT_STUDIO_AGENT_A_ID     - Agent Identifier for Endpoint A (client list)
 *   AGENT_STUDIO_AGENT_B_ID     - Agent Identifier for Endpoint B (client detail)
 */

import fs from 'fs';
import path from 'path';

const VALID_FILTERS = ['ALL', 'GROWTH', 'REBALANCE', 'UPSELL', 'CROSSSELL'];

function loadMock(filename) {
  const filePath = path.join(process.cwd(), 'public', 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Tab-aware sort: each filter has its own ordering logic so the same
 * client doesn't always appear at the top of every tab.
 */
function sortForFilter(clients, filter) {
  const sorted = [...clients];
  switch (filter) {
    case 'GROWTH':
      // Lowest AUM first — those with the biggest income/AUM gap are most urgent
      sorted.sort((a, b) => a.aum - b.aum);
      break;
    case 'REBALANCE':
      // Largest risk gap first; ties broken by AUM (high AUM = bigger compliance risk)
      sorted.sort((a, b) => (b.max_gap || 0) - (a.max_gap || 0) || b.aum - a.aum);
      break;
    case 'UPSELL':
      // High AUM single-product holders first — most valuable upsell targets
      sorted.sort((a, b) => b.aum - a.aum);
      break;
    case 'CROSSSELL':
      // Same — high AUM Local-only clients have the highest cross-sell value
      sorted.sort((a, b) => b.aum - a.aum);
      break;
    case 'ALL':
    default:
      // Multi-tag clients first, then by AUM
      sorted.sort((a, b) => (b.priority_flags.length - a.priority_flags.length) || (b.aum - a.aum));
  }
  return sorted;
}

// ------------------------------------------------------------
// Endpoint A — Client List
// ------------------------------------------------------------
export async function getClientList({ salesCode, priorityFilter = 'ALL', page = 1, pageSize = 20 }) {
  // ========================================================
  // TODO: When real API is ready, replace below with fetch().
  // ========================================================

  const filter = VALID_FILTERS.includes(priorityFilter) ? priorityFilter : 'ALL';
  const all = loadMock('clients_list.json');
  let clients = all.clients;

  if (filter !== 'ALL') {
    clients = clients.filter(c => c.priority_flags.includes(filter));
  }

  // Tab-aware ordering
  clients = sortForFilter(clients, filter);

  // Inject the contextual suggestion for this tab into each client
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
    total,
    page,
    page_size: pageSize,
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

  // Build the talking_points array, ordered with the tab-relevant
  // point first if `fromTag` is provided
  const pool = detail.talking_points_pool || {};
  const order = [];

  // 1. Tab-context point first (the "why this client is in this tab")
  if (fromTag && pool[fromTag]) {
    order.push(fromTag);
  }
  // 2. Then by business priority: GROWTH > UPSELL > REBALANCE > CROSSSELL
  for (const k of ['GROWTH', 'UPSELL', 'REBALANCE', 'CROSSSELL', 'CONCENTRATION']) {
    if (!order.includes(k) && pool[k]) order.push(k);
  }
  // 3. Finally context filler
  if (pool['CONTEXT'] && order.length < 3) order.push('CONTEXT');
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
