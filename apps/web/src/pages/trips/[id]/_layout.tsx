import { Outlet, useParams } from 'react-router-dom';
import { WorkspaceLayout } from '@/components/shared/layout/WorkspaceLayout';

export default function WorkspaceLayoutRoute() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <WorkspaceLayout tripId={id}>
      <Outlet />
    </WorkspaceLayout>
  );
}
