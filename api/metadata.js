const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

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
    });
  } catch {
    response.status(502).json({ error: 'Metadata service unavailable' });
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
