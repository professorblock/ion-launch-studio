# Verification Checklist

This checklist must be completed before enabling public transactional flows.

## BNB Chain / Four Meme

- [x] Confirm Four Meme exchange proxy on BNB Chain: `0x5c952063c7fc8610ffdb798152d69f0b9550762b`.
- [ ] Confirm official Four Meme token creation integration path.
- [ ] Confirm whether direct launch transaction calldata is officially documented.
- [ ] Confirm safe external handoff URL format if direct launch is deferred.

## ION on BNB Chain

- [x] Confirm BSC-side ION token contract address: `0xe1ab61f7b093435204df32f5b3a405de55445ea8`.
- [x] Confirm token decimals: 9.
- [ ] Confirm standard ERC-20 `transfer` behavior.
- [ ] Confirm treasury wallet address.
- [ ] Confirm platform fee amount.
- [ ] Confirm burn method or burn address.

## Data

- [x] Confirm Bitquery documents Four Meme data coverage for BNB Chain.
- [ ] Confirm Bitquery API token and quota.
- [ ] Confirm `/api/bitquery` returns normalized live tokens on staging.
- [ ] Confirm `/api/bitquery` returns normalized token-detail trades on staging.
- [ ] Confirm frontend bundle does not expose `BITQUERY_API_TOKEN`.

## Metadata

- [ ] Confirm whether launch metadata should be pinned by our app or handled by the verified launch route.
- [ ] If app-side pinning is used, configure `PINATA_JWT` server-side only.
- [ ] Confirm image pinning with PNG, JPG, and WebP files under 1.5 MB.
- [ ] Confirm pinned metadata format against the final launch route requirements.
- [ ] Confirm frontend bundle does not expose `PINATA_JWT`.

## Burn Board

- [ ] Confirm BSC-side ION token address for burn tracking.
- [ ] Confirm treasury address for fee receipts.
- [ ] Confirm burn address list.
- [ ] Confirm `/api/bitquery` `burn-dashboard` returns live transfer data on staging.
- [ ] Confirm burn amounts and treasury amounts against BNBScan.

## Launch Readiness

- [ ] Test wrong-network flow.
- [ ] Test insufficient ION balance flow.
- [ ] Test rejected transaction flow.
- [ ] Test submitted fee transfer flow and reconcile hash against BNBScan.
- [ ] Review all risk and fee copy.
- [ ] Keep `VITE_ENABLE_LAUNCH_EXECUTION=false` until route calldata is verified.
- [ ] Keep `VITE_ENABLE_TRADE_EXECUTION=false` until trade calldata and slippage behavior are verified.
