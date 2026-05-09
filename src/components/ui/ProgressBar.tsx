export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className="progress" aria-label={`Bonding progress ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}
