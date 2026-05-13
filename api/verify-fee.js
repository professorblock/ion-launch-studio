import { Buffer } from 'node:buffer';

const DEFAULT_BSC_RPC_URL = 'https://bsc-dataseed.binance.org';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MAX_JSON_BODY_BYTES = 8_000;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const tokenAddress = normalizeAddress(process.env.ION_TOKEN_BSC_ADDRESS || process.env.VITE_ION_TOKEN_BSC_ADDRESS);
  const treasuryAddress = normalizeAddress(process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS);
  const tokenDecimals = parseDecimals(process.env.VITE_ION_TOKEN_DECIMALS || 18);
  const feeAmount = parseTokenUnits(process.env.VITE_PLATFORM_FEE_ION || '0', tokenDecimals);

  if (!tokenAddress || !treasuryAddress || feeAmount <= 0n) {
    response.status(503).json({ error: 'Fee verification is not configured' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request, MAX_JSON_BODY_BYTES);
  } catch {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }

  const txHash = normalizeHash(body?.txHash || body?.hash);
  if (!txHash) {
    response.status(400).json({ error: 'Invalid transaction hash' });
    return;
  }

  try {
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]);

    if (!receipt) {
      response.status(200).json({
        status: 'pending',
        valid: false,
        txHash,
      });
      return;
    }

    if (receipt.status !== '0x1') {
      response.status(200).json({
        status: 'reverted',
        valid: false,
        txHash,
        blockNumber: hexToDecimalString(receipt.blockNumber),
      });
      return;
    }

    const transfer = findFeeTransfer(receipt.logs || [], {
      tokenAddress,
      treasuryAddress,
      feeAmount,
    });

    if (!transfer) {
      response.status(200).json({
        status: 'confirmed',
        valid: false,
        reason: 'Expected ION treasury transfer was not found',
        txHash,
        blockNumber: hexToDecimalString(receipt.blockNumber),
      });
      return;
    }

    response.status(200).json({
      status: 'confirmed',
      valid: true,
      txHash,
      blockNumber: hexToDecimalString(receipt.blockNumber),
      transfer,
    });
  } catch {
    response.status(502).json({ error: 'Fee verification service unavailable' });
  }
}

async function rpc(method, params) {
  const upstream = await fetch(process.env.BSC_RPC_URL || DEFAULT_BSC_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || payload.error) throw new Error('RPC request failed');
  return payload.result;
}

function findFeeTransfer(logs, config) {
  const treasuryTopic = addressToTopic(config.treasuryAddress);

  for (const log of logs) {
    const logAddress = normalizeAddress(log.address);
    const topics = Array.isArray(log.topics) ? log.topics.map((topic) => String(topic).toLowerCase()) : [];
    if (logAddress !== config.tokenAddress) continue;
    if (topics[0] !== TRANSFER_TOPIC) continue;
    if (topics[2] !== treasuryTopic) continue;

    const amount = parseHexQuantity(log.data);
    if (amount < config.feeAmount) continue;

    return {
      from: topicToAddress(topics[1]),
      to: topicToAddress(topics[2]),
      amountRaw: amount.toString(),
      minimumExpectedRaw: config.feeAmount.toString(),
    };
  }

  return undefined;
}

async function readJsonBody(request, maxBytes = 8_000) {
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

function parseTokenUnits(value, decimals) {
  const text = String(value || '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return 0n;
  const [whole, fraction = ''] = text.split('.');
  const scale = 10n ** BigInt(decimals);
  const fractional = fraction.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole) * scale + BigInt(fractional || '0');
}

function parseDecimals(value) {
  const decimals = Number(value);
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18;
}

function parseHexQuantity(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) return 0n;
  return BigInt(value || '0x0');
}

function hexToDecimalString(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) return undefined;
  return BigInt(value).toString();
}

function addressToTopic(address) {
  return `0x${address.slice(2).padStart(64, '0')}`;
}

function topicToAddress(topic) {
  if (typeof topic !== 'string' || !/^0x[0-9a-f]{64}$/.test(topic)) return undefined;
  return `0x${topic.slice(26)}`;
}

function normalizeAddress(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return /^0x[a-f0-9]{40}$/.test(text) ? text : undefined;
}

function normalizeHash(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return /^0x[a-f0-9]{64}$/.test(text) ? text : undefined;
}
