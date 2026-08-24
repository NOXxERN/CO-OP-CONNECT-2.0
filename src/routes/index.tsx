import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Brain,
  Car,
  Droplets,
  Flower2,
  Hammer,
  HeartPulse,
  Home,
  IndianRupee,
  MapPin,
  PaintBucket,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchServices, fetchWorkers, inr, type Service } from "@/lib/coop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Co-op Connect — Verified Cooperative Home Services" },
      {
        name: "description",
        content:
          "Book verified electricians, plumbers, cleaners and caregivers from labour cooperative societies. Fair wages, insured workers, AI-matched nearby.",
      },
      { property: "og:title", content: "Co-op Connect — Verified Cooperative Home Services" },
      {
        property: "og:description",
        content:
          "Cooperative-owned service marketplace: verified workers, fair wages, AI demand forecasting.",
      },
    ],
  }),
  component: LandingPage,
});

const ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  paintbrush: PaintBucket,
  sparkles: Sparkles,
  "heart-pulse": HeartPulse,
  home: Home,
  car: Car,
  "flower-2": Flower2,
  settings: Settings,
};

function ServiceTile({ service, workers }: { service: Service; workers: number }) {
  const Icon = ICONS[service.icon] ?? Settings;
  return (
    <Link
      to="/services/$slug"
      params={{ slug: service.slug }}
      className="surface-card group flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-base font-semibold">{service.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <span>{workers} co-op workers</span>
        <span className="font-semibold text-foreground">
          from {inr(service.base_price)} {service.unit}
        </span>
      </div>
    </Link>
  );
}

function LandingPage() {
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });
  const workers = useQuery({ queryKey: ["workers"], queryFn: fetchWorkers });

  const countFor = (id: string) => (workers.data ?? []).filter((w) => w.service_id === id).length;
  const avgRating =
    workers.data && workers.data.length
      ? (workers.data.reduce((a, w) => a + Number(w.rating), 0) / workers.data.length).toFixed(1)
      : "4.5";

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="hero-gradient border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div>
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <ShieldCheck className="size-3.5" /> Ministry of Cooperation · NCCT · SIH26089
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Household help from{" "}
              <span className="text-gradient-brand">cooperative workers</span>, not middlemen.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Co-op Connect is a cooperative-owned marketplace where Labour Cooperative Societies
              list verified electricians, plumbers, caregivers and cleaners. Fair wages, insurance
              cover, and AI matching that puts the nearest able worker at your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/services/$slug" params={{ slug: "electrician" }}>
                  Book a service
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/worker">Join as a worker</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link to="/admin">Federation dashboard</Link>
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: `${workers.data?.length ?? 0}`, v: "Verified workers" },
                { k: `${services.data?.length ?? 0}`, v: "Service lines" },
                { k: `${avgRating}★`, v: "Average rating" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-bold">{s.k}</dt>
                  <dd className="text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="surface-card space-y-4 p-6">
            <h2 className="font-display text-lg font-bold">How a booking flows</h2>
            <ol className="space-y-3 text-sm">
              {[
                { i: MapPin, t: "Pick a service & your locality", d: "Geo-matching narrows to your ward." },
                { i: Brain, t: "AI ranks nearby workers", d: "Distance 40% · rating 25% · availability 20% · experience 15%." },
                { i: BadgeCheck, t: "Book & the worker accepts", d: "Society-verified ID, skills and insurance status shown upfront." },
                { i: IndianRupee, t: "Digital invoice at co-op rates", d: "Transparent price, wage retained by the worker's society." },
                { i: Star, t: "Rate the job", d: "Feedback updates the worker's cooperative profile." },
              ].map((s) => (
                <li key={s.t} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <s.i className="size-4" />
                  </span>
                  <span>
                    <span className="block font-semibold">{s.t}</span>
                    <span className="text-muted-foreground">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm">
              <Siren className="size-4 text-destructive" />
              <span>
                <span className="font-semibold">Emergency booking</span> — surge-free priority
                dispatch in under 60 minutes.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Services from your local society</h2>
            <p className="text-sm text-muted-foreground">
              Every worker is enrolled with a registered Labour Cooperative Society.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(services.data ?? []).map((s) => (
            <ServiceTile key={s.id} service={s} workers={countFor(s.id)} />
          ))}
          {services.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface-card h-44 animate-pulse bg-muted/40" />
            ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            {
              i: ShieldCheck,
              t: "Worker welfare built in",
              d: "Insurance status, welfare fund contribution and society membership are part of every profile — not an afterthought.",
            },
            {
              i: Brain,
              t: "AI demand forecasting",
              d: "Federations see 7-day demand predictions per service and city, so workforce allocation happens before the rush.",
            },
            {
              i: IndianRupee,
              t: "Fair, published wages",
              d: "Cooperative rate cards replace opaque commissions. Workers keep the wage; the society keeps the platform.",
            },
          ].map((c) => (
            <div key={c.t} className="surface-card p-6">
              <c.i className="size-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Co-op Connect · A cooperative-owned service marketplace prototype for SIH26089
      </footer>
    </div>
  );
}
