import { FC } from 'react';

type Props = {
  built: any;
};

const DepositSteps: FC<Props> = ({ built }) => {
  return (
    <div style={{ background: '#f3f4f6', padding: 20, borderRadius: 12 }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>
        Built Deposit Steps (Ready for executeOrder)
      </h3>
      <div
        style={{
          background: '#111827',
          color: '#06b6d4',
          padding: 16,
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 12,
          overflow: 'auto',
          maxHeight: 600,
        }}>
        {built.map((_, idx) => {
          return (
            <pre key={idx} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              --------------{built[idx].vaultId}--------------
              <br />
              {JSON.stringify(
                {
                  swap: {
                    provider: built[idx].swap.providerId,
                    fromAmount: built[idx].swap.fromAmount.toString(),
                    toAmount: built[idx].swap.toAmount.toString(),
                    toAmountMin: built[idx].swap.toAmountMin.toString(),
                    tx: built[idx].swap.tx,
                  },
                  vaultDeposit: {
                    expectedShares:
                      built[idx].vaultDeposit.outputs[0].amount.toString(),
                    zapStep: built[idx].vaultDeposit.zap,
                  },
                  zapRequest: built[idx].zapRequest,
                  expectedTokens: built[idx].expectedTokens.map((t: any) => ({
                    symbol: t.symbol,
                    address: t.address,
                  })),
                },
                null,
                2
              )}
            </pre>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: '#dbeafe',
          borderRadius: 6,
          fontSize: 14,
        }}>
        <strong>📝 Note:</strong> This is a dry-run simulation. In production,
        this zapRequest would be passed to
        <code
          style={{
            background: '#1e293b',
            color: '#06b6d4',
            padding: '2px 6px',
            borderRadius: 3,
            margin: '0 4px',
          }}>
          zapExecuteOrder(vaultId, zapRequest, expectedTokens)
        </code>
        which calls the Beefy zap router's{' '}
        <code
          style={{
            background: '#1e293b',
            color: '#06b6d4',
            padding: '2px 6px',
            borderRadius: 3,
          }}>
          executeOrder
        </code>{' '}
        function.
      </div>
    </div>
  );
};

export default DepositSteps;
