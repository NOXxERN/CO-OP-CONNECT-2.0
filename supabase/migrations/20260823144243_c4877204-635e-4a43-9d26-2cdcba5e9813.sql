-- roles
create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'customer',
  city text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role','customer'),
    new.raw_user_meta_data->>'city'
  )
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'wrench',
  base_price integer not null default 300,
  unit text not null default 'per visit'
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select using (true);

-- workers
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  photo_seed text not null default 'w',
  service_id uuid not null references public.services(id) on delete cascade,
  experience_years integer not null default 1,
  rating numeric(2,1) not null default 4.5,
  jobs_done integer not null default 0,
  availability boolean not null default true,
  city text not null default 'Kolkata',
  lat double precision not null default 22.5726,
  lng double precision not null default 88.3639,
  verification_status text not null default 'pending',
  insurance_active boolean not null default false,
  society text not null default 'Kolkata Labour Cooperative Society',
  languages text[] not null default array['Hindi','English'],
  hourly_rate integer not null default 250,
  created_at timestamptz not null default now()
);
grant select on public.workers to anon, authenticated;
grant insert, update on public.workers to authenticated;
grant all on public.workers to service_role;
alter table public.workers enable row level security;
create policy "workers public read verified" on public.workers for select using (verification_status = 'verified' or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "workers insert own" on public.workers for insert to authenticated with check (user_id = auth.uid());
create policy "workers update own" on public.workers for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  address text not null default '',
  city text not null default 'Kolkata',
  lat double precision,
  lng double precision,
  scheduled_at timestamptz not null default now(),
  status text not null default 'requested',
  price integer not null default 0,
  is_emergency boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings select involved" on public.bookings for select to authenticated using (
  customer_id = auth.uid()
  or exists (select 1 from public.workers w where w.id = bookings.worker_id and w.user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "bookings insert own" on public.bookings for insert to authenticated with check (customer_id = auth.uid());
create policy "bookings update involved" on public.bookings for update to authenticated using (
  customer_id = auth.uid()
  or exists (select 1 from public.workers w where w.id = bookings.worker_id and w.user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);

-- ratings
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default now()
);
grant select on public.ratings to anon, authenticated;
grant insert on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "ratings public read" on public.ratings for select using (true);
create policy "ratings insert own booking" on public.ratings for insert to authenticated with check (
  customer_id = auth.uid()
  and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
);

-- demand history for AI forecasting
create table public.demand_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  city text not null default 'Kolkata',
  day date not null,
  requests integer not null default 0,
  unique (service_id, city, day)
);
grant select on public.demand_history to anon, authenticated;
grant all on public.demand_history to service_role;
alter table public.demand_history enable row level security;
create policy "demand public read" on public.demand_history for select using (true);

-- keep worker aggregate rating fresh
create or replace function public.refresh_worker_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.workers w
  set rating = round(sub.avg_stars::numeric, 1)
  from (select avg(stars) as avg_stars from public.ratings where worker_id = new.worker_id) sub
  where w.id = new.worker_id;
  return new;
end; $$;
create trigger ratings_refresh_worker after insert on public.ratings
  for each row execute function public.refresh_worker_rating();

-- ============ SEED ============
insert into public.services (slug, name, description, icon, base_price, unit) values
  ('electrician','Electrician','Wiring, fittings, fans, inverters and safety checks','zap',350,'per visit'),
  ('plumber','Plumber','Leakages, taps, drainage, tanks and bathroom fittings','droplets',300,'per visit'),
  ('carpenter','Carpenter','Furniture repair, doors, modular fittings and polish','hammer',400,'per visit'),
  ('painter','Painter','Interior and exterior painting, putty and texture work','paintbrush',450,'per day'),
  ('cleaning','Deep Cleaning','Home, kitchen, bathroom and sofa deep cleaning','sparkles',600,'per session'),
  ('caregiver','Caregiver','Elder care, patient attendant and post-surgery support','heart-pulse',800,'per day'),
  ('domestic-help','Domestic Help','Cooking, dishes, laundry and daily housekeeping','home',500,'per day'),
  ('driver','Driver','Verified local and outstation drivers on demand','car',700,'per day'),
  ('gardener','Gardener','Lawn care, pruning, potting and terrace gardens','flower-2',350,'per visit'),
  ('technician','Appliance Technician','AC, fridge, washing machine and RO repair','settings',400,'per visit');

-- workers seed
insert into public.workers (name, photo_seed, service_id, experience_years, rating, jobs_done, availability, city, lat, lng, verification_status, insurance_active, society, languages, hourly_rate)
select
  n.name,
  'w' || n.i,
  s.id,
  1 + ((n.i * 7 + p.k) % 18),
  round((3.6 + ((n.i * 3 + p.k) % 14) * 0.1)::numeric, 1),
  10 + ((n.i * 37 + p.k * 11) % 320),
  ((n.i + p.k) % 5) <> 0,
  c.city,
  c.lat + ((n.i % 9) - 4) * 0.011,
  c.lng + ((p.k % 9) - 4) * 0.011,
  case when (n.i + p.k) % 11 = 0 then 'pending' else 'verified' end,
  ((n.i + p.k) % 4) <> 0,
  c.city || ' Labour Cooperative Society',
  case when (n.i + p.k) % 3 = 0 then array['Bengali','Hindi','English'] when (n.i + p.k) % 3 = 1 then array['Hindi','English'] else array['Bengali','Hindi'] end,
  180 + ((n.i * 13 + p.k * 7) % 12) * 20
from (values
  (1,'Ramesh Kumar'),(2,'Anil Sahu'),(3,'Sujata Das'),(4,'Mohan Lal'),(5,'Farid Sheikh'),
  (6,'Pooja Mandal'),(7,'Vikram Singh'),(8,'Sanjay Barman'),(9,'Rekha Devi'),(10,'Imran Ali'),
  (11,'Deepak Roy'),(12,'Kavita Ghosh'),(13,'Suresh Yadav'),(14,'Nasir Khan'),(15,'Lakshmi Nair')
) as n(i,name)
cross join (values (1,'Kolkata',22.5726,88.3639),(2,'Howrah',22.5958,88.2636)) as c(k,city,lat,lng)
cross join lateral (select id, row_number() over (order by slug) as rn from public.services) s
cross join lateral (select c.k as k) p
where ((n.i + c.k) % 10) = (s.rn % 10) or ((n.i * 3 + c.k) % 10) = (s.rn % 10);

-- demand history: 84 days per service per city
insert into public.demand_history (service_id, city, day, requests)
select s.id, c.city, d::date,
  greatest(3, round(
      (12 + s.rn * 2.2)
    + (extract(doy from d)::int % 7) * 1.4
    + case when extract(dow from d) in (0,6) then 7 else 0 end
    + (extract(epoch from d)::bigint / 86400 % 5)
    + (current_date - d::date) * -0.12
    + (case when s.rn % 3 = 0 then 4 else 0 end)
    + (case when c.city = 'Kolkata' then 6 else 0 end)
  )::int)
from (select id, row_number() over (order by slug) as rn from public.services) s
cross join (values ('Kolkata'),('Howrah')) as c(city)
cross join generate_series(current_date - interval '83 days', current_date - interval '1 day', interval '1 day') as d;