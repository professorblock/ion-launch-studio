import { z } from 'zod';
import { FOUR_MEME_PROXY_PATH } from '../config/app';

const nonceSchema = z.object({ nonce: z.string() });
const loginSchema = z.object({ accessToken: z.string() });
const prepareSchema = z.object({
  createArg: z.custom<`0x${string}`>((value) => typeof value === 'string' && /^0x[a-fA-F0-9]*$/.test(value)),
  signature: z.custom<`0x${string}`>((value) => typeof value === 'string' && /^0x[a-fA-F0-9]*$/.test(value)),
  imageUrl: z.string().url(),
});

export interface FourMemeTokenInput {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  x?: string;
  telegram?: string;
  imageDataUrl?: string;
}

export async function requestFourMemeNonce(accountAddress: string) {
  const payload = await fourMemeRequest({ operation: 'nonce', accountAddress });
  return nonceSchema.parse(payload).nonce;
}

export async function loginFourMeme(address: string, signature: string) {
  const payload = await fourMemeRequest({ operation: 'login', address, signature, walletName: 'Injected Wallet' });
  return loginSchema.parse(payload).accessToken;
}

export async function prepareFourMemeCreateToken(accessToken: string, token: FourMemeTokenInput) {
  const payload = await fourMemeRequest({
    operation: 'prepare-create-token',
    accessToken,
    imageDataUrl: token.imageDataUrl,
    token: {
      ...token,
      label: 'Meme',
      preSale: '0',
    },
  });
  return prepareSchema.parse(payload);
}

async function fourMemeRequest(body: unknown) {
  const response = await fetch(FOUR_MEME_PROXY_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Four.meme API unavailable');
  return payload;
}
