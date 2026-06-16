import React from 'react';

const colorMap = {
  UNPAID: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-200 text-gray-800 line-through',
  Active: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-200 text-gray-800'
};

export default function StatusBadge({ status, className = '' }) {
  const baseColor = colorMap[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${baseColor} ${className}`}>
      {status}
    </span>
  );
}
