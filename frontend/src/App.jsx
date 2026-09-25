import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Agents from './pages/Agents.jsx'
import AgentDetail from './pages/AgentDetail.jsx'
import CreateAgent from './pages/CreateAgent.jsx'
import Workflows from './pages/Workflows.jsx'
import WorkflowCreate from './pages/WorkflowCreate.jsx'
import WorkflowDetail from './pages/WorkflowDetail.jsx'
import Knowledge from './pages/Knowledge.jsx'
import Tools from './pages/Tools.jsx'
import Providers from './pages/Providers.jsx'
import Credentials from './pages/Credentials.jsx'
import Conversations from './pages/Conversations.jsx'
import Executions from './pages/Executions.jsx'
import Analytics from './pages/Analytics.jsx'
import Logs from './pages/Logs.jsx'
import ApiKeys from './pages/ApiKeys.jsx'
import Templates from './pages/Templates.jsx'
import Integrations from './pages/Integrations.jsx'
import Projects from './pages/Projects.jsx'
import Diagnose from './pages/Diagnose.jsx'
import History from './pages/History.jsx'
import DiagnosisDetail from './pages/DiagnosisDetail.jsx'
import Settings from './pages/Settings.jsx'
import VisualDiagnose from './pages/VisualDiagnose.jsx'
import CodeFix from './pages/CodeFix.jsx'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/agents/create" element={<CreateAgent />} />
              <Route path="/agents/:id" element={<AgentDetail />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/workflows/create" element={<WorkflowCreate />} />
              <Route path="/workflows/:id" element={<WorkflowDetail />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/credentials" element={<Credentials />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/executions" element={<Executions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/api-keys" element={<ApiKeys />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/diagnose" element={<Diagnose />} />
              <Route path="/visual" element={<VisualDiagnose />} />
              <Route path="/code-fix" element={<CodeFix />} />
              <Route path="/history" element={<History />} />
              <Route path="/diagnosis/:id" element={<DiagnosisDetail />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
