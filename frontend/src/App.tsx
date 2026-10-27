import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isAuthenticated } from './api/client';
import Layout from './components/Layout';
import { I18nContext, loadLang, saveLang, translate, type I18nKey, type Lang } from './i18n';
import AiAuditPage from './pages/AiAuditPage';
import AssetsPage from './pages/AssetsPage';
import ComplianceCoveragePage from './pages/ComplianceCoveragePage';
import GrcLibraryViewerPage from './pages/GrcLibraryViewerPage';
import IsmsPage from './pages/IsmsPage';
import PoliciesPage from './pages/PoliciesPage';
import PolicyDetailPage from './pages/PolicyDetailPage';
import ReportsPage from './pages/ReportsPage';
import RepositoryPage from './pages/RepositoryPage';
import SkillsPage from './pages/SkillsPage';
import TasksPage from './pages/TasksPage';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import ConnectorsPage from './pages/ConnectorsPage';
import CopilotPage from './pages/CopilotPage';
import EasmPage from './pages/EasmPage';
import EvidencePage from './pages/EvidencePage';
import IncidentsPage from './pages/IncidentsPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import RisksPage from './pages/RisksPage';
import VendorsPage from './pages/VendorsPage';

function useAuthState() {
  const [authed, setAuthed] = useState(isAuthenticated());
  useEffect(() => {
    const handler = () => setAuthed(isAuthenticated());
    window.addEventListener('nexus-auth', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('nexus-auth', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return authed;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = useAuthState();
  const location = useLocation();
  if (!authed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(loadLang());
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);
  const i18n = useMemo(
    () => ({ lang, setLang, t: (k: I18nKey) => translate(lang, k) }),
    [lang, setLang],
  );

  return (
    <I18nContext.Provider value={i18n}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="connectors" element={<ConnectorsPage />} />
          <Route path="copilot" element={<CopilotPage />} />
          <Route path="audit" element={<AiAuditPage />} />
          <Route path="isms" element={<IsmsPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="policies/:id" element={<PolicyDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="repository" element={<RepositoryPage />} />
          <Route path="grc-library" element={<GrcLibraryViewerPage />} />
          <Route path="viewer" element={<Navigate to="/grc-library" replace />} />
          <Route path="compliance" element={<ComplianceCoveragePage />} />
          <Route path="compliance-matrix" element={<Navigate to="/compliance" replace />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="vulnerabilities" element={<VulnerabilitiesPage />} />
          <Route path="easm" element={<EasmPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </I18nContext.Provider>
  );
}
