import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, ImagePlus, Rocket, ShieldCheck, SlidersHorizontal, WalletCards } from 'lucide-react';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { externalLinks, feeConfig, featureFlags } from '../config/app';
import { getLaunchPacket, saveLaunchPacket } from '../lib/launchPackets';
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
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState<string>();
  const [advanced, setAdvanced] = useState(false);
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
    if (!packetId) return;
    const packet = getLaunchPacket(packetId);

    if (!packet) return;

    setLaunchPacket(packet);
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
    setAdvanced(Boolean(packet.website || packet.x || packet.telegram));
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
    setLoadedPacketId(nextPacket.id);
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

  return (
    <section className="page-section launch-simple">
      <div className="launch-simple-head">
        <span className="eyebrow">Launch</span>
        <h1>Create a coin without contract code.</h1>
        <p>Start with the profile people see first. Wallet, fee, metadata, and route readiness stay clear but secondary.</p>
      </div>

      <div className="launch-simple-grid">
        <form className="launch-form launch-form-simple" onSubmit={submitLaunch}>
          <div className="launch-step-row">
            <span>1</span>
            <strong>Coin basics</strong>
          </div>
          <label className="upload-box launch-upload">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} />
            {imagePreview ? (
              <img src={imagePreview} alt="" />
            ) : (
              <span className="upload-empty">
                <ImagePlus size={22} />
                <strong>Upload square image</strong>
                <small>PNG / JPG / WebP, under 5 MB</small>
              </span>
            )}
          </label>

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
            Short story
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="What is this coin, why should the community care, and what makes it fun?"
            />
          </label>

          <button className={`advanced-toggle ${advanced ? 'active' : ''}`} type="button" onClick={() => setAdvanced((value) => !value)}>
            <SlidersHorizontal size={16} />
            {advanced ? 'Hide optional links' : 'Add website and socials'}
          </button>

          {advanced ? (
            <div className="advanced-fields">
              <label>
                Website
                <input value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://" />
              </label>
              <label>
                X / Twitter
                <input value={form.x} onChange={(event) => updateField('x', event.target.value)} placeholder="https://x.com/" />
              </label>
              <label>
                Telegram
                <input value={form.telegram} onChange={(event) => updateField('telegram', event.target.value)} placeholder="https://t.me/" />
              </label>
            </div>
          ) : null}

          <div className="launch-step-row">
            <span>2</span>
            <strong>Confirm readiness</strong>
          </div>
          <label className="checkbox-row soft-check">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            I understand launches are public, user-signed, and market performance is not guaranteed.
          </label>

          <button className="button button-primary full-width" type="submit" disabled={!formReady || !acknowledged || isPreparingPacket}>
            <Rocket size={18} />
            {isPreparingPacket ? 'Preparing' : launchPacket ? 'Update launch profile' : 'Prepare launch profile'}
          </button>

          {launchPacket ? (
            <div className="launch-packet">
              <div className="side-card-title">
                <ClipboardCheck size={20} />
                <strong>Profile ready</strong>
              </div>
              <p>Your launch profile is saved in this browser and ready for wallet, fee, and execution checks.</p>
              <Link className="button button-muted full-width" to={`/studio/${launchPacket.id}`}>
                Open creator studio
              </Link>
            </div>
          ) : null}
        </form>

        <aside className="launch-preview-rail">
          <div className="coin-preview-card">
            <div className="coin-preview-media">
              {imagePreview ? <img src={imagePreview} alt="" /> : <ImagePlus size={28} />}
            </div>
            <span>Preview</span>
            <h2>{form.name.trim() || 'Your coin'}</h2>
            <strong>${form.symbol.trim() || 'TICKER'}</strong>
            <p>{form.description.trim() || 'A short community story will appear here as you type.'}</p>
          </div>

          <div className="side-card">
            <div className="side-card-title">
              <ShieldCheck size={20} />
              <strong>Pre-flight</strong>
            </div>
            <ul className="check-list">
              <li className={formReady ? 'done' : ''}>Name, ticker, and story are ready</li>
              <li className={isConnected ? 'done' : ''}>{isConnected ? `Wallet ${address?.slice(0, 6)}... connected` : 'Wallet connection pending'}</li>
              <li className={onBnb ? 'done' : ''}>{isConnected ? 'BNB Chain selected' : 'Network checked after wallet connect'}</li>
              <li className={feeSatisfied ? 'done' : ''}>{feeSatisfied ? 'Platform fee ready' : 'Platform fee pending'}</li>
            </ul>
            {isConnected && !onBnb ? (
              <button className="button button-muted full-width" type="button" onClick={() => void switchToBnb()}>
                Switch to BNB Chain
              </button>
            ) : null}
          </div>

          <div className="side-card fee-card-simple">
            <div className="side-card-title">
              <WalletCards size={20} />
              <strong>ION fee</strong>
            </div>
            <div className="fee-box">
              <span>Fee</span>
              <strong>{feeConfig.platformFeeIon} ION</strong>
            </div>
            <div className="fee-box">
              <span>Balance</span>
              <strong>{isBalanceLoading ? 'Checking...' : formattedFeeBalance}</strong>
            </div>
            <button
              className="button button-primary full-width"
              type="button"
              disabled={!isConnected || !onBnb || !feeReady || !hasFeeBalance || isFeePending}
              onClick={() => void collectFee()}
            >
              {isFeePending ? 'Confirm in wallet' : feeTxHash ? 'Fee paid' : 'Pay fee'}
            </button>
            {feeError ? <div className="fee-error">{feeError}</div> : null}
            {feeTxHash ? (
              <a className="tx-link" href={externalLinks.bscScanTx(feeTxHash)} target="_blank" rel="noreferrer">
                <CheckCircle2 size={16} />
                View transaction
              </a>
            ) : null}
          </div>

          <div className="execution-card">
            <span>Final step</span>
            <strong>{launchExecutionEnabled ? 'Execution enabled' : 'Route verification pending'}</strong>
            <p>The public launch button stays locked until the verified execution adapter is enabled.</p>
            <button className="button button-muted full-width" type="button" disabled>
              Launch route locked
              <ArrowRight size={16} />
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
