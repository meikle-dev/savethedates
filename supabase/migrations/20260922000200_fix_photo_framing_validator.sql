create or replace function public.valid_photo_framing(input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  theme_name text;
  theme_value jsonb;
  page_name text;
  frame_value jsonb;
begin
  if jsonb_typeof(input) is distinct from 'object' then return false; end if;
  for theme_name, theme_value in select key, value from jsonb_each(input)
  loop
    if theme_name not in ('minimal', 'romantic', 'bold') or jsonb_typeof(theme_value) is distinct from 'object' then return false; end if;
    for page_name, frame_value in select key, value from jsonb_each(theme_value)
    loop
      if page_name not in ('saveTheDate', 'details')
        or jsonb_typeof(frame_value) is distinct from 'object'
        or (select count(*) from jsonb_object_keys(frame_value)) <> 3
        or not (frame_value ? 'x' and frame_value ? 'y' and frame_value ? 'zoom')
        or jsonb_typeof(frame_value -> 'x') is distinct from 'number'
        or jsonb_typeof(frame_value -> 'y') is distinct from 'number'
        or jsonb_typeof(frame_value -> 'zoom') is distinct from 'number'
        or (frame_value ->> 'x')::numeric not between 0 and 100
        or (frame_value ->> 'y')::numeric not between 0 and 100
        or (frame_value ->> 'zoom')::numeric not between 1 and 2 then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;
