import { FC } from 'react';
import BigNumber from 'bignumber.js';
import { Vault, Token } from '../../lib/types';

type Props = {
  quote: any;
  amount: string;
  account: `0x${string}` | null;
  loading: boolean;
  networkMatches: boolean;
  onBuildDeposit: () => void;
  built: any;
  vault: Vault | null;
  selectedToken: Token | null;
  depositToken: Token | null;
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
  account,
  loading,
  networkMatches,
  onBuildDeposit,
  built,
  vault,
  selectedToken,
  depositToken,
  setLoading,
  setError,
  executeDirectDepositWithWallet,
  executeOrderWithWallet,
  ZERO_ADDRESS,
}) => {
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
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(
            {
              provider: quote.providerId,
              from: { token: quote.fromToken.symbol, amount },
              to: {
                token: quote.toToken.symbol,
                amount: quote.toAmount.toString(),
              },
            },
            null,
            2
          )}
        </pre>
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
          onClick={async () => {
            if (!vault || !built || !account) return;
            setLoading(true);
            setError(null);
            try {
              const isSameToken =
                selectedToken &&
                depositToken &&
                selectedToken.address.toLowerCase() ===
                  depositToken.address.toLowerCase();
              const isErc20 =
                depositToken && depositToken.address !== ZERO_ADDRESS;
              if (isSameToken && isErc20 && depositToken) {
                await executeDirectDepositWithWallet(
                  vault,
                  depositToken,
                  new BigNumber(amount),
                  account
                );
              } else {
                await executeOrderWithWallet(
                  vault,
                  built.zapRequest,
                  built.expectedTokens,
                  account
                );
              }
            } catch (err: any) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={!account || loading || !networkMatches}>
          {loading ? 'Sending…' : 'Deposit'}
        </button>
      )}
    </div>
  );
};

export default QuoteResult;
