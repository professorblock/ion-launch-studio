import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LineChart, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchBurnDashboard } from '../lib/burnData';
import { fetchLaunchData } from '../lib/launchData';
import { formatNumber, formatUsd } from '../lib/format';
import { TokenCard } from '../components/token/TokenCard';
import { SourceBadge } from '../components/ui/SourceBadge';

export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data } = useQuery({ queryKey: ['launch-dashboard'], queryFn: fetchLaunchData });
  const { data: burnData } = useQuery({ queryKey: ['burn-dashboard-home'], queryFn: fetchBurnDashboard });
  const tokens = data?.tokens ?? [];
  const totalVolume = tokens.reduce((sum, token) => sum + token.volume24hUsd, 0);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/discover?q=${encodeURIComponent(query)}` : '/discover');
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-pill">
            <span className="status-dot" />
            <span>Live market studio</span>
          </div>
          <SourceBadge source={data?.source} />
          <h1>
            Launch Tokens
            <br />
            on <span>ION.</span>
          </h1>
          <div className="hero-tagline">For Community Markets.</div>
          <p>
            A premium launch and market workspace for the Ice Open Network community. Create token profiles, track live
            momentum, and manage wallet-confirmed launch flows from one native interface.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/launch">
              Start Building
              <ArrowRight size={18} />
            </Link>
            <Link className="button button-muted" to="/discover">
              Explore Markets
            </Link>
          </div>
          <div className="hero-desk">
            <div className="desk-toolbar">
              <Link className="button button-primary" to="/launch">
                Create Token
                <ArrowRight size={17} />
              </Link>
              <form className="desk-search" onSubmit={submitSearch}>
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token, ticker, or creator" />
              </form>
              <div className="desk-stat">
                <span>24h volume</span>
                <strong>{formatUsd(totalVolume || 312_000)}</strong>
              </div>
              <div className="desk-stat">
                <span>ION burned</span>
                <strong>{formatNumber(burnData?.summary.totalBurnedIon ?? 0)}</strong>
              </div>
            </div>

            <div className="desk-market-grid">
              {tokens.slice(0, 4).map((token, index) => (
                <Link className="desk-token" to={`/token/${token.address}`} key={token.address}>
                  <img src={token.imageUrl} alt="" />
                  <div>
                    <span>{index === 0 ? 'Now bonding' : token.status}</span>
                    <strong>{token.name}</strong>
                    <small>
                      ${token.symbol} · {formatUsd(token.volume24hUsd)} vol
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Market pulse</span>
            <h2>Live market board</h2>
          </div>
          <Link to="/discover">View all</Link>
        </div>
        <div className="token-grid">
          {tokens.slice(0, 3).map((token) => (
            <TokenCard key={token.address} token={token} />
          ))}
        </div>
      </section>

      <section className="feature-strip">
        <div>
          <ShieldCheck />
          <strong>Wallet-confirmed flow</strong>
          <p>Every transaction is prepared transparently and confirmed by the user from their own wallet.</p>
        </div>
        <div>
          <LineChart />
          <strong>Native analytics</strong>
          <p>Charts, curve progress, trade flow, and token intelligence live directly inside the platform.</p>
        </div>
        <div>
          <Sparkles />
          <strong>Creator-first workspace</strong>
          <p>Launch setup, market discovery, analytics, and trading tools are designed to live inside the same product.</p>
        </div>
      </section>
    </>
  );
}
