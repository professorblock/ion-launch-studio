import { Link } from 'react-router-dom';
import { Database, Flame, ShieldCheck, WalletCards } from 'lucide-react';

export function InfoPage() {
  return (
    <section className="page-section">
      <div className="page-heading">
        <span className="eyebrow">How it works</span>
        <h1>ION-native launch workspace for community markets.</h1>
        <p>
          Launch setup, discovery, trading views, and analytics are designed as one simple workspace for the ION
          community.
        </p>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <Database />
          <strong>Live market data</strong>
          <p>Launches, trades, curve progress, and graduation signals are brought into one ION-branded interface.</p>
        </div>
        <div className="info-card">
          <WalletCards />
          <strong>Wallet control</strong>
          <p>Users review and confirm on-chain actions from their own wallet. The platform does not custody funds.</p>
        </div>
        <div className="info-card">
          <Flame />
          <strong>ION fee model</strong>
          <p>Platform fees use ION on BNB Chain, with treasury and burn reporting kept transparent.</p>
        </div>
        <div className="info-card">
          <ShieldCheck />
          <strong>Simple rails</strong>
          <p>The product prioritizes established network infrastructure, clear wallet prompts, and a small review surface.</p>
        </div>
      </div>

      <div className="legal-block">
        <h2>Infrastructure disclosure</h2>
        <p>
          ION Launch uses established BNB Chain launch and liquidity infrastructure. Specific venue and data-provider
          details are documented here for transparency without interrupting the primary launch experience.
        </p>
      </div>

      <div className="cta-band">
        <h2>Explore live markets, then create your own ION community token.</h2>
        <Link className="button button-primary" to="/discover">Explore launches</Link>
      </div>
    </section>
  );
}
