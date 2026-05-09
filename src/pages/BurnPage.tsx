import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Flame, Landmark, ReceiptText, Users } from 'lucide-react';
import { externalLinks } from '../config/app';
import { fetchBurnDashboard } from '../lib/burnData';
import { compactAddress, formatNumber, formatUsd, timeAgo } from '../lib/format';
import { SourceBadge } from '../components/ui/SourceBadge';

export function BurnPage() {
  const { data } = useQuery({ queryKey: ['burn-dashboard'], queryFn: fetchBurnDashboard });
  const dashboard = data;
  const summary = dashboard?.summary;
  const maxBucket = Math.max(...(dashboard?.buckets.map((bucket) => bucket.amountIon) ?? [1]), 1);

  return (
    <section className="page-section burn-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">ION burn board</span>
          <h1>Transparent fee and burn tracking.</h1>
          <p>
            Track ION fee receipts, burn transactions, treasury flow, and public operating metrics from one dashboard.
          </p>
          <SourceBadge source={dashboard?.source} />
        </div>
        <div className="market-stats">
          <div>
            <span>Total burned</span>
            <strong>{formatNumber(summary?.totalBurnedIon ?? 0)} ION</strong>
          </div>
          <div>
            <span>7d burned</span>
            <strong>{formatNumber(summary?.burned7dIon ?? 0)} ION</strong>
          </div>
          <div>
            <span>Treasury</span>
            <strong>{formatNumber(summary?.treasuryIon ?? 0)} ION</strong>
          </div>
        </div>
      </div>

      <div className="analytics-grid burn-summary-grid">
        <div className="analytics-tile">
          <Flame />
          <span>Burned value</span>
          <strong>{formatUsd(summary?.totalBurnedUsd ?? 0)}</strong>
        </div>
        <div className="analytics-tile">
          <ReceiptText />
          <span>Burn txs</span>
          <strong>{formatNumber(summary?.burnTxCount ?? 0)}</strong>
        </div>
        <div className="analytics-tile">
          <Users />
          <span>Unique senders</span>
          <strong>{formatNumber(summary?.uniqueBurners ?? 0)}</strong>
        </div>
        <div className="analytics-tile">
          <Landmark />
          <span>Largest burn</span>
          <strong>{formatNumber(summary?.largestBurnIon ?? 0)} ION</strong>
        </div>
      </div>

      <div className="burn-layout">
        <div className="panel burn-chart-panel">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Burn cadence</span>
              <h2>Daily ION burns</h2>
            </div>
          </div>
          <div className="burn-bars" aria-label="Daily burn chart">
            {dashboard?.buckets.map((bucket) => (
              <div className="burn-bar" key={bucket.day}>
                <span style={{ height: `${Math.max(8, (bucket.amountIon / maxBucket) * 100)}%` }} />
                <small>{new Date(bucket.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
              </div>
            ))}
          </div>
        </div>

        <aside className="side-card">
          <strong>Operating model</strong>
          <p>
            The first release uses a wallet-confirmed ION fee transfer. Burn execution is tracked publicly after treasury
            operations, keeping the MVP simple and reviewable.
          </p>
          <div className="stat-list">
            <span>Source <strong>{dashboard?.source ?? 'mock'}</strong></span>
            <span>Burn wallets <strong>{dashboard?.burnAddresses.length ?? 0}</strong></span>
            <span>Treasury <strong>{dashboard?.treasuryAddress ? compactAddress(dashboard.treasuryAddress) : 'Pending'}</strong></span>
          </div>
        </aside>
      </div>

      <div className="panel">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Ledger</span>
            <h2>Recent fee and burn flow</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Time</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.events.slice(0, 12).map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className={`trade-side ${event.type === 'burn' ? 'sell' : 'buy'}`}>{event.type}</span>
                  </td>
                  <td>{formatNumber(event.amountIon)} {event.tokenSymbol}</td>
                  <td>{compactAddress(event.sender)}</td>
                  <td>{compactAddress(event.receiver)}</td>
                  <td>{timeAgo(event.timestamp)}</td>
                  <td>
                    <a href={externalLinks.bscScanTx(event.txHash)} target="_blank" rel="noreferrer" aria-label="Open transaction">
                      <ExternalLink size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
