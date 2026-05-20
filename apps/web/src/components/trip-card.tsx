import { buildDirectionsUrl } from '@/lib/maps';

export interface Place {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export function TripCard({ place }: { place: Place }) {
  const directionsUrl = buildDirectionsUrl({ lat: place.lat, lng: place.lng });

  return (
    <article className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{place.name}</h3>
        {place.address && (
          <p className="text-muted-foreground mt-1 truncate text-sm">{place.address}</p>
        )}
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
        </p>
      </div>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`เปิด Google Maps นำทางไป ${place.name}`}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <NavIcon />
        นำทาง
      </a>
    </article>
  );
}

function NavIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
