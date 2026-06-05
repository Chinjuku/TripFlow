import { KeyRound, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TripsMobileFabProps {
  onCreate: () => void;
  onJoin: () => void;
}

/** Mobile-only floating actions: join with a code, and create a trip. */
export function TripsMobileFab({ onCreate, onJoin }: TripsMobileFabProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:hidden">
      <button
        type="button"
        onClick={onJoin}
        aria-label={t('trips.joinUsingCode')}
        className="bg-card text-foreground border-border focus-visible:ring-ring inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <KeyRound className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onCreate}
        aria-label={t('trips.startNewJourney')}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
