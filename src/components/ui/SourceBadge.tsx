import { DatabaseZap } from 'lucide-react';
import type { LaunchDataSource } from '../../types/token';

export function SourceBadge({ source, updatedAt = new Date().toISOString() }: { source?: LaunchDataSource | string; updatedAt?: string }) {
  const label = source === 'bitquery' ? 'Live data' : source === 'mock' || source === 'fallback' ? 'Preview data' : 'Local data';

  return (
    <div className={`source-badge ${source === 'bitquery' ? 'live' : ''}`}>
      <DatabaseZap size={15} />
      <span>{label}</span>
      <small>{new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
    </div>
  );
}
