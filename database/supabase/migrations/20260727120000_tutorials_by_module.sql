/*
 * Acrescenta decisões de convite e reinício ao progresso dos tutoriais.
 *
 * A chave única existente por tenant, usuário, módulo e versão permanece sendo
 * a garantia de idempotência. As policies continuam limitando o acesso ao
 * próprio usuário dentro do tenant autenticado.
 */
alter table public.user_tutorial_progress
  add column if not exists invitation_status text,
  add column if not exists invitation_decided_at timestamptz,
  add column if not exists restarted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_tutorial_progress_invitation_status_check'
      and conrelid = 'public.user_tutorial_progress'::regclass
  ) then
    alter table public.user_tutorial_progress
      add constraint user_tutorial_progress_invitation_status_check
      check (invitation_status is null or invitation_status in ('pending', 'later', 'never', 'started'));
  end if;
end
$$;

create index if not exists user_tutorial_progress_module_version_idx
  on public.user_tutorial_progress (tenant_id, user_id, tutorial_key, tutorial_version desc);

revoke all on public.user_tutorial_progress from anon;
grant select, insert, update on public.user_tutorial_progress to authenticated;
