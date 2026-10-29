import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function OverdueBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: 700,
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}
      title="Overdue: Unresolved ticket created more than 24 hours ago"
    >
      <AlertCircle size={11} strokeWidth={2.5} />
      Overdue
    </span>
  );
}
