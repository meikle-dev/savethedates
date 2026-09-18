alter table public.weddings
  add column slug text unique,
  add column published boolean not null default false,
  add column first_published_at timestamptz,
  add column photo_path text,
  add constraint wedding_slug_valid check (
    slug is null or (char_length(slug) between 3 and 63
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and slug not in ('account','auth','dashboard','api','media','preview','preview-photo','demo','demo-no-photo','demo-long-names','pricing','features','guides','examples','privacy','terms','support','robots','sitemap','favicon'))
  ),
  add constraint publication_requires_slug check (not published or slug is not null),
  add constraint wedding_photo_path check (photo_path is null or photo_path ~ ('^' || id::text || '/[a-f0-9-]{36}\.webp$'));

create function public.guard_wedding_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.first_published_at is not null and new.slug is distinct from old.slug then
      raise exception 'The published URL cannot change' using errcode = '23514';
    end if;
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
revoke all on function public.guard_wedding_publication() from public;
create trigger guard_wedding_publication before insert or update on public.weddings
for each row execute function public.guard_wedding_publication();

-- Deliberately narrow public projection: no owner identifiers or private rows.
create function public.published_wedding(requested_slug text)
returns table (first_name text, second_name text, wedding_date date, location text, message text, photo_path text)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.second_name, w.wedding_date, w.location, w.message, w.photo_path
  from public.weddings w where w.slug = requested_slug and w.published;
$$;
revoke all on function public.published_wedding(text) from public;
grant execute on function public.published_wedding(text) to anon, authenticated;

create function public.is_published_photo(requested_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.weddings where published and photo_path = requested_path);
$$;
revoke all on function public.is_published_photo(text) from public;
grant execute on function public.is_published_photo(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', false, 5242880, array['image/webp']);

create policy "Owners insert wedding photos" on storage.objects for insert to authenticated
with check (bucket_id = 'wedding-photos' and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$'
  and exists(select 1 from public.weddings w where w.id::text = (storage.foldername(name))[1] and w.owner_id = (select auth.uid())));
create policy "Owners read and remove wedding photos" on storage.objects for select to authenticated
using (bucket_id = 'wedding-photos'
  and storage.allow_any_operation(array['object.get_authenticated','object.list','object.delete','object.delete_many'])
  and exists(select 1 from public.weddings w where w.id::text = (storage.foldername(name))[1] and w.owner_id = (select auth.uid())));
create policy "Owners delete wedding photos" on storage.objects for delete to authenticated
using (bucket_id = 'wedding-photos'
  and exists(select 1 from public.weddings w where w.id::text = (storage.foldername(name))[1] and w.owner_id = (select auth.uid())));
-- Download only: never allow public listings or signed URLs that outlive unpublish.
create policy "Published photo download" on storage.objects for select to anon, authenticated
using (bucket_id = 'wedding-photos' and storage.allow_only_operation('object.get_authenticated')
  and public.is_published_photo(name));
