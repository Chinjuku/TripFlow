import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export type TripSettingsTab = 'details' | 'members';

interface TripSettingsTabsProps {
  active: TripSettingsTab;
  onChange: (tab: TripSettingsTab) => void;
}

/** Underline tab switcher for the trip-settings page. */
export function TripSettingsTabs({ active, onChange }: TripSettingsTabsProps) {
  const { t } = useTranslation();

  const tabs: { id: TripSettingsTab; label: string }[] = [
    { id: 'details', label: t('trips.settings.detailsTitle') },
    { id: 'members', label: t('trips.settings.membersTitle') },
  ];

  return (
    <div className="border-border flex items-center gap-2 border-b" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative -mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
            active === tab.id
              ? 'border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
