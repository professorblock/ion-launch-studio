export function TermsPage() {
  return (
    <section className="page-section legal-page">
      <div className="page-heading">
        <span className="eyebrow">Terms</span>
        <h1>Platform terms for ION Launch.</h1>
        <p>
          These starter terms describe how the app should be used. They are not a substitute for formal legal review
          before public launch.
        </p>
      </div>

      <div className="legal-block">
        <h2>Use of the platform</h2>
        <p>
          ION Launch provides token discovery, launch preparation, analytics, fee handling, and wallet interaction tools.
          Users are responsible for reviewing every wallet prompt and transaction before signing.
        </p>
      </div>
      <div className="legal-block">
        <h2>No custody or guarantees</h2>
        <p>
          The platform does not custody funds, hold private keys, guarantee launch success, guarantee liquidity, or
          guarantee market performance.
        </p>
      </div>
      <div className="legal-block">
        <h2>User responsibility</h2>
        <p>
          Token creators are responsible for the accuracy of token information, links, images, community claims, and any
          legal or regulatory obligations connected to their launch.
        </p>
      </div>
      <div className="legal-block">
        <h2>External systems</h2>
        <p>
          BNB Chain, wallets, explorers, data providers, storage providers, and launch infrastructure are independent
          systems. Their behavior, fees, availability, and terms may change.
        </p>
      </div>
    </section>
  );
}
