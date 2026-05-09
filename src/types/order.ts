export interface TradeDraft {
  id: string;
  createdAt: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  amount: string;
  estimatedOutput: string;
  slippageBps: number;
  expiresInMinutes: number;
  status: 'review-only' | 'ready-for-route';
}
