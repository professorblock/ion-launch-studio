import { Activity, Flame, Gauge, Users } from 'lucide-react';
import type { LaunchToken } from '../../types/token';
import { formatNumber, formatUsd } from '../../lib/format';

export function AnalyticsPanel({ token }: { token: LaunchToken }) {
  const stats = [
    { label: '24h volume', value: formatUsd(token.volume24hUsd), icon: Activity },
    { label: '24h trades', value: formatNumber(token.trades24h), icon: Flame },
    { label: 'Curve progress', value: `${token.bondingProgress}%`, icon: Gauge },
    { label: 'Holders', value: token.holders ? formatNumber(token.holders) : token.status === 'graduated' ? '8.1K' : 'Tracking', icon: Users },
  ];

  return (
    <div className="analytics-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div className="analytics-tile" key={stat.label}>
            <Icon size={18} />
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        );
      })}
    </div>
  );
}
