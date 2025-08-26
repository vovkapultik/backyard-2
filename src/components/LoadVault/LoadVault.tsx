import { FC } from 'react';

type Props = {
  vaultIdInput: string;
  setVaultIdInput: (id: string) => void;
  loading: boolean;
  loadVault: () => void;
  disabled: boolean;
};

const LoadVault: FC<Props> = ({
  vaultIdInput,
  setVaultIdInput,
  loading,
  loadVault,
  disabled,
}) => {
  return (
    <div
      style={{
        background: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Step 1: Load Vault</h3>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}>
        <input
          style={{
            padding: '8px 12px',
            border: '2px solid #e2e8f0',
            borderRadius: 6,
            flex: 1,
          }}
          placeholder="Vault ID (e.g. curve-usdc-usdf)"
          value={vaultIdInput}
          onChange={e => setVaultIdInput(e.target.value)}
        />
        <button
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            opacity: loading || !vaultIdInput || disabled ? 0.5 : 1,
            cursor:
              loading || !vaultIdInput || disabled ? 'not-allowed' : 'pointer',
          }}
          onClick={loadVault}
          disabled={loading || !vaultIdInput || disabled}>
          {loading ? 'Loading...' : 'Load Vault'}
        </button>
      </div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>
        <strong>Try these vaults:</strong>{' '}
        {['curve-usdc-usdf', 'cake-dodo-bnb', 'velodrome-v2-weth-op'].map(
          id => (
            <button
              key={id}
              style={{
                margin: '0 4px 4px 0',
                padding: '2px 6px',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={() => setVaultIdInput(id)}>
              {id}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default LoadVault;
