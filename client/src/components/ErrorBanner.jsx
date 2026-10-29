import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ error, onRetry, message }) {
  const displayMessage =
    message ||
    (typeof error === 'string' ? error : error?.message || 'Failed to load data from server.');

  const details = error?.details || [];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        margin: '1rem 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: details.length ? '0.35rem' : 0 }}>
            {displayMessage}
          </div>
          {details.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#b91c1c' }}>
              {details.map((item, index) => (
                <li key={index}>
                  <strong>{item.field}:</strong> {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 0.15s ease'
          }}
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}
