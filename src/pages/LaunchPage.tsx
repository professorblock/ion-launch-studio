import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Flame, ImagePlus, Rocket, ShieldCheck, Sparkles, Tag, WalletCards } from 'lucide-react';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { feeConfig, externalLinks, featureFlags } from '../config/app';
import { getLastLaunchPacket, getLaunchPacket, saveLaunchPacket } from '../lib/launchPackets';
import { pinLaunchMetadata } from '../lib/metadata';
import type { LaunchPacket } from '../types/launch';
import { useWallet } from '../web3/WalletContext';

interface LaunchFormState {
  name: string;
  symbol: string;
  description: string;
  website: string;
  x: string;
  telegram: string;
}

const initialForm: LaunchFormState = {
  name: '',
  symbol: '',
  description: '',
  website: '',
  x: '',
  telegram: '',
};

function getConfiguredFeeAmount() {
  try {
    return parseUnits(feeConfig.platformFeeIon, feeConfig.ionDecimals);
  } catch {
    return 0n;
  }
}

export function LaunchPage() {
  const [searchParams] = useSearchParams();
  const packetId = searchParams.get('packet');
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState<string>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [feeTxHash, setFeeTxHash] = useState<Hex>();
  const [feeError, setFeeError] = useState<string>();
  const [feeBalance, setFeeBalance] = useState<bigint>();
  const [launchPacket, setLaunchPacket] = useState<LaunchPacket>();
  const [loadedPacketId, setLoadedPacketId] = useState<string>();
  const [isPreparingPacket, setIsPreparingPacket] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isFeePending, setIsFeePending] = useState(false);
  const { address, isConnected, chainId, switchToBnb, getIonBalance, sendIonFee } = useWallet();

  const formReady = useMemo(() => {
    return form.name.trim().length >= 2 && /^[A-Z0-9]{2,12}$/.test(form.symbol.trim()) && form.description.trim().length >= 20;
  }, [form]);

  const feeReady = Boolean(feeConfig.ionTokenAddress && feeConfig.treasuryAddress && Number(feeConfig.platformFeeIon) > 0);
  const onBnb = isConnected && chainId === 56;
  const feeAmount = getConfiguredFeeAmount();
  const hasFeeBalance = feeBalance !== undefined && feeAmount > 0n && feeBalance >= feeAmount;
  const formattedFeeBalance = feeBalance === undefined ? 'Not checked' : `${formatUnits(feeBalance, feeConfig.ionDecimals)} ION`;
  const feeSatisfied = !feeReady || Boolean(feeTxHash || launchPacket?.feeTxHash);
  const launchExecutionEnabled = featureFlags.launchExecution;

  useEffect(() => {
    const packet = packetId ? getLaunchPacket(packetId) : getLastLaunchPacket();

    if (!packet) {
      if (packetId) {
        setStep('form');
        setLoadedPacketId(undefined);
        setLaunchPacket(undefined);
      }
      return;
    }

    setLaunchPacket(packet);
    if (packetId) {
      setStep('form');
      setLoadedPacketId(packet.id);
      setForm({
        name: packet.name,
        symbol: packet.symbol,
        description: packet.description,
        website: packet.website ?? '',
        x: packet.x ?? '',
        telegram: packet.telegram ?? '',
      });
      setImagePreview(packet.imagePreview);
      setFeeTxHash(packet.feeTxHash);
      setAcknowledged(true);
    }
  }, [packetId]);

  useEffect(() => {
    if (!isConnected || !onBnb || !address || !feeConfig.ionTokenAddress || !feeReady) {
      setFeeBalance(undefined);
      return;
    }

    let cancelled = false;
    setIsBalanceLoading(true);
    setFeeError(undefined);

    void getIonBalance({ tokenAddress: feeConfig.ionTokenAddress, account: address })
      .then((balance) => {
        if (!cancelled) setFeeBalance(balance);
      })
      .catch(() => {
        if (!cancelled) setFeeError('Could not read ION balance from wallet.');
      })
      .finally(() => {
        if (!cancelled) setIsBalanceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, feeReady, getIonBalance, isConnected, onBnb]);

  function updateField(field: keyof LaunchFormState, value: string) {
    const nextValue = field === 'symbol' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) return;
    setImagePreview(URL.createObjectURL(file));
  }

  async function submitLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady || !acknowledged) return;
    setIsPreparingPacket(true);

    const metadata: { status: 'pinned' | 'unconfigured' | 'local'; uri?: string } = await pinLaunchMetadata({
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      description: form.description.trim(),
      website: normalizeOptionalUrl(form.website),
      x: normalizeOptionalUrl(form.x),
      telegram: normalizeOptionalUrl(form.telegram),
    }).catch(() => ({ status: 'local' as const }));

    const nextPacket: LaunchPacket = {
      id: loadedPacketId ?? crypto.randomUUID(),
      createdAt: loadedPacketId && launchPacket?.id === loadedPacketId ? launchPacket.createdAt : new Date().toISOString(),
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      description: form.description.trim(),
      website: normalizeOptionalUrl(form.website),
      x: normalizeOptionalUrl(form.x),
      telegram: normalizeOptionalUrl(form.telegram),
      imagePreview,
      feeTxHash,
      metadataUri: metadata.uri,
      metadataStatus: metadata.status === 'pinned' ? 'pinned' : metadata.status === 'unconfigured' ? 'unconfigured' : 'local',
    };

    setLaunchPacket(nextPacket);
    saveLaunchPacket(nextPacket);
    setIsPreparingPacket(false);
  }

  async function collectFee() {
    if (!feeConfig.ionTokenAddress || !feeConfig.treasuryAddress) return;
    setIsFeePending(true);
    setFeeError(undefined);
    try {
      const hash = await sendIonFee({
        tokenAddress: feeConfig.ionTokenAddress,
        treasuryAddress: feeConfig.treasuryAddress,
        amountIon: feeConfig.platformFeeIon,
        decimals: feeConfig.ionDecimals,
      });
      setFeeTxHash(hash);
      if (launchPacket) {
        const nextPacket = { ...launchPacket, feeTxHash: hash };
        setLaunchPacket(nextPacket);
        saveLaunchPacket(nextPacket);
      }
    } catch (error) {
      setFeeError(error instanceof Error ? error.message : 'ION fee transaction was not completed.');
    } finally {
      setIsFeePending(false);
    }
  }

  if (step === 'type') {
    return (
      <section className="page-section wizard-shell">
        <div className="wizard-heading">
          <span className="step-label">Step 1 of 2 · Launch type</span>
          <h1>What are you launching?</h1>
          <p>Pick the workspace that fits your token. Each path keeps creation, fee status, and market setup inside ION Launch.</p>
        </div>

        <div className="type-grid">
          <button className="type-card" type="button" onClick={() => setStep('form')}>
            <span className="type-icon blue"><Rocket size={24} /></span>
            <span>
              <strong>New Token Launch</strong>
              <small>Prepare a token, socials, fee status, and launch packet</small>
            </span>
            <ArrowRight size={20} />
            <ul>
              <li>Token profile and square media</li>
              <li>ION-denominated platform fee</li>
              <li>Curve, trade, and market pages after launch</li>
              <li>Wallet-confirmed execution flow</li>
            </ul>
          </button>

          <button className="type-card" type="button" onClick={() => setStep('form')}>
            <span className="type-icon red"><Flame size={24} /></span>
            <span>
              <strong>Community Campaign</strong>
              <small>Launch with stronger ION burn and treasury narrative</small>
            </span>
            <ArrowRight size={20} />
            <ul>
              <li>Higher visibility launch profile</li>
              <li>Manual burn accounting at MVP stage</li>
              <li>Creator and treasury transparency</li>
              <li>Designed for ecosystem-first launches</li>
            </ul>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section launch-layout">
      <div className="wizard-heading narrow">
        <button className="back-link" type="button" onClick={() => setStep('type')}>
          <ArrowLeft size={17} />
          Back
        </button>
        <span className="step-label">Step 2 of 2 · Token profile</span>
        <h1>Configure your launch.</h1>
      </div>

      <div className="launch-grid">
        <form className="launch-form" onSubmit={submitLaunch}>
          <div className="form-row">
            <label>
              Token name
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Ice Signal" />
            </label>
            <label>
              Ticker
              <input maxLength={12} value={form.symbol} onChange={(event) => updateField('symbol', event.target.value)} placeholder="SIGNAL" />
            </label>
          </div>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe the token, community, and launch intent."
            />
          </label>

          <label className="upload-box">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} />
            {imagePreview ? (
              <img src={imagePreview} alt="" />
            ) : (
              <span className="upload-empty">
                <ImagePlus size={22} />
                <strong>Choose square image</strong>
                <small>PNG / JPG / WebP, under 5 MB</small>
              </span>
            )}
          </label>

          <div className="form-row">
            <label>
              Website
              <input value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://" />
            </label>
            <label>
              X / Twitter
              <input value={form.x} onChange={(event) => updateField('x', event.target.value)} placeholder="https://x.com/" />
            </label>
          </div>

          <label>
            Telegram
            <input value={form.telegram} onChange={(event) => updateField('telegram', event.target.value)} placeholder="https://t.me/" />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            I understand this interface does not guarantee token success, liquidity, moderation, or refunds.
          </label>

          <button className="button button-primary full-width" type="submit" disabled={!formReady || !acknowledged || isPreparingPacket}>
            <Rocket size={18} />
            {isPreparingPacket ? 'Preparing packet' : 'Prepare launch packet'}
          </button>

          {launchPacket ? (
            <div className="launch-packet">
              <div className="side-card-title">
                <ClipboardCheck size={20} />
                <strong>Launch packet ready</strong>
              </div>
              <div className="packet-grid">
                <span>Name <strong>{launchPacket.name}</strong></span>
                <span>Ticker <strong>${launchPacket.symbol}</strong></span>
                <span>Fee <strong>{launchPacket.feeTxHash ? 'Confirmed' : feeReady ? 'Pending' : 'Not configured'}</strong></span>
                <span>Metadata <strong>{launchPacket.metadataStatus === 'pinned' ? 'Pinned' : 'Local'}</strong></span>
              </div>
              <p>
                Your token profile, socials, media preview, and fee status are saved in this browser for the final
                execution step.
              </p>
              <Link className="button button-muted full-width" to={`/studio/${launchPacket.id}`}>
                Open in Studio
              </Link>
            </div>
          ) : null}
        </form>

        <aside className="launch-side">
          <div className="side-card studio-status-card">
            <div className="side-card-title">
              <Sparkles size={20} />
              <strong>Studio mode</strong>
            </div>
            <p>Prepare metadata, socials, fee status, and wallet readiness from one native workspace.</p>
            <div className="studio-pulse">
              <span />
              <strong>Launch workspace active</strong>
            </div>
          </div>

          <div className="side-card">
            <div className="side-card-title">
              <ShieldCheck size={20} />
              <strong>Pre-flight status</strong>
            </div>
            <ul className="check-list">
              <li className={formReady ? 'done' : ''}>Token details pass basic validation</li>
              <li className={isConnected ? 'done' : ''}>{isConnected ? `Wallet connected: ${address?.slice(0, 6)}...` : 'Wallet not connected'}</li>
              <li className={onBnb ? 'done' : ''}>{isConnected ? 'BNB Chain selected' : 'Connect wallet to check network'}</li>
              <li className={feeReady ? 'done' : ''}>{feeReady ? 'ION fee config verified' : 'ION fee config pending'}</li>
              <li className={feeSatisfied ? 'done' : ''}>{feeSatisfied ? 'Fee status ready' : 'ION fee not paid yet'}</li>
            </ul>
            {isConnected && !onBnb ? (
              <button className="button button-muted full-width" type="button" onClick={() => void switchToBnb()}>
                Switch to BNB Chain
              </button>
            ) : null}
          </div>

          <div className="side-card">
            <div className="side-card-title">
              <WalletCards size={20} />
              <strong>ION platform fee</strong>
            </div>
            <p>
              Fee collection is designed as a normal wallet-confirmed ION transfer. Treasury and burn reporting stay
              transparent and reviewable.
            </p>
            <div className="fee-box">
              <span>Configured fee</span>
              <strong>{feeConfig.platformFeeIon} ION</strong>
            </div>
            <div className="fee-box">
              <span>Wallet balance</span>
              <strong>{isBalanceLoading ? 'Checking...' : formattedFeeBalance}</strong>
            </div>
            <button
              className="button button-primary full-width"
              type="button"
              disabled={!isConnected || !onBnb || !feeReady || !hasFeeBalance || isFeePending}
              onClick={() => void collectFee()}
            >
              {isFeePending ? 'Confirm in wallet' : 'Pay ION fee'}
            </button>
            {feeError ? <div className="fee-error">{feeError}</div> : null}
            {feeTxHash ? (
              <a className="tx-link" href={externalLinks.bscScanTx(feeTxHash)} target="_blank" rel="noreferrer">
                <CheckCircle2 size={16} />
                View fee transaction
              </a>
            ) : null}
          </div>
          <div className="external-card passive-card">
            <Tag size={16} />
            Route verification mode
          </div>
          <div className="side-card">
            <div className="side-card-title">
              <Rocket size={20} />
              <strong>Execution readiness</strong>
            </div>
            <ul className="check-list">
              <li className={launchPacket ? 'done' : ''}>Launch packet prepared</li>
              <li className={feeSatisfied ? 'done' : ''}>Platform fee status ready</li>
              <li className={launchExecutionEnabled ? 'done' : ''}>
                {launchExecutionEnabled ? 'Launch execution enabled by config' : 'Verified launch route pending'}
              </li>
            </ul>
            <button className="button button-primary full-width" type="button" disabled>
              {launchExecutionEnabled ? 'Executor adapter pending' : 'Route verification pending'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function normalizeOptionalUrl(value: string) {
  const text = value.trim();
  if (!text) return undefined;
  return text.startsWith('http://') || text.startsWith('https://') ? text : `https://${text}`;
}
