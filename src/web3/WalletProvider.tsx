import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address, Hex } from 'viem';
import { decodeFunctionResult, encodeFunctionData, parseUnits, toHex } from 'viem';
import { erc20Abi } from './erc20';
import { fourMemeHelperAbi, fourMemeTokenManagerAbi } from './fourMeme';
import { WalletContext, type WalletContextValue } from './WalletContext';

const BNB_CHAIN_ID = 56;
const BNB_CHAIN_HEX = '0x38';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type EthereumRequest = {
  method: string;
  params?: unknown[];
};

interface InjectedEthereum {
  request: (request: EthereumRequest) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: InjectedEthereum[];
  isBinance?: boolean;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isTrust?: boolean;
}

interface EthereumTransactionReceipt {
  status?: Hex;
  blockNumber?: Hex;
}

interface WalletRpcError {
  code?: number | string;
  message?: string;
}

interface Eip6963ProviderDetail {
  info: {
    uuid?: string;
    name?: string;
    rdns?: string;
  };
  provider: InjectedEthereum;
}

declare global {
  interface Window {
    BinanceChain?: InjectedEthereum;
    trustwallet?: InjectedEthereum;
    okxwallet?: {
      ethereum?: InjectedEthereum;
    };
  }
}

function getEthereum(eip6963Providers: InjectedEthereum[] = []) {
  if (typeof window === 'undefined') return undefined;
  const primaryProvider = window.ethereum as InjectedEthereum | undefined;
  const injected = uniqueProviders([
    ...eip6963Providers,
    primaryProvider,
    ...(primaryProvider?.providers || []),
    window.BinanceChain,
    window.trustwallet,
    window.okxwallet?.ethereum,
  ].filter(isInjectedEthereum));

  return injected.find((provider) => provider.isMetaMask)
    || injected.find((provider) => provider.isBinance)
    || injected.find((provider) => provider.isTrust)
    || injected.find((provider) => provider.isOkxWallet)
    || injected[0];
}

function isInjectedEthereum(value: unknown): value is InjectedEthereum {
  return Boolean(value && typeof value === 'object' && 'request' in value && typeof (value as InjectedEthereum).request === 'function');
}

function uniqueProviders(providers: InjectedEthereum[]) {
  const seen = new Set<InjectedEthereum>();
  return providers.filter((provider) => {
    if (seen.has(provider)) return false;
    seen.add(provider);
    return true;
  });
}

function normalizeChainId(value: unknown) {
  if (typeof value === 'string') return Number.parseInt(value, 16);
  if (typeof value === 'number') return value;
  return undefined;
}

function walletErrorMessage(error: unknown) {
  const walletError = error as WalletRpcError;
  const code = walletError?.code;
  const message = typeof walletError?.message === 'string' ? walletError.message : '';

  if (code === 4001 || message.toLowerCase().includes('user rejected')) {
    return 'Wallet request rejected. Click Connect Wallet again and approve the request in your wallet popup.';
  }

  if (code === -32002 || message.toLowerCase().includes('already pending') || message.toLowerCase().includes('already processing')) {
    return 'A wallet connection request is already open. Check your wallet extension popup and approve or close the pending request.';
  }

  if (message) return message;

  return 'Wallet connection failed. Open this page in MetaMask, Binance Wallet, Trust Wallet, or another EVM wallet browser and try again.';
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);
  const [walletError, setWalletError] = useState<string>();
  const [eip6963Providers, setEip6963Providers] = useState<InjectedEthereum[]>([]);

  const getWalletProvider = useCallback(() => getEthereum(eip6963Providers), [eip6963Providers]);

  const refreshChain = useCallback(async () => {
    const ethereum = getWalletProvider();
    if (!ethereum) return;
    const currentChainId = await ethereum.request({ method: 'eth_chainId' });
    setChainId(normalizeChainId(currentChainId));
  }, [getWalletProvider]);

  const connect = useCallback(async () => {
    const ethereum = getWalletProvider();
    setWalletError(undefined);
    if (!ethereum) {
      setIsWalletAvailable(false);
      setWalletError('No browser wallet found. Open this page in MetaMask, Binance Wallet, Trust Wallet, or a browser with an EVM wallet extension.');
      return;
    }
    setIsWalletAvailable(true);
    setIsConnecting(true);
    try {
      const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as Address[];
      if (!accounts[0]) {
        setWalletError('No wallet account was selected.');
        return;
      }
      setAddress(accounts[0]);
      await refreshChain();
    } catch (error) {
      setWalletError(walletErrorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  }, [getWalletProvider, refreshChain]);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setWalletError(undefined);
  }, []);

  const switchToBnb = useCallback(async () => {
    const ethereum = getWalletProvider();
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
  }, [getWalletProvider]);

  const getIonBalance = useCallback<WalletContextValue['getIonBalance']>(async ({ tokenAddress, account }) => {
    const ethereum = getWalletProvider();
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
  }, [getWalletProvider]);

  const sendIonFee = useCallback<WalletContextValue['sendIonFee']>(
    async ({ tokenAddress, treasuryAddress, amountIon, decimals }) => {
      const ethereum = getWalletProvider();
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
    [address, chainId, getIonBalance, getWalletProvider],
  );

  const waitForTransactionReceipt = useCallback<WalletContextValue['waitForTransactionReceipt']>(async (hash, params) => {
    const ethereum = getWalletProvider();
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
  }, [getWalletProvider]);

  const signMessage = useCallback<WalletContextValue['signMessage']>(async (message) => {
    const ethereum = getWalletProvider();
    if (!ethereum || !address) throw new Error('Wallet not connected');
    return (await ethereum.request({
      method: 'personal_sign',
      params: [toHex(message), address],
    })) as `0x${string}`;
  }, [address, getWalletProvider]);

  const createFourMemeToken = useCallback<WalletContextValue['createFourMemeToken']>(async ({ tokenManager, createArg, signature }) => {
    const ethereum = getWalletProvider();
    if (!ethereum || !address) throw new Error('Wallet not connected');
    if (chainId !== BNB_CHAIN_ID) throw new Error('BNB Chain is required');

    const launchFeeData = encodeFunctionData({
      abi: fourMemeTokenManagerAbi,
      functionName: '_launchFee',
    });
    const launchFeeResult = (await ethereum.request({
      method: 'eth_call',
      params: [{ to: tokenManager, data: launchFeeData }, 'latest'],
    })) as `0x${string}`;
    const launchFee = decodeFunctionResult({
      abi: fourMemeTokenManagerAbi,
      functionName: '_launchFee',
      data: launchFeeResult,
    });
    const data = encodeFunctionData({
      abi: fourMemeTokenManagerAbi,
      functionName: 'createToken',
      args: [createArg, signature],
    });
    return (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: address, to: tokenManager, data, value: toHex(launchFee) }],
    })) as `0x${string}`;
  }, [address, chainId, getWalletProvider]);

  const quoteFourMemeBuy = useCallback<WalletContextValue['quoteFourMemeBuy']>(async ({ helper, token, fundsWei }) => {
    const ethereum = getWalletProvider();
    if (!ethereum) throw new Error('Wallet not available');
    const data = encodeFunctionData({
      abi: fourMemeHelperAbi,
      functionName: 'tryBuy',
      args: [token, 0n, fundsWei],
    });
    const result = (await ethereum.request({
      method: 'eth_call',
      params: [{ to: helper, data }, 'latest'],
    })) as `0x${string}`;
    const decoded = decodeFunctionResult({ abi: fourMemeHelperAbi, functionName: 'tryBuy', data: result });
    return {
      tokenManager: decoded[0],
      quote: decoded[1],
      estimatedAmount: decoded[2],
      estimatedCost: decoded[3],
      estimatedFee: decoded[4],
      amountMsgValue: decoded[5],
      amountApproval: decoded[6],
      amountFunds: decoded[7],
    };
  }, [getWalletProvider]);

  const quoteFourMemeSell = useCallback<WalletContextValue['quoteFourMemeSell']>(async ({ helper, token, amountWei }) => {
    const ethereum = getWalletProvider();
    if (!ethereum) throw new Error('Wallet not available');
    const data = encodeFunctionData({
      abi: fourMemeHelperAbi,
      functionName: 'trySell',
      args: [token, amountWei],
    });
    const result = (await ethereum.request({
      method: 'eth_call',
      params: [{ to: helper, data }, 'latest'],
    })) as `0x${string}`;
    const decoded = decodeFunctionResult({ abi: fourMemeHelperAbi, functionName: 'trySell', data: result });
    return {
      tokenManager: decoded[0],
      quote: decoded[1],
      funds: decoded[2],
      fee: decoded[3],
    };
  }, [getWalletProvider]);

  const executeFourMemeBuy = useCallback<WalletContextValue['executeFourMemeBuy']>(async ({ token, quote, slippageBps }) => {
    const ethereum = getWalletProvider();
    if (!ethereum || !address) throw new Error('Wallet not connected');
    if (chainId !== BNB_CHAIN_ID) throw new Error('BNB Chain is required');
    if (quote.quote.toLowerCase() !== ZERO_ADDRESS) throw new Error('Only BNB quote trades are enabled.');

    const minAmount = applySlippageFloor(quote.estimatedAmount, slippageBps);
    const data = encodeFunctionData({
      abi: fourMemeTokenManagerAbi,
      functionName: 'buyTokenAMAP',
      args: [0n, token, address, quote.amountFunds, minAmount],
    });
    return (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: address, to: quote.tokenManager, data, value: toHex(quote.amountMsgValue) }],
    })) as `0x${string}`;
  }, [address, chainId, getWalletProvider]);

  const executeFourMemeSell = useCallback<WalletContextValue['executeFourMemeSell']>(async ({ token, quote, amountWei, slippageBps }) => {
    const ethereum = getWalletProvider();
    if (!ethereum || !address) throw new Error('Wallet not connected');
    if (chainId !== BNB_CHAIN_ID) throw new Error('BNB Chain is required');
    if (quote.quote.toLowerCase() !== ZERO_ADDRESS) throw new Error('Only BNB quote trades are enabled.');

    const allowanceData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, quote.tokenManager],
    });
    const allowanceResult = (await ethereum.request({
      method: 'eth_call',
      params: [{ to: token, data: allowanceData }, 'latest'],
    })) as `0x${string}`;
    const allowance = decodeFunctionResult({ abi: erc20Abi, functionName: 'allowance', data: allowanceResult });
    let approveHash: `0x${string}` | undefined;
    if (allowance < amountWei) {
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.tokenManager, amountWei],
      });
      approveHash = (await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: token, data: approveData, value: '0x0' }],
      })) as `0x${string}`;
      const approveReceipt = await waitForTransactionReceipt(approveHash);
      if (approveReceipt.status !== 'success') throw new Error('Token approval was not confirmed.');
    }

    const minFunds = applySlippageFloor(quote.funds > quote.fee ? quote.funds - quote.fee : quote.funds, slippageBps);
    const data = encodeFunctionData({
      abi: fourMemeTokenManagerAbi,
      functionName: 'sellToken',
      args: [0n, token, amountWei, minFunds],
    });
    const sellHash = (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: address, to: quote.tokenManager, data, value: '0x0' }],
    })) as `0x${string}`;
    return { approveHash, sellHash };
  }, [address, chainId, getWalletProvider, waitForTransactionReceipt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const providers = new Map<string, InjectedEthereum>();
    const addProvider = (detail?: Eip6963ProviderDetail) => {
      if (!detail || !isInjectedEthereum(detail.provider)) return;
      const key = detail.info.uuid || detail.info.rdns || detail.info.name || String(providers.size);
      providers.set(key, detail.provider);
      setEip6963Providers(Array.from(providers.values()));
    };
    const handleProvider = (event: Event) => addProvider((event as CustomEvent<Eip6963ProviderDetail>).detail);

    window.addEventListener('eip6963:announceProvider', handleProvider);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => window.removeEventListener('eip6963:announceProvider', handleProvider);
  }, []);

  useEffect(() => {
    const refreshAvailability = () => setIsWalletAvailable(Boolean(getWalletProvider()));
    refreshAvailability();
    const availabilityTimers = [
      window.setTimeout(refreshAvailability, 500),
      window.setTimeout(refreshAvailability, 1_500),
    ];

    const ethereum = getWalletProvider();
    let handleAccounts: ((accounts: unknown) => void) | undefined;
    let handleChain: ((nextChainId: unknown) => void) | undefined;

    if (ethereum) {
      void refreshChain();

      handleAccounts = (accounts: unknown) => {
        const nextAccounts = accounts as Address[];
        setAddress(nextAccounts[0] || undefined);
      };
      handleChain = (nextChainId: unknown) => setChainId(normalizeChainId(nextChainId));

      ethereum.on?.('accountsChanged', handleAccounts);
      ethereum.on?.('chainChanged', handleChain);
    }

    return () => {
      availabilityTimers.forEach((timer) => window.clearTimeout(timer));
      if (handleAccounts) ethereum?.removeListener?.('accountsChanged', handleAccounts);
      if (handleChain) ethereum?.removeListener?.('chainChanged', handleChain);
    };
  }, [getWalletProvider, refreshChain]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isConnected: Boolean(address),
      isConnecting,
      isWalletAvailable,
      walletError,
      connect,
      disconnect,
      switchToBnb,
      getIonBalance,
      sendIonFee,
      waitForTransactionReceipt,
      signMessage,
      createFourMemeToken,
      quoteFourMemeBuy,
      quoteFourMemeSell,
      executeFourMemeBuy,
      executeFourMemeSell,
    }),
    [
      address,
      chainId,
      connect,
      createFourMemeToken,
      disconnect,
      executeFourMemeBuy,
      executeFourMemeSell,
      getIonBalance,
      isConnecting,
      isWalletAvailable,
      quoteFourMemeBuy,
      quoteFourMemeSell,
      sendIonFee,
      signMessage,
      switchToBnb,
      waitForTransactionReceipt,
      walletError,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function applySlippageFloor(value: bigint, slippageBps: number) {
  const bps = BigInt(Math.min(Math.max(Math.round(slippageBps), 0), 5000));
  return (value * (10_000n - bps)) / 10_000n;
}
