import { z } from 'zod';
import { BITQUERY_PROXY_PATH } from '../config/app';
import { mockBurnDashboard } from '../data/mockBurns';
import type { BurnDashboardResponse } from '../types/burn';

const addressSchema = z.custom<`0x${string}`>((value) => {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
});

const hashSchema = z.custom<`0x${string}`>((value) => {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
});

const burnEventSchema = z.object({
  id: z.string().min(1),
  txHash: hashSchema,
  tokenAddress: addressSchema,
  tokenSymbol: z.string().min(1).max(16),
  sender: addressSchema,
  receiver: addressSchema,
  amountIon: z.coerce.number().nonnegative().catch(0),
  amountUsd: z.coerce.number().nonnegative().catch(0),
  timestamp: z.string().min(1),
  blockNumber: z.coerce.number().int().nonnegative().optional(),
  type: z.enum(['burn', 'treasury']),
});

const burnBucketSchema = z.object({
  day: z.string().min(1),
  amountIon: z.coerce.number().nonnegative().catch(0),
  amountUsd: z.coerce.number().nonnegative().catch(0),
  count: z.coerce.number().int().nonnegative().catch(0),
});

const burnSummarySchema = z.object({
  totalBurnedIon: z.coerce.number().nonnegative().catch(0),
  totalBurnedUsd: z.coerce.number().nonnegative().catch(0),
  burned24hIon: z.coerce.number().nonnegative().catch(0),
  burned24hUsd: z.coerce.number().nonnegative().catch(0),
  burned7dIon: z.coerce.number().nonnegative().catch(0),
  burned7dUsd: z.coerce.number().nonnegative().catch(0),
  burnTxCount: z.coerce.number().int().nonnegative().catch(0),
  uniqueBurners: z.coerce.number().int().nonnegative().catch(0),
  avgBurnIon: z.coerce.number().nonnegative().catch(0),
  largestBurnIon: z.coerce.number().nonnegative().catch(0),
  treasuryIon: z.coerce.number().nonnegative().catch(0),
});

const burnDashboardSchema = z.object({
  summary: burnSummarySchema,
  events: z.array(burnEventSchema).catch([]),
  buckets: z.array(burnBucketSchema).catch([]),
  tokenAddress: addressSchema.optional(),
  burnAddresses: z.array(addressSchema).catch([]),
  treasuryAddress: addressSchema.optional(),
  source: z.enum(['bitquery', 'mock', 'unconfigured']).catch('unconfigured'),
});

export async function fetchBurnDashboard(): Promise<BurnDashboardResponse> {
  try {
    const response = await fetch(BITQUERY_PROXY_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'burn-dashboard' }),
    });

    if (!response.ok) throw new Error('Burn data proxy unavailable');

    const parsed = burnDashboardSchema.parse(await response.json());
    if (!parsed.events.length) return mockBurnDashboard(parsed.source);
    return parsed;
  } catch {
    return mockBurnDashboard('fallback');
  }
}
