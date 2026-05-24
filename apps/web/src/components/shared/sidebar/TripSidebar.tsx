import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  Map,
  Wallet,
  X,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { SidebarUserMenu } from './SidebarUserMenu';
import { useTrip, coverImageUrl } from '@/components/feat/trips';
import { InviteModal } from '@/components/feat/overview';

const COLLAPSE_KEY = 'sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}

interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
}

interface TripSidebarProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripSidebar({ tripId, open, onOpenChange }: TripSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { t } = useTranslation();

  const { data: trip } = useTrip(tripId);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* storage disabled — ignore */
    }
  }, [collapsed]);

  const location = useLocation();
  const close = () => onOpenChange(false);

  const navItems: NavItem[] = [
    { name: t('nav.overview'), to: `/trips/${tripId}`, icon: Compass },
    { name: t('nav.plan'), to: `/trips/${tripId}/plan`, icon: Map },
    { name: t('nav.schedule'), to: `/trips/${tripId}/schedule`, icon: Calendar },
    { name: t('nav.finances'), to: `/trips/${tripId}/finances`, icon: Wallet },
  ];

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        aria-label="Trip navigation"
        className={cn(
          'bg-card hidden md:flex md:sticky md:top-0 md:h-screen flex-col transition-all duration-300 ease-in-out border-r border-border/50',
          collapsed ? 'md:w-20' : 'md:w-72',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex items-center gap-3 pt-6 transition-all',
            collapsed ? 'flex-col px-3' : 'px-6',
          )}
        >
          <Link
            to="/trips"
            className="border-primary text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
            title={t('overview.allTrips')}
          >
            <SpinningCompass />
          </Link>

          {!collapsed && (
            <span className="font-headline text-primary text-2xl font-bold tracking-tight">
              TripFlow
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'text-muted-foreground hover:text-foreground hidden h-8 w-8 shrink-0 md:flex',
              collapsed ? 'mt-2' : 'ml-auto',
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            title="Close menu"
            className="text-muted-foreground hover:text-foreground ml-auto h-8 w-8 md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="mt-8 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isFinancesItem = item.to.endsWith('/finances');
            const isFinancesActive = isFinancesItem && (
              location.pathname.includes('/finances') || 
              location.pathname.includes('/all-expenses') || 
              location.pathname.includes('/to-receive') || 
              location.pathname.includes('/to-pay') || 
              location.pathname.includes('/monitoring')
            );
            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === `/trips/${tripId}`}
                onClick={close}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) => {
                  const active = isFinancesActive || isActive;
                  return cn(
                    'group flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'h-12 justify-center px-2' : 'h-12 gap-4 px-4',
                    active
                      ? 'bg-primary text-primary-foreground/80'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  );
                }}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate text-base">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Trip Info & Invite Section */}
        {trip && (
          <div className={cn('px-4 py-3', collapsed && 'px-2 py-3 flex justify-center')}>
            {collapsed ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                title={`Invite to ${trip.title}`}
                className="group relative flex h-10 w-10 overflow-hidden rounded-xl border border-border bg-muted hover:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <img
                  src={coverImageUrl(trip.id, 80, 80)}
                  alt={trip.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ) : (
              <div className="bg-muted/40 border border-border/50 rounded-2xl p-3 flex flex-col gap-3">
                {/* Image and Trip Name */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted shadow-inner group">
                  <img
                    src={coverImageUrl(trip.id, 320, 180)}
                    alt={trip.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-primary-foreground/70">{t('overview.currentTrip')}</p>
                    <h3 className="font-headline text-sm font-bold text-white truncate">
                      {trip.title}
                    </h3>
                  </div>
                </div>

                {/* Invite Button */}
                <Button
                  onClick={() => setInviteOpen(true)}
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold h-9 rounded-xl shadow-sm bg-primary/90 hover:bg-primary transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('overview.inviteFriends')}
                </Button>
              </div>
            )}
          </div>
        )}

        <SidebarUserMenu collapsed={collapsed} />
      </aside>

      {/* Invite Modal */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        trip={trip}
      />
    </>
  );
}
