revoke all on function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text) from anon, authenticated;
grant execute on function public.process_stripe_payment_event(text, timestamptz, text, text, uuid, uuid, text) to service_role;
