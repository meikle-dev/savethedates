-- Owners can reconcile corrections and duplicate submissions without granting
-- guests read or write access to any stored answer.
grant update (responding_name, attending), delete on public.shared_rsvp_responses to authenticated;
create policy "Owners correct shared RSVP responses" on public.shared_rsvp_responses
  for update to authenticated using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );
create policy "Owners remove shared RSVP responses" on public.shared_rsvp_responses
  for delete to authenticated using (
    exists (select 1 from public.weddings w where w.id = wedding_id and w.owner_id = (select auth.uid()))
  );

-- A shared wedding-wide bucket could let one visitor block everybody else.
-- Count repeated submissions per normalised entered name instead.
alter table public.shared_rsvp_attempts add column name_key text;
create index shared_rsvp_attempts_name_time
  on public.shared_rsvp_attempts (wedding_id, name_key, attempted_at);

create or replace function public.submit_shared_rsvp(requested_slug text, requested_secret text, requested_name text, requested_attending boolean)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare target_wedding_id uuid; enabled boolean; close_date date; normalized_name text;
begin
  select w.id, w.rsvp_enabled, w.rsvp_closes_on into target_wedding_id, enabled, close_date
  from public.weddings w
  where w.slug = requested_slug and w.rsvp_share_secret = requested_secret
    and w.published and public.has_active_entitlement(w.id)
  for update of w;
  if not found then return 'unavailable'; end if;
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80 or requested_attending is null then return 'invalid'; end if;
  normalized_name := lower(requested_name);
  delete from public.shared_rsvp_attempts
    where wedding_id = target_wedding_id and name_key = normalized_name
      and attempted_at <= now() - interval '10 minutes';
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
