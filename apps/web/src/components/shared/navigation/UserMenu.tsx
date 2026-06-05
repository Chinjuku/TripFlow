import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // `rendered` keeps the panel in the DOM; `show` drives the open vs closed
  // pose. They diverge during transitions: on open the panel mounts closed
  // then flips to `show` next frame (enter); on close `show` drops first, then
  // it unmounts once the exit transition ends. A plain `open && …` would yank
  // it from the DOM with no transition.
  const [rendered, setRendered] = useState(false);
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      // Next frame so the browser paints the closed pose before transitioning.
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
    if (!rendered) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRendered(false);
      return;
    }
    // Fallback in case transitionend doesn't fire (e.g. tab hidden).
    const timer = window.setTimeout(() => setRendered(false), 200);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

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
        title={user?.name ?? t('common.traveller')}
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

      {rendered && (
        <div
          role="menu"
          data-state={show ? 'open' : 'closed'}
          onTransitionEnd={() => {
            if (!open) setRendered(false);
          }}
          className={cn(
            'bg-card text-card-foreground border-border absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-lg',
            'origin-top-right transition duration-150 ease-out',
            'data-[state=open]:scale-100 data-[state=open]:opacity-100',
            'data-[state=closed]:scale-95 data-[state=closed]:opacity-0',
            'motion-reduce:transition-none',
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
                {user?.name ?? t('common.traveller')}
              </p>
              <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
            </div>
          </div>

          <div className="p-1">
            <MenuItem
              icon={SettingsIcon}
              label={t('nav.settings')}
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
            />
            <MenuItem
              icon={LogOut}
              label={t('auth.signOut')}
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
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}
