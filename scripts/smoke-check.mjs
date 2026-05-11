import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';

const requiredFiles = [
  'api/bitquery.js',
  'api/metadata.js',
  'api/status.js',
  'src/pages/HomePage.tsx',
  'src/pages/DeskPage.tsx',
  'src/pages/DiscoverPage.tsx',
  'src/pages/DocsPage.tsx',
  'src/pages/LaunchPage.tsx',
  'src/pages/ReadinessPage.tsx',
  'src/pages/StudioPage.tsx',
  'src/pages/StudioPacketPage.tsx',
  'src/pages/BurnPage.tsx',
  'src/pages/StatusPage.tsx',
  'src/pages/TermsPage.tsx',
  'src/pages/PrivacyPage.tsx',
  'vercel.json',
  '.github/workflows/ci.yml',
];

const requiredRoutes = [
  '/',
  '/discover',
  '/launch',
  '/desk',
  '/studio',
  '/studio/:id',
  '/burn',
  '/status',
  '/docs',
  '/readiness',
  '/terms',
  '/privacy',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length) {
  throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
}

const appSource = readFileSync('src/App.tsx', 'utf8');
const missingRoutes = requiredRoutes.filter((route) => !appSource.includes(`path="${route}"`));
if (missingRoutes.length) {
  throw new Error(`Missing required routes: ${missingRoutes.join(', ')}`);
}

const secretNames = ['BITQUERY_API_TOKEN', 'PINATA_JWT', 'VITE_BITQUERY_API_TOKEN', 'VITE_PINATA_JWT'];
const distFiles = existsSync('dist') ? listFiles('dist').filter((file) => /\.(html|js|css|json|txt|map)$/.test(file)) : [];
for (const file of distFiles) {
  const source = readFileSync(file, 'utf8');
  const leaked = secretNames.find((secret) => source.includes(secret));
  if (leaked) {
    throw new Error(`Server-only secret name leaked into ${file}: ${leaked}`);
  }
}

console.log('Smoke check passed');

function listFiles(path) {
  const entries = readdirSync(path).flatMap((entry) => {
    const fullPath = `${path}/${entry}`;
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
  return entries;
}
