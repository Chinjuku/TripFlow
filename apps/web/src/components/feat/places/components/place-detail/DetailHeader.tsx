import { MapPin, X } from 'lucide-react';

/**
 * Custom modal header (icon tile + name/address + close), matching
 * CreateTripDialog. Used with the modal's `hideHeader` so it owns its close
 * button. Name falls back to the instantly-known label while detail loads.
 */
export function DetailHeader({
  name,
  address,
  onClose,
}: {
  name: string;
  address: string | null;
  onClose: () => void;
}) {
  return (
    <div className="relative px-5 pb-4 pt-5 sm:px-6">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors sm:right-5"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className="flex items-center gap-3.5 pr-10">
        <div className="bg-primary text-primary-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm">
          <MapPin className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-headline text-foreground truncate text-lg font-bold sm:text-xl">
            {name}
          </h2>
          {address && (
            <p className="text-muted-foreground truncate text-xs sm:text-sm">{address}</p>
          )}
        </div>
      </div>
    </div>
  );
}
