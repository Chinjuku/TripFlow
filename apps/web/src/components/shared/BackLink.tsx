import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

export function BackLink({ to, label, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-xs font-semibold transition-colors',
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
