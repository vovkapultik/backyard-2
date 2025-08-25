import { useCallback, useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import { ZERO_ADDRESS } from './lib/utils';
import type { Token, Vault } from './lib/types';
import { fetchDepositQuote } from './lib/quote';
import { buildDepositStep } from './lib/step';
import { executeOrderWithWallet } from './lib/wallet-zap';
import { executeDirectDepositWithWallet } from './lib/wallet-direct';
import LoadVault from './components/LoadVault/LoadVault';
import VaultDetails from './components/VaultDetails/VaultDetails';
import NetworkStatus from './components/NetworkStatus/NetworkStatus';
import Wallet from './components/Wallet/Wallet';
import Tokens from './components/Tokens/Tokens';
import QuoteResult from './components/QuoteResult/QuoteResult';
import DepositSteps from './components/DepositSteps/DepositSteps';
import { useWallet } from './Hooks/useWallet';
import { useLoadVault } from './Hooks/useLoadVault';

export default function App() {
  const [walletTokens, setWalletTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('0');
  const [percentage, setPercentage] = useState(0); // 0-100
  const [slippage, setSlippage] = useState(0.01);
  const [quote, setQuote] = useState<any>(null);
  const [built, setBuilt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetBeforeLoadVault = useCallback(() => {
    setWalletTokens([]);
    setSelectedToken(null);
    setAmount('0');
    setPercentage(0);
    setQuote(null);
    setBuilt(null);
  }, []);

  const { loadVault, vaultIdInput, setVaultIdInput, vault, depositToken } =
    useLoadVault({
      setLoading,
      setError,
      resetBeforeLoadVault,
    });

  const {
    account,
    connect,
    currentNetwork,
    networkSwitching,
    handleSwitchNetwork,
  } = useWallet({
    setError,
    vault,
  });

  const networkMatches =
    !vault || !currentNetwork || currentNetwork.chainId === vault.chainId;

  const canQuote =
    vault &&
    depositToken &&
    selectedToken &&
    new BigNumber(amount).gt(0) &&
    networkMatches;

  // Balance and percentage calculations
  const selectedTokenBalance = useMemo(() => {
    if (!selectedToken?.balance) return new BigNumber(0);
    return new BigNumber(selectedToken.balance.toString()).shiftedBy(
      -selectedToken.decimals
    );
  }, [selectedToken]);

  const onGetQuote = useCallback(async () => {
    if (!vault || !depositToken || !selectedToken) return;
    setLoading(true);
    setError(null);
    try {
      const isSameToken =
        selectedToken.address.toLowerCase() ===
        depositToken.address.toLowerCase();
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
    <div
      style={{
        padding: 20,
        fontFamily: 'Inter, -apple-system, sans-serif',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
      <h1 style={{ color: '#2563eb', marginBottom: 30 }}>
        Backyard-2: SingleStrategy Deposit (dry-run)
      </h1>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
          }}>
          Error: {error}
        </div>
      )}

      <LoadVault
        loadVault={loadVault}
        loading={loading}
        vaultIdInput={vaultIdInput}
        setVaultIdInput={setVaultIdInput}
      />

      {vault && <VaultDetails vault={vault} depositToken={depositToken} />}

      {vault && (
        <NetworkStatus
          vault={vault}
          currentNetwork={currentNetwork}
          networkMatches={networkMatches}
          networkSwitching={networkSwitching}
          handleSwitchNetwork={handleSwitchNetwork}
        />
      )}

      {vault && (
        <Wallet
          account={account}
          networkMatches={networkMatches}
          loading={loading}
          walletTokens={walletTokens}
          setWalletTokens={setWalletTokens}
          connect={connect}
          vault={vault}
          setLoading={setLoading}
          setError={setError}
        />
      )}

      {walletTokens.length > 0 && (
        <Tokens
          walletTokens={walletTokens}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          amount={amount}
          setAmount={setAmount}
          percentage={percentage}
          setPercentage={setPercentage}
          selectedTokenBalance={selectedTokenBalance}
          slippage={slippage}
          setSlippage={setSlippage}
          canQuote={Boolean(canQuote)}
          onGetQuote={onGetQuote}
          loading={loading}
        />
      )}

      {quote && (
        <QuoteResult
          quote={quote}
          amount={amount}
          account={account}
          loading={loading}
          networkMatches={networkMatches}
          onBuildDeposit={onBuildDeposit}
          built={built}
          vault={vault}
          selectedToken={selectedToken}
          depositToken={depositToken}
          setLoading={setLoading}
          setError={setError}
          executeDirectDepositWithWallet={executeDirectDepositWithWallet}
          executeOrderWithWallet={executeOrderWithWallet}
          ZERO_ADDRESS={ZERO_ADDRESS}
        />
      )}

      {built && <DepositSteps built={built} />}
    </div>
  );
}
