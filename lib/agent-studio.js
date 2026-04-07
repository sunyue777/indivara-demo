/**
 * ============================================================
 * Agent Studio API wrapper
 * ============================================================
 *
 * THIS IS THE ONLY FILE TO EDIT when the real Agent Studio API is ready.
 *
 * Right now, all three functions below return mock data loaded from
 * /public/data/clients_list.json and /public/data/clients_detail.json.
 *
 * When the real API is ready, follow the TODO markers in each function
 * and replace the mock read with a real fetch() call.
 *
 * Environment variables (set in Vercel dashboard, NOT in code):
 *   AGENT_STUDIO_API_URL        - e.g. https://agents.dyna.ai/api/v1/xxx
 *   AGENT_STUDIO_TOKEN          - the Token string
 *   AGENT_STUDIO_AGENT_A_ID     - Agent Identifier for Endpoint A (client list)
 *   AGENT_STUDIO_AGENT_B_ID     - Agent Identifier for Endpoint B (client detail)
 */

import fs from 'fs';
import path from 'path';

// ------------------------------------------------------------
// Mock data loader (reads JSON from /public/data)
// ------------------------------------------------------------
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
  // TODO: When real API is ready, replace everything below
  //       this comment block with a real fetch() call.
  //
  // Example shape (adjust to match your Agent Studio spec):
  //
  //   const res = await fetch(process.env.AGENT_STUDIO_API_URL, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${process.env.AGENT_STUDIO_TOKEN}`,
  //     },
  //     body: JSON.stringify({
  //       agent_id: process.env.AGENT_STUDIO_AGENT_A_ID,
  //       input: { sales_code: salesCode, priority_filter: priorityFilter, page, page_size: pageSize },
  //     }),
  //   });
  //   const data = await res.json();
  //   return data;
  // ========================================================

  const all = loadMock('clients_list.json');
  let clients = all.clients;

  // Filter by priority
  if (priorityFilter === 'P1') {
    clients = clients.filter(c => c.priority_flags.includes('P1'));
  } else if (priorityFilter === 'P2') {
    clients = clients.filter(c => c.priority_flags.includes('P2'));
  }

  const total = clients.length;
  const start = (page - 1) * pageSize;
  const paged = clients.slice(start, start + pageSize);

  return {
    sales_code: salesCode,
    priority_filter: priorityFilter,
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
  // TODO: When real API is ready, replace with real fetch().
  // The response should contain: summary, portfolio, risk_check,
  // talking_points. Keep the same shape so the frontend doesn't
  // need to change.
  // ========================================================

  const all = loadMock('clients_detail.json');
  const detail = all[customerId];
  if (!detail) {
    return null;
  }
  return detail;
}

// ------------------------------------------------------------
// Endpoint C — Chatbot is handled via iframe embed directly
// in the frontend page. No backend wrapper needed here.
// ------------------------------------------------------------
