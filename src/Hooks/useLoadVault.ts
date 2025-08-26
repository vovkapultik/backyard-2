import React, { useCallback, useState } from 'react';
import { fetchAllVaults } from '../lib/beefy';
import { Token, Vault } from '../lib/types';
import { readErc20Meta } from '../lib/erc20';
import { ZERO_ADDRESS } from '../lib/utils';

type THookProps = {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetBeforeLoadVault: () => void;
  setPercentageAmountByVaultsIdx: React.Dispatch<
    React.SetStateAction<number[]>
  >;
};

export function useLoadVault({
  setLoading,
  setError,
  resetBeforeLoadVault,
  setPercentageAmountByVaultsIdx,
}: THookProps) {
  const [vaultIdInput, setVaultIdInput] = useState('');
  const [vault, setVault] = useState<Vault[] | null>(null);
  const [depositTokens, setDepositTokens] = useState<Token[] | null>(null);

  const loadVault = useCallback(async () => {
    if (vault?.some(v => v.id === vaultIdInput)) {
      // Vault is already loaded
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching vaults...');
      const all = await fetchAllVaults();
      console.log(`Found ${all.length} vaults`);

      const v = all.find(v => v.id === vaultIdInput);
      if (!v) {
        // Show similar vault IDs to help user
        const similar = all
          .filter(vault => vault.id.includes(vaultIdInput.toLowerCase()))
          .slice(0, 5);
        const suggestions =
          similar.length > 0
            ? ` Similar vaults: ${similar.map(v => v.id).join(', ')}`
            : '';
        throw new Error(`Vault '${vaultIdInput}' not found.${suggestions}`);
      }

      console.log('Found vault:', v);

      if (v.type !== 'standard' && v.type !== 'erc4626') {
        throw new Error(
          `This demo supports standard/erc4626 only. Vault '${v.id}' is type '${v.type}'`
        );
      }
      setVault(prev => {
        if (!prev) return [v];
        return [...prev, v];
      });

      // resolve deposit token (treat zero address as native)
      console.log(
        'Resolving deposit token for address:',
        v.depositTokenAddress
      );
      if (v.depositTokenAddress === ZERO_ADDRESS) {
        setDepositTokens(prev => {
          if (!prev)
            return [
              {
                chainId: v.chainId,
                address: ZERO_ADDRESS,
                decimals: 18,
                symbol: 'NATIVE',
              },
            ];
          return [
            ...prev,
            {
              chainId: v.chainId,
              address: ZERO_ADDRESS,
              decimals: 18,
              symbol: 'NATIVE',
            },
          ];
        });
      } else {
        try {
          const meta = await readErc20Meta(v.chainId, v.depositTokenAddress);
          console.log('Token metadata:', meta);
          setDepositTokens(prev => {
            if (!prev) {
              return [
                {
                  chainId: v.chainId,
                  address: v.depositTokenAddress,
                  decimals: meta.decimals,
                  symbol: meta.symbol,
                },
              ];
            }
            return [
              ...prev,
              {
                chainId: v.chainId,
                address: v.depositTokenAddress,
                decimals: meta.decimals,
                symbol: meta.symbol,
              },
            ];
          });
        } catch (tokenError: any) {
          console.error('Failed to read token metadata:', tokenError);
          throw new Error(
            `Failed to read token metadata: ${tokenError.message}`
          );
        }
      }
      resetBeforeLoadVault();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vaultIdInput, vault]);

  const deleteVault = useCallback((idx: number) => {
    setVault(prev => {
      if (!prev) return null;
      return prev.filter((_, i) => i !== idx);
    });

    setDepositTokens(prev => {
      if (!prev) return null;
      return prev.filter((_, i) => i !== idx);
    });
    setPercentageAmountByVaultsIdx(prev => prev.filter((_, i) => i !== idx));
  }, []);

  return {
    vaultIdInput,
    setVaultIdInput,
    loadVault,
    vault,
    depositTokens,
    deleteVault,
  };
}
