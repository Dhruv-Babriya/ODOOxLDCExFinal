import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'gold' | 'silver';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-800',
    destructive: 'bg-rose-950/70 text-rose-300 border-rose-800',
    outline: 'bg-transparent text-zinc-300 border-zinc-700',
    gold: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    silver: 'bg-slate-400/20 text-slate-200 border-slate-400/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
