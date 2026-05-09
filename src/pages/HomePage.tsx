import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Flame, Search, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBurnDashboard } from '../lib/burnData';
import { fetchLaunchData } from '../lib/launchData';
import { formatNumber, formatUsd, timeAgo } from '../lib/format';
import { TokenCard } from '../components/token/TokenCard';
import { SourceBadge } from '../components/ui/SourceBadge';

export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data } = useQuery({ queryKey: ['launch-dashboard'], queryFn: fetchLaunchData });
  const { data: burnData } = useQuery({ queryKey: ['burn-dashboard-home'], queryFn: fetchBurnDashboard });
  const tokens = useMemo(() => data?.tokens ?? [], [data?.tokens]);

  const heroTokens = tokens.slice(0, 6);
  const trendingTokens = useMemo(
    () => [...tokens].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, 4),
    [tokens],
  );
  const newestTokens = useMemo(
    () => [...tokens].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [tokens],
  );
  const totalVolume = tokens.reduce((sum, token) => sum + token.volume24hUsd, 0);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/discover?q=${encodeURIComponent(query)}` : '/discover');
  }

  return (
    <>
      <section className="launch-floor">
        <div className="launch-floor-copy">
          <div className="hero-pill">
            <span className="status-dot" />
            <span>ION launch floor</span>
          </div>
          <h1>
            Create and trade community tokens in minutes.
          </h1>
          <p>
            A simple ION-native launch experience for discovering new markets, starting a token, and tracking momentum
            without touching contract code.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/launch">
              Launch token
              <ArrowRight size={18} />
            </Link>
            <Link className="button button-muted" to="/discover">
              Explore coins
            </Link>
          </div>
          <form className="hero-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coin, ticker, or creator" />
            <button type="submit">Search</button>
          </form>
        </div>

        <div className="launch-floor-panel">
          <div className="floor-panel-top">
            <div>
              <span>Live board</span>
              <strong>{formatNumber(tokens.length)} launches tracked</strong>
            </div>
            <SourceBadge source={data?.source} />
          </div>
          <div className="coin-tape">
            {heroTokens.map((token) => (
              <Link to={`/token/${token.address}`} className="coin-tape-item" key={token.address}>
                <img src={token.imageUrl} alt="" />
                <span>
                  <strong>{token.symbol}</strong>
                  <small>{formatUsd(token.marketCapUsd)} MC</small>
                </span>
              </Link>
            ))}
          </div>
          <div className="floor-stats">
            <div>
              <TrendingUp size={18} />
              <span>24h volume</span>
              <strong>{formatUsd(totalVolume || 312_000)}</strong>
            </div>
            <div>
              <Flame size={18} />
              <span>ION burned</span>
              <strong>{formatNumber(burnData?.summary.totalBurnedIon ?? 0)}</strong>
            </div>
            <div>
              <Zap size={18} />
              <span>Fast start</span>
              <strong>Profile first</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="market-strip">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Trending now</span>
            <h2>Coins moving on the launch floor</h2>
          </div>
          <Link to="/discover">Open board</Link>
        </div>
        <div className="token-grid compact">
          {trendingTokens.map((token) => (
            <TokenCard key={token.address} token={token} />
          ))}
        </div>
      </section>

      <section className="split-market">
        <div className="quick-launch-card">
          <Sparkles size={22} />
          <span>Creator shortcut</span>
          <h2>Start with a name, ticker, image, and story.</h2>
          <p>
            Advanced routing, fee status, metadata, and execution readiness stay available after the basic profile is
            ready.
          </p>
          <Link className="button button-primary" to="/launch">
            Create token
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="new-list">
          <div className="section-heading flush">
            <div>
              <span className="eyebrow">Fresh launches</span>
              <h2>Just landed</h2>
            </div>
          </div>
          {newestTokens.map((token) => (
            <Link to={`/token/${token.address}`} className="launch-row" key={token.address}>
              <img src={token.imageUrl} alt="" />
              <span>
                <strong>{token.name}</strong>
                <small>${token.symbol} · {timeAgo(token.createdAt)}</small>
              </span>
              <em>{formatUsd(token.marketCapUsd)}</em>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
