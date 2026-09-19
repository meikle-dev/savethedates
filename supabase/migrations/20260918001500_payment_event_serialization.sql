create or replace function public.process_stripe_payment_event(
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(requested_payment_intent_id, 0));

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
