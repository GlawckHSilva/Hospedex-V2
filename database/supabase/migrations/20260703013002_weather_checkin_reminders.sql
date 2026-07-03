/*
  Lembretes automaticos de clima antes do check-in.

  Esta tabela garante idempotencia do job diario: cada reserva pode receber no
  maximo uma tentativa de aviso de clima para a data de check-in. O isolamento
  multi-tenant fica em tenant_id e o envio real acontece apenas no backend.
*/

create table if not exists public.weather_checkin_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  guest_user_id uuid references public.profiles(id) on delete set null,
  reminder_type text not null default 'weather_checkin_reminder'
    check (reminder_type = 'weather_checkin_reminder'),
  channel text not null default 'none'
    check (channel in ('email', 'whatsapp', 'internal', 'none')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'test', 'failed', 'skipped', 'not_configured')),
  check_in_date date not null,
  recipient_email text,
  recipient_phone text,
  message text,
  forecast jsonb not null default '{}'::jsonb,
  error_message text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_checkin_reminder_unique
    unique (tenant_id, reservation_id, reminder_type, check_in_date)
);

create index if not exists weather_checkin_logs_tenant_date_idx
  on public.weather_checkin_reminder_logs (tenant_id, check_in_date, created_at desc);

create index if not exists weather_checkin_logs_reservation_idx
  on public.weather_checkin_reminder_logs (reservation_id);

drop trigger if exists set_weather_checkin_logs_updated_at
  on public.weather_checkin_reminder_logs;
create trigger set_weather_checkin_logs_updated_at
before update on public.weather_checkin_reminder_logs
for each row execute function app_private.set_updated_at();

alter table public.weather_checkin_reminder_logs enable row level security;

drop policy if exists "weather_checkin_logs_select" on public.weather_checkin_reminder_logs;

create policy "weather_checkin_logs_select" on public.weather_checkin_reminder_logs
for select to authenticated
using (
  app_private.is_tenant_owner(tenant_id)
  or app_private.has_tenant_permission(tenant_id, 'integrations.read')
  or app_private.has_tenant_permission(tenant_id, 'integrations.manage')
  or app_private.has_tenant_permission(tenant_id, 'reservations.read')
);

grant select on public.weather_checkin_reminder_logs to authenticated;
grant all on public.weather_checkin_reminder_logs to service_role;

comment on table public.weather_checkin_reminder_logs is
  'Controle idempotente dos lembretes automaticos de clima enviados antes do check-in.';
comment on column public.weather_checkin_reminder_logs.tenant_id is
  'Tenant dono da reserva; impede mistura de avisos entre clientes da plataforma.';
comment on column public.weather_checkin_reminder_logs.forecast is
  'Resumo nao sensivel da previsao usada na mensagem. Nunca armazenar WEATHER_API_KEY.';
comment on constraint weather_checkin_reminder_unique
  on public.weather_checkin_reminder_logs is
  'Evita envio duplicado do mesmo lembrete para a mesma reserva e data de check-in.';

notify pgrst, 'reload schema';
