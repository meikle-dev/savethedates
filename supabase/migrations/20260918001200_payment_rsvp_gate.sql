drop function if exists public.resolve_guest_rsvp(text, text);
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
