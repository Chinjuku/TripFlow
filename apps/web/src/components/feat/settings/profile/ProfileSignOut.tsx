import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { useAuth } from '@/hooks/useAuth';

/**
 * Sign-out row for the profile card. Mirrors the action already in the user
 * menu, surfaced here because a settings page is the conventional place to
 * look for it.
 */
export function ProfileSignOut() {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    setSigningOut(true);
    // signOut redirects on completion; no need to reset the flag.
    void signOut();
  };

  return (
    <div className="border-border flex items-center justify-between gap-4 border-t pt-5">
      <div>
        <p className="text-foreground text-sm font-medium">{t('settings.signOut')}</p>
        <p className="text-muted-foreground text-xs">{t('settings.signOutDesc')}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={signingOut}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 shrink-0 gap-2"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
        {signingOut ? t('auth.signingOut', 'Signing out…') : t('auth.signOut')}
      </Button>
    </div>
  );
}
