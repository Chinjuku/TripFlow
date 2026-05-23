import type { LucideIcon } from 'lucide-react';

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
  title: string;
  desc: string;
}
