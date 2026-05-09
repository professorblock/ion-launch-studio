import type { TradeDraft } from '../types/order';

const tradeDraftsStorageKey = 'ion-launch:trade-drafts';

export function getTradeDrafts(): TradeDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(tradeDraftsStorageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isTradeDraft) : [];
  } catch {
    window.localStorage.removeItem(tradeDraftsStorageKey);
    return [];
  }
}

export function saveTradeDraft(draft: TradeDraft) {
  if (typeof window === 'undefined') return;
  const drafts = getTradeDrafts().filter((item) => item.id !== draft.id);
  window.localStorage.setItem(tradeDraftsStorageKey, JSON.stringify([draft, ...drafts].slice(0, 50)));
}

export function deleteTradeDraft(id: string) {
  if (typeof window === 'undefined') return;
  const drafts = getTradeDrafts().filter((draft) => draft.id !== id);
  window.localStorage.setItem(tradeDraftsStorageKey, JSON.stringify(drafts));
}

export function clearTradeDrafts() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(tradeDraftsStorageKey);
}

function isTradeDraft(value: unknown): value is TradeDraft {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'tokenAddress' in value &&
    'tokenSymbol' in value &&
    'side' in value &&
    'amount' in value &&
    'estimatedOutput' in value,
  );
}
