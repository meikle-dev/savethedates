-- F078: the couple's private guest list and table plan.
--
-- Both tables are owner-only through the owning wedding (RLS on every operation); guests of the wedding never read
-- them and there is no anonymous function. A guest's table must belong to the same wedding (composite foreign key).
-- The database enforces the seat rules the planner relies on: a seat is within its table's size and not kept empty,
-- one guest per seat (deferred, so a swap in one statement is valid), and guests who aren't attending have no seat.
-- Limits (1,000 guests, 100 tables per wedding) are checked under the wedding row lock. Multi-row changes (seating,
-- a table edit with its moves, removing many guests, updating from replies) go through security-invoker functions,
-- so each is one transaction and RLS still decides which rows can change.

create table public.wedding_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40 and name !~ '[[:cntrl:]]'),
  shape text not null check (shape in ('round', 'long', 'square', 'top')),
  seats smallint not null check (seats between 1 and 30),
  kept_empty smallint[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- Target of the guests' composite foreign key.
  constraint wedding_tables_id_wedding_key unique (id, wedding_id)
);
create unique index wedding_tables_name_key on public.wedding_tables (wedding_id, lower(name));

-- Kept-empty seats are distinct seat numbers within the table's size.
create function public.valid_kept_empty(seat_numbers smallint[], table_seats smallint) returns boolean
language sql immutable set search_path = '' as $$
  select count(s) = count(*) and count(distinct s) = count(*) and coalesce(bool_and(s between 1 and table_seats), true)
  from unnest(seat_numbers) as s;
$$;
-- Check constraints run with the caller's rights, so authenticated keeps Supabase's default EXECUTE grant (as for
-- valid_meal_menu). The function is pure and reveals nothing.
revoke all on function public.valid_kept_empty(smallint[], smallint) from public;
alter table public.wedding_tables add constraint wedding_tables_kept_empty_valid check (public.valid_kept_empty(kept_empty, seats));

create table public.wedding_guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120 and name !~ '[[:cntrl:]]'),
  group_name text not null default '' check (group_name = btrim(group_name) and char_length(group_name) <= 60 and group_name !~ '[[:cntrl:]]'),
  status text not null default 'awaiting' check (status in ('awaiting', 'attending', 'declined')),
  table_id uuid,
  seat smallint,
  created_at timestamptz not null default now(),
  -- Deleting a table sets only table_id to null; normalise_guest_seat then clears the seat.
  constraint wedding_guests_table_fk foreign key (table_id, wedding_id)
    references public.wedding_tables (id, wedding_id) on delete set null (table_id),
  constraint wedding_guests_seat_pair check ((table_id is null) = (seat is null)),
  constraint wedding_guests_seat_range check (seat is null or seat between 1 and 30),
  constraint wedding_guests_declined_unseated check (status <> 'declined' or table_id is null),
  -- Deferred so that swapping two guests, or moving a whole table round, is valid at the end of the statement.
  constraint wedding_guests_seat_key unique (table_id, seat) deferrable initially deferred
);
create index wedding_guests_wedding_created on public.wedding_guests (wedding_id, created_at, id);

alter table public.wedding_tables enable row level security;
alter table public.wedding_guests enable row level security;
revoke all on public.wedding_tables from anon, authenticated;
revoke all on public.wedding_guests from anon, authenticated;
-- wedding_id and created_at are never updated, so a row can't be moved to another wedding.
grant select, insert, delete on public.wedding_tables to authenticated;
grant update (name, shape, seats, kept_empty, position) on public.wedding_tables to authenticated;
grant select, insert, delete on public.wedding_guests to authenticated;
grant update (name, group_name, status, table_id, seat) on public.wedding_guests to authenticated;

create policy "Owners read their tables" on public.wedding_tables for select to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners add tables" on public.wedding_tables for insert to authenticated
  with check (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners change their tables" on public.wedding_tables for update to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners remove their tables" on public.wedding_tables for delete to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));

create policy "Owners read their guests" on public.wedding_guests for select to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners add guests" on public.wedding_guests for insert to authenticated
  with check (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners change their guests" on public.wedding_guests for update to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));
create policy "Owners remove their guests" on public.wedding_guests for delete to authenticated
  using (exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid())));

-- A guest who isn't attending, or whose table was deleted, has no seat.
create function public.normalise_guest_seat() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'declined' or new.table_id is null then
    new.table_id := null;
    new.seat := null;
  end if;
  return new;
end;
$$;
revoke all on function public.normalise_guest_seat() from public;
create trigger normalise_guest_seat before insert or update of status, table_id, seat on public.wedding_guests
  for each row execute function public.normalise_guest_seat();

-- A seat must exist at its table and not be kept empty. Checked at commit, after every change in the transaction.
create function public.check_guest_seat() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Waits for a concurrent change to the same table (for example keeping this seat empty in another tab), so the
  -- check below sees it rather than both commits passing.
  perform 1 from public.wedding_tables t where t.id = (select g.table_id from public.wedding_guests g where g.id = new.id) for share;
  if exists (
    select 1 from public.wedding_guests g
    join public.wedding_tables t on t.id = g.table_id
    where g.id = new.id and (g.seat > t.seats or g.seat = any(t.kept_empty))
  ) then
    raise exception using errcode = '23514', message = 'seat_unavailable';
  end if;
  return null;
end;
$$;
revoke all on function public.check_guest_seat() from public;
create constraint trigger check_guest_seat after insert or update of table_id, seat on public.wedding_guests
  deferrable initially deferred for each row execute function public.check_guest_seat();

create function public.check_table_seats() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.wedding_guests g join public.wedding_tables t on t.id = g.table_id
    where t.id = new.id and (g.seat > t.seats or g.seat = any(t.kept_empty))
  ) then
    raise exception using errcode = '23514', message = 'seat_unavailable';
  end if;
  return null;
end;
$$;
revoke all on function public.check_table_seats() from public;
create constraint trigger check_table_seats after update of seats, kept_empty on public.wedding_tables
  deferrable initially deferred for each row execute function public.check_table_seats();

-- Limits, counted after each insert statement under the wedding row lock, so concurrent imports are serialised and
-- the second sees the first's rows. The owner's update grant on weddings allows the lock; RLS limits it to their row.
create function public.check_guest_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  target uuid;
begin
  for target in select distinct wedding_id from inserted loop
    perform 1 from public.weddings where id = target for no key update;
    if (select count(*) from public.wedding_guests where wedding_id = target) > 1000 then
      raise exception using errcode = '23514', message = 'guest_limit';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public.check_guest_limit() from public;
create trigger check_guest_limit after insert on public.wedding_guests referencing new table as inserted
  for each statement execute function public.check_guest_limit();

create function public.check_table_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  target uuid;
begin
  for target in select distinct wedding_id from inserted loop
    perform 1 from public.weddings where id = target for no key update;
    if (select count(*) from public.wedding_tables where wedding_id = target) > 100 then
      raise exception using errcode = '23514', message = 'table_limit';
    end if;
  end loop;
  return null;
end;
$$;
revoke all on function public.check_table_limit() from public;
create trigger check_table_limit after insert on public.wedding_tables referencing new table as inserted
  for each statement execute function public.check_table_limit();

-- Seat, move, swap or unseat several guests in one statement (one transaction), for the planner's saves, automatic
-- seating and undo. Security invoker: RLS decides which guests can change, and any id the caller can't update
-- (another owner's, or unknown) fails the whole call rather than applying part of it.
create function public.set_guest_seats(assignments jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  expected integer;
  changed integer;
begin
  if jsonb_typeof(assignments) is distinct from 'array' or jsonb_array_length(assignments) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_assignments';
  end if;
  select count(distinct value ->> 'guest_id') into expected from jsonb_array_elements(assignments);
  if expected <> jsonb_array_length(assignments) then
    raise exception using errcode = '22023', message = 'invalid_assignments';
  end if;
  -- Lock the destination tables before any guest row, the same order as save_table, so two tabs saving at once wait
  -- for each other rather than deadlocking.
  perform 1 from public.wedding_tables t
    where t.id in (select a.table_id from jsonb_to_recordset(assignments) as a(table_id uuid))
    order by t.id for share;
  -- normalise_guest_seat would quietly leave a guest who isn't attending unseated; say so instead.
  if exists (
    select 1 from jsonb_to_recordset(assignments) as a(guest_id uuid, table_id uuid)
    join public.wedding_guests g on g.id = a.guest_id
    where a.table_id is not null and g.status = 'declined'
  ) then
    raise exception using errcode = '23514', message = 'declined_guest';
  end if;
  update public.wedding_guests g
    set table_id = a.table_id, seat = a.seat
    from jsonb_to_recordset(assignments) as a(guest_id uuid, table_id uuid, seat smallint)
    where g.id = a.guest_id;
  get diagnostics changed = row_count;
  if changed <> expected then
    raise exception using errcode = '22023', message = 'unknown_guest';
  end if;
  return changed;
end;
$$;
revoke all on function public.set_guest_seats(jsonb) from public, anon;
grant execute on function public.set_guest_seats(jsonb) to authenticated;

-- A table edit and the seat moves it needs, in one transaction: a refused edit (such as a duplicate name) moves
-- nobody, and the deferred checks see the final table and seats together.
create function public.save_table(requested_table_id uuid, requested_name text, requested_shape text,
  requested_seats smallint, requested_kept_empty smallint[], assignments jsonb default '[]'::jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.wedding_tables
    set name = requested_name, shape = requested_shape, seats = requested_seats, kept_empty = requested_kept_empty
    where id = requested_table_id;
  if not found then
    raise exception using errcode = '22023', message = 'unknown_table';
  end if;
  if jsonb_typeof(assignments) = 'array' and jsonb_array_length(assignments) > 0 then
    perform public.set_guest_seats(assignments);
  end if;
end;
$$;
revoke all on function public.save_table(uuid, text, text, smallint, smallint[], jsonb) from public, anon;
grant execute on function public.save_table(uuid, text, text, smallint, smallint[], jsonb) to authenticated;

-- Removing many guests at once (Undo import) with the ids in the request body rather than the URL.
create function public.delete_guests(guest_ids uuid[]) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  removed integer;
begin
  if guest_ids is null or cardinality(guest_ids) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_guests';
  end if;
  delete from public.wedding_guests where id = any(guest_ids);
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.delete_guests(uuid[]) from public, anon;
grant execute on function public.delete_guests(uuid[]) to authenticated;

-- "Update from RSVP replies" in one transaction: statuses, then the attending replies the couple chose to add.
create function public.apply_reply_sync(requested_wedding_id uuid, attending_ids uuid[], declined_ids uuid[], new_names text[])
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if cardinality(attending_ids) > 1000 or cardinality(declined_ids) > 1000 or cardinality(new_names) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_guests';
  end if;
  update public.wedding_guests set status = 'attending' where wedding_id = requested_wedding_id and id = any(attending_ids);
  update public.wedding_guests set status = 'declined' where wedding_id = requested_wedding_id and id = any(declined_ids);
  insert into public.wedding_guests (wedding_id, name, status)
    select requested_wedding_id, name, 'attending' from unnest(new_names) as name;
end;
$$;
revoke all on function public.apply_reply_sync(uuid, uuid[], uuid[], text[]) from public, anon;
grant execute on function public.apply_reply_sync(uuid, uuid[], uuid[], text[]) to authenticated;
