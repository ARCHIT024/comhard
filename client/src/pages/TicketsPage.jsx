import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  User, 
  Clock, 
  Plus
} from 'lucide-react';
import api from '../api/client.js';
import useDebounce from '../hooks/useDebounce.js';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import OverdueBadge from '../components/OverdueBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { formatRelativeTime } from '../utils/formatDate.js';

export default function TicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states initialized from URL query params or defaults
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [assigneeFilter, setAssigneeFilter] = useState(searchParams.get('assignee') || '');
  const [overdueFilter, setOverdueFilter] = useState(searchParams.get('overdue') === 'true');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'updated');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const limit = 10;

  // Data states
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state changes with URL query string
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (assigneeFilter) params.set('assignee', assigneeFilter);
    if (overdueFilter) params.set('overdue', 'true');
    if (sortOption && sortOption !== 'updated') params.set('sort', sortOption);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, overdueFilter, sortOption, page, setSearchParams]);

  // Reset page to 1 whenever filters or search query change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, overdueFilter, sortOption]);

  // Load agents for assignee dropdown
  useEffect(() => {
    api.get('/api/agents')
      .then((res) => {
        if (res && res.data) {
          setAgents(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load agents list:', err);
      });
  }, []);

  // Fetch tickets function
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/api/tickets', {
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
        assignee: assigneeFilter,
        overdue: overdueFilter ? 'true' : '',
        sort: sortOption,
        page,
        limit
      });

      setTickets(res.data || []);
      setPagination({
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        page: res.page || 1
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, overdueFilter, sortOption, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setOverdueFilter(false);
    setSortOption('updated');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput || statusFilter || priorityFilter || assigneeFilter || overdueFilter || sortOption !== 'updated'
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-description">
            Monitor, assign, filter, and resolve issues across your customer base.
          </p>
        </div>

        <button 
          onClick={() => navigate('/tickets/new')}
          className="btn-primary"
        >
          <Plus size={16} />
          Create Ticket
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="filters-card">
        <div className="filters-grid">
          {/* Search box with debouncing and clear icon */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search subject or customer email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            {searchInput && (
              <button 
                type="button"
                onClick={() => setSearchInput('')}
                className="search-clear-btn"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status dropdown */}
          <div className="select-wrapper">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting on Customer">Waiting on Customer</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority dropdown */}
          <div className="select-wrapper">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee dropdown */}
          <div className="select-wrapper">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="select-wrapper">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="filter-select"
            >
              <option value="updated">Recently updated</option>
              <option value="priority">Priority (Urgent first)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Clear Bar */}
        {hasActiveFilters && (
          <div className="active-filters-bar">
            <span className="active-filters-label">Filters active</span>
            <button
              onClick={handleClearFilters}
              className="clear-all-btn"
            >
              <X size={13} />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <ErrorBanner 
          error={error} 
          onRetry={fetchTickets} 
        />
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="table-card">
          <Spinner text="Loading tickets..." />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tickets.length === 0 && (
        <EmptyState
          title="No tickets match your filters"
          message={
            hasActiveFilters
              ? 'Try widening your search terms or clearing specific status, priority, or assignee filters.'
              : 'There are currently no tickets in the support desk system.'
          }
          onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
        />
      )}

      {/* Tickets Table */}
      {!loading && !error && tickets.length > 0 && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Subject</th>
                  <th style={{ width: '18%' }}>Customer</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '10%' }}>Priority</th>
                  <th style={{ width: '12%' }}>Assignee</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="clickable-row"
                  >
                    {/* Subject + Overdue tag */}
                    <td>
                      <div className="ticket-subject-cell">
                        <div className="subject-title-line">
                          <span className="ticket-id">#{ticket.id}</span>
                          <span className="ticket-subject">{ticket.subject}</span>
                          {ticket.isOverdue && <OverdueBadge />}
                        </div>
                        <div className="ticket-description-snippet">
                          {ticket.description}
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td>
                      <span className="customer-cell" title={ticket.customer}>
                        {ticket.customer}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>

                    {/* Priority Badge */}
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {/* Assignee */}
                    <td>
                      <div className="assignee-cell">
                        <div className={`assignee-avatar ${!ticket.assignee_name ? 'unassigned' : ''}`}>
                          {ticket.assignee_name ? ticket.assignee_name.charAt(0) : <User size={12} />}
                        </div>
                        <span className={`assignee-name ${!ticket.assignee_name ? 'text-muted' : ''}`}>
                          {ticket.assignee_name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Last Updated Relative Time */}
                    <td style={{ textAlign: 'right' }}>
                      <span 
                        className="updated-cell" 
                        title={new Date(ticket.updated_at).toLocaleString()}
                      >
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                        {formatRelativeTime(ticket.updated_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{(page - 1) * limit + 1}</strong> to{' '}
              <strong>{Math.min(page * limit, pagination.total)}</strong> of{' '}
              <strong>{pagination.total}</strong> tickets
            </div>

            <div className="pagination-actions">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="pagination-btn"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="pagination-pages">
                Page {page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="pagination-btn"
                aria-label="Next page"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
