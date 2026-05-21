import { Outlet, useParams } from 'react-router-dom';
import { TripLayout } from '@/components/layout/TripLayout';

export default function TripLayoutRoute() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <TripLayout tripId={id}>
      <Outlet />
    </TripLayout>
  );
}
