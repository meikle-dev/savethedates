create or replace function public.owner_entitlement()
returns table (active boolean, expires_at timestamptz, revoked_reason text)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(bool_or(p.revoked_at is null and p.expires_at > now()), false),
    max(p.expires_at) filter (where p.revoked_at is null),
    case when count(*) filter (where p.payment_intent_id is not null and p.revoked_at is null) > 0
      then null
      else (array_agg(p.revoked_reason order by p.revoked_at desc nulls last) filter (where p.revoked_reason is not null))[1]
    end
  from public.weddings w
  left join public.stripe_payments p on p.wedding_id = w.id
  where w.owner_id = (select auth.uid());
$$;
revoke all on function public.owner_entitlement() from public, anon;
grant execute on function public.owner_entitlement() to authenticated;
