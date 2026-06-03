import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

/**
 * Profile avatar block: the user's Google picture (or an initial fallback)
 * beside a short label. Read-only — the picture comes from the Google account.
 */
export function ProfileAvatar() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="bg-muted/50 border-border flex items-center gap-4 rounded-xl border p-4 sm:gap-6">
      {user?.avatarUrl ? (
        <div className="border-primary/40 relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 sm:h-20 sm:w-20">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold shadow-inner sm:h-20 sm:w-20 sm:text-3xl">
          {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <h4 className="text-foreground text-sm font-semibold">{t('settings.profilePicture')}</h4>
        <p className="text-muted-foreground text-xs">{t('settings.profilePictureDesc')}</p>
      </div>
    </div>
  );
}
