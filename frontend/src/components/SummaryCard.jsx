import React from 'react';

export default function SummaryCard({ title, value, subLabel }) {
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subLabel && <p className="mt-1 text-sm text-gray-500">{subLabel}</p>}
    </div>
  );
}
