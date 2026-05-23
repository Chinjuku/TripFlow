import { LoginHeroPanel } from '@/components/feat/auth/LoginHeroPanel';
import { LoginSignInPanel } from '@/components/feat/auth/LoginSignInPanel';

export default function LoginPage() {
  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      <LoginHeroPanel />
      <LoginSignInPanel />
    </div>
  );
}
