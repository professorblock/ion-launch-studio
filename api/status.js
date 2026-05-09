export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const checks = {
    bitquery: Boolean(process.env.BITQUERY_API_TOKEN),
    metadata: Boolean(process.env.PINATA_JWT),
    ionFee: isAddress(process.env.VITE_ION_TOKEN_BSC_ADDRESS) && isAddress(process.env.VITE_TREASURY_ADDRESS) && Number(process.env.VITE_PLATFORM_FEE_ION || 0) > 0,
    burnBoard: Boolean(process.env.ION_TOKEN_BSC_ADDRESS && process.env.ION_BURN_ADDRESSES),
    launchProxy: Boolean(process.env.FOUR_MEME_PROXY || process.env.VITE_FOUR_MEME_PROXY),
    launchExecution: process.env.VITE_ENABLE_LAUNCH_EXECUTION === 'true',
    tradeExecution: process.env.VITE_ENABLE_TRADE_EXECUTION === 'true',
  };
  const missing = Object.entries(checks)
    .filter(([, ready]) => !ready)
    .map(([key]) => key);

  response.status(200).json({
    status: 'ok',
    services: {
      bitquery: checks.bitquery,
      metadata: checks.metadata,
      ionFee: checks.ionFee,
      burnBoard: checks.burnBoard,
      launchExecution: checks.launchExecution,
      tradeExecution: checks.tradeExecution,
    },
    network: {
      bnbChainId: Number(process.env.VITE_BNB_CHAIN_ID || 56),
      proxyConfigured: checks.launchProxy,
    },
    missing,
  });
}

function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}
