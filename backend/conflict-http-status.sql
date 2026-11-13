-- Run once in the BETA project's SQL editor. Changes no village rows.
-- Keep application conflicts distinct from PostgreSQL serialization failures.
begin;
do $migration$
declare
  signature regprocedure;
  definition text;
begin
  foreach signature in array array[
    'public.stillwater_save_village(text,uuid,text,jsonb,bigint)'::regprocedure,
    'public.stillwater_delete_village(text,uuid,bigint)'::regprocedure
  ] loop
    definition := pg_get_functiondef(signature);
    definition := regexp_replace(
      definition,
      'errcode[[:space:]]*=[[:space:]]*''40001''',
      'errcode=''PT409''', 'gi'
    );
    execute definition;
  end loop;
end;
$migration$;
commit;
