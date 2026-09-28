-- F073: Stripe promotion codes can discount the £39 price, down to £0 for a 100% code.
-- Codes are managed in the Stripe Dashboard; the database only records what was charged.
-- A free order has no PaymentIntent, so its Checkout Session ID is the payment reference.
comment on column public.stripe_payments.payment_intent_id is
  'Stripe PaymentIntent ID, or the Checkout Session ID for a free (100% promotion code) order.';

alter table public.stripe_payment_events
  add column amount_total integer check (amount_total between 0 and 3900);

-- Existing rows are 2900 or 3900, so they stay valid.
alter table public.stripe_payments
  drop constraint stripe_payments_amount_total_check,
  add constraint stripe_payments_amount_total_check check (amount_total between 0 and 3900);

drop function public.process_stripe_payment_event(text, timestamptz, text, text, timestamptz, uuid, uuid, text);

-- requested_amount_total defaults to 3900 so the app build deployed before F073, which only
-- accepts full-price sessions, keeps working between this migration and the new deploy.
create function public.process_stripe_payment_event(
  requested_event_id text,
  requested_event_created_at timestamptz,
  requested_event_type text,
  requested_payment_intent_id text,
  requested_entitlement_expires_at timestamptz default null,
  requested_wedding_id uuid default null,
  requested_owner_id uuid default null,
  requested_checkout_session_id text default null,
  requested_amount_total integer default 3900
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
    or requested_amount_total is null
    or requested_amount_total not between 0 and 3900
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
    checkout_session_id, payment_intent_id, entitlement_expires_at, amount_total
  ) values (
    requested_event_id, requested_event_created_at, requested_event_type,
    requested_wedding_id, requested_owner_id, requested_checkout_session_id,
    requested_payment_intent_id, requested_entitlement_expires_at,
    case when requested_event_type = 'paid' then requested_amount_total else null end
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

  -- Only paid events stored before F073 lack an amount, and their payment rows already exist
  -- (the conflict branch below never changes the amount), so the fallback is never written.
  insert into public.stripe_payments (
    payment_intent_id, wedding_id, checkout_session_id, paid_at, expires_at,
    revoked_at, revoked_reason, amount_total, currency
  ) values (
    requested_payment_intent_id, paid_event.wedding_id, paid_event.checkout_session_id,
    paid_event.event_created_at, expiry,
    case when found then revocation.event_created_at else null end,
    case when found then revocation.event_type else null end,
    coalesce(paid_event.amount_total, 3900), 'gbp'
  )
  on conflict (payment_intent_id) do update set
    revoked_at = coalesce(public.stripe_payments.revoked_at, excluded.revoked_at),
    revoked_reason = coalesce(public.stripe_payments.revoked_reason, excluded.revoked_reason)
  where public.stripe_payments.wedding_id = excluded.wedding_id
    and public.stripe_payments.checkout_session_id = excluded.checkout_session_id;

  delete from public.stripe_checkout_attempts a
  where a.wedding_id = paid_event.wedding_id
    and a.stripe_checkout_session_id = paid_event.checkout_session_id;
  if not public.has_active_entitlement(paid_event.wedding_id) then
    update public.weddings set published = false where id = paid_event.wedding_id and published;
  end if;
  return case when revocation.stripe_event_id is null then 'granted' else 'revoked' end;
end;
$$;
revoke all on function public.process_stripe_payment_event(text, timestamptz, text, text, timestamptz, uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.process_stripe_payment_event(text, timestamptz, text, text, timestamptz, uuid, uuid, text, integer) to service_role;
