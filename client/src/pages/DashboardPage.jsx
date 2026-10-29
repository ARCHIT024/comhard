import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Inbox, 
  CircleDot, 
  Clock, 
  CheckCircle2, 
  Flame, 
  AlertTriangle, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import api from '../api/client.js';
import { useAgent } from '../context/AgentContext.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentAgent, setCurrentAgent, agents } = useAgent();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Refetches stats from GET /api/dashboard
  const fetchDashboardStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get('/api/dashboard');
      setStats(res.data || {});
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on mount so counts update after ticket changes
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const hasOverdue = (stats?.overdue ?? 0) > 0;

  // Get initials for current agent
  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="sd-dashboard-page">
      {/* 1. Page Header */}
      <div className="sd-top">
        <div>
          <h1 className="sd-title">Dashboard</h1>
          <p className="sd-subtitle">Ticket volume, workload, and overdue risk</p>
        </div>

        <div className="sd-top-actions">
          {/* Active Agent Selector */}
          <div className="sd-agent-box" title="Active Support Agent">
            <div className="sd-av">
              {getInitials(currentAgent?.name)}
            </div>
            <select
              className="sd-agent-select"
              value={currentAgent?.id || ''}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const found = agents.find((a) => a.id === selectedId);
                if (found) setCurrentAgent(found);
              }}
              aria-label="Select active agent"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button 
            type="button"
            className="sd-btn-icon" 
            onClick={() => fetchDashboardStats(true)} 
            disabled={loading || refreshing}
            aria-label="Refresh dashboard metrics"
            title="Refresh metrics"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* New Ticket Button */}
          <button 
            type="button"
            className="sd-btn-primary" 
            onClick={() => navigate('/tickets/new')}
          >
            <Plus size={15} />
            <span>New ticket</span>
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <ErrorBanner 
          error={error} 
          onRetry={() => fetchDashboardStats(false)} 
        />
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="sd-loading-card">
          <Spinner text="Loading dashboard metrics..." />
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && stats && (
        <>
          {/* 2. Slim Overdue Alert (when overdue > 0) */}
          {hasOverdue && (
            <div className="sd-alert">
              <AlertCircle size={17} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>
                {stats.overdue} ticket{stats.overdue === 1 ? ' is' : 's are'} overdue (open for more than 24 hours)
              </span>
              <button 
                type="button"
                className="sd-alert-link" 
                onClick={() => navigate('/tickets?overdue=true')}
              >
                View overdue &rarr;
              </button>
            </div>
          )}

          {/* 3. 6 Stat Cards Grid */}
          <div className="sd-grid">
            {/* Total */}
            <div 
              className="sd-card" 
              onClick={() => navigate('/tickets')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <Inbox size={15} aria-hidden="true" />
                <span>Total</span>
              </div>
              <div className="n">{stats.total}</div>
              <div className="k">All tickets</div>
            </div>

            {/* Open */}
            <div 
              className="sd-card" 
              onClick={() => navigate('/tickets?status=Open')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <CircleDot size={15} aria-hidden="true" />
                <span>Open</span>
              </div>
              <div className="n">{stats.open}</div>
              <div className="k">Awaiting action</div>
            </div>

            {/* In Progress */}
            <div 
              className="sd-card" 
              onClick={() => navigate('/tickets?status=In Progress')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <Clock size={15} aria-hidden="true" />
                <span>In progress</span>
              </div>
              <div className="n">{stats.inProgress}</div>
              <div className="k">Being worked on</div>
            </div>

            {/* Resolved */}
            <div 
              className="sd-card" 
              onClick={() => navigate('/tickets?status=Resolved')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Resolved</span>
              </div>
              <div className="n">{stats.resolved}</div>
              <div className="k">Completed</div>
            </div>

            {/* Urgent */}
            <div 
              className="sd-card" 
              onClick={() => navigate('/tickets?priority=Urgent')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <Flame size={15} aria-hidden="true" />
                <span>Urgent</span>
              </div>
              <div className="n">{stats.urgent}</div>
              <div className="k">Needs priority</div>
            </div>

            {/* Overdue */}
            <div 
              className={`sd-card ${hasOverdue ? 'bad' : ''}`} 
              onClick={() => navigate('/tickets?overdue=true')}
              role="button"
              tabIndex={0}
            >
              <div className="l">
                <AlertTriangle size={15} aria-hidden="true" />
                <span>Overdue</span>
              </div>
              <div className="n">{stats.overdue}</div>
              <div className="k">Over 24 hours old</div>
            </div>
          </div>

          {/* 4. Team Workload Summary Footer */}
          <div className="sd-sum">
            <p>
              <b>Team workload</b>
              {stats.resolved} of {stats.total} tickets are resolved. {stats.open} are open and {stats.inProgress} are in progress.
            </p>
            <button 
              type="button"
              className="sd-btn-outline" 
              onClick={() => navigate('/tickets')}
            >
              Browse all tickets
            </button>
          </div>
        </>
      )}
    </div>
  );
}
