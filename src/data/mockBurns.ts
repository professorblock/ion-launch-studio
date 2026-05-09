import type { BurnBucket, BurnDashboardResponse, BurnEvent, BurnSummary } from '../types/burn';

const ionToken = '0x89b69f2d1adffa9a253d40840b6baa7fc903d697';
const burnAddress = '0x000000000000000000000000000000000000dead';
const treasuryAddress = '0x6e0a818c0f3dd2368475462f5d9c1a09b90a6f5a';

export const mockBurnEvents: BurnEvent[] = [
  {
    id: 'burn-1',
    txHash: '0xe632f7fe8938ad81412e08a4c6c395a3fc3a28fd7722a5cc318c7711aa8c3f11',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0x7cbb2e1818cf943355bcbdf31fbd3dfa03c8ae99',
    receiver: burnAddress,
    amountIon: 128_450,
    amountUsd: 8_735,
    timestamp: new Date(Date.now() - 1000 * 60 * 36).toISOString(),
    blockNumber: 49_201_118,
    type: 'burn',
  },
  {
    id: 'burn-2',
    txHash: '0xa2a8f1de44f36af358d0a6df5919375ed0b699e872ed4e139071db66a352a8f1',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0x4f1b3b3b8c24b76621d3a36ecb7f0ef9c05a61b6',
    receiver: burnAddress,
    amountIon: 82_100,
    amountUsd: 5_583,
    timestamp: new Date(Date.now() - 1000 * 60 * 142).toISOString(),
    blockNumber: 49_198_404,
    type: 'burn',
  },
  {
    id: 'burn-3',
    txHash: '0xfab4a1d3eacb2267c702d1d783f93dca9dd53e3ca212031ab88e883b6ea4e103',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0xa71ddf1dca3e7f73a22f6301f9438bc159d07cc4',
    receiver: treasuryAddress,
    amountIon: 82_100,
    amountUsd: 5_583,
    timestamp: new Date(Date.now() - 1000 * 60 * 148).toISOString(),
    blockNumber: 49_198_031,
    type: 'treasury',
  },
  {
    id: 'burn-4',
    txHash: '0x240cb078ea5ef21e984f1a66502068197a98a1035226b967dfc33f4c881d46fb',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0x083d2c0f3cc44ddff3a64875faaf66417f927c43',
    receiver: burnAddress,
    amountIon: 211_900,
    amountUsd: 14_410,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 17).toISOString(),
    blockNumber: 49_152_900,
    type: 'burn',
  },
  {
    id: 'burn-5',
    txHash: '0xbeaa88eea416536cc3d45df1c2cae3f9db4484a7a2d355d147f422c2b014071d',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0x2211d53c169cb439b2043bd95132133c6a99871c',
    receiver: burnAddress,
    amountIon: 67_850,
    amountUsd: 4_614,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 31).toISOString(),
    blockNumber: 49_090_533,
    type: 'burn',
  },
  {
    id: 'burn-6',
    txHash: '0x74dfe1a708569bb9d62604d9ea723185d76cf6f977242f6e428b71a4b712c422',
    tokenAddress: ionToken,
    tokenSymbol: 'ION',
    sender: '0x01bb1ffb29f162cfd1dff56a7e8cfe5519d7d81a',
    receiver: burnAddress,
    amountIon: 154_000,
    amountUsd: 10_472,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 68).toISOString(),
    blockNumber: 48_894_014,
    type: 'burn',
  },
];

export const mockBurnBuckets: BurnBucket[] = Array.from({ length: 14 }, (_, index) => {
  const daysAgo = 13 - index;
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const amountIon = [42_000, 61_200, 34_800, 74_400, 55_100, 88_700, 69_900, 95_400, 53_600, 112_800, 74_200, 211_900, 149_950, 210_550][index];
  return {
    day: date.toISOString().slice(0, 10),
    amountIon,
    amountUsd: amountIon * 0.068,
    count: Math.max(1, Math.round(amountIon / 52_000)),
  };
});

export const mockBurnSummary: BurnSummary = {
  totalBurnedIon: 1_245_900,
  totalBurnedUsd: 84_721,
  burned24hIon: 422_450,
  burned24hUsd: 28_728,
  burned7dIon: 822_900,
  burned7dUsd: 55_957,
  burnTxCount: 42,
  uniqueBurners: 29,
  avgBurnIon: 29_664,
  largestBurnIon: 211_900,
  treasuryIon: 415_300,
};

export function mockBurnDashboard(source: BurnDashboardResponse['source']): BurnDashboardResponse {
  return {
    summary: mockBurnSummary,
    events: mockBurnEvents,
    buckets: mockBurnBuckets,
    tokenAddress: ionToken,
    burnAddresses: [burnAddress],
    treasuryAddress,
    source: source === 'unconfigured' ? 'unconfigured' : source,
  };
}
