import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { Mail, Palette, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { ThemeToggle } from '@/features/theme';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-3xl space-y-8 duration-500 ease-out">
      <div>
        <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Palette className="text-primary h-5 w-5" strokeWidth={1.75} />
            Appearance
          </CardTitle>
          <CardDescription>Choose how TripFlow looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-foreground text-sm font-medium">Theme</p>
              <p className="text-muted-foreground text-xs">
                Switches the entire app, including the login screen.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="text-primary h-5 w-5" strokeWidth={1.75} />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal information synced from your Google account.
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
              <h4 className="text-foreground text-sm font-semibold">Profile Picture</h4>
              <p className="text-muted-foreground text-xs">
                Managed automatically by your connected Google account.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <div className="relative">
                <Input id="name" value={user?.name ?? ''} disabled className="pl-10" />
                <User
                  className="text-muted-foreground absolute left-3 top-2.5 h-5 w-5"
                  strokeWidth={1.75}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
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
              Your account is currently managed via Google OAuth. To update your name or profile
              picture, please make the changes directly in your Google account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
