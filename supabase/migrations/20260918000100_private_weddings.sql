create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  second_name text not null check (char_length(btrim(second_name)) between 1 and 80),
  wedding_date date not null check (wedding_date between date '1900-01-01' and date '2199-12-31'),
  location text not null check (char_length(btrim(location)) between 1 and 160),
  message text not null default '' check (message = btrim(message) and char_length(message) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.weddings enable row level security;
revoke all on public.weddings from anon, authenticated;
grant select, insert, update on public.weddings to authenticated;

create policy "Owners read their wedding" on public.weddings
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners create their wedding" on public.weddings
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners update their wedding" on public.weddings
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create function public.set_wedding_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_wedding_updated_at() from public;
create trigger wedding_updated_at before update on public.weddings
for each row execute function public.set_wedding_updated_at();
