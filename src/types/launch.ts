import type { Hex } from 'viem';

export interface LaunchPacket {
  id: string;
  createdAt: string;
  name: string;
  symbol: string;
  description: string;
  website?: string;
  x?: string;
  telegram?: string;
  imagePreview?: string;
  feeTxHash?: Hex;
  metadataUri?: string;
  metadataStatus: 'local' | 'pinned' | 'unconfigured';
}
