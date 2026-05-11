import { createContext, useContext } from 'react';
import type { Address, Hex } from 'viem';

export interface WalletContextValue {
  address?: Address;
  chainId?: number;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBnb: () => Promise<void>;
  getIonBalance: (params: {
    tokenAddress: Address;
    account: Address;
  }) => Promise<bigint>;
  sendIonFee: (params: {
    tokenAddress: Address;
    treasuryAddress: Address;
    amountIon: string;
    decimals: number;
  }) => Promise<Hex>;
  waitForTransactionReceipt: (hash: Hex, params?: {
    timeoutMs?: number;
    intervalMs?: number;
  }) => Promise<{
    status: 'pending' | 'success' | 'reverted';
    blockNumber?: bigint;
  }>;
}

export const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
