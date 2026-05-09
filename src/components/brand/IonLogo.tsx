import ionLogo from '../../assets/ion-logo.png';

export function IonLogo({ subtitle = 'Launch Studio' }: { subtitle?: string }) {
  return (
    <div className="ion-logo-block">
      <span className="ion-logo-mark">
        <img src={ionLogo} alt="ION" />
      </span>
      <span className="ion-wordmark">
        <span>
          <strong>ION</strong>
          <em>Hub</em>
        </span>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}
