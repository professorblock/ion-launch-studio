import { createContext, useContext } from 'react';
import type { Address, Hex } from 'viem';

export interface WalletContextValue {
  address?: Address;
  chainId?: number;
  isConnected: boolean;
  isConnecting: boolean;
  isWalletAvailable: boolean;
  walletError?: string;
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
  signMessage: (message: string) => Promise<Hex>;
  createFourMemeToken: (params: {
    tokenManager: Address;
    createArg: Hex;
    signature: Hex;
  }) => Promise<Hex>;
  quoteFourMemeBuy: (params: {
    helper: Address;
    token: Address;
    fundsWei: bigint;
  }) => Promise<FourMemeBuyQuote>;
  quoteFourMemeSell: (params: {
    helper: Address;
    token: Address;
    amountWei: bigint;
  }) => Promise<FourMemeSellQuote>;
  executeFourMemeBuy: (params: {
    token: Address;
    quote: FourMemeBuyQuote;
    slippageBps: number;
  }) => Promise<Hex>;
  executeFourMemeSell: (params: {
    token: Address;
    quote: FourMemeSellQuote;
    amountWei: bigint;
    slippageBps: number;
  }) => Promise<{ approveHash?: Hex; sellHash: Hex }>;
}

export interface FourMemeBuyQuote {
  tokenManager: Address;
  quote: Address;
  estimatedAmount: bigint;
  estimatedCost: bigint;
  estimatedFee: bigint;
  amountMsgValue: bigint;
  amountApproval: bigint;
  amountFunds: bigint;
}

export interface FourMemeSellQuote {
  tokenManager: Address;
  quote: Address;
  funds: bigint;
  fee: bigint;
}

export const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
