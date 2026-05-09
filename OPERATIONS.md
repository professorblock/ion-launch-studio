# Operations

This project is designed to run with minimal infrastructure: a static Vite frontend plus serverless API routes.

## Staging Setup

1. Deploy the repository to Vercel.
2. Configure environment variables in the Vercel project settings.
3. Deploy from the staging branch first.
4. Verify `/api/bitquery` returns `source: "bitquery"` before relying on live market data.
5. Verify `/api/metadata` returns `status: "pinned"` only if app-side metadata pinning is enabled.
6. Run `npm run validate:env -- --strict` with production environment loaded before public launch.
7. Run `npm run readiness` before pushing a release candidate.
8. Check `/status` and `/readiness` after deployment and keep launch/trade execution disabled until route verification is complete.

## Required Environment

- `VITE_APP_NAME`
- `VITE_BNB_CHAIN_ID`
- `VITE_FOUR_MEME_PROXY`
- `VITE_ION_TOKEN_BSC_ADDRESS`
- `VITE_ION_TOKEN_DECIMALS`
- `VITE_TREASURY_ADDRESS`
- `VITE_PLATFORM_FEE_ION`
- `VITE_BITQUERY_PROXY_PATH`
- `BITQUERY_API_TOKEN`
- `BITQUERY_GRAPHQL_URL`
- `FOUR_MEME_PROXY`
- `ION_TOKEN_BSC_ADDRESS`
- `TREASURY_ADDRESS`
- `ION_BURN_ADDRESSES`

## Optional Environment

- `PINATA_JWT`
- `ION_PRICE_USD`

Use `PINATA_JWT` only if ION Launch should pin metadata directly. Keep it server-side. Do not create a `VITE_` version.
Use `ION_PRICE_USD` only as an operational display fallback until live pricing is connected.

The current public BSC-side ION token reference used in `.env.example` is
`0xe1ab61f7b093435204df32f5b3a405de55445ea8` with 9 decimals. Reconfirm it from official market/explorer sources before
production fee collection.

## Fee Operations

The MVP fee is a user-signed ION ERC-20 transfer to the treasury wallet. The app does not split or burn funds
automatically.

Suggested initial operating process:

1. Export treasury transfers weekly.
2. Reconcile received ION against launch packets and transaction hashes.
3. Burn the configured share manually from treasury operations.
4. Publish the burn transaction hash in the public fee/burn log.

## Creator Packet Operations

Launch packets are local browser records, not account-backed database records.

1. Ask creators to export JSON before clearing browser data.
2. Use Studio import if a packet needs to be restored on another device.
3. Treat exported packet JSON as operational metadata, not proof that an on-chain launch happened.
4. Reconcile packet `feeTxHash` with BNBScan and treasury records before marking a launch fee as received.

## Desk and Draft Operations

The Desk is local-first. Watched tokens, launch packets, and trade drafts are saved in browser storage only.

1. Do not treat an order draft as a submitted trade.
2. Keep launch/trade execution toggles disabled until route verification is complete.
3. Ask users to export important creator packets before changing devices or clearing browser data.
4. Use the Desk workspace backup when moving local testing data between browsers.

## Go-Live Gate

Do not enable final launch execution until all checks in `VERIFICATION.md` are complete.
