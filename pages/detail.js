import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const fmtPct = (n) => Number(n || 0).toFixed(1) + '%';

const fmtBirthDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const riskBadgeColor = {
  'Conservative':              'bg-emerald-100 text-emerald-700',
  'Moderately Conservative':   'bg-teal-100 text-teal-700',
  'Moderate':                  'bg-sky-100 text-sky-700',
  'Moderately Aggressive':     'bg-amber-100 text-amber-700',
  'Aggressive':                'bg-rose-100 text-rose-700',
};

const statusBg = {
  aligned:  'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning:  'bg-amber-50 border-amber-200 text-amber-800',
  mismatch: 'bg-rose-50 border-rose-200 text-rose-800',
  unknown:  'bg-slate-50 border-slate-200 text-slate-700',
};

// Per-flag accent colors used for the banner left border + active chip
const FLAG_META = {
  GROWTH:        { label: 'Growth Opportunity',     accent: 'border-l-emerald-500', chipActive: 'bg-emerald-600 text-white border-emerald-600' },
  UPSELL:        { label: 'Up-sell Opportunity',    accent: 'border-l-violet-500',  chipActive: 'bg-violet-600 text-white border-violet-600' },
  RISK_MISMATCH: { label: 'Risk Mismatch',          accent: 'border-l-rose-500',    chipActive: 'bg-rose-600 text-white border-rose-600' },
  CROSSSELL:     { label: 'Cross-sell Opportunity', accent: 'border-l-amber-500',   chipActive: 'bg-amber-600 text-white border-amber-600' },
};

const DONUT_COLORS = [
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#1d4ed8', '#1e3a8a', '#0891b2', '#0e7490', '#0284c7',
  '#0369a1', '#075985', '#0c4a6e', '#155e75', '#164e63',
];

const iconFor = (key) => {
  const c = "w-5 h-5";
  switch (key) {
    case 'concentration':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>;
    case 'diversify':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>;
    case 'risk':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>;
    case 'aligned':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>;
    case 'opportunity':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case 'horizon':
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    default:
      return <svg className={c} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
  }
};

const Field = ({ label, value }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</div>
    <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">{value || '—'}</div>
  </div>
);

// ============================================================
// Lightweight markdown renderer for chatbot replies.
// Supports: # / ## / ### headings, **bold**, *italic*, `code`,
// [link](url), - / * / 1. lists (with nesting via 2-space indent),
// blockquotes, --- horizontal rules, blank-line paragraphs,
// tables (pipe-delimited), and auto-highlighting of currency amounts.
// No external dependency — keeps package.json untouched.
// ============================================================

// Highlight currency amounts (₱1,234 / ₱1.6M) in slate-800 + semibold
// so numbers pop against surrounding prose.
const CURRENCY_RE = /(₱\s?[\d,]+(?:\.\d+)?(?:\s?[KMB])?)/g;

function highlightNumbers(str, keyPrefix) {
  const parts = str.split(CURRENCY_RE);
  return parts.map((p, i) =>
    CURRENCY_RE.test(p)
      ? <span key={`${keyPrefix}-n${i}`} className="font-semibold text-slate-900 tabular-nums">{p}</span>
      : p
  );
}

function renderInline(text, keyPrefix = 'i') {
  const nodes = [];
  let remaining = text;
  let idx = 0;
  // Order matters: code -> link -> bold -> italic.
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/;
  while (remaining.length) {
    const m = remaining.match(re);
    if (!m) {
      nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{highlightNumbers(remaining, `${keyPrefix}-t${idx}`)}</span>);
      break;
    }
    if (m.index > 0) {
      const plain = remaining.slice(0, m.index);
      nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{highlightNumbers(plain, `${keyPrefix}-t${idx}`)}</span>);
    }
    const token = m[0];
    if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${idx++}`} className="bg-slate-100 text-brand-700 px-1.5 py-0.5 rounded text-[12px] font-mono">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(<a key={`${keyPrefix}-a${idx++}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline hover:text-brand-800">{linkMatch[1]}</a>);
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${idx++}`} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${keyPrefix}-e${idx++}`}>{token.slice(1, -1)}</em>);
    }
    remaining = remaining.slice(m.index + token.length);
  }
  return nodes;
}

// Split a list item's body into (leadLabel, rest) when it starts with
// "**Label:**" or "Label:" followed by content — shown as a bold tag
// followed by the description, similar to ChatGPT's list styling.
function splitLeadLabel(text) {
  // Markdown bold lead: **Label:** rest   OR   **Label** — rest
  let m = text.match(/^\*\*([^*]+?)\*\*\s*[:：—-]\s*(.+)$/);
  if (m) return { lead: m[1].trim(), rest: m[2].trim() };
  // Plain lead: Label: rest  (only when label is short, no spaces-heavy)
  m = text.match(/^([A-Z][A-Za-z0-9 /&.]{1,30})[:：]\s+(.+)$/);
  if (m) return { lead: m[1].trim(), rest: m[2].trim() };
  return null;
}

function MarkdownMessage({ text }) {
  if (!text) return null;
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let listBuffer = null; // { type, items }
  let paraBuffer = [];
  let tableBuffer = null; // { header: [], rows: [[]] }

  const flushPara = () => {
    if (paraBuffer.length) {
      blocks.push({ type: 'p', text: paraBuffer.join(' ') });
      paraBuffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
  };
  const flushTable = () => {
    if (tableBuffer) { blocks.push({ type: 'table', ...tableBuffer }); tableBuffer = null; }
  };
  const flushAll = () => { flushPara(); flushList(); flushTable(); };

  const parseTableRow = (line) => {
    // Strip leading/trailing pipes then split
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank line
    if (line.trim() === '') {
      flushAll();
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushAll();
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Table: a line with | and the next line is a separator like |---|---|
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|[\s:|-]+$/.test(lines[i + 1])) {
      flushPara(); flushList();
      const header = parseTableRow(line);
      i += 2; // skip separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushAll();
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushAll();
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') });
      i++;
      continue;
    }

    // Unordered list item
    const ul = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ul) {
      flushPara(); flushTable();
      const indent = Math.floor(ul[1].length / 2);
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push({ text: ul[2], indent });
      i++;
      continue;
    }

    // Ordered list item
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ol) {
      flushPara(); flushTable();
      const indent = Math.floor(ol[1].length / 2);
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push({ text: ol[3], indent, num: ol[2] });
      i++;
      continue;
    }

    // Default — paragraph line
    flushList(); flushTable();
    paraBuffer.push(line);
    i++;
  }
  flushAll();

  return (
    <div className="space-y-2.5 text-[13.5px] leading-[1.65] text-slate-700">
      {blocks.map((b, k) => {
        if (b.type === 'h') {
          const cls =
            b.level === 1
              ? 'text-[15px] font-bold text-slate-900 mt-1 pb-1 border-b border-slate-200'
              : b.level === 2
                ? 'text-[14px] font-bold text-slate-900 mt-1'
                : 'text-[13px] font-semibold text-slate-800 uppercase tracking-wide mt-0.5';
          return <div key={k} className={cls}>{renderInline(b.text, `h${k}`)}</div>;
        }
        if (b.type === 'p') {
          return <p key={k} className="text-slate-700">{renderInline(b.text, `p${k}`)}</p>;
        }
        if (b.type === 'hr') {
          return <hr key={k} className="border-slate-200 my-1" />;
        }
        if (b.type === 'quote') {
          return (
            <div key={k} className="border-l-2 border-brand-300 bg-brand-50/40 pl-3 pr-2 py-1.5 rounded-r text-slate-600 italic">
              {renderInline(b.text, `q${k}`)}
            </div>
          );
        }
        if (b.type === 'table') {
          return (
            <div key={k} className="overflow-x-auto -mx-1 my-1">
              <table className="min-w-full text-[12.5px] border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    {b.header.map((h, j) => (
                      <th key={j} className="text-left font-semibold text-slate-700 px-2.5 py-1.5 border-b border-slate-200">
                        {renderInline(h, `th${k}-${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2.5 py-1.5 align-top text-slate-700">
                          {renderInline(cell, `td${k}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Lists — render with label-first styling if the item starts with "**Label:**"
        const isOrdered = b.type === 'ol';
        return (
          <ul key={k} className="space-y-1.5 pl-0.5">
            {b.items.map((it, j) => {
              const split = splitLeadLabel(it.text);
              const marginLeft = it.indent > 0 ? { marginLeft: it.indent * 16 } : undefined;
              return (
                <li key={j} className="flex gap-2 items-start" style={marginLeft}>
                  <span className="shrink-0 mt-[3px]">
                    {isOrdered ? (
                      <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold leading-none">
                        {it.num || (j + 1)}
                      </span>
                    ) : (
                      <span className="block w-1.5 h-1.5 mt-[7px] rounded-full bg-brand-500" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    {split ? (
                      <>
                        <span className="font-semibold text-slate-900">{renderInline(split.lead, `lil${k}-${j}`)}</span>
                        <span className="text-slate-500"> — </span>
                        <span>{renderInline(split.rest, `lir${k}-${j}`)}</span>
                      </>
                    ) : (
                      renderInline(it.text, `li${k}-${j}`)
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size = 180 }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = size / 2;
  const innerRadius = radius * 0.6;
  const cx = radius;
  const cy = radius;

  let cumulative = 0;
  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    let d_path;
    if (data.length === 1) {
      d_path = `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} L ${cx - 0.01} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius} Z`;
    } else {
      d_path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    return {
      path: d_path,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      label: d.label,
      value: d.value,
      pct: (d.value / total) * 100,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color}>
            <title>{s.label}: {s.pct.toFixed(1)}%</title>
          </path>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-400 text-[10px] uppercase tracking-wider font-medium">Total</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-800 text-sm font-bold">{fmt(total)}</text>
      </svg>
      <div className="flex-1 w-full space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-slate-700 truncate flex-1 min-w-0">{s.label}</span>
            <span className="text-slate-500 font-medium shrink-0">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Quick-prompt chips shown above the chat input.
// To customize: edit the `label` (button text shown to the RM)
// and `text` (the actual question sent to the agent) below.
// Add/remove entries freely — the UI renders whatever is in this array.
// ============================================================
const QUICK_PROMPTS = [
  { label: 'Recommend products',    text: 'Recommend 2-3 suitable products for this customer.' },
  { label: 'Risk Alignment Check',  text: 'Check this client\'s risk alignment and flag any suitability gaps.' },
  { label: 'Conversation Prep',     text: 'Help me prepare for a conversation with this client.' },
];

export default function Detail() {
  const router = useRouter();
  const { customer_id, from, sales_code } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Selected flag drives both the banner and the talking-points "Focus" tag.
  // Initialized from the URL ?from= param when arriving from a filter tab,
  // otherwise null (no auto-banner — the RM picks via clickable chips).
  const [selectedFlag, setSelectedFlag] = useState(null);

  // ============================================================
  // WebSocket chat with Agent Studio
  // ============================================================
  // Credentials provided by Agent Studio team. These do NOT expire.
  // segment_code is generated per session (random) and identifies
  // this conversation thread on the Agent Studio side.
  const WS_URL = 'wss://agents.dyna.ai/openapi/v2/ws/dialog/';
  const WS_CREDS = {
    cybertron_robot_key: 'NJGk6v0a6GuxNOLx6bcmSbOKtec%3D',
    cybertron_robot_token: 'MTc3NTYzNTc5OTQyMwpzUXZ3clZoQlJGMkNXcnpNZG1sTHpob2UyaGc9',
    username: 'internaltest_xiaolu@dyna.ai',
  };

  const wsRef = useRef(null);
  const segmentCodeRef = useRef(null);
  const [wsStatus, setWsStatus] = useState('idle'); // idle | connecting | ready | error
  const [chatMessages, setChatMessages] = useState([]); // [{role: 'user'|'agent'|'system', text: string}]
  const [chatInput, setChatInput] = useState('');
  const [waitingReply, setWaitingReply] = useState(false);
  // Streaming state — when an agent reply arrives in full, we pipe it
  // through a typewriter so the message appears progressively. This
  // keeps the perceived latency low and the UI feels alive even though
  // the underlying API delivers in one shot.
  const [streamingText, setStreamingText] = useState('');
  const streamTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastAgentReplyRef = useRef(null); // Track last reply to prevent duplicates

  // Generate a fresh segment_code per chat session
  const newSegmentCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 22; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s + Date.now().toString().slice(-6);
  };

  // Send a question through the WebSocket
  const sendWsQuestion = (question) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[chat] WebSocket not open, cannot send');
      return false;
    }
    const payload = {
      ...WS_CREDS,
      question: String(question),
      segment_code: segmentCodeRef.current,
    };
    console.log('[chat] sending:', payload);
    ws.send(JSON.stringify(payload));
    return true;
  };

  // Typewriter / progressive reveal for the agent's reply.
  // The Agent Studio API delivers each answer in one shot, so we
  // simulate streaming on the client to keep the UX responsive: the
  // bubble appears immediately and characters fill in over ~600-1500ms
  // depending on length. The chunk size + interval are tuned to feel
  // close to a real LLM stream without being annoyingly slow on long
  // recommendation lists.
  const startStreaming = (fullText) => {
    // Stop any previous stream
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setWaitingReply(false);
    setStreamingText('');

    const total = fullText.length;
    if (total === 0) return;

    // Target: finish within ~1.2s for typical replies, ~2s for very long ones.
    // Adjust chunk size so we land in that window.
    const targetMs = Math.min(2000, Math.max(600, total * 6));
    const intervalMs = 24;
    const chunk = Math.max(2, Math.ceil(total / (targetMs / intervalMs)));

    let cursor = 0;
    streamTimerRef.current = setInterval(() => {
      cursor = Math.min(total, cursor + chunk);
      setStreamingText(fullText.slice(0, cursor));
      if (cursor >= total) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        // Commit the full message and clear the streaming buffer
        setChatMessages((prev) => [...prev, { role: 'agent', text: fullText }]);
        setStreamingText('');
      }
    }, intervalMs);
  };

  // Cleanup any in-flight stream when the panel closes
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, []);

  // Open WebSocket when the chat panel is opened.
  // Auto-send customer_id as the first message so the agent loads
  // the client's profile from its database.
  useEffect(() => {
    if (!chatOpen || !customer_id) return;

    // Reset session state
    segmentCodeRef.current = newSegmentCode();
    lastAgentReplyRef.current = null;
    setChatMessages([]);
    setStreamingText('');
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setWsStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[chat] WebSocket opened');
      setWsStatus('ready');
      setWaitingReply(true);
      sendWsQuestion(customer_id);
    };

    ws.onmessage = (event) => {
      console.log('[chat] received raw:', event.data);
      let parsed;
      try {
        parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (e) {
        parsed = { answer: String(event.data) };
      }

      if (parsed.data && parsed.data.history && Array.isArray(parsed.data.history)) {
        const history = parsed.data.history;
        for (let i = history.length - 1; i >= 0; i--) {
          const reply = history[i].robot_user_replying;
          if (reply && reply.trim() !== '') {
            if (lastAgentReplyRef.current !== reply) {
              lastAgentReplyRef.current = reply;
              startStreaming(String(reply));
            } else {
              setWaitingReply(false);
            }
            return;
          }
        }
        return;
      }

      if (parsed.code && parsed.code !== '000000') {
        setChatMessages((prev) => [...prev, { role: 'agent', text: `Error: ${parsed.message || 'Unknown error'}` }]);
        setWaitingReply(false);
      }
    };

    ws.onerror = (err) => {
      console.error('[chat] WebSocket error:', err);
      setWsStatus('error');
      setWaitingReply(false);
    };

    ws.onclose = (event) => {
      console.log('[chat] WebSocket closed', event.code, event.reason);
      if (wsStatus !== 'error') setWsStatus('idle');
    };

    return () => {
      try {
        ws.close();
      } catch (e) {}
      wsRef.current = null;
    };
  }, [chatOpen, customer_id]);

  // Auto-scroll to bottom when new messages arrive (or stream grows)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chatMessages, waitingReply, streamingText]);

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text || waitingReply || wsStatus !== 'ready') return;
    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');
    setWaitingReply(true);
    sendWsQuestion(text);
  };

  const handleQuickPrompt = (text) => {
    if (waitingReply || wsStatus !== 'ready') return;
    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setWaitingReply(true);
    sendWsQuestion(text);
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  useEffect(() => {
    if (!customer_id) return;
    setLoading(true);
    setError(null);
    const fromParam = from ? `&from=${from}` : '';
    fetch(`/api/client-detail?customer_id=${customer_id}${fromParam}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [customer_id, from]);

  // Initialize selectedFlag once data loads.
  // Priority: URL ?from= (if it's actually one of this client's flags) > null
  useEffect(() => {
    if (!data) return;
    const validFromFilter = from && data.priority_flags && data.priority_flags.includes(from);
    setSelectedFlag(validFromFilter ? from : null);
  }, [data, from]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-400">Loading client details…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center max-w-sm">
          <div className="text-rose-600 font-semibold mb-2">Client not found</div>
          <div className="text-sm text-slate-500 break-all mb-4">Customer ID: {customer_id}</div>
          <Link href="/" className="inline-block text-sm bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg">
            ← Back to Customer Summary
          </Link>
        </div>
      </div>
    );
  }

  const { summary, portfolio, risk_check, talking_points, priority_flags, flag_labels, banners } = data;

  // Compute current banner from the *selected* flag, not the URL.
  const selectedMeta = selectedFlag && FLAG_META[selectedFlag] ? FLAG_META[selectedFlag] : null;
  const selectedBanner = selectedFlag && banners?.[selectedFlag];

  const sortedPortfolio = [...portfolio].sort((a, b) => (b.pct_of_aum || 0) - (a.pct_of_aum || 0));
  const donutData = sortedPortfolio.map(h => ({ label: h.product_name, value: h.value || 0 }));
  const backHref = sales_code ? `/?sales_code=${sales_code}` : '/';

  return (
    <>
      <Head>
        <title>{summary.name} — Client Brief</title>
      </Head>

      <div className="min-h-screen bg-white pb-24">
        {/* Back bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Customer Summary
            </Link>
          </div>
        </div>

        {/* Indivara-style header */}
        <header className="bg-bannerBg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 border-2 border-brand-700 text-brand-800">
                {summary.avatar_initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Client Briefing</div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mt-1 break-words leading-tight tracking-tight">{summary.name}</h1>
                <div className="text-sm text-slate-600 mt-2 flex items-center gap-2 flex-wrap">
                  <span>
                    {summary.segment}
                    {summary.age && ` · ${summary.age} y/o`}
                    {summary.gender && summary.gender !== 'N/A' && ` · ${summary.gender}`}
                  </span>
                  {summary.days_to_birthday !== null && summary.days_to_birthday !== undefined && summary.days_to_birthday <= 7 && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                      🎂 {summary.days_to_birthday === 0 ? 'Birthday today' : summary.days_to_birthday === 1 ? 'Birthday tomorrow' : `Birthday in ${summary.days_to_birthday} days`}
                    </span>
                  )}
                </div>

                {/* ===========================================================
                    Clickable priority chips.
                    Per Indivara feedback: chips should be clickable regardless
                    of how the RM arrived at this page (including from "All
                    Clients"), so they can drill into the rationale behind
                    each flag. Active chip drives the banner below.
                    =========================================================== */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {priority_flags.map((f, i) => {
                    const isActive = selectedFlag === f;
                    const meta = FLAG_META[f];
                    const hasBanner = !!banners?.[f];
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedFlag(isActive ? null : f)}
                        title={hasBanner ? 'Click to see why' : 'No additional context'}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-medium border transition ${
                          isActive
                            ? (meta?.chipActive || 'bg-brand-700 text-white border-brand-700')
                            : 'bg-white text-slate-700 border-slate-200 hover:border-brand-500 hover:text-brand-700'
                        }`}
                      >
                        {flag_labels[i]}
                      </button>
                    );
                  })}
                </div>
                {priority_flags.length > 0 && !selectedFlag && (
                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    Tap a tag above to see why this client is on that list.
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Personalized banner — driven by selectedFlag, not the URL */}
        {selectedMeta && selectedBanner && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
            <div className={`bg-white border border-slate-200 border-l-4 ${selectedMeta.accent} rounded-xl p-4 shadow-sm relative`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Why this client is on your {selectedMeta.label} list
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed">{selectedBanner}</div>
                </div>
                <button
                  onClick={() => setSelectedFlag(null)}
                  aria-label="Dismiss"
                  className="text-slate-300 hover:text-slate-500 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          <div className="lg:col-span-2 space-y-5">

            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">About Client</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Birth Date" value={fmtBirthDate(summary.birth_date)} />
                <Field label="Profession" value={summary.profession} />
                <Field label="Marital Status" value={summary.marital_status} />
                <Field label="Location" value={summary.location} />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">Wealth Profile</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Total AUM</div>
                  <div className="text-lg sm:text-xl font-bold text-brand-600 mt-0.5">{fmt(summary.total_aum)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Income</div>
                  <div className="text-sm font-medium text-slate-800 mt-1.5">₱{summary.income}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Risk Profile</div>
                  <div className="mt-1.5">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskBadgeColor[summary.risk_profile] || 'bg-slate-100 text-slate-600'}`}>
                      {summary.risk_profile}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Holdings</div>
                  <div className="text-lg font-semibold text-slate-800 mt-0.5">{summary.holdings_count}</div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Portfolio Breakdown</div>
                <div className="text-xs text-slate-400">{sortedPortfolio.length} fund{sortedPortfolio.length !== 1 ? 's' : ''}</div>
              </div>

              {sortedPortfolio.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-6">No holdings</div>
              ) : (
                <>
                  {sortedPortfolio.length >= 2 && (
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <DonutChart data={donutData} size={180} />
                    </div>
                  )}

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="pb-3 font-medium">Fund</th>
                          <th className="pb-3 font-medium text-right">Value</th>
                          <th className="pb-3 font-medium text-right">% AUM</th>
                          <th className="pb-3 font-medium text-right">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPortfolio.map((h, i) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0">
                            <td className="py-3 pr-4">
                              <div className="font-medium text-slate-900">{h.product_name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{h.category} · {h.units.toLocaleString()} units</div>
                            </td>
                            <td className="py-3 text-right font-medium text-slate-900">{fmt(h.value)}</td>
                            <td className="py-3 text-right text-slate-600">{fmtPct(h.pct_of_aum)}</td>
                            <td className="py-3 text-right">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskBadgeColor[h.risk_level] || 'bg-slate-100 text-slate-600'}`}>
                                {h.risk_level.replace('Moderately ', 'Mod. ')}
                              </span>
                              {h.risk_status === 'mismatch' && (
                                <div className="text-[10px] text-rose-600 mt-1 font-medium">⚠ Mismatch</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="sm:hidden space-y-3">
                    {sortedPortfolio.map((h, i) => (
                      <div key={i} className="border border-slate-100 rounded-lg p-3">
                        <div className="font-medium text-slate-900 text-sm">{h.product_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{h.category} · {h.units.toLocaleString()} units</div>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <div className="font-semibold text-slate-900">{fmt(h.value)}</div>
                            <div className="text-xs text-slate-500">{fmtPct(h.pct_of_aum)} of AUM</div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskBadgeColor[h.risk_level] || 'bg-slate-100 text-slate-600'}`}>
                              {h.risk_level.replace('Moderately ', 'Mod. ')}
                            </span>
                            {h.risk_status === 'mismatch' && (
                              <div className="text-[10px] text-rose-600 mt-1 font-medium">⚠ Mismatch</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className={`rounded-xl border p-5 sm:p-6 ${statusBg[risk_check.status] || statusBg.unknown}`}>
              <div className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-70">Risk Alignment Check</div>
              <div className="text-sm">
                {risk_check.status === 'aligned' ? (
                  <div><span className="font-semibold">All holdings aligned</span> with client's <strong>{risk_check.client_risk}</strong> risk profile.</div>
                ) : risk_check.mismatches && risk_check.mismatches.length > 0 ? (
                  <div>
                    <div className="font-semibold mb-1.5">
                      {risk_check.mismatches.length} holding{risk_check.mismatches.length > 1 ? 's' : ''} above client's <strong>{risk_check.client_risk}</strong> risk tolerance:
                    </div>
                    <ul className="space-y-1">
                      {risk_check.mismatches.map((m, i) => (
                        <li key={i} className="opacity-90">
                          • {m.product_name} ({m.product_risk}, +{m.gap} tier{m.gap > 1 ? 's' : ''})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>Client risk profile: {risk_check.client_risk}</div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-brand-700 text-white flex items-center justify-center text-xs font-bold">AI</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Talking Points</div>
              </div>

              <div className="space-y-4">
                {talking_points.map((p, i) => {
                  // Focus highlight follows the *currently selected* flag,
                  // so it stays in sync with the banner above when the RM
                  // clicks different chips.
                  const isContextPoint = selectedFlag && p.tag === selectedFlag;
                  return (
                    <div
                      key={i}
                      className={`border-l-2 pl-4 ${isContextPoint ? 'border-brand-700' : 'border-brand-200'}`}
                    >
                      <div className="flex items-center gap-2 text-brand-700 mb-1">
                        {iconFor(p.icon)}
                        <div className="font-semibold text-sm">{p.title}</div>
                        {isContextPoint && (
                          <span className="text-[9px] uppercase tracking-wider bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-bold">Focus</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed">{p.body}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-bannerBg rounded-xl border border-brand-200 p-5">
              <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold mb-1">AI Assistant</div>
              <div className="text-sm text-slate-700">
                Ask the chatbot in the bottom-right corner for product recommendations tailored to this client.
              </div>
            </div>
          </aside>
        </main>

        {/* ================================================================ */}
        {/* Chatbot floating button (always visible on detail pages)          */}
        {/* ================================================================ */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            aria-label="Open AI Assistant"
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-700 hover:bg-brand-800 text-white shadow-lg flex items-center justify-center transition z-40"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        )}

        {/* Chatbot panel — custom chat UI talking to Agent Studio via WebSocket */}
        {chatOpen && (
          <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[680px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-brand-800 text-white sm:rounded-t-2xl shrink-0">
              <div>
                <div className="text-xs text-brand-200">AI Assistant</div>
                <div className="text-sm font-semibold">
                  {summary?.name ? summary.name.split(' ')[0] : 'Product Recommendations'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    wsStatus === 'ready'      ? 'bg-emerald-400 text-emerald-900' :
                    wsStatus === 'connecting' ? 'bg-amber-300 text-amber-900' :
                    wsStatus === 'error'      ? 'bg-rose-400 text-white' :
                                                'bg-slate-300 text-slate-700'
                  }`}
                >
                  {wsStatus === 'ready' ? 'online' :
                   wsStatus === 'connecting' ? 'connecting…' :
                   wsStatus === 'error' ? 'error' : 'offline'}
                </span>
                <button
                  onClick={() => setChatOpen(false)}
                  aria-label="Close"
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
              {wsStatus === 'connecting' && chatMessages.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-8">
                  Connecting to AI Assistant…
                </div>
              )}
              {wsStatus === 'error' && (
                <div className="text-center text-xs text-rose-600 py-8">
                  Connection failed. Close and reopen this panel to retry.
                </div>
              )}

              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
                      m.role === 'user'
                        ? 'bg-brand-700 text-white rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {m.role === 'user' ? m.text : <MarkdownMessage text={m.text} />}
                  </div>
                </div>
              ))}

              {/* Streaming bubble — shown while the typewriter is filling in
                  the latest agent reply. Renders the same markdown component
                  as committed messages, with a blinking caret appended. */}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm px-4 py-2.5 bg-white border border-slate-200 text-slate-800 shadow-sm">
                    <MarkdownMessage text={streamingText} />
                    <span className="inline-block w-[7px] h-[14px] bg-brand-500 ml-0.5 align-text-bottom animate-pulse rounded-sm" />
                  </div>
                </div>
              )}

              {waitingReply && !streamingText && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[11px] text-slate-400 italic">thinking…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick-prompt chips above input — clarifies supported actions
                and gives the RM one-tap entry into each. Hidden once they
                start typing or once the conversation has begun, to stay out
                of the way. */}
            {wsStatus === 'ready' && !waitingReply && !streamingText && chatInput.trim() === '' && (
              <div className="px-3 pt-2 pb-1 bg-white shrink-0 border-t border-slate-100">
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(q.text)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition font-medium"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-slate-100 p-3 bg-white shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder={wsStatus === 'ready' ? 'Ask about this client…' : 'Connecting…'}
                  disabled={wsStatus !== 'ready' || waitingReply}
                  rows={1}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:bg-white disabled:opacity-50 max-h-32"
                />
                <button
                  onClick={handleSendChat}
                  disabled={wsStatus !== 'ready' || waitingReply || !chatInput.trim()}
                  className="bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 transition"
                  aria-label="Send"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
