import { z } from 'zod';

const verifiedTransferSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  amountRaw: z.string(),
  minimumExpectedRaw: z.string(),
}).optional();

const feeVerificationSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'reverted']),
  valid: z.boolean(),
  txHash: z.string().optional(),
  reason: z.string().optional(),
  blockNumber: z.string().optional(),
  transfer: verifiedTransferSchema,
});

export type FeeVerificationResult = z.infer<typeof feeVerificationSchema>;

export async function verifyFeeTransaction(txHash: string): Promise<FeeVerificationResult> {
  const response = await fetch('/api/verify-fee', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ txHash }),
  });

  if (!response.ok) throw new Error('Fee verification service unavailable');
  return feeVerificationSchema.parse(await response.json());
}
