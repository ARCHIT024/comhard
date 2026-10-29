import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  Headphones, 
  UserCheck
} from 'lucide-react';
import { useAgent } from '../context/AgentContext.jsx';

export default function Layout() {
  const location = useLocation();
  const { currentAgent, setCurrentAgent, agents } = useAgent();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tickets', label: 'Tickets', icon: Ticket },
    { to: '/tickets/new', label: 'New Ticket', icon: PlusCircle }
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Headphones size={22} color="#ffffff" />
          </div>
          <div className="brand-text">
            <span className="brand-title">SupportDesk</span>
            <span className="brand-subtitle">Team Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN MENU</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="agent-badge">
            <div className="agent-avatar">
              {currentAgent?.name ? currentAgent.name.charAt(0) : 'A'}
            </div>
            <div className="agent-info">
              <span className="agent-name">{currentAgent?.name || 'Loading agent...'}</span>
              <span className="agent-role">{currentAgent?.role ? `${currentAgent.role} agent` : 'Support'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-breadcrumbs">
            <span className="header-crumb-root">SupportDesk</span>
            <span className="header-crumb-sep">/</span>
            <span className="header-crumb-current">
              {location.pathname === '/' && 'Performance Dashboard'}
              {location.pathname === '/tickets' && 'Ticket Management'}
              {location.pathname === '/tickets/new' && 'Create New Ticket'}
              {location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets/new' && 'Ticket Details'}
            </span>
          </div>

          <div className="header-actions">
            {/* Current Agent Selector in Header */}
            <div className="current-agent-header-selector">
              <UserCheck size={16} className="agent-selector-icon" />
              <label htmlFor="header-agent-select" className="agent-selector-label">
                Active Agent:
              </label>
              <select
                id="header-agent-select"
                className="agent-selector-select"
                value={currentAgent?.id || ''}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const found = agents.find((a) => a.id === selectedId);
                  if (found) setCurrentAgent(found);
                }}
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </div>

            <span className="api-status-pill">
              <span className="status-live-dot" />
              API Connected
            </span>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
