import { z } from 'zod';
import { BITQUERY_PROXY_PATH } from '../config/app';
import { mockTokens, mockTrades } from '../data/mockTokens';
import type { LaunchDataResponse } from '../types/token';

const addressSchema = z.custom<`0x${string}`>((value) => {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
});

const hashSchema = z.custom<`0x${string}`>((value) => {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
});

const tokenSchema = z.object({
  address: addressSchema,
  name: z.string().min(1).max(120),
  symbol: z.string().min(1).max(12),
  description: z.string().min(1).max(280),
  creator: addressSchema,
  imageUrl: z.string().min(1),
  status: z.enum(['bonding', 'graduated', 'new', 'watchlist']),
  marketCapUsd: z.coerce.number().nonnegative().catch(0),
  priceUsd: z.coerce.number().nonnegative().optional().catch(undefined),
  priceChange24h: z.coerce.number().optional().catch(undefined),
  liquidityUsd: z.coerce.number().nonnegative().optional().catch(undefined),
  holders: z.coerce.number().int().nonnegative().optional().catch(undefined),
  volume24hUsd: z.coerce.number().nonnegative().catch(0),
  trades24h: z.coerce.number().int().nonnegative().catch(0),
  bondingProgress: z.coerce.number().min(0).max(100).catch(0),
  createdAt: z.string().min(1),
  migrationTx: hashSchema.optional(),
});

const tradeSchema = z.object({
  id: z.string().min(1),
  tokenAddress: addressSchema,
  side: z.enum(['buy', 'sell']),
  trader: addressSchema,
  amountToken: z.coerce.number().nonnegative().catch(0),
  amountUsd: z.coerce.number().nonnegative().catch(0),
  timestamp: z.string().min(1),
});

const launchDataSchema = z.object({
  tokens: z.array(tokenSchema).catch([]),
  trades: z.array(tradeSchema).catch([]),
  source: z.enum(['bitquery', 'unconfigured']).catch('unconfigured'),
});

type LaunchOperation = 'launch-dashboard' | 'token-detail';

export async function fetchLaunchData(): Promise<LaunchDataResponse> {
  const payload = await requestLaunchData({ operation: 'launch-dashboard' });
  if (!payload.tokens.length) return mockLaunchData(payload.source);
  return payload;
}

export async function fetchToken(address: string): Promise<LaunchDataResponse & { token: LaunchDataResponse['tokens'][number] }> {
  const payload = await requestLaunchData({ operation: 'token-detail', address });
  if (payload.tokens.length) {
    return {
      ...payload,
      token: payload.tokens[0],
    };
  }

  const fallback = await fetchLaunchData();
  const token = fallback.tokens.find((item) => item.address.toLowerCase() === address.toLowerCase()) ?? fallback.tokens[0];
  return {
    ...fallback,
    trades: fallback.trades.filter((trade) => trade.tokenAddress.toLowerCase() === token.address.toLowerCase()),
    token,
  };
}

async function requestLaunchData(input: { operation: LaunchOperation; address?: string }): Promise<LaunchDataResponse> {
  try {
    const response = await fetch(BITQUERY_PROXY_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error('Launch data proxy unavailable');

    const parsed = launchDataSchema.parse(await response.json());
    return {
      tokens: parsed.tokens,
      trades: parsed.trades,
      source: parsed.source,
    };
  } catch {
    return mockLaunchData('fallback');
  }
}

function mockLaunchData(source: LaunchDataResponse['source']): LaunchDataResponse {
  return {
    tokens: mockTokens,
    trades: mockTrades,
    source: source === 'unconfigured' ? 'unconfigured' : 'mock',
  };
}
