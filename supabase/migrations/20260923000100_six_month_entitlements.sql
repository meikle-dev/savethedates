create or replace function public.begin_checkout_attempt()
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
  checkout_deadline timestamptz := now() + interval '31 minutes';
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

  select a.* into current_attempt
  from public.stripe_checkout_attempts a
  where a.wedding_id = owned_wedding.id;
  if not found then
    select (owned_wedding.wedding_date + interval '6 months')::date::timestamp at time zone 'UTC'
      into entitlement_deadline;
    if entitlement_deadline <= checkout_deadline then
      raise exception 'Wedding site period ends before checkout can complete' using errcode = '23514';
    end if;

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
revoke all on function public.begin_checkout_attempt() from public, anon;
grant execute on function public.begin_checkout_attempt() to authenticated;
