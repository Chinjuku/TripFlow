import { useSearchParams } from 'react-router-dom';
import { User, Palette, CreditCard, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SettingsTab = 'profile' | 'appearance' | 'payment' | 'notifications';

const TABS: { id: SettingsTab; icon: React.ElementType }[] = [
  { id: 'profile', icon: User },
  { id: 'appearance', icon: Palette },
  { id: 'payment', icon: CreditCard },
  { id: 'notifications', icon: Bell },
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

interface SettingsTabsProps {
  /**
   * `horizontal` - pill row (mobile, stacked above content).
   * `vertical` - stacked nav for the desktop sidebar (left of content).
   */
  orientation?: 'horizontal' | 'vertical';
}

export function SettingsTabs({ orientation = 'horizontal' }: SettingsTabsProps) {
  const { t } = useTranslation();
  const [active, setTab] = useSettingsTab();
  const vertical = orientation === 'vertical';

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      className={
        vertical
          ? 'flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm'
          : 'flex gap-1 rounded-xl border border-border bg-muted/50 p-1'
      }
    >
      {TABS.map(({ id, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setTab(id)}
            className={
              vertical
                ? `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`
                : `flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className={vertical ? '' : 'hidden sm:inline'}>{t(`settings.tabs.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
