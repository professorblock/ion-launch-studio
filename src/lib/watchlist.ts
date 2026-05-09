const watchlistStorageKey = 'ion-launch:watchlist';

export function getWatchlist() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(watchlistStorageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isAddress) : [];
  } catch {
    window.localStorage.removeItem(watchlistStorageKey);
    return [];
  }
}

export function isWatched(address: string) {
  const normalized = normalizeAddress(address);
  return normalized ? getWatchlist().includes(normalized) : false;
}

export function toggleWatchlist(address: string) {
  if (typeof window === 'undefined') return false;
  const normalized = normalizeAddress(address);
  if (!normalized) return false;
  const current = getWatchlist();
  const next = current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [normalized, ...current].slice(0, 100);
  window.localStorage.setItem(watchlistStorageKey, JSON.stringify(next));
  return next.includes(normalized);
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-f0-9]{40}$/.test(value);
}

function normalizeAddress(value: string) {
  const normalized = value.toLowerCase();
  return isAddress(normalized) ? normalized : undefined;
}
