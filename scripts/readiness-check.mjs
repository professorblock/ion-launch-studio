import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['README', existsSync('README.md')],
  ['Operations guide', existsSync('OPERATIONS.md')],
  ['Security policy', existsSync('SECURITY.md')],
  ['Verification checklist', existsSync('VERIFICATION.md')],
  ['Vercel config', existsSync('vercel.json')],
  ['CI workflow', existsSync('.github/workflows/ci.yml')],
  ['Sitemap', existsSync('public/sitemap.xml')],
];

let failures = 0;
for (const [label, ready] of checks) {
  console.log(`${ready ? 'ok' : 'missing'}: ${label}`);
  if (!ready) failures += 1;
}

const appSource = readFileSync('src/App.tsx', 'utf8');
for (const route of ['/desk', '/status', '/readiness', '/docs', '/fee-policy', '/risk']) {
  const ready = appSource.includes(`path="${route}"`);
  console.log(`${ready ? 'ok' : 'missing'}: route ${route}`);
  if (!ready) failures += 1;
}

const envCheck = spawnSync('node', ['scripts/validate-env.mjs'], { stdio: 'inherit' });
if (envCheck.status && envCheck.status !== 0) failures += 1;

if (failures) {
  throw new Error(`${failures} readiness check${failures === 1 ? '' : 's'} failed`);
}

console.log('Readiness check completed. Production-only env values may still be pending unless strict mode is used.');
