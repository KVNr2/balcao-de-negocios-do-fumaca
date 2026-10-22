-- Preços de mercado coletados pelo AlbionSpecs (formato Albion Data: item_id com @encantamento, qualidade 1-5, cidade)
create table public.market_latest (
  item_id text not null, quality smallint not null default 1, city text not null,
  sell_min integer, sell_min_at timestamptz, sell_amt integer, buy_max integer, buy_max_at timestamptz, buy_amt integer,
  primary key (item_id, quality, city)
) with (fillfactor=80);
create index market_latest_city_idx on public.market_latest (city, item_id);
create table public.market_clients (
  client_id uuid primary key, win_start timestamptz not null default now(), win_count integer not null default 0,
  total bigint not null default 0, first_seen timestamptz not null default now(), last_seen timestamptz not null default now());
create table public.market_suspect (
  id bigint generated always as identity primary key, item_id text, quality smallint, city text, kind text,
  old_val integer, new_val integer, client_id uuid, at timestamptz not null default now());
alter table public.market_latest enable row level security;
alter table public.market_clients enable row level security;
alter table public.market_suspect enable row level security;
create policy "leitura publica" on public.market_latest for select using (true);
revoke all on public.market_clients, public.market_suspect from anon, authenticated;
revoke insert, update, delete on public.market_latest from anon, authenticated;

create or replace function public.ingest_market(p_client uuid, p_batch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; cnt int:=0; rej int:=0; sus int:=0; cur record; now_ts timestamptz:=now();
  cities text[]:=array['Caerleon','Bridgewatch','Fort Sterling','Lymhurst','Martlock','Thetford','Brecilien','Black Market'];
  v_n int; v_s int; v_b int; v_q int; v_sa int; v_ba int;
begin
  if p_client is null or jsonb_typeof(p_batch)<>'array' then return jsonb_build_object('ok',false,'err','formato'); end if;
  v_n:=jsonb_array_length(p_batch);
  if v_n=0 then return jsonb_build_object('ok',true,'n',0); end if;
  if v_n>600 then return jsonb_build_object('ok',false,'err','lote grande'); end if;
  insert into market_clients as c (client_id) values (p_client)
  on conflict (client_id) do update set
    win_count=case when c.win_start<now_ts-interval '1 minute' then 1 else c.win_count+1 end,
    win_start=case when c.win_start<now_ts-interval '1 minute' then now_ts else c.win_start end,
    total=c.total+v_n, last_seen=now_ts;
  if (select win_count from market_clients where client_id=p_client)>120 then return jsonb_build_object('ok',false,'err','limite'); end if;
  for r in select x.i,x.q,x.c,x.s,x.b,x.sa,x.ba from jsonb_to_recordset(p_batch) as x(i text,q int,c text,s int,b int,sa int,ba int) loop
    v_s:=r.s; v_b:=r.b; v_sa:=least(greatest(r.sa,0),999999); v_ba:=least(greatest(r.ba,0),999999); v_q:=coalesce(r.q,1);
    if r.i is null or r.i !~ '^[A-Z0-9_@]{3,64}$' or r.c is null or not (r.c=any(cities)) or v_q not between 1 and 5
       or (v_s is not null and v_s not between 1 and 2000000000) or (v_b is not null and v_b not between 1 and 2000000000)
       or (v_s is null and v_b is null) then rej:=rej+1; continue; end if;
    select * into cur from market_latest where item_id=r.i and quality=v_q and city=r.c;
    if found then
      if v_s is not null and cur.sell_min is not null and cur.sell_min_at>now_ts-interval '6 hours'
         and (v_s::bigint*8<cur.sell_min or v_s>cur.sell_min::bigint*8) then
        insert into market_suspect(item_id,quality,city,kind,old_val,new_val,client_id) values (r.i,v_q,r.c,'s',cur.sell_min,v_s,p_client);
        v_s:=null; sus:=sus+1; end if;
      if v_b is not null and cur.buy_max is not null and cur.buy_max_at>now_ts-interval '6 hours'
         and (v_b::bigint*8<cur.buy_max or v_b>cur.buy_max::bigint*8) then
        insert into market_suspect(item_id,quality,city,kind,old_val,new_val,client_id) values (r.i,v_q,r.c,'b',cur.buy_max,v_b,p_client);
        v_b:=null; sus:=sus+1; end if;
      if v_s is null and v_b is null then continue; end if;
    end if;
    insert into market_latest as m (item_id,quality,city,sell_min,sell_min_at,sell_amt,buy_max,buy_max_at,buy_amt)
    values (r.i,v_q,r.c,v_s,case when v_s is not null then now_ts end,case when v_s is not null then v_sa end,v_b,case when v_b is not null then now_ts end,case when v_b is not null then v_ba end)
    on conflict (item_id,quality,city) do update set
      sell_min=coalesce(excluded.sell_min,m.sell_min), sell_min_at=case when excluded.sell_min is not null then now_ts else m.sell_min_at end, sell_amt=case when excluded.sell_min is not null then excluded.sell_amt else m.sell_amt end,
      buy_max=coalesce(excluded.buy_max,m.buy_max), buy_max_at=case when excluded.buy_max is not null then now_ts else m.buy_max_at end, buy_amt=case when excluded.buy_max is not null then excluded.buy_amt else m.buy_amt end;
    cnt:=cnt+1;
  end loop;
  return jsonb_build_object('ok',true,'n',cnt,'rej',rej,'sus',sus);
end $$;
revoke all on function public.ingest_market(uuid,jsonb) from public;
grant execute on function public.ingest_market(uuid,jsonb) to anon, authenticated;

create or replace function public.market_purge() returns void language sql security definer set search_path=public as $$
  delete from market_latest where coalesce(greatest(sell_min_at,buy_max_at),now())<now()-interval '14 days';
  delete from market_suspect where at<now()-interval '7 days';
  delete from market_clients where last_seen<now()-interval '60 days';
$$;
revoke all on function public.market_purge() from public, anon, authenticated;
