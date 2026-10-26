-- Mercado Negro: só vale o pedido de compra atual de equipamento (o jogo-cliente novo já envia assim; isto protege contra programas antigos).
-- NÃO aplicado ainda: rodar no Supabase só depois de publicar o programa novo.
-- 1) ingest_market: no Mercado Negro ignora o preço de venda (v_s) e itens que não são equipamento. Trocar, dentro do loop, logo depois de "v_bm:=(r.c='Black Market');":
--      if v_bm then v_s:=null; if r.i !~ '^T[2-8]_(MAIN|2H|OFF|HEAD|ARMOR|SHOES)_' then rej:=rej+1; continue; end if; end if;
--    (a linha seguinte já descarta o item que ficou sem venda e sem compra)
-- 2) limpeza do que já foi gravado errado:
update market_latest set sell_min=null, sell_min_at=null, sell_amt=null where city='Black Market';
delete from market_latest where city='Black Market' and (buy_max is null or item_id !~ '^T[2-8]_(MAIN|2H|OFF|HEAD|ARMOR|SHOES)_');
