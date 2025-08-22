import { FC } from 'react';
import { Token, Vault } from '../../lib/types';

type Props = {
  vault: Vault;
  depositToken: Token | null;
};

const VaultDetails: FC<Props> = ({ vault, depositToken }) => {
  return (
    <div
      style={{
        background: '#f0f9ff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Vault Details</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
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
          <strong>Deposit Token:</strong> {depositToken?.symbol || 'Loading...'}{' '}
          (
          {depositToken?.address
            ? String(depositToken.address).slice(0, 10) + '...'
            : 'N/A'}
          )
        </div>
      </div>
    </div>
  );
};

export default VaultDetails;
