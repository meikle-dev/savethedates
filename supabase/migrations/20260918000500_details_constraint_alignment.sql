create or replace function public.valid_wedding_faqs(input jsonb) returns boolean
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
      or not (item ? 'question' and item ? 'answer')
      or jsonb_typeof(item -> 'question') is distinct from 'string'
      or jsonb_typeof(item -> 'answer') is distinct from 'string' then
      return false;
    end if;
    question := item ->> 'question';
    answer := item ->> 'answer';
    if question = '' or answer = ''
      or question <> btrim(question) or answer <> btrim(answer)
      or char_length(question) > 200 or char_length(answer) > 1000 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.weddings drop constraint wedding_details_urls_valid;
alter table public.weddings add constraint wedding_details_urls_valid check (
  char_length(ceremony_url) <= 2048 and (ceremony_url = '' or ceremony_url ~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$')
  and char_length(reception_url) <= 2048 and (reception_url = '' or reception_url ~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$')
  and char_length(travel_url) <= 2048 and (travel_url = '' or travel_url ~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$')
  and char_length(accommodation_url) <= 2048 and (accommodation_url = '' or accommodation_url ~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$')
);
