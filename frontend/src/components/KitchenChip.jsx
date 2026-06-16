import React from 'react';

export default function KitchenChip({ code, isBacar, sourceBundle, className = '' }) {
  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className={`kitchen-chip ${isBacar ? 'bacar' : ''}`}>
        <span className="text-[10px] text-[var(--text-secondary)] mr-1">▌</span>
        {code}
      </span>
      {sourceBundle && (
        <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
          ← from {sourceBundle}
        </span>
      )}
    </div>
  );
}
