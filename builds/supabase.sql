-- Rode este arquivo uma vez no Supabase: SQL Editor > New query > colar > Run.
create table if not exists nb_builds (
  id text primary key check (char_length(id) <= 60),
  data jsonb not null check (octet_length(data::text) < 6000),
  created_at timestamptz not null default now()
);
create table if not exists nb_votos (
  build_id text not null references nb_builds(id) on delete cascade,
  voter text not null check (char_length(voter) <= 64),
  primary key (build_id, voter)
);
create or replace view nb_votos_total with (security_invoker = true) as select build_id, count(*)::int as n from nb_votos group by build_id;

alter table nb_builds enable row level security;
alter table nb_votos enable row level security;
create policy "ler builds" on nb_builds for select using (true);
create policy "criar builds" on nb_builds for insert with check (true);
create policy "ler votos" on nb_votos for select using (true);
create policy "votar" on nb_votos for insert with check (true);
create policy "tirar voto" on nb_votos for delete using (true);
grant select on nb_votos_total to anon;
-- Apagar ou editar uma build: pelo painel do Supabase (Table Editor), só você tem acesso.
