import { useMemo, useState } from 'react';
import { ArrowDownUp, CheckCircle2, ClipboardCheck, ShieldCheck, WalletCards } from 'lucide-react';
import { featureFlags } from '../../config/app';
import { saveTradeDraft } from '../../lib/tradeDrafts';
import { useWallet } from '../../web3/WalletContext';
import type { LaunchToken } from '../../types/token';
import type { TradeDraft } from '../../types/order';

export function TradePanel({ token }: { token: LaunchToken }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(500);
  const [draft, setDraft] = useState<TradeDraft>();
  const { isConnected, chainId, switchToBnb } = useWallet();
  const readyForReview = isConnected && chainId === 56 && Number(amount) > 0;
  const tradeExecutionEnabled = featureFlags.tradeExecution;

  const estimatedOutput = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return '0';
    return side === 'buy' ? `${Math.floor(value * 122_000).toLocaleString()} ${token.symbol}` : `${(value / 118_000).toFixed(5)} BNB`;
  }, [amount, side, token.symbol]);

  function reviewOrder() {
    if (!readyForReview) return;
    const nextDraft: TradeDraft = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
      side,
      amount,
      estimatedOutput,
      slippageBps,
      expiresInMinutes: 10,
      status: 'review-only',
    };
    setDraft(nextDraft);
    saveTradeDraft(nextDraft);
  }

  return (
    <div className="trade-panel">
      <div className="trade-panel-header">
        <div>
          <span className="eyebrow">Native trade desk</span>
          <h2>Trade ${token.symbol}</h2>
        </div>
        <ArrowDownUp size={22} />
      </div>

      <div className="trade-tabs">
        <button className={side === 'buy' ? 'active' : ''} type="button" onClick={() => setSide('buy')}>
          Buy
        </button>
        <button className={side === 'sell' ? 'active' : ''} type="button" onClick={() => setSide('sell')}>
          Sell
        </button>
      </div>

      <label>
        {side === 'buy' ? 'Amount in BNB' : `Amount in ${token.symbol}`}
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))}
          placeholder={side === 'buy' ? '0.25' : '100000'}
        />
      </label>

      <div className="quote-box">
        <span>Estimated output</span>
        <strong>{estimatedOutput}</strong>
      </div>

      <label>
        Slippage guard
        <select value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))}>
          <option value={100}>1.0%</option>
          <option value={300}>3.0%</option>
          <option value={500}>5.0%</option>
          <option value={1000}>10.0%</option>
        </select>
      </label>

      {!isConnected ? (
        <div className="execution-note">
          <WalletCards size={18} />
          Connect wallet to prepare a signed order.
        </div>
      ) : chainId !== 56 ? (
        <button className="button button-muted full-width" type="button" onClick={() => void switchToBnb()}>
          Switch to BNB Chain
        </button>
      ) : null}

      <button className="button button-primary full-width" type="button" disabled={!readyForReview} onClick={reviewOrder}>
        Review {side} order
      </button>

      {draft ? (
        <div className="order-draft">
          <div className="side-card-title">
            <ClipboardCheck size={18} />
            <strong>Order draft saved</strong>
          </div>
          <div className="stat-list">
            <span>Side <strong>{draft.side}</strong></span>
            <span>Input <strong>{draft.amount}</strong></span>
            <span>Slippage <strong>{(draft.slippageBps / 100).toFixed(1)}%</strong></span>
            <span>Output <strong>{draft.estimatedOutput}</strong></span>
          </div>
          <div className="execution-note">
            <CheckCircle2 size={17} />
            Saved to Desk for final route review.
          </div>
        </div>
      ) : null}

      <div className="execution-note subdued">
        <ShieldCheck size={18} />
        {tradeExecutionEnabled
          ? 'Trade execution is enabled by config, but every order still requires wallet review.'
          : 'Orders are saved as drafts until the verified route and slippage checks are connected.'}
      </div>
    </div>
  );
}
