# ION Launch

ION Launch is a branded discovery and launch interface for community tokens on BNB Chain. The product is designed as a frontend-first experience layer around existing launch infrastructure, with no custom smart contracts and no custodial signing.

## Safety Model

- No custom smart contracts.
- No private keys or mnemonics in the app.
- No backend transaction signing.
- User wallets sign all on-chain actions.
- Platform fee flow is planned as a standard user-signed ERC-20 transfer.
- Trading and launch contract calls remain disabled until exact integrations are verified.

## Local Development

```bash
npm install
npm run dev
npm run lint
npm run build
npm run smoke
npm run validate:env
```

Copy `.env.example` to `.env.local` and fill only the values that are already verified.

## Deployment

The app is Vercel-ready:

- Vite builds the static frontend.
- `/api/bitquery` and `/api/metadata` run as serverless functions.
- `vercel.json` keeps client-side routes working on refresh and adds basic security headers.
- GitHub Actions runs lint, build, and moderate-severity dependency audit.

Operational staging and go-live steps are documented in `OPERATIONS.md`.
The branch and deployment flow is documented in `DEPLOYMENT.md`.

## Public Configuration

Values prefixed with `VITE_` are bundled into the browser. Do not put secrets in them.

The Bitquery token must stay server-side.

## Data Layer

`/api/bitquery` is a serverless proxy for launch data. It accepts:

- `launch-dashboard` for market board tokens and recent trades.
- `token-detail` with an `address` for token-specific trades.
- `burn-dashboard` for ION burn and treasury flow.

When `BITQUERY_API_TOKEN` is missing, the app uses typed mock data so local development stays usable without exposing secrets.

## Metadata Layer

`/api/metadata` is an optional serverless metadata pinning endpoint. If `PINATA_JWT` is configured server-side, launch
metadata can be pinned to IPFS-compatible storage. If it is not configured, launch packets still work locally and the
UI marks metadata as local/unconfigured.

## Creator Studio

Launch packets are stored in the creator's browser so the MVP can stay account-free and low-cost. Creators can resume a
packet from Studio, export JSON for operational records, import JSON back into another browser, and delete local data.

## My Desk

`/desk` is the local command center for launch packets, watched tokens, and order drafts. This keeps the first version
useful without user accounts, custodial storage, or paid database infrastructure.

Desk also supports full workspace export/import so a creator can back up local launch packets, watchlist entries, and
review-only order drafts.

## Trade Reviews

Token pages support review-only order drafts with slippage settings and estimated output. Drafts are saved locally, but
no swap transaction is sent until final route verification is complete.

## Production Gate

Run `npm run validate:env -- --strict` before production deployment. The validator blocks common mistakes such as
client-prefixed secrets, missing public treasury/token addresses, and unconfigured fee values.

Use `npm run readiness` for a broader preflight that checks required docs, routes, deployment files, and non-strict env
readiness.
