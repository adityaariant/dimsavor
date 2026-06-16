import React from 'react';

export default function SummaryCard({ title, value, subLabel }) {
  return (
    <div className="card p-[20px]">
      <h3 className="text-[12px] uppercase tracking-wider text-[var(--text-secondary)] font-medium font-['Inter'] mb-[8px]">{title}</h3>
      <p className="text-[32px] font-bold text-[var(--text-primary)] font-['Space_Grotesk'] leading-none">{value}</p>
      {subLabel && <p className="mt-[8px] text-[13px] text-[var(--text-disabled)] font-['Inter']">{subLabel}</p>}
    </div>
  );
}
