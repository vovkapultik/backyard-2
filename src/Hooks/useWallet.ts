import { useCallback, useEffect, useState } from 'react';
import {
  getCurrentNetwork,
  NetworkInfo,
  onNetworkChange,
  switchToNetwork,
} from '../lib/wallet';
import { Vault } from '../lib/types';

type TWalletType = {
  setError: (error: string | null) => void;
  vault: Vault[] | null;
};

export function useWallet({ setError, vault }: TWalletType) {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo | null>(
    null
  );
  const [networkSwitching, setNetworkSwitching] = useState(false);

  const connect = useCallback(async () => {
    if (!(window as any).ethereum) throw new Error('No wallet');
    const [addr] = await (window as any).ethereum.request({
      method: 'eth_requestAccounts',
    });
    setAccount(addr);
  }, []);

  // Initialize and track network changes
  useEffect(() => {
    if ((window as any).ethereum._state.isConnected) {
      setAccount((window as any).ethereum._state.accounts[0]);
    }

    let cleanup: (() => void) | undefined;

    const initNetwork = async () => {
      const network = await getCurrentNetwork();
      setCurrentNetwork(network);

      // Set up network change listener
      cleanup = onNetworkChange(newNetwork => {
        setCurrentNetwork(newNetwork);
      });
    };

    initNetwork();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleSwitchNetwork = useCallback(
    async (idx: number) => {
      if (!vault) return;

      setNetworkSwitching(true);
      try {
        const success = await switchToNetwork(vault[idx].chainId);
        if (!success) {
          setError(
            `Failed to switch to ${vault[idx].chainId} network. Please switch manually in your wallet.`
          );
        }
      } catch (err: any) {
        setError(`Network switch failed: ${err.message}`);
      } finally {
        setNetworkSwitching(false);
      }
    },
    [vault]
  );

  return {
    account,
    connect,
    currentNetwork,
    networkSwitching,
    handleSwitchNetwork,
  };
}
