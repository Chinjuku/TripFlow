import type { ReactNode } from 'react';

/** Shared surface for trip-settings sections. */
export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <section className="bg-card border-border rounded-2xl border p-5 sm:p-6">{children}</section>
  );
}
