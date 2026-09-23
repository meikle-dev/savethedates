-- One reusable wedding RSVP URL. The secret is owner-readable so the same URL
-- can be copied again; it is never included in a public wedding projection.
alter table public.weddings add column rsvp_share_secret text not null
  default translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_')
  check (rsvp_share_secret ~ '^[A-Za-z0-9_-]{43}$');
create unique index weddings_rsvp_share_secret_key on public.weddings (rsvp_share_secret);

create table public.shared_rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  responding_name text not null check (responding_name = btrim(responding_name) and char_length(responding_name) between 1 and 80),
  attending boolean not null,
  responded_at timestamptz not null default now()
);
create index shared_rsvp_responses_wedding_time on public.shared_rsvp_responses (wedding_id, responded_at desc);
alter table public.shared_rsvp_responses enable row level security;
revoke all on public.shared_rsvp_responses from anon, authenticated;
grant select on public.shared_rsvp_responses to authenticated;
create policy "Owners read shared RSVP responses" on public.shared_rsvp_responses
  for select to authenticated using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );

create table public.shared_rsvp_attempts (
  id bigint generated always as identity primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index shared_rsvp_attempts_wedding_time on public.shared_rsvp_attempts (wedding_id, attempted_at);
alter table public.shared_rsvp_attempts enable row level security;
revoke all on public.shared_rsvp_attempts from anon, authenticated;

create function public.shared_guest_rsvp(requested_slug text, requested_secret text)
returns table (is_open boolean)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on)
  from public.weddings w
  where w.slug = requested_slug and w.rsvp_share_secret = requested_secret
    and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.shared_guest_rsvp(text, text) from public;
grant execute on function public.shared_guest_rsvp(text, text) to anon, authenticated;

create function public.submit_shared_rsvp(requested_slug text, requested_secret text, requested_name text, requested_attending boolean)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare target_wedding_id uuid; enabled boolean; close_date date;
begin
  select w.id, w.rsvp_enabled, w.rsvp_closes_on into target_wedding_id, enabled, close_date
  from public.weddings w
  where w.slug = requested_slug and w.rsvp_share_secret = requested_secret
    and w.published and public.has_active_entitlement(w.id)
  for update of w;
  if not found then return 'unavailable'; end if;
  delete from public.shared_rsvp_attempts
    where shared_rsvp_attempts.wedding_id = target_wedding_id
      and attempted_at <= now() - interval '10 minutes';
  if (select count(*) from public.shared_rsvp_attempts a where a.wedding_id = target_wedding_id) >= 100 then
    return 'rate_limited';
  end if;
  insert into public.shared_rsvp_attempts (wedding_id) values (target_wedding_id);
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 or requested_attending is null then return 'invalid'; end if;
  insert into public.shared_rsvp_responses (wedding_id, responding_name, attending)
    values (target_wedding_id, requested_name, requested_attending);
  return 'saved';
end;
$$;
revoke all on function public.submit_shared_rsvp(text, text, text, boolean) from public;
grant execute on function public.submit_shared_rsvp(text, text, text, boolean) to anon, authenticated;

create function public.rotate_shared_rsvp_secret(requested_wedding_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare new_secret text;
begin
  new_secret := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  update public.weddings set rsvp_share_secret = new_secret
    where id = requested_wedding_id and owner_id = (select auth.uid());
  if not found then return null; end if;
  return new_secret;
end;
$$;
revoke all on function public.rotate_shared_rsvp_secret(uuid) from public;
grant execute on function public.rotate_shared_rsvp_secret(uuid) to authenticated;
