import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground bg-transparent",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        paid: "border-transparent bg-[oklch(0.92_0.05_145)] text-[oklch(0.32_0.06_145)]",
        sent: "border-transparent bg-[oklch(0.92_0.04_220)] text-[oklch(0.34_0.08_230)]",
        pending: "border-transparent bg-[oklch(0.93_0.06_85)] text-[oklch(0.38_0.08_60)]",
        unpaid: "border-transparent bg-[oklch(0.93_0.06_40)] text-[oklch(0.42_0.13_35)]",
        cancelled: "border-transparent bg-[oklch(0.9_0.01_60)] text-[oklch(0.5_0.015_60)] line-through",
        closed: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
