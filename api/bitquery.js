import { Buffer } from 'node:buffer';

const BITQUERY_GRAPHQL_URL = process.env.BITQUERY_GRAPHQL_URL || 'https://streaming.bitquery.io/graphql';
const FOUR_MEME_PROXY = (process.env.FOUR_MEME_PROXY || '0x5c952063c7fc8610ffdb798152d69f0b9550762b').toLowerCase();
const ION_TOKEN_ADDRESS = normalizeAddress(process.env.ION_TOKEN_BSC_ADDRESS || process.env.VITE_ION_TOKEN_BSC_ADDRESS || '');
const TREASURY_ADDRESS = normalizeAddress(process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS || '');
const ION_BURN_ADDRESSES = parseAddressList(process.env.ION_BURN_ADDRESSES || '0x000000000000000000000000000000000000dead');
const ION_PRICE_USD = Number(process.env.ION_PRICE_USD || 0);
const MAX_JSON_BODY_BYTES = 64_000;

const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 's-maxage=20, stale-while-revalidate=60',
};

const BASE_ASSETS = new Set([
  '0x0000000000000000000000000000000000000000',
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  '0x55d398326f99059ff775485246999027b3197955',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
]);

const dashboardQuery = `
  query IonLaunchDashboard($proxy: String!, $since: DateTime!) {
    EVM(network: bsc, dataset: combined) {
      Events(
        where: {
          Transaction: { To: { is: $proxy } }
          Log: {
            Signature: { Name: { is: "TokenCreate" } }
          }
        }
        limit: { count: 40 }
        orderBy: { descending: Block_Time }
      ) {
        Block { Time }
        Transaction { Hash From }
        Arguments {
          Name
          Type
          Value {
            ... on EVM_ABI_Integer_Value_Arg { integer }
            ... on EVM_ABI_Boolean_Value_Arg { bool }
            ... on EVM_ABI_Bytes_Value_Arg { hex }
            ... on EVM_ABI_BigInt_Value_Arg { bigInteger }
            ... on EVM_ABI_Address_Value_Arg { address }
            ... on EVM_ABI_String_Value_Arg { string }
          }
        }
      }
      Migrations: Events(
        where: {
          Transaction: { To: { is: $proxy } }
          Log: {
            Signature: { Name: { in: ["PairCreated", "PoolCreated"] } }
          }
        }
        limit: { count: 60 }
        orderBy: { descending: Block_Time }
      ) {
        Block { Time }
        Transaction { Hash From }
        Arguments {
          Name
          Type
          Value {
            ... on EVM_ABI_Integer_Value_Arg { integer }
            ... on EVM_ABI_Boolean_Value_Arg { bool }
            ... on EVM_ABI_Bytes_Value_Arg { hex }
            ... on EVM_ABI_BigInt_Value_Arg { bigInteger }
            ... on EVM_ABI_Address_Value_Arg { address }
            ... on EVM_ABI_String_Value_Arg { string }
          }
        }
      }
      DEXTrades(
        where: {
          Block: { Time: { since: $since } }
          Trade: { Dex: { ProtocolName: { is: "fourmeme_v1" } } }
        }
        limit: { count: 80 }
        orderBy: { descending: Block_Time }
      ) {
        Block { Time }
        Transaction { Hash From }
        Trade {
          Buy { Amount Buyer Currency { Name Symbol SmartContract } PriceInUSD }
          Sell { Amount Seller Currency { Name Symbol SmartContract } PriceInUSD }
        }
      }
    }
  }
`;

const tokenDetailQuery = `
  query IonLaunchToken($token: String!, $since: DateTime!) {
    EVM(network: bsc, dataset: combined) {
      DEXTrades(
        where: {
          Block: { Time: { since: $since } }
          Trade: {
            Dex: { ProtocolName: { is: "fourmeme_v1" } }
            any: [
              { Buy: { Currency: { SmartContract: { is: $token } } } }
              { Sell: { Currency: { SmartContract: { is: $token } } } }
            ]
          }
        }
        limit: { count: 120 }
        orderBy: { descending: Block_Time }
      ) {
        Block { Time }
        Transaction { Hash From }
        Trade {
          Buy { Amount Buyer Currency { Name Symbol SmartContract } PriceInUSD }
          Sell { Amount Seller Currency { Name Symbol SmartContract } PriceInUSD }
        }
      }
    }
  }
`;

const burnDashboardQuery = `
  query IonBurnDashboard($token: String!, $receivers: [String!], $since: DateTime!) {
    EVM(network: bsc, dataset: combined) {
      Transfers(
        where: {
          Block: { Time: { since: $since } }
          Transfer: {
            Currency: { SmartContract: { is: $token } }
            Receiver: { in: $receivers }
          }
        }
        limit: { count: 100 }
        orderBy: { descending: Block_Time }
      ) {
        Block { Time Number }
        Transaction { Hash }
        Transfer {
          Sender
          Receiver
          Amount
          Currency { Symbol SmartContract }
        }
      }
    }
  }
`;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).setHeader('content-type', JSON_HEADERS['content-type']).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.BITQUERY_API_TOKEN;
  if (!token) {
    response.status(200).setHeader('cache-control', JSON_HEADERS['cache-control']).json({
      tokens: [],
      trades: [],
      source: 'unconfigured',
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request, MAX_JSON_BODY_BYTES);
  } catch {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }
  const operation = typeof body.operation === 'string' ? body.operation : 'launch-dashboard';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    if (operation === 'burn-dashboard') {
      const receivers = [...ION_BURN_ADDRESSES, TREASURY_ADDRESS].filter(Boolean);
      if (!ION_TOKEN_ADDRESS || !receivers.length) {
        response.status(200).setHeader('cache-control', JSON_HEADERS['cache-control']).json({
          summary: emptyBurnSummary(),
          events: [],
          buckets: [],
          burnAddresses: ION_BURN_ADDRESSES,
          treasuryAddress: TREASURY_ADDRESS,
          source: 'unconfigured',
        });
        return;
      }

      const payload = await bitquery(token, burnDashboardQuery, {
        token: ION_TOKEN_ADDRESS,
        receivers,
        since: since30d,
      });
      response.status(200).setHeader('cache-control', JSON_HEADERS['cache-control']).json({
        ...extractBurnDashboard(payload),
        tokenAddress: ION_TOKEN_ADDRESS,
        burnAddresses: ION_BURN_ADDRESSES,
        treasuryAddress: TREASURY_ADDRESS,
        source: 'bitquery',
      });
      return;
    }

    if (operation === 'token-detail') {
      const address = normalizeAddress(body.address);
      if (!address) {
        response.status(400).json({ error: 'Invalid token address' });
        return;
      }

      const payload = await bitquery(token, tokenDetailQuery, { token: address, since });
      const trades = extractTrades(payload, address);
      const tokenFromTrades = buildTokenFromTrades(address, trades);

      response.status(200).setHeader('cache-control', JSON_HEADERS['cache-control']).json({
        tokens: tokenFromTrades ? [tokenFromTrades] : [],
        trades,
        source: 'bitquery',
      });
      return;
    }

    const payload = await bitquery(token, dashboardQuery, { proxy: FOUR_MEME_PROXY, since });
    const tokens = applyMigrationStatus(mergeTokens(
      extractTokenEvents(payload),
      extractTradeTokens(payload),
    ), extractMigrationAddresses(payload));
    const trades = extractTrades(payload);

    response.status(200).setHeader('cache-control', JSON_HEADERS['cache-control']).json({
      tokens,
      trades,
      source: 'bitquery',
    });
  } catch (error) {
    response.status(502).json({
      error: 'Bitquery proxy unavailable',
      details: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined,
    });
  }
}

async function readJsonBody(request, maxBytes = 64_000) {
  if (request.body && typeof request.body === 'object') return request.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) {
        reject(new Error('Request body too large'));
        request.destroy?.();
      }
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function bitquery(token, query, variables) {
  const upstream = await fetch(BITQUERY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Bitquery request failed: ${upstream.status}`);
  }
  return payload;
}

function extractTokenEvents(payload) {
  const events = payload?.data?.EVM?.Events ?? [];
  return events.map((event, index) => {
    const args = argMap(event.Arguments);
    const address = normalizeAddress(args.token || args.tokenaddress || args.currency || args.contract);
    if (!address) return undefined;
    const symbol = safeSymbol(args.symbol || args.ticker || `ION${index + 1}`);
    const name = safeText(args.name || `${symbol} Token`, `${symbol} Token`);
    const createdAt = event.Block?.Time || new Date().toISOString();

    return {
      address,
      name,
      symbol,
      description: `${name} is an ION community market discovered from BNB launch activity.`,
      creator: normalizeAddress(args.creator || event.Transaction?.From) || '0x0000000000000000000000000000000000000000',
      imageUrl: generatedImage(symbol, address),
      status: statusFromCreatedAt(createdAt),
      marketCapUsd: 0,
      priceUsd: 0,
      priceChange24h: 0,
      liquidityUsd: 0,
      holders: undefined,
      volume24hUsd: 0,
      trades24h: 0,
      bondingProgress: 0,
      createdAt,
    };
  }).filter(Boolean);
}

function extractTradeTokens(payload) {
  const trades = payload?.data?.EVM?.DEXTrades ?? [];
  const byAddress = new Map();

  for (const trade of trades) {
    const side = getTokenSide(trade);
    if (!side) continue;
    const address = normalizeAddress(side.Currency?.SmartContract);
    if (!address) continue;

    const current = byAddress.get(address) || {
      address,
      name: safeText(side.Currency?.Name, safeSymbol(side.Currency?.Symbol || 'ION Token')),
      symbol: safeSymbol(side.Currency?.Symbol || address.slice(2, 8).toUpperCase()),
      description: 'Live ION community market with recent BNB Chain trading activity.',
      creator: normalizeAddress(trade.Transaction?.From) || '0x0000000000000000000000000000000000000000',
      imageUrl: generatedImage(side.Currency?.Symbol || 'ION', address),
      status: 'bonding',
      marketCapUsd: 0,
      priceUsd: 0,
      priceChange24h: 0,
      liquidityUsd: 0,
      holders: undefined,
      volume24hUsd: 0,
      trades24h: 0,
      bondingProgress: 0,
      createdAt: trade.Block?.Time || new Date().toISOString(),
    };

    const amountUsd = usdAmount(side);
    const priceUsd = Number(side?.PriceInUSD || 0);
    current.volume24hUsd += amountUsd;
    current.marketCapUsd = Math.max(current.marketCapUsd, amountUsd * 120);
    current.priceUsd = Math.max(current.priceUsd || 0, Number.isFinite(priceUsd) ? priceUsd : 0);
    current.liquidityUsd = Math.max(current.liquidityUsd || 0, current.volume24hUsd * 0.38);
    current.priceChange24h = estimateChange(current.volume24hUsd, current.trades24h);
    current.trades24h += 1;
    current.bondingProgress = Math.min(99, Math.max(current.bondingProgress, Math.round(current.volume24hUsd / 1800)));
    byAddress.set(address, current);
  }

  return Array.from(byAddress.values());
}

function extractTrades(payload, tokenAddress) {
  const trades = payload?.data?.EVM?.DEXTrades ?? [];
  return trades.map((trade) => {
    const tokenSide = tokenAddress ? getTokenSideForAddress(trade, tokenAddress) : getTokenSide(trade);
    if (!tokenSide) return undefined;
    const address = normalizeAddress(tokenSide.Currency?.SmartContract);
    if (!address) return undefined;
    const isBuy = normalizeAddress(trade.Trade?.Buy?.Currency?.SmartContract) === address;
    const trader = normalizeAddress(isBuy ? trade.Trade?.Buy?.Buyer : trade.Trade?.Sell?.Seller) || normalizeAddress(trade.Transaction?.From);

    return {
      id: trade.Transaction?.Hash || `${address}-${trade.Block?.Time || Date.now()}`,
      tokenAddress: address,
      side: isBuy ? 'buy' : 'sell',
      trader: trader || '0x0000000000000000000000000000000000000000',
      amountToken: Number(tokenSide.Amount || 0),
      amountUsd: usdAmount(tokenSide),
      priceUsd: Number(tokenSide.PriceInUSD || 0),
      timestamp: trade.Block?.Time || new Date().toISOString(),
    };
  }).filter(Boolean);
}

function buildTokenFromTrades(address, trades) {
  if (!trades.length) return undefined;
  const volume = trades.reduce((sum, trade) => sum + trade.amountUsd, 0);
  return {
    address,
    name: `Token ${address.slice(2, 8).toUpperCase()}`,
    symbol: address.slice(2, 8).toUpperCase(),
    description: 'Live ION community market with recent BNB Chain trading activity.',
    creator: trades[0]?.trader || '0x0000000000000000000000000000000000000000',
    imageUrl: generatedImage(address.slice(2, 8), address),
    status: 'bonding',
    marketCapUsd: Math.max(volume * 120, 0),
    priceUsd: trades[0]?.amountToken ? trades[0].amountUsd / trades[0].amountToken : 0,
    priceChange24h: estimateChange(volume, trades.length),
    liquidityUsd: volume * 0.38,
    holders: undefined,
    volume24hUsd: volume,
    trades24h: trades.length,
    bondingProgress: Math.min(99, Math.round(volume / 1800)),
    createdAt: trades.at(-1)?.timestamp || new Date().toISOString(),
  };
}

function mergeTokens(primaryTokens, tradeTokens) {
  const byAddress = new Map();
  for (const token of [...tradeTokens, ...primaryTokens]) {
    const current = byAddress.get(token.address);
    if (!current) {
      byAddress.set(token.address, token);
      continue;
    }

    byAddress.set(token.address, {
      ...current,
      ...token,
      marketCapUsd: Math.max(current.marketCapUsd, token.marketCapUsd),
      priceUsd: Math.max(current.priceUsd || 0, token.priceUsd || 0),
      priceChange24h: token.priceChange24h ?? current.priceChange24h,
      liquidityUsd: Math.max(current.liquidityUsd || 0, token.liquidityUsd || 0),
      holders: token.holders ?? current.holders,
      volume24hUsd: Math.max(current.volume24hUsd, token.volume24hUsd),
      trades24h: Math.max(current.trades24h, token.trades24h),
      bondingProgress: Math.max(current.bondingProgress, token.bondingProgress),
    });
  }
  return Array.from(byAddress.values()).slice(0, 40);
}

function extractMigrationAddresses(payload) {
  const migrations = payload?.data?.EVM?.Migrations ?? [];
  const byToken = new Map();

  for (const event of migrations) {
    const txHash = event.Transaction?.Hash;
    const addresses = (event.Arguments ?? [])
      .map((argument) => normalizeAddress(argument.Value?.address))
      .filter((address) => address && !BASE_ASSETS.has(address));

    for (const address of addresses) {
      if (!byToken.has(address)) {
        byToken.set(address, {
          txHash,
          migratedAt: event.Block?.Time,
        });
      }
    }
  }

  return byToken;
}

function applyMigrationStatus(tokens, migrations) {
  if (!migrations.size) return tokens;

  return tokens.map((token) => {
    const migration = migrations.get(token.address);
    if (!migration) return token;
    return {
      ...token,
      status: 'graduated',
      bondingProgress: 100,
      migrationTx: normalizeHash(migration.txHash),
      createdAt: token.createdAt || migration.migratedAt || new Date().toISOString(),
    };
  });
}

function estimateChange(volumeUsd, trades) {
  if (!volumeUsd || !trades) return 0;
  const signal = Math.log10(Math.max(volumeUsd, 1)) * 4 + Math.min(trades, 120) * 0.08;
  return Number(Math.min(98, Math.max(-45, signal - 18)).toFixed(2));
}

function argMap(args = []) {
  return args.reduce((current, arg) => {
    const key = String(arg.Name || '').toLowerCase();
    const value = arg.Value?.string || arg.Value?.address || arg.Value?.bigInteger || arg.Value?.integer || arg.Value?.hex || arg.Value?.bool;
    if (key && value !== undefined) current[key] = String(value);
    return current;
  }, {});
}

function getTokenSide(trade) {
  const buy = trade.Trade?.Buy;
  const sell = trade.Trade?.Sell;
  const buyAddress = normalizeAddress(buy?.Currency?.SmartContract);
  const sellAddress = normalizeAddress(sell?.Currency?.SmartContract);
  if (buyAddress && !BASE_ASSETS.has(buyAddress)) return buy;
  if (sellAddress && !BASE_ASSETS.has(sellAddress)) return sell;
  return undefined;
}

function getTokenSideForAddress(trade, tokenAddress) {
  const address = normalizeAddress(tokenAddress);
  if (!address) return undefined;
  if (normalizeAddress(trade.Trade?.Buy?.Currency?.SmartContract) === address) return trade.Trade?.Buy;
  if (normalizeAddress(trade.Trade?.Sell?.Currency?.SmartContract) === address) return trade.Trade?.Sell;
  return undefined;
}

function usdAmount(side) {
  const amount = Number(side?.Amount || 0);
  const price = Number(side?.PriceInUSD || 0);
  return Number.isFinite(amount * price) ? amount * price : 0;
}

function normalizeAddress(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return /^0x[a-f0-9]{40}$/.test(text) ? text : undefined;
}

function normalizeHash(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return /^0x[a-f0-9]{64}$/.test(text) ? text : undefined;
}

function parseAddressList(value) {
  return String(value || '')
    .split(',')
    .map((item) => normalizeAddress(item.trim()))
    .filter(Boolean);
}

function extractBurnDashboard(payload) {
  const transfers = payload?.data?.EVM?.Transfers ?? [];
  const events = transfers.map((transfer) => {
    const receiver = normalizeAddress(transfer.Transfer?.Receiver);
    const type = ION_BURN_ADDRESSES.includes(receiver) ? 'burn' : 'treasury';
    const amountIon = Number(transfer.Transfer?.Amount || 0);
    const amountUsd = ION_PRICE_USD > 0 ? amountIon * ION_PRICE_USD : 0;
    return {
      id: transfer.Transaction?.Hash || `${receiver}-${transfer.Block?.Time}`,
      txHash: transfer.Transaction?.Hash,
      tokenAddress: normalizeAddress(transfer.Transfer?.Currency?.SmartContract) || ION_TOKEN_ADDRESS,
      tokenSymbol: safeSymbol(transfer.Transfer?.Currency?.Symbol || 'ION'),
      sender: normalizeAddress(transfer.Transfer?.Sender) || '0x0000000000000000000000000000000000000000',
      receiver: receiver || '0x0000000000000000000000000000000000000000',
      amountIon,
      amountUsd,
      timestamp: transfer.Block?.Time || new Date().toISOString(),
      blockNumber: Number(transfer.Block?.Number || 0),
      type,
    };
  }).filter((event) => event.txHash && event.amountIon > 0);

  const burnEvents = events.filter((event) => event.type === 'burn');
  const treasuryEvents = events.filter((event) => event.type === 'treasury');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const uniqueBurners = new Set(burnEvents.map((event) => event.sender)).size;
  const totalBurnedIon = burnEvents.reduce((sum, event) => sum + event.amountIon, 0);
  const totalBurnedUsd = burnEvents.reduce((sum, event) => sum + event.amountUsd, 0);
  const burned24h = burnEvents.filter((event) => now - new Date(event.timestamp).getTime() <= oneDay);
  const burned7d = burnEvents.filter((event) => now - new Date(event.timestamp).getTime() <= sevenDays);

  return {
    summary: {
      totalBurnedIon,
      totalBurnedUsd,
      burned24hIon: burned24h.reduce((sum, event) => sum + event.amountIon, 0),
      burned24hUsd: burned24h.reduce((sum, event) => sum + event.amountUsd, 0),
      burned7dIon: burned7d.reduce((sum, event) => sum + event.amountIon, 0),
      burned7dUsd: burned7d.reduce((sum, event) => sum + event.amountUsd, 0),
      burnTxCount: burnEvents.length,
      uniqueBurners,
      avgBurnIon: burnEvents.length ? totalBurnedIon / burnEvents.length : 0,
      largestBurnIon: burnEvents.reduce((max, event) => Math.max(max, event.amountIon), 0),
      treasuryIon: treasuryEvents.reduce((sum, event) => sum + event.amountIon, 0),
    },
    events,
    buckets: buildBurnBuckets(burnEvents),
  };
}

function buildBurnBuckets(events) {
  const byDay = new Map();
  for (const event of events) {
    const day = event.timestamp.slice(0, 10);
    const current = byDay.get(day) || { day, amountIon: 0, amountUsd: 0, count: 0 };
    current.amountIon += event.amountIon;
    current.amountUsd += event.amountUsd;
    current.count += 1;
    byDay.set(day, current);
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

function emptyBurnSummary() {
  return {
    totalBurnedIon: 0,
    totalBurnedUsd: 0,
    burned24hIon: 0,
    burned24hUsd: 0,
    burned7dIon: 0,
    burned7dUsd: 0,
    burnTxCount: 0,
    uniqueBurners: 0,
    avgBurnIon: 0,
    largestBurnIon: 0,
    treasuryIon: 0,
  };
}

function safeSymbol(value) {
  const text = safeText(value, 'ION').replace(/[^a-z0-9]/gi, '').toUpperCase();
  return text.slice(0, 12) || 'ION';
}

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : fallback;
}

function statusFromCreatedAt(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 3 * 60 * 60 * 1000) return 'new';
  return 'bonding';
}

function generatedImage(seed, address) {
  const hue = parseInt(String(address || seed).slice(2, 8), 16) % 360;
  const label = encodeURIComponent(safeSymbol(seed || 'ION').slice(0, 4));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <radialGradient id="g" cx="30%" cy="22%" r="80%">
          <stop offset="0%" stop-color="hsl(${hue}, 90%, 72%)"/>
          <stop offset="55%" stop-color="hsl(${(hue + 46) % 360}, 78%, 46%)"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#g)"/>
      <circle cx="470" cy="96" r="138" fill="rgba(255,255,255,.15)"/>
      <circle cx="116" cy="496" r="188" fill="rgba(0,0,0,.22)"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Inter,Arial,sans-serif" font-size="84" font-weight="800">${label}</text>
    </svg>
  `.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
