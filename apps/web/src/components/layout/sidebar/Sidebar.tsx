import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';

const COLLAPSE_KEY = 'sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface SidebarProps {
  /** Controls the mobile drawer; ignored on >= md screens. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* incognito or storage disabled — ignore */
    }
  }, [collapsed]);

  const close = () => onOpenChange(false);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={cn(
          'bg-card fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          'w-72',
          collapsed ? 'md:w-20' : 'md:w-72',
        )}
      >
        {/* Brand block */}
        <div
          className={cn(
            'flex items-start gap-3 pt-7 pb-4 transition-all',
            collapsed ? 'flex-col items-center px-3' : 'px-6',
          )}
        >
          <div className="border-primary text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2">
            <Compass className="h-5 w-5" strokeWidth={2} />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="font-headline text-primary text-2xl font-bold leading-none tracking-tight">
                TripFlow
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">Adventure Planner</p>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'text-muted-foreground hover:text-foreground hidden h-8 w-8 shrink-0 md:flex',
              collapsed && 'mt-2',
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            title="Close menu"
            className="text-muted-foreground hover:text-foreground h-8 w-8 md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <SidebarNav collapsed={collapsed} onNavigate={close} />
        <SidebarFooter collapsed={collapsed} onNavigate={close} />
      </aside>
    </>
  );
}
