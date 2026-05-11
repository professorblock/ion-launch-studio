import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Flame, Search, SlidersHorizontal, Sparkles, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SourceBadge } from '../components/ui/SourceBadge';
import { fetchLaunchData } from '../lib/launchData';
import { formatNumber, formatUsd, timeAgo } from '../lib/format';
import { getWatchlist } from '../lib/watchlist';

const filters = ['top', 'new', 'bonding', 'graduated', 'watchlist'] as const;
const pageSize = 10;

export function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filter, setFilter] = useState<(typeof filters)[number]>('top');
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['discover'], queryFn: fetchLaunchData });
  const allTokens = useMemo(() => data?.tokens ?? [], [data?.tokens]);
  const totalVolume = allTokens.reduce((sum, token) => sum + token.volume24hUsd, 0);
  const totalTrades = allTokens.reduce((sum, token) => sum + token.trades24h, 0);
  const topToken = allTokens[0];

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const tokens = useMemo(() => {
    const filtered = allTokens.filter((token) => {
      const matchesFilter =
        filter === 'top' ||
        (filter === 'watchlist' ? watchlist.includes(token.address.toLowerCase()) : token.status === filter);
      const matchesQuery = `${token.name} ${token.symbol}`.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });

    if (filter === 'new') {
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
  }, [allTokens, filter, query, watchlist]);
  const pageCount = Math.max(1, Math.ceil(tokens.length / pageSize));
  const visibleTokens = tokens.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, query, advanced]);

  return (
    <section className="page-section market-page simple-market">
      <div className="market-command">
        <div>
          <span className="eyebrow">Discover</span>
          <h1>Find the next ION community coin.</h1>
          <p>Search launches, follow momentum, and open any market without leaving the platform.</p>
        </div>
        <Link className="button button-primary" to="/launch">
          Create coin
          <ArrowUpRight size={17} />
        </Link>
      </div>

      <div className="market-console">
        <form className="market-search" onSubmit={(event) => event.preventDefault()}>
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or ticker" />
        </form>
        <div className="market-tabs">
          {filters.map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <button className={`mode-toggle ${advanced ? 'active' : ''}`} type="button" onClick={() => setAdvanced((value) => !value)}>
          <SlidersHorizontal size={16} />
          {advanced ? 'Advanced on' : 'Simple mode'}
        </button>
      </div>

      <div className="market-dashboard">
        <div className="spotlight-card">
          {topToken ? <img src={topToken.imageUrl} alt="" /> : null}
          <div>
            <span><Flame size={15} /> Hot launch</span>
            <strong>{topToken ? topToken.name : 'Market loading'}</strong>
            <small>{topToken ? `$${topToken.symbol} · ${formatUsd(topToken.marketCapUsd)} market cap` : 'Fetching launch board'}</small>
          </div>
          {topToken ? <Link to={`/token/${topToken.address}`}>Open</Link> : null}
        </div>
        <div className="board-metrics">
          <div>
            <Sparkles size={17} />
            <span>Launches</span>
            <strong>{formatNumber(allTokens.length)}</strong>
          </div>
          <div>
            <TrendingUp size={17} />
            <span>24h volume</span>
            <strong>{formatUsd(totalVolume || 312_000)}</strong>
          </div>
          <div>
            <Flame size={17} />
            <span>24h trades</span>
            <strong>{formatNumber(totalTrades || 1_780)}</strong>
          </div>
        </div>
        <SourceBadge source={data?.source} />
      </div>

      {isLoading ? <div className="empty-state">Loading launch board...</div> : null}

      <div className={advanced ? 'market-results advanced' : 'market-results'}>
        {advanced ? (
          <div className="market-table">
            {visibleTokens.map((token, index) => (
              <Link to={`/token/${token.address}`} className="market-row" key={token.address}>
                <span className="rank">{(page - 1) * pageSize + index + 1}</span>
                <img src={token.imageUrl} alt="" />
                <span className="market-row-name">
                  <strong>{token.name}</strong>
                  <small>${token.symbol} · {timeAgo(token.createdAt)}</small>
                </span>
                <span>{formatUsd(token.marketCapUsd)} MC</span>
                <span>{formatUsd(token.volume24hUsd)} vol</span>
                <span>{formatNumber(token.trades24h)} trades</span>
                <em>{token.bondingProgress}%</em>
              </Link>
            ))}
          </div>
        ) : (
          <div className="coin-list">
            {visibleTokens.map((token, index) => (
              <Link to={`/token/${token.address}`} className="coin-list-row" key={token.address}>
                <span className="rank">{(page - 1) * pageSize + index + 1}</span>
                <img src={token.imageUrl} alt="" />
                <span className="coin-list-name">
                  <strong>{token.name}</strong>
                  <small>${token.symbol} · {timeAgo(token.createdAt)}</small>
                </span>
                <span className="coin-list-stat">
                  <small>Market cap</small>
                  <strong>{formatUsd(token.marketCapUsd)}</strong>
                </span>
                <span className="coin-list-stat">
                  <small>24h volume</small>
                  <strong>{formatUsd(token.volume24hUsd)}</strong>
                </span>
                <span className="coin-list-stat">
                  <small>Bonding</small>
                  <strong>{token.bondingProgress}%</strong>
                </span>
                <span className={`coin-list-change ${(token.priceChange24h ?? 0) >= 0 ? 'up' : 'down'}`}>
                  {(token.priceChange24h ?? 0) > 0 ? '+' : ''}{(token.priceChange24h ?? 0).toFixed(1)}%
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {tokens.length > pageSize ? (
        <div className="pagination-row">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>Page {page} of {pageCount}</span>
          <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </button>
        </div>
      ) : null}

      {!isLoading && tokens.length === 0 ? <div className="empty-state">No launches match this view.</div> : null}
    </section>
  );
}
