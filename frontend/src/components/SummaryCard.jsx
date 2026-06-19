import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { cn } from '../lib/utils';

export default function SummaryCard({ title, value, subLabel, variant = 'default' }) {
  const isPrimary = variant === 'primary';
  
  return (
    <Card className={cn(
      "w-full flex flex-col justify-center",
      isPrimary ? "bg-gradient-terracotta text-primary-foreground border-transparent shadow-paper" : "bg-gradient-warm shadow-soft border-border/50"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className={cn(
          "text-[11px] uppercase tracking-[0.08em] font-medium font-sans",
          isPrimary ? "text-primary-foreground/90" : "text-muted-foreground"
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[38px] font-bold font-display leading-none tracking-tight">{value}</p>
        {subLabel && (
          <p className={cn(
            "mt-3 text-[13px] font-sans",
            isPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {subLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
