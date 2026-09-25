-- F060: an optional Invitation guest page. Its three wording fields live on the wedding row; ceremony time, venue and
-- address are the existing Details columns, shared by both pages. Owners write through the existing table grants and
-- policies. Guests read only through guest_wedding_invitation, and only while the page is on, published and paid for.
alter table public.weddings
  add column invitation_enabled boolean not null default false,
  add column invitation_host_line text not null default '',
  add column invitation_wording text not null default '',
  add column invitation_afterwards text not null default '',
  add constraint wedding_invitation_text_valid check (
    invitation_host_line = btrim(invitation_host_line) and char_length(invitation_host_line) <= 160
    and invitation_wording = btrim(invitation_wording) and char_length(invitation_wording) <= 300
    and invitation_afterwards = btrim(invitation_afterwards) and char_length(invitation_afterwards) <= 160
  );

-- guest_wedding also returns invitation_enabled; every other column, condition and grant matches
-- 20260925000200_guest_rsvp_deadline.sql. The return type changes, so the function is recreated.
drop function public.guest_wedding(text);

create function public.guest_wedding(requested_secret text)
returns table (slug text, first_name text, second_name text, wedding_date date, location text, message text,
  photo_path text, photo_framing jsonb, theme text, details_enabled boolean, rsvp_enabled boolean, rsvp_open boolean,
  rsvp_closes_on date, invitation_enabled boolean)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.slug, w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.theme, w.details_enabled, w.rsvp_enabled,
    w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on),
    case when w.rsvp_enabled then w.rsvp_closes_on end,
    w.invitation_enabled
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding(text) from public;
grant execute on function public.guest_wedding(text) to anon, authenticated;

create function public.guest_wedding_invitation(requested_secret text)
returns table (invitation_host_line text, invitation_wording text, invitation_afterwards text,
  ceremony_time text, ceremony_venue text, ceremony_address text)
language sql stable security definer set search_path = '' as $$
  select w.invitation_host_line, w.invitation_wording, w.invitation_afterwards,
    w.ceremony_time, w.ceremony_venue, w.ceremony_address
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and w.invitation_enabled
    and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding_invitation(text) from public;
grant execute on function public.guest_wedding_invitation(text) to anon, authenticated;
