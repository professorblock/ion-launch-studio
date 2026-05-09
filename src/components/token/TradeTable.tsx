import { compactAddress, formatNumber, formatUsd, timeAgo } from '../../lib/format';
import type { RecentTrade } from '../../types/token';

export function TradeTable({ trades }: { trades: RecentTrade[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Side</th>
            <th>Trader</th>
            <th>Token Amount</th>
            <th>Value</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>
                <span className={`trade-side ${trade.side}`}>{trade.side}</span>
              </td>
              <td>{compactAddress(trade.trader)}</td>
              <td>{formatNumber(trade.amountToken)}</td>
              <td>{formatUsd(trade.amountUsd)}</td>
              <td>{timeAgo(trade.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
