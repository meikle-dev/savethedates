-- F065: two guest links, each with its own secret. rsvp_share_secret stays the Save the Date link; the new
-- invitation_share_secret opens the Invitation. Neither can be derived from the other. What each link opens:
--   Save the Date link: Save the Date; Details while on; RSVP while on and the Invitation is off.
--   Invitation link (only while the Invitation is on): Invitation; Details while on; RSVP while on.
-- Keep in step with linkPages in src/features/weddings/guest-link.ts.

create function public.new_guest_link_secret() returns text
language sql volatile set search_path = '' as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
$$;
-- The column default and the insert trigger run it as the inserting owner, so signed-in owners keep execute; guests
-- don't need it. It returns only fresh random text, never a stored secret.
revoke all on function public.new_guest_link_secret() from public, anon;
grant execute on function public.new_guest_link_secret() to authenticated, service_role;

-- The default is volatile, so every existing wedding gets its own secret.
alter table public.weddings add column invitation_share_secret text not null default public.new_guest_link_secret()
  check (invitation_share_secret ~ '^[A-Za-z0-9_-]{43}$');
create unique index weddings_invitation_share_secret_key on public.weddings (invitation_share_secret);
alter table public.weddings add constraint wedding_guest_link_secrets_differ check (invitation_share_secret <> rsvp_share_secret);

-- Owners hold a table-wide update grant. Without this, an owner could write a secret they chose, or copy another
-- wedding's secret into their other column and break that wedding's link. Secrets are therefore always generated here:
-- guests' and owners' inserts get fresh ones, and their updates may not change them. The rotate functions run as the
-- function owner, so they (and the service role) can still replace a secret.
create function public.guard_guest_link_secrets() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.rsvp_share_secret := public.new_guest_link_secret();
      new.invitation_share_secret := public.new_guest_link_secret();
    elsif new.rsvp_share_secret is distinct from old.rsvp_share_secret
      or new.invitation_share_secret is distinct from old.invitation_share_secret then
      raise exception 'guest_link_secrets_read_only' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_guest_link_secrets before insert or update on public.weddings
  for each row execute function public.guard_guest_link_secrets();

-- Same columns, conditions and grants as 20260925000600_wedding_invitation.sql, plus which link the secret is.
-- The Invitation link finds nothing while the Invitation is off, so every page under it is "not found".
drop function public.guest_wedding(text);

create function public.guest_wedding(requested_secret text)
returns table (slug text, first_name text, second_name text, wedding_date date, location text, message text,
  photo_path text, photo_framing jsonb, theme text, details_enabled boolean, rsvp_enabled boolean, rsvp_open boolean,
  rsvp_closes_on date, invitation_enabled boolean, link text)
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.slug, w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.theme, w.details_enabled, w.rsvp_enabled,
    w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on),
    case when w.rsvp_enabled then w.rsvp_closes_on end,
    w.invitation_enabled,
    case when w.rsvp_share_secret = requested_secret then 'save_the_date' else 'invitation' end
  from public.weddings w
  where (w.rsvp_share_secret = requested_secret or (w.invitation_share_secret = requested_secret and w.invitation_enabled))
    and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.guest_wedding(text) from public;
grant execute on function public.guest_wedding(text) to anon, authenticated;

-- Details: either link, while Details is on (and, for the Invitation link, while the Invitation is on).
create or replace function public.guest_wedding_details(requested_secret text)
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
  where (w.rsvp_share_secret = requested_secret or (w.invitation_share_secret = requested_secret and w.invitation_enabled))
    and w.published and w.details_enabled and public.has_active_entitlement(w.id);
$$;

-- The Invitation's content: only for the Invitation link.
create or replace function public.guest_wedding_invitation(requested_secret text)
returns table (invitation_host_line text, invitation_wording text, invitation_afterwards text,
  ceremony_time text, ceremony_venue text, ceremony_address text)
language sql stable security definer set search_path = '' as $$
  select w.invitation_host_line, w.invitation_wording, w.invitation_afterwards,
    w.ceremony_time, w.ceremony_venue, w.ceremony_address
  from public.weddings w
  where w.invitation_share_secret = requested_secret and w.published and w.invitation_enabled
    and public.has_active_entitlement(w.id);
$$;

-- RSVP (menu and replies): only through the link that offers it, the Invitation link while the Invitation is on and
-- the Save the Date link while it is off.
create or replace function public.guest_rsvp_menu(requested_secret text)
returns jsonb
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.meal_menu
  from public.weddings w
  where ((w.rsvp_share_secret = requested_secret and not w.invitation_enabled)
      or (w.invitation_share_secret = requested_secret and w.invitation_enabled))
    and w.published and public.has_active_entitlement(w.id)
    and w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on)
    and w.meal_choices_enabled;
$$;

-- Identical to 20260926000100_rsvp_meal_choices.sql apart from the lookup, which follows the link that offers RSVP.
-- A reply through the other link is 'unavailable', the same as an unknown link.
create or replace function public.submit_shared_rsvp(requested_secret text, requested_name text, requested_attending boolean,
  requested_meals jsonb default '{}'::jsonb, requested_vegetarian boolean default false,
  requested_vegan boolean default false, requested_gluten_free boolean default false,
  requested_dietary_other text default null)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  target_wedding_id uuid;
  enabled boolean;
  close_date date;
  meals_on boolean;
  menu jsonb;
  normalized_name text;
  course text;
  answer jsonb;
  matched jsonb;
  missing boolean := false;
  chosen jsonb := '{}'::jsonb;
begin
  select w.id, w.rsvp_enabled, w.rsvp_closes_on, w.meal_choices_enabled, w.meal_menu
    into target_wedding_id, enabled, close_date, meals_on, menu
  from public.weddings w
  where ((w.rsvp_share_secret = requested_secret and not w.invitation_enabled)
      or (w.invitation_share_secret = requested_secret and w.invitation_enabled))
    and w.published and public.has_active_entitlement(w.id)
  for update of w;
  if not found then return 'unavailable'; end if;
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 or requested_attending is null then return 'invalid'; end if;

  requested_meals := coalesce(requested_meals, '{}'::jsonb);
  if jsonb_typeof(requested_meals) is distinct from 'object'
    or requested_vegetarian is null or requested_vegan is null or requested_gluten_free is null
    or (requested_dietary_other is not null and (requested_dietary_other ~ '^\s|\s$' or requested_dietary_other !~ '\S'
      or char_length(requested_dietary_other) not between 1 and 200)) then
    return 'invalid';
  end if;
  if not requested_attending then
    if requested_meals <> '{}'::jsonb or requested_vegetarian or requested_vegan or requested_gluten_free
      or requested_dietary_other is not null then
      return 'invalid';
    end if;
  else
    if exists (select 1 from jsonb_object_keys(requested_meals) k
      where not meals_on or k not in ('starter', 'main', 'dessert')
        or coalesce(jsonb_array_length(menu -> k), 0) = 0) then
      return 'invalid_meals';
    end if;
    if meals_on then
      foreach course in array array['starter', 'main', 'dessert'] loop
        continue when jsonb_array_length(menu -> course) = 0;
        answer := requested_meals -> course;
        if answer is null then
          missing := true;
          continue;
        end if;
        if jsonb_typeof(answer) is distinct from 'object' then return 'invalid_meals'; end if;
        select o.value into matched from jsonb_array_elements(menu -> course) o
          where o.value ->> 'id' = answer ->> 'id' and o.value ->> 'label' = answer ->> 'label';
        if matched is null then return 'invalid_meals'; end if;
        chosen := chosen || jsonb_build_object(course, matched);
      end loop;
      if missing then return 'meal_missing'; end if;
    end if;
  end if;

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
  insert into public.shared_rsvp_responses (wedding_id, responding_name, attending, meal_choices,
    dietary_vegetarian, dietary_vegan, dietary_gluten_free, dietary_other)
    values (target_wedding_id, requested_name, requested_attending, chosen,
      requested_vegetarian, requested_vegan, requested_gluten_free, requested_dietary_other);
  return 'saved';
end;
$$;

-- Replaces only the Invitation link; the Save the Date link and every reply are unchanged.
create function public.rotate_invitation_share_secret(requested_wedding_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare new_secret text;
begin
  new_secret := public.new_guest_link_secret();
  update public.weddings set invitation_share_secret = new_secret
    where id = requested_wedding_id and owner_id = (select auth.uid());
  if not found then return null; end if;
  return new_secret;
end;
$$;
revoke all on function public.rotate_invitation_share_secret(uuid) from public, anon;
grant execute on function public.rotate_invitation_share_secret(uuid) to authenticated;
