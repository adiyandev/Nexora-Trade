-- Retire provider-sourced instruments from the active demo universe.
-- Keep their order and position history intact; remove them from saved watchlists.
UPDATE assets
SET is_active = symbol IN (
  'OMNI', 'VLT', 'HALO', 'BRIK', 'PWN', 'BLX', 'BYTE', 'CHIP', 'MEDI',
  'LOOT', 'OBBY', 'SLRP', 'ROBO', 'LAND', 'POWR', 'DOMO', 'INSR'
);

DELETE FROM watchlist_items item
USING assets asset
WHERE item.asset_id = asset.id
  AND asset.is_active = false;

-- The core execution function predates simulated-only pricing. Keep its logic
-- intact while correcting the quote-source label for new demo fills.
DO $migration$
DECLARE
  function_oid regprocedure;
  function_definition text;
BEGIN
  function_oid := to_regprocedure(
    'public.execute_demo_market_order(text,text,text,numeric,text,numeric,bigint,text)'
  );
  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'execute_demo_market_order must exist before applying migration 0003';
  END IF;

  function_definition := pg_get_functiondef(function_oid);
  function_definition := replace(
    function_definition,
    '''Yahoo Finance chart data''',
    '''NexoraTrade demo market simulation'''
  );
  EXECUTE function_definition;
END;
$migration$;
