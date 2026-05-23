import { getInitials, type TripMemberProfile } from '@/components/feat/trips';

interface CollaboratorRowProps {
  member: TripMemberProfile;
  isCurrentUser: boolean;
}

export function CollaboratorRow({ member, isCurrentUser }: CollaboratorRowProps) {
  const initials = getInitials(member.name);

  return (
    <div className="flex items-center gap-3">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.name}
          referrerPolicy="no-referrer"
          className="border-border h-8 w-8 rounded-full border object-cover"
        />
      ) : (
        <div className="bg-muted border-border text-primary flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">
          {member.name}
          {member.role === 'owner' && (
            <span className="text-muted-foreground ml-1 text-xs font-normal">(Owner)</span>
          )}
          {isCurrentUser && (
            <span className="text-muted-foreground ml-1 text-xs font-normal">· you</span>
          )}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.email || member.role}</p>
      </div>
    </div>
  );
}
