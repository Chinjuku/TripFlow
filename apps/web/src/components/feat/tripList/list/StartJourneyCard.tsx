import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StartJourneyCardProps {
  onClick: () => void;
}

export function StartJourneyCard({ onClick }: StartJourneyCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-primary/60 hover:bg-muted/40 focus-visible:ring-ring group hidden h-full min-h-[18rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:flex sm:min-h-[22rem]"
    >
      <div className="border-primary/40 text-primary group-hover:border-primary group-hover:bg-primary/5 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors">
        <Plus className="h-6 w-6" strokeWidth={2} />
      </div>
      <h3 className="font-headline text-foreground text-xl font-bold leading-tight">
        {t('trips.startNewJourney')}
      </h3>
      <p className="text-muted-foreground max-w-[14rem] text-sm">
        {t('trips.startNewJourneyDesc')}
      </p>
    </button>
  );
}
