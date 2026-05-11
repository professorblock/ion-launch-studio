import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Download, Edit3, ExternalLink, Rocket, Trash2 } from 'lucide-react';
import { deleteLaunchPacket, getLaunchPacket, saveLaunchPacket } from '../lib/launchPackets';
import { compactAddress, timeAgo } from '../lib/format';
import { verifyFeeTransaction } from '../lib/feeVerification';
import type { LaunchPacket } from '../types/launch';

export function StudioPacketPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [packet, setPacket] = useState<LaunchPacket | undefined>(() => getLaunchPacket(id));
  const [copied, setCopied] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string>();
  const [isVerifyingFee, setIsVerifyingFee] = useState(false);

  useEffect(() => {
    setPacket(getLaunchPacket(id));
  }, [id]);

  const packetJson = useMemo(() => JSON.stringify(packet, null, 2), [packet]);

  if (!packet) return <Navigate to="/studio" replace />;

  async function copyPacket() {
    await navigator.clipboard?.writeText(packetJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadPacket() {
    if (!packet) return;
    const blob = new Blob([packetJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ion-launch-${packet.symbol.toLowerCase()}-${packet.id.slice(0, 8)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function removePacket() {
    if (!packet) return;
    deleteLaunchPacket(packet.id);
    navigate('/studio');
  }

  async function verifyFee() {
    if (!packet?.feeTxHash) return;
    setIsVerifyingFee(true);
    setVerifyMessage(undefined);

    try {
      const result = await verifyFeeTransaction(packet.feeTxHash);
      const nextPacket: LaunchPacket = {
        ...packet,
        feeStatus: result.valid ? 'confirmed' : result.status === 'reverted' ? 'reverted' : 'submitted',
        feeVerificationStatus: result.valid ? 'verified' : result.status === 'pending' ? 'unchecked' : 'mismatch',
        feeVerificationMessage: result.valid ? 'Verified against BNB Chain transfer logs.' : result.reason ?? `Fee transaction ${result.status}.`,
        feeConfirmedAt: result.valid ? new Date().toISOString() : packet.feeConfirmedAt,
        feeBlockNumber: result.blockNumber ?? packet.feeBlockNumber,
      };
      saveLaunchPacket(nextPacket);
      setPacket(nextPacket);
      setVerifyMessage(result.valid ? 'Fee transfer verified.' : result.reason ?? `Fee transaction ${result.status}.`);
    } catch (error) {
      setVerifyMessage(error instanceof Error ? error.message : 'Fee verification service unavailable.');
    } finally {
      setIsVerifyingFee(false);
    }
  }

  return (
    <section className="page-section packet-page">
      <div className="wizard-heading narrow">
        <Link className="back-link" to="/studio">
          <ArrowLeft size={17} />
          Studio
        </Link>
        <span className="step-label">Launch packet</span>
        <h1>{packet.name}</h1>
        <p>{packet.description}</p>
      </div>

      <div className="packet-layout">
        <div className="launch-form packet-review">
          <div className="packet-title-row">
            <div>
              <span className="status-pill">${packet.symbol}</span>
              <h2>Creator packet</h2>
            </div>
            <span>{timeAgo(packet.createdAt)}</span>
          </div>

          <div className="packet-grid packet-grid-wide">
            <span>Name <strong>{packet.name}</strong></span>
            <span>Ticker <strong>${packet.symbol}</strong></span>
            <span>Metadata <strong>{packet.metadataStatus === 'pinned' ? 'Pinned' : packet.metadataStatus === 'unconfigured' ? 'Unconfigured' : 'Local'}</strong></span>
            <span>Image <strong>{packet.imageUri ? 'Pinned' : packet.imagePreview ? 'Local' : 'Not set'}</strong></span>
            <span>Fee <strong>{feeLabel(packet)}</strong></span>
            <span>Fee amount <strong>{packet.feeAmountIon ? `${packet.feeAmountIon} ION` : 'Not set'}</strong></span>
            <span>Fee block <strong>{packet.feeBlockNumber ?? 'Pending'}</strong></span>
            <span>Website <strong>{packet.website || 'Not set'}</strong></span>
            <span>Telegram <strong>{packet.telegram || 'Not set'}</strong></span>
          </div>

          <div className="legal-block packet-json">
            <h2>Packet JSON</h2>
            <pre>{packetJson}</pre>
          </div>
        </div>

        <aside className="launch-side">
          <div className="side-card">
            <strong>Readiness</strong>
            <ul className="check-list">
              <li className="done">Token profile prepared</li>
              <li className={packet.metadataStatus === 'pinned' ? 'done' : ''}>
                {packet.metadataStatus === 'pinned' ? 'Metadata pinned' : 'Metadata local'}
              </li>
              <li className={packet.feeStatus === 'confirmed' ? 'done' : ''}>
                {packet.feeStatus === 'confirmed' ? 'ION fee transaction confirmed' : packet.feeTxHash ? 'ION fee transaction submitted' : 'ION fee pending'}
              </li>
              <li className={packet.feeVerificationStatus === 'verified' ? 'done' : ''}>
                {packet.feeVerificationStatus === 'verified' ? 'Treasury transfer verified' : 'Treasury transfer verification pending'}
              </li>
              <li>Final route verification pending</li>
            </ul>
          </div>

          <div className="side-card">
            <strong>Actions</strong>
            <Link className="button button-primary full-width" to={`/launch?packet=${packet.id}`}>
              <Edit3 size={17} />
              Resume in Launch
            </Link>
            <button className="button button-muted full-width" type="button" onClick={() => void copyPacket()}>
              {copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}
              {copied ? 'Copied' : 'Copy packet'}
            </button>
            <button className="button button-muted full-width" type="button" onClick={downloadPacket}>
              <Download size={17} />
              Export JSON
            </button>
            <button className="button button-muted full-width" type="button" disabled={!packet.feeTxHash || isVerifyingFee} onClick={() => void verifyFee()}>
              <CheckCircle2 size={17} />
              {isVerifyingFee ? 'Verifying fee' : 'Verify fee'}
            </button>
            <button className="button button-muted full-width" type="button" onClick={removePacket}>
              <Trash2 size={17} />
              Delete local packet
            </button>
            {verifyMessage ? <div className="studio-import-message">{verifyMessage}</div> : null}
          </div>

          <div className="side-card">
            <strong>Linked records</strong>
            <div className="stat-list">
              <span>Metadata <strong>{packet.metadataUri ? 'Pinned' : 'Local'}</strong></span>
              <span>Image <strong>{packet.imageUri ? 'Pinned' : packet.imagePreview ? 'Local' : 'Not set'}</strong></span>
              <span>Fee tx <strong>{packet.feeTxHash ? compactAddress(packet.feeTxHash, 6) : 'Pending'}</strong></span>
              <span>Submitted <strong>{packet.feeSubmittedAt ? timeAgo(packet.feeSubmittedAt) : 'Pending'}</strong></span>
              <span>Confirmed <strong>{packet.feeConfirmedAt ? timeAgo(packet.feeConfirmedAt) : 'Pending'}</strong></span>
              <span>Block <strong>{packet.feeBlockNumber ?? 'Pending'}</strong></span>
              <span>Verification <strong>{packet.feeVerificationStatus === 'verified' ? 'Verified' : packet.feeVerificationStatus === 'mismatch' ? 'Needs review' : 'Pending'}</strong></span>
            </div>
            {packet.metadataUri ? (
              <a className="external-card" href={packet.metadataGatewayUrl || packet.metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} target="_blank" rel="noreferrer">
                Metadata
                <ExternalLink size={16} />
              </a>
            ) : null}
            {packet.imageUri ? (
              <a className="external-card" href={packet.imageGatewayUrl || packet.imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} target="_blank" rel="noreferrer">
                Image
                <ExternalLink size={16} />
              </a>
            ) : null}
            {packet.feeTxHash ? (
              <a className="external-card" href={`https://bscscan.com/tx/${packet.feeTxHash}`} target="_blank" rel="noreferrer">
                Fee transaction
                <ExternalLink size={16} />
              </a>
            ) : null}
          </div>

          <div className="side-card">
            <strong>Execution</strong>
            <p>Final launch execution stays disabled until the verified route, calldata, and slippage behavior are confirmed.</p>
            <button className="button button-primary full-width" type="button" disabled>
              <Rocket size={17} />
              Finalize launch
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function feeLabel(packet: LaunchPacket) {
  if (packet.feeStatus === 'confirmed' && packet.feeVerificationStatus === 'verified') return 'Verified';
  if (packet.feeVerificationStatus === 'mismatch') return 'Needs review';
  if (packet.feeStatus === 'confirmed') return 'Confirmed';
  if (packet.feeStatus === 'reverted') return 'Reverted';
  if (packet.feeTxHash) return 'Submitted';
  return 'Pending';
}
