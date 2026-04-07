import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const fmtPct = (n) => Number(n || 0).toFixed(1) + '%';

const riskBadgeColor = {
  'Conservative':              'bg-emerald-100 text-emerald-700',
  'Moderately Conservative':   'bg-teal-100 text-teal-700',
  'Moderate':                  'bg-sky-100 text-sky-700',
  'Moderately Aggressive':     'bg-amber-100 text-amber-700',
  'Aggressive':                'bg-rose-100 text-rose-700',
};

const statusColor = {
  ok:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
  mismatch: 'bg-rose-50 text-rose-700 border-rose-200',
};

const iconFor = (key) => {
  // Simple inline SVG icons keyed by talking-point type
  const common = "w-5 h-5";
  switch (key) {
    case 'concentration':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>;
    case 'diversify':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>;
    case 'risk':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>;
    case 'aligned':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>;
    case 'opportunity':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case 'horizon':
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    default:
      return <svg className={common} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
  }
};

export default function Detail() {
  const router = useRouter();
  const { customer_id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!customer_id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/client-detail?customer_id=${customer_id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [customer_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Loading client details…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center max-w-sm">
          <div className="text-rose-600 font-semibold mb-2">Client not found</div>
          <div className="text-sm text-slate-500">Customer ID: {customer_id}</div>
        </div>
      </div>
    );
  }

  const { summary, portfolio, risk_check, talking_points, priority_flags, flag_labels } = data;

  return (
    <>
      <Head>
        <title>{summary.name} — Client Brief</title>
      </Head>

      <div className="min-h-screen bg-slate-50 pb-24">
        {/* Header */}
        <header className="bg-gradient-to-r from-brand-700 to-brand-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl sm:text-2xl font-semibold shrink-0 border border-white/30">
                {summary.avatar_initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-brand-100">Client Briefing</div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-0.5 break-words">{summary.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-white/20 rounded-full">{summary.segment}</span>
                  {priority_flags.map((f, i) => (
                    <span key={f} className="text-xs px-2 py-1 bg-white text-brand-700 rounded-full font-medium">
                      {f} · {flag_labels[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* LEFT / MAIN column (2/3 on desktop) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Summary card */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">Customer Summary</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Total AUM</div>
                  <div className="text-lg sm:text-xl font-semibold text-brand-700 mt-0.5">{fmt(summary.total_aum)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Risk Profile</div>
                  <div className="mt-0.5">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskBadgeColor[summary.risk_profile] || 'bg-slate-100 text-slate-600'}`}>
                      {summary.risk_profile}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Holdings</div>
                  <div className="text-lg font-semibold text-slate-900 mt-0.5">{summary.holdings_count}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Income</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5 truncate">{summary.income}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Profession</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5 truncate">{summary.profession}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Location</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5 truncate">{summary.location}</div>
                </div>
              </div>
            </section>

            {/* Portfolio breakdown */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Portfolio Breakdown</div>
                <div className="text-xs text-slate-400">{portfolio.length} fund{portfolio.length !== 1 ? 's' : ''}</div>
              </div>

              {portfolio.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-6">No holdings</div>
              ) : (
                <>
                  {/* Desktop table */}
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
                        {portfolio.map((h, i) => (
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

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {portfolio.map((h, i) => (
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

            {/* Risk Alignment */}
            <section className={`rounded-xl border p-5 sm:p-6 ${statusColor[risk_check.status] || 'bg-white border-slate-200'}`}>
              <div className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-70">Risk Alignment Check</div>
              <div className="flex items-start gap-3">
                <div className="text-sm flex-1">
                  {risk_check.status === 'ok' || risk_check.status === 'aligned' ? (
                    <div><span className="font-semibold">All holdings aligned</span> with client's {risk_check.client_risk} risk profile.</div>
                  ) : risk_check.mismatches && risk_check.mismatches.length > 0 ? (
                    <div>
                      <div className="font-semibold mb-1">
                        {risk_check.mismatches.length} holding{risk_check.mismatches.length > 1 ? 's' : ''} above client's {risk_check.client_risk} risk tolerance:
                      </div>
                      <ul className="space-y-1 text-sm">
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
              </div>
            </section>
          </div>

          {/* RIGHT / Talking Points column (1/3 on desktop) */}
          <aside className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-brand-600 text-white flex items-center justify-center text-xs font-bold">AI</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Talking Points</div>
              </div>

              <div className="space-y-4">
                {talking_points.map((p, i) => (
                  <div key={i} className="border-l-2 border-brand-400 pl-4">
                    <div className="flex items-center gap-2 text-brand-700 mb-1">
                      {iconFor(p.icon)}
                      <div className="font-semibold text-sm">{p.title}</div>
                    </div>
                    <div className="text-sm text-slate-600 leading-relaxed">{p.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand-50 to-emerald-50 rounded-xl border border-brand-200 p-5">
              <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold mb-1">AI Assistant</div>
              <div className="text-sm text-slate-600">Need product recommendations for this client? Open the chat assistant →</div>
              <button
                onClick={() => setChatOpen(true)}
                className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                Ask AI Assistant
              </button>
            </div>
          </aside>
        </main>

        {/* Chatbot floating button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            aria-label="Open AI Assistant"
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition z-40"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        )}

        {/* Chatbot panel */}
        {chatOpen && (
          <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-brand-700 to-brand-500 text-white sm:rounded-t-2xl">
              <div>
                <div className="text-xs text-brand-100">AI Assistant</div>
                <div className="text-sm font-semibold">Product Recommendations</div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                aria-label="Close"
                className="p-1 hover:bg-white/20 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 bg-slate-50 flex items-center justify-center text-sm text-slate-400 p-6 text-center">
              {/*
                TODO: Replace this placeholder with the Agent Studio chatbot iframe.
                When real API is ready, paste the iframe embed script from Agent Studio,
                appending &customer_id={customer_id} to data-bot-src so the agent knows
                which client is in context.

                Example:
                <iframe
                  src={`https://agents.dyna.ai/botWeb?id=XXX&token=YYY&key=ZZZ&iframe=1&customer_id=${customer_id}`}
                  className="w-full h-full border-0"
                />
              */}
              <div>
                <div className="font-medium text-slate-500 mb-2">Chatbot placeholder</div>
                <div>When Agent C is deployed, the Agent Studio iframe embed will render here with customer_id={customer_id} pre-loaded as context.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
