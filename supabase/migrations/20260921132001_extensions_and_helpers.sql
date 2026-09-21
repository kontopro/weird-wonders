create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_normalized_slug(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_normalized_slug(text) from public;
