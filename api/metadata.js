/* global Blob, FormData */
import { Buffer } from 'node:buffer';

const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    response.status(200).json({ status: 'unconfigured' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const metadata = normalizeMetadata(body);

    if (!metadata) {
      response.status(400).json({ error: 'Invalid metadata' });
      return;
    }

    let imageResult;
    if (body?.imageDataUrl) {
      imageResult = await pinImageDataUrl(jwt, body.imageDataUrl, metadata.symbol);
      metadata.image = imageResult.uri;
      metadata.properties.image_gateway_url = imageResult.gatewayUrl;
    }

    const upstream = await fetch(PINATA_JSON_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `ion-launch-${metadata.symbol.toLowerCase()}`,
        },
      }),
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !payload.IpfsHash) {
      response.status(502).json({ error: 'Metadata pinning failed' });
      return;
    }

    response.status(200).json({
      status: 'pinned',
      ipfsHash: payload.IpfsHash,
      uri: `ipfs://${payload.IpfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${payload.IpfsHash}`,
      imageUri: imageResult?.uri,
      imageGatewayUrl: imageResult?.gatewayUrl,
    });
  } catch (error) {
    if (error instanceof MetadataError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    response.status(502).json({ error: 'Metadata service unavailable' });
  }
}

async function pinImageDataUrl(jwt, imageDataUrl, symbol) {
  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) throw new MetadataError(400, 'Invalid image');

  const form = new FormData();
  form.append('file', new Blob([parsed.bytes], { type: parsed.mimeType }), `ion-launch-${symbol.toLowerCase()}.${extensionForMime(parsed.mimeType)}`);
  form.append('pinataMetadata', JSON.stringify({ name: `ion-launch-${symbol.toLowerCase()}-image` }));

  const upstream = await fetch(PINATA_FILE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
    },
    body: form,
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !payload.IpfsHash) {
    throw new MetadataError(502, 'Image pinning failed');
  }

  return {
    uri: `ipfs://${payload.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${payload.IpfsHash}`,
  };
}

class MetadataError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeMetadata(body) {
  const name = safeText(body?.name, 80);
  const symbol = safeSymbol(body?.symbol);
  const description = safeText(body?.description, 500);
  if (!name || !symbol || !description) return undefined;

  const links = {
    website: safeUrl(body?.website),
    x: safeUrl(body?.x),
    telegram: safeUrl(body?.telegram),
  };

  return {
    name,
    symbol,
    description,
    image: safeUrl(body?.image) || undefined,
    external_url: links.website,
    attributes: [
      { trait_type: 'Platform', value: 'ION Launch' },
      { trait_type: 'Network', value: 'BNB Chain' },
    ],
    properties: {
      links,
    },
  };
}

function safeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeSymbol(value) {
  return safeText(value, 12).replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function safeUrl(value) {
  const text = safeText(value, 240);
  if (!text) return undefined;
  try {
    const url = new globalThis.URL(text.startsWith('http://') || text.startsWith('https://') ? text : `https://${text}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function parseDataUrl(value) {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i);
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
  return 'png';
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
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
