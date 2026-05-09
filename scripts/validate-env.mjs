import { existsSync, readFileSync } from 'node:fs';

const runtimeProcess = globalThis.process ?? { argv: [], env: {} };
const strict = runtimeProcess.argv.includes('--strict');
const env = {
  ...parseEnvFile('.env.example'),
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
  ...runtimeProcess.env,
};

const checks = [
  {
    name: 'Bitquery token stays server-side',
    ok: Boolean(env.BITQUERY_API_TOKEN) && !env.VITE_BITQUERY_API_TOKEN,
    detail: env.VITE_BITQUERY_API_TOKEN ? 'Remove VITE_BITQUERY_API_TOKEN. Secrets must not be client-prefixed.' : 'Set BITQUERY_API_TOKEN for live discovery data.',
  },
  {
    name: 'ION token configured',
    ok: isAddress(env.VITE_ION_TOKEN_BSC_ADDRESS) && isAddress(env.ION_TOKEN_BSC_ADDRESS || env.VITE_ION_TOKEN_BSC_ADDRESS),
    detail: 'Set VITE_ION_TOKEN_BSC_ADDRESS and ION_TOKEN_BSC_ADDRESS to the BSC ION token address.',
  },
  {
    name: 'Treasury configured',
    ok: isAddress(env.VITE_TREASURY_ADDRESS) && isAddress(env.TREASURY_ADDRESS || env.VITE_TREASURY_ADDRESS),
    detail: 'Set VITE_TREASURY_ADDRESS and TREASURY_ADDRESS to the public fee treasury wallet.',
  },
  {
    name: 'Fee amount configured',
    ok: Number(env.VITE_PLATFORM_FEE_ION || 0) > 0,
    detail: 'Set VITE_PLATFORM_FEE_ION to the intended ION platform fee before launch.',
  },
  {
    name: 'Metadata token stays server-side',
    ok: !env.VITE_PINATA_JWT,
    detail: 'PINATA_JWT is optional, but it must never be exposed as VITE_PINATA_JWT.',
  },
  {
    name: 'Four Meme proxy address set',
    ok: isAddress(env.VITE_FOUR_MEME_PROXY || env.FOUR_MEME_PROXY),
    detail: 'Set VITE_FOUR_MEME_PROXY and FOUR_MEME_PROXY for market-data filtering.',
  },
  {
    name: 'Launch execution remains gated',
    ok: env.VITE_ENABLE_LAUNCH_EXECUTION !== 'true',
    detail: 'Keep VITE_ENABLE_LAUNCH_EXECUTION=false until the launch route is independently verified.',
  },
  {
    name: 'Trade execution remains gated',
    ok: env.VITE_ENABLE_TRADE_EXECUTION !== 'true',
    detail: 'Keep VITE_ENABLE_TRADE_EXECUTION=false until trade calldata and slippage behavior are verified.',
  },
];

let failures = 0;
for (const check of checks) {
  const icon = check.ok ? 'ok' : 'needs setup';
  console.log(`${icon}: ${check.name}`);
  if (!check.ok) {
    failures += 1;
    console.log(`  ${check.detail}`);
  }
}

if (failures && strict) {
  throw new Error(`${failures} environment check${failures === 1 ? '' : 's'} failed`);
}

if (failures) {
  console.log(`\n${failures} check${failures === 1 ? '' : 's'} need setup before production. Use --strict in deployment gates.`);
} else {
  console.log('\nEnvironment checks passed.');
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}
