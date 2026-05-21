import React from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trip-flow/ui/components/card';
import { Input } from '@trip-flow/ui/components/input';
import { Label } from '@trip-flow/ui/components/label';
import { User, Mail, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <p className="text-slate-400 mt-2">Manage your account settings and preferences.</p>
      </div>

      <Card className="border-indigo-500/20 shadow-[0_0_40px_-15px_rgba(99,102,241,0.2)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal information synced from your Google account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
            {user?.avatarUrl ? (
              <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-indigo-500/30">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shadow-inner">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">Profile Picture</h4>
              <p className="text-xs text-slate-500">
                Managed automatically by your connected Google account.
              </p>
            </div>
          </div>

          {/* Form Fields (Read-Only) */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Display Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={user?.name ?? ''}
                  disabled
                  className="pl-10"
                />
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="pl-10"
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm mt-4">
            <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0" />
            <p>
              Your account is currently managed via Google OAuth. To update your name or profile picture, 
              please make the changes directly in your Google account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
