import { Buffer } from 'node:buffer';

/* global Blob, FormData, URL */

const FOUR_MEME_API = 'https://four.meme/meme-api';
const MAX_JSON_BODY_BYTES = 2_400_000;
const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const LABELS = new Set(['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others']);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request, MAX_JSON_BODY_BYTES);
  } catch {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }

  try {
    if (body.operation === 'nonce') {
      const accountAddress = normalizeAddress(body.accountAddress);
      if (!accountAddress) return response.status(400).json({ error: 'Invalid wallet address' });
      const payload = await fourMeme('/v1/private/user/nonce/generate', {
        accountAddress,
        verifyType: 'LOGIN',
        networkCode: 'BSC',
      });
      response.status(200).json({ nonce: payload.data });
      return;
    }

    if (body.operation === 'login') {
      const address = normalizeAddress(body.address);
      const signature = typeof body.signature === 'string' ? body.signature : '';
      if (!address || !signature) return response.status(400).json({ error: 'Invalid login payload' });
      const payload = await fourMeme('/v1/private/user/login/dex', {
        region: 'WEB',
        langType: 'EN',
        loginIp: '',
        inviteCode: '',
        verifyInfo: {
          address,
          networkCode: 'BSC',
          signature,
          verifyType: 'LOGIN',
        },
        walletName: safeText(body.walletName, 'Injected Wallet', 60),
      });
      response.status(200).json({ accessToken: payload.data });
      return;
    }

    if (body.operation === 'prepare-create-token') {
      const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
      if (!accessToken) return response.status(401).json({ error: 'Four.meme login required' });

      const token = normalizeCreateToken(body.token);
      if (!token) return response.status(400).json({ error: 'Invalid token profile' });

      const imageUrl = await uploadImage(accessToken, body.imageDataUrl, token.symbol);
      const raisedToken = await getBnbRaisedToken();
      const raisedAmount = safeNumericString(raisedToken.totalBAmount);
      if (!raisedAmount) throw new Error('Four.meme BNB launch amount unavailable');
      const createPayload = await fourMeme('/v1/private/token/create', {
        name: token.name,
        symbol: token.symbol,
        shortName: token.symbol,
        desc: token.description,
        imgUrl: imageUrl,
        launchTime: Date.now(),
        label: token.label,
        lpTradingFee: 0.0025,
        webUrl: token.website || '',
        twitterUrl: token.x || '',
        telegramUrl: token.telegram || '',
        preSale: token.preSale,
        raisedAmount,
        onlyMPC: false,
        feePlan: false,
        raisedToken,
      }, {
        'meme-web-access': accessToken,
      });

      response.status(200).json({
        createArg: createPayload.data?.createArg,
        signature: createPayload.data?.signature,
        imageUrl,
      });
      return;
    }

    response.status(400).json({ error: 'Unsupported Four.meme operation' });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : 'Four.meme API unavailable' });
  }
}

async function uploadImage(accessToken, imageDataUrl, symbol) {
  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) throw new Error('Four.meme image upload requires PNG, JPG, WebP, or GIF under 1.5 MB');

  const form = new FormData();
  form.append('file', new Blob([parsed.bytes], { type: parsed.mimeType }), `ion-launch-${symbol.toLowerCase()}.${extensionForMime(parsed.mimeType)}`);

  const upstream = await fetch(`${FOUR_MEME_API}/v1/private/token/upload`, {
    method: 'POST',
    headers: {
      'meme-web-access': accessToken,
    },
    body: form,
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || String(payload.code) !== '0' || !payload.data) {
    throw new Error(payload.msg || 'Four.meme image upload failed');
  }
  return payload.data;
}

async function getBnbRaisedToken() {
  const upstream = await fetch(`${FOUR_MEME_API}/v1/public/config`);
  const payload = await upstream.json().catch(() => ({}));
  const configs = Array.isArray(payload.data) ? payload.data : [];
  const bnb = configs.find((item) => item?.symbol === 'BNB' && item?.networkCode === 'BSC' && item?.status === 'PUBLISH');
  if (!bnb) throw new Error('Four.meme BNB launch config unavailable');
  return bnb;
}

async function fourMeme(path, payload, headers = {}) {
  const upstream = await fetch(`${FOUR_MEME_API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok || String(data.code) !== '0') {
    throw new Error(data.msg || `Four.meme request failed: ${upstream.status}`);
  }
  return data;
}

async function readJsonBody(request, maxBytes) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
    if (Buffer.byteLength(request.body) > maxBytes) throw new Error('Request body too large');
    return JSON.parse(String(request.body || '{}'));
  }
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

function normalizeCreateToken(value) {
  if (!value || typeof value !== 'object') return undefined;
  const name = safeText(value.name, '', 80);
  const symbol = safeSymbol(value.symbol);
  const description = safeText(value.description, '', 500);
  if (name.length < 2 || symbol.length < 2 || description.length < 20) return undefined;
  return {
    name,
    symbol,
    description,
    label: LABELS.has(value.label) ? value.label : 'Meme',
    website: safeUrl(value.website),
    x: safeUrl(value.x),
    telegram: safeUrl(value.telegram),
    preSale: /^\d+(\.\d+)?$/.test(String(value.preSale || '0')) ? String(value.preSale || '0') : '0',
  };
}

function parseDataUrl(value) {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return undefined;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return undefined;
  return { mimeType, bytes };
}

function extensionForMime(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'png';
}

function safeText(value, fallback = '', max = 120) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function safeSymbol(value) {
  return safeText(value, '', 12).replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function safeNumericString(value) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return /^\d+(\.\d+)?$/.test(text) ? text : '';
}

function safeUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeAddress(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return /^0x[a-f0-9]{40}$/.test(text) ? text : undefined;
}
