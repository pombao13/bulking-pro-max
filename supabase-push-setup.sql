-- ═══════════════════════════════════════════════════════════════
-- BULKING PRO — Push Subscriptions Table
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- Tabela de subscrições push
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "push_subs_policy" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Verifica se foi criada
select 'push_subscriptions criada!' as status;
