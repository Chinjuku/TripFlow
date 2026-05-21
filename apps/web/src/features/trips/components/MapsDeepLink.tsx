import { getPlaceName, type TripItem } from '@/features/trips';

/**
 * Renders a Google Maps directions link built from the trip's stops.
 *
 * Falls back to a disabled placeholder when there aren't enough stops to
 * form a route (origin + destination). No API key required — Google's
 * `/maps/dir/?api=1` endpoint handles query-only deep links.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function MapsDeepLink({ items }: { items: TripItem[] }) {
  const names = items.map(getPlaceName).filter(Boolean);

  if (names.length < 2) {
    return (
      <span className="bg-muted border-border text-muted-foreground inline-flex w-full justify-center rounded-xl border px-4 py-3 text-xs font-semibold">
        Add at least 2 stops to generate a route
      </span>
    );
  }

  const origin = encodeURIComponent(names[0]!);
  const destination = encodeURIComponent(names[names.length - 1]!);
  const waypoints = names.slice(1, -1).map(encodeURIComponent).join('|');
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  const href = waypoints ? `${base}&waypoints=${waypoints}` : base;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bg-card border-border text-foreground hover:bg-muted inline-flex w-full justify-center rounded-xl border px-4 py-3 text-xs font-semibold transition-colors"
    >
      Open Route in Google Maps
    </a>
  );
}
