import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import Agents from './pages/Agents';
import AuditLogs from './pages/AuditLogs';
import Pricing from './pages/Pricing';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </Layout>
  );
}

export default App;
