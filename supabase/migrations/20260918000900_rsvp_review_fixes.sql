create table public.rsvp_attempts (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.rsvp_invitations(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index rsvp_attempts_invitation_time on public.rsvp_attempts (invitation_id, attempted_at);
alter table public.rsvp_attempts enable row level security;
revoke all on public.rsvp_attempts from anon, authenticated;

create function public.consume_rsvp_attempt(requested_invitation_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rsvp_attempts
    where invitation_id = requested_invitation_id and attempted_at <= now() - interval '10 minutes';
  if (select count(*) from public.rsvp_attempts where invitation_id = requested_invitation_id) >= 10 then
    return false;
  end if;
  insert into public.rsvp_attempts (invitation_id) values (requested_invitation_id);
  return true;
end;
$$;
revoke all on function public.consume_rsvp_attempt(uuid) from public;

create or replace function public.record_invalid_rsvp_attempt(requested_slug text, requested_token_hash text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  invitation_id uuid;
begin
  select i.id into invitation_id
  from public.rsvp_invitations i
  join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published
    and i.token_hash = requested_token_hash and i.revoked_at is null
  for update of i;
  if not found then return 'unavailable'; end if;
  if not public.consume_rsvp_attempt(invitation_id) then return 'rate_limited'; end if;
  return 'invalid';
end;
$$;

create or replace function public.submit_guest_rsvp(
  requested_slug text,
  requested_token_hash text,
  requested_name text,
  requested_attending boolean
)
returns text
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  invitation_id uuid;
  enabled boolean;
  close_date date;
begin
  select i.id, w.rsvp_enabled, w.rsvp_closes_on
    into invitation_id, enabled, close_date
  from public.rsvp_invitations i
  join public.weddings w on w.id = i.wedding_id
  where w.slug = requested_slug and w.published
    and i.token_hash = requested_token_hash and i.revoked_at is null
  for update of i;
  if not found then return 'unavailable'; end if;
  if not public.consume_rsvp_attempt(invitation_id) then return 'rate_limited'; end if;
  if not enabled or (close_date is not null and current_date > close_date) then return 'closed'; end if;
  if requested_name is null or requested_name <> btrim(requested_name)
    or char_length(requested_name) not between 1 and 80
    or requested_attending is null then return 'invalid'; end if;

  update public.rsvp_invitations
    set responding_name = requested_name, attending = requested_attending, responded_at = now()
    where id = invitation_id;
  return 'saved';
end;
$$;

alter table public.rsvp_invitations
  drop column attempt_window_started_at,
  drop column attempt_count;
