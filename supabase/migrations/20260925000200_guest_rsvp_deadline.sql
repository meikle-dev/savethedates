-- F044: guests see the RSVP closing date. guest_wedding also returns rsvp_closes_on, but only while RSVP is
-- enabled, so a disabled RSVP projects no date. Every other column, check and grant is unchanged from
-- 20260925000100_secret_guest_urls.sql; the secret, owner identifiers and responses are still never returned.
-- The return type changes, so the function is recreated.
drop function public.guest_wedding(text);

create function public.guest_wedding(requested_secret text)
returns table (slug text, first_name text, second_name text, wedding_date date, location text, message text,
  photo_path text, photo_framing jsonb, theme text, details_enabled boolean, rsvp_enabled boolean, rsvp_open boolean,
  rsvp_closes_on date)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.slug, w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.theme, w.details_enabled, w.rsvp_enabled,
    w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on),
    case when w.rsvp_enabled then w.rsvp_closes_on end
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding(text) from public;
grant execute on function public.guest_wedding(text) to anon, authenticated;
