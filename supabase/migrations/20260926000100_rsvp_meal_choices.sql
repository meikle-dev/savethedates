-- F068: optional meal choices and food preferences on the RSVP.
--
-- The couple's menu lives on their wedding row (owners write it through the existing weddings grants and RLS
-- policies). Three fixed courses each hold 0 or 2-6 options with stable ids. Guests read the menu only through
-- guest_rsvp_menu, and only while the site is live, RSVP is open and meal choices are on. Replies gain the chosen
-- option per course (id plus the text at the time) and food preferences. Guests still write only through
-- submit_shared_rsvp, which validates every answer against the current menu under the wedding row lock. Owners read
-- replies under the existing RLS policy and cannot edit food answers; changing a reply to not attending clears them.

create function public.valid_meal_menu(input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  course text;
  options jsonb;
  item jsonb;
  label text;
  ids text[] := '{}';
  labels text[];
begin
  if jsonb_typeof(input) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(input)) <> 3
    or not (input ? 'starter' and input ? 'main' and input ? 'dessert') then
    return false;
  end if;
  foreach course in array array['starter', 'main', 'dessert'] loop
    options := input -> course;
    -- One option isn't a choice: a course is empty or has two to six options.
    if jsonb_typeof(options) is distinct from 'array' or jsonb_array_length(options) = 1 or jsonb_array_length(options) > 6 then
      return false;
    end if;
    labels := '{}';
    for item in select value from jsonb_array_elements(options) loop
      if jsonb_typeof(item) is distinct from 'object'
        or (select count(*) from jsonb_object_keys(item)) <> 2
        or jsonb_typeof(item -> 'id') is distinct from 'string'
        or jsonb_typeof(item -> 'label') is distinct from 'string' then
        return false;
      end if;
      label := item ->> 'label';
      if (item ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (item ->> 'id') = any(ids)
        or label = '' or label <> btrim(label) or char_length(label) > 80
        or lower(label) = any(labels) then
        return false;
      end if;
      ids := ids || (item ->> 'id');
      labels := labels || lower(label);
    end loop;
  end loop;
  return true;
end;
$$;
-- "revoke ... from public" does not remove Supabase's default EXECUTE grants to anon and authenticated, and they
-- must stay for authenticated: check constraints run with the caller's rights, so an owner's own menu save or reply
-- correction needs EXECUTE on this validator. The function is pure and reveals nothing. Don't revoke it from
-- authenticated as "hardening".
revoke all on function public.valid_meal_menu(jsonb) from public;

-- A reply's saved choices: at most one {id, label} per course, copied from the menu when the guest replied.
create function public.valid_meal_choices(input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  choice record;
begin
  if jsonb_typeof(input) is distinct from 'object' then
    return false;
  end if;
  for choice in select key, value from jsonb_each(input) loop
    if choice.key not in ('starter', 'main', 'dessert')
      or jsonb_typeof(choice.value) is distinct from 'object'
      or (select count(*) from jsonb_object_keys(choice.value)) <> 2
      or jsonb_typeof(choice.value -> 'id') is distinct from 'string'
      or jsonb_typeof(choice.value -> 'label') is distinct from 'string'
      or (choice.value ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (choice.value ->> 'label') = '' or (choice.value ->> 'label') <> btrim(choice.value ->> 'label')
      or char_length(choice.value ->> 'label') > 80 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
-- "revoke ... from public" does not remove Supabase's default EXECUTE grants to anon and authenticated, and they
-- must stay for authenticated: check constraints run with the caller's rights, so an owner's own menu save or reply
-- correction needs EXECUTE on this validator. The function is pure and reveals nothing. Don't revoke it from
-- authenticated as "hardening".
revoke all on function public.valid_meal_choices(jsonb) from public;

-- Off by default. Switching off hides the menu from guests but keeps it; a saved menu is always valid, and meal
-- choices can only be on while at least one course has options.
alter table public.weddings
  add column meal_choices_enabled boolean not null default false,
  add column meal_menu jsonb not null default '{"starter": [], "main": [], "dessert": []}'::jsonb,
  add constraint wedding_meal_menu_valid check (public.valid_meal_menu(meal_menu)),
  add constraint wedding_meal_choices_need_menu check (
    not meal_choices_enabled or coalesce(jsonb_array_length(meal_menu -> 'starter'), 0)
      + coalesce(jsonb_array_length(meal_menu -> 'main'), 0) + coalesce(jsonb_array_length(meal_menu -> 'dessert'), 0) > 0
  );

-- Replies made before this feature keep the defaults: no meal choice and no food preferences. Each row stays
-- small (three short choices and 200 characters), so the existing per-wedding capacity still bounds storage.
alter table public.shared_rsvp_responses
  add column meal_choices jsonb not null default '{}'::jsonb,
  add column dietary_vegetarian boolean not null default false,
  add column dietary_vegan boolean not null default false,
  add column dietary_gluten_free boolean not null default false,
  add column dietary_other text,
  add constraint shared_rsvp_meal_choices_valid check (public.valid_meal_choices(meal_choices)),
  add constraint shared_rsvp_dietary_other_valid check (
    dietary_other is null or (dietary_other !~ '^\s|\s$' and dietary_other ~ '\S' and char_length(dietary_other) between 1 and 200)
  ),
  add constraint shared_rsvp_food_only_when_attending check (
    attending or (meal_choices = '{}'::jsonb and not dietary_vegetarian and not dietary_vegan and not dietary_gluten_free
      and dietary_other is null)
  );

-- Owners may still update only responding_name and attending (20260923000300); a change to not attending removes
-- the reply's food answers rather than failing the constraint above.
create function public.clear_food_when_not_attending() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not new.attending then
    new.meal_choices := '{}'::jsonb;
    new.dietary_vegetarian := false;
    new.dietary_vegan := false;
    new.dietary_gluten_free := false;
    new.dietary_other := null;
  end if;
  return new;
end;
$$;
-- Trigger functions are not called directly (EXECUTE is checked only when the trigger is created); the revoke simply
-- keeps it out of the public API. Supabase's default grants still apply, which is harmless for a trigger function.
revoke all on function public.clear_food_when_not_attending() from public;
create trigger clear_food_when_not_attending before update of attending on public.shared_rsvp_responses
  for each row execute function public.clear_food_when_not_attending();

-- The menu for the holder of the secret, only while the site is live, RSVP is open and meal choices are on;
-- otherwise null. Never returns replies, the secret or owner identifiers.
create function public.guest_rsvp_menu(requested_secret text)
returns jsonb
language sql stable security definer set search_path = '' set timezone = 'UTC' as $$
  select w.meal_menu
  from public.weddings w
  where w.rsvp_share_secret = requested_secret and w.published and public.has_active_entitlement(w.id)
    and w.rsvp_enabled and (w.rsvp_closes_on is null or current_date <= w.rsvp_closes_on)
    and w.meal_choices_enabled;
$$;
revoke all on function public.guest_rsvp_menu(text) from public;
grant execute on function public.guest_rsvp_menu(text) to anon, authenticated;

-- Same lookup, closure, name checks, limits and capacity as 20260925000100_secret_guest_urls.sql, plus the food
-- answers. The new parameters have defaults, so a three-argument call from the previous release still resolves
-- during deployment; it is then validated like any other reply (a menu course left unanswered is rejected).
-- Results: saved, unavailable, closed, invalid (name, attendance, dietary, or food sent with a "No"),
-- invalid_meals (a choice that doesn't match the current menu, or an answer for a course guests aren't shown),
-- meal_missing (every answer matches, but a course guests are shown has none), full, rate_limited.
-- Stored choice text is copied from the menu under the row lock, never from the request.
drop function public.submit_shared_rsvp(text, text, boolean);

create function public.submit_shared_rsvp(requested_secret text, requested_name text, requested_attending boolean,
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
  where w.rsvp_share_secret = requested_secret
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
    -- A "No" stores no food answers; sending any is a rejected reply, not a silent drop.
    if requested_meals <> '{}'::jsonb or requested_vegetarian or requested_vegan or requested_gluten_free
      or requested_dietary_other is not null then
      return 'invalid';
    end if;
  else
    -- Answers only for courses guests are shown: meal choices on and the course has options.
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
        -- The option must be on this wedding's menu, in this course, with the text the guest saw.
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
revoke all on function public.submit_shared_rsvp(text, text, boolean, jsonb, boolean, boolean, boolean, text) from public;
grant execute on function public.submit_shared_rsvp(text, text, boolean, jsonb, boolean, boolean, boolean, text) to anon, authenticated;

-- Catering numbers for Guests across every attending reply, whatever the owner's filter or page. Security invoker:
-- the existing owner-only select policy decides which replies are counted, so another owner's wedding counts nothing.
create function public.rsvp_catering_summary(requested_wedding_id uuid)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with attending as (
    select r.id, r.responding_name, r.responded_at, r.meal_choices, r.dietary_vegetarian, r.dietary_vegan,
      r.dietary_gluten_free, r.dietary_other
    from public.shared_rsvp_responses r
    where r.wedding_id = requested_wedding_id and r.attending
  )
  select jsonb_build_object(
    'attending', (select count(*) from attending),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object('course', m.course, 'id', m.id, 'label', m.label, 'count', m.replies))
      from (
        select c.key as course, c.value ->> 'id' as id, c.value ->> 'label' as label, count(*) as replies
        from attending a cross join lateral jsonb_each(a.meal_choices) c
        group by 1, 2, 3
      ) m
    ), '[]'::jsonb),
    'vegetarian', (select count(*) from attending where dietary_vegetarian),
    'vegan', (select count(*) from attending where dietary_vegan),
    'gluten_free', (select count(*) from attending where dietary_gluten_free),
    'other', coalesce((
      select jsonb_agg(jsonb_build_object('name', responding_name, 'text', dietary_other) order by responded_at, id)
      from attending where dietary_other is not null
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.rsvp_catering_summary(uuid) from public;
revoke execute on function public.rsvp_catering_summary(uuid) from anon;
grant execute on function public.rsvp_catering_summary(uuid) to authenticated;
