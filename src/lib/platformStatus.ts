import { z } from 'zod';

const platformStatusSchema = z.object({
  status: z.string(),
  services: z.object({
    bitquery: z.boolean(),
    metadata: z.boolean(),
    ionFee: z.boolean(),
    burnBoard: z.boolean(),
    launchExecution: z.boolean().catch(false),
    tradeExecution: z.boolean().catch(false),
  }),
  network: z.object({
    bnbChainId: z.number(),
    proxyConfigured: z.boolean(),
  }),
  missing: z.array(z.string()).catch([]),
});

export type PlatformStatus = z.infer<typeof platformStatusSchema>;

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('Platform status unavailable');
    return platformStatusSchema.parse(await response.json());
  } catch {
    return {
      status: 'local',
      services: {
        bitquery: false,
        metadata: false,
        ionFee: false,
        burnBoard: false,
        launchExecution: false,
        tradeExecution: false,
      },
      network: {
        bnbChainId: 56,
        proxyConfigured: true,
      },
      missing: ['bitquery', 'metadata', 'ionFee', 'burnBoard'],
    };
  }
}
