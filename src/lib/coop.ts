import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  base_price: number;
  unit: string;
};

export type Worker = {
  id: string;
  user_id: string | null;
  name: string;
  photo_seed: string;
  service_id: string;
  experience_years: number;
  rating: number;
  jobs_done: number;
  availability: boolean;
  city: string;
  lat: number;
  lng: number;
  verification_status: string;
  insurance_active: boolean;
  society: string;
  languages: string[];
  hourly_rate: number;
};

export type Booking = {
  id: string;
  customer_id: string;
  worker_id: string;
  service_id: string;
  address: string;
  city: string;
  scheduled_at: string;
  status: string;
  price: number;
  is_emergency: boolean;
  notes: string | null;
  created_at: string;
};

export type DemandRow = { service_id: string; city: string; day: string; requests: number };

export const CITIES = [
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Howrah", lat: 22.5958, lng: 88.2636 },
];

export const BOOKING_FLOW = ["requested", "accepted", "in_progress", "completed"] as const;

export const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Haversine distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ScoredWorker = Worker & {
  distance: number;
  score: number;
  breakdown: { distance: number; rating: number; availability: number; experience: number };
};

/**
 * AI worker allocation score:
 * distance 40% + rating 25% + availability 20% + experience 15%.
 */
export function scoreWorkers(workers: Worker[], origin: { lat: number; lng: number }): ScoredWorker[] {
  return workers
    .map((w) => {
      const distance = distanceKm(origin, { lat: w.lat, lng: w.lng });
      const distanceScore = Math.max(0, 1 - Math.min(distance, 20) / 20);
      const ratingScore = Math.max(0, (w.rating - 3) / 2);
      const availabilityScore = w.availability ? 1 : 0.25;
      const experienceScore = Math.min(w.experience_years, 15) / 15;
      const score =
        distanceScore * 0.4 + ratingScore * 0.25 + availabilityScore * 0.2 + experienceScore * 0.15;
      return {
        ...w,
        distance,
        score: Math.round(score * 100),
        breakdown: {
          distance: Math.round(distanceScore * 100),
          rating: Math.round(ratingScore * 100),
          availability: Math.round(availabilityScore * 100),
          experience: Math.round(experienceScore * 100),
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}

export type Forecast = {
  serviceId: string;
  history: { day: string; requests: number }[];
  predicted: { day: string; requests: number }[];
  tomorrow: number;
  avg7: number;
  trendPct: number;
  r2: number;
};

/**
 * AI demand forecasting: ordinary least-squares trend on the daily request
 * series, combined with a multiplicative day-of-week seasonality index.
 */
export function forecastDemand(rows: DemandRow[], serviceId: string, horizon = 7): Forecast {
  const history = rows
    .filter((r) => r.service_id === serviceId)
    .map((r) => ({ day: r.day, requests: r.requests }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const n = history.length;
  if (n < 8) {
    return {
      serviceId,
      history,
      predicted: [],
      tomorrow: 0,
      avg7: 0,
      trendPct: 0,
      r2: 0,
    };
  }

  const xs = history.map((_, i) => i);
  const ys = history.map((h) => h.requests);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const fit = (x: number) => intercept + slope * x;

  // R^2 of the trend line
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i]! - fit(xs[i]!)) ** 2;
    ssTot += (ys[i]! - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  // Day-of-week seasonality factors from residual ratios
  const dowSum = new Array(7).fill(0);
  const dowCount = new Array(7).fill(0);
  history.forEach((h, i) => {
    const expected = fit(i);
    if (expected <= 0) return;
    const dow = new Date(h.day + "T00:00:00Z").getUTCDay();
    dowSum[dow] += h.requests / expected;
    dowCount[dow] += 1;
  });
  const dowFactor = dowSum.map((s, i) => (dowCount[i] ? s / dowCount[i] : 1));

  const lastDay = new Date(history[n - 1]!.day + "T00:00:00Z");
  const predicted: { day: string; requests: number }[] = [];
  for (let k = 1; k <= horizon; k++) {
    const d = new Date(lastDay.getTime() + k * 86400000);
    const base = fit(n - 1 + k);
    const value = Math.max(1, Math.round(base * (dowFactor[d.getUTCDay()] ?? 1)));
    predicted.push({ day: d.toISOString().slice(0, 10), requests: value });
  }

  const avg7 = Math.round(ys.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, n));
  const tomorrow = predicted[0]?.requests ?? 0;
  const trendPct = avg7 === 0 ? 0 : Math.round(((tomorrow - avg7) / avg7) * 100);

  return { serviceId, history, predicted, tomorrow, avg7, trendPct, r2 };
}

export const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`;

/* ---------------- data access ---------------- */

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase.from("services").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function fetchWorkers(): Promise<Worker[]> {
  const { data, error } = await supabase.from("workers").select("*").limit(500);
  if (error) throw error;
  return (data ?? []) as Worker[];
}

export async function fetchDemand(city: string): Promise<DemandRow[]> {
  const { data, error } = await supabase
    .from("demand_history")
    .select("service_id, city, day, requests")
    .eq("city", city)
    .order("day")
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as DemandRow[];
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function fetchRatings() {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, booking_id, worker_id, stars, review, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
