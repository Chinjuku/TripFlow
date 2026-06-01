import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Mail, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

/**
 * Read-only display-name + email fields. Both are sourced from the Google
 * account and aren't editable here, so the inputs stay `disabled`.
 */
export function ProfileFields() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">{t('settings.displayName')}</Label>
        <div className="relative">
          <Input id="name" value={user?.name ?? ''} disabled className="pl-10" />
          <User
            className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
            strokeWidth={1.75}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('settings.emailAddress')}</Label>
        <div className="relative">
          <Input id="email" type="email" value={user?.email ?? ''} disabled className="pl-10" />
          <Mail
            className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
            strokeWidth={1.75}
          />
        </div>
      </div>
    </div>
  );
}
