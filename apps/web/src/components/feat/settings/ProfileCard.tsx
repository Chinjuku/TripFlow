import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Mail, ShieldCheck, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export function ProfileCard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="text-primary h-5 w-5" strokeWidth={1.75} />
          {t('settings.profile')}
        </CardTitle>
        <CardDescription>
          {t('settings.profileDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 border-border flex items-center gap-6 rounded-xl border p-4">
          {user?.avatarUrl ? (
            <div className="border-primary/40 relative h-20 w-20 overflow-hidden rounded-full border-2">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold shadow-inner">
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="space-y-1">
            <h4 className="text-foreground text-sm font-semibold">{t('settings.profilePicture')}</h4>
            <p className="text-muted-foreground text-xs">
              {t('settings.profilePictureDesc')}
            </p>
          </div>
        </div>

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
              <Input
                id="email"
                type="email"
                value={user?.email ?? ''}
                disabled
                className="pl-10"
              />
              <Mail
                className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
                strokeWidth={1.75}
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/10 border-primary/20 text-foreground mt-4 flex items-center gap-3 rounded-lg border p-4 text-sm">
          <ShieldCheck className="text-primary h-5 w-5 shrink-0" strokeWidth={1.75} />
          <p>
            {t('settings.googleOAuthNotice')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
