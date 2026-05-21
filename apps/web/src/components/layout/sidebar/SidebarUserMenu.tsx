import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Sidebar variant of the user dropdown. Differs from the topbar UserMenu:
 * the panel opens UP, anchored to the bottom-left footer chip.
 */
export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="border-border relative border-t p-3">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2',
          collapsed && 'justify-center',
        )}
      >
        <Avatar user={user} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-semibold">
              {user?.name ?? 'Traveller'}
            </p>
            <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
          </div>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'bg-card text-card-foreground border-border absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            collapsed ? 'left-3 w-60' : 'inset-x-3',
          )}
        >
          <div className="border-border flex items-center gap-3 border-b p-3">
            <Avatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-semibold">
                {user?.name ?? 'Traveller'}
              </p>
              <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
            </div>
          </div>

          <div className="p-1">
            <MenuItem
              icon={SettingsIcon}
              label="Settings"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
            />
            <MenuItem
              icon={LogOut}
              label="Sign out"
              variant="destructive"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  user,
  size = 'md',
}: {
  user: { avatarUrl: string | null; name: string } | null;
  size?: 'md' | 'lg';
}) {
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  const dim = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('border-border shrink-0 rounded-full border object-cover', dim)}
      />
    );
  }
  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        dim,
      )}
    >
      {initial}
    </div>
  );
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

function MenuItem({ icon: Icon, label, onClick, variant = 'default' }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
        variant === 'destructive'
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}
