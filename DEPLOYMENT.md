# Deployment

ION Launch uses a staging-first release flow.

## Branches

- `staging`: integration branch for preview deployments and QA.
- `master`: production branch after staging is verified.

## Flow

1. Build features on a short-lived branch.
2. Open a pull request into `staging`.
3. Let CI pass: lint, build, smoke, readiness, and dependency audit.
4. Deploy `staging` to a preview/staging environment.
5. Verify `/status`, `/readiness`, `/discover`, `/launch`, `/desk`, and at least one `/token/:address` page.
6. Open a pull request from `staging` into `master`.
7. Deploy production only after staging is confirmed.

## Pull Requests

Use the repository pull request template for each change. Every PR should state the preview URL, checked routes, and
confirm that no secrets, custom smart contracts, or custodial signing paths were introduced.

## Required Production Variables

- `BITQUERY_API_TOKEN`
- `VITE_TREASURY_ADDRESS`
- `TREASURY_ADDRESS`
- `VITE_PLATFORM_FEE_ION`

Keep optional secrets such as `PINATA_JWT` server-side only.
