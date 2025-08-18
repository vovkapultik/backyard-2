import BigNumber from 'bignumber.js';
import type { BuiltDepositStep, QuoteResponse, Token, UserlessZapRequest, Vault, ZapStep } from './types';
import { slipBy, toWeiString, ZERO_ADDRESS } from './utils';
import { getPublicClient } from './chains';
import { encodeFunctionData } from 'viem';

const STANDARD_VAULT_ABI = [
  { type: 'function', name: 'getPricePerFullShare', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export async function fetchVaultDepositZap(
  vault: Vault,
  depositToken: Token,
  inputAmount: BigNumber
): Promise<{ outputs: { token: Token; amount: BigNumber }[]; zap: ZapStep }> {
  const pc = getPublicClient(vault.chainId);
  const ppfsRaw = await pc.readContract({
    address: vault.contractAddress,
    abi: STANDARD_VAULT_ABI,
    functionName: 'getPricePerFullShare',
  });
  const ppfs = new BigNumber((ppfsRaw as any).toString());
  // shares = (amount * 1e{sharesDecimals}) / ppfs
  const sharesDecimals = 18; // Beefy shares are 18
  const inputWei = new BigNumber(toWeiString(inputAmount, depositToken.decimals));
  const expectedShares = inputWei.shiftedBy(sharesDecimals).dividedToIntegerBy(ppfs);
  const outputs = [{ token: { ...depositToken, address: vault.contractAddress }, amount: expectedShares.shiftedBy(-sharesDecimals) }];

  const isNative = depositToken.address === ZERO_ADDRESS;
  const zap: ZapStep = isNative
    ? {
        target: vault.contractAddress,
        value: toWeiString(inputAmount, depositToken.decimals),
        data: encodeFunctionData({
          abi: [
            {
              constant: false,
              inputs: [],
              name: 'depositBNB',
              outputs: [],
              payable: true,
              stateMutability: 'payable',
              type: 'function',
            },
          ] as const,
        }),
        tokens: [{ token: ZERO_ADDRESS, index: -1 }],
      }
    : {
        target: vault.contractAddress,
        value: '0',
        data: encodeFunctionData({
          abi: [
            {
              constant: false,
              inputs: [],
              name: 'depositAll',
              outputs: [],
              payable: false,
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ] as const,
        }),
        tokens: [{ token: depositToken.address, index: -1 }],
      };

  return { outputs, zap };
}

export async function buildDepositStep(
  vault: Vault,
  bestQuote: QuoteResponse,
  depositToken: Token,
  slippage: number,
  fromAddress?: `0x${string}`
): Promise<BuiltDepositStep> {
  // 1) Swap tx (use zap router as from address to match original app)
  const { fetchSwapOneInch } = await import('./aggregators/oneInch');
  const { ZAP_ROUTERS } = await import('./zap');
  const router = ZAP_ROUTERS[vault.chainId];
  if (!router) throw new Error(`No zap router configured for chain ${vault.chainId}`);
  const swap = await fetchSwapOneInch(bestQuote, router, slippage);

  // 2) Vault deposit step (min expected after slippage on add-liquidity)
  const minOutForVault = slipBy(swap.toAmount, slippage, depositToken.decimals);
  const vaultDeposit = await fetchVaultDepositZap(vault, depositToken, minOutForVault);

  // 3) Steps array
  const steps: ZapStep[] = [
    {
      target: swap.tx.toAddress,
      value: swap.tx.value,
      data: swap.tx.data,
      tokens: [{ token: bestQuote.fromToken.address, index: -1 }],
    },
    vaultDeposit.zap,
  ];

  // 4) Order inputs/outputs
  const inputs = [
    {
      token: bestQuote.fromToken.address,
      amount: toWeiString(bestQuote.fromAmount, bestQuote.fromToken.decimals),
    },
  ];
  const requiredOutputs = vaultDeposit.outputs.map(o => ({
    token: vault.contractAddress,
    minOutputAmount: toWeiString(slipBy(o.amount, slippage, 18), 18),
  }));
  const dustOutputs = [
    { token: bestQuote.fromToken.address, minOutputAmount: '0' },
    { token: bestQuote.toToken.address, minOutputAmount: '0' },
  ];
  const outputs = [...requiredOutputs, ...dustOutputs].filter(
    (v, i, a) => a.findIndex(x => x.token.toLowerCase() === v.token.toLowerCase()) === i
  );

  const zapRequest: UserlessZapRequest = {
    order: {
      inputs,
      outputs,
      relay: { target: ZERO_ADDRESS, value: '0', data: '0x' },
    },
    steps,
  };

  const expectedTokens: Token[] = [{ ...depositToken, address: vault.contractAddress }];

  return { swap, vaultDeposit, zapRequest, expectedTokens };
}
