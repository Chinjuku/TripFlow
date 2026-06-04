import { useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';

interface PhotoGalleryProps {
  photos: string[];
  rating: number | null;
  ratingCount: number | null;
}

/** Hero photo + clickable thumbnails; tapping a thumb promotes it to the hero. */
export function PhotoGallery({ photos, rating, ratingCount }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-2">
      {/* isolate + own overflow-hidden so the rounded corners aren't clipped
          by the scrolling modal body (WebKit warps nested radii on scroll). */}
      <div className="bg-muted isolate relative h-56 w-full overflow-hidden rounded-xl">
        <img src={photos[active]} alt="" className="h-full w-full object-cover transition-opacity" />
        {rating !== null && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={2} />
              <span className="text-sm font-bold text-slate-900">{rating.toFixed(1)}</span>
              {ratingCount !== null && (
                <span className="text-xs text-slate-500">
                  {t('plan.detailReviews', '{{count}} reviews', { count: ratingCount })}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        // Thumbnails fill the modal width - one equal-width column per photo.
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${photos.length}, 1fr)` }}>
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              className={cn(
                'h-14 overflow-hidden rounded-lg transition-opacity',
                i === active ? 'ring-primary ring-2 ring-offset-1' : 'opacity-60 hover:opacity-100',
              )}
            >
              <img src={url} alt="" loading="lazy" className="bg-muted h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
