import { Activity } from 'lucide-react';
import { formatUsd } from '../../lib/format';
import type { LaunchToken, RecentTrade } from '../../types/token';

interface ChartPoint {
  x: number;
  y: number;
  price: number;
  volume: number;
}

export function MarketChart({ token, trades }: { token: LaunchToken; trades: RecentTrade[] }) {
  const points = buildPoints(token, trades);
  const path = points.length > 1 ? points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') : '';
  const first = points[0]?.price ?? token.priceUsd ?? 0;
  const last = points[points.length - 1]?.price ?? token.priceUsd ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : token.priceChange24h ?? 0;
  const maxVolume = Math.max(...points.map((point) => point.volume), 1);

  return (
    <div className="market-chart-panel">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Market activity</span>
          <h2>{last ? formatUsd(last) : formatUsd(token.marketCapUsd)}</h2>
        </div>
        <span className={`change-badge ${change >= 0 ? 'positive' : 'negative'}`}>
          <Activity size={15} />
          {change > 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>

      <div className="market-chart">
        {points.length > 1 ? (
          <svg viewBox="0 0 640 260" role="img" aria-label={`${token.symbol} recent price chart`}>
            <defs>
              <linearGradient id={`line-${token.address}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(52, 211, 153, 0.42)" />
                <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
              </linearGradient>
            </defs>
            <path className="chart-fill" d={`${path} L 620 230 L 20 230 Z`} fill={`url(#line-${token.address})`} />
            <path className="chart-line" d={path} />
            {points.map((point, index) => (
              <rect
                key={`${point.x}-${index}`}
                className="chart-volume"
                x={point.x - 5}
                y={238 - (point.volume / maxVolume) * 42}
                width="8"
                height={(point.volume / maxVolume) * 42}
                rx="4"
              />
            ))}
          </svg>
        ) : (
          <div className="chart-empty">Waiting for more trades to draw a live chart.</div>
        )}
      </div>
    </div>
  );
}

function buildPoints(token: LaunchToken, trades: RecentTrade[]): ChartPoint[] {
  const ordered = [...trades]
    .filter((trade) => trade.priceUsd || (trade.amountToken > 0 && trade.amountUsd > 0))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-36);

  if (!ordered.length && token.priceUsd) {
    return [
      { x: 20, y: 132, price: token.priceUsd * 0.98, volume: token.volume24hUsd * 0.22 },
      { x: 320, y: 118, price: token.priceUsd, volume: token.volume24hUsd * 0.32 },
      { x: 620, y: 108, price: token.priceUsd * 1.01, volume: token.volume24hUsd * 0.28 },
    ];
  }

  const prices = ordered.map((trade) => trade.priceUsd || trade.amountUsd / Math.max(trade.amountToken, 1));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, max * 0.02, 0.00000001);

  return ordered.map((trade, index) => {
    const price = prices[index];
    return {
      x: ordered.length === 1 ? 320 : 20 + (index / (ordered.length - 1)) * 600,
      y: 28 + ((max - price) / range) * 172,
      price,
      volume: trade.amountUsd,
    };
  });
}
