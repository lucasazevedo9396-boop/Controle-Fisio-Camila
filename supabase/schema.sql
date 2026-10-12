-- Execute uma vez no SQL Editor do seu projeto Supabase.
begin;
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200)
);
create table public.clinic_members (
  clinic_id uuid not null references public.clinics(id),
  user_id uuid not null unique references auth.users(id),
  role text not null check (role in ('therapist','assistant')),
  primary key (clinic_id,user_id)
);
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  name text not null check (length(trim(name)) between 1 and 200),
  phone text not null default '' check (length(phone)<=40),
  created_at timestamptz not null default now(),
  unique (clinic_id,id)
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null,
  date date not null,
  value bigint not null check (value between 1 and 9007199254740991),
  paid boolean not null default false,
  description text not null default '' check (length(description)<=500),
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  unique (clinic_id,id),
  foreign key (clinic_id,patient_id) references public.patients(clinic_id,id)
);
create function public.valid_evolution(notes jsonb) returns boolean
language sql immutable set search_path=public as $$
  select case when jsonb_typeof(notes)='object' then not exists (
    select 1 from jsonb_each(notes) e
    where e.key not in ('complaint','assessment','procedures','response','plan')
       or jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>10000
  ) else false end
$$;
create table public.evolutions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  session_id uuid not null unique,
  notes jsonb not null default '{}' check (public.valid_evolution(notes)),
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  foreign key (clinic_id,session_id) references public.sessions(clinic_id,id)
);
create index patients_clinic on public.patients(clinic_id);
create index sessions_clinic_date on public.sessions(clinic_id,date);
create index evolutions_clinic on public.evolutions(clinic_id);

create function public.bump_version() returns trigger language plpgsql set search_path=public as $$
begin
  if new.id<>old.id or new.clinic_id<>old.clinic_id then raise exception 'Identidade do registro não pode ser alterada'; end if;
  if tg_table_name='sessions' then
    if new.patient_id<>old.patient_id then raise exception 'Paciente não pode ser alterado'; end if;
  else
    if new.session_id<>old.session_id then raise exception 'Atendimento não pode ser alterado'; end if;
  end if;
  new.version:=old.version+1; new.updated_at:=now(); new.updated_by:=auth.uid(); return new;
end $$;
create trigger sessions_version before update on public.sessions for each row execute function public.bump_version();
create trigger evolutions_version before update on public.evolutions for each row execute function public.bump_version();

alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.evolutions enable row level security;
create policy own_membership on public.clinic_members for select to authenticated using (user_id=(select auth.uid()));
create policy member_clinic on public.clinics for select to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=clinics.id and m.user_id=(select auth.uid())));
create policy patient_read on public.patients for select to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=patients.clinic_id and m.user_id=(select auth.uid())));
create policy patient_insert on public.patients for insert to authenticated with check (exists(select 1 from public.clinic_members m where m.clinic_id=patients.clinic_id and m.user_id=(select auth.uid())));
create policy session_read on public.sessions for select to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=sessions.clinic_id and m.user_id=(select auth.uid())));
create policy session_insert on public.sessions for insert to authenticated with check (exists(select 1 from public.clinic_members m where m.clinic_id=sessions.clinic_id and m.user_id=(select auth.uid())));
create policy session_update on public.sessions for update to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=sessions.clinic_id and m.user_id=(select auth.uid()))) with check (exists(select 1 from public.clinic_members m where m.clinic_id=sessions.clinic_id and m.user_id=(select auth.uid())));
create policy evolution_read on public.evolutions for select to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=evolutions.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist'));
create policy evolution_insert on public.evolutions for insert to authenticated with check (exists(select 1 from public.clinic_members m where m.clinic_id=evolutions.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist'));
create policy evolution_update on public.evolutions for update to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=evolutions.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist')) with check (exists(select 1 from public.clinic_members m where m.clinic_id=evolutions.clinic_id and m.user_id=(select auth.uid()) and m.role='therapist'));
revoke all on public.clinics,public.clinic_members,public.patients,public.sessions,public.evolutions from anon,authenticated;
grant select on public.clinics,public.clinic_members to authenticated;
grant select,insert on public.patients to authenticated;
grant select,insert,update on public.sessions,public.evolutions to authenticated;

create function public.restore_backup(backup jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare cid uuid; p jsonb; s jsonb; n integer; pc integer:=0; sc integer:=0; ec integer:=0;
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
    insert into public.sessions(id,clinic_id,patient_id,date,value,paid,description) values((s->>'id')::uuid,cid,(s->>'patientId')::uuid,(s->>'date')::date,(s->>'value')::bigint,(s->>'paid')::boolean,coalesce(s->>'description','')) on conflict(id) do nothing;
    get diagnostics n=row_count;sc:=sc+n;
    if s->'evolution' is not null and s->'evolution'<>'{}'::jsonb then
      insert into public.evolutions(clinic_id,session_id,notes) values(cid,(s->>'id')::uuid,s->'evolution') on conflict(session_id) do nothing;
      get diagnostics n=row_count;ec:=ec+n;
    end if;
  end loop;
  return jsonb_build_object('patients',pc,'sessions',sc,'evolutions',ec);
end $$;
revoke all on function public.restore_backup(jsonb) from public,anon;
grant execute on function public.restore_backup(jsonb) to authenticated;
create function public.export_backup() returns jsonb language sql stable security invoker set search_path=public as $$
  select jsonb_build_object('format','camila-data-v1','clinicId',m.clinic_id,'exportedAt',now(),
    'patients',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'phone',p.phone)) from public.patients p where p.clinic_id=m.clinic_id),'[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'patientId',s.patient_id,'date',s.date,'value',s.value,'paid',s.paid,'description',s.description,'evolution',coalesce(e.notes,'{}'::jsonb))) from public.sessions s left join public.evolutions e on e.session_id=s.id where s.clinic_id=m.clinic_id),'[]'::jsonb))
  from public.clinic_members m where m.user_id=auth.uid()
$$;
revoke all on function public.export_backup() from public,anon;
grant execute on function public.export_backup() to authenticated;
commit;
