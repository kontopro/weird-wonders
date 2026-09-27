-- Baseline 2/7 — profiles, editorial members and roles.
--
-- `profiles` is the public face of a person (byline, author page); `members`
-- grants admin access. A former author keeps a profile without a membership.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (private.is_normalized_slug(slug) and char_length(slug) <= 120),
  display_name text not null check (char_length(display_name) between 1 and 100),
  avatar_path text,
  bio text check (bio is null or char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  role text not null check (role in ('owner', 'admin', 'editor', 'author')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.members enable row level security;

create index members_status_role_idx on public.members (status, role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function private.set_updated_at();

-- Every Auth user gets a profile with a neutral slug; they pick a readable one later.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, slug, display_name, avatar_path)
  values (
    new.id,
    'author-' || left(replace(new.id::text, '-', ''), 12),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Role helpers used by RLS policies.
create or replace function private.current_member_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.members
  where user_id = (select auth.uid())
    and status = 'active';
$$;

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_member_role()) is not null;
$$;

create or replace function private.is_active_member_id(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members
    where user_id = target_user_id
      and status = 'active'
  );
$$;

create or replace function private.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_member_role()) = any(allowed_roles), false);
$$;

create or replace function private.can_manage_member(target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (select private.current_member_role())
    when 'owner' then true
    when 'admin' then target_role <> 'owner'
    else false
  end;
$$;

revoke all on function private.current_member_role() from public;
revoke all on function private.is_active_member() from public;
revoke all on function private.is_active_member_id(uuid) from public;
revoke all on function private.has_role(text[]) from public;
revoke all on function private.can_manage_member(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_normalized_slug(text) to authenticated;
grant execute on function private.current_member_role() to authenticated;
grant execute on function private.is_active_member() to authenticated;
grant execute on function private.is_active_member_id(uuid) to authenticated;
grant execute on function private.has_role(text[]) to authenticated;
grant execute on function private.can_manage_member(text) to authenticated;

-- The first owner is assigned by the operator from the SQL editor (runs as
-- `postgres`). No API role can execute this, so a stranger who signs up can
-- never claim a fresh blog.
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

-- A blog must always keep at least one active owner.
create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removing_active_owner boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then
      raise exception 'Member identity cannot be changed';
    end if;

    removing_active_owner := old.role = 'owner'
      and old.status = 'active'
      and (new.role <> 'owner' or new.status <> 'active');
  else
    removing_active_owner := old.role = 'owner' and old.status = 'active';
  end if;

  if removing_active_owner then
    perform pg_advisory_xact_lock(hashtext('protect_last_blog_owner'));

    if (select count(*) from public.members where role = 'owner' and status = 'active') <= 1 then
      raise exception 'The blog must keep at least one active owner';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_last_owner() from public;

create trigger members_protect_last_owner
before update or delete on public.members
for each row execute function private.protect_last_owner();
