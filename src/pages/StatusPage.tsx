import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, LockKeyhole, ServerCog } from 'lucide-react';
import { fetchPlatformStatus } from '../lib/platformStatus';

const labels = {
  bitquery: 'Live market data',
  metadata: 'Metadata pinning',
  ionFee: 'ION fee collection',
  feeVerifier: 'Fee verification',
  burnBoard: 'Burn board data',
  launchExecution: 'Launch execution',
  tradeExecution: 'Trade execution',
} as const;

export function StatusPage() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-status'], queryFn: fetchPlatformStatus });
  const statusLabel = isLoading
    ? 'Checking services'
    : data?.publicLaunchReady
      ? 'Public launch ready'
      : data?.status === 'ok'
        ? 'Launch gated'
        : data?.status === 'local'
          ? 'Local preview mode'
          : 'Status unavailable';
  const deployment = data?.deployment;

  return (
    <section className="page-section status-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Platform status</span>
          <h1>Staging readiness and service checks.</h1>
          <p>
            Safe configuration visibility for the launch platform. This page exposes only booleans and public network
            status, never secrets.
          </p>
        </div>
        <div className="side-card">
          <div className="side-card-title">
            {data?.publicLaunchReady ? <ServerCog size={20} /> : <LockKeyhole size={20} />}
            <strong>{statusLabel}</strong>
          </div>
          <p>Use this before staging and production deploys to confirm the expected serverless services are configured.</p>
          {data?.missing.length ? (
            <div className="status-missing">
              <span>Pending</span>
              <strong>{data.missing.join(', ')}</strong>
            </div>
          ) : null}
          {data?.launchBlockers.length ? (
            <div className="status-missing">
              <span>Go-live blockers</span>
              <strong>{data.launchBlockers.join(', ')}</strong>
            </div>
          ) : null}
          {deployment ? (
            <div className="deployment-summary">
              <span>Environment <strong>{deployment.environment}</strong></span>
              <span>Branch <strong>{deployment.gitBranch ?? 'local'}</strong></span>
              <span>Commit <strong>{deployment.gitCommit ? deployment.gitCommit.slice(0, 7) : 'local'}</strong></span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="status-grid">
        {Object.entries(labels).map(([key, label]) => {
          const ready = data?.services[key as keyof typeof labels] ?? false;
          return (
            <div className="status-card" key={key}>
              {ready ? <CheckCircle2 /> : <CircleDashed />}
              <span>{label}</span>
              <strong>{ready ? 'Configured' : 'Pending'}</strong>
            </div>
          );
        })}
        <div className="status-card">
          {data?.network.proxyConfigured ? <CheckCircle2 /> : <CircleDashed />}
          <span>Launch proxy</span>
          <strong>{data?.network.proxyConfigured ? 'Configured' : 'Pending'}</strong>
        </div>
        <div className="status-card">
          <CheckCircle2 />
          <span>BNB Chain ID</span>
          <strong>{data?.network.bnbChainId ?? 56}</strong>
        </div>
      </div>
    </section>
  );
}
