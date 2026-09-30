create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  important boolean not null default false,
  due_date date,
  start_at timestamptz,
  end_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_at is null or (start_at is not null and end_at >= start_at))
);

create index items_owner_due_idx on public.items (owner, due_date);

alter table public.items enable row level security;

revoke all on table public.items from anon, authenticated;
grant select, insert, update, delete on table public.items to authenticated;

create policy "owner full access" on public.items
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));
