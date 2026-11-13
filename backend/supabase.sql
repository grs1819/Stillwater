-- Proposed first migration. Run in a dedicated BETA Supabase project first.
-- Requires real two-user integration tests before enabling account UI.
begin;
create table if not exists public.stillwater_villages (
  owner_id uuid not null references auth.users(id) on delete cascade,
  environment text not null check (environment in ('beta','live')),
  id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  schema_version integer not null default 1 check (schema_version = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'blocks' and jsonb_typeof(data->'blocks') = 'object' and octet_length(data::text) <= 2000000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, environment, id)
);
alter table public.stillwater_villages enable row level security;
drop policy if exists "Read own villages" on public.stillwater_villages;
create policy "Read own villages" on public.stillwater_villages for select to authenticated using (owner_id = (select auth.uid()));
revoke all on public.stillwater_villages from anon, authenticated;
grant select on public.stillwater_villages to authenticated;
-- Mutations are only through revision-checked RPCs, not unrestricted upserts.
create or replace function public.stillwater_save_village(
  p_environment text, p_id uuid, p_name text, p_data jsonb, p_expected_revision bigint
) returns public.stillwater_villages
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); found_row public.stillwater_villages;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_environment is null or p_environment not in ('beta','live') or p_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'invalid_save_request' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_environment, 0));
  select * into found_row from public.stillwater_villages where owner_id=actor and environment=p_environment and id=p_id;
  if found then
    if found_row.revision <> p_expected_revision then raise exception 'save_conflict' using errcode='PT409'; end if;
    update public.stillwater_villages set name=btrim(p_name),data=p_data,revision=revision+1,updated_at=now()
      where owner_id=actor and environment=p_environment and id=p_id returning * into found_row;
  else
    if p_expected_revision <> 0 then raise exception 'save_conflict' using errcode='PT409'; end if;
    if (select count(*) from public.stillwater_villages where owner_id=actor and environment=p_environment) >= 3 then
      raise exception 'village_limit_reached' using errcode='23514';
    end if;
    insert into public.stillwater_villages(owner_id,environment,id,name,data)
      values(actor,p_environment,p_id,btrim(p_name),p_data) returning * into found_row;
  end if;
  return found_row;
end;
$$;
create or replace function public.stillwater_delete_village(p_environment text,p_id uuid,p_expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); affected integer;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_environment is null or p_environment not in ('beta','live') or p_id is null or p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'invalid_delete_request' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_environment, 0));
  delete from public.stillwater_villages where owner_id=actor and environment=p_environment and id=p_id and revision=p_expected_revision;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'save_conflict' using errcode='PT409'; end if;
end;
$$;
revoke all on function public.stillwater_save_village(text,uuid,text,jsonb,bigint) from public,anon;
revoke all on function public.stillwater_delete_village(text,uuid,bigint) from public,anon;
grant execute on function public.stillwater_save_village(text,uuid,text,jsonb,bigint) to authenticated;
grant execute on function public.stillwater_delete_village(text,uuid,bigint) to authenticated;
commit;
