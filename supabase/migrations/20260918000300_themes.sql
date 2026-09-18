alter table public.weddings add column theme text not null default 'minimal'
  constraint wedding_theme_valid check (theme in ('minimal', 'romantic', 'bold'));

-- The return type changes; recreate the narrow projection with explicit grants.
drop function public.published_wedding(text);
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text, theme text)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path, w.theme
  from public.weddings w where w.slug = requested_slug and w.published;
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;
