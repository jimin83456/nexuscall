import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import Agents from './pages/Agents';
import AuditLogs from './pages/AuditLogs';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import Lounge from './pages/Lounge';
import Marketplace from './pages/Marketplace';
import { useAuth } from './hooks/useAuth';

// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/lounge" element={<Layout><Lounge /></Layout>} />
      <Route path="/marketplace" element={<Layout><Marketplace /></Layout>} />
      
      {/* 보호된 라우트 */}
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <Layout>
              <Workspaces />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <WorkspaceDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <Layout>
              <Agents />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <AuditLogs />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
