import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  Map,
  ThumbsUp,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { SidebarUserMenu } from './SidebarUserMenu';

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

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* storage disabled — ignore */
    }
  }, [collapsed]);

  const close = () => onOpenChange(false);

  const navItems: NavItem[] = [
    { name: 'Overview', to: `/trips/${tripId}`, icon: Compass },
    { name: 'Plan', to: `/trips/${tripId}/plan`, icon: Map },
    { name: 'Schedule', to: `/trips/${tripId}/schedule`, icon: Calendar },
    { name: 'Voting', to: `/trips/${tripId}/voting`, icon: ThumbsUp },
    { name: 'Finances', to: `/trips/${tripId}/finances`, icon: Wallet },
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
          'bg-card fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          'w-72',
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
            title="Back to all trips"
          >
            <Compass className="h-5 w-5" strokeWidth={2} />
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

        {/* Back-to-trips link */}
        {!collapsed && (
          <Link
            to="/trips"
            onClick={close}
            className="text-muted-foreground hover:text-foreground mx-6 mt-6 inline-flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            All trips
          </Link>
        )}

        {/* Nav */}
        <nav className="mt-4 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === `/trips/${tripId}`}
                onClick={close}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'h-12 justify-center px-2' : 'h-12 gap-4 px-4',
                    isActive
                      ? 'bg-primary text-primary-foreground/80'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate text-base">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <SidebarUserMenu collapsed={collapsed} />
      </aside>
    </>
  );
}
