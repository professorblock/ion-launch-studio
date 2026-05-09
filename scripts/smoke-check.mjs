import { readFileSync, existsSync } from 'node:fs';

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

const distSource = existsSync('dist') ? readFileSync('dist/index.html', 'utf8') : '';
if (distSource.includes('BITQUERY_API_TOKEN') || distSource.includes('PINATA_JWT')) {
  throw new Error('Server-only secret names leaked into dist/index.html');
}

console.log('Smoke check passed');
