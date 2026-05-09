export function RiskPage() {
  return (
    <section className="page-section legal-page">
      <div className="page-heading">
        <span className="eyebrow">Risk disclosure</span>
        <h1>Crypto launch activity is high risk.</h1>
        <p>This page is intentionally plain. Users should understand the risk before connecting a wallet or signing anything.</p>
      </div>

      <div className="legal-block">
        <h2>No investment advice</h2>
        <p>ION Launch does not provide investment, legal, tax, or financial advice. Token pages are informational only.</p>
      </div>
      <div className="legal-block">
        <h2>No custody</h2>
        <p>The app does not hold user funds or private keys. All on-chain actions must be reviewed and signed by the user.</p>
      </div>
      <div className="legal-block">
        <h2>No guarantees</h2>
        <p>Listing, launch assistance, fee payment, or discovery visibility does not guarantee liquidity, price performance, moderation, or graduation.</p>
      </div>
      <div className="legal-block">
        <h2>External infrastructure</h2>
        <p>Four Meme, BNB Chain, wallets, explorers, and data providers are external systems. Their availability and behavior can change.</p>
      </div>
    </section>
  );
}
