import { useState } from 'react';
import { UserPlus, Copy, Check } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Modal } from '@trip-flow/ui/components/modal';
import { cn } from '@trip-flow/ui/lib/cn';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    title: string;
    inviteCode: string;
  } | null | undefined;
}

export function InviteModal({ open, onOpenChange, trip }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  if (!trip) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite to Trip"
      hideHeader
      className="overflow-hidden"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-3 text-center sm:px-6 sm:pb-6">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full animate-pulse">
            <UserPlus className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="font-headline text-foreground text-xl font-bold">
            Invite Friends
          </h2>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Share this unique invite code with your friends so they can join your trip <b>{trip.title}</b>.
          </p>
        </div>

        <div className="border-border border-t" />

        {/* Invite Code display */}
        <div className="flex flex-col items-center gap-4 px-5 py-6 sm:px-6">
          <div className="bg-muted border border-border flex items-center justify-between gap-4 w-full max-w-sm rounded-2xl px-5 py-4 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-0.5">
                Invite Code
              </span>
              <span className={cn(
                "font-mono text-2xl font-black tracking-widest transition-colors duration-200 select-all",
                copied ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {copied ? trip.inviteCode : '******'}
              </span>
            </div>
            <Button
              onClick={handleCopyCode}
              variant={copied ? 'default' : 'outline'}
              size="sm"
              className={cn("h-10 rounded-xl gap-2 font-semibold min-w-[5.5rem] transition-all", copied && "bg-green-600 hover:bg-green-600")}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-border border-t" />

        {/* Steps */}
        <div className="bg-muted/50 px-5 py-5 sm:px-6 text-sm flex flex-col gap-3">
          <h4 className="font-semibold text-foreground">How to use this code:</h4>
          <ol className="list-decimal list-inside text-muted-foreground text-xs space-y-2 leading-relaxed">
            <li>Tell your friends to sign in to <b>TripFlow</b></li>
            <li>Go to the <b>Trips</b> page and click <b>"Join Trip Using Code"</b></li>
            <li>Paste or enter the code to instantly join</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="border-border border-t p-5 sm:p-6">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-primary hover:bg-primary/95 text-primary-foreground h-11 w-full rounded-xl font-semibold shadow-sm"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
