import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { PlanTab, PlanTabMeta } from '@/types/places';

interface PlanTabsProps {
  tabs: PlanTabMeta[];
  active: PlanTab;
  onChange: (tab: PlanTab) => void;
}

/** Suggestions/Voting tab bar with count pills, plus the map tip on the plan tab. */
export function PlanTabs({ tabs, active, onChange }: PlanTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border flex items-center justify-between gap-3 border-b">
      <div className="flex gap-2" role="tablist" aria-label="Plan view">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
              'border-b-2',
              active === tab.id
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                  active === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {active === 'plan' && (
        <span className="text-muted-foreground mb-2 hidden text-xs sm:inline">
          {t('plan.tipClickMap', 'Tip: click any place on the map to add it.')}
        </span>
      )}
    </div>
  );
}
