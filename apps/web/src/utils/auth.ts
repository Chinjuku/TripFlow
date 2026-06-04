import { MapPin, Users, Zap } from 'lucide-react';
import type { GreetingKey, LoginStep, TermsSection } from '@/types/auth';

/** Time-of-day greeting as an i18n key - resolve with `t(...)` at the call site. */
export function getGreetingKey(now: Date = new Date()): GreetingKey {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'auth.greeting.morning';
  if (hour >= 12 && hour < 17) return 'auth.greeting.afternoon';
  if (hour >= 17 && hour < 22) return 'auth.greeting.evening';
  return 'auth.greeting.lateNight';
}

export const LOGIN_STEPS: readonly LoginStep[] = [
  { icon: MapPin, titleKey: 'auth.steps.addPlaces', descKey: 'auth.steps.addPlacesDesc' },
  { icon: Users, titleKey: 'auth.steps.voteTogether', descKey: 'auth.steps.voteTogetherDesc' },
  { icon: Zap, titleKey: 'auth.steps.dragToPlan', descKey: 'auth.steps.dragToPlanDesc' },
] as const;

export const TERMS_SECTIONS: readonly TermsSection[] = [
  { titleKey: 'auth.terms.sections.account.title', bodyKey: 'auth.terms.sections.account.body' },
  { titleKey: 'auth.terms.sections.data.title', bodyKey: 'auth.terms.sections.data.body' },
  { titleKey: 'auth.terms.sections.usage.title', bodyKey: 'auth.terms.sections.usage.body' },
] as const;

export const HERO_COORDINATES = {
  topLeft: '13.7563° N · 100.5018° E',
  bottomRight: '18.7883° N · 98.9853° E',
} as const;
