import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Labeled contact field - icon tile + uppercase label + value (phone, website…). */
export function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
      <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[0.65rem] font-semibold uppercase tracking-wide">
          {label}
        </p>
        <div className="truncate text-sm">{children}</div>
      </div>
    </div>
  );
}
