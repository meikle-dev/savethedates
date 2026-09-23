-- F031: individual invitation links were never sent to guests. The owner approved
-- permanent removal of their local/development data before production release.
drop function if exists public.guest_rsvp(text, text);
drop function if exists public.record_invalid_rsvp_attempt(text, text);
drop function if exists public.submit_guest_rsvp(text, text, text, boolean);
drop function if exists public.revoke_rsvp_invitation(uuid);
drop function if exists public.consume_rsvp_attempt(uuid);

drop table if exists public.rsvp_attempts;
drop table if exists public.rsvp_invitations;
drop function if exists public.limit_rsvp_invitations();
