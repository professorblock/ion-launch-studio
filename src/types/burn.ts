export type BurnDataSource = 'bitquery' | 'mock' | 'unconfigured' | 'fallback';
export type BurnEventType = 'burn' | 'treasury';

export interface BurnEvent {
  id: string;
  txHash: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  sender: `0x${string}`;
  receiver: `0x${string}`;
  amountIon: number;
  amountUsd: number;
  timestamp: string;
  blockNumber?: number;
  type: BurnEventType;
}

export interface BurnBucket {
  day: string;
  amountIon: number;
  amountUsd: number;
  count: number;
}

export interface BurnSummary {
  totalBurnedIon: number;
  totalBurnedUsd: number;
  burned24hIon: number;
  burned24hUsd: number;
  burned7dIon: number;
  burned7dUsd: number;
  burnTxCount: number;
  uniqueBurners: number;
  avgBurnIon: number;
  largestBurnIon: number;
  treasuryIon: number;
}

export interface BurnDashboardResponse {
  summary: BurnSummary;
  events: BurnEvent[];
  buckets: BurnBucket[];
  tokenAddress?: `0x${string}`;
  burnAddresses: `0x${string}`[];
  treasuryAddress?: `0x${string}`;
  source: BurnDataSource;
}
