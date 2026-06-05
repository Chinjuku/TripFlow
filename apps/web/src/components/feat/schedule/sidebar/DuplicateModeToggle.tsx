import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface DuplicateModeToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function DuplicateModeToggle({ value, onChange }: DuplicateModeToggleProps) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t('schedule.duplicateHandling')}
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
        {t('schedule.noRepeats')}
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
        {t('schedule.allowRepeats')}
      </button>
    </div>
  );
}
