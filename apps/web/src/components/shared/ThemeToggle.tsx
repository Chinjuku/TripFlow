import { Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/types/theme';

interface Option {
  value: Theme;
  label: string;
  icon: LucideIcon;
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className="bg-muted inline-flex rounded-lg p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              'focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
