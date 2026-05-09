import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import { BurnPage } from './pages/BurnPage';
import { DeskPage } from './pages/DeskPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { DocsPage } from './pages/DocsPage';
import { FeePolicyPage } from './pages/FeePolicyPage';
import { HomePage } from './pages/HomePage';
import { InfoPage } from './pages/InfoPage';
import { LaunchPage } from './pages/LaunchPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ReadinessPage } from './pages/ReadinessPage';
import { RiskPage } from './pages/RiskPage';
import { StudioPacketPage } from './pages/StudioPacketPage';
import { StudioPage } from './pages/StudioPage';
import { StatusPage } from './pages/StatusPage';
import { TokenPage } from './pages/TokenPage';
import { TermsPage } from './pages/TermsPage';

export function App() {
  return (
    <AppLayout>
      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/desk" element={<DeskPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/studio/:id" element={<StudioPacketPage />} />
          <Route path="/burn" element={<BurnPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/token/:address" element={<TokenPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/readiness" element={<ReadinessPage />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/fee-policy" element={<FeePolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppErrorBoundary>
    </AppLayout>
  );
}
