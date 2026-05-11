import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address, Hex } from 'viem';
import { decodeFunctionResult, encodeFunctionData, parseUnits } from 'viem';
import { erc20Abi } from './erc20';
import { WalletContext, type WalletContextValue } from './WalletContext';

const BNB_CHAIN_ID = 56;
const BNB_CHAIN_HEX = '0x38';

type EthereumRequest = {
  method: string;
  params?: unknown[];
};

interface InjectedEthereum {
  request: (request: EthereumRequest) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface EthereumTransactionReceipt {
  status?: Hex;
  blockNumber?: Hex;
}

function getEthereum() {
  return typeof window !== 'undefined' ? (window.ethereum as InjectedEthereum | undefined) : undefined;
}

function normalizeChainId(value: unknown) {
  if (typeof value === 'string') return Number.parseInt(value, 16);
  if (typeof value === 'number') return value;
  return undefined;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshChain = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    const currentChainId = await ethereum.request({ method: 'eth_chainId' });
    setChainId(normalizeChainId(currentChainId));
  }, []);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    setIsConnecting(true);
    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as Address[];
      setAddress(accounts[0]);
      await refreshChain();
    } finally {
      setIsConnecting(false);
    }
  }, [refreshChain]);

  const disconnect = useCallback(() => {
    setAddress(undefined);
  }, []);

  const switchToBnb = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BNB_CHAIN_HEX }],
      });
    } catch {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BNB_CHAIN_HEX,
            chainName: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org'],
            blockExplorerUrls: ['https://bscscan.com'],
          },
        ],
      });
    }

    setChainId(BNB_CHAIN_ID);
  }, []);

  const getIonBalance = useCallback<WalletContextValue['getIonBalance']>(async ({ tokenAddress, account }) => {
    const ethereum = getEthereum();
    if (!ethereum) throw new Error('Wallet not available');

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account],
    });

    const result = (await ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data,
        },
        'latest',
      ],
    })) as Hex;

    return decodeFunctionResult({
      abi: erc20Abi,
      functionName: 'balanceOf',
      data: result,
    });
  }, []);

  const sendIonFee = useCallback<WalletContextValue['sendIonFee']>(
    async ({ tokenAddress, treasuryAddress, amountIon, decimals }) => {
      const ethereum = getEthereum();
      if (!ethereum || !address) throw new Error('Wallet not connected');
      if (chainId !== BNB_CHAIN_ID) throw new Error('BNB Chain is required');

      const amount = parseUnits(amountIon, decimals);
      const balance = await getIonBalance({ tokenAddress, account: address });
      if (balance < amount) throw new Error('Insufficient ION balance');

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [treasuryAddress, amount],
      });

      const hash = (await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: tokenAddress,
            data,
            value: '0x0',
          },
        ],
      })) as Hex;

      return hash;
    },
    [address, chainId, getIonBalance],
  );

  const waitForTransactionReceipt = useCallback<WalletContextValue['waitForTransactionReceipt']>(async (hash, params) => {
    const ethereum = getEthereum();
    if (!ethereum) throw new Error('Wallet not available');

    const timeoutMs = params?.timeoutMs ?? 120_000;
    const intervalMs = params?.intervalMs ?? 3_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
      const receipt = (await ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [hash],
      })) as EthereumTransactionReceipt | null;

      if (receipt) {
        return {
          status: receipt.status === '0x1' ? 'success' : 'reverted',
          blockNumber: receipt.blockNumber ? BigInt(receipt.blockNumber) : undefined,
        };
      }

      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }

    return { status: 'pending' };
  }, []);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    void refreshChain();

    const handleAccounts = (accounts: unknown) => {
      const nextAccounts = accounts as Address[];
      setAddress(nextAccounts[0] || undefined);
    };
    const handleChain = (nextChainId: unknown) => setChainId(normalizeChainId(nextChainId));

    ethereum.on?.('accountsChanged', handleAccounts);
    ethereum.on?.('chainChanged', handleChain);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccounts);
      ethereum.removeListener?.('chainChanged', handleChain);
    };
  }, [refreshChain]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isConnected: Boolean(address),
      isConnecting,
      connect,
      disconnect,
      switchToBnb,
      getIonBalance,
      sendIonFee,
      waitForTransactionReceipt,
    }),
    [address, chainId, connect, disconnect, getIonBalance, isConnecting, sendIonFee, switchToBnb, waitForTransactionReceipt],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
