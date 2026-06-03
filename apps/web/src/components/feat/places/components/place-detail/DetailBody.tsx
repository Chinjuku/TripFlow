import { Globe, ImageOff, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { hostname, type PlaceDetail } from '@/utils/places-map';
import { ContactRow } from './ContactRow';
import { OpeningHours } from './OpeningHours';
import { PhotoGallery } from './PhotoGallery';
import { ReviewCarousel } from './ReviewCarousel';

interface DetailBodyProps {
  detail: PlaceDetail | null;
  loading: boolean;
  error: boolean;
}

/** Scrollable content: photos, contact, opening hours, reviews. Address lives
 *  in the header, so it's intentionally omitted here. */
export function DetailBody({ detail, loading, error }: DetailBodyProps) {
  const { t } = useTranslation();

  if (loading || (!detail && !error)) {
    return (
      <div className="space-y-4 px-5 pb-2 sm:px-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <p className="text-muted-foreground px-5 py-6 text-center text-sm sm:px-6">
        {t('plan.detailFailed', 'Couldn’t load place details.')}
      </p>
    );
  }

  return (
    <div className="space-y-5 px-5 pb-2 sm:px-6">
      {detail.photoUrls.length > 0 ? (
        <PhotoGallery
          photos={detail.photoUrls}
          rating={detail.rating}
          ratingCount={detail.ratingCount}
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-56 w-full items-center justify-center rounded-2xl">
          <ImageOff className="h-8 w-8" strokeWidth={1.5} />
        </div>
      )}

      {/* Phone + website share one row (each takes half). */}
      {(detail.phone || detail.website) && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {detail.phone && (
            <ContactRow icon={Phone} label={t('plan.detailPhone', 'Phone')}>
              <a href={`tel:${detail.phone}`} className="text-foreground hover:text-primary">
                {detail.phone}
              </a>
            </ContactRow>
          )}
          {detail.website && (
            <ContactRow icon={Globe} label={t('plan.detailWebsite', 'Website')}>
              <a
                href={detail.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary truncate underline-offset-2 hover:underline"
              >
                {hostname(detail.website)}
              </a>
            </ContactRow>
          )}
        </div>
      )}

      {detail.hours.length > 0 && <OpeningHours hours={detail.hours} />}

      {detail.reviews.length > 0 && (
        <div>
          <h5 className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            {t('plan.detailReviewsHeading', 'Reviews')}
          </h5>
          <ReviewCarousel reviews={detail.reviews} />
        </div>
      )}
    </div>
  );
}
