\set ON_ERROR_STOP on
insert into auth.users values
('10000000-0000-4000-8000-000000000001','camila@example.com'),
('10000000-0000-4000-8000-000000000002','lucas@example.com'),
('10000000-0000-4000-8000-000000000003','outro@example.com'),
('10000000-0000-4000-8000-000000000004','assistente@example.com');
insert into public.clinics(id,name) values ('20000000-0000-4000-8000-000000000001','Camila'),('20000000-0000-4000-8000-000000000002','Outro');
insert into public.clinic_members values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','therapist'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','therapist'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','therapist'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','assistant');
set role anon;
do $$begin
  begin perform * from public.patients;raise exception 'Anônimo conseguiu consultar pacientes';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
insert into public.patients(id,clinic_id,name) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Fictício');
insert into public.sessions(id,clinic_id,patient_id,date,value) values ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2026-10-12',12050);
insert into public.evolutions(clinic_id,session_id,notes) values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','{"complaint":"Fictício"}');
do $$begin
  begin insert into public.clinic_members values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','therapist');raise exception 'Usuário alterou permissões';exception when insufficient_privilege then null;end;
  begin insert into public.patients(clinic_id,name) values ('20000000-0000-4000-8000-000000000002','Invasão');raise exception 'Usuário gravou em outro consultório';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
do $$declare changed integer; backup jsonb; counts jsonb;begin
  if (select count(*) from public.patients)<>1 or (select count(*) from public.evolutions)<>1 then raise exception 'Segunda conta não compartilha registros';end if;
  update public.sessions set paid=true where id='40000000-0000-4000-8000-000000000001' and version=1;
  if (select version from public.sessions)<>2 then raise exception 'Versão não incrementou';end if;
  update public.sessions set paid=false where id='40000000-0000-4000-8000-000000000001' and version=1;
  get diagnostics changed=row_count;if changed<>0 then raise exception 'Atualização obsoleta sobrescreveu dados';end if;
  update public.evolutions set notes='{"response":"Resposta fictícia"}';
  if (select version from public.evolutions)<>2 then raise exception 'Evolução não incrementou versão';end if;
  backup:=public.export_backup();
  if backup->'sessions'->0->'evolution'->>'response'<>'Resposta fictícia' then raise exception 'Backup perdeu evolução';end if;
  counts:=public.restore_backup(backup);
  if counts<>'{"patients":0,"sessions":0,"evolutions":0}'::jsonb then raise exception 'Restore duplicou dados';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$begin
  if (select count(*) from public.patients)<>0 or (select count(*) from public.sessions)<>0 or (select count(*) from public.evolutions)<>0 then raise exception 'Vazamento entre consultórios';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
do $$begin
  if (select count(*) from public.sessions)<>1 or (select count(*) from public.evolutions)<>0 then raise exception 'Assistente com acesso clínico';end if;
  begin insert into public.evolutions(clinic_id,session_id,notes) values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','{}');raise exception 'Assistente editou evolução';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS: anonimato, isolamento, compartilhamento, permissões, versões e backup' as result;
