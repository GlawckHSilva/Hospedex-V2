alter table public.user_tutorial_progress
  add column if not exists last_seen_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create index if not exists user_tutorial_progress_status_idx
  on public.user_tutorial_progress (tenant_id, user_id, status);
