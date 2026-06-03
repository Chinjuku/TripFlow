import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  coverImageUrl,
  deriveTripStatus,
  getInitials,
  type TripMemberProfile,
  type TripSummary,
} from '@/components/feat/trips';
import { formatLocalizedDateRange } from '@/lib/utils';
import { TripStatusBadge } from './TripStatusBadge';

interface TripCardProps {
  trip: TripSummary;
}

const MAX_VISIBLE_AVATARS = 4;

export function TripCard({ trip }: TripCardProps) {
  const { i18n } = useTranslation();
  const { range, duration } = formatLocalizedDateRange(trip.startsOn, trip.endsOn, i18n.language);
  const status = deriveTripStatus(trip);

  return (
    <article className="bg-card border-border group flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Own overflow-hidden + matching radius so the image zoom is clipped
          here — the card's own clip can warp during the hover transform
          (nested transforms make the rounded corners flicker square). */}
      <Link
        to={`/trips/${trip.id}`}
        className="relative block overflow-hidden rounded-t-2xl"
      >
        <img
          src={coverImageUrl(trip.id)}
          alt=""
          loading="lazy"
          decoding="async"
          className="bg-muted aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:aspect-auto sm:h-44"
        />
        {/* Gradient scrim keeps the status badge legible over any cover photo. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <TripStatusBadge
          status={status}
          className="absolute left-3 top-3 shadow-sm backdrop-blur"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-4">
        <Link to={`/trips/${trip.id}`}>
          <h3 className="font-headline text-foreground group-hover:text-primary truncate text-2xl font-bold transition-colors sm:text-xl">
            {trip.title}
          </h3>
        </Link>

        {trip.destinationName && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{trip.destinationName}</span>
          </div>
        )}

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            {range} <span className="text-muted-foreground/60 mx-1">•</span> {duration}
          </span>
        </div>

        <div className="border-border/60 mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <MemberAvatars members={trip.members} />
          <span
            className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-1 font-mono text-xs tracking-wider"
            title="Invite code"
          >
            {trip.inviteCode}
          </span>
        </div>
      </div>
    </article>
  );
}

function MemberAvatars({ members }: { members: TripMemberProfile[] }) {
  if (members.length === 0) return <span aria-hidden />;
  const visible = members.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = members.length - visible.length;

  return (
    <div
      className="flex items-center -space-x-2"
      aria-label={`${members.length} member${members.length === 1 ? '' : 's'}`}
    >
      {visible.map((m) => (
        <MemberAvatar key={m.userId} member={m} />
      ))}
      {overflow > 0 && (
        <span
          className="bg-muted text-muted-foreground border-card relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-[0.7rem] font-semibold sm:h-7 sm:w-7 sm:text-[0.65rem]"
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function MemberAvatar({ member }: { member: TripMemberProfile }) {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        title={member.name}
        referrerPolicy="no-referrer"
        className="border-card bg-muted relative h-8 w-8 rounded-full border-2 object-cover sm:h-7 sm:w-7"
      />
    );
  }
  return (
    <span
      title={member.name}
      className="bg-muted text-primary border-card relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-[0.7rem] font-bold sm:h-7 sm:w-7 sm:text-[0.65rem]"
    >
      {getInitials(member.name)}
    </span>
  );
}
