-- Hosted Supabase Storage authorises a download as `object.get_authenticated_info` (it reads the object's info
-- first); the local stack uses `object.get_authenticated`. Allow both for the same readers. Listing, signing and
-- anonymous listing stay denied.
drop policy "Owners read and remove wedding photos" on storage.objects;
create policy "Owners read and remove wedding photos" on storage.objects for select to authenticated
using (bucket_id = 'wedding-photos'
  and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.list','object.delete','object.delete_many'])
  and exists(select 1 from public.weddings w where w.id::text = (storage.foldername(name))[1] and w.owner_id = (select auth.uid())));

drop policy "Published photo download" on storage.objects;
create policy "Published photo download" on storage.objects for select to anon, authenticated
using (bucket_id = 'wedding-photos'
  and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info'])
  and public.is_published_photo(name));
