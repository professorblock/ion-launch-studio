interface MetadataInput {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  x?: string;
  telegram?: string;
  imageDataUrl?: string;
}

interface MetadataResponse {
  status: 'pinned' | 'unconfigured';
  ipfsHash?: string;
  uri?: string;
  gatewayUrl?: string;
  imageUri?: string;
  imageGatewayUrl?: string;
}

export async function pinLaunchMetadata(input: MetadataInput): Promise<MetadataResponse> {
  const response = await fetch('/api/metadata', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error('Metadata service unavailable');
  return (await response.json()) as MetadataResponse;
}
