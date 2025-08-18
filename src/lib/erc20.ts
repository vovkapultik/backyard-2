import { getPublicClient } from './chains';
import type { Token } from './types';

export const ERC20_ABI = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' }
  ], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ], outputs: [{ type: 'bool' }] },
] as const;

export async function readErc20Meta(chainId: string, address: `0x${string}`) {
  const pc = getPublicClient(chainId);
  const [decimals, symbol] = await Promise.all([
    pc.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
    pc.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
  ]);
  return { decimals: Number(decimals), symbol: String(symbol) };
}

export async function readErc20Balance(chainId: string, address: `0x${string}`, owner: `0x${string}`) {
  const pc = getPublicClient(chainId);
  const bal = await pc.readContract({ address, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] });
  return BigInt(bal as any);
}
