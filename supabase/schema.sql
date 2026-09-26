-- GroupTrip Ledger starter schema

create table if not exists profiles (
  id uuid primary key,
  name text,
  email text,
  avatar_url text,
  upi_id text,
  created_at timestamptz default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references profiles(id),
  role text default 'member',
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  paid_by uuid references profiles(id),
  category text,
  expense_date date,
  created_at timestamptz default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  participant_id uuid references profiles(id),
  split_type text not null,
  amount numeric(12,2) not null
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  type text,
  vendor text,
  amount numeric(12,2),
  paid_by uuid references profiles(id),
  booking_date date,
  status text default 'confirmed'
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  image_url text,
  merchant text,
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  scan_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) default 1,
  price numeric(12,2) not null
);

create table if not exists item_participants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references bill_items(id) on delete cascade,
  participant_id uuid references profiles(id),
  share numeric(10,4),
  amount numeric(12,2)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  payer_id uuid references profiles(id),
  receiver_id uuid references profiles(id),
  amount numeric(12,2) not null,
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  item_date date,
  location text,
  type text
);
