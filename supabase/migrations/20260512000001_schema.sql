-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Albums
create table public.albums (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  year int not null,
  slug text unique not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.albums enable row level security;

-- Sticker categories
create table public.sticker_categories (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums on delete cascade,
  name text not null,
  sort_order int not null default 0
);

alter table public.sticker_categories enable row level security;

-- Stickers
create table public.stickers (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.sticker_categories on delete cascade,
  code text not null,
  name text not null,
  sort_order int not null default 0
);

alter table public.stickers enable row level security;

-- Collections (one per user per album)
create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles on delete cascade,
  album_id uuid not null references public.albums on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique(owner_id, album_id)
);

alter table public.collections enable row level security;

-- Collection collaborators (shared access)
create table public.collection_collaborators (
  collection_id uuid not null references public.collections on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

alter table public.collection_collaborators enable row level security;

-- Collection stickers (tracking state per sticker)
create table public.collection_stickers (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections on delete cascade,
  sticker_id uuid not null references public.stickers on delete cascade,
  status text not null default 'missing' check (status in ('owned', 'missing')),
  duplicate_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique(collection_id, sticker_id)
);

alter table public.collection_stickers enable row level security;

-- Indexes
create index on public.sticker_categories (album_id, sort_order);
create index on public.stickers (category_id, sort_order);
create index on public.collection_stickers (collection_id, sticker_id);
create index on public.collection_stickers (collection_id, status);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on collection_stickers
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger collection_stickers_updated_at
  before update on public.collection_stickers
  for each row execute procedure public.update_updated_at();
