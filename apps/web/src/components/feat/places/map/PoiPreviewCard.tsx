import { useState } from 'react';
import { Check, Clock, ImageOff, MapPin, Plus, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { bucketFor, BUCKETS } from '@/utils/places';
import { localized, type PoiPreview } from '@/utils/places-map';

interface PoiPreviewCardProps {
  poi: PoiPreview;
  loading: boolean;
  alreadyPicked: boolean;
  onAdd: () => void | Promise<void>;
  onClose: () => void;
}

/** Content of the map's POI InfoWindow - hero photo/rating, name, hours, add. */
export function PoiPreviewCard({ poi, loading, alreadyPicked, onAdd, onClose }: PoiPreviewCardProps) {
  const { t, i18n } = useTranslation();
  const [adding, setAdding] = useState(false);

  const displayName = localized(i18n.language, poi.name, poi.nameEn) ?? poi.name;
  const displayAddress = localized(i18n.language, poi.address, poi.addressEn);

  async function handleAdd() {
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  }

  const categoryLabel = poi.category ? t(BUCKETS[bucketFor(poi.category)].labelKey) : null;

  return (
    <div className="w-[20rem] max-w-[84vw]">
      {/* Hero */}
      <div className="relative h-36 w-full overflow-hidden">
        {poi.photoUrl ? (
          <img
            src={poi.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="from-primary/25 via-tertiary/15 flex h-full w-full items-center justify-center bg-gradient-to-br to-transparent">
            <ImageOff className="text-muted-foreground/40 h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        {/* Dark fade so chips stay legible on any photo. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Own close button (Google's header is disabled). */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('plan.mapClose')}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Category badge - top-left, clear of the close button. */}
        {categoryLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {categoryLabel}
          </span>
        )}

        {/* Name + rating sit on the photo for a richer header. */}
        <div className="absolute inset-x-3 bottom-2.5">
          {poi.rating !== null && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-900 shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={2} />
              {poi.rating.toFixed(1)}
            </span>
          )}
          <h4 className="font-headline truncate text-base font-bold leading-snug text-white drop-shadow">
            {displayName}
          </h4>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-3.5">
        {displayAddress && (
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
            <MapPin className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="line-clamp-2">{displayAddress}</span>
          </p>
        )}

        {poi.openingHoursText && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <Clock className="text-primary h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{poi.openingHoursText}</span>
          </p>
        )}

        <Button
          type="button"
          onClick={handleAdd}
          disabled={adding || loading || alreadyPicked}
          size="sm"
          className="h-10 w-full gap-2 rounded-xl font-semibold"
        >
          {alreadyPicked ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {t('plan.poiAdded')}
            </>
          ) : loading ? (
            t('plan.poiLoading')
          ) : adding ? (
            t('plan.poiAdding')
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t('plan.poiAdd')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
