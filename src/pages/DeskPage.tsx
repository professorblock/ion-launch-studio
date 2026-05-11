import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, ClipboardCheck, Download, Eye, FileUp, Layers, Star, Trash2 } from 'lucide-react';
import { getLaunchPackets } from '../lib/launchPackets';
import { getTradeDrafts, deleteTradeDraft } from '../lib/tradeDrafts';
import { getWatchlist } from '../lib/watchlist';
import { fetchLaunchData } from '../lib/launchData';
import { compactAddress, timeAgo } from '../lib/format';
import { createWorkspaceBackup, restoreWorkspaceBackup } from '../lib/workspaceBackup';
import type { LaunchPacket } from '../types/launch';
import type { TradeDraft } from '../types/order';
import type { LaunchToken } from '../types/token';

export function DeskPage() {
  const [packets, setPackets] = useState<LaunchPacket[]>([]);
  const [drafts, setDrafts] = useState<TradeDraft[]>([]);
  const [watchedTokens, setWatchedTokens] = useState<LaunchToken[]>([]);
  const [backupMessage, setBackupMessage] = useState<string>();
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPackets(getLaunchPackets());
    setDrafts(getTradeDrafts());
    const watched = new Set<string>(getWatchlist());
    void fetchLaunchData().then((data) => {
      setWatchedTokens(data.tokens.filter((token) => watched.has(token.address.toLowerCase())));
    });
  }, []);

  const summary = useMemo(() => {
    return [
      { label: 'Launch packets', value: packets.length, icon: ClipboardCheck },
      { label: 'Order drafts', value: drafts.length, icon: BriefcaseBusiness },
      { label: 'Watching', value: watchedTokens.length, icon: Star },
    ];
  }, [drafts.length, packets.length, watchedTokens.length]);

  function removeDraft(id: string) {
    deleteTradeDraft(id);
    setDrafts(getTradeDrafts());
  }

  function refreshWorkspace() {
    setPackets(getLaunchPackets());
    setDrafts(getTradeDrafts());
    const watched = new Set<string>(getWatchlist());
    void fetchLaunchData().then((data) => {
      setWatchedTokens(data.tokens.filter((token) => watched.has(token.address.toLowerCase())));
    });
  }

  function exportWorkspace() {
    const blob = new Blob([JSON.stringify(createWorkspaceBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ion-launch-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const restored = restoreWorkspaceBackup(JSON.parse(await file.text()) as unknown);
      setBackupMessage(restored ? `Restored ${restored} workspace record${restored === 1 ? '' : 's'}.` : 'No valid workspace records found.');
      refreshWorkspace();
    } catch {
      setBackupMessage('Could not read that workspace backup.');
    }
  }

  return (
    <section className="page-section desk-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">My desk</span>
          <h1>Your ION Launch command center.</h1>
          <p>
            Local workspace for launch packets, watched markets, and order drafts. No accounts, no custodial state, and
            no private server database required.
          </p>
        </div>
        <div className="market-stats">
          {summary.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <span><Icon size={15} /> {item.label}</span>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div className="desk-sections">
        <section className="panel desk-panel desk-wide workspace-actions">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Local backup</span>
              <h2>Workspace portability</h2>
            </div>
            <div className="inline-actions">
              <button className="button button-muted" type="button" onClick={exportWorkspace}>
                <Download size={17} />
                Export
              </button>
              <button className="button button-muted" type="button" onClick={() => backupInputRef.current?.click()}>
                <FileUp size={17} />
                Import
              </button>
              <input ref={backupInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={(event) => void importWorkspace(event)} />
            </div>
          </div>
          <p>Back up creator packets, watchlist, and review-only order drafts without creating accounts or paid storage.</p>
          {backupMessage ? <div className="studio-import-message">{backupMessage}</div> : null}
        </section>

        <section className="panel desk-panel">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Creator</span>
              <h2>Launch packets</h2>
            </div>
            <Link to="/launch">New</Link>
          </div>
          {packets.length ? (
            <div className="desk-list">
              {packets.slice(0, 6).map((packet) => (
                <Link to={`/studio/${packet.id}`} key={packet.id}>
                  <ClipboardCheck size={18} />
                  <span>
                    <strong>{packet.name}</strong>
                    <small>${packet.symbol} · {packet.feeStatus === 'confirmed' ? 'Fee confirmed' : packet.feeTxHash ? 'Fee submitted' : 'Fee pending'}</small>
                  </span>
                  <Eye size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mini-empty">No launch packets yet.</div>
          )}
        </section>

        <section className="panel desk-panel">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Markets</span>
              <h2>Watchlist</h2>
            </div>
            <Link to="/discover">Explore</Link>
          </div>
          {watchedTokens.length ? (
            <div className="desk-list">
              {watchedTokens.map((token) => (
                <Link to={`/token/${token.address}`} key={token.address}>
                  <img src={token.imageUrl} alt="" />
                  <span>
                    <strong>{token.name}</strong>
                    <small>${token.symbol} · {token.status}</small>
                  </span>
                  <Eye size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mini-empty">Watch tokens from market detail pages.</div>
          )}
        </section>

        <section className="panel desk-panel desk-wide">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Trading</span>
              <h2>Order drafts</h2>
            </div>
            <span className="status-pill">Review only</span>
          </div>
          {drafts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Side</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr key={draft.id}>
                      <td>
                        <Link to={`/token/${draft.tokenAddress}`}>{draft.tokenSymbol}</Link>
                        <small>{compactAddress(draft.tokenAddress)}</small>
                      </td>
                      <td><span className={`trade-side ${draft.side === 'buy' ? 'buy' : 'sell'}`}>{draft.side}</span></td>
                      <td>{draft.amount}</td>
                      <td>{draft.estimatedOutput}</td>
                      <td>{timeAgo(draft.createdAt)}</td>
                      <td>
                        <button className="icon-button" type="button" onClick={() => removeDraft(draft.id)} aria-label="Delete draft">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mini-empty">
              <Layers size={18} />
              Review an order on a token page to save it here.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
