import { Wallet } from 'lucide-react';
import { compactAddress } from '../../lib/format';
import { useWallet } from '../../web3/WalletContext';

export function ConnectWalletButton() {
  const { address, isConnected, connect, disconnect, isConnecting, walletError } = useWallet();

  if (isConnected && address) {
    return (
      <div className="wallet-connect">
        <button className="button button-muted" type="button" onClick={() => disconnect()}>
          <Wallet size={17} />
          {compactAddress(address)}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <button
        className="button button-primary"
        type="button"
        disabled={isConnecting}
        onClick={() => void connect()}
      >
        <Wallet size={17} />
        {isConnecting ? 'Connecting' : 'Connect Wallet'}
      </button>
      {walletError ? <span className="wallet-connect-error">{walletError}</span> : null}
    </div>
  );
}
