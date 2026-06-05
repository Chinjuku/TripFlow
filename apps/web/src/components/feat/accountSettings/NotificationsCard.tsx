import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/**
 * Notification preferences. Persisted to localStorage for now - there is no
 * notification delivery backend yet, so these toggles record intent only.
 * When a backend lands, swap `useNotificationPrefs` for an API-backed hook;
 * the card UI stays the same.
 */
type PrefKey = 'settlements' | 'expenses' | 'memberJoined' | 'placeAdded';

const PREFS: PrefKey[] = ['memberJoined', 'placeAdded', 'expenses', 'settlements'];
const STORAGE_KEY = 'tf_notification_prefs';

type Prefs = Record<PrefKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  settlements: true,
  expenses: true,
  memberJoined: true,
  placeAdded: true,
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function NotificationsCard() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  const toggle = (key: PrefKey) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota / private-mode - fail open */
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bell className="text-primary h-5 w-5" strokeWidth={1.75} />
          {t('settings.notifications')}
        </CardTitle>
        <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="divide-border divide-y">
        {PREFS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-foreground text-sm font-medium">
                {t(`settings.notif.${key}`)}
              </p>
              <p className="text-muted-foreground text-xs">{t(`settings.notif.${key}Desc`)}</p>
            </div>
            <Toggle checked={prefs[key]} onChange={() => toggle(key)} label={t(`settings.notif.${key}`)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

/** Minimal switch - used only here, so kept local rather than shared. */
function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'focus-visible:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'bg-background inline-block h-5 w-5 transform rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
