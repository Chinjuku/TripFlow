import React from 'react';
import { cn } from '@trip-flow/ui/lib/cn';
import { BackLink } from './BackLink';

interface TripPageHeaderProps {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  withBorder?: boolean;
  className?: string;
}

export function TripPageHeader({
  backTo,
  backLabel,
  title,
  subtitle,
  actions,
  withBorder = false,
  className,
}: TripPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        withBorder && 'border-border border-b pb-6',
        className,
      )}
    >
      <div className="space-y-1">
        <BackLink to={backTo} label={backLabel} className="mb-2" />
        <h1 className="text-foreground font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          ) : (
            <div className="text-muted-foreground text-sm">{subtitle}</div>
          )
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
