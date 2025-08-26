import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [amountPercentageByVaultsIdx, setPercentageAmountByVaultsIdx] =
    useState<number[]>([]);
  const [percentage, setPercentage] = useState(0); // 0-100
  const [slippage, setSlippage] = useState<number[]>([]);
  const [quote, setQuote] = useState<any[] | null>(null);
  const [built, setBuilt] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorVaultName, setErrorVaultName] = useState<string | null>(null);

  const resetBeforeLoadVault = useCallback(() => {
    setWalletTokens([]);
    setSelectedToken(null);
    setAmount('0');
    setPercentage(0);
    setQuote(null);
    setBuilt(null);
    setErrorVaultName(null);
  }, []);

  const {
    loadVault,
    vaultIdInput,
    setVaultIdInput,
    vault,
    depositTokens,
    deleteVault,
  } = useLoadVault({
    setLoading,
    setError,
    resetBeforeLoadVault,
    setPercentageAmountByVaultsIdx,
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

  const vaultChainIds = vault?.map(v => v.chainId) ?? [];

  const networkMatches =
    !vault ||
    !currentNetwork ||
    vaultChainIds.every(id => id === currentNetwork.chainId);

  const canQuote =
    vault &&
    depositTokens?.length &&
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

  useEffect(() => {
    if (!vault) return;

    let percentageArr;

    const vaultLength = vault?.length ?? 0;
    const baseValue = Math.floor(100 / vaultLength);
    const remainder = 100 % vaultLength;

    if (remainder === 0) {
      percentageArr = new Array(vaultLength).fill(baseValue);
    } else {
      percentageArr = new Array(vaultLength).fill(baseValue);
      percentageArr[vaultLength - 1] = baseValue + remainder;
    }

    const slippageArr = new Array(vaultLength).fill(0.01);

    setPercentageAmountByVaultsIdx(percentageArr);
    setSlippage(slippageArr);
  }, [vault]);

  useEffect(() => {
    setQuote(null);
    setBuilt(null);
  }, [amount, amountPercentageByVaultsIdx, selectedToken]);

  const onGetQuote = useCallback(
    async (idx: number) => {
      if (!vault || !depositTokens?.length || !selectedToken) return;
      setLoading(true);
      setError(null);
      setErrorVaultName(null);
      try {
        const isSameToken =
          selectedToken.address.toLowerCase() ===
          depositTokens[idx].address.toLowerCase();
        if (isSameToken) {
          const fromAmount = new BigNumber(amount).multipliedBy(
            amountPercentageByVaultsIdx[idx] / 100
          );
          const q = {
            providerId: 'no-swap',
            fromToken: selectedToken,
            fromAmount,
            toToken: depositTokens[idx],
            toAmount: fromAmount,
          } as any;

          const resWithVaultId = { ...q, vaultId: vault[idx].id };
          setQuote(prev => {
            if (!prev) return [resWithVaultId];
            return [...prev, resWithVaultId];
          });
          setBuilt(null);
          return true;
        } else {
          const fromAmount = new BigNumber(amount).multipliedBy(
            amountPercentageByVaultsIdx[idx] / 100
          );
          const q = await fetchDepositQuote({
            vault: vault[idx],
            fromToken: selectedToken,
            fromAmount: fromAmount,
            toToken: depositTokens[idx],
          });
          const resWithVaultId = { ...q, vaultId: vault[idx].id };
          setQuote(prev => {
            if (!prev) return [resWithVaultId];
            return [...prev, resWithVaultId];
          });
          setBuilt(null);
          return true;
        }
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [vault, depositTokens, selectedToken, amount, amountPercentageByVaultsIdx]
  );

  const handleQuote = async () => {
    if (!vault) return;

    for (let index = 0; index < vault.length; index++) {
      const success = await onGetQuote(index);
      if (!success) {
        setErrorVaultName(vault[index].id);
        break;
      }
    }
  };

  const onBuildDeposit = useCallback(
    async (idx: number) => {
      if (!vault || !depositTokens?.length || !quote || !account) return;
      setLoading(true);
      setError(null);
      try {
        // Use zap router as from address internally; wallet not needed for building
        const res = await buildDepositStep(
          vault[idx],
          quote[idx],
          depositTokens[idx],
          slippage[idx]
        );

        const resWithVaultId = { ...res, vaultId: vault[idx].id };
        setBuilt(prev => {
          if (!prev) return [resWithVaultId];
          return [...prev, resWithVaultId];
        });
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [vault, depositTokens, quote, slippage, account]
  );

  const handleBuildDeposit = async () => {
    if (!vault || !depositTokens?.length || !quote || !account) return;

    for (let index = 0; index < vault.length; index++) {
      const success = await onBuildDeposit(index);
      if (!success) break;
    }
  };

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
        disabled={
          (vault?.length ?? 0) >= 3 ||
          (vault ?? []).some(v => v.id === vaultIdInput)
        }
        loadVault={loadVault}
        loading={loading}
        vaultIdInput={vaultIdInput}
        setVaultIdInput={setVaultIdInput}
      />

      {vault && (
        <div style={{ display: 'flex', gap: 20 }}>
          {vault.map((v, idx) => (
            <div key={idx} style={{ flex: 1 }}>
              <VaultDetails
                vault={v}
                depositToken={depositTokens ? depositTokens[idx] : null}
                deleteVault={() => {
                  resetBeforeLoadVault();
                  deleteVault(idx);
                }}
              />
              <NetworkStatus
                vault={v}
                isCurrentNetworkMatch={
                  currentNetwork?.chainId === vaultChainIds[idx]
                }
                currentNetwork={currentNetwork}
                networkMatches={networkMatches}
                networkSwitching={networkSwitching}
                handleSwitchNetwork={() => handleSwitchNetwork(idx)}
              />
            </div>
          ))}
        </div>
      )}

      {vault && (
        <Wallet
          account={account}
          networkMatches={networkMatches}
          loading={loading}
          walletTokens={walletTokens}
          setWalletTokens={setWalletTokens}
          connect={connect}
          vault={vault[0]}
          setLoading={setLoading}
          setError={setError}
        />
      )}

      {walletTokens.length > 0 && (
        <Tokens
          vaults={vault}
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
          onGetQuote={handleQuote}
          loading={loading}
          amountPercentageByVaultsIdx={amountPercentageByVaultsIdx}
          setPercentageAmountByVaultsIdx={setPercentageAmountByVaultsIdx}
          errorVaultName={errorVaultName}
          error={error}
        />
      )}

      {quote && !error && (
        <QuoteResult
          quote={quote}
          amount={amount}
          amountPercentageByVaultsIdx={amountPercentageByVaultsIdx}
          account={account}
          loading={loading}
          networkMatches={networkMatches}
          onBuildDeposit={handleBuildDeposit}
          built={built}
          vault={vault}
          selectedToken={selectedToken}
          depositTokens={depositTokens}
          setLoading={setLoading}
          setError={setError}
          executeDirectDepositWithWallet={executeDirectDepositWithWallet}
          executeOrderWithWallet={executeOrderWithWallet}
          ZERO_ADDRESS={ZERO_ADDRESS}
        />
      )}

      {built && !error && <DepositSteps built={built} />}
    </div>
  );
}
