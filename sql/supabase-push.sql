-- ═══════════════════════════════════════════════════════════════
-- PUSH SUBSCRIPTIONS — Cole no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  fase       text default '1',
  tipo       text default 'trabalho',
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);
alter table push_subscriptions enable row level security;
create policy "Usuário gerencia suas subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);
create index on push_subscriptions(user_id);

-- SECRETS a adicionar em Settings → Edge Functions → Secrets:
-- VAPID_PUBLIC_KEY  = BEs9fLkemRaF6UQjaAB8Z-SOtZxZz1Powj-eCP--Qqi5LvBvV5P13pl7oGj3LLayVJJAPQpuBMTHbJtzNu4PDa4
-- VAPID_PRIVATE_KEY = yaQI6JB8bm3GUJx4-9H4dAe3mIy5fjTcs7fOT71mmxI
-- VAPID_SUBJECT     = mailto:contato@bulkingpro.app
