import type { TripMemberProfile } from '@/types/trips';
import { CollaboratorRow } from './CollaboratorRow';

interface CollaboratorsPanelProps {
  members: TripMemberProfile[];
  currentUserId: string | undefined;
}

export function CollaboratorsPanel({ members, currentUserId }: CollaboratorsPanelProps) {
  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
      {members.map((member) => (
        <CollaboratorRow
          key={member.userId}
          member={member}
          isCurrentUser={member.userId === currentUserId}
        />
      ))}
    </div>
  );
}
