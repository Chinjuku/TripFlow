import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import type { PlaceReview } from '@/utils/places-map';

const ADVANCE_MS = 4000;

/**
 * Reviews carousel that auto-advances one card every few seconds, pausing on
 * hover/touch. Scroll is also draggable; dots reflect + jump to a review.
 */
export function ReviewCarousel({ reviews }: { reviews: PlaceReview[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance.
  useEffect(() => {
    if (paused || reviews.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % reviews.length);
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, reviews.length]);

  // Scroll the track to the active card whenever it changes.
  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[active] as HTMLElement | undefined;
    if (track && card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }
  }, [active]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ul
        ref={trackRef}
        className="-mx-0.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r, i) => (
          <li
            key={i}
            className="border-border bg-card w-[17rem] max-w-[80%] shrink-0 snap-start rounded-2xl border p-3.5"
          >
            <div className="mb-1.5 flex items-center gap-2">
              {r.authorPhotoUrl ? (
                <img
                  src={r.authorPhotoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                  {r.author.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{r.author}</p>
                {r.relativeTime && (
                  <p className="text-muted-foreground/70 text-xs">{r.relativeTime}</p>
                )}
              </div>
              {r.rating !== null && (
                <span className="bg-muted text-foreground inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={2} />
                  {r.rating}
                </span>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-5 text-sm leading-relaxed">{r.text}</p>
          </li>
        ))}
      </ul>

      {reviews.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {reviews.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Review ${i + 1}`}
              onClick={() => setActive(i)}
              className={
                i === active
                  ? 'bg-primary h-1.5 w-4 rounded-full transition-all'
                  : 'bg-muted-foreground/30 h-1.5 w-1.5 rounded-full transition-all'
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
