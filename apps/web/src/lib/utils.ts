/**
 * Formats a date to a localized string (e.g. 'th-TH' for Thai or 'en-US' for English).
 */
export function formatLocalizedDate(
  date: Date | string | number,
  lng: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const locale = lng.startsWith('th') ? 'th-TH' : 'en-US';
  return d.toLocaleDateString(locale, options);
}

/**
 * Formats a date range into a localized string.
 */
export function formatLocalizedDateRange(
  startIso: string,
  endIso: string,
  lng: string
): { range: string; duration: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const locale = lng.startsWith('th') ? 'th-TH' : 'en-US';
  
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: 'short', day: '2-digit' });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);

  const range = `${fmt(start)} - ${fmt(end)}`;
  const duration = lng.startsWith('th')
    ? `${days} วัน`
    : `${days} day${days === 1 ? '' : 's'}`;

  return { range, duration };
}
