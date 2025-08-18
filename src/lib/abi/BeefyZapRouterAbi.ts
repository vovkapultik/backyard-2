export const BeefyZapRouterAbi = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            internalType: 'struct IBeefyZapRouter.Input[]',
            name: 'inputs',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'minOutputAmount', type: 'uint256' },
            ],
            internalType: 'struct IBeefyZapRouter.Output[]',
            name: 'outputs',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'target', type: 'address' },
              { internalType: 'uint256', name: 'value', type: 'uint256' },
              { internalType: 'bytes', name: 'data', type: 'bytes' },
            ],
            internalType: 'struct IBeefyZapRouter.Relay',
            name: 'relay',
            type: 'tuple',
          },
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
        ],
        internalType: 'struct IBeefyZapRouter.Order',
        name: '_order',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          {
            components: [
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'int32', name: 'index', type: 'int32' },
            ],
            internalType: 'struct IBeefyZapRouter.StepToken[]',
            name: 'tokens',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct IBeefyZapRouter.Step[]',
        name: '_route',
        type: 'tuple[]',
      },
    ],
    name: 'executeOrder',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];


