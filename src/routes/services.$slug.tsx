import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Brain,
  Clock,
  Languages,
  Loader2,
  MapPin,
  ShieldCheck,
  Siren,
  Star,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  CITIES,
  fetchServices,
  fetchWorkers,
  inr,
  scoreWorkers,
  type ScoredWorker,
} from "@/lib/coop";

export const Route = createFileRoute("/services/$slug")({
  head: ({ params }) => {
    const pretty = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `Book a verified ${pretty} · Co-op Connect` },
        {
          name: "description",
          content: `AI-matched ${pretty} from registered labour cooperative societies near you. Verified IDs, insured workers, fair co-op rates.`,
        },
        { property: "og:title", content: `Book a verified ${pretty} · Co-op Connect` },
        {
          property: "og:description",
          content: `Nearby cooperative ${pretty} ranked by distance, rating, availability and experience.`,
        },
      ],
    };
  },
  component: ServicePage,
});

function medal(i: number) {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
}

function ServicePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [city, setCity] = useState(CITIES[0]!.name);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState<ScoredWorker | null>(null);
  const [address, setAddress] = useState("");
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const workers = useQuery({ queryKey: ["workers"], queryFn: fetchWorkers });

  const service = (services.data ?? []).find((s) => s.slug === slug);
  const origin = CITIES.find((c) => c.name === city) ?? CITIES[0]!;

  const ranked = useMemo(() => {
    if (!service || !workers.data) return [];
    const pool = workers.data.filter(
      (w) =>
        w.service_id === service.id &&
        w.city === city &&
        w.verification_status === "verified" &&
        (!onlyAvailable || w.availability),
    );
    return scoreWorkers(pool, origin);
  }, [service, workers.data, city, onlyAvailable, origin]);

  const price = service ? (emergency ? Math.round(service.base_price * 1.25) : service.base_price) : 0;

  async function book() {
    if (!service || !selected) return;
    if (!user) {
      toast.error("Please sign in to confirm a booking");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      worker_id: selected.id,
      service_id: service.id,
      address,
      city,
      lat: origin.lat,
      lng: origin.lng,
      scheduled_at: new Date(when).toISOString(),
      status: "requested",
      price,
      is_emergency: emergency,
      notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    setSelected(null);
    toast.success("Booking confirmed ✅ The worker has been notified");
    navigate({ to: "/bookings" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>{" "}
          / <span className="text-foreground">{service?.name ?? slug}</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{service?.name ?? "Service"}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{service?.description}</p>
          </div>
          {service && (
            <div className="surface-card px-4 py-3 text-sm">
              <span className="text-muted-foreground">Co-op rate card</span>
              <div className="font-display text-xl font-bold">
                {inr(service.base_price)}{" "}
                <span className="text-xs font-normal text-muted-foreground">{service.unit}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="avail" checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
            <Label htmlFor="avail" className="text-sm">
              Available now only
            </Label>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="size-4 text-primary" />
            AI allocation: distance 40% · rating 25% · availability 20% · experience 15%
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ranked.map((w, i) => (
            <div key={w.id} className="surface-card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{w.name}</h3>
                    <BadgeCheck className="size-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{w.society}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-semibold">
                  {medal(i)} {w.score}% match
                </Badge>
              </div>

              <Progress value={w.score} className="h-1.5" />

              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 text-accent" /> {Number(w.rating).toFixed(1)} ·{" "}
                  {w.jobs_done} jobs
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" /> {w.distance.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" /> {w.experience_years} yrs exp
                </span>
                <span className="flex items-center gap-1.5">
                  <Languages className="size-3.5 text-muted-foreground" />{" "}
                  {w.languages.slice(0, 2).join(", ")}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant={w.availability ? "default" : "outline"}>
                  {w.availability ? "Available" : "Busy today"}
                </Badge>
                {w.insurance_active && (
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="size-3" /> Insured
                  </Badge>
                )}
                <Badge variant="outline">{inr(w.hourly_rate)}/hr</Badge>
              </div>

              <Button className="mt-auto" onClick={() => setSelected(w)}>
                Book {w.name.split(" ")[0]}
              </Button>
            </div>
          ))}

          {workers.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card h-64 animate-pulse bg-muted/40" />
            ))}

          {!workers.isLoading && ranked.length === 0 && (
            <div className="surface-card col-span-full p-8 text-center text-sm text-muted-foreground">
              No verified workers listed for this service in {city} yet. Try another city or check
              back — the federation is onboarding societies continuously.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking</DialogTitle>
            <DialogDescription>
              {selected?.name} · {service?.name} · {selected?.society}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addr">Service address</Label>
              <Input
                id="addr"
                placeholder="Flat / house, street, locality"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="when">Date & time</Label>
              <Input
                id="when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Work details (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. two ceiling fans not working, MCB trips"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <span className="flex items-center gap-2 text-sm">
                <Siren className="size-4 text-destructive" /> Emergency dispatch (+25%)
              </span>
              <Switch checked={emergency} onCheckedChange={setEmergency} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">
              <span>Estimated invoice</span>
              <span className="font-display text-lg font-bold">{inr(price)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={book} disabled={busy || !address}>
              {busy && <Loader2 className="size-4 animate-spin" />} Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
