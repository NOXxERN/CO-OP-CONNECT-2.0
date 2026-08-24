import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, MapPin, Siren, Star } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  fetchMyBookings,
  fetchServices,
  fetchWorkers,
  inr,
  STATUS_LABEL,
  type Booking,
} from "@/lib/coop";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "My bookings · Co-op Connect" },
      { name: "description", content: "Track your cooperative service bookings and rate completed jobs." },
      { property: "og:title", content: "My bookings · Co-op Connect" },
      { property: "og:description", content: "Live status of your household service bookings." },
    ],
  }),
  component: BookingsPage,
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Could not load bookings.</div>
  ),
});

const statusTone: Record<string, "default" | "secondary" | "outline"> = {
  requested: "outline",
  accepted: "secondary",
  in_progress: "secondary",
  completed: "default",
  cancelled: "outline",
};

function BookingsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<Booking | null>(null);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  const bookings = useQuery({ queryKey: ["bookings"], queryFn: fetchMyBookings });
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const workers = useQuery({ queryKey: ["workers"], queryFn: fetchWorkers });
  const rated = useQuery({
    queryKey: ["my-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ratings").select("booking_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.booking_id as string);
    },
  });

  const mine = (bookings.data ?? []).filter((b) => b.customer_id === user?.id);
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name ?? "Service";
  const workerName = (id: string) => workers.data?.find((w) => w.id === id)?.name ?? "Co-op worker";

  async function submitRating() {
    if (!rating || !user) return;
    setBusy(true);
    const { error } = await supabase.from("ratings").insert({
      booking_id: rating.id,
      customer_id: user.id,
      worker_id: rating.worker_id,
      stars,
      review: review || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setRating(null);
    setReview("");
    toast.success("Thanks! Your feedback updates the worker's co-op profile");
    queryClient.invalidateQueries({ queryKey: ["my-ratings"] });
    queryClient.invalidateQueries({ queryKey: ["workers"] });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live status straight from the worker's app.
        </p>

        <div className="mt-6 space-y-3">
          {bookings.isLoading && (
            <div className="surface-card h-24 animate-pulse bg-muted/40" />
          )}

          {!bookings.isLoading && mine.length === 0 && (
            <div className="surface-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
              <Button className="mt-4" asChild>
                <Link to="/">Browse services</Link>
              </Button>
            </div>
          )}

          {mine.map((b) => (
            <div key={b.id} className="surface-card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-48 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{serviceName(b.service_id)}</h2>
                  {b.is_emergency && (
                    <Badge variant="outline" className="gap-1">
                      <Siren className="size-3" /> Emergency
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">with {workerName(b.worker_id)}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    {new Date(b.scheduled_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {b.address || b.city}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <Badge variant={statusTone[b.status] ?? "outline"}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </Badge>
                <div className="mt-1 font-display font-bold">{inr(b.price)}</div>
              </div>
              {b.status === "completed" && !(rated.data ?? []).includes(b.id) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRating(b);
                    setStars(5);
                  }}
                >
                  <Star className="size-4" /> Rate
                </Button>
              )}
              {b.status === "completed" && (rated.data ?? []).includes(b.id) && (
                <span className="text-xs text-muted-foreground">Rated ✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!rating} onOpenChange={(o) => !o && setRating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this job</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}>
                <Star
                  className={
                    n <= stars ? "size-8 fill-accent text-accent" : "size-8 text-muted-foreground"
                  }
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="How was the work? (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRating(null)}>
              Cancel
            </Button>
            <Button onClick={submitRating} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Submit rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
