import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Script from 'next/script';

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

const FROM_LABEL = {
  GROWTH:    { label: 'Growth Opportunity',     accent: 'border-l-emerald-500' },
  UPSELL:    { label: 'Up-sell Opportunity',    accent: 'border-l-violet-500' },
  REBALANCE: { label: 'Rebalance Alert',        accent: 'border-l-rose-500' },
  CROSSSELL: { label: 'Cross-sell Opportunity', accent: 'border-l-amber-500' },
};

const DONUT_COLORS = [
  '#3DBFD4', '#22a8c0', '#1c8aa1', '#1b6f82', '#a3e9f2',
  '#6dd7e6', '#1c5b6b', '#10b981', '#34d399', '#6ee7b7',
  '#a7f3d0', '#0d9488', '#14b8a6', '#5eead4', '#1849a3',
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

export default function Detail() {
  const router = useRouter();
  const { customer_id, from, sales_code } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const fromContext = from && FROM_LABEL[from] ? FROM_LABEL[from] : null;
  const personalBanner = from && banners?.[from];

  const sortedPortfolio = [...portfolio].sort((a, b) => (b.pct_of_aum || 0) - (a.pct_of_aum || 0));
  const donutData = sortedPortfolio.map(h => ({ label: h.product_name, value: h.value || 0 }));
  const backHref = sales_code ? `/?sales_code=${sales_code}` : '/';

  return (
    <>
      <Head>
        <title>{summary.name} — Client Brief</title>
      </Head>

      {/* Agent Studio chatbot iframe — only loads on detail page */}
      <Script
        id="chatbot-iframe"
        src="https://agents.dyna.ai/assets/js/iframe.js"
        data-bot-src="https://agents.dyna.ai/botWeb?id=89d8fb9686b35bbed87233a14b2d2d45&token=MTc3NTUzMjg0NzgyMApOSmxjNm4vUGU1dkI0ck5CdXlqV2Q0d1JxTFk9&key=LKqt%252FiLmIHI03gvZVug9Bam9VsA%253D&iframe=1"
        data-default-open="false"
        data-drag="true"
        strategy="afterInteractive"
      />

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
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 border-2 border-brand-400 text-brand-700">
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
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {priority_flags.map((f, i) => (
                    <span
                      key={f}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        from === f ? 'bg-brand-400 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {flag_labels[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Personalized banner */}
        {fromContext && personalBanner && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
            <div className={`bg-white border border-slate-200 border-l-4 ${fromContext.accent} rounded-xl p-4 shadow-sm`}>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Why this client is on your {fromContext.label} list
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">{personalBanner}</div>
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
                <div className="w-6 h-6 rounded bg-brand-400 text-white flex items-center justify-center text-xs font-bold">AI</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Talking Points</div>
              </div>

              <div className="space-y-4">
                {talking_points.map((p, i) => {
                  const isContextPoint = from && p.tag === from;
                  return (
                    <div
                      key={i}
                      className={`border-l-2 pl-4 ${isContextPoint ? 'border-brand-500' : 'border-brand-200'}`}
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
      </div>
    </>
  );
}
