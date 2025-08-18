import { createPublicClient, http } from 'viem';

export const CHAIN_CONFIG: Record<
  string,
  { id: number; rpc: string; name: string }
> = {
  ethereum: { id: 1, rpc: 'https://ethereum.publicnode.com', name: 'ethereum' },
  bsc: { id: 56, rpc: 'https://bsc.publicnode.com', name: 'bsc' },
  polygon: { id: 137, rpc: 'https://polygon.publicnode.com', name: 'polygon' },
  arbitrum: { id: 42161, rpc: 'https://arbitrum.publicnode.com', name: 'arbitrum' },
  optimism: { id: 10, rpc: 'https://optimism.publicnode.com', name: 'optimism' },
  avalanche: { id: 43114, rpc: 'https://avalanche.publicnode.com', name: 'avalanche' },
  fantom: { id: 250, rpc: 'https://fantom.publicnode.com', name: 'fantom' },
  base: { id: 8453, rpc: 'https://base.publicnode.com', name: 'base' },
};

export function getPublicClient(beefyChainId: string) {
  const c = CHAIN_CONFIG[beefyChainId];
  if (!c) throw new Error(`Unsupported chain ${beefyChainId}`);
  return createPublicClient({ transport: http(c.rpc) });
}

export function getChainNumericId(beefyChainId: string) {
  const c = CHAIN_CONFIG[beefyChainId];
  if (!c) throw new Error(`Unsupported chain ${beefyChainId}`);
  return c.id;
}
