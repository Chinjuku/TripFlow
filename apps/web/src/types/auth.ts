import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n/types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
}

export interface LoginStep {
  icon: LucideIcon;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}

export type GreetingKey = Extract<TranslationKey, `auth.greeting.${string}`>;

export interface TermsSection {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}
