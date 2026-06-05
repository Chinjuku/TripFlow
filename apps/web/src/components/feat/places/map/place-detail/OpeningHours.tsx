import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Two-column weekday list (Google's weekdayDescriptions) with today highlighted. */
export function OpeningHours({ hours }: { hours: string[] }) {
  const { t } = useTranslation();
  // Google lists Monday-first; JS getDay() is Sunday-first.
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <h5 className="text-foreground mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Clock className="text-primary h-3.5 w-3.5" strokeWidth={2} />
        {t('plan.detailHours', 'Opening hours')}
      </h5>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
        {hours.map((line, i) => {
          const [day, ...rest] = line.split(': ');
          const time = rest.join(': ');
          const isToday = i === todayIdx;
          return (
            <li
              key={line}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5',
                isToday && 'bg-primary/10',
              )}
            >
              <span className={isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                {day}
              </span>
              <span className={cn('text-foreground text-right', isToday && 'font-semibold')}>
                {time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
