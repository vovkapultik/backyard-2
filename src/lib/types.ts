export type ChainId = string;

export type ApiVault = {
  id: string;
  network: ChainId;
  earnContractAddress: `0x${string}`;
  tokenAddress: `0x${string}` | 'native';
  type: 'standard' | 'erc4626' | string;
};

export type Vault = {
  id: string;
  chainId: ChainId;
  contractAddress: `0x${string}`;
  depositTokenAddress: `0x${string}`;
  type: 'standard' | 'erc4626' | string;
};

export type Token = {
  chainId: ChainId;
  address: `0x${string}`;
  decimals: number;
  symbol: string;
  balance?: bigint; // Raw balance in wei
};

export type QuoteRequest = {
  vault: Vault;
  fromToken: Token;
  fromAmount: import('bignumber.js').default;
  toToken: Token; // vault deposit token
};

export type QuoteResponse = {
  providerId: string;
  fromToken: Token;
  fromAmount: import('bignumber.js').default;
  toToken: Token;
  toAmount: import('bignumber.js').default;
  feeBps?: number;
};

export type SwapTx = {
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  data: `0x${string}`;
  value: string; // wei string
  inputPosition: number; // -1 if not used
};

export type SwapResponse = QuoteResponse & {
  toAmountMin: import('bignumber.js').default;
  tx: SwapTx;
};

export type OrderInput = { token: `0x${string}`; amount: string };
export type OrderOutput = { token: `0x${string}`; minOutputAmount: string };

export type ZapStep = {
  target: `0x${string}`;
  value: string;
  data: `0x${string}`;
  tokens: { token: `0x${string}`; index: number }[];
};

export type UserlessZapRequest = {
  order: {
    inputs: OrderInput[];
    outputs: OrderOutput[];
    relay: { target: `0x${string}`; value: string; data: `0x${string}` };
  };
  steps: ZapStep[];
};

export type BuiltDepositStep = {
  swap: SwapResponse;
  vaultDeposit: {
    outputs: { token: Token; amount: import('bignumber.js').default }[];
    zap: ZapStep;
  };
  zapRequest: UserlessZapRequest;
  expectedTokens: Token[];
};
