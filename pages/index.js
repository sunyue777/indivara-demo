import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

const FILTERS = [
  { key: 'ALL',       label: 'All Clients',          color: 'slate' },
  { key: 'GROWTH',    label: 'Growth Opportunity',   color: 'emerald' },
  { key: 'REBALANCE', label: 'Rebalance Alert',      color: 'rose' },
  { key: 'UPSELL',    label: 'Up-sell Opportunity',  color: 'violet' },
  { key: 'CROSSSELL', label: 'Cross-sell Opportunity', color: 'amber' },
];

const TAG_STYLE = {
  GROWTH:    'bg-emerald-100 text-emerald-700',
  REBALANCE: 'bg-rose-100 text-rose-700',
  UPSELL:    'bg-violet-100 text-violet-700',
  CROSSSELL: 'bg-amber-100 text-amber-700',
};

const TAG_SHORT = {
  GROWTH: 'Growth',
  REBALANCE: 'Rebalance',
  UPSELL: 'Up-sell',
  CROSSSELL: 'Cross-sell',
};

export default function Home() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/client-list?sales_code=RAMPVERIMG&priority_filter=${filter}&page=1&page_size=30`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-brand-700 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-xs uppercase tracking-widest text-brand-100">Dyna × Indivara — RM Assist Demo</div>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1">Customer Summary</h1>
          <div className="text-sm text-brand-100 mt-1">RM: RAMPVERIMG · {data?.total ?? 0} clients</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                filter === f.key
                  ? 'bg-brand-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-white rounded-lg p-8 text-center text-slate-400">Loading…</div>
        )}

        {!loading && data && data.clients.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center text-slate-400">No clients match this filter.</div>
        )}

        {!loading && data && data.clients.length > 0 && (
          <div className="space-y-2">
            {data.clients.map(c => (
              <Link
                key={c.customer_id}
                href={`/detail?customer_id=${c.customer_id}`}
                className="block bg-white rounded-lg border border-slate-200 hover:border-brand-400 hover:shadow-md transition p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold shrink-0">
                    {c.avatar_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-slate-900 truncate">{c.client_name}</div>
                      {c.age && <span className="text-xs text-slate-400">· age {c.age}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {c.priority_flags.map(f => (
                        <span key={f} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_STYLE[f] || 'bg-slate-100 text-slate-600'}`}>
                          {TAG_SHORT[f] || f}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-1">{c.ai_suggestion}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-900">{fmt(c.aum)}</div>
                    <div className="text-xs text-slate-400">{c.holdings_count} holding{c.holdings_count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-400 text-center mt-8">
          Showing first 30 of {data?.total ?? 0}. This page is for testing — Indivara renders the list in Avantrade.
        </div>
      </div>
    </div>
  );
}
