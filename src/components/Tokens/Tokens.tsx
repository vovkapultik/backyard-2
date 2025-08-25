import { FC, useCallback } from 'react';
import BigNumber from 'bignumber.js';
import { Token } from '../../lib/types';

type Props = {
  walletTokens: Token[];
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  amount: string;
  setAmount: (amount: string) => void;
  percentage: number;
  setPercentage: (percentage: number) => void;
  selectedTokenBalance: BigNumber;
  slippage: number;
  setSlippage: (slippage: number) => void;
  canQuote: boolean;
  onGetQuote: () => void;
  loading: boolean;
};

const Tokens: FC<Props> = ({
  walletTokens,
  selectedToken,
  setSelectedToken,
  amount,
  setAmount,
  percentage,
  setPercentage,
  selectedTokenBalance,
  slippage,
  setSlippage,
  canQuote,
  onGetQuote,
  loading,
}) => {
  const handleAmountChange = useCallback(
    (newAmount: string) => {
      setAmount(newAmount);
      if (selectedToken?.balance && new BigNumber(newAmount).gt(0)) {
        const balance = new BigNumber(
          selectedToken.balance.toString()
        ).shiftedBy(-selectedToken.decimals);
        const newPercentage = new BigNumber(newAmount)
          .dividedBy(balance)
          .multipliedBy(100);
        setPercentage(Math.min(100, Math.max(0, newPercentage.toNumber())));
      } else {
        setPercentage(0);
      }
    },
    [selectedToken]
  );

  const handlePercentageChange = useCallback(
    (newPercentage: number) => {
      setPercentage(newPercentage);
      if (selectedToken?.balance) {
        const balance = new BigNumber(
          selectedToken.balance.toString()
        ).shiftedBy(-selectedToken.decimals);
        const newAmount = balance.multipliedBy(newPercentage / 100);
        setAmount(newAmount.toString());
      }
    },
    [selectedToken]
  );

  return (
    <div
      style={{
        background: '#fefce8',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>
        Step 3: Select Token & Amount
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            From token:
          </label>
          <select
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #e2e8f0',
              borderRadius: 6,
            }}
            value={selectedToken?.address || ''}
            onChange={e => {
              const t = walletTokens.find(
                t => t.address === (e.target.value as any)
              );
              setSelectedToken(t || null);
              setAmount('0');
              setPercentage(0);
            }}>
            <option value="">Select token</option>
            {walletTokens.map(t => {
              const balance = t.balance
                ? new BigNumber(t.balance.toString()).shiftedBy(-t.decimals)
                : new BigNumber(0);
              return (
                <option key={`${t.address}`} value={t.address as string}>
                  {t.symbol} - {balance.toFixed(4)} (
                  {String(t.address).slice(0, 8)}...)
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}>
            <label style={{ fontWeight: 500 }}>Amount:</label>
            {selectedToken && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Available: {selectedTokenBalance.toFixed(6)}{' '}
                {selectedToken.symbol}
              </span>
            )}
          </div>
          <input
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 8,
            }}
            placeholder="0.0"
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
          />
          {selectedToken &&
          selectedToken.balance &&
          new BigNumber(selectedToken.balance.toString()).gt(0) ? (
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
                      flex: 1,
                    }}
                    onClick={() => handlePercentageChange(pct)}>
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
          ) : null}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
          Slippage (%):
        </label>
        <input
          style={{
            width: 200,
            padding: '8px 12px',
            border: '2px solid #e2e8f0',
            borderRadius: 6,
          }}
          type="number"
          step="0.1"
          min="0.1"
          max="49"
          value={slippage * 100}
          onChange={e => setSlippage((Number(e.target.value) || 1) / 100)}
        />
      </div>
      <button
        style={{
          padding: '10px 20px',
          background: canQuote ? '#f59e0b' : '#9ca3af',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: canQuote ? 'pointer' : 'not-allowed',
        }}
        onClick={onGetQuote}
        disabled={!canQuote || loading}>
        {loading ? 'Getting Quote...' : 'Get Quote'}
      </button>
    </div>
  );
};

export default Tokens;
