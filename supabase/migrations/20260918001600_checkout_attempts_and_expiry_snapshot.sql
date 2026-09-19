alter table public.stripe_payment_events
  add column entitlement_expires_at timestamptz;

update public.stripe_payment_events e
set entitlement_expires_at = greatest(
  (w.wedding_date + interval '1 year')::date::timestamp at time zone 'UTC',
  e.event_created_at + interval '30 minutes'
)
from public.weddings w
where e.event_type = 'paid' and e.wedding_id = w.id;

alter table public.stripe_payment_events
  drop constraint if exists stripe_payment_events_check,
  add constraint stripe_paid_event_metadata check (
    (event_type = 'paid' and wedding_id is not null and owner_id is not null
      and checkout_session_id is not null and entitlement_expires_at is not null)
    or (event_type in ('refunded', 'disputed') and entitlement_expires_at is null)
  );

create table public.stripe_checkout_attempts (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique default gen_random_uuid(),
  stripe_checkout_session_id text unique,
  checkout_url text,
  checkout_expires_at timestamptz not null,
  entitlement_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((stripe_checkout_session_id is null and checkout_url is null)
    or (stripe_checkout_session_id is not null and checkout_url is not null))
);
alter table public.stripe_checkout_attempts enable row level security;
revoke all on public.stripe_checkout_attempts from anon, authenticated;

create function public.begin_checkout_attempt()
returns table (
  attempt_id uuid,
  wedding_id uuid,
  checkout_url text,
  checkout_expires_at timestamptz,
  entitlement_expires_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  owned_wedding public.weddings%rowtype;
  current_attempt public.stripe_checkout_attempts%rowtype;
  checkout_deadline timestamptz := now() + interval '30 minutes';
  entitlement_deadline timestamptz;
begin
  select w.* into owned_wedding
  from public.weddings w
  where w.owner_id = (select auth.uid())
  for update;
  if not found then raise exception 'Save wedding details before checkout' using errcode = '23514'; end if;
  if public.has_active_entitlement(owned_wedding.id) then
    raise exception 'Wedding already has an active entitlement' using errcode = '23514';
  end if;

  select (owned_wedding.wedding_date + interval '1 year')::date::timestamp at time zone 'UTC'
    into entitlement_deadline;
  if entitlement_deadline <= checkout_deadline then
    raise exception 'Wedding site period ends before checkout can complete' using errcode = '23514';
  end if;

  delete from public.stripe_checkout_attempts a
    where a.wedding_id = owned_wedding.id and a.checkout_expires_at <= now();
  select a.* into current_attempt
  from public.stripe_checkout_attempts a
  where a.wedding_id = owned_wedding.id;
  if not found then
    insert into public.stripe_checkout_attempts (
      wedding_id, owner_id, checkout_expires_at, entitlement_expires_at
    ) values (
      owned_wedding.id, owned_wedding.owner_id, checkout_deadline, entitlement_deadline
    ) returning * into current_attempt;
  end if;

  return query select current_attempt.attempt_id, current_attempt.wedding_id,
    current_attempt.checkout_url, current_attempt.checkout_expires_at,
    current_attempt.entitlement_expires_at;
end;
$$;
revoke all on function public.begin_checkout_attempt() from public, anon, authenticated;
grant execute on function public.begin_checkout_attempt() to authenticated;

create function public.attach_checkout_session(
  requested_attempt_id uuid,
  requested_session_id text,
  requested_checkout_url text
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare updated_count integer;
begin
  if requested_session_id is null or requested_session_id = ''
    or requested_checkout_url is null or requested_checkout_url !~ '^https://checkout[.]stripe[.]com/' then
    return false;
  end if;
  update public.stripe_checkout_attempts a
  set stripe_checkout_session_id = requested_session_id,
      checkout_url = requested_checkout_url
  where a.attempt_id = requested_attempt_id
    and a.owner_id = (select auth.uid())
    and a.checkout_expires_at > now()
    and (a.stripe_checkout_session_id is null or a.stripe_checkout_session_id = requested_session_id);
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;
revoke all on function public.attach_checkout_session(uuid, text, text) from public, anon, authenticated;
grant execute on function public.attach_checkout_session(uuid, text, text) to authenticated;

revoke all on function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text) from public, anon, authenticated, service_role;
drop function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text);

create function public.process_stripe_payment_event(
  requested_event_id text,
  requested_event_created_at timestamptz,
  requested_event_type text,
  requested_payment_intent_id text,
  requested_entitlement_expires_at timestamptz default null,
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
  if requested_event_type = 'paid' and (
    requested_entitlement_expires_at is null
    or requested_entitlement_expires_at <= requested_event_created_at
    or not exists (
      select 1 from public.weddings w
      where w.id = requested_wedding_id and w.owner_id = requested_owner_id
    )
  ) then
    raise exception 'Stripe metadata does not identify a valid wedding entitlement' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(requested_payment_intent_id, 0));

  insert into public.stripe_payment_events (
    stripe_event_id, event_created_at, event_type, wedding_id, owner_id,
    checkout_session_id, payment_intent_id, entitlement_expires_at
  ) values (
    requested_event_id, requested_event_created_at, requested_event_type,
    requested_wedding_id, requested_owner_id, requested_checkout_session_id,
    requested_payment_intent_id, requested_entitlement_expires_at
  ) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return 'duplicate'; end if;

  select e.* into paid_event
  from public.stripe_payment_events e
  where e.payment_intent_id = requested_payment_intent_id and e.event_type = 'paid'
  order by e.event_created_at asc limit 1;
  if not found then return 'recorded'; end if;

  expiry := paid_event.entitlement_expires_at;
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

  delete from public.stripe_checkout_attempts a where a.wedding_id = paid_event.wedding_id;
  if not public.has_active_entitlement(paid_event.wedding_id) then
    update public.weddings set published = false where id = paid_event.wedding_id and published;
  end if;
  return case when revocation.stripe_event_id is null then 'granted' else 'revoked' end;
end;
$$;
revoke all on function public.process_stripe_payment_event(text, timestamptz, text, text, timestamptz, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.process_stripe_payment_event(text, timestamptz, text, text, timestamptz, uuid, uuid, text) to service_role;
