import { AuthHeroPanel } from '@/components/feat/auth/AuthHeroPanel';
import { AuthSignInPanel } from '@/components/feat/auth/AuthSignInPanel';

export default function AuthPage() {
  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      <AuthHeroPanel />
      <AuthSignInPanel />
    </div>
  );
}
