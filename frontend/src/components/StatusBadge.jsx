import React from 'react';

const colorMap = {
  UNPAID: 'badge-unpaid',
  PAID: 'badge-paid',
  PENDING: 'badge-pending',
  SENT: 'badge-sent',
  CANCELLED: 'badge-cancelled',
  Active: 'badge-paid',
  Closed: 'badge-pending'
};

export default function StatusBadge({ status, className = '' }) {
  const baseColor = colorMap[status] || 'badge-pending';
  return (
    <span className={`badge ${baseColor} ${className}`}>
      {status}
    </span>
  );
}
