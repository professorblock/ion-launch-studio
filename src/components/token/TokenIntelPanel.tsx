import { AlertTriangle, CheckCircle2, Clock3, Droplets, ShieldCheck, TrendingUp } from 'lucide-react';
import { externalLinks } from '../../config/app';
import { formatNumber, formatUsd, timeAgo } from '../../lib/format';
import type { LaunchToken } from '../../types/token';

export function TokenIntelPanel({ token }: { token: LaunchToken }) {
  const checks = [
    { label: 'BNB Chain token page', value: 'Available', icon: CheckCircle2, href: externalLinks.bscScanAddress(token.address) },
    { label: 'Market source', value: 'Launch data feed', icon: ShieldCheck },
    { label: 'Created', value: timeAgo(token.createdAt), icon: Clock3 },
    { label: 'Liquidity signal', value: token.liquidityUsd ? formatUsd(token.liquidityUsd) : 'Estimating', icon: Droplets },
  ];

  return (
    <div className="panel token-intel-panel">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Token intelligence</span>
          <h2>Market and safety snapshot</h2>
        </div>
        <span className={`change-badge ${(token.priceChange24h ?? 0) >= 0 ? 'positive' : 'negative'}`}>
          <TrendingUp size={15} />
          {token.priceChange24h === undefined ? 'Live' : `${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%`}
        </span>
      </div>

      <div className="intel-grid">
        <div>
          <span>Price</span>
          <strong>{token.priceUsd ? `$${token.priceUsd.toPrecision(4)}` : 'Tracking'}</strong>
        </div>
        <div>
          <span>Liquidity</span>
          <strong>{formatUsd(token.liquidityUsd ?? 0)}</strong>
        </div>
        <div>
          <span>Holders</span>
          <strong>{token.holders ? formatNumber(token.holders) : 'Pending'}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{token.status}</strong>
        </div>
      </div>

      <div className="intel-checks">
        {checks.map((check) => {
          const Icon = check.icon;
          const content = (
            <>
              <Icon size={17} />
              <span>{check.label}</span>
              <strong>{check.value}</strong>
            </>
          );
          return check.href ? (
            <a href={check.href} target="_blank" rel="noreferrer" key={check.label}>
              {content}
            </a>
          ) : (
            <div key={check.label}>{content}</div>
          );
        })}
      </div>

      <div className="execution-note subdued">
        <AlertTriangle size={18} />
        Token markets can be volatile. ION Launch displays market data and route readiness; it does not certify token
        quality.
      </div>
    </div>
  );
}
