import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { ShieldCheck, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from './profile/ProfileAvatar';
import { ProfileFields } from './profile/ProfileFields';
import { ProfileSignOut } from './profile/ProfileSignOut';

export function ProfileCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="text-primary h-5 w-5" strokeWidth={1.75} />
          {t('settings.profile')}
        </CardTitle>
        <CardDescription>{t('settings.profileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProfileAvatar />
        <ProfileFields />

        <div className="bg-primary/10 border-primary/20 text-foreground mt-4 flex items-center gap-3 rounded-lg border p-4 text-sm">
          <ShieldCheck className="text-primary h-5 w-5 shrink-0" strokeWidth={1.75} />
          <p>{t('settings.googleOAuthNotice')}</p>
        </div>

        <ProfileSignOut />
      </CardContent>
    </Card>
  );
}
