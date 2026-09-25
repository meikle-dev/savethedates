-- F043: every guest page lives under /<names>/<secret>. The wedding's existing rsvp_share_secret
-- identifies it; the names part is decorative, so it is neither unique nor locked after publication,
-- and no anonymous function returns a wedding by its names part alone.

-- Names part: editable at any time. first_published_at is still recorded but no longer locks the URL.
create or replace function public.guard_wedding_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.first_published_at = old.first_published_at;
  else
    new.first_published_at = null;
  end if;
  if new.published and new.first_published_at is null then
    new.first_published_at = now();
  end if;
  return new;
end;
$$;

alter table public.weddings drop constraint weddings_slug_key;

-- The names part is the first path segment, so it must never equal a top-level application route or public
-- folder (assets, fonts and media are served from public/).
-- Keep this list identical to reservedNames in src/features/weddings/guest-link.ts. Any existing
-- names part that is newly reserved is renamed rather than failing the migration.
update public.weddings set slug = slug || '-wedding' where slug in ('s', 'contact', 'refunds', 'assets', 'fonts');
alter table public.weddings drop constraint wedding_slug_valid;
alter table public.weddings add constraint wedding_slug_valid check (
  slug is null or (char_length(slug) between 3 and 63
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in ('account', 'auth', 'dashboard', 'api', 'media', 'preview', 'preview-photo', 'demo',
      'demo-no-photo', 'demo-long-names', 'pricing', 'features', 'guides', 'examples', 'privacy', 'terms',
      'support', 'robots', 'sitemap', 'favicon', 's', 'contact', 'refunds', 'assets', 'fonts'))
);

-- Remove every anonymous lookup by names part.
drop function public.published_wedding(text);
drop function public.published_wedding_details(text);
drop function public.shared_guest_rsvp(text, text);
drop function public.submit_shared_rsvp(text, text, text, boolean);

-- Deliberately narrow projection for the holder of the secret: no owner identifiers, secret or responses.
-- slug is returned so an outdated or altered names part can be redirected to the current one.
create function public.guest_wedding(requested_secret text)
returns table (slug text, first_name text, second_name text, wedding_date date, location text, message text,
  photo_path text, photo_framing jsonb, theme text, details_enabled boolean, rsvp_enabled boolean, rsvp_open boolean)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.slug, w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.theme, w.details_enabled, w.rsvp_enabled,
    w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on)
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding(text) from public;
grant execute on function public.guest_wedding(text) to anon, authenticated;

create function public.guest_wedding_details(requested_secret text)
returns table (first_name text, second_name text, theme text, photo_framing jsonb,
  ceremony_time text, ceremony_venue text, ceremony_address text, ceremony_url text,
  reception_time text, reception_venue text, reception_address text, reception_url text,
  travel text, travel_url text, accommodation text, accommodation_url text, dress_code text, faqs jsonb)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.theme,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.ceremony_time, w.ceremony_venue, w.ceremony_address, w.ceremony_url,
    w.reception_time, w.reception_venue, w.reception_address, w.reception_url,
    w.travel, w.travel_url, w.accommodation, w.accommodation_url, w.dress_code, w.faqs
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and w.details_enabled
    and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding_details(text) from public;
grant execute on function public.guest_wedding_details(text) to anon, authenticated;

-- Same checks, limits and capacity as 20260923000400_shared_rsvp_capacity.sql, looked up by secret only.
create function public.submit_shared_rsvp(requested_secret text, requested_name text, requested_attending boolean)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare target_wedding_id uuid; enabled boolean; close_date date; normalized_name text;
begin
  select w.id, w.rsvp_enabled, w.rsvp_closes_on into target_wedding_id, enabled, close_date
  from public.weddings w
  where w.rsvp_share_secret = requested_secret
    and w.published and public.has_active_entitlement(w.id)
  for update of w;
  if not found then return 'unavailable'; end if;
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 or requested_attending is null then return 'invalid'; end if;
  normalized_name := lower(requested_name);
  delete from public.shared_rsvp_attempts
    where wedding_id = target_wedding_id and attempted_at <= now() - interval '10 minutes';
  if (select count(*) from public.shared_rsvp_responses where wedding_id = target_wedding_id) >= 5000 then
    return 'full';
  end if;
  if (select count(*) from public.shared_rsvp_attempts where wedding_id = target_wedding_id) >= 1000 then
    return 'rate_limited';
  end if;
  if (select count(*) from public.shared_rsvp_attempts
      where wedding_id = target_wedding_id and name_key = normalized_name) >= 10 then
    return 'rate_limited';
  end if;
  insert into public.shared_rsvp_attempts (wedding_id, name_key) values (target_wedding_id, normalized_name);
  insert into public.shared_rsvp_responses (wedding_id, responding_name, attending)
    values (target_wedding_id, requested_name, requested_attending);
  return 'saved';
end;
$$;
revoke all on function public.submit_shared_rsvp(text, text, boolean) from public;
grant execute on function public.submit_shared_rsvp(text, text, boolean) to anon, authenticated;

-- Supabase's default grants survive "revoke ... from public"; only signed-in owners may rotate a secret.
revoke execute on function public.rotate_shared_rsvp_secret(uuid) from anon;
