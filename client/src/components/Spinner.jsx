import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 28, text = 'Loading...', inline = false }) {
  if (inline) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <Loader2 size={size} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        {text && <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{text}</span>}
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        gap: '0.75rem',
        color: '#6366f1'
      }}
    >
      <Loader2 size={size} style={{ animation: 'spin 0.9s linear infinite' }} />
      {text && <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{text}</span>}
    </div>
  );
}
