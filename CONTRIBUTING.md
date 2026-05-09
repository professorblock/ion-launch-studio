# Contributing

ION Launch uses a staging-first workflow.

## Branching

- Create focused branches from `staging`.
- Use the `codex/` prefix for agent-led changes.
- Keep `master` reserved for production-ready code.

## Pull Requests

Every pull request should include:

- A concise overview.
- The reason for the change.
- A clear list of changed surfaces.
- Security review confirmation.
- Staging preview URL when available.
- Routes checked during QA.

## Required Checks

Run these before requesting review:

```bash
npm run lint
npm run build
npm run smoke
npm run readiness
npm audit --audit-level=moderate
```

## Security Rules

- Do not commit secrets, private keys, seed phrases, or API tokens.
- Do not add custom smart contracts.
- Do not add server-side transaction signing.
- Do not add custodial wallet flows.
- Keep server-only environment variables unprefixed.
- Use `VITE_` only for values that are safe to expose in the browser.

## Release Flow

1. Open feature PR into `staging`.
2. Test the Vercel preview deployment.
3. Merge into `staging`.
4. Open promotion PR from `staging` into `master`.
5. Deploy production from `master` only after staging is verified.
