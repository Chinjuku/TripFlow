import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface TripsHeaderProps {
  /** Show the desktop "join using code" action. Hidden while loading or empty
   *  (the empty state offers Join itself). */
  showJoin: boolean;
  onJoin: () => void;
}

/** Page header for the trips list: title, subtitle, and the desktop join action. */
export function TripsHeader({ showJoin, onJoin }: TripsHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('trips.title')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('trips.subtitle')}</p>
      </div>
      {showJoin && (
        <Button onClick={onJoin} className="hidden gap-2 self-start sm:inline-flex sm:self-auto">
          <KeyRound className="h-4 w-4" strokeWidth={2} />
          {t('trips.joinUsingCode')}
        </Button>
      )}
    </header>
  );
}
