import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { ProgressBar } from '../components/ui/ProgressBar';
import { TradeTable } from '../components/token/TradeTable';
import { externalLinks } from '../config/app';
import { compactAddress, formatNumber, formatUsd, timeAgo } from '../lib/format';
import { fetchToken } from '../lib/launchData';
import { isWatched, toggleWatchlist } from '../lib/watchlist';
import { TradePanel } from '../components/token/TradePanel';
import { AnalyticsPanel } from '../components/token/AnalyticsPanel';
import { TokenIntelPanel } from '../components/token/TokenIntelPanel';
import { SourceBadge } from '../components/ui/SourceBadge';

export function TokenPage() {
  const { address = '' } = useParams();
  const { data } = useQuery({ queryKey: ['token', address], queryFn: () => fetchToken(address) });
  const token = data?.token;
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    if (token) setWatched(isWatched(token.address));
  }, [token]);

  if (!token) return <section className="page-section"><div className="empty-state">Loading token...</div></section>;

  return (
    <section className="page-section">
      <div className="token-detail-hero">
        <img src={token.imageUrl} alt="" />
        <div>
          <span className="status-pill">{token.status}</span>
          <h1>{token.name}</h1>
          <p>${token.symbol}</p>
          <p>{token.description}</p>
          <SourceBadge source={data?.source} />
          <div className="hero-actions">
            <a className="button button-primary" href="#trade">Trade in app</a>
            <a className="button button-muted" href={externalLinks.bscScanAddress(token.address)} target="_blank" rel="noreferrer">
              BNBScan
            </a>
            <button className="button button-muted" type="button" onClick={() => setWatched(toggleWatchlist(token.address))}>
              <Star size={17} />
              {watched ? 'Watching' : 'Watch'}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <AnalyticsPanel token={token} />
          <TokenIntelPanel token={token} />
          <div className="chart-placeholder">
            <span>Market activity</span>
            <strong>{formatUsd(token.marketCapUsd)}</strong>
            <div className="chart-bars" aria-hidden="true">
              {[42, 58, 35, 76, 62, 84, 69, 91, 73, 88, 96, 82].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">Recent trades</span>
                <h2>Live flow preview</h2>
              </div>
            </div>
            <TradeTable trades={data?.trades ?? []} />
          </div>
        </div>

        <aside className="detail-side">
          <div id="trade">
            <TradePanel token={token} />
          </div>
          <div className="side-card">
            <strong>Bonding progress</strong>
            <ProgressBar value={token.bondingProgress} />
            <div className="stat-list">
              <span>Progress <strong>{token.bondingProgress}%</strong></span>
              <span>24h volume <strong>{formatUsd(token.volume24hUsd)}</strong></span>
              <span>24h trades <strong>{formatNumber(token.trades24h)}</strong></span>
              <span>Created <strong>{timeAgo(token.createdAt)}</strong></span>
              <span>Creator <strong>{compactAddress(token.creator)}</strong></span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
