-- CUSTOM ME database. Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again.

-- Products: one row per product, the whole product as JSON, in shop order.
create table if not exists public.products (
  id text primary key,
  position integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Orders: `number` gives the CM-1001, CM-1002… order numbers.
create table if not exists public.orders (
  id text primary key,
  number bigint generated always as identity (start with 1001) unique,
  client_key text,
  created_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists orders_client_recent on public.orders (client_key, created_at);

alter table public.products enable row level security;
alter table public.orders enable row level security;
revoke all on public.products, public.orders from anon, authenticated;
grant select, insert, update, delete on public.products, public.orders to service_role;
grant usage, select on all sequences in schema public to service_role;
