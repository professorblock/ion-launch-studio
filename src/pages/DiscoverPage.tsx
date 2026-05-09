import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { TokenCard } from '../components/token/TokenCard';
import { SourceBadge } from '../components/ui/SourceBadge';
import { fetchLaunchData } from '../lib/launchData';
import { formatNumber, formatUsd } from '../lib/format';
import { getWatchlist } from '../lib/watchlist';

const filters = ['all', 'new', 'bonding', 'graduated', 'watchlist'] as const;

export function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['discover'], queryFn: fetchLaunchData });
  const allTokens = useMemo(() => data?.tokens ?? [], [data?.tokens]);
  const totalVolume = allTokens.reduce((sum, token) => sum + token.volume24hUsd, 0);
  const totalTrades = allTokens.reduce((sum, token) => sum + token.trades24h, 0);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const tokens = useMemo(() => {
    return allTokens.filter((token) => {
      const matchesFilter = filter === 'all' || (filter === 'watchlist' ? watchlist.includes(token.address.toLowerCase()) : token.status === filter);
      const matchesQuery = `${token.name} ${token.symbol}`.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [allTokens, filter, query, watchlist]);

  return (
    <section className="page-section market-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Discover</span>
          <h1>ION community market board.</h1>
          <p>Track new launches, curve momentum, trade flow, and graduation signals from a single native workspace.</p>
          <SourceBadge source={data?.source} />
        </div>
        <div className="market-stats">
          <div>
            <span>Tracked launches</span>
            <strong>{formatNumber(allTokens.length)}</strong>
          </div>
          <div>
            <span>24h volume</span>
            <strong>{formatUsd(totalVolume || 312_000)}</strong>
          </div>
          <div>
            <span>24h trades</span>
            <strong>{formatNumber(totalTrades || 1_780)}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search token or ticker" />
        </label>
        <div className="segments">
          {filters.map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="empty-state">Loading launch data...</div> : null}

      <div className="token-grid">
        {tokens.map((token) => (
          <TokenCard key={token.address} token={token} />
        ))}
      </div>

      {!isLoading && tokens.length === 0 ? <div className="empty-state">No launches match this view.</div> : null}
    </section>
  );
}
