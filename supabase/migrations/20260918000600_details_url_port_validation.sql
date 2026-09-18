create function public.valid_wedding_url(input text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  authority text;
  port_text text;
begin
  if input = '' then return true; end if;
  if char_length(input) > 2048 or input <> btrim(input)
    or input !~* '^https?://(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' then
    return false;
  end if;
  authority := substring(input from '^https?://([^/?#]+)');
  port_text := substring(authority from ':([0-9]+)$');
  return port_text is null or port_text::integer <= 65535;
exception when others then
  return false;
end;
$$;
revoke all on function public.valid_wedding_url(text) from public;

alter table public.weddings drop constraint wedding_details_urls_valid;
alter table public.weddings add constraint wedding_details_urls_valid check (
  public.valid_wedding_url(ceremony_url)
  and public.valid_wedding_url(reception_url)
  and public.valid_wedding_url(travel_url)
  and public.valid_wedding_url(accommodation_url)
);
