import { useSearchParams } from 'react-router-dom';
import { User, Palette, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SettingsTab = 'profile' | 'appearance' | 'payment';

const TABS: { id: SettingsTab; icon: React.ElementType }[] = [
  { id: 'profile', icon: User },
  { id: 'appearance', icon: Palette },
  { id: 'payment', icon: CreditCard },
];

export function useSettingsTab(): [SettingsTab, (tab: SettingsTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab') as SettingsTab | null;
  const active: SettingsTab = raw && TABS.some((t) => t.id === raw) ? raw : 'profile';

  const setTab = (tab: SettingsTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return [active, setTab];
}

export function SettingsTabs() {
  const { t } = useTranslation();
  const [active, setTab] = useSettingsTab();

  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
      {TABS.map(({ id, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-background text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">{t(`settings.tabs.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
