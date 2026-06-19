import React from 'react';
import { cn } from '../lib/utils';

export default function KitchenChip({ code, isBacar, sourceBundle, className = '' }) {
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold tracking-tight border",
        isBacar 
          ? "bg-[#DBF1E3] text-[#28A05C] border-[#C5E8D2]" 
          : "bg-[#FFEED9] text-[#E06428] border-[#FFDEB8]"
      )}>
        {code}
      </span>
      {sourceBundle && (
        <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap font-sans">
          ← from {sourceBundle}
        </span>
      )}
    </div>
  );
}
