import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Download, Eye, FileUp, Rocket, Trash2 } from 'lucide-react';
import { clearLaunchPackets, getLaunchPackets, saveLaunchPacket } from '../lib/launchPackets';
import { timeAgo } from '../lib/format';
import type { LaunchPacket } from '../types/launch';

export function StudioPage() {
  const [packets, setPackets] = useState<LaunchPacket[]>([]);
  const [importMessage, setImportMessage] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPackets(getLaunchPackets());
  }, []);

  const summary = useMemo(() => {
    return {
      total: packets.length,
      feeReady: packets.filter((packet) => packet.feeTxHash).length,
      metadataPinned: packets.filter((packet) => packet.metadataStatus === 'pinned').length,
    };
  }, [packets]);

  function clearPackets() {
    clearLaunchPackets();
    setPackets([]);
  }

  function exportPackets() {
    const blob = new Blob([JSON.stringify(packets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ion-launch-packets-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importPackets(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedPackets = normalizeImportedPackets(parsed);
      if (!importedPackets.length) {
        setImportMessage('No valid launch packets found in that file.');
        return;
      }

      importedPackets.forEach(saveLaunchPacket);
      setPackets(getLaunchPackets());
      setImportMessage(`Imported ${importedPackets.length} launch packet${importedPackets.length === 1 ? '' : 's'}.`);
    } catch {
      setImportMessage('Could not read that JSON file.');
    }
  }

  return (
    <section className="page-section studio-page">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Creator studio</span>
          <h1>Your launch workspace.</h1>
          <p>
            Review prepared token profiles, fee status, metadata readiness, and execution state from one creator-side
            dashboard.
          </p>
        </div>
        <div className="market-stats">
          <div>
            <span>Packets</span>
            <strong>{summary.total}</strong>
          </div>
          <div>
            <span>Fee ready</span>
            <strong>{summary.feeReady}</strong>
          </div>
          <div>
            <span>Metadata pinned</span>
            <strong>{summary.metadataPinned}</strong>
          </div>
        </div>
      </div>

      <div className="studio-actions">
        <Link className="button button-primary" to="/launch">
          New Launch
          <ArrowRight size={17} />
        </Link>
        <button className="button button-muted" type="button" onClick={() => fileInputRef.current?.click()}>
          <FileUp size={17} />
          Import JSON
        </button>
        <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={(event) => void importPackets(event)} />
        <button className="button button-muted" type="button" disabled={!packets.length} onClick={exportPackets}>
          <Download size={17} />
          Export Packets
        </button>
        <button className="button button-muted" type="button" disabled={!packets.length} onClick={clearPackets}>
          <Trash2 size={17} />
          Clear Local Packets
        </button>
      </div>
      {importMessage ? <div className="studio-import-message">{importMessage}</div> : null}

      {packets.length ? (
        <div className="studio-grid">
          {packets.map((packet) => (
            <article className="studio-card" key={packet.id}>
              <div className="side-card-title">
                <ClipboardCheck size={20} />
                <strong>{packet.name}</strong>
              </div>
              <p>{packet.description}</p>
              <div className="packet-grid">
                <span>Ticker <strong>${packet.symbol}</strong></span>
                <span>Created <strong>{timeAgo(packet.createdAt)}</strong></span>
                <span>Fee <strong>{packet.feeTxHash ? 'Submitted' : 'Pending'}</strong></span>
                <span>Metadata <strong>{packet.metadataStatus === 'pinned' ? 'Pinned' : packet.metadataStatus === 'unconfigured' ? 'Unconfigured' : 'Local'}</strong></span>
                <span>Image <strong>{packet.imageUri ? 'Pinned' : packet.imagePreview ? 'Local' : 'Not set'}</strong></span>
              </div>
              <div className="studio-card-footer">
                <span className="status-pill">Route verification</span>
                <Link className="button button-muted" to={`/studio/${packet.id}`}>
                  <Eye size={16} />
                  Review
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state studio-empty">
          <Rocket size={26} />
          <span>No launch packets yet. Create your first token profile to start the workspace.</span>
        </div>
      )}
    </section>
  );
}

function normalizeImportedPackets(value: unknown): LaunchPacket[] {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.filter((packet): packet is LaunchPacket => {
    return Boolean(
      packet &&
      typeof packet === 'object' &&
      'id' in packet &&
      'createdAt' in packet &&
      'name' in packet &&
      'symbol' in packet &&
      'description' in packet &&
      typeof packet.id === 'string' &&
      typeof packet.createdAt === 'string' &&
      typeof packet.name === 'string' &&
      typeof packet.symbol === 'string' &&
      typeof packet.description === 'string',
    );
  });
}
