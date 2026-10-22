-- New and reset demo accounts start with $3,000 of virtual cash.
ALTER TABLE demo_accounts
  ALTER COLUMN initial_balance SET DEFAULT 3000;

-- Move only untouched accounts to the new starting balance; preserve any
-- account that has trading activity or an open position.
UPDATE demo_accounts demo_account
SET initial_balance = 3000, updated_at = now()
WHERE demo_account.initial_balance = 100000
  AND NOT EXISTS (
    SELECT 1 FROM ledger_entries entry WHERE entry.account_id = demo_account.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM orders order_row WHERE order_row.account_id = demo_account.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM positions open_position
    WHERE open_position.account_id = demo_account.id AND open_position.quantity <> 0
  );

DO $migration$
DECLARE
  function_oid regprocedure;
  function_definition text;
BEGIN
  function_oid := to_regprocedure(
    'public.execute_demo_market_order(text,text,text,numeric,text,numeric,bigint,text)'
  );
  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'execute_demo_market_order must exist before applying migration 0004';
  END IF;

  function_definition := pg_get_functiondef(function_oid);
  IF strpos(function_definition, $$VALUES (p_user_id, 'Main demo', 100000)$$) = 0 THEN
    RAISE EXCEPTION 'execute_demo_market_order does not contain the expected account creation default';
  END IF;
  function_definition := replace(
    function_definition,
    $$VALUES (p_user_id, 'Main demo', 100000)$$,
    $$VALUES (p_user_id, 'Main demo', 3000)$$
  );
  EXECUTE function_definition;

  function_oid := to_regprocedure('public.reset_demo_account(text,boolean)');
  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'reset_demo_account must exist before applying migration 0004';
  END IF;

  function_definition := pg_get_functiondef(function_oid);
  IF strpos(function_definition, $$VALUES (p_user_id, 'Main demo', 100000)$$) = 0
     OR strpos(function_definition, 'SET initial_balance = 100000, updated_at = now()') = 0
     OR strpos(function_definition, $$'initialBalance',100000,$$) = 0 THEN
    RAISE EXCEPTION 'reset_demo_account does not contain the expected $100,000 default';
  END IF;
  function_definition := replace(
    function_definition,
    $$VALUES (p_user_id, 'Main demo', 100000)$$,
    $$VALUES (p_user_id, 'Main demo', 3000)$$
  );
  function_definition := replace(
    function_definition,
    'SET initial_balance = 100000, updated_at = now()',
    'SET initial_balance = 3000, updated_at = now()'
  );
  function_definition := replace(
    function_definition,
    $$'initialBalance',100000,$$,
    $$'initialBalance',3000,$$
  );
  function_definition := replace(
    function_definition,
    'Virtual cash is back to $100,000',
    'Virtual cash is back to $3,000'
  );
  EXECUTE function_definition;
END;
$migration$;
