revoke all on public.rsvp_invitations from anon, authenticated;
grant select on public.rsvp_invitations to authenticated;
grant insert (wedding_id, invite_name, token_hash) on public.rsvp_invitations to authenticated;

create function public.revoke_rsvp_invitation(requested_id uuid)
returns boolean
language sql volatile security definer set search_path = '' as $$
  with changed as (
    update public.rsvp_invitations i set revoked_at = now()
    from public.weddings w
    where i.id = requested_id and i.wedding_id = w.id
      and w.owner_id = (select auth.uid()) and i.revoked_at is null
    returning i.id
  )
  select exists(select 1 from changed);
$$;
revoke all on function public.revoke_rsvp_invitation(uuid) from public;
grant execute on function public.revoke_rsvp_invitation(uuid) to authenticated;
