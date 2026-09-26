import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import AskAI from '../pages/AskAI.jsx'
import BrainIcon from './BrainIcon.jsx'

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-orb">
                <BrainIcon />
              </div>
              <div>
                <h1 className="sidebar-title">NEXORA AI</h1>
                <span className="sidebar-subtitle">AI Agent Automation Platform</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <i className="fa-solid fa-sun"></i>
              ) : (
                <i className="fa-solid fa-moon"></i>
              )}
            </button>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="sidebar-link">
              <i className="fa-solid fa-chart-pie"></i>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/agents" className="sidebar-link">
              <i className="fa-solid fa-robot"></i>
              <span>Agents</span>
            </NavLink>
            <NavLink to="/workflows" className="sidebar-link">
              <i className="fa-solid fa-diagram-successor-step"></i>
              <span>Workflows</span>
            </NavLink>
            <NavLink to="/knowledge" className="sidebar-link">
              <i className="fa-solid fa-book"></i>
              <span>Knowledge</span>
            </NavLink>
            <NavLink to="/tools" className="sidebar-link">
              <i className="fa-solid fa-wrench"></i>
              <span>Tools</span>
            </NavLink>
            <NavLink to="/providers" className="sidebar-link">
              <i className="fa-solid fa-server"></i>
              <span>Providers</span>
            </NavLink>
            <NavLink to="/credentials" className="sidebar-link">
              <i className="fa-solid fa-key"></i>
              <span>Credentials</span>
            </NavLink>
            <NavLink to="/conversations" className="sidebar-link">
              <i className="fa-solid fa-comments"></i>
              <span>Conversations</span>
            </NavLink>
            <NavLink to="/executions" className="sidebar-link">
              <i className="fa-solid fa-play-circle"></i>
              <span>Executions</span>
            </NavLink>
            <NavLink to="/analytics" className="sidebar-link">
              <i className="fa-solid fa-chart-line"></i>
              <span>Analytics</span>
            </NavLink>
            <NavLink to="/logs" className="sidebar-link">
              <i className="fa-solid fa-terminal"></i>
              <span>Logs</span>
            </NavLink>
            <NavLink to="/api-keys" className="sidebar-link">
              <i className="fa-solid fa-qrcode"></i>
              <span>API Keys</span>
            </NavLink>
            <NavLink to="/templates" className="sidebar-link">
              <i className="fa-solid fa-copy"></i>
              <span>Templates</span>
            </NavLink>
            <NavLink to="/diagnose" className="sidebar-link">
              <i className="fa-solid fa-stethoscope"></i>
              <span>Diagnose</span>
            </NavLink>
            <NavLink to="/visual" className="sidebar-link">
              <i className="fa-solid fa-eye"></i>
              <span>Visual Diagnose</span>
            </NavLink>
            <NavLink to="/code-fix" className="sidebar-link">
              <i className="fa-solid fa-code"></i>
              <span>Code Fix</span>
            </NavLink>
            <NavLink to="/history" className="sidebar-link">
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>History</span>
            </NavLink>
            <NavLink to="/projects" className="sidebar-link">
              <i className="fa-solid fa-folder-tree"></i>
              <span>Projects</span>
            </NavLink>
            <NavLink to="/integrations" className="sidebar-link">
              <i className="fa-solid fa-plug"></i>
              <span>Integrations</span>
            </NavLink>
            <NavLink to="/settings" className="sidebar-link">
              <i className="fa-solid fa-sliders"></i>
              <span>Settings</span>
            </NavLink>
          </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">Lead AI Architect</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fa-solid fa-power-off"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
        <AskAI />
      </main>
    </div>
  )
}
