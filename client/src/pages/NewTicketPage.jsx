import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import api, { ApiError } from '../api/client.js';
import { useAgent } from '../context/AgentContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Spinner from '../components/Spinner.jsx';

export default function NewTicketPage() {
  const navigate = useNavigate();
  const { agents, currentAgent } = useAgent();

  const [formData, setFormData] = useState({
    subject: '',
    customer: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignee_id: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time clearing of inline field errors
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.subject || !formData.subject.trim()) {
      errors.subject = 'Subject is required.';
    }
    if (!formData.customer || !formData.customer.trim()) {
      errors.customer = 'Customer name or email identifier is required.';
    }
    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Description is required.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Client-side validation
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        subject: formData.subject.trim(),
        customer: formData.customer.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        actor_id: currentAgent?.id || null
      };

      const res = await api.post('/api/tickets', payload);

      if (res && res.data && res.data.id) {
        // Redirect to detail page on success
        navigate(`/tickets/${res.data.id}`);
      } else {
        navigate('/tickets');
      }
    } catch (err) {
      setError(err);
      // 2. Display server validation errors per field
      if (err instanceof ApiError) {
        setFieldErrors(err.getFieldErrors());
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button 
            type="button" 
            onClick={() => navigate('/tickets')}
            className="back-link"
          >
            <ArrowLeft size={16} />
            Back to Tickets
          </button>
          <h1 className="page-title" style={{ marginTop: '0.4rem' }}>Create New Ticket</h1>
          <p className="page-description">
            Submit a new customer support ticket to organize and track team resolution.
          </p>
        </div>
      </div>

      {error && !Object.keys(fieldErrors).length && (
        <ErrorBanner error={error} />
      )}

      <form onSubmit={handleSubmit} className="form-card" noValidate>
        {/* Subject */}
        <div className="form-group">
          <label htmlFor="subject" className="form-label">
            Subject <span className="required-star">*</span>
          </label>
          <input
            id="subject"
            type="text"
            name="subject"
            placeholder="Brief summary of the issue (e.g. Database connection timeouts)"
            value={formData.subject}
            onChange={handleChange}
            disabled={submitting}
            className={`form-input ${fieldErrors.subject ? 'input-error' : ''}`}
          />
          {fieldErrors.subject && (
            <span className="field-error-text">
              <AlertCircle size={13} /> {fieldErrors.subject}
            </span>
          )}
        </div>

        {/* Customer identifier */}
        <div className="form-group">
          <label htmlFor="customer" className="form-label">
            Customer Identifier (Name or Email) <span className="required-star">*</span>
          </label>
          <input
            id="customer"
            type="text"
            name="customer"
            placeholder="e.g. sarah.connor@example.com or Sarah Connor"
            value={formData.customer}
            onChange={handleChange}
            disabled={submitting}
            className={`form-input ${fieldErrors.customer ? 'input-error' : ''}`}
          />
          {fieldErrors.customer && (
            <span className="field-error-text">
              <AlertCircle size={13} /> {fieldErrors.customer}
            </span>
          )}
        </div>

        {/* Priority, Status, Assignee */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label htmlFor="priority" className="form-label">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              disabled={submitting}
              className={`form-select ${fieldErrors.priority ? 'input-error' : ''}`}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            {fieldErrors.priority && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.priority}
              </span>
            )}
          </div>

          <div className="form-group flex-1">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={submitting}
              className={`form-select ${fieldErrors.status ? 'input-error' : ''}`}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting on Customer">Waiting on Customer</option>
              <option value="Resolved">Resolved</option>
            </select>
            {fieldErrors.status && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.status}
              </span>
            )}
          </div>

          <div className="form-group flex-1">
            <label htmlFor="assignee_id" className="form-label">
              Assignee
            </label>
            <select
              id="assignee_id"
              name="assignee_id"
              value={formData.assignee_id}
              onChange={handleChange}
              disabled={submitting}
              className={`form-select ${fieldErrors.assignee_id ? 'input-error' : ''}`}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {fieldErrors.assignee_id && (
              <span className="field-error-text">
                <AlertCircle size={13} /> {fieldErrors.assignee_id}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description <span className="required-star">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            placeholder="Detailed description of the customer issue, reproduction steps, or request context..."
            value={formData.description}
            onChange={handleChange}
            disabled={submitting}
            className={`form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
          />
          {fieldErrors.description && (
            <span className="field-error-text">
              <AlertCircle size={13} /> {fieldErrors.description}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Spinner size={16} text="Creating ticket..." inline />
            ) : (
              <>
                <Save size={16} />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
