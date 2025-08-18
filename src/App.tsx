import { useCallback, useMemo, useState, useEffect } from 'react';
import BigNumber from 'bignumber.js';
import { fetchAllVaults, fetchZapSupport } from './lib/beefy';
import { getPublicClient } from './lib/chains';
import { readErc20Meta, readErc20Balance } from './lib/erc20';
import { getCurrentNetwork, switchToNetwork, onNetworkChange, type NetworkInfo } from './lib/wallet';
import { ZERO_ADDRESS } from './lib/utils';
import type { Token, Vault } from './lib/types';
import { fetchDepositQuote } from './lib/quote';
import { buildDepositStep } from './lib/step';
import { executeOrderWithWallet } from './lib/wallet-zap';
import { executeDirectDepositWithWallet } from './lib/wallet-direct';

function useWallet() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const connect = useCallback(async () => {
    if (!(window as any).ethereum) throw new Error('No wallet');
    const [addr] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(addr);
  }, []);
  return { account, connect };
}

export default function App() {
  const [vaultIdInput, setVaultIdInput] = useState('');
  const [vault, setVault] = useState<Vault | null>(null);
  const [depositToken, setDepositToken] = useState<Token | null>(null);
  const [walletTokens, setWalletTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('0');
  const [percentage, setPercentage] = useState(0); // 0-100
  const [slippage, setSlippage] = useState(0.01);
  const [quote, setQuote] = useState<any>(null);
  const [built, setBuilt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo | null>(null);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const { account, connect } = useWallet();

  const networkMatches = !vault || !currentNetwork || currentNetwork.chainId === vault.chainId;
  const canQuote = vault && depositToken && selectedToken && new BigNumber(amount).gt(0) && networkMatches;

  // Balance and percentage calculations
  const selectedTokenBalance = useMemo(() => {
    if (!selectedToken?.balance) return new BigNumber(0);
    return new BigNumber(selectedToken.balance.toString()).shiftedBy(-selectedToken.decimals);
  }, [selectedToken]);

  const handlePercentageChange = useCallback((newPercentage: number) => {
    setPercentage(newPercentage);
    if (selectedToken?.balance) {
      const balance = new BigNumber(selectedToken.balance.toString()).shiftedBy(-selectedToken.decimals);
      const newAmount = balance.multipliedBy(newPercentage / 100);
      setAmount(newAmount.toString());
    }
  }, [selectedToken]);

  const handleAmountChange = useCallback((newAmount: string) => {
    setAmount(newAmount);
    if (selectedToken?.balance && new BigNumber(newAmount).gt(0)) {
      const balance = new BigNumber(selectedToken.balance.toString()).shiftedBy(-selectedToken.decimals);
      const newPercentage = new BigNumber(newAmount).dividedBy(balance).multipliedBy(100);
      setPercentage(Math.min(100, Math.max(0, newPercentage.toNumber())));
    } else {
      setPercentage(0);
    }
  }, [selectedToken]);

  // Initialize and track network changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const initNetwork = async () => {
      const network = await getCurrentNetwork();
      setCurrentNetwork(network);
      
      // Set up network change listener
      cleanup = onNetworkChange((newNetwork) => {
        setCurrentNetwork(newNetwork);
      });
    };
    
    initNetwork();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleSwitchNetwork = useCallback(async () => {
    if (!vault) return;
    
    setNetworkSwitching(true);
    try {
      const success = await switchToNetwork(vault.chainId);
      if (!success) {
        setError(`Failed to switch to ${vault.chainId} network. Please switch manually in your wallet.`);
      }
    } catch (err: any) {
      setError(`Network switch failed: ${err.message}`);
    } finally {
      setNetworkSwitching(false);
    }
  }, [vault]);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching vaults...');
      const all = await fetchAllVaults();
      console.log(`Found ${all.length} vaults`);
      
      const v = all.find(v => v.id === vaultIdInput);
      if (!v) {
        // Show similar vault IDs to help user
        const similar = all.filter(vault => vault.id.includes(vaultIdInput.toLowerCase())).slice(0, 5);
        const suggestions = similar.length > 0 ? ` Similar vaults: ${similar.map(v => v.id).join(', ')}` : '';
        throw new Error(`Vault '${vaultIdInput}' not found.${suggestions}`);
      }
      
      console.log('Found vault:', v);
      
      if (v.type !== 'standard' && v.type !== 'erc4626') {
        throw new Error(`This demo supports standard/erc4626 only. Vault '${v.id}' is type '${v.type}'`);
      }
      setVault(v);
      
      // resolve deposit token (treat zero address as native)
      console.log('Resolving deposit token for address:', v.depositTokenAddress);
      if (v.depositTokenAddress === ZERO_ADDRESS) {
        setDepositToken({ chainId: v.chainId, address: ZERO_ADDRESS, decimals: 18, symbol: 'NATIVE' });
      } else {
        try {
          const meta = await readErc20Meta(v.chainId, v.depositTokenAddress);
          console.log('Token metadata:', meta);
          setDepositToken({
            chainId: v.chainId,
            address: v.depositTokenAddress,
            decimals: meta.decimals,
            symbol: meta.symbol,
          });
        } catch (tokenError: any) {
          console.error('Failed to read token metadata:', tokenError);
          throw new Error(`Failed to read token metadata: ${tokenError.message}`);
        }
      }
      setWalletTokens([]);
      setSelectedToken(null);
      setAmount('0');
      setPercentage(0);
      setQuote(null);
      setBuilt(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vaultIdInput]);

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
        const pc = getPublicClient(vault.chainId);
        const bal = await pc.getBalance({ address: account });
        if (bal > 0n) out.push({ chainId: vault.chainId, address: ZERO_ADDRESS, decimals: 18, symbol: 'NATIVE', balance: bal });
      } catch {
        // ignore
      }

      // Check ERC20 tokens in batches
      for (let i = 0; i < addresses.length; i += 10) {
        const batch = addresses.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(async addr => {
            const meta = await readErc20Meta(vault.chainId, addr);
            const bal = await readErc20Balance(vault.chainId, addr, account);
            if (bal > 0n) {
              return { chainId: vault.chainId, address: addr, decimals: meta.decimals, symbol: meta.symbol, balance: bal };
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vault, account]);

  const onGetQuote = useCallback(async () => {
    if (!vault || !depositToken || !selectedToken) return;
    setLoading(true);
    setError(null);
    try {
      const isSameToken = selectedToken.address.toLowerCase() === depositToken.address.toLowerCase();
      if (isSameToken) {
        const fromAmount = new BigNumber(amount);
        const q = {
          providerId: 'no-swap',
          fromToken: selectedToken,
          fromAmount,
          toToken: depositToken,
          toAmount: fromAmount,
        } as any;
        setQuote(q);
        setBuilt(null);
      } else {
        const q = await fetchDepositQuote({
          vault,
          fromToken: selectedToken,
          fromAmount: new BigNumber(amount),
          toToken: depositToken,
        });
        setQuote(q);
        setBuilt(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vault, depositToken, selectedToken, amount]);

  const onBuildDeposit = useCallback(async () => {
    if (!vault || !depositToken || !quote || !account) return;
    setLoading(true);
    setError(null);
    try {
      // Use zap router as from address internally; wallet not needed for building
      const res = await buildDepositStep(vault, quote, depositToken, slippage);
      setBuilt(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vault, depositToken, quote, slippage, account]);

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, -apple-system, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ color: '#2563eb', marginBottom: 30 }}>Backyard-2: SingleStrategy Deposit (dry-run)</h1>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          Error: {error}
        </div>
      )}

      <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, color: '#1e293b' }}>Step 1: Load Vault</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <input 
            style={{ padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: 6, flex: 1 }}
            placeholder="Vault ID (e.g. curve-usdc-usdf)" 
            value={vaultIdInput} 
            onChange={e => setVaultIdInput(e.target.value)} 
          />
          <button 
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            onClick={loadVault}
            disabled={loading || !vaultIdInput}
          >
            {loading ? 'Loading...' : 'Load Vault'}
          </button>
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          <strong>Try these vaults:</strong>{' '}
          {['curve-usdc-usdf', 'cake-dodo-bnb', 'velodrome-v2-weth-op'].map(id => (
            <button
              key={id}
              style={{ 
                margin: '0 4px 4px 0', 
                padding: '2px 6px', 
                background: '#e5e7eb', 
                border: 'none', 
                borderRadius: 4, 
                fontSize: 12, 
                cursor: 'pointer' 
              }}
              onClick={() => setVaultIdInput(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {vault && (
        <div style={{ background: '#f0f9ff', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Vault Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><strong>ID:</strong> {vault.id}</div>
            <div><strong>Chain:</strong> {vault.chainId}</div>
            <div><strong>Type:</strong> {vault.type}</div>
            <div><strong>Deposit Token:</strong> {depositToken?.symbol || 'Loading...'} ({depositToken?.address ? String(depositToken.address).slice(0, 10) + '...' : 'N/A'})</div>
          </div>
        </div>
      )}

      {vault && (
        <div style={{ 
          background: networkMatches ? '#f0fdf4' : '#fef2f2', 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 20,
          border: networkMatches ? '2px solid #10b981' : '2px solid #ef4444'
        }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Network Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 14 }}>
              <strong>Required:</strong> {vault.chainId}
            </div>
            <div style={{ fontSize: 14 }}>
              <strong>Current:</strong> {currentNetwork?.chainId || 'Not connected'}
            </div>
            {networkMatches ? (
              <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: 14 }}>✓ Correct Network</div>
            ) : (
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>⚠ Wrong Network</div>
            )}
          </div>
          {!networkMatches && (
            <button
              style={{ 
                padding: '8px 16px', 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                cursor: 'pointer',
                opacity: networkSwitching ? 0.7 : 1
              }}
              onClick={handleSwitchNetwork}
              disabled={networkSwitching}
            >
              {networkSwitching ? 'Switching...' : `Switch to ${vault.chainId}`}
            </button>
          )}
        </div>
      )}

      {vault && (
        <div style={{ background: '#f0fdf4', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Step 2: Connect Wallet & Scan Tokens</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <button 
            style={{ 
              padding: '8px 16px', 
              background: account ? '#10b981' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer',
              opacity: (!networkMatches && account) ? 0.5 : 1
            }}
            onClick={connect} 
            disabled={!!account || (!networkMatches && !account)}
          >
            {account ? 'Connected' : 'Connect Wallet'}
          </button>
            {account && <span style={{ fontSize: 14, color: '#6b7280' }}>{account.slice(0, 6)}...{account.slice(-4)}</span>}
          </div>
          <button 
            style={{ 
              padding: '8px 16px', 
              background: '#059669', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer',
              opacity: (!networkMatches || !account || loading) ? 0.5 : 1
            }}
            onClick={scanWalletTokens} 
            disabled={!account || loading || !networkMatches}
          >
            {loading ? 'Scanning...' : 'Scan Wallet Tokens'}
          </button>
          {!networkMatches && (
            <div style={{ 
              marginTop: 8, 
              fontSize: 14, 
              color: '#ef4444', 
              fontStyle: 'italic' 
            }}>
              Please switch to the correct network first
            </div>
          )}
          {walletTokens.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 14, color: '#374151' }}>
              Found {walletTokens.length} tokens with balance
            </div>
          )}
        </div>
      )}

      {walletTokens.length > 0 && (
        <div style={{ background: '#fefce8', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Step 3: Select Token & Amount</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>From token:</label>
              <select 
                style={{ width: '100%', padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: 6 }}
                value={selectedToken?.address || ''} 
                onChange={e => {
                  const t = walletTokens.find(t => t.address === (e.target.value as any));
                  setSelectedToken(t || null);
                  setAmount('0');
                  setPercentage(0);
                }}
              >
                <option value="">Select token</option>
                {walletTokens.map(t => {
                  const balance = t.balance ? new BigNumber(t.balance.toString()).shiftedBy(-t.decimals) : new BigNumber(0);
                  return (
                    <option key={`${t.address}`} value={t.address as string}>
                      {t.symbol} - {balance.toFixed(4)} ({String(t.address).slice(0, 8)}...)
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontWeight: 500 }}>Amount:</label>
                {selectedToken && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Available: {selectedTokenBalance.toFixed(6)} {selectedToken.symbol}
                  </span>
                )}
              </div>
              <input 
                style={{ width: '100%', padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: 6, marginBottom: 8 }}
                placeholder="0.0" 
                value={amount} 
                onChange={e => handleAmountChange(e.target.value)} 
              />
              {selectedToken && selectedToken.balance && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          background: percentage === pct ? '#3b82f6' : '#e5e7eb',
                          color: percentage === pct ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          flex: 1
                        }}
                        onClick={() => handlePercentageChange(pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, minWidth: 30 }}>0%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={percentage}
                      onChange={e => handlePercentageChange(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 12, minWidth: 35 }}>100%</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Slippage (%):</label>
            <input 
              style={{ width: 200, padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: 6 }}
              type="number" 
              step="0.1" 
              min="0.1" 
              max="49" 
              value={slippage * 100} 
              onChange={e => setSlippage((Number(e.target.value) || 1) / 100)} 
            />
          </div>
          <button 
            style={{ padding: '10px 20px', background: canQuote ? '#f59e0b' : '#9ca3af', color: 'white', border: 'none', borderRadius: 6, cursor: canQuote ? 'pointer' : 'not-allowed' }}
            onClick={onGetQuote} 
            disabled={!canQuote || loading}
          >
            {loading ? 'Getting Quote...' : 'Get Quote'}
          </button>
        </div>
      )}

      {quote && (
        <div style={{ background: '#ecfdf5', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Quote Result</h3>
          <div style={{ background: '#1f2937', color: '#10b981', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 14, overflow: 'auto' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify({
  provider: quote.providerId,
  from: { token: quote.fromToken.symbol, amount },
  to: { token: quote.toToken.symbol, amount: quote.toAmount.toString() }
}, null, 2)}
            </pre>
          </div>
          <button 
            style={{ 
              padding: '10px 20px', 
              background: (!account || loading || !networkMatches) ? '#9ca3af' : '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: (!account || loading || !networkMatches) ? 'not-allowed' : 'pointer', 
              marginTop: 12 
            }}
            onClick={onBuildDeposit} 
            disabled={!account || loading || !networkMatches}
          >
            {loading ? 'Building Deposit...' : 'Build Deposit Step (dry-run)'}
          </button>
          {built && (
            <button
              style={{ 
                padding: '10px 20px', 
                background: (!account || loading || !networkMatches) ? '#9ca3af' : '#16a34a', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                cursor: (!account || loading || !networkMatches) ? 'not-allowed' : 'pointer', 
                marginTop: 12, marginLeft: 12
              }}
              onClick={async () => {
                if (!vault || !built || !account) return;
                setLoading(true);
                setError(null);
                try {
                  const isSameToken = selectedToken && depositToken && selectedToken.address.toLowerCase() === depositToken.address.toLowerCase();
                  const isErc20 = depositToken && depositToken.address !== ZERO_ADDRESS;
                  if (isSameToken && isErc20 && depositToken) {
                    await executeDirectDepositWithWallet(vault, depositToken, new BigNumber(amount), account);
                  } else {
                    await executeOrderWithWallet(vault, built.zapRequest, built.expectedTokens, account);
                  }
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!account || loading || !networkMatches}
            >
              {loading ? 'Sending…' : 'Deposit'}
            </button>
          )}
        </div>
      )}

      {built && (
        <div style={{ background: '#f3f4f6', padding: 20, borderRadius: 12 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Built Deposit Steps (Ready for executeOrder)</h3>
          <div style={{ background: '#111827', color: '#06b6d4', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, overflow: 'auto', maxHeight: 600 }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify({
  swap: {
    provider: built.swap.providerId,
    fromAmount: built.swap.fromAmount.toString(),
    toAmount: built.swap.toAmount.toString(),
    toAmountMin: built.swap.toAmountMin.toString(),
    tx: built.swap.tx
  },
  vaultDeposit: {
    expectedShares: built.vaultDeposit.outputs[0].amount.toString(),
    zapStep: built.vaultDeposit.zap
  },
  zapRequest: built.zapRequest,
  expectedTokens: built.expectedTokens.map(t => ({ symbol: t.symbol, address: t.address })),
}, null, 2)}
            </pre>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: '#dbeafe', borderRadius: 6, fontSize: 14 }}>
            <strong>📝 Note:</strong> This is a dry-run simulation. In production, this zapRequest would be passed to 
            <code style={{ background: '#1e293b', color: '#06b6d4', padding: '2px 6px', borderRadius: 3, margin: '0 4px' }}>
              zapExecuteOrder(vaultId, zapRequest, expectedTokens)
            </code>
            which calls the Beefy zap router's <code style={{ background: '#1e293b', color: '#06b6d4', padding: '2px 6px', borderRadius: 3 }}>executeOrder</code> function.
          </div>
        </div>
      )}
    </div>
  );
}
