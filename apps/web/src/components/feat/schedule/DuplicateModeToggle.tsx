import { cn } from '@trip-flow/ui/lib/cn';

interface DuplicateModeToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function DuplicateModeToggle({ value, onChange }: DuplicateModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Place duplicate handling"
      className="bg-muted/60 flex w-full gap-1 rounded-full p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        onClick={() => onChange(false)}
        className={cn(
          'flex-1 rounded-full px-3 py-1 text-[0.7rem] font-semibold transition-colors',
          !value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        No repeats
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value}
        onClick={() => onChange(true)}
        className={cn(
          'flex-1 rounded-full px-3 py-1 text-[0.7rem] font-semibold transition-colors',
          value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Allow repeats
      </button>
    </div>
  );
}
