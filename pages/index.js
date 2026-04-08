import { useEffect, useState } from 'react';
import Link from 'next/link';

const fmt = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

const FILTERS = [
  { key: 'ALL',       label: 'All Clients' },
  { key: 'GROWTH',    label: 'Growth Opportunity' },
  { key: 'UPSELL',    label: 'Up-sell Opportunity' },
  { key: 'REBALANCE', label: 'Rebalance Alert' },
  { key: 'CROSSSELL', label: 'Cross-sell Opportunity' },
  { key: 'BIRTHDAY',  label: '🎂 Birthday This Week' },
];

const TAG_PRIMARY = {
  GROWTH:    'bg-emerald-600 text-white',
  REBALANCE: 'bg-rose-600 text-white',
  UPSELL:    'bg-violet-600 text-white',
  CROSSSELL: 'bg-amber-600 text-white',
  BIRTHDAY:  'bg-pink-600 text-white',
};

const TAG_MUTED = {
  GROWTH:    'bg-emerald-50 text-emerald-600 border border-emerald-100',
  REBALANCE: 'bg-rose-50 text-rose-600 border border-rose-100',
  UPSELL:    'bg-violet-50 text-violet-600 border border-violet-100',
  CROSSSELL: 'bg-amber-50 text-amber-600 border border-amber-100',
  BIRTHDAY:  'bg-pink-50 text-pink-600 border border-pink-100',
};

const TAG_SHORT = {
  GROWTH: 'Growth',
  REBALANCE: 'Rebalance',
  UPSELL: 'Up-sell',
  CROSSSELL: 'Cross-sell',
  BIRTHDAY: '🎂 Birthday',
};

const PAGE_SIZE = 20;

// 3-state cycle: none → desc → asc → none
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
          ? 'bg-brand-600 text-white border-brand-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
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
  const [filter, setFilter] = useState('ALL');
  const [sortAum, setSortAum] = useState('none');
  const [sortHoldings, setSortHoldings] = useState('none');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce search input → search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      sales_code: 'RAMPVERIMG',
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
  }, [filter, sortAum, sortHoldings, search, page]);

  // Reset to page 1 when filter / sort / search changes
  useEffect(() => { setPage(1); }, [filter, sortAum, sortHoldings, search]);

  const totalPages = data?.total_pages || 1;
  const showingStart = data && data.total > 0 ? (data.page - 1) * data.page_size + 1 : 0;
  const showingEnd = data ? Math.min(data.page * data.page_size, data.total) : 0;

  const clearSorts = () => { setSortAum('none'); setSortHoldings('none'); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-brand-700 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Customer Summary</h1>
          <div className="text-sm text-brand-100 mt-1">RM: RAMPVERIMG · {data?.total ?? 0} clients</div>
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
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
                  ? 'bg-brand-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort controls + result count */}
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
              <button
                onClick={clearSorts}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                clear
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg p-8 text-center text-slate-400">Loading…</div>
        )}

        {!loading && data && data.clients.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center text-slate-400">No clients match this filter.</div>
        )}

        {!loading && data && data.clients.length > 0 && (
          <>
            <div className="space-y-2">
              {data.clients.map(c => (
                <Link
                  key={c.customer_id}
                  href={`/detail?customer_id=${c.customer_id}&from=${filter}`}
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
                        {c.priority_flags.map(f => {
                          const isPrimary = filter !== 'ALL' && f === filter;
                          return (
                            <span
                              key={f}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isPrimary
                                  ? TAG_PRIMARY[f]
                                  : (filter === 'ALL' ? TAG_PRIMARY[f] : TAG_MUTED[f]) || 'bg-slate-100 text-slate-600'
                              }`}
                            >
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) => (
                  p === '...' ? (
                    <span key={i} className="px-2 text-slate-400">…</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setPage(p)}
                      className={`min-w-[36px] px-3 py-1.5 text-sm rounded-lg border ${
                        p === page
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                      }`}
                    >
                      {p}
                    </button>
                  )
                ))}

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
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
