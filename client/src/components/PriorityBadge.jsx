import React from 'react';

const PRIORITY_CONFIG = {
  Low: {
    bg: '#f3f4f6',
    text: '#4b5563',
    border: '#e5e7eb',
    indicator: '●'
  },
  Medium: {
    bg: '#f0f9ff',
    text: '#0369a1',
    border: '#bae6fd',
    indicator: '●'
  },
  High: {
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fed7aa',
    indicator: '▲'
  },
  Urgent: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
    indicator: '▲'
  }
};

export default function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2
      }}
    >
      <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>{config.indicator}</span>
      {priority || 'Medium'}
    </span>
  );
}
