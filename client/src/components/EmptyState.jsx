import React from 'react';
import { Inbox, FilterX } from 'lucide-react';

export default function EmptyState({
  title = 'No tickets match your filters',
  message = 'Try adjusting your search query, status, priority, or assignee filters.',
  onClearFilters,
  icon: Icon = Inbox
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        borderRadius: '12px',
        backgroundColor: '#fafaf9',
        border: '1px dashed #e2e8f0',
        margin: '1.5rem 0'
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          marginBottom: '1rem'
        }}
      >
        <Icon size={26} strokeWidth={1.8} />
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
        {title}
      </h3>

      {message && (
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', marginBottom: '1.25rem' }}>
          {message}
        </p>
      )}

      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem'
          }}
        >
          <FilterX size={15} />
          Clear filters
        </button>
      )}
    </div>
  );
}
