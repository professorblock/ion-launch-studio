import { Link } from 'react-router-dom';
import { BookOpen, Database, Flame, LockKeyhole, Rocket, WalletCards } from 'lucide-react';

export function DocsPage() {
  return (
    <section className="page-section legal-page docs-page">
      <span className="eyebrow">Platform docs</span>
      <h1>ION Launch operating guide.</h1>
      <p className="page-lede">
        A practical reference for how the platform works, what stays local, which actions require wallet signatures,
        and which launch features remain gated until final route verification is complete.
      </p>

      <div className="info-grid docs-grid">
        <article className="info-card">
          <Rocket size={22} />
          <strong>Product scope</strong>
          <p>
            ION Launch is an ION-branded launch, discovery, and creator workspace for community tokens on BNB Chain.
            The MVP focuses on public market pages, creator packets, fee readiness, burns, and token detail views.
          </p>
        </article>
        <article className="info-card">
          <LockKeyhole size={22} />
          <strong>No custom contracts</strong>
          <p>
            The platform does not deploy escrow, fee, router, or token-launch smart contracts. User wallets sign their
            own transactions, and server-side signing is not part of the architecture.
          </p>
        </article>
        <article className="info-card">
          <WalletCards size={22} />
          <strong>ION fee flow</strong>
          <p>
            The MVP fee model uses a plain ION token transfer to a configured treasury wallet. Burn allocation is
            tracked operationally first, which keeps the flow simple, auditable, and low-risk.
          </p>
        </article>
        <article className="info-card">
          <Database size={22} />
          <strong>Market data</strong>
          <p>
            Discovery, trades, graduated markets, and token details can be powered by the Bitquery Four Meme data
            surface through a serverless proxy so API tokens stay off the client.
          </p>
        </article>
        <article className="info-card">
          <BookOpen size={22} />
          <strong>Creator studio</strong>
          <p>
            Launch packets are saved in the creator's browser. They can be reviewed, resumed, exported, imported, and
            deleted without an account or custodial backend.
          </p>
        </article>
        <article className="info-card">
          <Flame size={22} />
          <strong>Burn dashboard</strong>
          <p>
            The burn board reads treasury, burn-address, and allocation data when configured. It can launch with public
            placeholders and become live once token and treasury addresses are finalized.
          </p>
        </article>
      </div>

      <div className="legal-block">
        <h2>Launch execution status</h2>
        <p>
          The app intentionally keeps final launch and trade execution disabled until the exact verified transaction
          route, calldata behavior, fee assumptions, and slippage handling are documented and tested. This is the right
          tradeoff for a real-money product: the public app can ship with discovery, packets, fee collection, and
          analytics while transactional launch execution remains gated.
        </p>
      </div>

      <div className="legal-block">
        <h2>Public disclosure posture</h2>
        <p>
          The public experience is ION-native. Infrastructure references are kept to docs, FAQs, and policy pages where
          they help users understand execution risk, data provenance, and chain dependencies.
        </p>
      </div>

      <div className="cta-band">
        <div>
          <strong>Ready to prepare a launch?</strong>
          <span>Build a local packet, confirm fee readiness, then review it in Studio.</span>
        </div>
        <Link className="button button-primary" to="/launch">
          Start Launch
        </Link>
      </div>
    </section>
  );
}
