import { FC } from 'react';
import { Vault } from '../../lib/types';
import { NetworkInfo } from '../../lib/wallet';

type Props = {
  vault: Vault;
  currentNetwork: NetworkInfo | null;
  isCurrentNetworkMatch: boolean;
  networkMatches: boolean;
  networkSwitching: boolean;
  handleSwitchNetwork: () => void;
};

const NetworkStatus: FC<Props> = ({
  vault,
  currentNetwork,
  isCurrentNetworkMatch,
  networkMatches,
  networkSwitching,
  handleSwitchNetwork,
}) => {
  return (
    <div
      style={{
        background: networkMatches ? '#f0fdf4' : '#fef2f2',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        border: networkMatches ? '2px solid #10b981' : '2px solid #ef4444',
      }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Network Status</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 12,
        }}>
        <div style={{ fontSize: 14 }}>
          <strong>Required:</strong> {vault.chainId}
        </div>
        <div style={{ fontSize: 14 }}>
          <strong>Current:</strong> {currentNetwork?.chainId || 'Not connected'}
        </div>
        {networkMatches || currentNetwork?.chainId === vault.chainId ? (
          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: 14 }}>
            ✓ Correct Network
          </div>
        ) : (
          <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>
            ⚠ Wrong Network
          </div>
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
            opacity: networkSwitching ? 0.7 : 1,
          }}
          onClick={handleSwitchNetwork}
          disabled={networkSwitching}>
          {networkSwitching ? 'Switching...' : `Switch to ${vault.chainId}`}
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;
