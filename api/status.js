export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const checks = {
    bitquery: Boolean(process.env.BITQUERY_API_TOKEN),
    metadata: Boolean(process.env.PINATA_JWT),
    ionFee: isAddress(process.env.VITE_ION_TOKEN_BSC_ADDRESS) && isAddress(process.env.VITE_TREASURY_ADDRESS) && Number(process.env.VITE_PLATFORM_FEE_ION || 0) > 0,
    feeVerifier: isAddress(process.env.ION_TOKEN_BSC_ADDRESS || process.env.VITE_ION_TOKEN_BSC_ADDRESS) && isAddress(process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS) && Number(process.env.VITE_PLATFORM_FEE_ION || 0) > 0,
    burnBoard: Boolean(process.env.ION_TOKEN_BSC_ADDRESS && process.env.ION_BURN_ADDRESSES),
    launchProxy: Boolean(process.env.FOUR_MEME_PROXY || process.env.VITE_FOUR_MEME_PROXY),
    launchExecution: process.env.VITE_ENABLE_LAUNCH_EXECUTION === 'true',
    tradeExecution: process.env.VITE_ENABLE_TRADE_EXECUTION === 'true',
    executionVerified: process.env.VITE_EXECUTION_VERIFIED === 'true',
  };
  const launchBlockers = [
    !checks.bitquery ? 'live market data' : undefined,
    !checks.ionFee ? 'ION fee configuration' : undefined,
    !checks.feeVerifier ? 'ION fee verifier configuration' : undefined,
    !checks.burnBoard ? 'burn board configuration' : undefined,
    checks.launchExecution && !checks.executionVerified ? 'launch execution is enabled before final verification' : undefined,
    checks.tradeExecution && !checks.executionVerified ? 'trade execution is enabled before final verification' : undefined,
  ].filter(Boolean);
  const requiredChecks = {
    bitquery: checks.bitquery,
    metadata: checks.metadata,
    ionFee: checks.ionFee,
    feeVerifier: checks.feeVerifier,
    burnBoard: checks.burnBoard,
    launchProxy: checks.launchProxy,
  };
  const missing = Object.entries(requiredChecks)
    .filter(([, ready]) => !ready)
    .map(([key]) => key);

  response.setHeader('cache-control', 's-maxage=20, stale-while-revalidate=60');
  response.status(200).json({
    status: 'ok',
    publicLaunchReady: launchBlockers.length === 0,
    launchBlockers,
    deployment: {
      environment: process.env.VERCEL_ENV || 'local',
      region: process.env.VERCEL_REGION || undefined,
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || undefined,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    },
    services: {
      bitquery: checks.bitquery,
      metadata: checks.metadata,
      ionFee: checks.ionFee,
      feeVerifier: checks.feeVerifier,
      burnBoard: checks.burnBoard,
      launchExecution: checks.launchExecution,
      tradeExecution: checks.tradeExecution,
      executionVerified: checks.executionVerified,
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
