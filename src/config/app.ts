import { isAddress } from 'viem';

export const FOUR_MEME_PROXY = import.meta.env.VITE_FOUR_MEME_PROXY || '0x5c952063c7fc8610ffdb798152d69f0b9550762b';
export const BNB_CHAIN_ID = Number(import.meta.env.VITE_BNB_CHAIN_ID || 56);
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ION Launch';
export const BITQUERY_PROXY_PATH = import.meta.env.VITE_BITQUERY_PROXY_PATH || '/api/bitquery';
export const featureFlags = {
  launchExecution: import.meta.env.VITE_ENABLE_LAUNCH_EXECUTION === 'true',
  tradeExecution: import.meta.env.VITE_ENABLE_TRADE_EXECUTION === 'true',
};

const configuredIonToken = import.meta.env.VITE_ION_TOKEN_BSC_ADDRESS || '';
const configuredTreasury = import.meta.env.VITE_TREASURY_ADDRESS || '';
const configuredFee = import.meta.env.VITE_PLATFORM_FEE_ION || '0';
const configuredDecimals = Number(import.meta.env.VITE_ION_TOKEN_DECIMALS || 18);

export const feeConfig = {
  ionTokenAddress: isAddress(configuredIonToken) ? configuredIonToken : undefined,
  treasuryAddress: isAddress(configuredTreasury) ? configuredTreasury : undefined,
  platformFeeIon: configuredFee,
  ionDecimals: Number.isInteger(configuredDecimals) ? configuredDecimals : 18,
};

export const chainConfig = {
  bnbChainId: BNB_CHAIN_ID,
  fourMemeProxy: FOUR_MEME_PROXY,
};

export const externalLinks = {
  bscScanAddress: (address: string) => `https://bscscan.com/address/${address}`,
  bscScanTx: (hash: string) => `https://bscscan.com/tx/${hash}`,
};
