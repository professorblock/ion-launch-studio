import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle, Users } from 'lucide-react';
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
        <div className="token-card-meta">
          <strong>{formatUsd(token.marketCapUsd)} MC</strong>
          <span>{token.priceChange24h && token.priceChange24h > 0 ? `+${token.priceChange24h.toFixed(1)}%` : `${token.priceChange24h?.toFixed(1) ?? '0.0'}%`}</span>
        </div>
        <ProgressBar value={token.bondingProgress} />
        <div className="token-card-stats">
          <span>Vol {formatUsd(token.volume24hUsd)}</span>
          <span><MessageCircle size={13} /> {formatNumber(token.trades24h)}</span>
          <span><Users size={13} /> {formatNumber(token.holders ?? 0)}</span>
          <span>{timeAgo(token.createdAt)}</span>
        </div>
        <small className="token-creator">by {compactAddress(token.creator)}</small>
      </div>
    </Link>
  );
}
