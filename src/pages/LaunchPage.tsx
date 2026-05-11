import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardCheck, ImagePlus, Rocket, ShieldCheck, SlidersHorizontal, WalletCards } from 'lucide-react';
import { formatUnits, parseUnits, type Hex } from 'viem';
import { chainConfig, externalLinks, feeConfig, featureFlags } from '../config/app';
import { getLaunchPacket, saveLaunchPacket } from '../lib/launchPackets';
import { pinLaunchMetadata } from '../lib/metadata';
import { verifyFeeTransaction } from '../lib/feeVerification';
import { loginFourMeme, prepareFourMemeCreateToken, requestFourMemeNonce } from '../lib/fourMemeLaunch';
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

const maxImageBytes = 1_500_000;

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
  const [feeStatus, setFeeStatus] = useState<LaunchPacket['feeStatus']>();
  const [feeVerificationStatus, setFeeVerificationStatus] = useState<LaunchPacket['feeVerificationStatus']>();
  const [feeSubmittedAt, setFeeSubmittedAt] = useState<string>();
  const [feeConfirmedAt, setFeeConfirmedAt] = useState<string>();
  const [feeBlockNumber, setFeeBlockNumber] = useState<string>();
  const [feeRecoveryHash, setFeeRecoveryHash] = useState('');
  const [launchTxHash, setLaunchTxHash] = useState<Hex>();
  const [launchStatus, setLaunchStatus] = useState<LaunchPacket['launchStatus']>();
  const [launchError, setLaunchError] = useState<string>();
  const [isLaunching, setIsLaunching] = useState(false);
  const [imageError, setImageError] = useState<string>();
  const [feeError, setFeeError] = useState<string>();
  const [feeBalance, setFeeBalance] = useState<bigint>();
  const [launchPacket, setLaunchPacket] = useState<LaunchPacket>();
  const [loadedPacketId, setLoadedPacketId] = useState<string>();
  const [isPreparingPacket, setIsPreparingPacket] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isFeePending, setIsFeePending] = useState(false);
  const { address, isConnected, chainId, switchToBnb, getIonBalance, sendIonFee, waitForTransactionReceipt, signMessage, createFourMemeToken } = useWallet();

  const formReady = useMemo(() => {
    return form.name.trim().length >= 2 && /^[A-Z0-9]{2,12}$/.test(form.symbol.trim()) && form.description.trim().length >= 20;
  }, [form]);

  const feeReady = Boolean(feeConfig.ionTokenAddress && feeConfig.treasuryAddress && Number(feeConfig.platformFeeIon) > 0);
  const onBnb = isConnected && chainId === 56;
  const feeAmount = getConfiguredFeeAmount();
  const hasFeeBalance = feeBalance !== undefined && feeAmount > 0n && feeBalance >= feeAmount;
  const formattedFeeBalance = feeBalance === undefined ? 'Not checked' : `${formatUnits(feeBalance, feeConfig.ionDecimals)} ION`;
  const currentFeeStatus = feeStatus ?? launchPacket?.feeStatus ?? (feeTxHash || launchPacket?.feeTxHash ? 'submitted' : undefined);
  const currentFeeVerificationStatus = feeVerificationStatus ?? launchPacket?.feeVerificationStatus;
  const feeSatisfied = feeReady && currentFeeStatus === 'confirmed' && currentFeeVerificationStatus === 'verified';
  const launchExecutionEnabled = featureFlags.launchExecution;
  const hasLaunchImage = Boolean(imagePreview?.startsWith('data:image/'));
  const launchReadyChecks = [
    { label: 'Execution is enabled on this preview', ready: launchExecutionEnabled },
    { label: 'Launch profile is saved', ready: Boolean(launchPacket) },
    { label: 'Square image is uploaded', ready: hasLaunchImage },
    { label: 'ION fee is verified', ready: feeSatisfied },
  ];
  const canCreateToken = launchReadyChecks.every((check) => check.ready) && !isLaunching;
  const canSubmitOrCheckFee = isConnected && onBnb && feeReady && !isFeePending && currentFeeStatus !== 'confirmed' && (feeTxHash ? true : hasFeeBalance);
  const feeButtonLabel = isFeePending
    ? feeTxHash
      ? 'Checking confirmation'
      : 'Confirm in wallet'
    : currentFeeStatus === 'confirmed'
      ? 'Fee confirmed'
      : feeTxHash
        ? 'Check confirmation'
        : 'Pay fee';

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
    setFeeStatus(packet.feeStatus ?? (packet.feeTxHash ? 'submitted' : undefined));
    setFeeVerificationStatus(packet.feeVerificationStatus);
    setFeeSubmittedAt(packet.feeSubmittedAt);
    setFeeConfirmedAt(packet.feeConfirmedAt);
    setFeeBlockNumber(packet.feeBlockNumber);
    setLaunchTxHash(packet.launchTxHash);
    setLaunchStatus(packet.launchStatus);
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
    event.target.value = '';
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Use PNG, JPG, or WebP.');
      return;
    }
    if (file.size > maxImageBytes) {
      setImageError('Use an image under 1.5 MB for safe metadata upload.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
        setImageError(undefined);
      }
    };
    reader.onerror = () => setImageError('Could not read that image.');
    reader.readAsDataURL(file);
  }

  async function submitLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady || !acknowledged) return;
    setIsPreparingPacket(true);

    const metadata: {
      status: 'pinned' | 'unconfigured' | 'local';
      uri?: string;
      gatewayUrl?: string;
      imageUri?: string;
      imageGatewayUrl?: string;
    } = await pinLaunchMetadata({
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      description: form.description.trim(),
      website: normalizeOptionalUrl(form.website),
      x: normalizeOptionalUrl(form.x),
      telegram: normalizeOptionalUrl(form.telegram),
      imageDataUrl: imagePreview?.startsWith('data:image/') ? imagePreview : undefined,
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
      imageUri: metadata.imageUri,
      imageGatewayUrl: metadata.imageGatewayUrl,
      feeTxHash,
      feeStatus,
      feeVerificationStatus,
      feeSubmittedAt,
      feeConfirmedAt,
      feeBlockNumber,
      metadataUri: metadata.uri,
      metadataGatewayUrl: metadata.gatewayUrl,
      metadataStatus: metadata.status === 'pinned' ? 'pinned' : metadata.status === 'unconfigured' ? 'unconfigured' : 'local',
      launchTxHash,
      launchStatus,
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
      const hash = feeTxHash ?? await sendIonFee({
        tokenAddress: feeConfig.ionTokenAddress,
        treasuryAddress: feeConfig.treasuryAddress,
        amountIon: feeConfig.platformFeeIon,
        decimals: feeConfig.ionDecimals,
      });
      const submittedAt = feeSubmittedAt ?? new Date().toISOString();
      updateFeeRecord({
        feeTxHash: hash,
        feeStatus: 'submitted',
        feeSubmittedAt: submittedAt,
        feeAmountIon: feeConfig.platformFeeIon,
        feeTokenAddress: feeConfig.ionTokenAddress,
        feeTreasuryAddress: feeConfig.treasuryAddress,
      });

      const receipt = await waitForTransactionReceipt(hash);
      if (receipt.status === 'success') {
        await verifySubmittedFee(hash, submittedAt, receipt.blockNumber?.toString());
      } else if (receipt.status === 'reverted') {
        updateFeeRecord({
          feeTxHash: hash,
          feeStatus: 'reverted',
          feeVerificationStatus: 'mismatch',
          feeVerificationMessage: 'Transaction reverted before the treasury transfer could complete.',
          feeSubmittedAt: submittedAt,
          feeAmountIon: feeConfig.platformFeeIon,
          feeTokenAddress: feeConfig.ionTokenAddress,
          feeTreasuryAddress: feeConfig.treasuryAddress,
        });
        setFeeError('The fee transaction reverted. No launch fee was confirmed.');
      } else {
        updateFeeRecord({
          feeTxHash: hash,
          feeStatus: 'submitted',
          feeVerificationStatus: 'unchecked',
          feeVerificationMessage: 'Wallet receipt was still pending.',
          feeSubmittedAt: submittedAt,
          feeAmountIon: feeConfig.platformFeeIon,
          feeTokenAddress: feeConfig.ionTokenAddress,
          feeTreasuryAddress: feeConfig.treasuryAddress,
        });
        setFeeError('Transaction submitted. Confirmation is still pending; check again shortly.');
      }
    } catch (error) {
      setFeeError(error instanceof Error ? error.message : 'ION fee transaction was not completed.');
    } finally {
      setIsFeePending(false);
    }
  }

  async function verifySubmittedFee(hash: Hex, submittedAt = feeSubmittedAt ?? new Date().toISOString(), fallbackBlockNumber?: string) {
    setIsFeePending(true);
    setFeeError(undefined);
    try {
      const result = await verifyFeeTransaction(hash);
      if (result.status === 'pending') {
        updateFeeRecord({
          feeTxHash: hash,
          feeStatus: 'submitted',
          feeVerificationStatus: 'unchecked',
          feeVerificationMessage: 'Transaction is still pending on BNB Chain.',
          feeSubmittedAt: submittedAt,
          feeAmountIon: feeConfig.platformFeeIon,
          feeTokenAddress: feeConfig.ionTokenAddress,
          feeTreasuryAddress: feeConfig.treasuryAddress,
        });
        setFeeError('Transaction submitted. Confirmation is still pending; check again shortly.');
        return;
      }

      if (result.status === 'reverted') {
        updateFeeRecord({
          feeTxHash: hash,
          feeStatus: 'reverted',
          feeVerificationStatus: 'mismatch',
          feeVerificationMessage: 'Transaction reverted on BNB Chain.',
          feeSubmittedAt: submittedAt,
          feeBlockNumber: result.blockNumber ?? fallbackBlockNumber,
          feeAmountIon: feeConfig.platformFeeIon,
          feeTokenAddress: feeConfig.ionTokenAddress,
          feeTreasuryAddress: feeConfig.treasuryAddress,
        });
        setFeeError('The fee transaction reverted. No launch fee was confirmed.');
        return;
      }

      if (!result.valid) {
        updateFeeRecord({
          feeTxHash: hash,
          feeStatus: 'submitted',
          feeVerificationStatus: 'mismatch',
          feeVerificationMessage: result.reason ?? 'Transaction did not match the configured ION treasury transfer.',
          feeSubmittedAt: submittedAt,
          feeBlockNumber: result.blockNumber ?? fallbackBlockNumber,
          feeAmountIon: feeConfig.platformFeeIon,
          feeTokenAddress: feeConfig.ionTokenAddress,
          feeTreasuryAddress: feeConfig.treasuryAddress,
        });
        setFeeError('Transaction confirmed, but it did not match the configured ION fee transfer.');
        return;
      }

      updateFeeRecord({
        feeTxHash: hash,
        feeStatus: 'confirmed',
        feeVerificationStatus: 'verified',
        feeVerificationMessage: 'Verified against BNB Chain transfer logs.',
        feeSubmittedAt: submittedAt,
        feeConfirmedAt: new Date().toISOString(),
        feeBlockNumber: result.blockNumber ?? fallbackBlockNumber,
        feeAmountIon: feeConfig.platformFeeIon,
        feeTokenAddress: feeConfig.ionTokenAddress,
        feeTreasuryAddress: feeConfig.treasuryAddress,
      });
    } catch (error) {
      updateFeeRecord({
        feeTxHash: hash,
        feeStatus: 'submitted',
        feeVerificationStatus: 'unchecked',
        feeVerificationMessage: 'Verification service was unavailable.',
        feeSubmittedAt: submittedAt,
        feeAmountIon: feeConfig.platformFeeIon,
        feeTokenAddress: feeConfig.ionTokenAddress,
        feeTreasuryAddress: feeConfig.treasuryAddress,
      });
      setFeeError(error instanceof Error ? error.message : 'Fee verification service unavailable.');
    } finally {
      setIsFeePending(false);
    }
  }

  async function recoverPaidFee() {
    const hash = feeRecoveryHash.trim() as Hex;
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      setFeeError('Paste a valid BNB Chain transaction hash.');
      return;
    }
    await verifySubmittedFee(hash, new Date().toISOString());
    setFeeTxHash(hash);
  }

  function updateFeeRecord(record: Partial<LaunchPacket>) {
    if (record.feeTxHash) setFeeTxHash(record.feeTxHash);
    if (record.feeStatus) setFeeStatus(record.feeStatus);
    if (record.feeVerificationStatus) setFeeVerificationStatus(record.feeVerificationStatus);
    if (record.feeSubmittedAt) setFeeSubmittedAt(record.feeSubmittedAt);
    if (record.feeConfirmedAt) setFeeConfirmedAt(record.feeConfirmedAt);
    if (record.feeBlockNumber) setFeeBlockNumber(record.feeBlockNumber);

    setLaunchPacket((currentPacket) => {
      if (!currentPacket) return currentPacket;
      const nextPacket = { ...currentPacket, ...record };
      saveLaunchPacket(nextPacket);
      return nextPacket;
    });
  }

  async function executeLaunch() {
    if (!launchPacket || !address || !feeSatisfied || !hasLaunchImage) return;
    setIsLaunching(true);
    setLaunchError(undefined);
    try {
      const nonce = await requestFourMemeNonce(address);
      const signature = await signMessage(`You are sign in Meme ${nonce}`);
      const accessToken = await loginFourMeme(address, signature);
      const prepared = await prepareFourMemeCreateToken(accessToken, {
        name: launchPacket.name,
        symbol: launchPacket.symbol,
        description: launchPacket.description,
        website: launchPacket.website,
        x: launchPacket.x,
        telegram: launchPacket.telegram,
        imageDataUrl: imagePreview,
      });
      const hash = await createFourMemeToken({
        tokenManager: chainConfig.fourMemeProxy,
        createArg: prepared.createArg,
        signature: prepared.signature,
      });
      const submittedAt = new Date().toISOString();
      const submittedPacket: LaunchPacket = {
        ...launchPacket,
        fourMemeImageUrl: prepared.imageUrl,
        launchTxHash: hash,
        launchSubmittedAt: submittedAt,
        launchStatus: 'submitted',
      };
      setLaunchPacket(submittedPacket);
      setLaunchTxHash(hash);
      setLaunchStatus('submitted');
      saveLaunchPacket(submittedPacket);

      const receipt = await waitForTransactionReceipt(hash, { timeoutMs: 180_000 });
      const confirmedPacket: LaunchPacket = {
        ...submittedPacket,
        launchStatus: receipt.status === 'success' ? 'confirmed' : receipt.status === 'reverted' ? 'failed' : 'submitted',
        launchConfirmedAt: receipt.status === 'success' ? new Date().toISOString() : undefined,
        launchBlockNumber: receipt.blockNumber?.toString(),
      };
      setLaunchPacket(confirmedPacket);
      setLaunchStatus(confirmedPacket.launchStatus);
      saveLaunchPacket(confirmedPacket);
      if (receipt.status === 'reverted') setLaunchError('The token creation transaction reverted.');
      if (receipt.status === 'pending') setLaunchError('Token creation was submitted but is still pending.');
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Token creation was not completed.');
    } finally {
      setIsLaunching(false);
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
                <small>PNG / JPG / WebP, under 1.5 MB</small>
              </span>
            )}
          </label>
          {imageError ? <div className="fee-error">{imageError}</div> : null}

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
              <li className={feeSatisfied ? 'done' : ''}>
                {feeSatisfied
                  ? 'Platform fee confirmed'
                  : !feeReady
                    ? 'Platform fee configuration pending'
                  : currentFeeVerificationStatus === 'mismatch'
                    ? 'Platform fee needs review'
                    : currentFeeStatus === 'submitted'
                      ? 'Platform fee verification pending'
                      : 'Platform fee pending'}
              </li>
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
              <strong>{feeReady ? `${feeConfig.platformFeeIon} ION` : 'Not configured'}</strong>
            </div>
            <div className="fee-box">
              <span>Balance</span>
              <strong>{isBalanceLoading ? 'Checking...' : formattedFeeBalance}</strong>
            </div>
            <button
              className="button button-primary full-width"
              type="button"
              disabled={!canSubmitOrCheckFee}
              onClick={() => void collectFee()}
            >
              {feeButtonLabel}
            </button>
            {!feeSatisfied ? (
              <div className="fee-recovery">
                <label>
                  Already paid?
                  <input
                    value={feeRecoveryHash}
                    onChange={(event) => setFeeRecoveryHash(event.target.value.trim())}
                    placeholder="Paste fee transaction hash"
                  />
                </label>
                <button
                  className="button button-muted full-width"
                  type="button"
                  disabled={isFeePending || !feeRecoveryHash.trim()}
                  onClick={() => void recoverPaidFee()}
                >
                  Verify paid fee
                </button>
              </div>
            ) : null}
            {feeError ? <div className="fee-error">{feeError}</div> : null}
            {currentFeeStatus ? (
              <div className="fee-box">
                <span>Status</span>
                <strong>{currentFeeStatus === 'confirmed' ? 'Confirmed' : currentFeeStatus === 'reverted' ? 'Reverted' : 'Submitted'}</strong>
              </div>
            ) : null}
            {currentFeeVerificationStatus ? (
              <div className="fee-box">
                <span>Verification</span>
                <strong>{currentFeeVerificationStatus === 'verified' ? 'Verified' : currentFeeVerificationStatus === 'mismatch' ? 'Needs review' : 'Pending'}</strong>
              </div>
            ) : null}
            {feeConfirmedAt ? (
              <div className="fee-box">
                <span>Confirmed</span>
                <strong>{feeBlockNumber ? `Block ${feeBlockNumber}` : 'Recorded'}</strong>
              </div>
            ) : null}
            {feeTxHash ? (
              <a className="tx-link" href={externalLinks.bscScanTx(feeTxHash)} target="_blank" rel="noreferrer">
                <CheckCircle2 size={16} />
                View transaction
              </a>
            ) : null}
          </div>

          <div className="execution-card">
            <span>Final step</span>
            <strong>{launchStatus === 'confirmed' ? 'Launch confirmed' : launchExecutionEnabled ? 'Create on BNB Chain' : 'Route verification pending'}</strong>
            <p>
              {launchExecutionEnabled
                ? 'Uses the official token creation signature flow and asks your wallet to submit the createToken transaction.'
                : 'The public launch button stays locked until the verified execution adapter is enabled.'}
            </p>
            <button
              className={`button ${launchExecutionEnabled ? 'button-primary' : 'button-muted'} full-width`}
              type="button"
              disabled={!canCreateToken}
              onClick={() => void executeLaunch()}
            >
              {isLaunching ? 'Confirming launch' : launchTxHash ? 'Launch submitted' : launchExecutionEnabled ? 'Create token' : 'Launch route locked'}
              <ArrowRight size={16} />
            </button>
            {!canCreateToken ? (
              <ul className="check-list launch-ready-list">
                {launchReadyChecks.map((check) => (
                  <li key={check.label} className={check.ready ? 'done' : ''}>{check.label}</li>
                ))}
              </ul>
            ) : null}
            {launchError ? <div className="fee-error">{launchError}</div> : null}
            {launchTxHash ? (
              <a className="tx-link" href={externalLinks.bscScanTx(launchTxHash)} target="_blank" rel="noreferrer">
                <CheckCircle2 size={16} />
                View launch transaction
              </a>
            ) : null}
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
