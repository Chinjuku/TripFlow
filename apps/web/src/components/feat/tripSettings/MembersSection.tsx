import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { removeTripMember } from '@/api/trips';
import type { TripMemberProfile } from '@/types/trips';
import { getInitials } from '@/utils/trips';
import { SettingsCard } from './SettingsCard';

interface MembersSectionProps {
  tripId: string;
  members: TripMemberProfile[];
  ownerId: string;
  onChanged: () => void;
}

export function MembersSection({ tripId, members, ownerId, onChanged }: MembersSectionProps) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(member: TripMemberProfile) {
    if (!window.confirm(t('trips.settings.removeMemberConfirm', { name: member.name }))) return;
    setBusyId(member.userId);
    setError(null);
    try {
      await removeTripMember(tripId, member.userId);
      onChanged();
    } catch {
      setError(t('trips.settings.removeMemberFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SettingsCard>
      <div className="mb-4">
        <h2 className="text-foreground text-base font-bold">{t('trips.settings.membersTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('trips.settings.membersDesc')}</p>
      </div>

      {error && (
        <p className="bg-destructive/10 text-destructive mb-3 rounded-lg p-3 text-sm">{error}</p>
      )}

      <ul className="divide-border divide-y">
        {members.map((m) => {
          const isOwner = m.userId === ownerId;
          return (
            <li key={m.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {m.avatarUrl ? (
                <img
                  src={m.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="border-border h-9 w-9 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <span className="bg-muted text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {getInitials(m.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{m.name}</p>
                <p className="text-muted-foreground truncate text-xs">{m.email}</p>
              </div>
              {isOwner ? (
                <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                  {t('trips.settings.owner')}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(m)}
                  disabled={busyId === m.userId}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <UserMinus className="h-4 w-4" strokeWidth={2} />
                  {t('trips.settings.remove')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </SettingsCard>
  );
}
