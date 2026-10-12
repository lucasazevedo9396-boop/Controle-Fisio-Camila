\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $$declare backup jsonb; counts jsonb; begin
  backup:='{"format":"camila-data-v1","clinicId":"20000000-0000-4000-8000-000000000001","patients":[{"id":"30000000-0000-4000-8000-000000000002","name":"Restaurado","phone":""}],"sessions":[{"id":"40000000-0000-4000-8000-000000000002","patientId":"30000000-0000-4000-8000-000000000002","date":"2026-10-13","value":8000,"paid":false,"description":"","evolution":{"plan":"Plano fictício"}}]}';
  counts:=public.restore_backup(backup);
  if counts<>'{"patients":1,"sessions":1,"evolutions":1}'::jsonb then raise exception 'Restauração não recuperou todos os registros';end if;
  if (select notes->>'plan' from public.evolutions where session_id='40000000-0000-4000-8000-000000000002')<>'Plano fictício' then raise exception 'Perdeu notas restauradas';end if;
  backup:=jsonb_set(backup,'{patients,0,id}','"30000000-0000-4000-8000-000000000003"');
  backup:=jsonb_set(backup,'{sessions,0,id}','"40000000-0000-4000-8000-000000000003"');
  backup:=jsonb_set(backup,'{sessions,0,patientId}','"30000000-0000-4000-8000-000000000099"');
  begin perform public.restore_backup(backup);raise exception 'Backup inconsistente foi aceito';exception when foreign_key_violation then null;end;
  if exists(select 1 from public.patients where id='30000000-0000-4000-8000-000000000003') then raise exception 'Restauração inválida deixou paciente parcial';end if;
end$$;
reset role;
select 'PASS: restauração completa, sem sobrescrita e reversão atômica de erro' as result;
