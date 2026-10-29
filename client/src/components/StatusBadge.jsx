import React from 'react';

const STATUS_CONFIG = {
  Open: {
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    dot: '#3b82f6'
  },
  'In Progress': {
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
    dot: '#f59e0b'
  },
  'Waiting on Customer': {
    bg: '#f5f3ff',
    text: '#6d28d9',
    border: '#ddd6fe',
    dot: '#8b5cf6'
  },
  Resolved: {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    dot: '#10b981'
  }
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    bg: '#f3f4f6',
    text: '#4b5563',
    border: '#e5e7eb',
    dot: '#9ca3af'
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dot,
          flexShrink: 0
        }}
      />
      {status || 'Unknown'}
    </span>
  );
}
