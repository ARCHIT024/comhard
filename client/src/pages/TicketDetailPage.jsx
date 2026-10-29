import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Lock, 
  MessageSquare, 
  History, 
  User, 
  Clock, 
  Edit3, 
  Check, 
  X,
  AlertTriangle,
  AlertCircle,
  FileQuestion,
  Loader2,
  RefreshCw,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import api, { ApiError } from '../api/client.js';
import { useAgent } from '../context/AgentContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import OverdueBadge from '../components/OverdueBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatRelativeTime, formatDateTime } from '../utils/formatDate.js';

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentAgent, agents } = useAgent();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Field editing state for subject, customer, description
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [contentForm, setContentForm] = useState({ subject: '', customer: '', description: '' });
  const [contentErrors, setContentErrors] = useState({});
  const [savingContent, setSavingContent] = useState(false);

  // Loading states for individual instant-patch dropdowns
  const [patchingField, setPatchingField] = useState(null); // 'status' | 'priority' | 'assignee_id' | null

  // Toast feedback
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Message composer
  const [composerMode, setComposerMode] = useState('reply'); // 'reply' | 'note'
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    try {
      const res = await api.get(`/api/tickets/${id}`);
      setTicket(res.data);
      setContentForm({
        subject: res.data.subject,
        customer: res.data.customer,
        description: res.data.description
      });
      setContentErrors({});
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Instant PATCH handler for dropdowns & quick actions (status, priority, assignee_id)
  const handleDropdownPatch = async (fieldName, newValue) => {
    if (!ticket) return;

    const previousValue = ticket[fieldName];
    // Optimistic update
    setTicket((prev) => ({ ...prev, [fieldName]: newValue }));
    setPatchingField(fieldName);

    try {
      const payload = {
        [fieldName]: newValue,
        actor_id: currentAgent?.id || null
      };

      const res = await api.patch(`/api/tickets/${id}`, payload);
      setTicket(res.data);
      const friendlyName = fieldName === 'assignee_id' ? 'Assignee' : fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      showToast('success', `${friendlyName} set to "${newValue === null ? 'Unassigned' : newValue}"`);
    } catch (err) {
      // Rollback on failure
      setTicket((prev) => ({ ...prev, [fieldName]: previousValue }));
      showToast('error', `Failed to update ${fieldName}: ${err.message || 'Server error'}`);
    } finally {
      setPatchingField(null);
    }
  };

  // Save subject / customer / description edit
  const handleSaveContent = async () => {
    const errors = {};
    if (!contentForm.subject || !contentForm.subject.trim()) {
      errors.subject = 'Subject cannot be empty or whitespace.';
    }
    if (!contentForm.customer || !contentForm.customer.trim()) {
      errors.customer = 'Customer identifier cannot be empty or whitespace.';
    }
    if (!contentForm.description || !contentForm.description.trim()) {
      errors.description = 'Description cannot be empty or whitespace.';
    }

    if (Object.keys(errors).length > 0) {
      setContentErrors(errors);
      showToast('error', 'Please resolve inline errors before saving.');
      return;
    }

    setSavingContent(true);
    setContentErrors({});

    try {
      const payload = {
        subject: contentForm.subject.trim(),
        customer: contentForm.customer.trim(),
        description: contentForm.description.trim(),
        actor_id: currentAgent?.id || null
      };

      const res = await api.patch(`/api/tickets/${id}`, payload);
      setTicket(res.data);
      setIsEditingContent(false);
      showToast('success', 'Ticket information updated');
    } catch (err) {
      showToast('error', err.message || 'Failed to save ticket details');
    } finally {
      setSavingContent(false);
    }
  };

  // Post message (Reply or Internal Note)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent || !messageContent.trim()) {
      showToast('error', 'Message content cannot be empty or whitespace.');
      return;
    }

    setSendingMessage(true);
    try {
      await api.post(`/api/tickets/${id}/messages`, {
        type: composerMode,
        content: messageContent.trim(),
        author_id: currentAgent?.id || null
      });

      setMessageContent('');
      showToast('success', composerMode === 'note' ? 'Internal note added' : 'Public reply sent');
      await fetchTicket();
    } catch (err) {
      showToast('error', err.message || 'Failed to add message');
    } finally {
      setSendingMessage(false);
    }
  };

  // 1. Loading State
  if (loading && !ticket && !notFound) {
    return (
      <div className="page-container" style={{ padding: '4rem 1rem' }}>
        <Spinner text="Loading ticket details..." />
      </div>
    );
  }

  // 2. 404 Not Found State
  if (notFound) {
    return (
      <div className="page-container" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="not-found-card">
          <div className="not-found-icon-wrapper">
            <FileQuestion size={44} strokeWidth={1.75} />
          </div>
          <h1 className="not-found-title">Ticket Not Found</h1>
          <p className="not-found-desc">
            The ticket #{id} could not be found. It may never have existed or the link is incorrect.
          </p>
          <button 
            onClick={() => navigate('/tickets')}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            <ArrowLeft size={16} /> Return to Ticket Queue
          </button>
        </div>
      </div>
    );
  }

  // 3. General Load Error State
  if (loadError && !ticket) {
    return (
      <div className="page-container">
        <div className="error-banner">
          <AlertCircle size={20} />
          <div>{loadError.message || 'Failed to load ticket.'}</div>
          <button onClick={fetchTicket} className="btn-secondary" style={{ marginLeft: 'auto' }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const isResolved = ticket.status === 'Resolved';

  return (
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto' }}>
      {/* Toast Notification Popup */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="toast-close-btn">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Back Link & Quick Actions */}
      <div className="ticket-detail-nav">
        <button onClick={() => navigate('/tickets')} className="back-link">
          <ArrowLeft size={16} /> Back to Tickets
        </button>

        <div className="header-meta-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Resolved Quick-Action Button */}
          {!isResolved ? (
            <button
              type="button"
              onClick={() => handleDropdownPatch('status', 'Resolved')}
              disabled={patchingField === 'status'}
              className="btn-quick-resolve"
              title="Quickly mark this ticket as Resolved"
            >
              {patchingField === 'status' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Mark Resolved
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleDropdownPatch('status', 'Open')}
              disabled={patchingField === 'status'}
              className="btn-secondary"
              title="Reopen this resolved ticket"
            >
              {patchingField === 'status' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Reopen Ticket
            </button>
          )}

          {!isEditingContent ? (
            <button
              onClick={() => setIsEditingContent(true)}
              className="btn-secondary"
            >
              <Edit3 size={14} /> Edit Details
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setContentForm({
                    subject: ticket.subject,
                    customer: ticket.customer,
                    description: ticket.description
                  });
                  setContentErrors({});
                  setIsEditingContent(false);
                }}
                className="btn-secondary"
                disabled={savingContent}
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSaveContent}
                className="btn-primary"
                disabled={savingContent}
              >
                {savingContent ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prominent Overdue Banner */}
      {ticket.isOverdue && (
        <div className="overdue-alert-banner">
          <div className="overdue-banner-left">
            <AlertTriangle size={22} className="overdue-icon-pulse" />
            <div>
              <h4 className="overdue-title">Ticket Overdue Notice</h4>
              <p className="overdue-text">
                This ticket was created over 24 hours ago ({formatDateTime(ticket.created_at)}) and is not yet marked Resolved. Please prioritize resolution or update the customer.
              </p>
            </div>
          </div>
          <OverdueBadge />
        </div>
      )}

      {/* Main Ticket Card with Instant Dropdown Controls */}
      <div className="ticket-detail-card">
        {/* Ticket Header & Subject */}
        <div className="ticket-detail-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ticket-header-badges">
              <span className="ticket-id-tag">Ticket #{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.isOverdue && <OverdueBadge />}
            </div>

            {!isEditingContent ? (
              <h1 className="ticket-detail-title text-wrap-break">{ticket.subject}</h1>
            ) : (
              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  value={contentForm.subject}
                  onChange={(e) => {
                    setContentForm({ ...contentForm, subject: e.target.value });
                    if (contentErrors.subject) setContentErrors({ ...contentErrors, subject: null });
                  }}
                  className={`form-input ${contentErrors.subject ? 'input-error' : ''}`}
                  style={{ fontSize: '1.2rem', fontWeight: 600 }}
                  placeholder="Ticket subject..."
                />
                {contentErrors.subject && (
                  <span className="field-error-text">
                    <AlertCircle size={13} /> {contentErrors.subject}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instant Editable Dropdown Controls Bar */}
        <div className="quick-controls-bar">
          {/* Status Dropdown (PATCHes immediately) */}
          <div className="control-item">
            <label className="control-label">
              Status {patchingField === 'status' && <Loader2 size={12} className="animate-spin" />}
            </label>
            <select
              value={ticket.status}
              disabled={patchingField === 'status'}
              onChange={(e) => handleDropdownPatch('status', e.target.value)}
              className="control-select"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting on Customer">Waiting on Customer</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Dropdown (PATCHes immediately) */}
          <div className="control-item">
            <label className="control-label">
              Priority {patchingField === 'priority' && <Loader2 size={12} className="animate-spin" />}
            </label>
            <select
              value={ticket.priority}
              disabled={patchingField === 'priority'}
              onChange={(e) => handleDropdownPatch('priority', e.target.value)}
              className="control-select"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Assignee Dropdown (PATCHes immediately) */}
          <div className="control-item">
            <label className="control-label">
              Assignee {patchingField === 'assignee_id' && <Loader2 size={12} className="animate-spin" />}
            </label>
            <select
              value={ticket.assignee_id || ''}
              disabled={patchingField === 'assignee_id'}
              onChange={(e) => handleDropdownPatch('assignee_id', e.target.value ? Number(e.target.value) : null)}
              className="control-select"
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="control-item">
            <span className="control-label">Customer</span>
            {!isEditingContent ? (
              <span className="control-value-text text-wrap-break" title={ticket.customer}>
                {ticket.customer}
              </span>
            ) : (
              <div>
                <input
                  type="text"
                  value={contentForm.customer}
                  onChange={(e) => {
                    setContentForm({ ...contentForm, customer: e.target.value });
                    if (contentErrors.customer) setContentErrors({ ...contentErrors, customer: null });
                  }}
                  className={`form-input ${contentErrors.customer ? 'input-error' : ''}`}
                  style={{ padding: '3px 8px', fontSize: '0.85rem' }}
                />
                {contentErrors.customer && (
                  <span className="field-error-text" style={{ fontSize: '0.7rem' }}>
                    {contentErrors.customer}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Updated */}
          <div className="control-item">
            <span className="control-label">Updated</span>
            <span className="control-value-text" title={ticket.updated_at}>
              {formatRelativeTime(ticket.updated_at)}
            </span>
          </div>
        </div>

        {/* Description Section */}
        <div className="ticket-description-box">
          <h3 className="section-subtitle">Issue Description</h3>
          {!isEditingContent ? (
            <div className="ticket-description-text text-wrap-break">{ticket.description}</div>
          ) : (
            <div>
              <textarea
                rows={4}
                value={contentForm.description}
                onChange={(e) => {
                  setContentForm({ ...contentForm, description: e.target.value });
                  if (contentErrors.description) setContentErrors({ ...contentErrors, description: null });
                }}
                className={`form-textarea ${contentErrors.description ? 'input-error' : ''}`}
                placeholder="Detailed description of issue..."
              />
              {contentErrors.description && (
                <span className="field-error-text">
                  <AlertCircle size={13} /> {contentErrors.description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Conversation Thread (Left) & Activity History (Right) */}
      <div className="ticket-columns-layout">
        {/* Left Column: Conversation Thread & Message Composer */}
        <div className="conversation-column">
          <div className="column-card">
            <div className="column-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} className="text-primary" />
                <h2 className="column-title">Conversation Thread</h2>
              </div>
              <span className="thread-count-badge">
                {(ticket.messages || []).length} message{(ticket.messages || []).length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Conversation Messages */}
            <div className="messages-thread">
              {(!ticket.messages || ticket.messages.length === 0) ? (
                <div className="empty-messages">
                  <MessageSquare size={28} className="empty-msg-icon" />
                  <p>No messages yet. Send a public reply to the customer or leave an internal team note below.</p>
                </div>
              ) : (
                ticket.messages.map((msg) => {
                  const isInternalNote = msg.type === 'note';
                  return (
                    <div
                      key={msg.id}
                      className={`chat-bubble ${isInternalNote ? 'bubble-internal-note' : 'bubble-public-reply'}`}
                    >
                      <div className="bubble-header">
                        <div className="bubble-author-info">
                          <div className={`bubble-avatar ${isInternalNote ? 'avatar-note' : 'avatar-reply'}`}>
                            {msg.author_name ? msg.author_name.charAt(0) : 'A'}
                          </div>
                          <div>
                            <span className="bubble-author-name">{msg.author_name || 'Agent'}</span>
                            {isInternalNote && (
                              <span className="internal-note-pill">
                                🔒 Internal note
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="bubble-timestamp" title={msg.created_at}>
                          <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                          {formatDateTime(msg.created_at)} ({formatRelativeTime(msg.created_at)})
                        </span>
                      </div>

                      <div className="bubble-content text-wrap-break">
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Composer with Reply / Internal Note Toggle */}
            <div className={`composer-container ${composerMode === 'note' ? 'composer-note-mode' : 'composer-reply-mode'}`}>
              <div className="composer-mode-bar">
                <button
                  type="button"
                  onClick={() => setComposerMode('reply')}
                  className={`mode-toggle-btn ${composerMode === 'reply' ? 'active-reply-mode' : ''}`}
                >
                  <MessageSquare size={15} />
                  Public Reply
                </button>

                <button
                  type="button"
                  onClick={() => setComposerMode('note')}
                  className={`mode-toggle-btn ${composerMode === 'note' ? 'active-note-mode' : ''}`}
                >
                  <Lock size={14} />
                  Internal Note
                </button>

                {composerMode === 'note' && (
                  <span className="note-privacy-hint">
                    🔒 Only visible to support agents
                  </span>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="composer-form">
                <textarea
                  rows={3}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={
                    composerMode === 'reply'
                      ? 'Type a public reply sent to the customer...'
                      : 'Add private context, reproduction steps, or note for colleagues...'
                  }
                  className="composer-input text-wrap-break"
                  required
                />

                <div className="composer-actions-bar">
                  <div className="composer-author-indicator">
                    <span className="author-label">Author:</span>
                    <span className="author-name-tag">
                      {currentAgent?.name || 'Current Agent'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingMessage || !messageContent.trim()}
                    className={composerMode === 'note' ? 'btn-internal-note' : 'btn-primary'}
                  >
                    {sendingMessage ? (
                      <Spinner size={14} text="Saving..." inline />
                    ) : (
                      <>
                        {composerMode === 'note' ? <Lock size={15} /> : <Send size={15} />}
                        {composerMode === 'note' ? 'Add internal note' : 'Send public reply'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Activity History Panel */}
        <div className="history-column">
          <div className="column-card">
            <div className="column-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} className="text-muted" />
                <h2 className="column-title">Activity History</h2>
              </div>
              <span className="history-count-badge">
                {(ticket.events || []).length}
              </span>
            </div>

            <div className="history-timeline">
              {(!ticket.events || ticket.events.length === 0) ? (
                <div className="empty-history">No activity logged yet.</div>
              ) : (
                ticket.events.map((ev, index) => {
                  const actor = ev.actor_name || 'System';
                  return (
                    <div key={ev.id || index} className="history-event-item">
                      <div className="history-bullet" />
                      <div className="history-event-content">
                        <p className="history-event-text text-wrap-break">
                          {ev.event_type === 'created' && (
                            <>
                              Ticket created by <strong>{actor}</strong>
                            </>
                          )}
                          {ev.event_type === 'status_changed' && (
                            <>
                              Status changed from <strong>{ev.old_value}</strong> to <strong>{ev.new_value}</strong> by <strong>{actor}</strong>
                            </>
                          )}
                          {ev.event_type === 'priority_changed' && (
                            <>
                              Priority changed from <strong>{ev.old_value}</strong> to <strong>{ev.new_value}</strong> by <strong>{actor}</strong>
                            </>
                          )}
                          {ev.event_type === 'assignee_changed' && (
                            <>
                              Assignee changed from <strong>{ev.old_value}</strong> to <strong>{ev.new_value}</strong> by <strong>{actor}</strong>
                            </>
                          )}
                          {ev.event_type === 'reply_added' && (
                            <>
                              Public reply added by <strong>{actor}</strong>
                            </>
                          )}
                          {ev.event_type === 'note_added' && (
                            <>
                              Internal note added by <strong>{actor}</strong>
                            </>
                          )}
                        </p>
                        <span className="history-event-time" title={ev.created_at}>
                          {formatRelativeTime(ev.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
