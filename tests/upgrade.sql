\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $$declare backup jsonb;counts jsonb;begin
  if (select treatment from public.sessions where id='40000000-0000-4000-8000-000000000001')<>'physiotherapy' then raise exception 'Legado perdeu modalidade padrão';end if;
  if (select count(*) from public.patients)<>1 then raise exception 'Migração alterou pacientes existentes';end if;
  perform public.create_patient('{"id":"30000000-0000-4000-8000-000000000010","clinicId":"20000000-0000-4000-8000-000000000001","name":"Novo fictício","phone":""}', '{"id":"50000000-0000-4000-8000-000000000010","date":"2026-10-13","notes":"Evolução inicial","score":0}');
  if (select score from public.patient_progress where id='50000000-0000-4000-8000-000000000010')<>0 then raise exception 'Perdeu nota zero';end if;
  begin
    perform public.create_patient('{"id":"30000000-0000-4000-8000-000000000011","clinicId":"20000000-0000-4000-8000-000000000001","name":"Não deve persistir"}', '{"id":"50000000-0000-4000-8000-000000000011","date":"2026-10-13","notes":"Inválida","score":11}');
    raise exception 'Aceitou nota fora da escala';
  exception when check_violation then null;end;
  if exists(select 1 from public.patients where id='30000000-0000-4000-8000-000000000011') then raise exception 'Criou paciente sem evolução após falha';end if;
  insert into public.sessions(id,clinic_id,patient_id,date,value,treatment,paid) values ('40000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000010','2026-10-13',8000,'pilates',true);
  insert into public.evolutions(clinic_id,session_id,notes,score) values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000010','{"response":"Melhora fictícia"}',8);
  update public.sessions set deleted_at=now() where id='40000000-0000-4000-8000-000000000010' and version=1;
  if (select count(*) from public.sessions where deleted_at is null)<>1 then raise exception 'Excluído continua ativo';end if;
  backup:=public.export_backup();
  if jsonb_array_length(backup->'progress')<>1 then raise exception 'Backup perdeu evolução inicial';end if;
  if not exists(select 1 from jsonb_array_elements(backup->'sessions') s where s->>'treatment'='pilates' and s->>'deletedAt' is not null and (s->>'evolutionScore')::numeric=8) then raise exception 'Backup perdeu modalidade, nota ou exclusão';end if;
  counts:=public.restore_backup(backup);
  if counts<>'{"patients":0,"sessions":0,"evolutions":0,"progress":0}'::jsonb then raise exception 'Backup duplicou registros';end if;
  if (select deleted_at from public.sessions where id='40000000-0000-4000-8000-000000000010') is null then raise exception 'Backup reativou atendimento excluído';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
do $$begin if (select count(*) from public.patient_progress)<>1 then raise exception 'Evolução inicial não compartilhada';end if;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$begin if (select count(*) from public.patient_progress)<>0 then raise exception 'Vazou evolução entre consultórios';end if;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
do $$begin
  if (select count(*) from public.patient_progress)<>0 then raise exception 'Assistente leu evolução';end if;
  begin insert into public.patient_progress(clinic_id,patient_id,date,notes) values ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000010','2026-10-13','Inválido');raise exception 'Assistente gravou ficha';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: preservação, Pilates, exclusão, nota zero, cadastro atômico, backup e RLS' as result;
