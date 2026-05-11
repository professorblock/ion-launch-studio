export type LaunchStatus = 'bonding' | 'graduated' | 'new' | 'watchlist';

export interface LaunchToken {
  address: `0x${string}`;
  name: string;
  symbol: string;
  description: string;
  creator: `0x${string}`;
  imageUrl: string;
  status: LaunchStatus;
  marketCapUsd: number;
  priceUsd?: number;
  priceChange24h?: number;
  liquidityUsd?: number;
  holders?: number;
  volume24hUsd: number;
  trades24h: number;
  bondingProgress: number;
  createdAt: string;
  migrationTx?: `0x${string}`;
}

export interface RecentTrade {
  id: string;
  tokenAddress: `0x${string}`;
  side: 'buy' | 'sell';
  trader: `0x${string}`;
  amountToken: number;
  amountUsd: number;
  priceUsd?: number;
  timestamp: string;
}

export type LaunchDataSource = 'bitquery' | 'mock' | 'unconfigured' | 'fallback';

export interface LaunchDataResponse {
  tokens: LaunchToken[];
  trades: RecentTrade[];
  source: LaunchDataSource;
}
