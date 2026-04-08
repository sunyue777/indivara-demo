import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

const SALES_CODES = [
  { code: 'RAMPVERIMG',  label: 'Ramos P. — RAMPVERIMG' },
  { code: 'INVPTL',      label: 'Investment Portal — INVPTL' },
  { code: 'RAMPVER',     label: 'Ramos P. — RAMPVER' },
  { code: 'RAMPVER_OFL', label: 'Ramos P. — RAMPVER_OFL' },
];

const FILTERS = [
  { key: 'ALL',       label: 'All Clients' },
  { key: 'GROWTH',    label: 'Growth Opportunity' },
  { key: 'UPSELL',    label: 'Up-sell Opportunity' },
  { key: 'REBALANCE', label: 'Rebalance Alert' },
  { key: 'CROSSSELL', label: 'Cross-sell Opportunity' },
];

const TAG_PRIMARY = {
  GROWTH:    'bg-emerald-600 text-white',
  REBALANCE: 'bg-rose-600 text-white',
  UPSELL:    'bg-violet-600 text-white',
  CROSSSELL: 'bg-amber-600 text-white',
};

const TAG_MUTED = {
  GROWTH:    'bg-emerald-50 text-emerald-600 border border-emerald-100',
  REBALANCE: 'bg-rose-50 text-rose-600 border border-rose-100',
  UPSELL:    'bg-violet-50 text-violet-600 border border-violet-100',
  CROSSSELL: 'bg-amber-50 text-amber-600 border border-amber-100',
};

const TAG_SHORT = {
  GROWTH: 'Growth',
  REBALANCE: 'Rebalance',
  UPSELL: 'Up-sell',
  CROSSSELL: 'Cross-sell',
};

const PAGE_SIZE = 20;

const cycleSort = (current) => {
  if (current === 'none') return 'desc';
  if (current === 'desc') return 'asc';
  return 'none';
};

const SortButton = ({ label, value, onClick }) => {
  const active = value !== 'none';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
        active
          ? 'bg-accent-600 text-white border-accent-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
      }`}
    >
      {label}
      {value === 'desc' && <span className="text-xs">↓</span>}
      {value === 'asc' && <span className="text-xs">↑</span>}
    </button>
  );
};

export default function Home() {
  const [data, setData] = useState(null);
  const [salesCode, setSalesCode] = useState('RAMPVERIMG');
  const [filter, setFilter] = useState('ALL');
  const [sortAum, setSortAum] = useState('none');
  const [sortHoldings, setSortHoldings] = useState('none');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      sales_code: salesCode,
      priority_filter: filter,
      sort_aum: sortAum,
      sort_holdings: sortHoldings,
      search,
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    fetch(`/api/client-list?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [salesCode, filter, sortAum, sortHoldings, search, page]);

  useEffect(() => { setPage(1); }, [salesCode, filter, sortAum, sortHoldings, search]);

  const totalPages = data?.total_pages || 1;
  const showingStart = data && data.total > 0 ? (data.page - 1) * data.page_size + 1 : 0;
  const showingEnd = data ? Math.min(data.page * data.page_size, data.total) : 0;

  const clearSorts = () => { setSortAum('none'); setSortHoldings('none'); };

  return (
    <div className="min-h-screen bg-white">
      {/* Indivara-style hero header */}
      <header className="bg-bannerBg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                Customer Summary
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                AI-curated client insights to help RMs prioritise outreach
              </p>
            </div>
            {/* Sales code switcher */}
            <div className="shrink-0">
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">RM Account</label>
              <select
                value={salesCode}
                onChange={(e) => setSalesCode(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 max-w-[240px]"
              >
                {SALES_CODES.map(s => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-semibold text-brand-700">{salesCode}</span> · {data?.total ?? 0} clients in book
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search bar */}
        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or initials…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                filter === f.key
                  ? 'bg-brand-700 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort + result count */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-xs text-slate-500">
            {!loading && data && (
              data.total === 0
                ? <>No clients match</>
                : <>Showing <span className="font-medium text-slate-700">{showingStart}–{showingEnd}</span> of <span className="font-medium text-slate-700">{data.total}</span></>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Sort:</span>
            <SortButton label="AUM" value={sortAum} onClick={() => setSortAum(cycleSort(sortAum))} />
            <SortButton label="Holdings" value={sortHoldings} onClick={() => setSortHoldings(cycleSort(sortHoldings))} />
            {(sortAum !== 'none' || sortHoldings !== 'none') && (
              <button onClick={clearSorts} className="text-xs text-slate-400 hover:text-slate-600 underline">clear</button>
            )}
          </div>
        </div>

        {loading && <div className="bg-white rounded-lg border border-slate-100 p-8 text-center text-slate-400">Loading…</div>}

        {!loading && data && data.clients.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-100 p-8 text-center text-slate-400">No clients match this filter.</div>
        )}

        {!loading && data && data.clients.length > 0 && (
          <>
            <div className="space-y-2">
              {data.clients.map(c => (
                <Link
                  key={c.customer_id}
                  href={`/detail?customer_id=${c.customer_id}&from=${filter}&sales_code=${salesCode}`}
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
                        {c.days_to_birthday !== null && c.days_to_birthday !== undefined && c.days_to_birthday <= 7 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-pink-100 text-pink-700 border border-pink-200"
                            title={c.days_to_birthday === 0 ? 'Birthday today!' : c.days_to_birthday === 1 ? 'Birthday tomorrow' : `Birthday in ${c.days_to_birthday} days`}
                          >
                            🎂 {c.days_to_birthday === 0 ? 'today' : c.days_to_birthday === 1 ? 'tomorrow' : `${c.days_to_birthday}d`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {c.priority_flags.map(f => {
                          const isPrimary = filter !== 'ALL' && f === filter;
                          return (
                            <span key={f} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isPrimary
                                ? TAG_PRIMARY[f]
                                : (filter === 'ALL' ? TAG_PRIMARY[f] : TAG_MUTED[f]) || 'bg-slate-100 text-slate-600'
                            }`}>
                              {TAG_SHORT[f] || f}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-xs text-slate-600 mt-1.5 leading-snug">
                        {c.contextual_suggestion || c.default_suggestion}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-slate-900">{fmt(c.aum)}</div>
                      <div className="text-xs text-slate-400">{c.holdings_count} holding{c.holdings_count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >← Prev</button>
                {getPageNumbers(page, totalPages).map((p, i) => (
                  p === '...' ? (
                    <span key={i} className="px-2 text-slate-400">…</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setPage(p)}
                      className={`min-w-[36px] px-3 py-1.5 text-sm rounded-lg border ${
                        p === page
                          ? 'bg-brand-700 text-white border-brand-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                      }`}
                    >{p}</button>
                  )
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}
