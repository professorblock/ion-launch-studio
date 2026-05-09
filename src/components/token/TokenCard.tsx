import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { compactAddress, formatNumber, formatUsd, timeAgo } from '../../lib/format';
import type { LaunchToken } from '../../types/token';
import { ProgressBar } from '../ui/ProgressBar';

export function TokenCard({ token }: { token: LaunchToken }) {
  return (
    <Link to={`/token/${token.address}`} className="token-card">
      <div className="token-card-media">
        <img src={token.imageUrl} alt="" className="token-card-image" />
        <span className="token-status-badge">{token.status}</span>
      </div>
      <div className="token-card-body">
        <div className="token-card-title">
          <div>
            <strong>{token.name}</strong>
            <span>${token.symbol}</span>
          </div>
          <ArrowUpRight size={18} />
        </div>
        <p>{token.description}</p>
        <div className="token-card-meta">
          <span>Creator {compactAddress(token.creator)}</span>
          <strong>{formatUsd(token.marketCapUsd)} MC</strong>
        </div>
        <ProgressBar value={token.bondingProgress} />
        <div className="token-card-stats">
          <span>Vol {formatUsd(token.volume24hUsd)}</span>
          <span>{formatNumber(token.trades24h)} trades</span>
          <span>{timeAgo(token.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
