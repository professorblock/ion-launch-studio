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
  imageUri?: string;
  imageGatewayUrl?: string;
  feeTxHash?: Hex;
  feeStatus?: 'submitted' | 'confirmed' | 'reverted';
  feeVerificationStatus?: 'verified' | 'unchecked' | 'mismatch';
  feeVerificationMessage?: string;
  feeSubmittedAt?: string;
  feeConfirmedAt?: string;
  feeBlockNumber?: string;
  feeAmountIon?: string;
  feeTokenAddress?: string;
  feeTreasuryAddress?: string;
  metadataUri?: string;
  metadataGatewayUrl?: string;
  metadataStatus: 'local' | 'pinned' | 'unconfigured';
  fourMemeImageUrl?: string;
  launchTxHash?: Hex;
  launchSubmittedAt?: string;
  launchConfirmedAt?: string;
  launchBlockNumber?: string;
  launchStatus?: 'prepared' | 'submitted' | 'confirmed' | 'failed';
}
