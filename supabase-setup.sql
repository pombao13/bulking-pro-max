-- ═══════════════════════════════════════════════════════════════
-- BULKING PRO MAX — Supabase Setup (VERSÃO CORRIGIDA)
-- Execute no SQL Editor: supabase.com → seu projeto → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Remove trigger antigo se existir ─────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;

-- ── PASSO 2: Cria/recria tabela profiles ─────────────────────
drop table if exists profiles cascade;
create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  nome        text,
  peso_atual  numeric(5,2),
  fase_atual  smallint default 1,
  tipo_dia    text default 'trabalho',
  meta_peso   numeric(5,2),
  updated_at  timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
drop policy if exists "profiles_policy" on profiles;
create policy "profiles_policy"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── PASSO 3: Trigger robusto ──────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Não falha o cadastro mesmo se o insert no profile falhar
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── PASSO 4: Demais tabelas ───────────────────────────────────

-- Weight History
drop table if exists weight_history cascade;
create table weight_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  data       date not null default current_date,
  peso       numeric(5,2) not null,
  created_at timestamptz default now()
);
alter table weight_history enable row level security;
create policy "wh_policy" on weight_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on weight_history(user_id, data);

-- Water Log
drop table if exists water_log cascade;
create table water_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  data       date not null default current_date,
  ml         integer not null check (ml > 0),
  hora       text,
  created_at timestamptz default now()
);
alter table water_log enable row level security;
create policy "wl_policy" on water_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on water_log(user_id, data);

-- Meal Checks
drop table if exists meal_checks cascade;
create table meal_checks (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users on delete cascade not null,
  data     date not null default current_date,
  fase     text not null,
  tipo     text not null,
  meal_idx smallint not null,
  unique(user_id, data, fase, tipo, meal_idx)
);
alter table meal_checks enable row level security;
create policy "mc_policy" on meal_checks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on meal_checks(user_id, data);

-- Supplements
drop table if exists supplements cascade;
create table supplements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  nome       text not null,
  fase       text not null,
  tipo       text not null,
  created_at timestamptz default now()
);
alter table supplements enable row level security;
create policy "supls_policy" on supplements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Supplement Checks
drop table if exists supplement_checks cascade;
create table supplement_checks (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users on delete cascade not null,
  supl_id  uuid references supplements on delete cascade not null,
  data     date not null default current_date,
  unique(user_id, supl_id, data)
);
alter table supplement_checks enable row level security;
create policy "sc_policy" on supplement_checks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on supplement_checks(user_id, data);

-- Ingredient Prices
drop table if exists ingredient_prices cascade;
create table ingredient_prices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  ingredient_id  text not null,
  valor          numeric(10,2) default 0,
  unit           text default 'kg',
  unique(user_id, ingredient_id)
);
alter table ingredient_prices enable row level security;
create policy "ip_policy" on ingredient_prices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Custom Ingredients
drop table if exists custom_ingredients cascade;
create table custom_ingredients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  nome       text not null,
  kcal       numeric(8,2) default 0,
  c          numeric(8,2) default 0,
  p          numeric(8,2) default 0,
  f          numeric(8,2) default 0,
  per        integer default 100,
  unit       text default 'g',
  amount     numeric(8,2) default 100,
  preco_unit text default 'kg',
  created_at timestamptz default now()
);
alter table custom_ingredients enable row level security;
create policy "ci_policy" on custom_ingredients for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Custom Diet
drop table if exists custom_diet cascade;
create table custom_diet (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  tipo       text default 'importada',
  data       jsonb not null,
  created_at timestamptz default now(),
  unique(user_id)
);
alter table custom_diet enable row level security;
create policy "cd_policy" on custom_diet for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── VERIFICAÇÃO FINAL ─────────────────────────────────────────
select
  tablename,
  rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
order by tablename;
