import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/hooks/useAuth';

/**
 * Avatar button that opens a dropdown with user info + actions.
 *
 * Closes on: outside click, ESC, focus leaving the menu, or after
 * clicking an item. Anchored to the avatar trigger with a small offset
 * so the panel doesn't cover the avatar itself.
 */
export function UserMenu() {
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

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={user?.name ?? 'Account'}
        className="focus-visible:ring-ring rounded-full ring-2 ring-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="border-border h-9 w-9 rounded-full border object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'bg-card text-card-foreground border-border absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          <div className="border-border flex items-center gap-3 border-b p-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="border-border h-10 w-10 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {initial}
              </div>
            )}
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

interface MenuItemProps {
  icon: typeof SettingsIcon;
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
