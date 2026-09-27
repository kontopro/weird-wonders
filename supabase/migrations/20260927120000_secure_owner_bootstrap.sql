-- Replace the self-service owner claim with an operator-only bootstrap.
--
-- `public.claim_initial_owner()` let any authenticated user become owner while
-- no membership existed. With public sign-ups enabled (the Supabase default),
-- a stranger could claim a freshly deployed blog before its operator did.
-- The first owner is now assigned from the Supabase SQL editor, which runs as
-- `postgres`; no API role can execute the bootstrap.

drop function if exists public.claim_initial_owner();

create or replace function private.bootstrap_owner(owner_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('claim_initial_blog_owner'));

  if exists (select 1 from public.members) then
    raise exception 'The blog already has members; invite further users from the admin';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(owner_email));

  if target_user_id is null then
    raise exception 'No Auth user with email %; create the user first', owner_email;
  end if;

  insert into public.members (user_id, role)
  values (target_user_id, 'owner');

  return target_user_id;
end;
$$;

revoke all on function private.bootstrap_owner(text) from public, anon, authenticated;
