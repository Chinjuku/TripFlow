import { MapPin, Users, Zap } from 'lucide-react';
import type { LoginStep } from '@/types/auth';

export function getGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Late-night travel planning?';
}

export const LOGIN_STEPS: readonly LoginStep[] = [
  { icon: MapPin, title: 'Add places', desc: 'Drop pins' },
  { icon: Users, title: 'Vote together', desc: 'Pick favourites' },
  { icon: Zap, title: 'Drag to plan', desc: 'Build the day' },
] as const;

export const HERO_COORDINATES = {
  topLeft: '13.7563° N · 100.5018° E',
  bottomRight: '18.7883° N · 98.9853° E',
} as const;
