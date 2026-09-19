revoke all on function public.has_active_entitlement(uuid) from anon, authenticated;
revoke all on function public.owner_entitlement() from anon;
revoke all on function public.require_publication_entitlement() from anon, authenticated;
