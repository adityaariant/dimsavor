import React from 'react';

export default function SummaryCard({ title, value, subLabel }) {
  return (
    <div className="card p-[20px] shadow-soft bg-gradient-warm">
      <h3 className="text-[12px] uppercase tracking-wider text-[var(--text-secondary)] font-medium font-['Inter_Tight_Variable'] mb-[8px]">{title}</h3>
      <p className="text-[32px] font-bold text-[var(--text-primary)] font-['Fraunces'] leading-none">{value}</p>
      {subLabel && <p className="mt-[8px] text-[13px] text-[var(--text-secondary)] font-['Inter_Tight_Variable']">{subLabel}</p>}
    </div>
  );
}
