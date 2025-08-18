import type { UserlessZapRequest, Vault, Token } from './types';
import { ZERO_ADDRESS } from './utils';
import { ZAP_ROUTERS } from './zap';
import { BeefyZapRouterAbi } from './abi/BeefyZapRouterAbi';
import { createWalletClient, custom, http, type Address } from 'viem';
import { CHAIN_CONFIG } from './chains';

export async function executeOrderWithWallet(
  vault: Vault,
  request: UserlessZapRequest,
  expectedTokens: Token[],
  walletAddress: `0x${string}`
) {
  if (!window.ethereum) throw new Error('Wallet not found');
  const chain = CHAIN_CONFIG[vault.chainId];
  if (!chain) throw new Error(`Unsupported chain ${vault.chainId}`);
  const router = ZAP_ROUTERS[vault.chainId];
  if (!router) throw new Error(`No zap router for chain ${vault.chainId}`);

  const wallet = createWalletClient({ transport: custom(window.ethereum), chain: { ...chain, name: chain.name } as any });

  const order = {
    inputs: request.order.inputs
      .filter(i => BigInt(i.amount) > 0n)
      .map(i => ({ token: i.token as Address, amount: BigInt(i.amount) })),
    outputs: request.order.outputs.map(o => ({ token: o.token as Address, minOutputAmount: BigInt(o.minOutputAmount) })),
    relay: {
      target: request.order.relay.target as Address,
      value: BigInt(request.order.relay.value),
      data: request.order.relay.data as `0x${string}`,
    },
    user: walletAddress as Address,
    recipient: walletAddress as Address,
  };

  const steps = request.steps.map(s => ({
    target: s.target as Address,
    value: BigInt(s.value),
    data: s.data as `0x${string}`,
    tokens: s.tokens.map(t => ({ token: t.token as Address, index: t.index })),
  }));

  const nativeInput = order.inputs.find(i => i.token === (ZERO_ADDRESS as Address));

  return wallet.writeContract({
    address: router,
    abi: BeefyZapRouterAbi as any,
    functionName: 'executeOrder',
    args: [order, steps],
    value: nativeInput ? nativeInput.amount : undefined,
    account: walletAddress,
    // chain is set in client
  });
}


