import { NavLink, useLocation } from 'react-router-dom';
import { Map, Calendar, Compass, Wallet, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';

interface ButtomBarProps {
  tripId: string;
}

export function ButtomBar({ tripId }: ButtomBarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const isFinancesActive =
    location.pathname.includes('/finances') ||
    location.pathname.includes('/all-expenses') ||
    location.pathname.includes('/to-receive') ||
    location.pathname.includes('/to-pay') ||
    location.pathname.includes('/monitoring');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 supports-[backdrop-filter]:bg-card/75 border-t border-border/50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] grid grid-cols-5 items-center px-2 md:hidden">
      {/* 1. Plan */}
      <NavLink
        to={`/trips/${tripId}/plan`}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center h-12 w-full rounded-2xl transition-all active:scale-95',
            isActive
              ? 'text-primary bg-primary/5 font-semibold'
              : 'text-muted-foreground/70 hover:text-foreground',
          )
        }
      >
        <Map className="h-5 w-5" strokeWidth={2} />
        <span className="text-[9px] mt-0.5 tracking-wider">{t('nav.plan')}</span>
      </NavLink>

      {/* 2. Schedule */}
      <NavLink
        to={`/trips/${tripId}/schedule`}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center h-12 w-full rounded-2xl transition-all active:scale-95',
            isActive
              ? 'text-primary bg-primary/5 font-semibold'
              : 'text-muted-foreground/70 hover:text-foreground',
          )
        }
      >
        <Calendar className="h-5 w-5" strokeWidth={2} />
        <span className="text-[9px] mt-0.5 tracking-wider">{t('nav.schedule')}</span>
      </NavLink>

      {/* 3. Overview (Floating Primary Color Circle in Center) */}
      <div className="relative flex justify-center items-center h-full">
        <NavLink
          to={`/trips/${tripId}`}
          end
          className={({ isActive }) =>
            cn(
              'absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 active:scale-90 hover:scale-105',
              isActive
                ? 'bg-primary text-primary-foreground ring-4 ring-background shadow-lg shadow-primary/40'
                : 'bg-muted text-muted-foreground ring-4 ring-background shadow-md hover:text-foreground',
            )
          }
        >
          <Compass
            className="h-6 w-6 transition-transform duration-500 hover:rotate-180"
            strokeWidth={2}
          />
        </NavLink>
      </div>

      {/* 4. Finances */}
      <NavLink
        to={`/trips/${tripId}/finances`}
        className={cn(
          'flex flex-col items-center justify-center h-12 w-full rounded-2xl transition-all active:scale-95',
          isFinancesActive
            ? 'text-primary bg-primary/5 font-semibold'
            : 'text-muted-foreground/70 hover:text-foreground',
        )}
      >
        <Wallet className="h-5 w-5" strokeWidth={2} />
        <span className="text-[9px] mt-0.5 tracking-wider">{t('nav.finances')}</span>
      </NavLink>

      {/* 5. Settings */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center h-12 w-full rounded-2xl transition-all active:scale-95',
            isActive
              ? 'text-primary bg-primary/5 font-semibold'
              : 'text-muted-foreground/70 hover:text-foreground',
          )
        }
      >
        <Settings className="h-5 w-5" strokeWidth={2} />
        <span className="text-[9px] mt-0.5 tracking-wider">{t('nav.settings')}</span>
      </NavLink>
    </nav>
  );
}
