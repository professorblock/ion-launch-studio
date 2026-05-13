export const fourMemeHelperAbi = [
  {
    type: 'function',
    name: 'tryBuy',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'funds', type: 'uint256' },
    ],
    outputs: [
      { name: 'tokenManager', type: 'address' },
      { name: 'quote', type: 'address' },
      { name: 'estimatedAmount', type: 'uint256' },
      { name: 'estimatedCost', type: 'uint256' },
      { name: 'estimatedFee', type: 'uint256' },
      { name: 'amountMsgValue', type: 'uint256' },
      { name: 'amountApproval', type: 'uint256' },
      { name: 'amountFunds', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'trySell',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'tokenManager', type: 'address' },
      { name: 'quote', type: 'address' },
      { name: 'funds', type: 'uint256' },
      { name: 'fee', type: 'uint256' },
    ],
  },
] as const;

export const fourMemeTokenManagerAbi = [
  {
    type: 'function',
    name: 'createToken',
    stateMutability: 'payable',
    inputs: [
      { name: 'args', type: 'bytes' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: '_launchFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'buyTokenAMAP',
    stateMutability: 'payable',
    inputs: [
      { name: 'origin', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'funds', type: 'uint256' },
      { name: 'minAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'sellToken',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'origin', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minFunds', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
