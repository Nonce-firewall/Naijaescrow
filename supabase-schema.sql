-- 9ija Escrow - Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query → Paste & Run

-- Users table
create table if not exists users (
  id text primary key,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  kyc_status text not null default 'none' check (kyc_status in ('none', 'pending', 'approved', 'rejected')),
  kyc_data jsonb,
  created_at bigint not null default extract(epoch from now()) * 1000
);

-- Settings table (single-row config)
create table if not exists settings (
  id text primary key,
  ngn_bank_name text not null default 'Zenith Bank',
  ngn_account_number text not null default '1012345678',
  ngn_account_name text not null default '9ija Escrow Ltd.',
  usdt_rate numeric not null default 1540,
  wallet_bsc text not null default '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
  wallet_tron text not null default 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
  wallet_polygon text not null default '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  user_email text not null,
  type text not null check (type in ('buy', 'sell')),
  crypto_amount numeric not null,
  ngn_amount numeric not null,
  rate numeric not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  network text not null,
  token text not null default 'USDT',
  payment_screenshot text not null,
  user_bank_details jsonb,
  admin_bank_details jsonb,
  admin_wallet_address text,
  blockchain_tx_id text,
  rejection_reason text,
  created_at bigint not null default extract(epoch from now()) * 1000,
  processed_at bigint
);

-- Announcements table
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  scope text not null default 'all' check (scope in ('public', 'private', 'all')),
  is_active boolean not null default true,
  created_at bigint not null default extract(epoch from now()) * 1000
);

-- Coins table
create table if not exists coins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text not null,
  network text not null,
  wallet_address text not null,
  rate numeric not null,
  logo_url text,
  published boolean not null default true,
  created_at bigint not null default extract(epoch from now()) * 1000
);

-- Enable Row Level Security on all tables
alter table users enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table announcements enable row level security;
alter table coins enable row level security;

-- RLS Policies: Allow all operations from anon/authenticated keys (app handles auth logic)
-- Users
create policy "Allow all on users" on users for all using (true) with check (true);
-- Settings
create policy "Allow all on settings" on settings for all using (true) with check (true);
-- Orders
create policy "Allow all on orders" on orders for all using (true) with check (true);
-- Announcements
create policy "Allow all on announcements" on announcements for all using (true) with check (true);
-- Coins
create policy "Allow all on coins" on coins for all using (true) with check (true);

-- Enable Realtime on all tables
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table settings;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table coins;
