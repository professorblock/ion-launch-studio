import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from 'lucide-react';
import { chainConfig, feeConfig, featureFlags, externalLinks } from '../config/app';
import { fetchPlatformStatus } from '../lib/platformStatus';

const productChecks = [
  { label: 'No custom launch contracts in app scope', ready: true },
  { label: 'No server-side transaction signing', ready: true },
  { label: 'ION fee uses wallet-confirmed ERC-20 transfer', ready: Boolean(feeConfig.ionTokenAddress && feeConfig.treasuryAddress) },
  { label: 'Launch execution route gated or verified', ready: !featureFlags.launchExecution || featureFlags.executionVerified },
  { label: 'Trade execution route gated or verified', ready: !featureFlags.tradeExecution || featureFlags.executionVerified },
];

export function ReadinessPage() {
  const { data } = useQuery({ queryKey: ['readiness-status'], queryFn: fetchPlatformStatus });
  const deployment = data?.deployment;
  const serviceChecks = data
    ? Object.entries(data.services).map(([key, ready]) => ({ label: key.replace(/([A-Z])/g, ' $1'), ready }))
    : [];

  return (
    <section className="page-section readiness-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Readiness</span>
          <h1>Production gate checklist.</h1>
          <p>
            A public-safe view of the configuration and safety gates that must be satisfied before staging and go-live.
          </p>
        </div>
        <div className="side-card">
          <div className="side-card-title">
            <ShieldCheck size={20} />
            <strong>Current network</strong>
          </div>
          <div className="stat-list">
            <span>Environment <strong>{deployment?.environment ?? 'local'}</strong></span>
            <span>Branch <strong>{deployment?.gitBranch ?? 'local'}</strong></span>
            <span>BNB Chain <strong>{chainConfig.bnbChainId}</strong></span>
            <span>Proxy <strong>{chainConfig.fourMemeProxy.slice(0, 10)}...</strong></span>
            <span>ION token <strong>{feeConfig.ionTokenAddress ? 'Configured' : 'Pending'}</strong></span>
            <span>Treasury <strong>{feeConfig.treasuryAddress ? 'Configured' : 'Pending'}</strong></span>
          </div>
        </div>
      </div>

      <div className="readiness-grid">
        <ReadinessPanel title="Product safety" checks={productChecks} />
        <ReadinessPanel title="Service config" checks={serviceChecks} />
      </div>

      <div className="panel readiness-links">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">Verification</span>
            <h2>External references</h2>
          </div>
        </div>
        <div className="external-link-grid">
          <a href={externalLinks.bscScanAddress(chainConfig.fourMemeProxy)} target="_blank" rel="noreferrer">
            Launch proxy on BNBScan
            <ExternalLink size={16} />
          </a>
          {feeConfig.ionTokenAddress ? (
            <a href={externalLinks.bscScanAddress(feeConfig.ionTokenAddress)} target="_blank" rel="noreferrer">
              ION token on BNBScan
              <ExternalLink size={16} />
            </a>
          ) : null}
          <Link to="/status">Platform status</Link>
          <Link to="/docs">Operating docs</Link>
        </div>
      </div>
    </section>
  );
}

function ReadinessPanel({ title, checks }: { title: string; checks: Array<{ label: string; ready: boolean }> }) {
  return (
    <div className="panel readiness-panel">
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow">Gate</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="readiness-list">
        {checks.map((check) => (
          <div key={check.label}>
            {check.ready ? <CheckCircle2 size={18} /> : <CircleDashed size={18} />}
            <span>{check.label}</span>
            <strong>{check.ready ? 'Ready' : 'Pending'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
