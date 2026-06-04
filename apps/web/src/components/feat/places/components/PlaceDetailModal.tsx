import { APIProvider } from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@trip-flow/ui/components/modal';
import { ModalHeader } from '@trip-flow/ui/components/modal-header';
import { usePlaceDetail } from '@/hooks/usePlaceDetail';
import { DetailBody } from './place-detail/DetailBody';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface PlaceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Google place_id (TripPlace.externalId). */
  placeId: string | null;
  /** Shown instantly in the header while details load. */
  placeName: string;
}

export function PlaceDetailModal({ open, onOpenChange, placeId, placeName }: PlaceDetailModalProps) {
  if (!API_KEY) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} title={placeName} className="sm:max-w-2xl">
        <p className="text-muted-foreground text-sm">{placeName}</p>
      </Modal>
    );
  }
  return (
    <APIProvider apiKey={API_KEY}>
      <DetailModal open={open} onOpenChange={onOpenChange} placeId={placeId} placeName={placeName} />
    </APIProvider>
  );
}

/**
 * Lives under the APIProvider so it can read place detail and split it across
 * the modal's header, scrollable body, and pinned footer (the "Open in Google
 * Maps" CTA stays anchored to the bottom without scrolling).
 */
function DetailModal({ open, onOpenChange, placeId, placeName }: PlaceDetailModalProps) {
  const { t } = useTranslation();
  const { detail, loading, error } = usePlaceDetail(placeId, open);

  const footer = detail?.googleMapsUri ? (
    <a
      href={detail.googleMapsUri}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors"
    >
      <ExternalLink className="h-4 w-4" strokeWidth={2} />
      {t('plan.detailOpenMaps', 'Open in Google Maps')}
    </a>
  ) : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={placeName}
      hideHeader
      footer={footer}
      // Wider + shorter than the default; the inner flex column (and its
      // scrollable body) is capped via the child selector so content scrolls
      // within a compact dialog instead of growing tall.
      className="sm:max-w-2xl sm:max-h-[80dvh] [&>div]:max-h-[80dvh]"
    >
      <ModalHeader
        icon={MapPin}
        truncate
        title={detail?.name ?? placeName}
        subtitle={detail?.address ?? undefined}
        onClose={() => onOpenChange(false)}
      />
      <DetailBody detail={detail} loading={loading} error={error} />
    </Modal>
  );
}
