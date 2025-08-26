import { FC, useCallback } from 'react';
import { Token, Vault } from '../../lib/types';
import { fetchZapSupport } from '../../lib/beefy';
import { getPublicClient } from '../../lib/chains';
import { ZERO_ADDRESS } from '../../lib/utils';
import { readErc20Balance, readErc20Meta } from '../../lib/erc20';

type Props = {
  account: `0x${string}` | null;
  networkMatches: boolean;
  loading: boolean;
  walletTokens: Token[];
  setWalletTokens: (tokens: Token[]) => void;
  connect: () => Promise<void>;
  vault: Vault | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

const Wallet: FC<Props> = ({
  account,
  networkMatches,
  loading,
  walletTokens,
  setWalletTokens,
  connect,
  vault,
  setLoading,
  setError,
}) => {
  const scanWalletTokens = useCallback(async () => {
    if (!vault || !account) return;
    setLoading(true);
    setError(null);
    try {
      const support = await fetchZapSupport();
      const perChain = support[vault.chainId] || {};
      const addresses = Object.keys(perChain).slice(0, 50) as `0x${string}`[]; // Limit to 50 for performance
      const out: Token[] = [];

      // Check native balance first
      try {
        const publicClient = getPublicClient(vault.chainId);
        const bal = await publicClient.getBalance({ address: account });
        console.log(`Native balance for ${account}: ${bal}`);
        if (bal > 0n)
          out.push({
            chainId: vault.chainId,
            address: ZERO_ADDRESS,
            decimals: 18,
            symbol: 'NATIVE',
            balance: bal,
          });
      } catch {
        console.log(
          `Failed scan wallet tokens to get native balance for ${account}`
        );
      }

      // Check ERC20 tokens in batches
      for (let i = 0; i < addresses.length; i += 10) {
        const batch = addresses.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(async addr => {
            const meta = await readErc20Meta(vault.chainId, addr);
            const bal = await readErc20Balance(vault.chainId, addr, account);
            if (bal > 0n) {
              return {
                chainId: vault.chainId,
                address: addr,
                decimals: meta.decimals,
                symbol: meta.symbol,
                balance: bal,
              };
            }
            return null;
          })
        );
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value) {
            out.push(r.value);
          }
        });
      }

      setWalletTokens(out);
      //   setWalletTokens([
      //     {
      //       chainId: '1',
      //       address: `0x0000000000000000000000000000000000000000`,
      //       decimals: 18,
      //       symbol: 'ETH',
      //       balance: 3000000000000000000n,
      //     },
      //   ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vault, account]);

  return (
    <div
      style={{
        background: '#f0fdf4',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>
        Step 2: Connect Wallet & Scan Tokens
      </h3>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}>
        <button
          style={{
            padding: '8px 16px',
            background: account ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: !!account ? 'not-allowed' : 'pointer',
            opacity: !networkMatches && account ? 0.5 : 1,
          }}
          onClick={connect}
          disabled={!!account}>
          {account ? 'Connected' : 'Connect Wallet'}
        </button>
        {account && (
          <span style={{ fontSize: 14, color: '#6b7280' }}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        )}
      </div>
      <button
        style={{
          padding: '8px 16px',
          background: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          opacity: !networkMatches || !account || loading ? 0.5 : 1,
        }}
        onClick={scanWalletTokens}
        disabled={!account || loading || !networkMatches}>
        {loading ? 'Scanning...' : 'Scan Wallet Tokens'}
      </button>
      {!networkMatches && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: '#ef4444',
            fontStyle: 'italic',
          }}>
          Please switch network, all vaults must be on the same network
        </div>
      )}
      {walletTokens.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 14, color: '#374151' }}>
          Found {walletTokens.length} tokens with balance
        </div>
      )}
    </div>
  );
};

export default Wallet;
