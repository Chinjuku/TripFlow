import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';
import { Input } from '@trip-flow/ui/components/input';
import { cn } from '@trip-flow/ui/lib/cn';

/** Result handed back to the caller once a destination is chosen. */
export interface DestinationValue {
  /** Human-readable label shown in the field, e.g. "Chiang Mai, Thailand". */
  name: string;
  lat: number;
  lng: number;
}

interface DestinationPickerProps {
  value: DestinationValue | null;
  onChange: (next: DestinationValue | null) => void;
  placeholder?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/**
 * City / province picker backed by Google Places Autocomplete (New SDK).
 *
 * Restricted to `(regions)` so suggestions are cities, provinces, and
 * countries — not individual businesses. The chosen place's geometry becomes
 * the trip's map centre, so the plan map opens on the right location and
 * place search is biased correctly from the very first interaction.
 *
 * If no Maps API key is configured the field degrades to a plain text input
 * (name only, no coordinates) so trip creation still works.
 */
export function DestinationPicker(props: DestinationPickerProps) {
  if (!API_KEY) {
    return (
      <PlainDestinationInput
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
      />
    );
  }
  return (
    <APIProvider apiKey={API_KEY}>
      <DestinationPickerInner {...props} />
    </APIProvider>
  );
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

function DestinationPickerInner({ value, onChange, placeholder }: DestinationPickerProps) {
  const placesLib = useMapsLibrary('places');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Session token groups keystrokes + the final fetch into one billed session. */
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  /** Monotonic guard so a slow autocomplete response can't clobber a newer one. */
  const reqRef = useRef(0);

  // The text shown in the input: the picked destination's name, or whatever
  // the user is mid-typing once they start editing again.
  const display = value && !open ? value.name : query;

  useEffect(() => {
    if (!placesLib || !open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const reqId = ++reqRef.current;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const { suggestions: results } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            includedPrimaryTypes: ['(regions)'],
            sessionToken: sessionTokenRef.current,
          });
        if (reqId !== reqRef.current) return;
        setSuggestions(
          results
            .map((r) => r.placePrediction)
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({
              placeId: p.placeId,
              primary: p.mainText?.text ?? p.text.text,
              secondary: p.secondaryText?.text ?? '',
            })),
        );
      } catch (err) {
        console.error('[destination-picker] autocomplete failed', err);
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [placesLib, query, open]);

  async function pick(suggestion: Suggestion) {
    if (!placesLib) return;
    setOpen(false);
    setSuggestions([]);
    try {
      const place = new placesLib.Place({ id: suggestion.placeId });
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress'],
        // Closing the session with the details fetch ends billing for it.
        ...(sessionTokenRef.current ? { sessionToken: sessionTokenRef.current } : {}),
      });
      sessionTokenRef.current = null;
      if (!place.location) return;
      const name =
        suggestion.secondary
          ? `${suggestion.primary}, ${suggestion.secondary}`
          : (place.displayName ?? suggestion.primary);
      onChange({ name, lat: place.location.lat(), lng: place.location.lng() });
    } catch (err) {
      console.error('[destination-picker] details fetch failed', err);
    }
  }

  function clear() {
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          strokeWidth={1.75}
        />
        <Input
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          autoComplete="off"
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            setOpen(true);
          }}
          onFocus={() => {
            // Re-entering edit mode: seed the query with the picked name so
            // the user can tweak it instead of starting from blank.
            if (value) setQuery(value.name);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="pl-10 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear destination"
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="bg-card border-border absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 max-h-60 overflow-auto rounded-xl border shadow-lg"
        >
          {loading && suggestions.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">…</li>
          )}
          {suggestions.map((s) => (
            <li key={s.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                // onMouseDown fires before the input's onBlur, so the pick
                // registers before the dropdown closes.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(s);
                }}
                className={cn(
                  'hover:bg-muted flex w-full items-start gap-2 px-3 py-2 text-left',
                )}
              >
                <MapPin
                  className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-sm font-medium">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Keyless fallback — name only, no coordinates. */
function PlainDestinationInput({
  value,
  onChange,
  placeholder,
}: Omit<DestinationPickerProps, 'value'> & { value: DestinationValue | null }) {
  const text = useMemo(() => value?.name ?? '', [value]);
  return (
    <div className="relative">
      <MapPin
        className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        strokeWidth={1.75}
      />
      <Input
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value.trim();
          // No geometry available without the Maps API — store name only.
          onChange(v ? { name: v, lat: NaN, lng: NaN } : null);
        }}
        className="pl-10"
      />
    </div>
  );
}
