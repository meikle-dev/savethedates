create function public.valid_wedding_faqs(input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  item jsonb;
  question text;
  answer text;
begin
  if jsonb_typeof(input) is distinct from 'array' or jsonb_array_length(input) > 5 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(input)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or (select count(*) from jsonb_object_keys(item)) <> 2
      or not (item ? 'question' and item ? 'answer') then
      return false;
    end if;
    question := item ->> 'question';
    answer := item ->> 'answer';
    if question is null or answer is null
      or question = '' or answer = ''
      or question <> btrim(question) or answer <> btrim(answer)
      or char_length(question) > 200 or char_length(answer) > 1000 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_wedding_faqs(jsonb) from public;

alter table public.weddings
  add column details_enabled boolean not null default false,
  add column ceremony_time text not null default '',
  add column ceremony_venue text not null default '',
  add column ceremony_address text not null default '',
  add column ceremony_url text not null default '',
  add column reception_time text not null default '',
  add column reception_venue text not null default '',
  add column reception_address text not null default '',
  add column reception_url text not null default '',
  add column travel text not null default '',
  add column travel_url text not null default '',
  add column accommodation text not null default '',
  add column accommodation_url text not null default '',
  add column dress_code text not null default '',
  add column faqs jsonb not null default '[]'::jsonb,
  add constraint wedding_details_text_valid check (
    ceremony_time = btrim(ceremony_time) and char_length(ceremony_time) <= 160
    and ceremony_venue = btrim(ceremony_venue) and char_length(ceremony_venue) <= 160
    and ceremony_address = btrim(ceremony_address) and char_length(ceremony_address) <= 160
    and reception_time = btrim(reception_time) and char_length(reception_time) <= 160
    and reception_venue = btrim(reception_venue) and char_length(reception_venue) <= 160
    and reception_address = btrim(reception_address) and char_length(reception_address) <= 160
    and travel = btrim(travel) and char_length(travel) <= 1000
    and accommodation = btrim(accommodation) and char_length(accommodation) <= 1000
    and dress_code = btrim(dress_code) and char_length(dress_code) <= 1000
  ),
  add constraint wedding_details_urls_valid check (
    char_length(ceremony_url) <= 2048 and (ceremony_url = '' or ceremony_url ~* '^https?://[^[:space:]]+$')
    and char_length(reception_url) <= 2048 and (reception_url = '' or reception_url ~* '^https?://[^[:space:]]+$')
    and char_length(travel_url) <= 2048 and (travel_url = '' or travel_url ~* '^https?://[^[:space:]]+$')
    and char_length(accommodation_url) <= 2048 and (accommodation_url = '' or accommodation_url ~* '^https?://[^[:space:]]+$')
  ),
  add constraint wedding_faqs_valid check (public.valid_wedding_faqs(faqs)),
  add constraint enabled_details_have_content check (
    not details_enabled or ceremony_time <> '' or ceremony_venue <> '' or ceremony_address <> '' or ceremony_url <> ''
      or reception_time <> '' or reception_venue <> '' or reception_address <> '' or reception_url <> ''
      or travel <> '' or travel_url <> '' or accommodation <> '' or accommodation_url <> ''
      or dress_code <> '' or jsonb_array_length(faqs) > 0
  );

drop function public.published_wedding(text);
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text, theme text, details_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path, w.theme, w.details_enabled
  from public.weddings w where w.slug = requested_slug and w.published;
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;

create function public.published_wedding_details(requested_slug text)
returns table (
  first_name text, second_name text, theme text,
  ceremony_time text, ceremony_venue text, ceremony_address text, ceremony_url text,
  reception_time text, reception_venue text, reception_address text, reception_url text,
  travel text, travel_url text, accommodation text, accommodation_url text,
  dress_code text, faqs jsonb
)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.theme,
    w.ceremony_time, w.ceremony_venue, w.ceremony_address, w.ceremony_url,
    w.reception_time, w.reception_venue, w.reception_address, w.reception_url,
    w.travel, w.travel_url, w.accommodation, w.accommodation_url,
    w.dress_code, w.faqs
  from public.weddings w
  where w.slug = requested_slug and w.published and w.details_enabled;
$$;
revoke all on function public.published_wedding_details(text) from public;
grant execute on function public.published_wedding_details(text) to anon, authenticated;
