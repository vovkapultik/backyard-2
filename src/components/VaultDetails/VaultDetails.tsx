import { FC } from 'react';
import { Token, Vault } from '../../lib/types';

type Props = {
  vault: Vault;
  depositToken: Token | null;
  deleteVault: () => void;
};

const VaultDetails: FC<Props> = ({ vault, depositToken, deleteVault }) => {
  return (
    <div
      style={{
        background: '#f0f9ff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        position: 'relative',
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Vault Details</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
        <div>
          <strong>ID:</strong> {vault.id}
        </div>
        <div>
          <strong>Chain:</strong> {vault.chainId}
        </div>
        <div>
          <strong>Type:</strong> {vault.type}
        </div>
        <div>
          <strong>Deposit Token:</strong> {depositToken?.symbol || 'Loading...'}
          <br />(
          {depositToken?.address
            ? String(depositToken.address).slice(0, 10) + '...'
            : 'N/A'}
          )
        </div>
        <button
          style={{
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            position: 'absolute',
            top: 12,
            right: 12,
          }}
          onClick={deleteVault}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default VaultDetails;
