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

// ------------------------------------------------------------
// Endpoint A — Client List
// ------------------------------------------------------------
export async function getClientList({ salesCode, priorityFilter = 'ALL', page = 1, pageSize = 20 }) {
  // ========================================================
  // TODO: When real API is ready, replace below with fetch().
  //
  //   const res = await fetch(process.env.AGENT_STUDIO_API_URL, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${process.env.AGENT_STUDIO_TOKEN}`,
  //     },
  //     body: JSON.stringify({
  //       agent_id: process.env.AGENT_STUDIO_AGENT_A_ID,
  //       input: {
  //         sales_code: salesCode,
  //         priority_filter: priorityFilter,
  //         page,
  //         page_size: pageSize
  //       },
  //     }),
  //   });
  //   return await res.json();
  // ========================================================

  const filter = VALID_FILTERS.includes(priorityFilter) ? priorityFilter : 'ALL';
  const all = loadMock('clients_list.json');
  let clients = all.clients;

  if (filter !== 'ALL') {
    clients = clients.filter(c => c.priority_flags.includes(filter));
  }

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
export async function getClientDetail({ customerId }) {
  // ========================================================
  // TODO: Replace with real fetch() when Agent B is live.
  // Response shape must contain: summary, portfolio, risk_check,
  // talking_points, priority_flags, flag_labels.
  // ========================================================

  const all = loadMock('clients_detail.json');
  return all[customerId] || null;
}

// ------------------------------------------------------------
// Endpoint C — Chatbot is iframe-embedded directly in /detail.
// ------------------------------------------------------------
