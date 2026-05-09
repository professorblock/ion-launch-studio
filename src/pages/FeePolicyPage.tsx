import { feeConfig } from '../config/app';

export function FeePolicyPage() {
  return (
    <section className="page-section legal-page">
      <div className="page-heading">
        <span className="eyebrow">Fee policy</span>
        <h1>Simple fee collection first. Automation later.</h1>
        <p>
          The safest MVP fee model is a normal user-signed ION transfer to treasury, followed by public operational burn
          reporting.
        </p>
      </div>

      <div className="fee-policy-grid">
        <div className="legal-block">
          <h2>Current fee</h2>
          <p>{feeConfig.platformFeeIon} ION, only active after token and treasury addresses are verified in environment config.</p>
        </div>
        <div className="legal-block">
          <h2>Burn policy</h2>
          <p>Target split is 50% burn and 50% treasury. Burn handling starts manually to avoid custom contract risk.</p>
        </div>
        <div className="legal-block">
          <h2>Transaction type</h2>
          <p>The MVP uses ERC-20 `transfer` only. It does not request token approvals or unlimited allowances.</p>
        </div>
        <div className="legal-block">
          <h2>Future automation</h2>
          <p>Automation can be added only after the burn method, accounting process, and audit requirements are clear.</p>
        </div>
      </div>
    </section>
  );
}
