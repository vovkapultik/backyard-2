import type { ApiVault, Vault } from './types';
import { ZERO_ADDRESS } from './utils';

const API = import.meta.env.VITE_API_URL || 'https://api.beefy.finance';

export async function fetchAllVaults(): Promise<Vault[]> {
  const res = await fetch(`${API}/vaults`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch vaults');
  const apiVaults = (await res.json()) as ApiVault[];
  
  // Transform API format to our internal format
  return apiVaults.map(vault => ({
    id: vault.id,
    chainId: vault.network,
    contractAddress: vault.earnContractAddress,
    depositTokenAddress: vault.tokenAddress === 'native' ? ZERO_ADDRESS : vault.tokenAddress,
    type: vault.type,
  }));
}

export async function fetchZapSupport(): Promise<Record<string, Record<string, Record<string, boolean>>>> {
  const res = await fetch(`${API}/zap/swaps`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch zap support');
  const data = await res.json();
  // normalize harmony/one if present skipped here
  return data;
}
