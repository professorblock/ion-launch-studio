export function Metric({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'green' | 'amber' }) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
