import type { Token, Vault } from './types';
import { ERC20_ABI } from './erc20';
import { CHAIN_CONFIG, getChainFromViem, getPublicClient } from './chains';
import { createWalletClient, custom, type Address } from 'viem';
import BigNumber from 'bignumber.js';
import { toWeiString, ZERO_ADDRESS } from './utils';

const STANDARD_VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }],
    outputs: [],
  },
] as const;

const ERC4626_VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export async function executeDirectDepositWithWallet(
  vault: Vault,
  depositToken: Token,
  amount: BigNumber,
  walletAddress: `0x${string}`
) {
  if (depositToken.address === ZERO_ADDRESS) {
    throw new Error('Direct deposit does not support native token');
  }
  const chain = CHAIN_CONFIG[vault.chainId];
  if (!chain) throw new Error(`Unsupported chain ${vault.chainId}`);
  const publicClient = getPublicClient(vault.chainId);
  if (!(window as any).ethereum) throw new Error('Wallet not found');

  const wallet = createWalletClient({
    transport: custom((window as any).ethereum),
    chain: getChainFromViem(chain.id),
  });

  const amountWei = BigInt(toWeiString(amount, depositToken.decimals));
  const spender = vault.contractAddress as Address;

  // Check allowance to the Vault
  const [decRaw, symRaw, currentAllowance] = await Promise.all([
    publicClient.readContract({
      address: depositToken.address as Address,
      abi: ERC20_ABI as any,
      functionName: 'decimals',
    } as any),
    publicClient.readContract({
      address: depositToken.address as Address,
      abi: ERC20_ABI as any,
      functionName: 'symbol',
    } as any),
    publicClient.readContract({
      address: depositToken.address as Address,
      abi: ERC20_ABI as any,
      functionName: 'allowance',
      args: [walletAddress as Address, spender],
    } as any),
  ]);
  const decimals = Number(decRaw as any);
  const symbol = String(symRaw as any);
  const allowanceBigInt = BigInt(currentAllowance as any);
  console.log('[Allowance Check]', {
    token: depositToken.address,
    symbol,
    decimals,
    spender,
    allowanceWei: allowanceBigInt.toString(),
    requiredWei: amountWei.toString(),
  });
  if (allowanceBigInt < amountWei) {
    const MAX_UINT256 = (1n << 256n) - 1n;
    const approvalHash = await wallet.writeContract({
      address: depositToken.address as Address,
      abi: ERC20_ABI as any,
      functionName: 'approve',
      args: [spender, MAX_UINT256],
      account: walletAddress,
    });
    console.log('[Approve Sent]', {
      token: depositToken.address,
      symbol,
      decimals,
      spender,
      approvedWei: MAX_UINT256.toString(),
      txHash: approvalHash,
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash as any });
    // Poll until allowance reflects the new value
    const delay = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms));
    let updated = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const postAllowance = await publicClient.readContract({
        address: depositToken.address as Address,
        abi: ERC20_ABI as any,
        functionName: 'allowance',
        args: [walletAddress as Address, spender],
      } as any);
      const postAllowanceBigInt = BigInt(postAllowance as any);
      if (postAllowanceBigInt >= amountWei) {
        console.log('[Allowance Updated]', {
          token: depositToken.address,
          symbol,
          decimals,
          spender,
          allowanceWei: postAllowanceBigInt.toString(),
          requiredWei: amountWei.toString(),
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

  // Execute deposit based on vault type
  if (vault.type === 'erc4626') {
    return wallet.writeContract({
      address: vault.contractAddress as Address,
      abi: ERC4626_VAULT_ABI as any,
      functionName: 'deposit',
      args: [amountWei, walletAddress],
      account: walletAddress,
    });
  }

  // standard vaults: use deposit(uint256)
  return wallet.writeContract({
    address: vault.contractAddress as Address,
    abi: STANDARD_VAULT_ABI as any,
    functionName: 'deposit',
    args: [amountWei],
    account: walletAddress,
  });
}
