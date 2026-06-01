import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import { useAuth } from '@/hooks/useAuth';

/**
 * Sidebar footer user identity. Static display only — no dropdown. Account
 * actions (settings, sign out) live on the Settings page.
 */
export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="border-border border-t p-3">
      <div className={cn('flex items-center gap-3 p-1.5', collapsed && 'justify-center')}>
        <Avatar user={user} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-semibold">
              {user?.name ?? t('common.traveller')}
            </p>
            <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ user }: { user: { avatarUrl: string | null; name: string } | null }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="border-border h-9 w-9 shrink-0 rounded-full border object-cover"
      />
    );
  }
  return (
    <div className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
      {initial}
    </div>
  );
}
