import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

export default function Home() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/client-list?sales_code=RAMPVERIMG&priority_filter=${filter}&page=1&page_size=30`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-brand-700 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-xs uppercase tracking-widest text-brand-100">Dyna × Indivara — RM Assist Demo</div>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1">Customer Summary</h1>
          <div className="text-sm text-brand-100 mt-1">RM: RAMPVERIMG · {data?.total || 0} clients</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['ALL', 'P1', 'P2'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === f
                  ? 'bg-brand-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
              }`}
            >
              {f === 'ALL' ? 'All Clients' : f === 'P1' ? 'P1 · Growth Opportunity' : 'P2 · Single Product'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-white rounded-lg p-8 text-center text-slate-400">Loading…</div>
        )}

        {!loading && data && (
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
                      {c.priority_flags.map(f => (
                        <span key={f} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          f === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                        }`}>{f}</span>
                      ))}
                    </div>
                    <div className="text-sm text-slate-500 truncate mt-0.5">{c.ai_suggestion}</div>
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
          Showing first 30 of {data?.total || 0}. This index page is for testing — in production, Indivara renders the list in Avantrade.
        </div>
      </div>
    </div>
  );
}
