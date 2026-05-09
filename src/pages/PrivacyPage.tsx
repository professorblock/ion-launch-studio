export function PrivacyPage() {
  return (
    <section className="page-section legal-page">
      <div className="page-heading">
        <span className="eyebrow">Privacy</span>
        <h1>Privacy and local data handling.</h1>
        <p>
          ION Launch is designed to minimize account systems and custodial data. Formal privacy review should happen
          before public launch.
        </p>
      </div>

      <div className="legal-block">
        <h2>Wallet data</h2>
        <p>
          Wallet addresses are public blockchain identifiers. When users connect a wallet, the app uses the address to
          prepare wallet actions, show network status, and read balances where required.
        </p>
      </div>
      <div className="legal-block">
        <h2>Local storage</h2>
        <p>
          Creator studio packets and watchlists are stored in the user&apos;s browser local storage. They are not an
          account system and can be cleared from the browser or the Studio page.
        </p>
      </div>
      <div className="legal-block">
        <h2>Serverless APIs</h2>
        <p>
          Serverless endpoints proxy market data, optional metadata pinning, and platform status. Secrets stay
          server-side and are not intentionally exposed to the browser bundle.
        </p>
      </div>
      <div className="legal-block">
        <h2>External services</h2>
        <p>
          Wallets, blockchain RPC providers, data providers, storage providers, and explorers may process requests under
          their own policies.
        </p>
      </div>
    </section>
  );
}
