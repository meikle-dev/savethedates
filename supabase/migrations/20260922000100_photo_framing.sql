create function public.valid_photo_framing(input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  theme_name text;
  theme_value jsonb;
  page_name text;
  frame_value jsonb;
begin
  if jsonb_typeof(input) is distinct from 'object' then return false; end if;
  for theme_name, theme_value in select key, value from jsonb_each(input)
  loop
    if theme_name not in ('minimal', 'romantic', 'bold') or jsonb_typeof(theme_value) is distinct from 'object' then return false; end if;
    for page_name, frame_value in select key, value from jsonb_each(theme_value)
    loop
      if page_name not in ('saveTheDate', 'details')
        or jsonb_typeof(frame_value) is distinct from 'object'
        or (select count(*) from jsonb_object_keys(frame_value)) <> 3
        or not (frame_value ? 'x' and frame_value ? 'y' and frame_value ? 'zoom')
        or jsonb_typeof(frame_value -> 'x') is distinct from 'number'
        or jsonb_typeof(frame_value -> 'y') is distinct from 'number'
        or jsonb_typeof(frame_value -> 'zoom') is distinct from 'number'
        or (frame_value ->> 'x')::numeric not between 0 and 100
        or (frame_value ->> 'y')::numeric not between 0 and 100
        or (frame_value ->> 'zoom')::numeric not between 1 and 2 then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_photo_framing(jsonb) from public;

alter table public.weddings
  add column photo_framing jsonb not null default '{}'::jsonb,
  add constraint wedding_photo_framing_valid check (public.valid_photo_framing(photo_framing));

create function public.reset_photo_framing_for_new_photo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.photo_path is distinct from new.photo_path then new.photo_framing = '{}'::jsonb; end if;
  return new;
end;
$$;
revoke all on function public.reset_photo_framing_for_new_photo() from public;
create trigger reset_photo_framing_for_new_photo before update of photo_path on public.weddings
for each row execute function public.reset_photo_framing_for_new_photo();

drop function public.published_wedding(text);
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text, photo_framing jsonb, theme text, details_enabled boolean, rsvp_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path,
    jsonb_build_object(w.theme, coalesce(w.photo_framing -> w.theme, '{}'::jsonb)),
    w.theme, w.details_enabled, w.rsvp_enabled
  from public.weddings w
  where w.slug = requested_slug and w.published and public.has_active_entitlement(w.id);
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;

drop function public.published_wedding_details(text);
create function public.published_wedding_details(requested_slug text)
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
  where w.slug = requested_slug and w.published and w.details_enabled and public.has_active_entitlement(w.id);
$$;
revoke all on function public.published_wedding_details(text) from public;
grant execute on function public.published_wedding_details(text) to anon, authenticated;
