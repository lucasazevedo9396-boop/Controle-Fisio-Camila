-- Substitua os dois emails pelos emails das contas criadas em Authentication > Users.
-- Não coloque senhas neste arquivo. Execute depois de schema.sql.
do $$
declare clinic uuid; wife uuid; husband uuid;
begin
  select id into wife from auth.users where lower(email)=lower('EMAIL_DA_CAMILA');
  select id into husband from auth.users where lower(email)=lower('SEU_EMAIL');
  if wife is null or husband is null or wife=husband then raise exception 'Crie duas contas distintas e substitua os emails antes de executar'; end if;
  if exists(select 1 from public.clinic_members where user_id in (wife,husband)) then raise exception 'Uma conta já está vinculada; não execute novamente'; end if;
  insert into public.clinics(name) values('Camila · Fisioterapia') returning id into clinic;
  -- therapist concede acesso completo a pacientes, financeiro e evolução.
  insert into public.clinic_members(clinic_id,user_id,role) values(clinic,wife,'therapist'),(clinic,husband,'therapist');
end $$;
