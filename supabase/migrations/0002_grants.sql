-- Phase A/B created the tables and RLS policies but never granted privileges
-- to the anon/authenticated roles that the client (anon key + session JWT)
-- operates as. Writes fail with "permission denied for table <x>" (42501);
-- SELECTs silently no-op. This grants the roles the CRUD access the RLS
-- policies already scope, and sets default privileges for future tables.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public to anon, authenticated;

grant usage, select
  on all sequences in schema public to anon, authenticated;

-- Tables / sequences created later by the postgres role inherit the grants.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to anon, authenticated;
