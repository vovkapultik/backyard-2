import { CHAIN_CONFIG, getChainNumericId } from './chains';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export type NetworkInfo = {
  chainId: string; // Beefy chain ID (e.g. 'optimism')
  numericId: number; // Numeric chain ID (e.g. 10)
  name: string;
};

export async function getCurrentNetwork(): Promise<NetworkInfo | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const numericId = parseInt(chainIdHex, 16);
    
    // Find matching Beefy chain ID
    for (const [beefyChainId, config] of Object.entries(CHAIN_CONFIG)) {
      if (config.id === numericId) {
        return {
          chainId: beefyChainId,
          numericId,
          name: config.name,
        };
      }
    }
    
    return null; // Unsupported network
  } catch (error) {
    console.error('Failed to get current network:', error);
    return null;
  }
}

export async function switchToNetwork(beefyChainId: string): Promise<boolean> {
  if (!window.ethereum) {
    return false;
  }

  const config = CHAIN_CONFIG[beefyChainId];
  if (!config) {
    throw new Error(`Unsupported chain: ${beefyChainId}`);
  }

  try {
    const chainIdHex = `0x${config.id.toString(16)}`;
    
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    
    return true;
  } catch (error: any) {
    console.error('Failed to switch network:', error);
    
    // If the chain is not added to the wallet, we could add it here
    // For now, just return false
    return false;
  }
}

export function onNetworkChange(callback: (networkInfo: NetworkInfo | null) => void) {
  if (!window.ethereum) {
    return () => {}; // Return empty cleanup function
  }

  const handler = async () => {
    const network = await getCurrentNetwork();
    callback(network);
  };

  window.ethereum.on('chainChanged', handler);
  
  // Return cleanup function
  return () => {
    if (window.ethereum) {
      window.ethereum.removeListener('chainChanged', handler);
    }
  };
}
