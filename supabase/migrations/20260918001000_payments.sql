create table public.stripe_payment_events (
  stripe_event_id text primary key,
  event_created_at timestamptz not null,
  event_type text not null check (event_type in ('paid', 'refunded', 'disputed')),
  wedding_id uuid references public.weddings(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  checkout_session_id text,
  payment_intent_id text not null,
  created_at timestamptz not null default now(),
  check ((event_type = 'paid' and wedding_id is not null and owner_id is not null and checkout_session_id is not null)
    or (event_type in ('refunded', 'disputed')))
);
create index stripe_events_payment_intent on public.stripe_payment_events (payment_intent_id);

create table public.stripe_payments (
  payment_intent_id text primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  checkout_session_id text not null unique,
  paid_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason in ('refunded', 'disputed')),
  amount_total integer not null check (amount_total = 2900),
  currency text not null check (currency = 'gbp'),
  created_at timestamptz not null default now(),
  check ((revoked_at is null and revoked_reason is null) or (revoked_at is not null and revoked_reason is not null))
);
create index stripe_payments_active_wedding on public.stripe_payments (wedding_id, expires_at) where revoked_at is null;

alter table public.stripe_payment_events enable row level security;
alter table public.stripe_payments enable row level security;
revoke all on public.stripe_payment_events, public.stripe_payments from anon, authenticated;

create function public.has_active_entitlement(requested_wedding_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.stripe_payments p
    where p.wedding_id = requested_wedding_id
      and p.revoked_at is null
      and p.expires_at > now()
  );
$$;
revoke all on function public.has_active_entitlement(uuid) from public;

create function public.owner_entitlement()
returns table (active boolean, expires_at timestamptz, revoked_reason text)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(bool_or(p.revoked_at is null and p.expires_at > now()), false),
    max(p.expires_at) filter (where p.revoked_at is null),
    (array_agg(p.revoked_reason order by p.revoked_at desc nulls last) filter (where p.revoked_reason is not null))[1]
  from public.weddings w
  left join public.stripe_payments p on p.wedding_id = w.id
  where w.owner_id = (select auth.uid());
$$;
revoke all on function public.owner_entitlement() from public;
grant execute on function public.owner_entitlement() to authenticated;

create function public.process_stripe_payment_event(
  requested_event_id text,
  requested_event_created_at timestamptz,
  requested_event_type text,
  requested_payment_intent_id text,
  requested_wedding_id uuid default null,
  requested_owner_id uuid default null,
  requested_checkout_session_id text default null
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  inserted_count integer;
  paid_event public.stripe_payment_events%rowtype;
  revocation public.stripe_payment_events%rowtype;
  expiry timestamptz;
begin
  if requested_event_id is null or requested_event_id = ''
    or requested_payment_intent_id is null or requested_payment_intent_id = ''
    or requested_event_type not in ('paid', 'refunded', 'disputed') then
    raise exception 'Invalid Stripe event' using errcode = '22023';
  end if;
  if requested_event_type = 'paid' and not exists (
    select 1 from public.weddings w
    where w.id = requested_wedding_id and w.owner_id = requested_owner_id
  ) then
    raise exception 'Stripe metadata does not identify an owned wedding' using errcode = '22023';
  end if;

  insert into public.stripe_payment_events (
    stripe_event_id, event_created_at, event_type, wedding_id, owner_id,
    checkout_session_id, payment_intent_id
  ) values (
    requested_event_id, requested_event_created_at, requested_event_type,
    requested_wedding_id, requested_owner_id, requested_checkout_session_id,
    requested_payment_intent_id
  ) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return 'duplicate'; end if;

  select e.* into paid_event
  from public.stripe_payment_events e
  where e.payment_intent_id = requested_payment_intent_id and e.event_type = 'paid'
  order by e.event_created_at asc limit 1;
  if not found then return 'recorded'; end if;

  select (w.wedding_date + interval '1 year')::date::timestamp at time zone 'UTC'
    into expiry from public.weddings w where w.id = paid_event.wedding_id;
  select e.* into revocation
  from public.stripe_payment_events e
  where e.payment_intent_id = requested_payment_intent_id and e.event_type in ('refunded', 'disputed')
  order by e.event_created_at asc limit 1;

  insert into public.stripe_payments (
    payment_intent_id, wedding_id, checkout_session_id, paid_at, expires_at,
    revoked_at, revoked_reason, amount_total, currency
  ) values (
    requested_payment_intent_id, paid_event.wedding_id, paid_event.checkout_session_id,
    paid_event.event_created_at, expiry,
    case when found then revocation.event_created_at else null end,
    case when found then revocation.event_type else null end,
    2900, 'gbp'
  )
  on conflict (payment_intent_id) do update set
    revoked_at = coalesce(public.stripe_payments.revoked_at, excluded.revoked_at),
    revoked_reason = coalesce(public.stripe_payments.revoked_reason, excluded.revoked_reason)
  where public.stripe_payments.wedding_id = excluded.wedding_id
    and public.stripe_payments.checkout_session_id = excluded.checkout_session_id;

  if not public.has_active_entitlement(paid_event.wedding_id) then
    update public.weddings set published = false where id = paid_event.wedding_id and published;
  end if;
  return case when revocation.stripe_event_id is null then 'granted' else 'revoked' end;
end;
$$;
revoke all on function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text) to service_role;

create function public.require_publication_entitlement()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.published and not public.has_active_entitlement(new.id) then
    raise exception 'An active purchase is required to publish' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.require_publication_entitlement() from public;
create trigger require_publication_entitlement
  before insert or update of published on public.weddings
  for each row execute function public.require_publication_entitlement();

-- Development-era publications have no paid entitlement and must become private.
update public.weddings set published = false where published;

-- Expiry is enforced on reads as well as writes, so no scheduled job is required to hide a site.
create or replace function public.is_published_photo(requested_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.weddings w
    where w.published and w.photo_path = requested_path and public.has_active_entitlement(w.id)
  );
$$;

drop function public.published_wedding(text);
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text, theme text, details_enabled boolean, rsvp_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path, w.theme, w.details_enabled, w.rsvp_enabled
  from public.weddings w
  where w.slug = requested_slug and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;

drop function public.published_wedding_details(text);
create function public.published_wedding_details(requested_slug text)
returns table (first_name text, second_name text, theme text,
  ceremony_time text, ceremony_venue text, ceremony_address text, ceremony_url text,
  reception_time text, reception_venue text, reception_address text, reception_url text,
  travel text, travel_url text, accommodation text, accommodation_url text, dress_code text, faqs jsonb)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.theme,
    w.ceremony_time, w.ceremony_venue, w.ceremony_address, w.ceremony_url,
    w.reception_time, w.reception_venue, w.reception_address, w.reception_url,
    w.travel, w.travel_url, w.accommodation, w.accommodation_url, w.dress_code, w.faqs
  from public.weddings w
  where w.slug = requested_slug and w.published and w.details_enabled and public.has_active_entitlement(w.id);
$$;
revoke all on function public.published_wedding_details(text) from public;
grant execute on function public.published_wedding_details(text) to anon, authenticated;

create or replace function public.guest_rsvp(requested_slug text, requested_token_hash text)
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
  where w.slug = requested_slug and w.published and public.has_active_entitlement(w.id)
    and i.token_hash = requested_token_hash and i.revoked_at is null;
$$;

create or replace function public.record_invalid_rsvp_attempt(requested_slug text, requested_token_hash text)
returns text
language plpgsql security definer set search_path = '' as $$
declare invitation_id uuid;
begin
  select i.id into invitation_id
  from public.rsvp_invitations i join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published and public.has_active_entitlement(w.id)
    and i.token_hash = requested_token_hash and i.revoked_at is null for update of i;
  if not found then return 'unavailable'; end if;
  if not public.consume_rsvp_attempt(invitation_id) then return 'rate_limited'; end if;
  return 'invalid';
end;
$$;

create or replace function public.submit_guest_rsvp(requested_slug text, requested_token_hash text, requested_name text, requested_attending boolean)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare invitation_id uuid; enabled boolean; close_date date;
begin
  select i.id, w.rsvp_enabled, w.rsvp_closes_on into invitation_id, enabled, close_date
  from public.rsvp_invitations i join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published and public.has_active_entitlement(w.id)
    and i.token_hash = requested_token_hash and i.revoked_at is null for update of i;
  if not found then return 'unavailable'; end if;
  if not public.consume_rsvp_attempt(invitation_id) then return 'rate_limited'; end if;
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 or requested_attending is null then return 'invalid'; end if;
  update public.rsvp_invitations set responding_name = requested_name, attending = requested_attending, responded_at = now()
    where id = invitation_id;
  return 'saved';
end;
$$;
