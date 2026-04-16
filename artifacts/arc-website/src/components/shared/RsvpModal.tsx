import { useState } from "react";
import { useCreateRsvp } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEventsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

interface RsvpModalProps {
  event: { id: number; title: string; date: string; time: string; location: string } | null;
  onClose: () => void;
}

export function RsvpModal({ event, onClose }: RsvpModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const queryClient = useQueryClient();
  const createRsvp = useCreateRsvp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setServerError("");
    createRsvp.mutate(
      { id: event.id, data: { name, email } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          setDone(true);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || "Something went wrong.";
          setServerError(msg);
        },
      }
    );
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setDone(false);
    setServerError("");
    onClose();
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {done ? "You're registered!" : `RSVP — ${event?.title}`}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-primary" />
            <p className="text-muted-foreground">
              Thanks, <span className="font-semibold text-foreground">{name}</span>! We've got you
              on the list for <span className="font-semibold text-foreground">{event?.title}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              {event?.date} · {event?.time} · {event?.location}
            </p>
            <Button className="mt-2 w-full rounded-none" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {event?.date} · {event?.time} · {event?.location}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="rsvp-name">Full Name</Label>
              <Input
                id="rsvp-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rsvp-email">Email Address</Label>
              <Input
                id="rsvp-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-none" disabled={createRsvp.isPending}>
                {createRsvp.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : "Confirm RSVP"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
