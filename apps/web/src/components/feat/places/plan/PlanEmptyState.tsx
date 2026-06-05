import { ArrowRight, MapPinned, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { PlanTab } from '@/types/places';

interface PlanEmptyStateProps {
  tab: PlanTab;
  onGoToPlan: () => void;
}

export function PlanEmptyState({ tab, onGoToPlan }: PlanEmptyStateProps) {
  const { t } = useTranslation();

  if (tab === 'vote') {
    return (
      <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center duration-500 sm:p-8">
        <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
          <Sparkles className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-foreground text-base font-bold">{t('plan.nothingToVote')}</p>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
            {t('plan.nothingToVoteDesc')}
          </p>
        </div>
        <Button onClick={onGoToPlan} size="sm" variant="outline" className="mt-2 gap-2">
          {t('plan.addCandidates')}
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    );
  }
  return (
    <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center duration-500 sm:p-8">
      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
        <MapPinned className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-base font-bold">{t('plan.noPlacesPicked')}</p>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
          {t('plan.noPlacesPickedDesc')}
        </p>
      </div>
    </div>
  );
}
