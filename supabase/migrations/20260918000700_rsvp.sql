alter table public.weddings
  add column rsvp_enabled boolean not null default false,
  add column rsvp_closes_on date,
  add constraint rsvp_close_date_valid check (
    rsvp_closes_on is null or rsvp_closes_on between date '1900-01-01' and date '2199-12-31'
  );

create table public.rsvp_invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  invite_name text not null check (
    invite_name = btrim(invite_name) and char_length(invite_name) between 1 and 80
  ),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  responding_name text,
  attending boolean,
  responded_at timestamptz,
  revoked_at timestamptz,
  attempt_window_started_at timestamptz,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  created_at timestamptz not null default now(),
  constraint rsvp_response_complete check (
    (responding_name is null and attending is null and responded_at is null)
    or (responding_name is not null and attending is not null and responded_at is not null
      and responding_name = btrim(responding_name)
      and char_length(responding_name) between 1 and 80)
  )
);

alter table public.rsvp_invitations enable row level security;
revoke all on public.rsvp_invitations from anon, authenticated;
grant select, insert, update on public.rsvp_invitations to authenticated;

create policy "Owners read RSVP invitations" on public.rsvp_invitations
  for select to authenticated using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );
create policy "Owners create RSVP invitations" on public.rsvp_invitations
  for insert to authenticated with check (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );
create policy "Owners update RSVP invitations" on public.rsvp_invitations
  for update to authenticated using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );

create function public.limit_rsvp_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.wedding_id::text, 0));
  if (select count(*) from public.rsvp_invitations where wedding_id = new.wedding_id) >= 100 then
    raise exception 'A wedding can have at most 100 RSVP invitations' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_rsvp_invitations() from public;
create trigger limit_rsvp_invitations before insert on public.rsvp_invitations
for each row execute function public.limit_rsvp_invitations();

drop function public.published_wedding(text);
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text, theme text, details_enabled boolean, rsvp_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path, w.theme, w.details_enabled, w.rsvp_enabled
  from public.weddings w where w.slug = requested_slug and w.published;
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;

create function public.guest_rsvp(requested_slug text, requested_token_hash text)
returns table (
  first_name text, second_name text, theme text, invite_name text,
  responding_name text, attending boolean, responded_at timestamptz,
  is_open boolean, closes_on date
)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.first_name, w.second_name, w.theme, i.invite_name,
    i.responding_name, i.attending, i.responded_at,
    (w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on)),
    w.rsvp_closes_on
  from public.rsvp_invitations i
  join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published
    and i.token_hash = requested_token_hash and i.revoked_at is null;
$$;
revoke all on function public.guest_rsvp(text, text) from public;
grant execute on function public.guest_rsvp(text, text) to anon, authenticated;

create function public.record_invalid_rsvp_attempt(requested_slug text, requested_token_hash text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.rsvp_invitations%rowtype;
begin
  select i.* into invitation
  from public.rsvp_invitations i
  join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published
    and i.token_hash = requested_token_hash and i.revoked_at is null
  for update of i;
  if not found then return 'unavailable'; end if;
  if invitation.attempt_window_started_at is null
    or invitation.attempt_window_started_at <= now() - interval '10 minutes' then
    update public.rsvp_invitations set attempt_window_started_at = now(), attempt_count = 1 where id = invitation.id;
    return 'invalid';
  end if;
  if invitation.attempt_count >= 10 then return 'rate_limited'; end if;
  update public.rsvp_invitations set attempt_count = attempt_count + 1 where id = invitation.id;
  return 'invalid';
end;
$$;
revoke all on function public.record_invalid_rsvp_attempt(text, text) from public;
grant execute on function public.record_invalid_rsvp_attempt(text, text) to anon, authenticated;

create function public.submit_guest_rsvp(
  requested_slug text,
  requested_token_hash text,
  requested_name text,
  requested_attending boolean
)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  invitation_id uuid;
  window_started timestamptz;
  attempts smallint;
  enabled boolean;
  close_date date;
begin
  select i.id, i.attempt_window_started_at, i.attempt_count, w.rsvp_enabled, w.rsvp_closes_on
    into invitation_id, window_started, attempts, enabled, close_date
  from public.rsvp_invitations i
  join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published
    and i.token_hash = requested_token_hash and i.revoked_at is null
  for update of i;
  if not found then return 'unavailable'; end if;

  if window_started is null or window_started <= now() - interval '10 minutes' then
    update public.rsvp_invitations set attempt_window_started_at = now(), attempt_count = 1 where id = invitation_id;
  elsif attempts >= 10 then
    return 'rate_limited';
  else
    update public.rsvp_invitations set attempt_count = attempt_count + 1 where id = invitation_id;
  end if;

  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 then return 'invalid'; end if;

  update public.rsvp_invitations
    set responding_name = requested_name, attending = requested_attending, responded_at = now()
    where id = invitation_id;
  return 'saved';
end;
$$;
revoke all on function public.submit_guest_rsvp(text, text, text, boolean) from public;
grant execute on function public.submit_guest_rsvp(text, text, text, boolean) to anon, authenticated;
