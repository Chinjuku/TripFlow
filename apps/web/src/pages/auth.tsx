import { AuthHeroPanel, AuthSignInPanel } from '@/components/feat/auth';

export default function AuthPage() {
  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      <AuthHeroPanel />
      <AuthSignInPanel />
    </div>
  );
}
