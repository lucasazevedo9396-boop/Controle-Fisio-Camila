-- Atualização do banco existente. Não execute schema.sql novamente.
-- Preserva pacientes, atendimentos, pagamentos e fichas existentes.
begin;
alter table public.sessions add column if not exists treatment text not null default 'physiotherapy' check(treatment in ('physiotherapy','pilates'));
alter table public.sessions add column if not exists deleted_at timestamptz;
alter table public.evolutions add column if not exists score numeric(3,1) check(score between 0 and 10);
create table if not exists public.patient_progress (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null,
  date date not null,
  notes text not null default '' check(length(notes)<=10000),
  score numeric(3,1) check(score between 0 and 10),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  check(length(trim(notes))>0 or score is not null),
  foreign key(clinic_id,patient_id) references public.patients(clinic_id,id)
);
create index if not exists patient_progress_clinic on public.patient_progress(clinic_id,patient_id,date);
alter table public.patient_progress enable row level security;
drop policy if exists progress_read on public.patient_progress;
drop policy if exists progress_insert on public.patient_progress;
create policy progress_read on public.patient_progress for select to authenticated using(exists(select 1 from public.clinic_members m where m.clinic_id=patient_progress.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist'));
create policy progress_insert on public.patient_progress for insert to authenticated with check(exists(select 1 from public.clinic_members m where m.clinic_id=patient_progress.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist'));
revoke all on public.patient_progress from anon,authenticated;
grant select,insert on public.patient_progress to authenticated;

create or replace function public.create_patient(patient jsonb,initial jsonb default null) returns uuid
language plpgsql security invoker set search_path=public as $$
declare pid uuid;cid uuid;
begin
  pid:=(patient->>'id')::uuid;cid:=(patient->>'clinicId')::uuid;
  insert into public.patients(id,clinic_id,name,phone) values(pid,cid,patient->>'name',coalesce(patient->>'phone',''));
  if initial is not null then
    insert into public.patient_progress(id,clinic_id,patient_id,date,notes,score)
    values((initial->>'id')::uuid,cid,pid,(initial->>'date')::date,coalesce(initial->>'notes',''),(initial->>'score')::numeric);
  end if;
  return pid;
end $$;
revoke all on function public.create_patient(jsonb,jsonb) from public,anon;
grant execute on function public.create_patient(jsonb,jsonb) to authenticated;

create or replace function public.restore_backup(backup jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare cid uuid; p jsonb; s jsonb; n integer; pc integer:=0; sc integer:=0; ec integer:=0; gc integer:=0; g jsonb;
begin
  cid:=(backup->>'clinicId')::uuid;
  if not exists(select 1 from public.clinic_members where clinic_id=cid and user_id=auth.uid() and role='therapist') then raise exception 'Acesso negado'; end if;
  if backup->>'format' is distinct from 'camila-data-v1' or jsonb_typeof(backup->'patients') is distinct from 'array' or jsonb_typeof(backup->'sessions') is distinct from 'array' then raise exception 'Formato inválido'; end if;
  if jsonb_array_length(backup->'patients')>10000 or jsonb_array_length(backup->'sessions')>50000 then raise exception 'Backup muito grande'; end if;
  for p in select value from jsonb_array_elements(backup->'patients') loop
    insert into public.patients(id,clinic_id,name,phone) values((p->>'id')::uuid,cid,p->>'name',coalesce(p->>'phone','')) on conflict(id) do nothing;
    get diagnostics n=row_count;pc:=pc+n;
  end loop;
  for s in select value from jsonb_array_elements(backup->'sessions') loop
    insert into public.sessions(id,clinic_id,patient_id,date,value,paid,description,treatment,deleted_at) values((s->>'id')::uuid,cid,(s->>'patientId')::uuid,(s->>'date')::date,(s->>'value')::bigint,(s->>'paid')::boolean,coalesce(s->>'description',''),coalesce(s->>'treatment','physiotherapy'),(s->>'deletedAt')::timestamptz) on conflict(id) do nothing;
    get diagnostics n=row_count;sc:=sc+n;
    if s->'evolution' is not null and (s->'evolution'<>'{}'::jsonb or s->>'evolutionScore' is not null) then
      insert into public.evolutions(clinic_id,session_id,notes,score) values(cid,(s->>'id')::uuid,coalesce(s->'evolution','{}'::jsonb),(s->>'evolutionScore')::numeric) on conflict(session_id) do nothing;
      get diagnostics n=row_count;ec:=ec+n;
    end if;
  end loop;
  if backup ? 'progress' then
    if jsonb_typeof(backup->'progress')<>'array' or jsonb_array_length(backup->'progress')>50000 then raise exception 'Evolução inválida'; end if;
    for g in select value from jsonb_array_elements(backup->'progress') loop
      insert into public.patient_progress(id,clinic_id,patient_id,date,notes,score) values((g->>'id')::uuid,cid,(g->>'patientId')::uuid,(g->>'date')::date,coalesce(g->>'notes',''),(g->>'score')::numeric) on conflict(id) do nothing;
      get diagnostics n=row_count;gc:=gc+n;
    end loop;
  end if;
  return jsonb_build_object('patients',pc,'sessions',sc,'evolutions',ec) || case when backup ? 'progress' then jsonb_build_object('progress',gc) else '{}'::jsonb end;
end $$;
revoke all on function public.restore_backup(jsonb) from public,anon;
grant execute on function public.restore_backup(jsonb) to authenticated;
create or replace function public.export_backup() returns jsonb language sql stable security invoker set search_path=public as $$
  select jsonb_build_object('format','camila-data-v1','clinicId',m.clinic_id,'exportedAt',now(),
    'patients',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'phone',p.phone)) from public.patients p where p.clinic_id=m.clinic_id),'[]'::jsonb),
    'progress',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'patientId',g.patient_id,'date',g.date,'notes',g.notes,'score',g.score)) from public.patient_progress g where g.clinic_id=m.clinic_id),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'patientId',s.patient_id,'date',s.date,'value',s.value,'paid',s.paid,'description',s.description,'treatment',s.treatment,'deletedAt',s.deleted_at,'evolutionScore',e.score,'evolution',coalesce(e.notes,'{}'::jsonb))) from public.sessions s left join public.evolutions e on e.session_id=s.id where s.clinic_id=m.clinic_id),'[]'::jsonb))
  from public.clinic_members m where m.user_id=auth.uid()
$$;
revoke all on function public.export_backup() from public,anon;
grant execute on function public.export_backup() to authenticated;
notify pgrst, 'reload schema';
commit;
