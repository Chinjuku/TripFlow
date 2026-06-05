// * API
export {
  listTrips,
  createTrip,
  joinTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  removeTripMember,
} from '@/api/trips';

// * Hook
export { useTrips, useTrip } from '@/hooks/useTrips';

// * Type
export type {
  TripSummary,
  CreateTripPayload,
  UpdateTripPayload,
  TripDetail,
  TripMemberProfile,
} from '@/types/trips';

// * Format
export {
  deriveTripStatus,
  formatDateRange,
  coverImageUrl,
  getInitials,
  filterAndSortTrips,
  groupTripsByTime,
} from '@/utils/trips';
export type { TripStatus, DateRangeDisplay, TripFilter, TripSort } from '@/utils/trips';

// * List page components
export { TripCard } from './list/TripCard';
export { TripsToolbar } from './list/TripsToolbar';
export { TripsEmptyState } from './list/TripsEmptyState';
export { TripListSkeleton } from './list/TripListSkeleton';
export { StartJourneyCard } from './list/StartJourneyCard';
export { TripsHeader } from './list/TripsHeader';
export { TripsList } from './list/TripsList';
export { TripSection } from './list/TripSection';
export { TripsMobileFab } from './list/TripsMobileFab';

// * Create flow
export { CreateTripModal } from './create/CreateTripModal';

// * Join flow
export { JoinTripModal } from './join/JoinTripModal';
export { OtpInput } from './join/OtpInput';
