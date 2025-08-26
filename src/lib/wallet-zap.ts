import type { UserlessZapRequest, Vault, Token } from './types';
import { ZERO_ADDRESS } from './utils';
import { ZAP_ROUTERS, TOKEN_MANAGERS } from './zap';
import { BeefyZapRouterAbi } from './abi/BeefyZapRouterAbi';
import { createWalletClient, custom, http, type Address } from 'viem';
import { ERC20_ABI } from './erc20';
import { CHAIN_CONFIG, getChainFromViem, getPublicClient } from './chains';

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
  const spender = TOKEN_MANAGERS[vault.chainId] || router;

  const wallet = createWalletClient({
    transport: custom(window.ethereum),
    chain: getChainFromViem(chain.id),
  });

  const order = {
    inputs: request.order.inputs
      .filter(i => BigInt(i.amount) > 0n)
      .map(i => ({ token: i.token as Address, amount: BigInt(i.amount) })),
    outputs: request.order.outputs.map(o => ({
      token: o.token as Address,
      minOutputAmount: BigInt(o.minOutputAmount),
    })),
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

  const nativeInput = order.inputs.find(
    i => i.token === (ZERO_ADDRESS as Address)
  );

  // For ERC-20 inputs, ensure allowance to router is sufficient; if not, request approval
  const erc20Inputs = order.inputs.filter(
    i => i.token !== (ZERO_ADDRESS as Address)
  );
  if (erc20Inputs.length > 0) {
    const publicClient = getPublicClient(vault.chainId);
    const delay = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms));
    for (const input of erc20Inputs) {
      // Read token metadata for logging (decimals/symbol)
      const [decRaw, symRaw] = await Promise.all([
        publicClient.readContract({
          address: input.token as Address,
          abi: ERC20_ABI as any,
          functionName: 'decimals',
        } as any),
        publicClient.readContract({
          address: input.token as Address,
          abi: ERC20_ABI as any,
          functionName: 'symbol',
        } as any),
      ]);
      const decimals = Number(decRaw as any);
      const symbol = String(symRaw as any);

      const currentAllowance = await publicClient.readContract({
        address: input.token as Address,
        abi: ERC20_ABI as any,
        functionName: 'allowance',
        args: [walletAddress as Address, spender as Address],
      } as any);

      const allowanceBigInt = BigInt(currentAllowance as any);
      // input.amount is expected to already be in wei (scaled by 10**decimals) via toWeiString during build
      console.log('[Allowance Check]', {
        token: input.token,
        symbol,
        decimals,
        spender,
        allowanceWei: allowanceBigInt.toString(),
        requiredWei: input.amount.toString(),
      });
      if (allowanceBigInt < input.amount) {
        // Approve max uint256 to avoid repeated approvals
        const MAX_UINT256 = (1n << 256n) - 1n;
        const approvalHash = await wallet.writeContract({
          address: input.token as Address,
          abi: ERC20_ABI as any,
          functionName: 'approve',
          args: [spender as Address, MAX_UINT256],
          account: walletAddress,
        });
        console.log('[Approve Sent]', {
          token: input.token,
          symbol,
          decimals,
          spender,
          approvedWei: MAX_UINT256.toString(),
          txHash: approvalHash,
        });

        // Wait for the approval tx to be mined
        await publicClient.waitForTransactionReceipt({
          hash: approvalHash as any,
        });

        // Poll until allowance reflects the new value
        let updated = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          const postAllowance = await publicClient.readContract({
            address: input.token as Address,
            abi: ERC20_ABI as any,
            functionName: 'allowance',
            args: [walletAddress as Address, spender as Address],
          } as any);
          const postAllowanceBigInt = BigInt(postAllowance as any);
          if (postAllowanceBigInt >= input.amount) {
            console.log('[Allowance Updated]', {
              token: input.token,
              symbol,
              decimals,
              spender,
              allowanceWei: postAllowanceBigInt.toString(),
              requiredWei: input.amount.toString(),
              attempts: attempt + 1,
            });
            updated = true;
            break;
          }
          await delay(1000);
        }
        if (!updated) {
          throw new Error(
            'Approval transaction mined but allowance not updated yet. Please retry.'
          );
        }
      }
    }
  }

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
