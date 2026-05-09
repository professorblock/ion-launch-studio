import { ShieldAlert } from 'lucide-react';

export function RiskNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'risk-notice compact' : 'risk-notice'}>
      <ShieldAlert size={20} />
      <div>
        <strong>Real-money token risk</strong>
        <p>
          Meme tokens can lose all value. ION Launch does not custody funds, guarantee launches, or verify every token
          creator. Check every transaction in your wallet before signing.
        </p>
      </div>
    </div>
  );
}
