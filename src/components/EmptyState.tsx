import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-[#151E31]/45 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-12'
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#151E31] text-[#94A3B8] shadow-inner ${
          compact ? 'h-10 w-10' : 'h-12 w-12'
        }`}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
      </div>
      <h3
        className={`mt-3.5 font-display font-semibold text-[#F8FAFC] ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title}
      </h3>
      <p
        className={`mx-auto mt-1.5 max-w-md leading-relaxed text-[#94A3B8] ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
