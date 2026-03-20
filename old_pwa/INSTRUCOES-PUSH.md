# Como ativar notificações em background (tela bloqueada)

## Passo 1 — Criar tabela no Supabase
Execute o arquivo `supabase-push-setup.sql` no SQL Editor do Supabase.

## Passo 2 — Instalar Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref ugifonixdqtvclrfucvf
```

## Passo 3 — Deploy da Edge Function
```bash
# Na pasta raiz do projeto
supabase functions deploy push-notifications
```

## Passo 4 — Adicionar variável de ambiente
No Supabase Dashboard → Settings → Edge Functions → Secrets, adicione:
- `SUPABASE_SERVICE_ROLE_KEY` → seu service role key (Settings → API)

## Passo 5 — Configurar Cron (a cada 15 minutos)
No Supabase Dashboard → Database → Extensions → habilite `pg_cron`.
Depois no SQL Editor:
```sql
select cron.schedule(
  'push-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://ugifonixdqtvclrfucvf.supabase.co/functions/v1/push-notifications',
    headers := '{"Authorization": "Bearer SEU_ANON_KEY"}'::jsonb
  );
  $$
);
```

## Como funciona após configurar:
1. Usuário ativa notificações no app
2. O browser registra uma "push subscription" (endpoint único por dispositivo)
3. A subscription é salva no Supabase
4. A cada 15 minutos, a Edge Function verifica se é hora de refeição
5. Se for, envia push para todos os dispositivos cadastrados
6. O Service Worker recebe o push e mostra a notificação — mesmo com tela bloqueada!
