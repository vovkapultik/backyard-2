import { FC } from 'react';
import BigNumber from 'bignumber.js';
import { Vault, Token } from '../../lib/types';

type Props = {
  quote: any[];
  amount: string;
  amountPercentageByVaultsIdx: number[];
  account: `0x${string}` | null;
  loading: boolean;
  networkMatches: boolean;
  onBuildDeposit: () => void;
  built: any;
  vault: Vault[] | null;
  selectedToken: Token | null;
  depositTokens: Token[] | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  executeDirectDepositWithWallet: (
    vault: Vault,
    depositToken: Token,
    amount: BigNumber,
    account: `0x${string}`
  ) => Promise<`0x${string}`>;
  executeOrderWithWallet: (
    vault: Vault,
    zapRequest: any,
    expectedTokens: any,
    account: `0x${string}`
  ) => Promise<`0x${string}`>;
  ZERO_ADDRESS: `0x${string}`;
};

const QuoteResult: FC<Props> = ({
  quote,
  amount,
  amountPercentageByVaultsIdx,
  account,
  loading,
  networkMatches,
  onBuildDeposit,
  built,
  vault,
  selectedToken,
  depositTokens,
  setLoading,
  setError,
  executeDirectDepositWithWallet,
  executeOrderWithWallet,
  ZERO_ADDRESS,
}) => {
  const deposit = async (idx: number) => {
    if (!vault || !built || !account) return;
    setLoading(true);
    setError(null);
    try {
      const isSameToken =
        selectedToken &&
        depositTokens?.length &&
        selectedToken.address.toLowerCase() ===
          depositTokens[idx].address.toLowerCase();
      const isErc20 =
        depositTokens?.length && depositTokens[idx].address !== ZERO_ADDRESS;
      if (isSameToken && isErc20 && depositTokens[idx]) {
        const fromAmount = new BigNumber(amount).multipliedBy(
          amountPercentageByVaultsIdx[idx]
        );
        await executeDirectDepositWithWallet(
          vault[idx],
          depositTokens[idx],
          fromAmount,
          account
        );
        return true;
      } else {
        await executeOrderWithWallet(
          vault[idx],
          built[idx].zapRequest,
          built[idx].expectedTokens,
          account
        );
        return true;
      }
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!vault || !built || !account) return;

    for (let index = 0; index < quote.length; index++) {
      const success = await deposit(index);
      if (!success) break;
    }
  };

  return (
    <div
      style={{
        background: '#ecfdf5',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Quote Result</h3>
      <div
        style={{
          background: '#1f2937',
          color: '#10b981',
          padding: 16,
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 14,
          overflow: 'auto',
        }}>
        {quote?.map((_, idx) => {
          const fromAmount = Number(amount) * amountPercentageByVaultsIdx[idx];
          return (
            <pre key={idx} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(
                {
                  provider: quote[idx].providerId,
                  from: { token: quote[idx].fromToken.symbol, fromAmount },
                  to: {
                    token: quote[idx].toToken.symbol,
                    amount: quote[idx].toAmount.toString(),
                  },
                },
                null,
                2
              )}
            </pre>
          );
        })}
      </div>
      <button
        style={{
          padding: '10px 20px',
          background:
            !account || loading || !networkMatches ? '#9ca3af' : '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor:
            !account || loading || !networkMatches ? 'not-allowed' : 'pointer',
          marginTop: 12,
        }}
        onClick={onBuildDeposit}
        disabled={!account || loading || !networkMatches}>
        {loading ? 'Building Deposit...' : 'Build Deposit Step (dry-run)'}
      </button>
      {built && (
        <button
          style={{
            padding: '10px 20px',
            background:
              !account || loading || !networkMatches ? '#9ca3af' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor:
              !account || loading || !networkMatches
                ? 'not-allowed'
                : 'pointer',
            marginTop: 12,
            marginLeft: 12,
          }}
          onClick={handleDeposit}
          disabled={!account || loading || !networkMatches}>
          {loading ? 'Sending…' : 'Deposit'}
        </button>
      )}
    </div>
  );
};

export default QuoteResult;
