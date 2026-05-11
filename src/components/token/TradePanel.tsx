import { useMemo, useState } from 'react';
import { ArrowDownUp, CheckCircle2, ClipboardCheck, ShieldCheck, WalletCards } from 'lucide-react';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { chainConfig, externalLinks, featureFlags } from '../../config/app';
import { saveTradeDraft } from '../../lib/tradeDrafts';
import { useWallet } from '../../web3/WalletContext';
import type { LaunchToken } from '../../types/token';
import type { TradeDraft } from '../../types/order';
import type { FourMemeBuyQuote, FourMemeSellQuote } from '../../web3/WalletContext';

export function TradePanel({ token }: { token: LaunchToken }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(500);
  const [draft, setDraft] = useState<TradeDraft>();
  const [quote, setQuote] = useState<FourMemeBuyQuote | FourMemeSellQuote>();
  const [txHash, setTxHash] = useState<Hex>();
  const [approveHash, setApproveHash] = useState<Hex>();
  const [tradeError, setTradeError] = useState<string>();
  const [isExecuting, setIsExecuting] = useState(false);
  const { isConnected, chainId, switchToBnb, quoteFourMemeBuy, quoteFourMemeSell, executeFourMemeBuy, executeFourMemeSell } = useWallet();
  const readyForReview = isConnected && chainId === 56 && Number(amount) > 0;
  const tradeExecutionEnabled = featureFlags.tradeExecution;
  const parsedAmount = useMemo(() => {
    try {
      return Number(amount) > 0 ? parseUnits(amount, side === 'buy' ? 18 : 18) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, side]);

  const estimatedOutput = useMemo(() => {
    if (quote) {
      if (side === 'buy' && 'estimatedAmount' in quote) return `${formatUnits(quote.estimatedAmount, 18)} ${token.symbol}`;
      if (side === 'sell' && 'funds' in quote) return `${formatUnits(quote.funds > quote.fee ? quote.funds - quote.fee : quote.funds, 18)} BNB`;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return '0';
    return side === 'buy' ? `${Math.floor(value * 122_000).toLocaleString()} ${token.symbol}` : `${(value / 118_000).toFixed(5)} BNB`;
  }, [amount, quote, side, token.symbol]);

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

  async function executeTrade() {
    if (!readyForReview || parsedAmount <= 0n) return;
    setIsExecuting(true);
    setTradeError(undefined);
    try {
      if (side === 'buy') {
        const nextQuote = await quoteFourMemeBuy({
          helper: chainConfig.fourMemeHelper,
          token: token.address,
          fundsWei: parsedAmount,
        });
        setQuote(nextQuote);
        const hash = await executeFourMemeBuy({ token: token.address, quote: nextQuote, slippageBps });
        setTxHash(hash);
      } else {
        const nextQuote = await quoteFourMemeSell({
          helper: chainConfig.fourMemeHelper,
          token: token.address,
          amountWei: parsedAmount,
        });
        setQuote(nextQuote);
        const result = await executeFourMemeSell({ token: token.address, quote: nextQuote, amountWei: parsedAmount, slippageBps });
        setApproveHash(result.approveHash);
        setTxHash(result.sellHash);
      }
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : 'Trade was not completed.');
    } finally {
      setIsExecuting(false);
    }
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

      <button
        className="button button-primary full-width"
        type="button"
        disabled={!readyForReview || isExecuting}
        onClick={tradeExecutionEnabled ? () => void executeTrade() : reviewOrder}
      >
        {isExecuting ? 'Confirm in wallet' : tradeExecutionEnabled ? `${side === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}` : `Review ${side} order`}
      </button>
      {tradeError ? <div className="fee-error">{tradeError}</div> : null}
      {quote ? (
        <div className="order-draft">
          <div className="side-card-title">
            <ClipboardCheck size={18} />
            <strong>Route quote</strong>
          </div>
          <div className="stat-list">
            <span>Output <strong>{estimatedOutput}</strong></span>
            {'estimatedFee' in quote ? <span>Fee <strong>{formatUnits(quote.estimatedFee, 18)} BNB</strong></span> : null}
            {'fee' in quote ? <span>Fee <strong>{formatUnits(quote.fee, 18)} BNB</strong></span> : null}
          </div>
        </div>
      ) : null}
      {approveHash ? (
        <a className="tx-link" href={externalLinks.bscScanTx(approveHash)} target="_blank" rel="noreferrer">
          <CheckCircle2 size={16} />
          Approval transaction
        </a>
      ) : null}
      {txHash ? (
        <a className="tx-link" href={externalLinks.bscScanTx(txHash)} target="_blank" rel="noreferrer">
          <CheckCircle2 size={16} />
          Trade transaction
        </a>
      ) : null}

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
